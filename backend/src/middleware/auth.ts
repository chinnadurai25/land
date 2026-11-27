import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { AccountStatus, Role } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

export const SESSION_COOKIE_NAME = 'landnest_session';
export const CSRF_COOKIE_NAME = 'landnest_csrf';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  accountStatus: AccountStatus;
  createdAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}

export function hashSessionToken(rawToken: string): string {
  return crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(rawToken)
    .digest('hex');
}

export function getCookieOptions(httpOnly: boolean, maxAgeMs = SESSION_TTL_MS) {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeMs,
  };
}

export async function createUserSession(userId: string, res: Response): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  res.cookie(SESSION_COOKIE_NAME, rawToken, getCookieOptions(true));
  const csrfToken = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, csrfToken, getCookieOptions(false));
  return csrfToken;
}

export function ensureCsrfCookie(req: Request, res: Response): string {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  if (typeof existing === 'string' && existing.length >= 24) {
    return existing;
  }
  const token = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions(false));
  return token;
}

export async function attachSessionUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (!rawToken || typeof rawToken !== 'string') {
      next();
      return;
    }

    const tokenHash = hashSessionToken(rawToken);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            accountStatus: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date() || session.user.accountStatus !== 'APPROVED') {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      }
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      next();
      return;
    }

    req.user = session.user;
    req.sessionId = session.id;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError(401, 'UNAUTHORIZED', 'Please sign in to continue.'));
    return;
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError(401, 'UNAUTHORIZED', 'Please sign in to continue.'));
    return;
  }
  if (req.user.role !== 'ADMIN') {
    next(new AppError(403, 'FORBIDDEN', 'Administrator access is required for this action.'));
    return;
  }
  next();
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (safeMethods.has(req.method)) {
    next();
    return;
  }

  // Validate Origin when sent by browsers
  const origin = req.headers.origin;
  const allowedOrigins = env.FRONTEND_URL.split(',').map((o) => o.trim());
  if (origin && !allowedOrigins.includes(origin)) {
    next(new AppError(403, 'CSRF_ORIGIN_MISMATCH', 'Request origin is not permitted.'));
    return;
  }

  // Enforce double-submit CSRF token on cookie-authenticated mutations
  const hasSessionCookie = Boolean(req.cookies?.[SESSION_COOKIE_NAME]);
  if (hasSessionCookie) {
    const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
    const csrfHeader = req.headers['x-csrf-token'];
    if (
      typeof csrfCookie !== 'string' ||
      typeof csrfHeader !== 'string' ||
      csrfCookie.length < 16 ||
      csrfCookie !== csrfHeader
    ) {
      next(new AppError(403, 'CSRF_INVALID', 'Invalid or missing security token. Please refresh the page.'));
      return;
    }
  }

  next();
}
