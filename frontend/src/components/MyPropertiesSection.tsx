import { useCallback, useEffect, useState } from 'react';
import { Edit3, Home, MapPin, Plus, Send, Trash2 } from 'lucide-react';
import { apiFetch, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { PropertyItem, PublicationStatus } from '../types';
import {
  PROPERTY_TYPE_LABELS,
  PUBLICATION_STATUS_META,
  formatLocationLine,
  formatPropertyPrice,
  formatSqFt,
} from '../utils/format';
import { SafeImage } from './SafeImage';

interface MyPropertiesSectionProps {
  onOpenNewListing: () => void;
  onEditListing: (property: PropertyItem) => void;
  listingRefreshNonce: number;
  onListingsChanged?: (count: number) => void;
  onDeleted?: () => void;
  compactHeader?: boolean;
}

export function MyPropertiesSection({
  onOpenNewListing,
  onEditListing,
  listingRefreshNonce,
  onListingsChanged,
  onDeleted,
  compactHeader = false,
}: MyPropertiesSectionProps) {
  const { user } = useAuth();
  const [myListings, setMyListings] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | PublicationStatus>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const loadMyListings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ items: PropertyItem[] }>('/me/properties');
      setMyListings(res.items);
      onListingsChanged?.(res.items.length);
    } catch {
      setFeedback({ type: 'error', text: 'Could not load your added properties right now.' });
    } finally {
      setLoading(false);
    }
  }, [user, onListingsChanged]);

  useEffect(() => {
    void loadMyListings();
  }, [loadMyListings, listingRefreshNonce]);

  if (!user) return null;

  const handleSubmitForReview = async (propertyId: string) => {
    if (submittingId) return;
    setSubmittingId(propertyId);
    setFeedback(null);
    try {
      const res = await apiFetch<{ message: string; property: PropertyItem }>(
        `/properties/${propertyId}/submit`,
        { method: 'POST' }
      );
      setMyListings((prev) => prev.map((item) => (item.id === propertyId ? res.property : item)));
      setFeedback({ type: 'success', text: `${res.property.title}: ${res.message}` });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Unable to submit listing for review.',
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDeleteListing = async (propertyId: string) => {
    if (deletingId) return;
    setDeletingId(propertyId);
    setFeedback(null);
    try {
      await apiFetch(`/properties/${propertyId}`, { method: 'DELETE' });
      setMyListings((prev) => {
        const next = prev.filter((item) => item.id !== propertyId);
        onListingsChanged?.(next.length);
        return next;
      });
      setConfirmDeleteId(null);
      onDeleted?.();
      setFeedback({ type: 'success', text: 'Property deleted successfully.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Unable to delete property.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filtered =
    statusFilter === 'ALL'
      ? myListings
      : myListings.filter((item) => item.publicationStatus === statusFilter);

  return (
    <section
      id="my-properties"
      aria-labelledby="my-properties-heading"
      className={compactHeader ? 'space-y-5' : 'mx-auto max-w-7xl px-4 sm:px-6 pt-12 pb-2'}
    >
      <div
        className={
          compactHeader
            ? 'space-y-5'
            : 'rounded-[28px] border border-[#D3DDD0] bg-[#EEF1E8]/85 p-5 sm:p-8 space-y-6'
        }
      >
        {/* Header + Easy Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[14px] font-bold uppercase tracking-wide text-[#245B45] flex items-center gap-2">
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>MY ADDED PROPERTIES</span>
            </p>
            <h2
              id="my-properties-heading"
              className="text-[24px] sm:text-[30px] font-bold text-[#1F3229]"
            >
              Properties Added by {user.fullName.split(' ')[0]} ({myListings.length})
            </h2>
            <p className="text-[15px] text-[#666666]">
              Add a new property or edit, submit, and delete any of your existing listings.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenNewListing}
            className="inline-flex min-h-[50px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#245B45] px-6 py-3 text-[16px] font-bold text-white shadow-sm transition hover:bg-[#173E2F] active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span>Add New Property</span>
          </button>
        </div>

        {/* Status Filter Pills */}
        {myListings.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PUBLISHED', 'PENDING_REVIEW', 'DRAFT', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`min-h-[40px] rounded-full border px-4 py-1.5 text-[14px] font-bold transition ${
                  statusFilter === status
                    ? 'border-[#245B45] bg-[#245B45] text-white'
                    : 'border-[#D3DDD0] bg-white text-[#1F3229] hover:bg-[#FAF9F5]'
                }`}
              >
                {status === 'ALL'
                  ? `All (${myListings.length})`
                  : `${PUBLICATION_STATUS_META[status].label} (${
                      myListings.filter((p) => p.publicationStatus === status).length
                    })`}
              </button>
            ))}
          </div>
        )}

        {feedback && (
          <p
            role="status"
            className={`rounded-2xl border px-4 py-3 text-[14px] sm:text-[15px] font-bold ${
              feedback.type === 'success'
                ? 'border-[#245B45] bg-white text-[#1F3229]'
                : 'border-[#D8B490] bg-[#FDF3E7] text-[#8A4A18]'
            }`}
          >
            {feedback.text}
          </p>
        )}

        {loading ? (
          <p className="text-[16px] text-[#666666]">Loading your added properties...</p>
        ) : myListings.length === 0 ? (
          <div className="rounded-[24px] border border-[#D3DDD0] bg-white p-7 sm:p-10 text-center space-y-4">
            <h3 className="text-[20px] font-bold text-[#1F3229]">
              You have not added any properties yet
            </h3>
            <p className="text-[16px] text-[#666666] max-w-lg mx-auto">
              Click Add New Property to list your land, plot, home, or commercial space in a few
              easy steps.
            </p>
            <button
              type="button"
              onClick={onOpenNewListing}
              className="inline-flex min-h-[50px] items-center gap-2 rounded-full bg-[#245B45] px-7 py-3 text-[16px] font-bold text-white hover:bg-[#173E2F]"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span>Add Your First Property</span>
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#D3DDD0] bg-white p-6 text-center text-[15px] text-[#666666]">
            No properties with this status. Switch filters above to view your other listings.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((item) => {
              const statusMeta = PUBLICATION_STATUS_META[item.publicationStatus];
              const cover = item.images[0]?.thumbnailUrl || item.images[0]?.imageUrl;
              return (
                <article
                  key={item.id}
                  className="rounded-[24px] border border-[#D3DDD0] bg-white p-5 space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="h-36 sm:h-28 sm:w-36 shrink-0 overflow-hidden rounded-2xl bg-[#EEF1E8]">
                      <SafeImage
                        src={cover || '/images/plot-bama.svg'}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <span
                        className={`inline-flex rounded-full border px-3 py-0.5 text-[13px] font-bold ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                      <h3 className="text-[19px] font-bold text-[#1F3229] break-words">
                        {item.title}
                      </h3>
                      <p className="text-[14px] text-[#666666] flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-[#245B45] shrink-0" aria-hidden="true" />
                        <span>{formatLocationLine(item.location.locality, item.location.city)}</span>
                      </p>
                      <p className="text-[19px] font-bold text-[#245B45]">
                        {formatPropertyPrice(item.price, item.listingPurpose, item.rentPeriod)}
                      </p>
                    </div>
                  </div>

                  <p className="text-[14px] text-[#666666]">
                    {PROPERTY_TYPE_LABELS[item.propertyType]} • {formatSqFt(item.totalAreaSqFt)} •{' '}
                    {item.images.length} photos
                  </p>

                  {item.adminReviewNote && (
                    <div className="rounded-2xl border border-[#D8B490] bg-[#FDF3E7] px-3.5 py-2.5 text-[14px] text-[#8A4A18]">
                      <strong>Review note:</strong> {item.adminReviewNote}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2.5 pt-2 border-t border-[#EEF1E8]">
                    <button
                      type="button"
                      onClick={() => onEditListing(item)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D3DDD0] bg-[#FAF9F5] px-4 py-2 text-[14px] font-bold text-[#1F3229] hover:bg-[#EEF1E8]"
                    >
                      <Edit3 className="h-4 w-4" aria-hidden="true" />
                      <span>Edit</span>
                    </button>

                    {(item.publicationStatus === 'DRAFT' ||
                      item.publicationStatus === 'REJECTED') && (
                      <button
                        type="button"
                        disabled={submittingId === item.id}
                        onClick={() => void handleSubmitForReview(item.id)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#245B45] px-4 py-2 text-[14px] font-bold text-white hover:bg-[#173E2F] disabled:opacity-60"
                      >
                        <Send className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {submittingId === item.id ? 'Submitting...' : 'Submit for Review'}
                        </span>
                      </button>
                    )}

                    {confirmDeleteId === item.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => void handleDeleteListing(item.id)}
                          className="min-h-[44px] rounded-full bg-[#8A4A18] px-4 py-2 text-[14px] font-bold text-white disabled:opacity-60"
                        >
                          {deletingId === item.id ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[44px] rounded-full border border-[#D3DDD0] px-4 py-2 text-[14px] font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D8B490] bg-[#FDF3E7] px-4 py-2 text-[14px] font-bold text-[#8A4A18] hover:bg-[#F7E5CF]"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
