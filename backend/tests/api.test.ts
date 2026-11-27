import crypto from 'node:crypto';
import http from 'node:http';
import { PassThrough } from 'node:stream';
import sharp from 'sharp';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Configure required env before importing app
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/landnest_test';
process.env.SESSION_SECRET = 'test-session-secret-at-least-32-chars-long';
process.env.CAPTCHA_SECRET = 'test-captcha-secret-at-least-32-chars-long';
process.env.STORAGE_DRIVER = 'local';
process.env.FRONTEND_URL = 'http://localhost:5173';

// In-memory relational store backing Prisma mock for isolated end-to-end Express tests
const db = {
  users: [] as any[],
  sessions: [] as any[],
  locations: [] as any[],
  properties: [] as any[],
  images: [] as any[],
  inquiries: [] as any[],
  favorites: [] as any[],
  auditLogs: [] as any[],
  captchas: [] as any[],
};

function resetDb() {
  db.users = [];
  db.sessions = [];
  db.locations = [];
  db.properties = [];
  db.images = [];
  db.inquiries = [];
  db.favorites = [];
  db.auditLogs = [];
  db.captchas = [];
}

function hydrateProperty(prop: any, favUserId?: string) {
  const location = db.locations.find((l) => l.id === prop.locationId);
  const images = db.images.filter((img) => img.propertyId === prop.id);
  const owner = db.users.find((u) => u.id === prop.ownerId);
  const favorites = favUserId
    ? db.favorites.filter((f) => f.propertyId === prop.id && f.userId === favUserId)
    : [];
  return { ...prop, location, images, owner, favorites };
}

