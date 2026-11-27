import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  adminFeaturedSchema,
  adminInquiryUpdateSchema,
  adminReviewSchema,
  adminUserStatusSchema,
} from '../validation/schemas.js';
import { formatPropertyDto } from '../utils/propertyHelpers.js';
import { deleteStoredPropertyImage } from '../services/storage.js';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [
      totalUsers,
      pendingUsers,
      approvedUsers,
      publishedListings,
      pendingReviewListings,
      newInquiries,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { accountStatus: 'PENDING' } }),
      prisma.user.count({ where: { accountStatus: 'APPROVED' } }),
      prisma.property.count({ where: { publicationStatus: 'PUBLISHED' } }),
      prisma.property.count({ where: { publicationStatus: 'PENDING_REVIEW' } }),
      prisma.inquiry.count({ where: { status: 'NEW' } }),
    ]);

    res.json({
      stats: {
        totalUsers,
        pendingUsers,
        approvedUsers,
        publishedListings,
        pendingReviewListings,
        newInquiries,
      },
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/properties', async (req, res, next) => {
  try {
    const statusFilter =
      typeof req.query.status === 'string' &&
      ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED'].includes(req.query.status)
        ? (req.query.status as 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED')
        : undefined;

    const properties = await prisma.property.findMany({
      where: statusFilter ? { publicationStatus: statusFilter } : undefined,
      orderBy: [{ publicationStatus: 'asc' }, { updatedAt: 'desc' }],
      include: {
        location: true,
        images: { orderBy: { displayOrder: 'asc' } },
        owner: {
          select: { id: true, fullName: true, phone: true },
        },
      },
    });

    res.json({
      items: properties.map((p) =>
        formatPropertyDto(p, { includeOwnerContact: true, includeReviewNote: true })
      ),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/properties/:id/review', async (req, res, next) => {
  try {
    const propertyId = String(req.params.id);
    const data = adminReviewSchema.parse(req.body);
    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!existing) {
      throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Property listing not found.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const prop = await tx.property.update({
        where: { id: existing.id },
        data: {
          publicationStatus: data.decision,
          adminReviewNote: data.adminReviewNote ?? null,
          publishedAt: data.decision === 'PUBLISHED' ? new Date() : null,
          ...(data.approvalStatus ? { approvalStatus: data.approvalStatus } : {}),
        },
        include: {
          location: true,
          images: { orderBy: { displayOrder: 'asc' } },
          owner: { select: { id: true, fullName: true, phone: true } },
        },
      });

      await tx.adminAuditLog.create({
        data: {
          adminId: req.user!.id,
          action: `PROPERTY_${data.decision}`,
          targetType: 'PROPERTY',
          targetId: existing.id,
          details: data.adminReviewNote ?? `Listing marked ${data.decision}`,
        },
      });

      return prop;
    });

    res.json({
      message: data.decision === 'PUBLISHED' ? 'Published' : 'Changes required',
      property: formatPropertyDto(updated, {
        includeOwnerContact: true,
        includeReviewNote: true,
      }),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/properties/:id/featured', async (req, res, next) => {
  try {
    const propertyId = String(req.params.id);
    const data = adminFeaturedSchema.parse(req.body);
    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!existing) {
      throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Property listing not found.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const prop = await tx.property.update({
        where: { id: existing.id },
        data: { isFeatured: data.isFeatured },
        include: {
          location: true,
          images: { orderBy: { displayOrder: 'asc' } },
          owner: { select: { id: true, fullName: true, phone: true } },
        },
      });

      await tx.adminAuditLog.create({
        data: {
          adminId: req.user!.id,
          action: data.isFeatured ? 'PROPERTY_FEATURED' : 'PROPERTY_UNFEATURED',
          targetType: 'PROPERTY',
          targetId: existing.id,
          details: `Featured set to ${data.isFeatured}`,
        },
      });

      return prop;
    });

    res.json({
      message: data.isFeatured ? 'Property marked as featured.' : 'Property removed from featured.',
      property: formatPropertyDto(updated, {
        includeOwnerContact: true,
        includeReviewNote: true,
      }),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/properties/:id', async (req, res, next) => {
  try {
    const propertyId = String(req.params.id);
    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { images: true },
    });

    if (!existing) {
      throw new AppError(404, 'PROPERTY_NOT_FOUND', 'Property listing not found.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.property.delete({ where: { id: existing.id } });
      await tx.adminAuditLog.create({
        data: {
          adminId: req.user!.id,
          action: 'PROPERTY_DELETED',
          targetType: 'PROPERTY',
          targetId: existing.id,
          details: `Deleted property "${existing.title}"`,
        },
      });
    });

    await Promise.allSettled(existing.images.map((img) => deleteStoredPropertyImage(img.storageKey)));

    res.json({ message: 'Property deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/inquiries', async (_req, res, next) => {
  try {
    const inquiries = await prisma.inquiry.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          select: { id: true, title: true, slug: true },
        },
      },
    });
    res.json({ items: inquiries });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/inquiries/:id', async (req, res, next) => {
  try {
    const inquiryId = String(req.params.id);
    const data = adminInquiryUpdateSchema.parse(req.body);
    const existing = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
    });
    if (!existing) {
      throw new AppError(404, 'INQUIRY_NOT_FOUND', 'Inquiry not found.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const inq = await tx.inquiry.update({
        where: { id: existing.id },
        data: { status: data.status },
        include: {
          property: {
            select: { id: true, title: true, slug: true },
          },
        },
      });

      await tx.adminAuditLog.create({
        data: {
          adminId: req.user!.id,
          action: `INQUIRY_${data.status}`,
          targetType: 'INQUIRY',
          targetId: existing.id,
          details: `Inquiry status updated from ${existing.status} to ${data.status}`,
        },
      });

      return inq;
    });

    res.json({ message: 'Inquiry status updated.', inquiry: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users', async (req, res, next) => {
  try {
    const statusFilter =
      typeof req.query.status === 'string' &&
      ['PENDING', 'APPROVED', 'REJECTED'].includes(req.query.status)
        ? (req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED')
        : undefined;

    const users = await prisma.user.findMany({
      where: statusFilter ? { accountStatus: statusFilter } : undefined,
      orderBy: [{ accountStatus: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        accountStatus: true,
        accountReviewNote: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            properties: true,
            favorites: true,
            inquiries: true,
          },
        },
      },
    });
    res.json({ items: users });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/users/:id/status', async (req, res, next) => {
  try {
    const targetUserId = String(req.params.id);
    const data = adminUserStatusSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        accountStatus: true,
      },
    });

    if (!existing) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User account not found.');
    }

    if (existing.id === req.user!.id && data.accountStatus !== 'APPROVED') {
      throw new AppError(
        400,
        'CANNOT_SUSPEND_SELF',
        'You cannot reject or suspend your own active administrator account.'
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: existing.id },
        data: {
          accountStatus: data.accountStatus,
          accountReviewNote: data.accountReviewNote ?? null,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          accountStatus: true,
          accountReviewNote: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              properties: true,
              favorites: true,
              inquiries: true,
            },
          },
        },
      });

      if (data.accountStatus !== 'APPROVED') {
        await tx.session.deleteMany({ where: { userId: existing.id } });
      }

      await tx.adminAuditLog.create({
        data: {
          adminId: req.user!.id,
          action: `USER_${data.accountStatus}`,
          targetType: 'USER',
          targetId: existing.id,
          details:
            data.accountReviewNote ??
            `User ${existing.email} marked ${data.accountStatus}`,
        },
      });

      return updatedUser;
    });

    res.json({
      message:
        data.accountStatus === 'APPROVED'
          ? `Approved ${updated.fullName}'s account.`
          : data.accountStatus === 'REJECTED'
          ? `Rejected ${updated.fullName}'s account.`
          : `Set ${updated.fullName}'s account to pending.`,
      user: updated,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users/:id/activity', async (req, res, next) => {
  try {
    const targetUserId = String(req.params.id);
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        accountStatus: true,
        accountReviewNote: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!targetUser) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User account not found.');
    }

    const [properties, inquiries] = await Promise.all([
      prisma.property.findMany({
        where: { ownerId: targetUserId },
        orderBy: { updatedAt: 'desc' },
        include: {
          location: true,
          images: { orderBy: { displayOrder: 'asc' } },
        },
      }),
      prisma.inquiry.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' },
        include: {
          property: { select: { id: true, title: true, slug: true } },
        },
      }),
    ]);

    res.json({
      user: targetUser,
      properties: properties.map((p) => formatPropertyDto(p, { includeReviewNote: true })),
      inquiries,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/audit-logs', async (_req, res, next) => {
  try {
    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        admin: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
    res.json({ items: logs });
  } catch (err) {
    next(err);
  }
});
