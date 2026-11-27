import type {
  ApprovalStatus,
  FacingDirection,
  ListingPurpose,
  PropertyType,
  PublicationStatus,
  RentPeriod,
} from '../types';

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  LAND_PLOT: 'Land / Plot',
  AGRI_LAND: 'Agri Land',
  RESIDENTIAL_HOME: 'Residential Home',
  APARTMENT: 'Apartment',
  COMMERCIAL_SPACE: 'Commercial Space',
};

export const FACING_LABELS: Record<FacingDirection, string> = {
  NORTH: 'North facing',
  SOUTH: 'South facing',
  EAST: 'East facing',
  WEST: 'West facing',
  NORTH_EAST: 'North-East facing',
  NORTH_WEST: 'North-West facing',
  SOUTH_EAST: 'South-East facing',
  SOUTH_WEST: 'South-West facing',
};

export const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  NOT_PROVIDED: 'Not provided (verify deeds independently)',
  PENDING_VERIFICATION: 'Illustrative / pending verification',
  VERIFIED: 'Approval reference reviewed',
};

export const PUBLICATION_STATUS_META: Record<
  PublicationStatus,
  { label: string; badgeClass: string }
> = {
  DRAFT: {
    label: 'Draft saved',
    badgeClass: 'bg-[#EEF1E8] text-[#1F3229] border-[#C5D1C1]',
  },
  PENDING_REVIEW: {
    label: 'Submitted for review',
    badgeClass: 'bg-[#FDF3E7] text-[#8A4A18] border-[#E7C8A0]',
  },
  PUBLISHED: {
    label: 'Published',
    badgeClass: 'bg-[#245B45] text-white border-[#245B45]',
  },
  REJECTED: {
    label: 'Changes required',
    badgeClass: 'bg-[#F8EFE6] text-[#7A421D] border-[#D8B490]',
  },
};

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPropertyPrice(
  price: number,
  purpose: ListingPurpose,
  rentPeriod?: RentPeriod | null
): string {
  const formatted = formatINR(price);
  if (purpose === 'RENT') {
    return `${formatted}${rentPeriod === 'YEARLY' ? '/year' : '/month'}`;
  }
  return formatted;
}

export function formatSqFt(sqFt: number): string {
  return `${new Intl.NumberFormat('en-IN').format(sqFt)} sq.ft`;
}

export function formatLocationLine(locality: string, city: string): string {
  if (!locality || locality.toLowerCase() === city.toLowerCase()) {
    return city;
  }
  return `${locality}, ${city}`;
}