vi.mock('../src/lib/prisma.js', () => {
  const mockPrisma: any = {
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(mockPrisma),
    user: {
      findUnique: async ({ where }: any) =>
        db.users.find((u) => (where.email ? u.email === where.email : u.id === where.id)) || null,
      create: async ({ data, select }: any) => {
        const user: any = {
          id: crypto.randomUUID(),
          accountStatus: 'PENDING',
          accountReviewNote: null,
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        db.users.push(user);
        if (!select) return user;
        const selected: any = {};
        for (const [k, v] of Object.entries(select)) {
          if (v) selected[k] = user[k];
        }
        return selected;
      },
      update: async ({ where, data, select }: any) => {
        const idx = db.users.findIndex((u) => u.id === where.id);
        db.users[idx] = { ...db.users[idx], ...data, updatedAt: new Date() };
        const user = db.users[idx];
        if (!select) return user;
        const selected: any = {};
        for (const [k, v] of Object.entries(select)) {
          if (v) {
            if (k === '_count') {
              selected._count = {
                properties: db.properties.filter((p) => p.ownerId === user.id).length,
                favorites: db.favorites.filter((f) => f.userId === user.id).length,
                inquiries: db.inquiries.filter((i) => i.userId === user.id).length,
              };
            } else {
              selected[k] = user[k];
            }
          }
        }
        return selected;
      },
      count: async ({ where }: any = {}) =>
        db.users.filter((u) => (!where?.accountStatus ? true : u.accountStatus === where.accountStatus)).length,
      findMany: async ({ where }: any = {}) =>
        db.users
          .filter((u) => (!where?.accountStatus ? true : u.accountStatus === where.accountStatus))
          .map((u) => ({
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            role: u.role,
            accountStatus: u.accountStatus,
            accountReviewNote: u.accountReviewNote,
            lastLoginAt: u.lastLoginAt,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            _count: {
              properties: db.properties.filter((p) => p.ownerId === u.id).length,
              favorites: db.favorites.filter((f) => f.userId === u.id).length,
              inquiries: db.inquiries.filter((i) => i.userId === u.id).length,
            },
          })),
    },
    session: {
      create: async ({ data }: any) => {
        const session = { id: crypto.randomUUID(), createdAt: new Date(), ...data };
        db.sessions.push(session);
        return session;
      },
      findUnique: async ({ where }: any) => {
        const session = db.sessions.find((s) => s.tokenHash === where.tokenHash);
        if (!session) return null;
        const user = db.users.find((u) => u.id === session.userId);
        return { ...session, user };
      },
      delete: async ({ where }: any) => {
        db.sessions = db.sessions.filter((s) => s.id !== where.id);
      },
      deleteMany: async ({ where }: any) => {
        db.sessions = db.sessions.filter((s) => {
          if (where.tokenHash && s.tokenHash === where.tokenHash) return false;
          if (where.userId && s.userId === where.userId) return false;
          return true;
        });
        return { count: 1 };
      },
    },
    location: {
      upsert: async ({ where, create }: any) => {
        const locKey = where.locality_city;
        let loc = db.locations.find(
          (l) => l.locality === locKey.locality && l.city === locKey.city
        );
        if (!loc) {
          loc = {
            id: crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...create,
          };
          db.locations.push(loc);
        }
        return loc;
      },
      findMany: async () =>
        db.locations.map((l) => ({
          ...l,
          _count: {
            properties: db.properties.filter(
              (p) => p.locationId === l.id && p.publicationStatus === 'PUBLISHED'
            ).length,
          },
        })),
    },
    property: {
      create: async ({ data }: any) => {
        const prop = {
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: null,
          adminReviewNote: null,
          ...data,
        };
        db.properties.push(prop);
        return hydrateProperty(prop);
      },
      findUnique: async ({ where }: any) => {
        const prop = db.properties.find((p) => p.id === where.id);
        return prop ? hydrateProperty(prop) : null;
      },
      findFirst: async ({ where }: any) => {
        const prop = db.properties.find((p) => {
          if (where.id && p.id !== where.id) return false;
          if (where.slug && p.slug !== where.slug) return false;
          if (where.publicationStatus && p.publicationStatus !== where.publicationStatus) return false;
          return true;
        });
        return prop ? hydrateProperty(prop) : null;
      },
      findMany: async ({ where, skip = 0, take = 50, include, distinct }: any) => {
        let list = db.properties.filter((p) => {
          if (!where) return true;
          if (where.publicationStatus && p.publicationStatus !== where.publicationStatus) return false;
          if (where.listingPurpose && p.listingPurpose !== where.listingPurpose) return false;
          if (where.propertyType && p.propertyType !== where.propertyType) return false;
          if (where.isFeatured !== undefined && p.isFeatured !== where.isFeatured) return false;
          if (where.ownerId && p.ownerId !== where.ownerId) return false;
          if (where.price) {
            if (where.price.gte !== undefined && Number(p.price) < where.price.gte) return false;
            if (where.price.lte !== undefined && Number(p.price) > where.price.lte) return false;
          }
          if (where.location?.OR) {
            const loc = db.locations.find((l) => l.id === p.locationId);
            const term = (where.location.OR[0].locality.contains || '').toLowerCase();
            if (!loc || (!loc.locality.toLowerCase().includes(term) && !loc.city.toLowerCase().includes(term))) {
              return false;
            }
          }
          return true;
        });
        if (distinct?.includes('locationId')) {
          const seen = new Set();
          list = list.filter((p) => {
            if (seen.has(p.locationId)) return false;
            seen.add(p.locationId);
            return true;
          });
        }
        const favUserId = include?.favorites?.where?.userId;
        return list.slice(skip, skip + take).map((p) => hydrateProperty(p, favUserId));
      },
      count: async ({ where }: any) => {
        return db.properties.filter((p) => {
          if (!where) return true;
          if (where.publicationStatus && p.publicationStatus !== where.publicationStatus) return false;
          if (where.listingPurpose && p.listingPurpose !== where.listingPurpose) return false;
          if (where.propertyType && p.propertyType !== where.propertyType) return false;
          if (where.isFeatured !== undefined && p.isFeatured !== where.isFeatured) return false;
          if (where.price) {
            if (where.price.gte !== undefined && Number(p.price) < where.price.gte) return false;
            if (where.price.lte !== undefined && Number(p.price) > where.price.lte) return false;
          }
          return true;
        }).length;
      },
      update: async ({ where, data }: any) => {
        const idx = db.properties.findIndex((p) => p.id === where.id);
        db.properties[idx] = { ...db.properties[idx], ...data, updatedAt: new Date() };
        return hydrateProperty(db.properties[idx]);
      },
      delete: async ({ where }: any) => {
        db.properties = db.properties.filter((p) => p.id !== where.id);
      },
    },
    propertyImage: {
      create: async ({ data }: any) => {
        const img = { id: crypto.randomUUID(), createdAt: new Date(), ...data };
        db.images.push(img);
        return img;
      },
      updateMany: async ({ where, data }: any) => {
        db.images = db.images.map((img) =>
          img.propertyId === where.propertyId ? { ...img, ...data } : img
        );
      },
      update: async ({ where, data }: any) => {
        const idx = db.images.findIndex((img) => img.id === where.id);
        db.images[idx] = { ...db.images[idx], ...data };
        return db.images[idx];
      },
      delete: async ({ where }: any) => {
        db.images = db.images.filter((img) => img.id !== where.id);
      },
    },
    inquiry: {
      create: async ({ data }: any) => {
        const inq = { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data };
        db.inquiries.push(inq);
        return inq;
      },
      findUnique: async ({ where }: any) => db.inquiries.find((i) => i.id === where.id) || null,
      findMany: async () => db.inquiries,
      update: async ({ where, data }: any) => {
        const idx = db.inquiries.findIndex((i) => i.id === where.id);
        db.inquiries[idx] = { ...db.inquiries[idx], ...data, updatedAt: new Date() };
        return db.inquiries[idx];
      },
      count: async ({ where }: any) =>
        db.inquiries.filter((i) => (!where?.status ? true : i.status === where.status)).length,
    },
    favorite: {
      upsert: async ({ where, create }: any) => {
        const key = where.userId_propertyId;
        let fav = db.favorites.find(
          (f) => f.userId === key.userId && f.propertyId === key.propertyId
        );
        if (!fav) {
          fav = { id: crypto.randomUUID(), createdAt: new Date(), ...create };
          db.favorites.push(fav);
        }
        return fav;
      },
      deleteMany: async ({ where }: any) => {
        db.favorites = db.favorites.filter(
          (f) => !(f.userId === where.userId && f.propertyId === where.propertyId)
        );
      },
      findMany: async ({ where }: any) =>
        db.favorites
          .filter((f) => f.userId === where.userId)
          .map((f) => ({
            ...f,
            property: hydrateProperty(db.properties.find((p) => p.id === f.propertyId)),
          })),
    },
    adminAuditLog: {
      create: async ({ data }: any) => {
        const log = { id: crypto.randomUUID(), createdAt: new Date(), ...data };
        db.auditLogs.push(log);
        return log;
      },
      findMany: async () =>
        db.auditLogs.map((l) => ({
          ...l,
          admin: db.users.find((u) => u.id === l.adminId),
        })),
    },
    captchaChallenge: {
      create: async ({ data }: any) => {
        const row = { createdAt: new Date(), usedAt: null, ...data };
        db.captchas.push(row);
        return row;
      },
      findUnique: async ({ where }: any) => db.captchas.find((c) => c.id === where.id) || null,
      updateMany: async ({ where, data }: any) => {
        const target = db.captchas.find((c) => c.id === where.id && c.usedAt === null);
        if (!target) return { count: 0 };
        target.usedAt = data.usedAt;
        return { count: 1 };
      },
      deleteMany: async () => ({ count: 0 }),
    },
  };
  return { prisma: mockPrisma };
});

import { createApp } from '../src/app.js';

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  app = createApp();
});

