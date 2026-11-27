import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { createInquirySchema } from '../validation/schemas.js';
import { createMathCaptcha, verifyAndConsumeMathCaptcha } from '../services/captcha.js';

export const inquiriesRouter = Router();

const inquiryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many inquiry submissions. Please wait a few minutes before trying again.',
    },
  },
});

inquiriesRouter.get('/captcha', async (_req, res, next) => {
  try {
    const captcha = await createMathCaptcha();
    res.json(captcha);
  } catch (err) {
    next(err);
  }
});

inquiriesRouter.post('/inquiries', inquiryRateLimiter, async (req, res, next) => {
  try {
    const data = createInquirySchema.parse(req.body);

    await verifyAndConsumeMathCaptcha(data.captchaChallengeId, data.captchaAnswer);

    let verifiedPropertyId: string | null = null;
    if (data.propertyId) {
      const property = await prisma.property.findFirst({
        where: {
          id: data.propertyId,
          publicationStatus: 'PUBLISHED',
        },
        select: { id: true },
      });
      if (!property) {
        throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Referenced property listing was not found.');
      }
      verifiedPropertyId = property.id;
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        propertyId: verifiedPropertyId,
        userId: req.user?.id ?? null,
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        propertyType: data.propertyType,
        message: data.message,
        status: 'NEW',
      },
      select: {
        id: true,
        propertyId: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'Your inquiry has been saved. Our Madurai team will follow up with you directly.',
      inquiry,
    });
  } catch (err) {
    next(err);
  }
});
