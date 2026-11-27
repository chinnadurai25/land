import { useCallback, useEffect, useState } from 'react';
import {
  Edit3,
  Heart,
  Home,
  MapPin,
  Plus,
  Send,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { apiFetch, ApiError } from '../api/client';
import { PropertyDetailsDialog } from '../components/PropertyDetailsDialog';
import { SafeImage } from '../components/SafeImage';
import { useAuth } from '../context/AuthContext';
import type { PropertyItem } from '../types';
import {
  PROPERTY_TYPE_LABELS,
  PUBLICATION_STATUS_META,
  formatLocationLine,
  formatPropertyPrice,
  formatSqFt,
} from '../utils/format';

interface AccountPageProps {
  onOpenNewListing: () => void;
  onEditListing: (property: PropertyItem) => void;
  listingRefreshNonce: number;
}

export function AccountPage({
  onOpenNewListing,
  onEditListing,
  listingRefreshNonce,
}: AccountPageProps) {
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [tab, setTab] = useState<'listings' | 'favorites'>('listings');

  const [myListings, setMyListings] = useState<PropertyItem[]>([]);
  const [favorites, setFavorites] = useState<PropertyItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedFavorite, setSelectedFavorite] = useState<PropertyItem | null>(null);

  const loadAccountData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [listingsRes, favsRes] = await Promise.all([
        apiFetch<{ items: PropertyItem[] }>('/me/properties'),
        apiFetch<{ items: PropertyItem[] }>('/me/favorites'),
      ]);
      setMyListings(listingsRes.items);
      setFavorites(favsRes.items);
    } catch {
      setActionFeedback('Could not refresh your account data right now.');
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    void loadAccountData();
  }, [loadAccountData, listingRefreshNonce]);

  const handleSubmitForReview = async (propertyId: string) => {
    setActionFeedback(null);
    try {
      const res = await apiFetch<{ message: string; property: PropertyItem }>(
        `/properties/${propertyId}/submit`,
        { method: 'POST' }
      );
      setMyListings((prev) =>
        prev.map((item) => (item.id === propertyId ? res.property : item))
      );
      setActionFeedback(res.message);
    } catch (err) {
      setActionFeedback(
        err instanceof ApiError ? err.message : 'Unable to submit listing for review.'
      );
    }
  };

  const handleDeleteListing = async (propertyId: string) => {
    setActionFeedback(null);
    try {
      await apiFetch(`/properties/${propertyId}`, { method: 'DELETE' });
      setMyListings((prev) => prev.filter((item) => item.id !== propertyId));
      setConfirmDeleteId(null);
      setActionFeedback('Listing deleted.');
    } catch (err) {
      setActionFeedback(
        err instanceof ApiError ? err.message : 'Unable to delete listing.'
      );
    }
  };

  const handleRemoveFavorite = async (propertyId: string) => {
    try {
      await apiFetch(`/me/favorites/${propertyId}`, { method: 'DELETE' });
      setFavorites((prev) => prev.filter((item) => item.id !== propertyId));
    } catch {
      setActionFeedback('Could not update saved properties.');
    }
  };

  if (authLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-16 text-center text-[17px]">
        Loading your account...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <div className="rounded-[28px] border border-[#D3DDD0] bg-white p-8 sm:p-10 text-center space-y-5">
          <UserIcon className="mx-auto h-12 w-12 text-[#245B45]" aria-hidden="true" />
          <h1 className="text-[24px] sm:text-[30px] font-bold text-[#1F3229]">
            Sign in to view My Account
          </h1>
          <p className="text-[16px] sm:text-[17px] text-[#666666]">
            Access your property drafts, track review updates, and view your saved properties from
            any device.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal()}
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#245B45] px-8 py-3 text-[16px] font-bold text-white hover:bg-[#173E2F]"
          >
            Sign In / Register
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      {/* Profile Header Card */}
      <section className="rounded-[28px] border border-[#D3DDD0] bg-[#EEF1E8] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <p className="text-[14px] font-bold uppercase tracking-wide text-[#245B45]">
            MY ACCOUNT
          </p>
          <h1 className="text-[24px] sm:text-[32px] font-bold text-[#1F3229]">
            {user.fullName}
          </h1>
          <p className="text-[16px] text-[#666666] break-all">
            {user.email} • {user.phone}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewListing}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#245B45] px-7 py-3 text-[16px] font-bold text-white shadow-sm hover:bg-[#173E2F]"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          <span>Add Free Listing</span>
        </button>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setTab('listings')}
          className={`inline-flex min-h-[48px] items-center gap-2 rounded-full px-6 py-2.5 text-[16px] font-bold transition ${
            tab === 'listings'
              ? 'bg-[#245B45] text-white'
              : 'border border-[#D3DDD0] bg-white text-[#1F3229] hover:bg-[#EEF1E8]'
          }`}
        >
          <Home className="h-5 w-5" aria-hidden="true" />
          <span>My Listings ({myListings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('favorites')}
          className={`inline-flex min-h-[48px] items-center gap-2 rounded-full px-6 py-2.5 text-[16px] font-bold transition ${
            tab === 'favorites'
              ? 'bg-[#245B45] text-white'
              : 'border border-[#D3DDD0] bg-white text-[#1F3229] hover:bg-[#EEF1E8]'
          }`}
        >
          <Heart className="h-5 w-5" aria-hidden="true" />
          <span>Saved Properties ({favorites.length})</span>
        </button>
      </div>

      {actionFeedback && (
        <p
          role="status"
          className="rounded-2xl border border-[#245B45] bg-[#EEF1E8] px-5 py-3.5 text-[14px] sm:text-[16px] font-bold text-[#1F3229]"
        >
          {actionFeedback}
        </p>
      )}

      {loadingData ? (
        <p className="text-[16px] text-[#666666]">Refreshing your listings...</p>
      ) : tab === 'listings' ? (
        myListings.length === 0 ? (
          <div className="rounded-[28px] border border-[#D3DDD0] bg-white p-8 sm:p-12 text-center space-y-4">
            <h2 className="text-[20px] font-bold text-[#1F3229]">No listings created yet</h2>
            <p className="text-[16px] text-[#666666]">
              Start a property draft, upload photos, and submit it for review when ready.
            </p>
            <button
              type="button"
              onClick={onOpenNewListing}
              className="inline-flex min-h-[50px] items-center gap-2 rounded-full bg-[#245B45] px-7 py-3 text-[16px] font-bold text-white hover:bg-[#173E2F]"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span>Create Your First Listing</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myListings.map((item) => {
              const statusMeta = PUBLICATION_STATUS_META[item.publicationStatus];
              const cover = item.images[0]?.thumbnailUrl || item.images[0]?.imageUrl;
              return (
                <article
                  key={item.id}
                  className="rounded-[28px] border border-[#D3DDD0] bg-white p-5 space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="h-40 sm:h-32 sm:w-40 shrink-0 overflow-hidden rounded-2xl bg-[#EEF1E8]">
                      <SafeImage
                        src={cover || '/images/plot-bama.svg'}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <span
                        className={`inline-flex rounded-full border px-3.5 py-1 text-[14px] font-bold ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                      <h2 className="text-[19px] font-bold text-[#1F3229] break-words">
                        {item.title}
                      </h2>
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
                    {PROPERTY_TYPE_LABELS[item.propertyType]} • {formatSqFt(item.totalAreaSqFt)}
                  </p>

                  {item.adminReviewNote && (
                    <div className="rounded-2xl border border-[#D8B490] bg-[#FDF3E7] px-4 py-3 text-[14px] text-[#8A4A18]">
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
                        onClick={() => void handleSubmitForReview(item.id)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#245B45] px-4 py-2 text-[14px] font-bold text-white hover:bg-[#173E2F]"
                      >
                        <Send className="h-4 w-4" aria-hidden="true" />
                        <span>Submit for Review</span>
                      </button>
                    )}

                    {confirmDeleteId === item.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDeleteListing(item.id)}
                          className="min-h-[44px] rounded-full bg-[#8A4A18] px-4 py-2 text-[14px] font-bold text-white"
                        >
                          Confirm Delete
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
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D8B490] bg-[#FDF3E7] px-4 py-2 text-[14px] font-bold text-[#8A4A18]"
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
        )
      ) : favorites.length === 0 ? (
        <div className="rounded-[28px] border border-[#D3DDD0] bg-white p-8 sm:p-12 text-center space-y-3">
          <h2 className="text-[20px] font-bold text-[#1F3229]">No saved properties yet</h2>
          <p className="text-[16px] text-[#666666]">
            Tap the heart button on any listing to save it here for easy comparison.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {favorites.map((prop) => {
            const cover = prop.images[0]?.thumbnailUrl || prop.images[0]?.imageUrl;
            return (
              <article
                key={prop.id}
                className="rounded-[28px] border border-[#D3DDD0] bg-white p-5 space-y-4 shadow-sm"
              >
                <div className="h-52 overflow-hidden rounded-[20px] bg-[#EEF1E8]">
                  <SafeImage
                    src={cover || '/images/plot-bama.svg'}
                    alt={prop.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h2 className="text-[19px] font-bold text-[#1F3229]">{prop.title}</h2>
                <p className="text-[14px] text-[#666666]">
                  {formatLocationLine(prop.location.locality, prop.location.city)}
                </p>
                <p className="text-[22px] font-bold text-[#245B45]">
                  {formatPropertyPrice(prop.price, prop.listingPurpose, prop.rentPeriod)}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFavorite(prop)}
                    className="min-h-[44px] flex-1 rounded-full bg-[#245B45] px-4 py-2 text-[14px] font-bold text-white hover:bg-[#173E2F]"
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemoveFavorite(prop.id)}
                    className="min-h-[44px] rounded-full border border-[#D3DDD0] px-4 py-2 text-[14px] font-bold text-[#1F3229] hover:bg-[#EEF1E8]"
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <PropertyDetailsDialog
        property={selectedFavorite}
        onClose={() => setSelectedFavorite(null)}
        onToggleFavorite={(prop) => void handleRemoveFavorite(prop.id)}
      />
    </main>
  );
}