beforeEach(() => {
  resetDb();
});

function extractCookieValue(setCookies: string[] | undefined, name: string): string | null {
  if (!setCookies) return null;
  for (const cookie of setCookies) {
    if (cookie.startsWith(`${name}=`)) {
      return cookie.split(';')[0].split('=')[1];
    }
  }
  return null;
}

function buildCookieHeader(setCookies: string[] | undefined): string {
  if (!setCookies) return '';
  return setCookies.map((c) => c.split(';')[0]).join('; ');
}

interface TestResponse {
  status: number;
  body: any;
  headers: Record<string, string | string[] | undefined>;
}

async function invokeApp(options: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  cookies?: string[];
  json?: unknown;
  rawBody?: Buffer;
}): Promise<TestResponse> {
  const socket = new PassThrough() as any;
  socket.remoteAddress = '127.0.0.1';
  socket.encrypted = false;

  const req = new http.IncomingMessage(socket);
  req.method = options.method.toUpperCase();
  req.url = options.url;

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(options.headers || {})) {
    headers[k.toLowerCase()] = v;
  }
  if (options.cookies && options.cookies.length > 0) {
    headers['cookie'] = buildCookieHeader(options.cookies);
  }

  let bodyBuf: Buffer | null = null;
  if (options.rawBody) {
    bodyBuf = options.rawBody;
  } else if (options.json !== undefined) {
    bodyBuf = Buffer.from(JSON.stringify(options.json), 'utf8');
    headers['content-type'] = 'application/json';
  }

  if (bodyBuf) {
    headers['content-length'] = String(bodyBuf.length);
  }
  req.headers = headers;

  const res = new http.ServerResponse(req);
  const chunks: Buffer[] = [];
  const resSocket = new PassThrough();
  res.assignSocket(resSocket);

  // Capture body written through ServerResponse
  const origWrite = res.write.bind(res);
  const origEnd = res.end.bind(res);
  res.write = ((chunk: any, ...rest: any[]) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return origWrite(chunk, ...rest);
  }) as any;

  return new Promise<TestResponse>((resolve, reject) => {
    res.end = ((chunk?: any, ...rest: any[]) => {
      if (chunk && typeof chunk !== 'function') {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const rawText = Buffer.concat(chunks).toString('utf8');
      let parsed: any = rawText;
      try {
        parsed = rawText ? JSON.parse(rawText) : {};
      } catch {
        // Non-JSON response
      }
      const resHeaders = res.getHeaders() as Record<string, string | string[] | undefined>;
      const ret = origEnd(chunk, ...rest);
      resolve({
        status: res.statusCode,
        body: parsed,
        headers: resHeaders,
      });
      return ret;
    }) as any;

    res.on('error', reject);
    (app as any)(req, res);
    if (bodyBuf) {
      req.push(bodyBuf);
    }
    req.push(null);
  });
}

