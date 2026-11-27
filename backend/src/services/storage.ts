import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export interface UploadedImageResult {
  storageKey: string;
  imageUrl: string;
  thumbnailUrl: string;
}

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

const LOCAL_UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

function createS3Client(): S3Client | null {
  if (env.STORAGE_DRIVER !== 's3') return null;
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    return null;
  }
  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
}

const s3Client = createS3Client();

function hasMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  // WEBP: RIFF....WEBP
  const isWebp =
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  return isJpeg || isPng || isWebp;
}

export async function processAndStorePropertyImage(
  buffer: Buffer,
  propertyId: string,
  category: 'SITE_PHOTO' | 'LAYOUT'
): Promise<UploadedImageResult> {
  if (!hasMagicBytes(buffer)) {
    throw new AppError(400, 'INVALID_IMAGE', 'Only valid JPEG, PNG, and WebP images are permitted.');
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch {
    throw new AppError(400, 'INVALID_IMAGE', 'Could not decode uploaded image file.');
  }

  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw new AppError(400, 'INVALID_IMAGE', 'Unsupported image format. Please upload JPEG, PNG, or WebP.');
  }

  const folder = category === 'LAYOUT' ? 'layouts' : 'photos';
  const fileId = crypto.randomUUID();
  const mainKey = `properties/${propertyId}/${folder}/${fileId}.webp`;
  const thumbKey = `properties/${propertyId}/${folder}/${fileId}-thumb.webp`;

  // Optimize main image (auto-orient, strip EXIF metadata, max 1600px wide)
  const mainBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer();

  // Generate responsive thumbnail (640px wide)
  const thumbBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: 640, height: 480, fit: 'cover', position: 'centre' })
    .webp({ quality: 78 })
    .toBuffer();

  if (env.STORAGE_DRIVER === 's3') {
    if (!s3Client || !env.S3_BUCKET) {
      throw new AppError(500, 'STORAGE_MISCONFIGURED', 'Object storage is not configured.');
    }

    await Promise.all([
      s3Client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: mainKey,
          Body: mainBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        })
      ),
      s3Client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: thumbKey,
          Body: thumbBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        })
      ),
    ]);

    const baseUrl = env.S3_PUBLIC_BASE_URL
      ? env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')
      : `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com`;

    return {
      storageKey: mainKey,
      imageUrl: `${baseUrl}/${mainKey}`,
      thumbnailUrl: `${baseUrl}/${thumbKey}`,
    };
  }

  // Local development fallback only (disallowed in production by env.ts)
  const mainPath = path.join(LOCAL_UPLOAD_ROOT, mainKey);
  const thumbPath = path.join(LOCAL_UPLOAD_ROOT, thumbKey);
  await fs.mkdir(path.dirname(mainPath), { recursive: true });
  await Promise.all([fs.writeFile(mainPath, mainBuffer), fs.writeFile(thumbPath, thumbBuffer)]);

  return {
    storageKey: mainKey,
    imageUrl: `/api/v1/media/${mainKey}`,
    thumbnailUrl: `/api/v1/media/${thumbKey}`,
  };
}

export async function deleteStoredPropertyImage(storageKey: string): Promise<void> {
  if (!storageKey || storageKey.startsWith('demo/')) {
    return;
  }

  const thumbKey = storageKey.replace(/\.webp$/, '-thumb.webp');

  if (env.STORAGE_DRIVER === 's3' && s3Client && env.S3_BUCKET) {
    await Promise.allSettled([
      s3Client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: storageKey })),
      s3Client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: thumbKey })),
    ]);
    return;
  }

  const safeMain = path.resolve(LOCAL_UPLOAD_ROOT, storageKey);
  const safeThumb = path.resolve(LOCAL_UPLOAD_ROOT, thumbKey);
  if (safeMain.startsWith(LOCAL_UPLOAD_ROOT)) {
    await fs.unlink(safeMain).catch(() => undefined);
  }
  if (safeThumb.startsWith(LOCAL_UPLOAD_ROOT)) {
    await fs.unlink(safeThumb).catch(() => undefined);
  }
}

export function getLocalUploadRoot(): string {
  return LOCAL_UPLOAD_ROOT;
}
