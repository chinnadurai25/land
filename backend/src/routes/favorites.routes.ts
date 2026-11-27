import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { formatPropertyDto } from '../utils/propertyHelpers.js';

export const favoritesRouter = Router();

favoritesRouter.get('/me/favorites', requireAuth, async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: {
        userId: req.user!.id,
        property: {
          publicationStatus: 'PUBLISHED',
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          include: {
            location: true,
            images: { orderBy: { displayOrder: 'asc' } },
          },
        },
      },
    });

    res.json({
      items: favorites.map((f) => ({
        ...formatPropertyDto({ ...f.property, favorites: [{ id: f.id }] }),
        favoritedAt: f.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

favoritesRouter.post('/me/favorites/:propertyId', requireAuth, async (req, res, next) => {
  try {
    const propertyId = String(req.params.propertyId);
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        publicationStatus: 'PUBLISHED',
      },
      select: { id: true },
    });

    if (!property) {
      throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Property listing not found.');
    }

    await prisma.favorite.upsert({
      where: {
        userId_propertyId: {
          userId: req.user!.id,
          propertyId: property.id,
        },
      },
      update: {},
      create: {
        userId: req.user!.id,
        propertyId: property.id,
      },
    });

    res.status(201).json({ message: 'Saved to your favorites.', isFavorited: true });
  } catch (err) {
    next(err);
  }
});

favoritesRouter.delete('/me/favorites/:propertyId', requireAuth, async (req, res, next) => {
  try {
    const propertyId = String(req.params.propertyId);
    await prisma.favorite.deleteMany({
      where: {
        userId: req.user!.id,
        propertyId,
      },
    });

    res.json({ message: 'Removed from your favorites.', isFavorited: false });
  } catch (err) {
    next(err);
  }
});
