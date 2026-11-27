import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  Lock,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from 'lucide-react';
import { apiFetch, ApiError } from '../api/client';
import { AccessibleModal } from '../components/AccessibleModal';
import { useAuth } from '../context/AuthContext';
import type {
  AccountStatus,
  AdminInquiryItem,
  AdminStats,
  AdminUserItem,
  AuditLogItem,
  InquiryStatus,
  PropertyItem,
  PublicationStatus,
} from '../types';
import {
  APPROVAL_LABELS,
  FACING_LABELS,
  PROPERTY_TYPE_LABELS,
  PUBLICATION_STATUS_META,
  formatINR,
  formatLocationLine,
  formatPropertyPrice,
  formatSqFt,
} from '../utils/format';

const ACCOUNT_STATUS_BADGES: Record<AccountStatus, { label: string; badgeClass: string }> = {
  PENDING: {
    label: 'Pending Approval',
    badgeClass: 'bg-[#FDF3E7] text-[#8A4A18] border-[#E7C8A0]',
  },
  APPROVED: {
    label: 'Approved',
    badgeClass: 'bg-[#245B45] text-white border-[#245B45]',
  },
  REJECTED: {
    label: 'Rejected',
    badgeClass: 'bg-[#F8EFE6] text-[#7A421D] border-[#D8B490]',
  },
};

interface UserActivityData {
  user: AdminUserItem;
  properties: PropertyItem[];
  inquiries: AdminInquiryItem[];
}