function buildMultipartBody(fieldName: string, fileBuf: Buffer, filename: string, contentType: string) {
  const boundary = `----LandnestBoundary${crypto.randomBytes(8).toString('hex')}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
    'utf8'
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  return {
    boundary,
    buffer: Buffer.concat([head, fileBuf, tail]),
  };
}

async function registerAndApproveUser(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role?: 'USER' | 'ADMIN';
}) {
  const regRes = await invokeApp({
    method: 'POST',
    url: '/api/v1/auth/register',
    json: input,
  });
  expect(regRes.status).toBe(201);
  expect(regRes.body.pendingApproval).toBe(true);
  expect(regRes.body.user.accountStatus).toBe('PENDING');

  const stored = db.users.find((u) => u.email === input.email);
  stored.accountStatus = 'APPROVED';
  if (input.role === 'ADMIN') stored.role = 'ADMIN';

  const loginRes = await invokeApp({
    method: 'POST',
    url: '/api/v1/auth/login',
    json: { email: input.email, password: input.password },
  });
  expect(loginRes.status).toBe(200);
  const cookies = loginRes.headers['set-cookie'] as string[];
  const csrf = extractCookieValue(cookies, 'landnest_csrf')!;
  return { user: loginRes.body.user, cookies, csrf, regRes };
}

describe('Landnest API security, ownership, workflow, and validation', () => {
  it('registers pending users, blocks login until admin approves or rejects, enforces CSRF, and monitors activity', async () => {
    const regRes = await invokeApp({
      method: 'POST',
      url: '/api/v1/auth/register',
      json: {
        fullName: 'Anitha Krishnan',
        email: 'anitha@example.com',
        phone: '+91 98421 11223',
        password: 'Password123',
        role: 'ADMIN', // Attempt privilege escalation — must be ignored
      },
    });

    expect(regRes.status).toBe(201);
    expect(regRes.body.pendingApproval).toBe(true);
    expect(regRes.body.user.role).toBe('USER');
    expect(regRes.body.user.accountStatus).toBe('PENDING');
    expect(regRes.body.user.passwordHash).toBeUndefined();

    // Pending user cannot log in until admin approves
    const pendingLogin = await invokeApp({
      method: 'POST',
      url: '/api/v1/auth/login',
      json: { email: 'anitha@example.com', password: 'Password123' },
    });
    expect(pendingLogin.status).toBe(403);

    // Create admin session and approve Anitha via /admin/users/:id/status
    const adminSession = await registerAndApproveUser({
      fullName: 'Admin User',
      email: 'aidmin@gmail.com',
      phone: '+91 98421 00001',
      password: 'Password123',
      role: 'ADMIN',
    });

    const approveRes = await invokeApp({
      method: 'PATCH',
      url: `/api/v1/admin/users/${regRes.body.user.id}/status`,
      cookies: adminSession.cookies,
      headers: { 'x-csrf-token': adminSession.csrf },
      json: { accountStatus: 'APPROVED', accountReviewNote: 'Verified user' },
    });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.user.accountStatus).toBe('APPROVED');

    // Approved user can now log in
    const loginRes = await invokeApp({
      method: 'POST',
      url: '/api/v1/auth/login',
      json: { email: 'anitha@example.com', password: 'Password123' },
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.email).toBe('anitha@example.com');

    const cookies = loginRes.headers['set-cookie'] as string[];
    const csrfToken = extractCookieValue(cookies, 'landnest_csrf');
    expect(csrfToken).toBeTruthy();

    // Mutating request with session cookie but missing CSRF header must be blocked (403)
    const missingCsrf = await invokeApp({
      method: 'POST',
      url: '/api/v1/properties',
      cookies,
      json: {},
    });
    expect(missingCsrf.status).toBe(403);

    // Admin can monitor user's registered details and activity
    const monitorRes = await invokeApp({
      method: 'GET',
      url: `/api/v1/admin/users/${regRes.body.user.id}/activity`,
      cookies: adminSession.cookies,
    });
    expect(monitorRes.status).toBe(200);
    expect(monitorRes.body.user.lastLoginAt).toBeTruthy();

    // Admin rejects user -> immediately invalidates sessions and blocks login
    const rejectRes = await invokeApp({
      method: 'PATCH',
      url: `/api/v1/admin/users/${regRes.body.user.id}/status`,
      cookies: adminSession.cookies,
      headers: { 'x-csrf-token': adminSession.csrf },
      json: { accountStatus: 'REJECTED', accountReviewNote: 'Incomplete verification' },
    });
    expect(rejectRes.status).toBe(200);

    const rejectedLogin = await invokeApp({
      method: 'POST',
      url: '/api/v1/auth/login',
      json: { email: 'anitha@example.com', password: 'Password123' },
    });
    expect(rejectedLogin.status).toBe(403);
  });

  it('enforces listing workflow, ownership checks, admin moderation, and public filtering', async () => {
    const userA = await registerAndApproveUser({
      fullName: 'Owner A',
      email: 'owner@example.com',
      phone: '+91 98421 22222',
      password: 'Password123',
    });
    const userB = await registerAndApproveUser({
      fullName: 'Other B',
      email: 'other@example.com',
      phone: '+91 98421 33333',
      password: 'Password123',
    });
    const userACookies = userA.cookies;
    const userACsrf = userA.csrf;
    const userBCookies = userB.cookies;
    const userBCsrf = userB.csrf;

    // Owner creates draft
    const createRes = await invokeApp({
      method: 'POST',
      url: '/api/v1/properties',
      cookies: userACookies,
      headers: { 'x-csrf-token': userACsrf },
      json: {
        title: 'BAMA Nagar Extension',
        description: 'Calm residential plot in Kadachanendhal with 30ft blacktop road.',
        propertyType: 'LAND_PLOT',
        listingPurpose: 'SALE',
        price: 750000,
        totalAreaSqFt: 1200,
        facingDirection: 'EAST',
        roadWidth: '30 ft road',
        landmark: 'Near Kadachanendhal Bus Stop',
        locality: 'Kadachanendhal',
        city: 'Madurai',
      },
    });
    expect(createRes.status).toBe(201);
    const propId = createRes.body.property.id;
    expect(createRes.body.property.publicationStatus).toBe('DRAFT');

    // Draft is NOT visible publicly
    const publicBefore = await invokeApp({ method: 'GET', url: '/api/v1/properties' });
    expect(publicBefore.status).toBe(200);
    expect(publicBefore.body.items).toHaveLength(0);

    // User B cannot edit User A's property
    const forbiddenEdit = await invokeApp({
      method: 'PATCH',
      url: `/api/v1/properties/${propId}`,
      cookies: userBCookies,
      headers: { 'x-csrf-token': userBCsrf },
      json: { title: 'Hijacked Title' },
    });
    expect(forbiddenEdit.status).toBe(403);

    // User A submits for review
    const submitRes = await invokeApp({
      method: 'POST',
      url: `/api/v1/properties/${propId}/submit`,
      cookies: userACookies,
      headers: { 'x-csrf-token': userACsrf },
    });
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.property.publicationStatus).toBe('PENDING_REVIEW');

    // Non-admin cannot access admin endpoints
    const nonAdminRes = await invokeApp({
      method: 'GET',
      url: '/api/v1/admin/stats',
      cookies: userACookies,
    });
    expect(nonAdminRes.status).toBe(403);

    // Elevate User B to ADMIN in store
    const adminUser = db.users.find((u) => u.email === 'other@example.com');
    adminUser.role = 'ADMIN';

    // Admin approves and publishes
    const publishRes = await invokeApp({
      method: 'PATCH',
      url: `/api/v1/admin/properties/${propId}/review`,
      cookies: userBCookies,
      headers: { 'x-csrf-token': userBCsrf },
      json: { decision: 'PUBLISHED', adminReviewNote: 'Looks great' },
    });
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.property.publicationStatus).toBe('PUBLISHED');

    // Public API now returns published property + pagination + computed fields
    const publicAfter = await invokeApp({
      method: 'GET',
      url: '/api/v1/properties?purpose=SALE&location=Kadachanendhal',
    });
    expect(publicAfter.status).toBe(200);
    expect(publicAfter.body.items).toHaveLength(1);
    expect(publicAfter.body.items[0].pricePerSqFt).toBe(625);
    expect(publicAfter.body.pagination.total).toBe(1);

    // Invalid price range (minPrice > maxPrice) is rejected
    const badFilter = await invokeApp({
      method: 'GET',
      url: '/api/v1/properties?minPrice=2000000&maxPrice=500000',
    });
    expect(badFilter.status).toBe(400);

    // Owner edits published listing -> returns to PENDING_REVIEW
    const ownerEditPublished = await invokeApp({
      method: 'PATCH',
      url: `/api/v1/properties/${propId}`,
      cookies: userACookies,
      headers: { 'x-csrf-token': userACsrf },
      json: { price: 790000 },
    });
    expect(ownerEditPublished.status).toBe(200);
    expect(ownerEditPublished.body.property.publicationStatus).toBe('PENDING_REVIEW');

    // Non-admin cannot use admin property delete endpoint
    const nonAdminDelete = await invokeApp({
      method: 'DELETE',
      url: `/api/v1/admin/properties/${propId}`,
      cookies: userACookies,
      headers: { 'x-csrf-token': userACsrf },
    });
    expect(nonAdminDelete.status).toBe(403);

    // Admin deletes property and records audit log
    const adminDelete = await invokeApp({
      method: 'DELETE',
      url: `/api/v1/admin/properties/${propId}`,
      cookies: userBCookies,
      headers: { 'x-csrf-token': userBCsrf },
    });
    expect(adminDelete.status).toBe(200);
    expect(db.properties.find((p) => p.id === propId)).toBeUndefined();
    expect(db.auditLogs.some((l) => l.action === 'PROPERTY_DELETED' && l.targetId === propId)).toBe(true);
  });

  it('validates server-side math captcha and saves inquiries to database', async () => {
    const captchaRes = await invokeApp({ method: 'GET', url: '/api/v1/captcha' });
    expect(captchaRes.status).toBe(200);
    const { challengeId, question } = captchaRes.body;

    const match = question.match(/What is (\d+) ([+-]) (\d+)\?/);
    expect(match).toBeTruthy();
    const a = Number(match![1]);
    const op = match![2];
    const b = Number(match![3]);
    const answer = String(op === '+' ? a + b : a - b);

    // Wrong answer rejected
    const wrongRes = await invokeApp({
      method: 'POST',
      url: '/api/v1/inquiries',
      json: {
        name: 'Meenakshi',
        email: 'meenakshi@example.com',
        phone: '+91 98421 44444',
        propertyType: 'Land / Plot',
        message: 'Please share plot dimensions.',
        captchaChallengeId: challengeId,
        captchaAnswer: '999',
      },
    });
    expect(wrongRes.status).toBe(400);

    // Correct answer succeeds
    const okRes = await invokeApp({
      method: 'POST',
      url: '/api/v1/inquiries',
      json: {
        name: 'Meenakshi',
        email: 'meenakshi@example.com',
        phone: '+91 98421 44444',
        propertyType: 'Land / Plot',
        message: 'Please share plot dimensions.',
        captchaChallengeId: challengeId,
        captchaAnswer: answer,
      },
    });
    expect(okRes.status).toBe(201);
    expect(db.inquiries).toHaveLength(1);

    // Reusing same captcha fails (single-use)
    const replayRes = await invokeApp({
      method: 'POST',
      url: '/api/v1/inquiries',
      json: {
        name: 'Meenakshi',
        email: 'meenakshi@example.com',
        phone: '+91 98421 44444',
        propertyType: 'Land / Plot',
        message: 'Replay attempt',
        captchaChallengeId: challengeId,
        captchaAnswer: answer,
      },
    });
    expect(replayRes.status).toBe(400);
  });

  it('validates actual image file bytes on upload and rejects spoofed files', async () => {
    const uploader = await registerAndApproveUser({
      fullName: 'Uploader',
      email: 'uploader@example.com',
      phone: '+91 98421 55555',
      password: 'Password123',
    });
    const cookies = uploader.cookies;
    const csrf = uploader.csrf;

    const propRes = await invokeApp({
      method: 'POST',
      url: '/api/v1/properties',
      cookies,
      headers: { 'x-csrf-token': csrf },
      json: {
        title: 'Vaigai River View',
        description: 'Scenic plot near Sholavandan river belt.',
        propertyType: 'LAND_PLOT',
        listingPurpose: 'SALE',
        price: 1650000,
        totalAreaSqFt: 2200,
        facingDirection: 'NORTH',
        roadWidth: '30 ft road',
        landmark: 'Vaigai Bridge',
        locality: 'Sholavandan',
        city: 'Madurai',
      },
    });
    const propId = propRes.body.property.id;

    // Spoofed text file with .jpg extension must be rejected
    const fakeMultipart = buildMultipartBody(
      'image',
      Buffer.from('not-an-image-script'),
      'malicious.jpg',
      'image/jpeg'
    );
    const fakeUpload = await invokeApp({
      method: 'POST',
      url: `/api/v1/properties/${propId}/images`,
      cookies,
      headers: {
        'x-csrf-token': csrf,
        'content-type': `multipart/form-data; boundary=${fakeMultipart.boundary}`,
      },
      rawBody: fakeMultipart.buffer,
    });
    expect(fakeUpload.status).toBe(400);

    // Real PNG buffer created via sharp succeeds
    const validPng = await sharp({
      create: { width: 120, height: 90, channels: 3, background: { r: 36, g: 91, b: 69 } },
    })
      .png()
      .toBuffer();

    const validMultipart = buildMultipartBody('image', validPng, 'site.png', 'image/png');
    const validUpload = await invokeApp({
      method: 'POST',
      url: `/api/v1/properties/${propId}/images`,
      cookies,
      headers: {
        'x-csrf-token': csrf,
        'content-type': `multipart/form-data; boundary=${validMultipart.boundary}`,
      },
      rawBody: validMultipart.buffer,
    });
    expect(validUpload.status).toBe(201);
    expect(validUpload.body.image.isCover).toBe(true);
  });
});
