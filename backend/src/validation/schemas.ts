import { z } from 'zod';

export const PropertyTypeEnum = z.enum([
  'LAND_PLOT',
  'AGRI_LAND',
  'RESIDENTIAL_HOME',
  'APARTMENT',
  'COMMERCIAL_SPACE',
]);

export const ListingPurposeEnum = z.enum(['SALE', 'RENT']);
export const RentPeriodEnum = z.enum(['MONTHLY', 'YEARLY']);
export const FacingDirectionEnum = z.enum([
  'NORTH',
  'SOUTH',
  'EAST',
  'WEST',
  'NORTH_EAST',
  'NORTH_WEST',
  'SOUTH_EAST',
  'SOUTH_WEST',
]);

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{8,20}$/, 'Please enter a valid phone number'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const publicPropertyQuerySchema = z
  .object({
    purpose: ListingPurposeEnum.optional(),
    type: PropertyTypeEnum.optional(),
    location: z.string().trim().max(100).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    featured: z
      .enum(['true', 'false'])
      .optional()
      .transform((val) => (val === undefined ? undefined : val === 'true')),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'area_desc']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(24).default(9),
  })
  .refine(
    (data) =>
      data.minPrice === undefined ||
      data.maxPrice === undefined ||
      data.minPrice <= data.maxPrice,
    {
      message: 'Minimum price cannot exceed maximum price.',
      path: ['minPrice'],
    }
  );

export const createPropertySchema = z
  .object({
    title: z.string().trim().min(4, 'Title must be at least 4 characters').max(120),
    description: z.string().trim().min(15, 'Description must be at least 15 characters').max(3000),
    propertyType: PropertyTypeEnum,
    listingPurpose: ListingPurposeEnum,
    price: z.coerce.number().positive('Asking price must be greater than zero').max(9999999999),
    rentPeriod: RentPeriodEnum.nullable().optional(),
    totalAreaSqFt: z.coerce.number().int().min(50, 'Area must be at least 50 sq.ft').max(10000000),
    facingDirection: FacingDirectionEnum,
    roadWidth: z.string().trim().min(2, 'Road width is required').max(60),
    approvalStatus: z.enum(['NOT_PROVIDED', 'PENDING_VERIFICATION']).default('NOT_PROVIDED'),
    approvalReference: z.string().trim().max(120).optional().nullable(),
    landmark: z.string().trim().min(2, 'Nearby landmark is required').max(140),
    locality: z.string().trim().min(2, 'Locality / area is required').max(80),
    city: z.string().trim().min(2).max(80).default('Madurai'),
    postalCode: z.string().trim().max(20).optional().nullable(),
  })
  .refine(
    (data) => data.listingPurpose !== 'RENT' || Boolean(data.rentPeriod),
    {
      message: 'Please select a rent period for rental properties.',
      path: ['rentPeriod'],
    }
  );

export const updatePropertySchema = z.object({
  title: z.string().trim().min(4).max(120).optional(),
  description: z.string().trim().min(15).max(3000).optional(),
  propertyType: PropertyTypeEnum.optional(),
  listingPurpose: ListingPurposeEnum.optional(),
  price: z.coerce.number().positive().max(9999999999).optional(),
  rentPeriod: RentPeriodEnum.nullable().optional(),
  totalAreaSqFt: z.coerce.number().int().min(50).max(10000000).optional(),
  facingDirection: FacingDirectionEnum.optional(),
  roadWidth: z.string().trim().min(2).max(60).optional(),
  approvalStatus: z.enum(['NOT_PROVIDED', 'PENDING_VERIFICATION']).optional(),
  approvalReference: z.string().trim().max(120).optional().nullable(),
  landmark: z.string().trim().min(2).max(140).optional(),
  locality: z.string().trim().min(2).max(80).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  postalCode: z.string().trim().max(20).optional().nullable(),
});

export const createInquirySchema = z.object({
  propertyId: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{8,20}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  propertyType: z.string().trim().min(2).max(60),
  message: z.string().trim().min(5, 'Please enter a brief message').max(2000),
  captchaChallengeId: z.string().trim().min(1, 'Security check is required'),
  captchaAnswer: z.string().trim().min(1, 'Please answer the math question'),
});

export const adminReviewSchema = z
  .object({
    decision: z.enum(['PUBLISHED', 'REJECTED']),
    adminReviewNote: z.string().trim().max(1000).optional().nullable(),
    approvalStatus: z.enum(['NOT_PROVIDED', 'PENDING_VERIFICATION', 'VERIFIED']).optional(),
  })
  .refine(
    (data) =>
      data.decision !== 'REJECTED' ||
      (typeof data.adminReviewNote === 'string' && data.adminReviewNote.trim().length >= 5),
    {
      message: 'Please provide a clear review note when requesting changes or rejecting a listing.',
      path: ['adminReviewNote'],
    }
  );

export const adminFeaturedSchema = z.object({
  isFeatured: z.boolean(),
});

export const adminInquiryUpdateSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'CLOSED']),
});

export const adminUserStatusSchema = z
  .object({
    accountStatus: z.enum(['APPROVED', 'REJECTED', 'PENDING']),
    accountReviewNote: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (data) =>
      data.accountStatus !== 'REJECTED' ||
      (typeof data.accountReviewNote === 'string' && data.accountReviewNote.trim().length >= 3),
    {
      message: 'Please provide a brief reason when rejecting a user account.',
      path: ['accountReviewNote'],
    }
  );
