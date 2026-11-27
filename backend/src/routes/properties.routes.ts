import { Router } from 'express';
import multer from 'multer';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createPropertySchema,
  publicPropertyQuerySchema,
  updatePropertySchema,
} from '../validation/schemas.js';
import { createSlug, formatPropertyDto } from '../utils/propertyHelpers.js';
import {
  deleteStoredPropertyImage,
  processAndStorePropertyImage,
} from '../services/storage.js';

export const propertiesRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024,
    files: 5,
  },
});

// Public: List locations with published property counts
propertiesRouter.get('/locations', async (_req, res, next) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { locality: 'asc' },
      include: {
        _count: {
          select: {
            properties: {
              where: { publicationStatus: 'PUBLISHED' },
            },
          },
        },
      },
    });

    res.json({
      locations: locations.map((loc) => ({
        id: loc.id,
        locality: loc.locality,
        city: loc.city,
        state: loc.state,
        postalCode: loc.postalCode,
        publishedCount: loc._count.properties,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Public: Filter and paginate published properties
propertiesRouter.get('/properties', async (req, res, next) => {
  try {
    const query = publicPropertyQuerySchema.parse(req.query);

    const where: Prisma.PropertyWhereInput = {
      publicationStatus: 'PUBLISHED',
    };

    if (query.purpose) {
      where.listingPurpose = query.purpose;
    }
    if (query.type) {
      where.propertyType = query.type;
    }
    if (query.featured !== undefined) {
      where.isFeatured = query.featured;
    }
    if (query.location && query.location.length > 0) {
      where.location = {
        OR: [
          { locality: { contains: query.location } },
          { city: { contains: query.location } },
        ],
      };
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      };
    }

    let orderBy: Prisma.PropertyOrderByWithRelationInput[] = [
      { isFeatured: 'desc' },
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
    ];
    if (query.sort === 'price_asc') {
      orderBy = [{ price: 'asc' }];
    } else if (query.sort === 'price_desc') {
      orderBy = [{ price: 'desc' }];
    } else if (query.sort === 'area_desc') {
      orderBy = [{ totalAreaSqFt: 'desc' }];
    }

    const skip = (query.page - 1) * query.pageSize;

    const [items, total, totalPublishedCount, publishedLocations] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize,
        include: {
          location: true,
          images: { orderBy: { displayOrder: 'asc' } },
          ...(req.user
            ? {
                favorites: {
                  where: { userId: req.user.id },
                  select: { id: true },
                },
              }
            : {}),
        },
      }),
      prisma.property.count({ where }),
      prisma.property.count({ where: { publicationStatus: 'PUBLISHED' } }),
      prisma.property.findMany({
        where: { publicationStatus: 'PUBLISHED' },
        select: { locationId: true },
        distinct: ['locationId'],
      }),
    ]);

    res.json({
      items: items.map((p) => formatPropertyDto(p)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
      meta: {
        totalPublishedCount,
        uniqueLocationCount: publishedLocations.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Public: Single published property by slug
propertiesRouter.get('/properties/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug);
    const property = await prisma.property.findFirst({
      where: {
        slug,
        publicationStatus: 'PUBLISHED',
      },
      include: {
        location: true,
        images: { orderBy: { displayOrder: 'asc' } },
        ...(req.user
          ? {
              favorites: {
                where: { userId: req.user.id },
                select: { id: true },
              },
            }
          : {}),
      },
    });

    if (!property) {
      throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Property listing not found.');
    }

    res.json({ property: formatPropertyDto(property) });
  } catch (err) {
    next(err);
  }
});

// Owner: List own properties (all statuses)
propertiesRouter.get('/me/properties', requireAuth, async (req, res, next) => {
  try {
    const properties = await prisma.property.findMany({
      where: { ownerId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        location: true,
        images: { orderBy: { displayOrder: 'asc' } },
      },
    });

    res.json({
      items: properties.map((p) =>
        formatPropertyDto(p, { includeReviewNote: true })
      ),
    });
  } catch (err) {
    next(err);
  }
});

// Owner: Create draft property
propertiesRouter.post('/properties', requireAuth, async (req, res, next) => {
  try {
    const data = createPropertySchema.parse(req.body);

    const property = await prisma.$transaction(async (tx) => {
      const location = await tx.location.upsert({
        where: {
          locality_city: {
            locality: data.locality,
            city: data.city,
          },
        },
        update: {
          ...(data.postalCode ? { postalCode: data.postalCode } : {}),
        },
        create: {
          locality: data.locality,
          city: data.city,
          state: 'Tamil Nadu',
          postalCode: data.postalCode ?? null,
        },
      });

      return tx.property.create({
        data: {
          ownerId: req.user!.id,
          locationId: location.id,
          title: data.title,
          slug: createSlug(data.title),
          description: data.description,
          propertyType: data.propertyType,
          listingPurpose: data.listingPurpose,
          price: data.price,
          rentPeriod: data.listingPurpose === 'RENT' ? data.rentPeriod ?? 'MONTHLY' : null,
          totalAreaSqFt: data.totalAreaSqFt,
          facingDirection: data.facingDirection,
          roadWidth: data.roadWidth,
          approvalStatus: data.approvalStatus,
          approvalReference: data.approvalReference ?? null,
          landmark: data.landmark,
          publicationStatus: 'DRAFT',
          isFeatured: false,
          isDemo: false,
        },
        include: {
          location: true,
          images: true,
        },
      });
    });

    res.status(201).json({
      message: 'Draft saved',
      property: formatPropertyDto(property, { includeReviewNote: true }),
    });
  } catch (err) {
    next(err);
  }
});

// Owner: Update own property
propertiesRouter.patch('/properties/:id', requireAuth, async (req, res, next) => {
  try {
    const propertyId = String(req.params.id);
    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { location: true },
    });

    if (!existing) {
      throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Property listing not found.');
    }

    const isAdmin = req.user!.role === 'ADMIN';
    if (existing.ownerId !== req.user!.id && !isAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to edit this listing.');
    }

    const data = updatePropertySchema.parse(req.body);
    const nextPurpose = data.listingPurpose ?? existing.listingPurpose;
    const nextRentPeriod =
      nextPurpose === 'RENT'
        ? data.rentPeriod !== undefined
          ? data.rentPeriod
          : existing.rentPeriod ?? 'MONTHLY'
        : null;

    // Changes to published content by an owner return the listing to review before becoming public
    const requiresReReview = !isAdmin && existing.publicationStatus === 'PUBLISHED';

    const updated = await prisma.$transaction(async (tx) => {
      let locationId = existing.locationId;
      if (data.locality || data.city) {
        const loc = await tx.location.upsert({
          where: {
            locality_city: {
              locality: data.locality ?? existing.location.locality,
              city: data.city ?? existing.location.city,
            },
          },
          update: {
            ...(data.postalCode !== undefined ? { postalCode: data.postalCode } : {}),
          },
          create: {
            locality: data.locality ?? existing.location.locality,
            city: data.city ?? existing.location.city,
            state: 'Tamil Nadu',
            postalCode: data.postalCode ?? null,
          },
        });
        locationId = loc.id;
      }

      return tx.property.update({
        where: { id: existing.id },
        data: {
          ...(data.title ? { title: data.title } : {}),
          ...(data.description ? { description: data.description } : {}),
          ...(data.propertyType ? { propertyType: data.propertyType } : {}),
          ...(data.listingPurpose ? { listingPurpose: data.listingPurpose } : {}),
          ...(data.price !== undefined ? { price: data.price } : {}),
          rentPeriod: nextRentPeriod,
          ...(data.totalAreaSqFt !== undefined ? { totalAreaSqFt: data.totalAreaSqFt } : {}),
          ...(data.facingDirection ? { facingDirection: data.facingDirection } : {}),
          ...(data.roadWidth ? { roadWidth: data.roadWidth } : {}),
          ...(data.approvalStatus ? { approvalStatus: data.approvalStatus } : {}),
          ...(data.approvalReference !== undefined
            ? { approvalReference: data.approvalReference }
            : {}),
          ...(data.landmark ? { landmark: data.landmark } : {}),
          locationId,
          ...(requiresReReview
            ? {
                publicationStatus: 'PENDING_REVIEW',
                publishedAt: null,
                adminReviewNote: 'Returned to review after content edits.',
              }
            : {}),
        },
        include: {
          location: true,
          images: { orderBy: { displayOrder: 'asc' } },
        },
      });
    });

    res.json({
      message: requiresReReview
        ? 'Changes saved and submitted for review.'
        : 'Draft saved',
      property: formatPropertyDto(updated, { includeReviewNote: true }),
    });
  } catch (err) {
    next(err);
  }
});

// Owner: Delete own property and clean up images
propertiesRouter.delete('/properties/:id', requireAuth, async (req, res, next) => {
  try {
    const propertyId = String(req.params.id);
    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { images: true },
    });

    if (!existing) {
      throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Property listing not found.');
    }

    if (existing.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this listing.');
    }

    await prisma.property.delete({ where: { id: existing.id } });
    await Promise.allSettled(existing.images.map((img) => deleteStoredPropertyImage(img.storageKey)));

    res.json({ message: 'Listing deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// Owner: Submit draft or rejected property for review
propertiesRouter.post('/properties/:id/submit', requireAuth, async (req, res, next) => {
  try {
    const propertyId = String(req.params.id);
    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!existing) {
      throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Property listing not found.');
    }

    if (existing.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to submit this listing.');
    }

    if (existing.publicationStatus === 'PUBLISHED') {
      throw new AppError(400, 'ALREADY_PUBLISHED', 'This listing is already published.');
    }

    const updated = await prisma.property.update({
      where: { id: existing.id },
      data: {
        publicationStatus: 'PENDING_REVIEW',
        adminReviewNote: null,
      },
      include: {
        location: true,
        images: { orderBy: { displayOrder: 'asc' } },
      },
    });

    res.json({
      message: 'Submitted for review',
      property: formatPropertyDto(updated, { includeReviewNote: true }),
    });
  } catch (err) {
    next(err);
  }
});

// Owner: Upload property image(s)
propertiesRouter.post(
  '/properties/:id/images',
  requireAuth,
  upload.single('image'),
  async (req, res, next) => {
    try {
      const propertyId = String(req.params.id);
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { images: true },
      });

      if (!property) {
        throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Property listing not found.');
      }

      if (property.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
        throw new AppError(403, 'FORBIDDEN', 'You do not have permission to upload images here.');
      }

      if (property.images.length >= env.MAX_IMAGES_PER_PROPERTY) {
        throw new AppError(
          400,
          'IMAGE_LIMIT_REACHED',
          `Maximum of ${env.MAX_IMAGES_PER_PROPERTY} images allowed per property.`
        );
      }

      if (!req.file) {
        throw new AppError(400, 'MISSING_FILE', 'Please select a JPEG, PNG, or WebP image file.');
      }

      const category = req.body?.category === 'LAYOUT' ? 'LAYOUT' : 'SITE_PHOTO';
      const altText =
        typeof req.body?.altText === 'string' && req.body.altText.trim().length > 0
          ? req.body.altText.trim().slice(0, 140)
          : `${property.title} — ${category === 'LAYOUT' ? 'Illustrative layout' : 'Site photograph'}`;
      const makeCover =
        req.body?.isCover === 'true' || property.images.length === 0;

      const stored = await processAndStorePropertyImage(
        req.file.buffer,
        property.id,
        category
      );

      const createdImage = await prisma.$transaction(async (tx) => {
        if (makeCover) {
          await tx.propertyImage.updateMany({
            where: { propertyId: property.id },
            data: { isCover: false },
          });
        }

        const nextOrder =
          property.images.reduce((max, img) => Math.max(max, img.displayOrder), -1) + 1;

        return tx.propertyImage.create({
          data: {
            propertyId: property.id,
            storageKey: stored.storageKey,
            imageUrl: stored.imageUrl,
            thumbnailUrl: stored.thumbnailUrl,
            altText,
            category,
            displayOrder: nextOrder,
            isCover: makeCover,
          },
        });
      });

      res.status(201).json({ image: createdImage });
    } catch (err) {
      next(err);
    }
  }
);

// Owner: Set cover image
propertiesRouter.patch(
  '/properties/:id/images/:imageId',
  requireAuth,
  async (req, res, next) => {
    try {
      const propertyId = String(req.params.id);
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { images: true },
      });

      if (!property) {
        throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Property listing not found.');
      }

      if (property.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
        throw new AppError(403, 'FORBIDDEN', 'You do not have permission to update images here.');
      }

      const target = property.images.find((img) => img.id === String(req.params.imageId));
      if (!target) {
        throw new AppError(404, 'IMAGE_NOT_FOUND', 'Image not found.');
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (req.body?.isCover === true) {
          await tx.propertyImage.updateMany({
            where: { propertyId: property.id },
            data: { isCover: false },
          });
        }
        return tx.propertyImage.update({
          where: { id: target.id },
          data: {
            ...(req.body?.isCover === true ? { isCover: true } : {}),
            ...(typeof req.body?.displayOrder === 'number'
              ? { displayOrder: req.body.displayOrder }
              : {}),
          },
        });
      });

      res.json({ image: updated });
    } catch (err) {
      next(err);
    }
  }
);

// Owner: Delete property image
propertiesRouter.delete(
  '/properties/:id/images/:imageId',
  requireAuth,
  async (req, res, next) => {
    try {
      const propertyId = String(req.params.id);
      const imageId = String(req.params.imageId);
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { images: { orderBy: { displayOrder: 'asc' } } },
      });

      if (!property) {
        throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Property listing not found.');
      }

      if (property.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
        throw new AppError(403, 'FORBIDDEN', 'You do not have permission to remove images here.');
      }

      const target = property.images.find((img) => img.id === imageId);
      if (!target) {
        throw new AppError(404, 'IMAGE_NOT_FOUND', 'Image not found.');
      }

      await prisma.propertyImage.delete({ where: { id: target.id } });
      await deleteStoredPropertyImage(target.storageKey);

      if (target.isCover) {
        const replacement = property.images.find((img) => img.id !== target.id);
        if (replacement) {
          await prisma.propertyImage.update({
            where: { id: replacement.id },
            data: { isCover: true },
          });
        }
      }

      res.json({ message: 'Image removed.' });
    } catch (err) {
      next(err);
    }
  }
);
