import { useCallback, useEffect, useState } from 'react';
import { Heart, Home, Plus, User as UserIcon } from 'lucide-react';
import { apiFetch } from '../api/client';
import { MyPropertiesSection } from '../components/MyPropertiesSection';
import { PropertyDetailsDialog } from '../components/PropertyDetailsDialog';
import { SafeImage } from '../components/SafeImage';
import { useAuth } from '../context/AuthContext';
import type { PropertyItem } from '../types';
import { formatLocationLine, formatPropertyPrice } from '../utils/format';

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

  const [myCount, setMyCount] = useState(0);
  const [favorites, setFavorites] = useState<PropertyItem[]>([]);
  const [loadingFavs, setLoadingFavs] = useState(false);
  const [favError, setFavError] = useState<string | null>(null);
  const [selectedFavorite, setSelectedFavorite] = useState<PropertyItem | null>(null);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    setLoadingFavs(true);
    setFavError(null);
    try {
      const favsRes = await apiFetch<{ items: PropertyItem[] }>('/me/favorites');
      setFavorites(favsRes.items);
    } catch {
      setFavError('Could not refresh saved properties right now.');
    } finally {
      setLoadingFavs(false);
    }
  }, [user]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites, listingRefreshNonce]);

  const handleRemoveFavorite = async (propertyId: string) => {
    try {
      await apiFetch(`/me/favorites/${propertyId}`, { method: 'DELETE' });
      setFavorites((prev) => prev.filter((item) => item.id !== propertyId));
    } catch {
      setFavError('Could not update saved properties.');
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
            Sign in to manage your properties
          </h1>
          <p className="text-[16px] sm:text-[17px] text-[#666666]">
            Add new listings, edit or delete your existing properties, track review status, and
            view saved favorites.
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
            MY ACCOUNT &amp; PROPERTIES
          </p>
          <h1 className="text-[24px] sm:text-[32px] font-bold text-[#1F3229]">{user.fullName}</h1>
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
          <span>Add New Property</span>
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
          <span>My Properties ({myCount})</span>
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

      {tab === 'listings' ? (
        <MyPropertiesSection
          compactHeader
          onOpenNewListing={onOpenNewListing}
          onEditListing={onEditListing}
          listingRefreshNonce={listingRefreshNonce}
          onListingsChanged={setMyCount}
        />
      ) : loadingFavs ? (
        <p className="text-[16px] text-[#666666]">Loading saved properties...</p>
      ) : favError ? (
        <p className="rounded-2xl border border-[#D8B490] bg-[#FDF3E7] px-4 py-3 text-[14px] font-bold text-[#8A4A18]">
          {favError}
        </p>
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
