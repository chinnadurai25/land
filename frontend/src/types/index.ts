export type Role = 'USER' | 'ADMIN';
export type AccountStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type PropertyType =
  | 'LAND_PLOT'
  | 'AGRI_LAND'
  | 'RESIDENTIAL_HOME'
  | 'APARTMENT'
  | 'COMMERCIAL_SPACE';

export type ListingPurpose = 'SALE' | 'RENT';
export type RentPeriod = 'MONTHLY' | 'YEARLY';
export type FacingDirection =
  | 'NORTH'
  | 'SOUTH'
  | 'EAST'
  | 'WEST'
  | 'NORTH_EAST'
  | 'NORTH_WEST'
  | 'SOUTH_EAST'
  | 'SOUTH_WEST';

export type ApprovalStatus = 'NOT_PROVIDED' | 'PENDING_VERIFICATION' | 'VERIFIED';
export type PublicationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
export type InquiryStatus = 'NEW' | 'CONTACTED' | 'CLOSED';
export type ImageCategory = 'SITE_PHOTO' | 'LAYOUT';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  accountStatus?: AccountStatus;
  createdAt: string;
}

export interface LocationItem {
  id: string;
  locality: string;
  city: string;
  state: string;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  publishedCount?: number;
}

export interface PropertyImageItem {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  altText: string;
  category: ImageCategory;
  displayOrder: number;
  isCover: boolean;
}

export interface PropertyItem {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  description: string;
  propertyType: PropertyType;
  listingPurpose: ListingPurpose;
  price: number;
  rentPeriod: RentPeriod | null;
  totalAreaSqFt: number;
  areaInCents: number;
  pricePerSqFt: number;
  facingDirection: FacingDirection;
  roadWidth: string;
  approvalStatus: ApprovalStatus;
  approvalReference: string | null;
  landmark: string;
  publicationStatus: PublicationStatus;
  isFeatured: boolean;
  isDemo: boolean;
  adminReviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  location: LocationItem;
  images: PropertyImageItem[];
  isFavorited: boolean;
  owner?: {
    id: string;
    fullName: string;
    phone: string;
  };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SearchFilters {
  purpose: ListingPurpose;
  type: PropertyType | '';
  location: string;
  minPrice: string;
  maxPrice: string;
  featuredOnly: boolean;
  sort: 'newest' | 'price_asc' | 'price_desc' | 'area_desc';
  page: number;
}

export interface AdminStats {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  publishedListings: number;
  pendingReviewListings: number;
  newInquiries: number;
}

export interface AdminInquiryItem {
  id: string;
  propertyId: string | null;
  name: string;
  email: string;
  phone: string;
  propertyType: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  property?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  accountStatus: AccountStatus;
  accountReviewNote: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    properties: number;
    favorites: number;
    inquiries: number;
  };
}

export interface AuditLogItem {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string | null;
  createdAt: string;
  admin: {
    id: string;
    fullName: string;
    email: string;
  };
}
