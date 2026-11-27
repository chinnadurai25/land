import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { loginSchema, registerSchema } from '../validation/schemas.js';
import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  createUserSession,
  ensureCsrfCookie,
  hashSessionToken,
} from '../middleware/auth.js';

export const authRouter = Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please wait a few minutes and try again.',
    },
  },
});

authRouter.get('/csrf', (req, res) => {
  const csrfToken = ensureCsrfCookie(req, res);
  res.json({ csrfToken });
});

authRouter.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email address already exists.');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    // Role is strictly USER and accountStatus is PENDING on public registration
    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: 'USER',
        accountStatus: 'PENDING',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        accountStatus: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      pendingApproval: true,
      message:
        'Registration details saved! Your account is awaiting administrator approval before signing in.',
      user,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    if (user.accountStatus === 'PENDING') {
      throw new AppError(
        403,
        'ACCOUNT_PENDING',
        'Your registration is saved and awaiting administrator approval.'
      );
    }

    if (user.accountStatus === 'REJECTED') {
      throw new AppError(
        403,
        'ACCOUNT_REJECTED',
        user.accountReviewNote
          ? `Your account was not approved: ${user.accountReviewNote}`
          : 'Your account registration was not approved by the administrator.'
      );
    }

    // Rotate any existing session cookie token
    const oldRawToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (typeof oldRawToken === 'string' && oldRawToken.length > 0) {
      await prisma.session
        .deleteMany({ where: { tokenHash: hashSessionToken(oldRawToken) } })
        .catch(() => undefined);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const csrfToken = await createUserSession(user.id, res);

    res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
      },
      csrfToken,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (typeof rawToken === 'string' && rawToken.length > 0) {
      await prisma.session
        .deleteMany({ where: { tokenHash: hashSessionToken(rawToken) } })
        .catch(() => undefined);
    }

    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
    res.json({ message: 'Signed out successfully.' });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', (req, res) => {
  const csrfToken = ensureCsrfCookie(req, res);
  res.json({
    user: req.user ?? null,
    csrfToken,
  });
});
