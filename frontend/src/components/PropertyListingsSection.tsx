import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import type { PaginationMeta, PropertyItem, SearchFilters } from '../types';
import { PROPERTY_TYPE_LABELS } from '../utils/format';
import { PropertyCard } from './PropertyCard';

interface PropertyListingsSectionProps {
  items: PropertyItem[];
  pagination: PaginationMeta;
  filters: SearchFilters;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onToggleFeaturedView: () => void;
  onSortChange: (sort: SearchFilters['sort']) => void;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
  onOpenDetails: (property: PropertyItem) => void;
  onToggleFavorite: (property: PropertyItem) => void;
}

export function PropertyListingsSection({
  items,
  pagination,
  filters,
  loading,
  error,
  onRetry,
  onToggleFeaturedView,
  onSortChange,
  onPageChange,
  onClearFilters,
  onOpenDetails,
  onToggleFavorite,
}: PropertyListingsSectionProps) {
  const hasActiveFilters =
    Boolean(filters.type) ||
    Boolean(filters.location.trim()) ||
    Boolean(filters.minPrice) ||
    Boolean(filters.maxPrice) ||
    filters.featuredOnly;

  return (
    <section
      id="listings-section"
      aria-labelledby="collection-heading"
      className="scroll-mt-24 mx-auto max-w-7xl px-4 sm:px-6 pt-14 pb-8 sm:pt-20 sm:pb-12"
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 sm:mb-10">
        <div className="max-w-2xl space-y-3">
          <p className="text-[14px] font-bold tracking-wide text-[#245B45] uppercase">
            THE LANDNEST COLLECTION
          </p>
          <h2
            id="collection-heading"
            className="text-[26px] sm:text-[34px] lg:text-[36px] font-bold leading-tight text-[#1F3229]"
          >
            Find a place to put down roots.
          </h2>
          <p className="text-[16px] sm:text-[17px] leading-relaxed text-[#666666]">
            Great locations. Genuine opportunities. A place for your every dream.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={onToggleFeaturedView}
            className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border px-6 py-2.5 text-[16px] font-bold transition ${
              filters.featuredOnly
                ? 'border-[#245B45] bg-[#245B45] text-white hover:bg-[#173E2F]'
                : 'border-[#245B45] bg-[#EEF1E8] text-[#245B45] hover:bg-[#E8EEE3]'
            }`}
          >
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            <span>{filters.featuredOnly ? 'View All Properties' : 'Show Featured'}</span>
          </button>

          <div>
            <label htmlFor="sort-properties" className="sr-only">
              Sort properties
            </label>
            <select
              id="sort-properties"
              value={filters.sort}
              onChange={(e) => onSortChange(e.target.value as SearchFilters['sort'])}
              className="min-h-[48px] w-full sm:w-auto rounded-full border border-[#D3DDD0] bg-white px-5 py-2.5 text-[14px] sm:text-[16px] font-bold text-[#1F3229]"
            >
              <option value="newest">Sort: Featured &amp; Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="area_desc">Area: Largest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count & Active Filters Bar */}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D3DDD0] bg-[#EEF1E8]/70 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-2 text-[14px] sm:text-[16px] text-[#1F3229]">
          <span className="font-bold">
            {loading
              ? 'Loading properties...'
              : `${pagination.total} ${pagination.total === 1 ? 'property' : 'properties'} matched`}
          </span>
          <span className="text-[#666666]">
            ({filters.purpose === 'SALE' ? 'For Sale' : 'For Rent'}
            {filters.type ? ` • ${PROPERTY_TYPE_LABELS[filters.type]}` : ''}
            {filters.location ? ` • ${filters.location}` : ''}
            {filters.featuredOnly ? ' • Featured' : ''})
          </span>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D3DDD0] bg-white px-4 py-1.5 text-[14px] font-bold text-[#245B45] transition hover:bg-[#FAF9F5]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Network Error State */}
      {error && !loading && (
        <div
          role="alert"
          className="rounded-[28px] border border-[#D8B490] bg-[#FDF3E7] p-8 text-center space-y-4"
        >
          <AlertCircle className="mx-auto h-10 w-10 text-[#8A4A18]" aria-hidden="true" />
          <h3 className="text-[20px] font-bold text-[#1F3229]">
            Unable to load properties right now
          </h3>
          <p className="text-[16px] text-[#666666] max-w-xl mx-auto">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#245B45] px-6 py-3 text-[16px] font-bold text-white hover:bg-[#173E2F]"
          >
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div
          aria-busy="true"
          aria-label="Loading properties"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="rounded-[28px] border border-[#D3DDD0] bg-white p-5 space-y-4 animate-pulse"
            >
              <div className="h-[250px] w-full rounded-[20px] bg-[#EEF1E8]" />
              <div className="h-7 w-3/4 rounded-xl bg-[#EEF1E8]" />
              <div className="h-5 w-1/2 rounded-xl bg-[#E8EEE3]" />
              <div className="h-9 w-2/5 rounded-xl bg-[#EEF1E8]" />
              <div className="h-11 w-full rounded-full bg-[#E8EEE3]" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-[28px] border border-[#D3DDD0] bg-white p-8 sm:p-12 text-center space-y-4">
          <h3 className="text-[20px] sm:text-[24px] font-bold text-[#1F3229]">
            No matching properties found
          </h3>
          <p className="mx-auto max-w-xl text-[16px] sm:text-[17px] text-[#666666]">
            Try broadening your price range, clearing the locality filter, or switching between Buy
            and Rent listings.
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex min-h-[50px] items-center gap-2 rounded-full bg-[#245B45] px-7 py-3 text-[16px] font-bold text-white hover:bg-[#173E2F]"
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}

      {/* Property Cards Grid */}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                index={index}
                onOpenDetails={onOpenDetails}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>

          <p className="mt-6 text-[14px] text-[#666666]">
            Note: Listings marked as sample/demo data are illustrative examples for Madurai
            localities. Verify original documents independently before purchase or lease.
          </p>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <nav
              aria-label="Property pagination"
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => onPageChange(pagination.page - 1)}
                className="inline-flex min-h-[46px] items-center gap-1.5 rounded-full border border-[#D3DDD0] bg-white px-5 py-2 text-[14px] sm:text-[16px] font-bold text-[#1F3229] hover:bg-[#EEF1E8] disabled:opacity-45"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                <span>Previous</span>
              </button>

              <span className="px-3 text-[14px] sm:text-[16px] font-bold text-[#1F3229]">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => onPageChange(pagination.page + 1)}
                className="inline-flex min-h-[46px] items-center gap-1.5 rounded-full border border-[#D3DDD0] bg-white px-5 py-2 text-[14px] sm:text-[16px] font-bold text-[#1F3229] hover:bg-[#EEF1E8] disabled:opacity-45"
              >
                <span>Next</span>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
