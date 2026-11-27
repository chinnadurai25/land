import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

function hashCaptchaAnswer(challengeId: string, answer: string): string {
  return crypto
    .createHmac('sha256', env.CAPTCHA_SECRET)
    .update(`${challengeId}:${answer.trim()}`)
    .digest('hex');
}

export async function createMathCaptcha(): Promise<{
  challengeId: string;
  question: string;
  expiresAt: string;
}> {
  const useAddition = crypto.randomInt(0, 2) === 0;
  let a = crypto.randomInt(2, 15);
  let b = crypto.randomInt(2, 12);
  if (!useAddition && b > a) {
    [a, b] = [b, a];
  }

  const answer = useAddition ? a + b : a - b;
  const question = useAddition ? `What is ${a} + ${b}?` : `What is ${a} - ${b}?`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const id = crypto.randomUUID();
  const answerHash = hashCaptchaAnswer(id, String(answer));

  // Periodically prune expired challenges
  await prisma.captchaChallenge
    .deleteMany({
      where: {
        expiresAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    })
    .catch(() => undefined);

  await prisma.captchaChallenge.create({
    data: {
      id,
      answerHash,
      expiresAt,
    },
  });

  return {
    challengeId: id,
    question,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function verifyAndConsumeMathCaptcha(
  challengeId: string,
  submittedAnswer: string
): Promise<void> {
  const challenge = await prisma.captchaChallenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge || challenge.usedAt !== null || challenge.expiresAt < new Date()) {
    throw new AppError(
      400,
      'INVALID_CAPTCHA',
      'Security check has expired or was already used. Please refresh and try again.'
    );
  }

  const expectedHash = challenge.answerHash;
  const actualHash = hashCaptchaAnswer(challengeId, submittedAnswer);

  const expectedBuf = Buffer.from(expectedHash, 'hex');
  const actualBuf = Buffer.from(actualHash, 'hex');

  const isMatch =
    expectedBuf.length === actualBuf.length &&
    crypto.timingSafeEqual(expectedBuf, actualBuf);

  if (!isMatch) {
    throw new AppError(
      400,
      'INVALID_CAPTCHA',
      'Incorrect answer to the math check. Please try again.'
    );
  }

  // Mark single-use atomically
  const updated = await prisma.captchaChallenge.updateMany({
    where: {
      id: challengeId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  if (updated.count === 0) {
    throw new AppError(
      400,
      'INVALID_CAPTCHA',
      'Security check was already used. Please refresh and try again.'
    );
  }
}
