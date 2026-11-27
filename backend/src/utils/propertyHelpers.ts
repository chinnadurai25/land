import crypto from 'node:crypto';
import type { Property, PropertyImage, Location } from '@prisma/client';

export type PropertyWithRelations = Property & {
  location: Location;
  images: PropertyImage[];
  favorites?: { id: string }[];
  owner?: { id: string; fullName: string; phone: string };
};

export function createSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base || 'property'}-${suffix}`;
}

export function computeAreaInCents(totalAreaSqFt: number): number {
  if (!Number.isFinite(totalAreaSqFt) || totalAreaSqFt <= 0) return 0;
  return Number((totalAreaSqFt / 435.6).toFixed(2));
}

export function computePricePerSqFt(price: number, totalAreaSqFt: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(totalAreaSqFt) || totalAreaSqFt <= 0) {
    return 0;
  }
  return Math.round(price / totalAreaSqFt);
}

export function formatPropertyDto(
  property: PropertyWithRelations,
  options: { includeOwnerContact?: boolean; includeReviewNote?: boolean } = {}
) {
  const numericPrice = Number(property.price);
  const sortedImages = [...property.images].sort((a, b) => {
    if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
    return a.displayOrder - b.displayOrder;
  });

  return {
    id: property.id,
    ownerId: property.ownerId,
    title: property.title,
    slug: property.slug,
    description: property.description,
    propertyType: property.propertyType,
    listingPurpose: property.listingPurpose,
    price: numericPrice,
    rentPeriod: property.rentPeriod,
    totalAreaSqFt: property.totalAreaSqFt,
    areaInCents: computeAreaInCents(property.totalAreaSqFt),
    pricePerSqFt: computePricePerSqFt(numericPrice, property.totalAreaSqFt),
    facingDirection: property.facingDirection,
    roadWidth: property.roadWidth,
    approvalStatus: property.approvalStatus,
    approvalReference: property.approvalReference,
    landmark: property.landmark,
    publicationStatus: property.publicationStatus,
    isFeatured: property.isFeatured,
    isDemo: property.isDemo,
    ...(options.includeReviewNote ? { adminReviewNote: property.adminReviewNote } : {}),
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    publishedAt: property.publishedAt,
    location: {
      id: property.location.id,
      locality: property.location.locality,
      city: property.location.city,
      state: property.location.state,
      postalCode: property.location.postalCode,
      latitude: property.location.latitude ? Number(property.location.latitude) : null,
      longitude: property.location.longitude ? Number(property.location.longitude) : null,
    },
    images: sortedImages.map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      thumbnailUrl: img.thumbnailUrl,
      altText: img.altText,
      category: img.category,
      displayOrder: img.displayOrder,
      isCover: img.isCover,
    })),
    isFavorited: Array.isArray(property.favorites) ? property.favorites.length > 0 : false,
    ...(options.includeOwnerContact && property.owner
      ? {
          owner: {
            id: property.owner.id,
            fullName: property.owner.fullName,
            phone: property.owner.phone,
          },
        }
      : {}),
  };
}