export function AdminPage() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const [tab, setTab] = useState<'users' | 'moderation' | 'inquiries' | 'audit'>('users');

  // Direct Admin Login Form State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [inquiries, setInquiries] = useState<AdminInquiryItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const [userFilter, setUserFilter] = useState<'ALL' | AccountStatus>('ALL');
  const [propertyFilter, setPropertyFilter] = useState<'ALL' | PublicationStatus>('ALL');

  const [loadingData, setLoadingData] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Property review modal state
  const [reviewTarget, setReviewTarget] = useState<{
    property: PropertyItem;
    decision: 'PUBLISHED' | 'REJECTED';
  } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [verifyApproval, setVerifyApproval] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // User approval modal state
  const [userReviewTarget, setUserReviewTarget] = useState<{
    targetUser: AdminUserItem;
    accountStatus: 'APPROVED' | 'REJECTED';
  } | null>(null);
  const [userReviewNote, setUserReviewNote] = useState('');
  const [submittingUserStatus, setSubmittingUserStatus] = useState(false);

  // User activity monitor modal state
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityData, setActivityData] = useState<UserActivityData | null>(null);

  const loadAdminData = useCallback(async () => {
    if (user?.role !== 'ADMIN') return;
    setLoadingData(true);
    try {
      const [statsRes, propsRes, inqRes, usersRes, logsRes] = await Promise.all([
        apiFetch<{ stats: AdminStats }>('/admin/stats'),
        apiFetch<{ items: PropertyItem[] }>('/admin/properties'),
        apiFetch<{ items: AdminInquiryItem[] }>('/admin/inquiries'),
        apiFetch<{ items: AdminUserItem[] }>('/admin/users'),
        apiFetch<{ items: AuditLogItem[] }>('/admin/audit-logs'),
      ]);
      setStats(statsRes.stats);
      setProperties(propsRes.items);
      setInquiries(inqRes.items);
      setUsers(usersRes.items);
      setAuditLogs(logsRes.items);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Unable to load admin data.',
      });
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signingIn) return;
    setSigningIn(true);
    setLoginError(null);
    try {
      const loggedIn = await login(adminEmail.trim(), adminPassword);
      setAdminPassword('');
      if (loggedIn.role !== 'ADMIN') {
        setLoginError('Signed in, but this account does not have administrator privileges.');
      }
    } catch (err) {
      setLoginError(
        err instanceof ApiError ? err.message : 'Invalid administrator email or password.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleOpenReview = (property: PropertyItem, decision: 'PUBLISHED' | 'REJECTED') => {
    setReviewTarget({ property, decision });
    setReviewNote(
      decision === 'PUBLISHED' ? 'Validated and approved for Landnest publication.' : ''
    );
    setVerifyApproval(property.approvalStatus === 'VERIFIED');
  };

  const handleConfirmReview = async () => {
    if (!reviewTarget || submittingReview) return;
    setSubmittingReview(true);
    setFeedback(null);

    try {
      const res = await apiFetch<{ message: string; property: PropertyItem }>(
        `/admin/properties/${reviewTarget.property.id}/review`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            decision: reviewTarget.decision,
            adminReviewNote: reviewNote.trim() || null,
            approvalStatus:
              reviewTarget.decision === 'PUBLISHED' && verifyApproval ? 'VERIFIED' : undefined,
          }),
        }
      );
      setFeedback({
        type: 'success',
        text: `${reviewTarget.property.title}: ${res.message}`,
      });
      setReviewTarget(null);
      await loadAdminData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Failed to update listing status.',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenUserStatus = (
    targetUser: AdminUserItem,
    accountStatus: 'APPROVED' | 'REJECTED'
  ) => {
    setUserReviewTarget({ targetUser, accountStatus });
    setUserReviewNote(
      accountStatus === 'APPROVED' ? 'Account verified and approved by administrator.' : ''
    );
  };

  const handleConfirmUserStatus = async () => {
    if (!userReviewTarget || submittingUserStatus) return;
    setSubmittingUserStatus(true);
    setFeedback(null);

    try {
      const res = await apiFetch<{ message: string; user: AdminUserItem }>(
        `/admin/users/${userReviewTarget.targetUser.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            accountStatus: userReviewTarget.accountStatus,
            accountReviewNote: userReviewNote.trim() || null,
          }),
        }
      );
      setFeedback({ type: 'success', text: res.message });
      setUserReviewTarget(null);
      await loadAdminData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Failed to update user account status.',
      });
    } finally {
      setSubmittingUserStatus(false);
    }
  };

  const handleInspectUser = async (targetUserId: string) => {
    setActivityModalOpen(true);
    setActivityLoading(true);
    setActivityData(null);
    try {
      const res = await apiFetch<UserActivityData>(`/admin/users/${targetUserId}/activity`);
      setActivityData(res);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Could not load user activity.',
      });
      setActivityModalOpen(false);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleToggleFeatured = async (property: PropertyItem) => {
    setFeedback(null);
    try {
      const res = await apiFetch<{ message: string; property: PropertyItem }>(
        `/admin/properties/${property.id}/featured`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isFeatured: !property.isFeatured }),
        }
      );
      setProperties((prev) => prev.map((p) => (p.id === property.id ? res.property : p)));
      setFeedback({ type: 'success', text: `${property.title}: ${res.message}` });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Failed to update featured flag.',
      });
    }
  };

  const handleInquiryStatusChange = async (inquiryId: string, status: InquiryStatus) => {
    setFeedback(null);
    try {
      const res = await apiFetch<{ message: string; inquiry: AdminInquiryItem }>(
        `/admin/inquiries/${inquiryId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      );
      setInquiries((prev) => prev.map((inq) => (inq.id === inquiryId ? res.inquiry : inq)));
      setFeedback({ type: 'success', text: res.message });
      await loadAdminData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Failed to update inquiry status.',
      });
    }
  };

  if (authLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-16 text-center text-[17px]">
        Verifying administrator session...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-lg px-4 sm:px-6 py-12 sm:py-16">
        <div className="rounded-[28px] border border-[#D3DDD0] bg-white p-6 sm:p-9 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF1E8] text-[#245B45]">
              <ShieldCheck className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="text-[14px] font-bold uppercase tracking-wide text-[#245B45]">
              LANDNEST ADMIN PORTAL
            </p>
            <h1 className="text-[24px] sm:text-[28px] font-bold text-[#1F3229]">
              Administrator Sign In
            </h1>
            <p className="text-[15px] text-[#666666]">
              Manage user registrations, approve properties, and monitor platform activity.
            </p>
          </div>

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div>
              <label htmlFor="admin-login-email" className="block mb-1.5 text-[14px] font-bold">
                Admin Email
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#245B45]"
                  aria-hidden="true"
                />
                <input
                  id="admin-login-email"
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Enter administrator email"
                  className="min-h-[50px] w-full rounded-2xl border border-[#D3DDD0] bg-[#FAF9F5] pl-12 pr-4 text-[16px]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-login-password" className="block mb-1.5 text-[14px] font-bold">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#245B45]"
                  aria-hidden="true"
                />
                <input
                  id="admin-login-password"
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter password"
                  className="min-h-[50px] w-full rounded-2xl border border-[#D3DDD0] bg-[#FAF9F5] pl-12 pr-4 text-[16px]"
                />
              </div>
            </div>

            {loginError && (
              <p
                role="alert"
                className="rounded-xl border border-[#D8B490] bg-[#FDF3E7] px-4 py-3 text-[14px] font-bold text-[#8A4A18]"
              >
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={signingIn}
              className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#245B45] px-6 py-3 text-[16px] font-bold text-white transition hover:bg-[#173E2F] disabled:opacity-60"
            >
              {signingIn ? 'Signing In...' : 'Open Admin Dashboard'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
        <div className="rounded-[28px] border border-[#D8B490] bg-[#FDF3E7] p-8 sm:p-10 text-center space-y-4">
          <h1 className="text-[24px] font-bold text-[#8A4A18]">Access Restricted</h1>
          <p className="text-[16px] text-[#1F3229]">
            Signed in as <strong>{user.email}</strong>, which does not have administrator
            privileges.
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[#245B45] px-6 py-2.5 text-[15px] font-bold text-white hover:bg-[#173E2F]"
          >
            Sign Out &amp; Switch Account
          </button>
        </div>
      </main>
    );
  }

  const filteredUsers =
    userFilter === 'ALL' ? users : users.filter((u) => u.accountStatus === userFilter);
  const filteredProperties =
    propertyFilter === 'ALL'
      ? properties
      : properties.filter((p) => p.publicationStatus === propertyFilter);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[14px] font-bold uppercase tracking-wide text-[#245B45]">
            LANDNEST ADMIN CONTROL
          </p>
          <h1 className="text-[26px] sm:text-[34px] font-bold text-[#1F3229]">
            Administrator Dashboard
          </h1>
          <p className="text-[15px] text-[#666666]">
            Signed in as <strong className="text-[#1F3229]">{user.email}</strong>
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <section
          aria-label="Platform statistics"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
        >
          <div className="rounded-[24px] border border-[#D3DDD0] bg-[#FDF3E7] p-5">
            <p className="text-[14px] text-[#8A4A18] font-bold">Pending Users</p>
            <p className="mt-1 text-[26px] font-bold text-[#8A4A18]">{stats.pendingUsers}</p>
          </div>
          <div className="rounded-[24px] border border-[#D3DDD0] bg-white p-5">
            <p className="text-[14px] text-[#666666]">Total Users</p>
            <p className="mt-1 text-[26px] font-bold text-[#245B45]">{stats.totalUsers}</p>
          </div>
          <div className="rounded-[24px] border border-[#D3DDD0] bg-[#FDF3E7] p-5">
            <p className="text-[14px] text-[#8A4A18] font-bold">Pending Properties</p>
            <p className="mt-1 text-[26px] font-bold text-[#8A4A18]">
              {stats.pendingReviewListings}
            </p>
          </div>
          <div className="rounded-[24px] border border-[#D3DDD0] bg-white p-5">
            <p className="text-[14px] text-[#666666]">Published Listings</p>
            <p className="mt-1 text-[26px] font-bold text-[#245B45]">
              {stats.publishedListings}
            </p>
          </div>
          <div className="col-span-2 md:col-span-1 rounded-[24px] border border-[#D3DDD0] bg-[#EEF1E8] p-5">
            <p className="text-[14px] text-[#1F3229] font-bold">New Inquiries</p>
            <p className="mt-1 text-[26px] font-bold text-[#245B45]">{stats.newInquiries}</p>
          </div>
        </section>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 py-2.5 text-[16px] font-bold ${
            tab === 'users'
              ? 'bg-[#245B45] text-white'
              : 'border border-[#D3DDD0] bg-white text-[#1F3229]'
          }`}
        >
          <Users className="h-5 w-5" aria-hidden="true" />
          <span>Users &amp; Approvals ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('moderation')}
          className={`inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 py-2.5 text-[16px] font-bold ${
            tab === 'moderation'
              ? 'bg-[#245B45] text-white'
              : 'border border-[#D3DDD0] bg-white text-[#1F3229]'
          }`}
        >
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
          <span>Property Validation ({properties.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('inquiries')}
          className={`inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 py-2.5 text-[16px] font-bold ${
            tab === 'inquiries'
              ? 'bg-[#245B45] text-white'
              : 'border border-[#D3DDD0] bg-white text-[#1F3229]'
          }`}
        >
          <MessageSquare className="h-5 w-5" aria-hidden="true" />
          <span>Inquiries ({inquiries.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('audit')}
          className={`inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 py-2.5 text-[16px] font-bold ${
            tab === 'audit'
              ? 'bg-[#245B45] text-white'
              : 'border border-[#D3DDD0] bg-white text-[#1F3229]'
          }`}
        >
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          <span>Audit Logs</span>
        </button>
      </div>

      {feedback && (
        <p
          role="status"
          className={`rounded-2xl border px-5 py-3.5 text-[14px] sm:text-[16px] font-bold ${
            feedback.type === 'success'
              ? 'border-[#245B45] bg-[#EEF1E8] text-[#1F3229]'
              : 'border-[#D8B490] bg-[#FDF3E7] text-[#8A4A18]'
          }`}
        >
          {feedback.text}
        </p>
      )}

      {loadingData ? (
        <p className="text-[16px] text-[#666666]">Loading management records...</p>
      ) : tab === 'users' ? (
        <div className="space-y-5">
          {/* User Status Filters */}
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setUserFilter(status)}
                className={`min-h-[40px] rounded-full border px-4 py-1.5 text-[14px] font-bold ${
                  userFilter === status
                    ? 'border-[#245B45] bg-[#245B45] text-white'
                    : 'border-[#D3DDD0] bg-white text-[#1F3229] hover:bg-[#EEF1E8]'
                }`}
              >
                {status === 'ALL'
                  ? `All (${users.length})`
                  : `${ACCOUNT_STATUS_BADGES[status].label} (${
                      users.filter((u) => u.accountStatus === status).length
                    })`}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredUsers.map((u) => {
              const accBadge = ACCOUNT_STATUS_BADGES[u.accountStatus || 'PENDING'];
              return (
                <article
                  key={u.id}
                  className="rounded-[24px] border border-[#D3DDD0] bg-white p-5 space-y-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-0.5 text-[13px] font-bold ${accBadge.badgeClass}`}
                        >
                          {accBadge.label}
                        </span>
                        <span className="rounded-full bg-[#EEF1E8] px-3 py-0.5 text-[13px] font-bold text-[#245B45]">
                          {u.role}
                        </span>
                      </div>
                      <h2 className="mt-2 text-[20px] font-bold text-[#1F3229]">{u.fullName}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleInspectUser(u.id)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[#D3DDD0] bg-[#FAF9F5] px-3.5 py-1.5 text-[14px] font-bold text-[#1F3229] hover:bg-[#EEF1E8]"
                    >
                      <Eye className="h-4 w-4 text-[#245B45]" aria-hidden="true" />
                      <span>Monitor</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[14px] text-[#666666] bg-[#FAF9F5] rounded-2xl p-3.5 border border-[#EEF1E8]">
                    <p className="break-all">
                      <strong className="text-[#1F3229]">Email:</strong> {u.email}
                    </p>
                    <p>
                      <strong className="text-[#1F3229]">Phone:</strong> {u.phone}
                    </p>
                    <p>
                      <strong className="text-[#1F3229]">Registered:</strong>{' '}
                      {new Date(u.createdAt).toLocaleDateString('en-IN')}
                    </p>
                    <p>
                      <strong className="text-[#1F3229]">Last Login:</strong>{' '}
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleString('en-IN')
                        : 'Never signed in'}
                    </p>
                    <p className="sm:col-span-2 font-bold text-[#1F3229]">
                      {u._count.properties} listings • {u._count.inquiries} inquiries •{' '}
                      {u._count.favorites} saved
                    </p>
                  </div>

                  {u.accountReviewNote && (
                    <p className="rounded-xl border border-[#D8B490] bg-[#FDF3E7] px-3.5 py-2 text-[14px] text-[#8A4A18]">
                      <strong>Note:</strong> {u.accountReviewNote}
                    </p>
                  )}

                  {u.id !== user.id && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {u.accountStatus !== 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => handleOpenUserStatus(u, 'APPROVED')}
                          className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-[#245B45] px-4 py-1.5 text-[14px] font-bold text-white hover:bg-[#173E2F]"
                        >
                          <UserCheck className="h-4 w-4" aria-hidden="true" />
                          <span>Approve User</span>
                        </button>
                      )}
                      {u.accountStatus !== 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() => handleOpenUserStatus(u, 'REJECTED')}
                          className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-[#D8B490] bg-[#FDF3E7] px-4 py-1.5 text-[14px] font-bold text-[#8A4A18]"
                        >
                          <UserX className="h-4 w-4" aria-hidden="true" />
                          <span>Reject User</span>
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ) : tab === 'moderation' ? (
        <div className="space-y-5">
          {/* Property Status Filters */}
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'DRAFT'] as const).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setPropertyFilter(status)}
                  className={`min-h-[40px] rounded-full border px-4 py-1.5 text-[14px] font-bold ${
                    propertyFilter === status
                      ? 'border-[#245B45] bg-[#245B45] text-white'
                      : 'border-[#D3DDD0] bg-white text-[#1F3229] hover:bg-[#EEF1E8]'
                  }`}
                >
                  {status === 'ALL'
                    ? `All (${properties.length})`
                    : `${PUBLICATION_STATUS_META[status].label} (${
                        properties.filter((p) => p.publicationStatus === status).length
                      })`}
                </button>
              )
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredProperties.map((prop) => {
              const statusMeta = PUBLICATION_STATUS_META[prop.publicationStatus];
              return (
                <article
                  key={prop.id}
                  className="rounded-[24px] border border-[#D3DDD0] bg-white p-5 space-y-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[14px] font-bold ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                      <h2 className="mt-2 text-[20px] font-bold text-[#1F3229]">{prop.title}</h2>
                      <p className="text-[14px] text-[#666666]">
                        {formatLocationLine(prop.location.locality, prop.location.city)} •{' '}
                        {PROPERTY_TYPE_LABELS[prop.propertyType]}
                      </p>
                    </div>

                    <p className="text-[20px] font-bold text-[#245B45]">
                      {formatPropertyPrice(prop.price, prop.listingPurpose, prop.rentPeriod)}
                    </p>
                  </div>

                  {/* Property Validation Specs */}
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#EEF1E8] bg-[#FAF9F5] p-3.5 text-[14px]">
                    <p>
                      <strong className="text-[#1F3229]">Area:</strong>{' '}
                      {formatSqFt(prop.totalAreaSqFt)} ({prop.areaInCents} cents)
                    </p>
                    <p>
                      <strong className="text-[#1F3229]">Rate:</strong> {formatINR(prop.pricePerSqFt)}
                      /sq.ft
                    </p>
                    <p>
                      <strong className="text-[#1F3229]">Facing:</strong>{' '}
                      {FACING_LABELS[prop.facingDirection]}
                    </p>
                    <p>
                      <strong className="text-[#1F3229]">Road:</strong> {prop.roadWidth}
                    </p>
                    <p className="col-span-2">
                      <strong className="text-[#1F3229]">Landmark:</strong> {prop.landmark}
                    </p>
                    <p className="col-span-2">
                      <strong className="text-[#1F3229]">Approval:</strong>{' '}
                      {APPROVAL_LABELS[prop.approvalStatus]}
                      {prop.approvalReference ? ` (${prop.approvalReference})` : ''}
                    </p>
                    <p className="col-span-2">
                      <strong className="text-[#1F3229]">Photos:</strong> {prop.images.length} uploaded
                    </p>
                  </div>

                  <p className="text-[14px] text-[#666666] line-clamp-2">{prop.description}</p>

                  {prop.owner && (
                    <p className="text-[14px] text-[#666666]">
                      Owner: <strong className="text-[#1F3229]">{prop.owner.fullName}</strong> (
                      {prop.owner.phone})
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2.5 pt-2 border-t border-[#EEF1E8]">
                    <button
                      type="button"
                      onClick={() => handleOpenReview(prop, 'PUBLISHED')}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#245B45] px-4 py-2 text-[14px] font-bold text-white hover:bg-[#173E2F]"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      <span>Validate &amp; Approve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenReview(prop, 'REJECTED')}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D8B490] bg-[#FDF3E7] px-4 py-2 text-[14px] font-bold text-[#8A4A18]"
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      <span>Reject / Request Changes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleToggleFeatured(prop)}
                      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-[14px] font-bold ${
                        prop.isFeatured
                          ? 'border-[#245B45] bg-[#C8DC9F] text-[#183D2E]'
                          : 'border-[#D3DDD0] bg-[#FAF9F5] text-[#1F3229]'
                      }`}
                    >
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      <span>{prop.isFeatured ? 'Featured' : 'Mark Featured'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : tab === 'inquiries' ? (
        <div className="space-y-4">
          {inquiries.map((inq) => (
            <article
              key={inq.id}
              className="rounded-[24px] border border-[#D3DDD0] bg-white p-5 space-y-3 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-bold text-[#1F3229]">{inq.name}</h2>
                  <p className="text-[14px] text-[#666666] break-all">
                    {inq.email} {inq.phone ? `• ${inq.phone}` : ''} • {inq.propertyType}
                  </p>
                  {inq.property && (
                    <p className="text-[14px] font-bold text-[#245B45]">
                      Property: {inq.property.title}
                    </p>
                  )}
                </div>

                <select
                  aria-label={`Update status for inquiry from ${inq.name}`}
                  value={inq.status}
                  onChange={(e) =>
                    void handleInquiryStatusChange(inq.id, e.target.value as InquiryStatus)
                  }
                  className="min-h-[44px] rounded-full border border-[#D3DDD0] bg-[#FAF9F5] px-4 text-[14px] font-bold text-[#1F3229]"
                >
                  <option value="NEW">NEW</option>
                  <option value="CONTACTED">CONTACTED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
              <p className="text-[16px] text-[#1F3229]">{inq.message}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-2xl border border-[#D3DDD0] bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <p className="text-[16px] font-bold text-[#1F3229]">
                  {log.action} ({log.targetType})
                </p>
                <p className="text-[14px] text-[#666666]">{log.details}</p>
              </div>
              <div className="text-[14px] text-[#666666]">
                {log.admin.fullName} • {new Date(log.createdAt).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Property Moderation Confirmation Dialog */}
      <AccessibleModal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title={
          reviewTarget?.decision === 'PUBLISHED'
            ? 'Validate & Approve Property'
            : 'Reject / Request Listing Changes'
        }
        subtitle={reviewTarget?.property.title}
        maxWidthClass="max-w-lg"
        fullScreenMobile={false}
      >
        <div className="space-y-4">
          <p className="text-[16px] text-[#1F3229]">
            {reviewTarget?.decision === 'PUBLISHED'
              ? 'This will validate and publish the listing publicly across Landnest.'
              : 'Provide a clear review note explaining why the listing is rejected or needs updates.'}
          </p>

          {reviewTarget?.decision === 'PUBLISHED' && (
            <label className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-[#D3DDD0] bg-[#EEF1E8] px-4 py-3 text-[14px] font-bold text-[#1F3229]">
              <input
                type="checkbox"
                checked={verifyApproval}
                onChange={(e) => setVerifyApproval(e.target.checked)}
                className="h-5 w-5 accent-[#245B45]"
              />
              <span>Mark approval reference as reviewed / verified</span>
            </label>
          )}

          <div>
            <label htmlFor="admin-review-note" className="block mb-1.5 text-[14px] font-bold">
              Review Note {reviewTarget?.decision === 'REJECTED' ? '*' : '(Optional)'}
            </label>
            <textarea
              id="admin-review-note"
              rows={3}
              required={reviewTarget?.decision === 'REJECTED'}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Enter validation notes..."
              className="w-full rounded-2xl border border-[#D3DDD0] bg-white p-3.5 text-[16px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setReviewTarget(null)}
              className="min-h-[48px] flex-1 rounded-full border border-[#D3DDD0] bg-white px-5 py-2.5 text-[16px] font-bold text-[#1F3229]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submittingReview}
              onClick={() => void handleConfirmReview()}
              className={`min-h-[48px] flex-1 rounded-full px-5 py-2.5 text-[16px] font-bold text-white disabled:opacity-60 ${
                reviewTarget?.decision === 'PUBLISHED'
                  ? 'bg-[#245B45] hover:bg-[#173E2F]'
                  : 'bg-[#8A4A18]'
              }`}
            >
              {submittingReview
                ? 'Saving...'
                : reviewTarget?.decision === 'PUBLISHED'
                ? 'Confirm Approve'
                : 'Confirm Reject'}
            </button>
          </div>
        </div>
      </AccessibleModal>

      {/* User Approval / Rejection Dialog */}
      <AccessibleModal
        open={Boolean(userReviewTarget)}
        onClose={() => setUserReviewTarget(null)}
        title={
          userReviewTarget?.accountStatus === 'APPROVED'
            ? 'Approve User Account'
            : 'Reject User Account'
        }
        subtitle={`${userReviewTarget?.targetUser.fullName} (${userReviewTarget?.targetUser.email})`}
        maxWidthClass="max-w-lg"
        fullScreenMobile={false}
      >
        <div className="space-y-4">
          <p className="text-[16px] text-[#1F3229]">
            {userReviewTarget?.accountStatus === 'APPROVED'
              ? 'Approving this account allows the user to sign in, submit properties, and save favorites.'
              : 'Rejecting this account blocks sign-in and revokes any active sessions.'}
          </p>

          <div>
            <label htmlFor="user-review-note" className="block mb-1.5 text-[14px] font-bold">
              Admin Note {userReviewTarget?.accountStatus === 'REJECTED' ? '*' : '(Optional)'}
            </label>
            <textarea
              id="user-review-note"
              rows={3}
              required={userReviewTarget?.accountStatus === 'REJECTED'}
              value={userReviewNote}
              onChange={(e) => setUserReviewNote(e.target.value)}
              placeholder="Reason or verification note..."
              className="w-full rounded-2xl border border-[#D3DDD0] bg-white p-3.5 text-[16px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setUserReviewTarget(null)}
              className="min-h-[48px] flex-1 rounded-full border border-[#D3DDD0] bg-white px-5 py-2.5 text-[16px] font-bold text-[#1F3229]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submittingUserStatus}
              onClick={() => void handleConfirmUserStatus()}
              className={`min-h-[48px] flex-1 rounded-full px-5 py-2.5 text-[16px] font-bold text-white disabled:opacity-60 ${
                userReviewTarget?.accountStatus === 'APPROVED'
                  ? 'bg-[#245B45] hover:bg-[#173E2F]'
                  : 'bg-[#8A4A18]'
              }`}
            >
              {submittingUserStatus
                ? 'Updating...'
                : userReviewTarget?.accountStatus === 'APPROVED'
                ? 'Confirm Approve'
                : 'Confirm Reject'}
            </button>
          </div>
        </div>
      </AccessibleModal>

      {/* User Activity Monitor Modal */}
      <AccessibleModal
        open={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title="User Monitoring Details"
        subtitle={activityData?.user.fullName}
        maxWidthClass="max-w-3xl"
        fullScreenMobile
      >
        {activityLoading || !activityData ? (
          <p className="text-[16px] text-[#666666]">Loading user activity...</p>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#D3DDD0] bg-[#EEF1E8] p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[14px]">
              <p>
                <strong>Name:</strong> {activityData.user.fullName}
              </p>
              <p className="break-all">
                <strong>Email:</strong> {activityData.user.email}
              </p>
              <p>
                <strong>Phone:</strong> {activityData.user.phone}
              </p>
              <p>
                <strong>Status:</strong> {activityData.user.accountStatus}
              </p>
              <p>
                <strong>Registered:</strong>{' '}
                {new Date(activityData.user.createdAt).toLocaleString('en-IN')}
              </p>
              <p>
                <strong>Last Login:</strong>{' '}
                {activityData.user.lastLoginAt
                  ? new Date(activityData.user.lastLoginAt).toLocaleString('en-IN')
                  : 'Never'}
              </p>
            </div>

            <div>
              <h3 className="text-[18px] font-bold text-[#1F3229] mb-2">
                Submitted Properties ({activityData.properties.length})
              </h3>
              {activityData.properties.length === 0 ? (
                <p className="text-[14px] text-[#666666]">No properties submitted by this user.</p>
              ) : (
                <div className="space-y-2.5">
                  {activityData.properties.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-[#D3DDD0] bg-white p-4 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-[16px] font-bold text-[#1F3229]">{p.title}</p>
                        <p className="text-[14px] text-[#666666]">
                          {formatLocationLine(p.location.locality, p.location.city)} •{' '}
                          {formatPropertyPrice(p.price, p.listingPurpose, p.rentPeriod)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[13px] font-bold ${
                          PUBLICATION_STATUS_META[p.publicationStatus].badgeClass
                        }`}
                      >
                        {PUBLICATION_STATUS_META[p.publicationStatus].label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-[18px] font-bold text-[#1F3229] mb-2">
                Inquiries Sent ({activityData.inquiries.length})
              </h3>
              {activityData.inquiries.length === 0 ? (
                <p className="text-[14px] text-[#666666]">No inquiries sent while signed in.</p>
              ) : (
                <div className="space-y-2.5">
                  {activityData.inquiries.map((inq) => (
                    <div
                      key={inq.id}
                      className="rounded-2xl border border-[#D3DDD0] bg-white p-4 text-[14px]"
                    >
                      <p className="font-bold text-[#1F3229]">
                        {inq.propertyType} • Status: {inq.status}
                      </p>
                      <p className="text-[#666666] mt-1">{inq.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AccessibleModal>
    </main>
  );
}
