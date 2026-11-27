import React, { useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import type { ListingPurpose, LocationItem, PropertyType, SearchFilters } from '../types';
import { PROPERTY_TYPE_LABELS } from '../utils/format';

interface SearchSectionProps {
  filters: SearchFilters;
  locations: LocationItem[];
  highlighted: boolean;
  locationInputRef: React.RefObject<HTMLInputElement>;
  onSearch: (nextFilters: SearchFilters) => void;
  onPopularLocationClick: (locality: string) => void;
}

const POPULAR_LOCATIONS = ['Othakadai', 'Kadachanendhal', 'Alanganallur', 'Thirumangalam'];

export function SearchSection({
  filters,
  locations,
  highlighted,
  locationInputRef,
  onSearch,
  onPopularLocationClick,
}: SearchSectionProps) {
  const [draft, setDraft] = useState<SearchFilters>(filters);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sync draft when external filter changes (e.g. header Buy/Rent click or footer location click)
  React.useEffect(() => {
    setDraft(filters);
    setPriceError(null);
  }, [filters]);

  const handlePurposeChange = (purpose: ListingPurpose) => {
    const updated = { ...draft, purpose, page: 1 };
    setDraft(updated);
    onSearch(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const minVal = draft.minPrice ? Number(draft.minPrice) : null;
    const maxVal = draft.maxPrice ? Number(draft.maxPrice) : null;

    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      setPriceError('Minimum price cannot exceed maximum price.');
      return;
    }

    setPriceError(null);
    setShowSuggestions(false);
    onSearch({ ...draft, page: 1 });
  };

  const filteredSuggestions = locations.filter((loc) =>
    !draft.location.trim()
      ? true
      : loc.locality.toLowerCase().includes(draft.location.trim().toLowerCase())
  );

  return (
    <section aria-label="Property search" className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6">
      <div className="lg:-mt-14">
        {/* BUY / RENT Tabs */}
        <div
          role="tablist"
          aria-label="Listing purpose"
          className="inline-flex rounded-t-[20px] bg-[#E8EEE3] p-1.5 border border-b-0 border-[#D3DDD0] gap-1.5"
        >
          {(['SALE', 'RENT'] as ListingPurpose[]).map((purpose) => {
            const active = draft.purpose === purpose;
            const label = purpose === 'SALE' ? 'BUY' : 'RENT';
            return (
              <button
                key={purpose}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handlePurposeChange(purpose)}
                className={`min-h-[46px] min-w-[100px] sm:min-w-[120px] rounded-full px-6 py-2.5 text-[16px] sm:text-[17px] font-bold transition-colors ${
                  active
                    ? 'bg-[#245B45] text-white shadow-sm'
                    : 'bg-transparent text-[#1F3229] hover:bg-[#FAF9F5]/70'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Floating Search Card */}
        <form
          id="property-search-card"
          onSubmit={handleSubmit}
          className={`rounded-b-[24px] rounded-tr-[24px] bg-white border border-[#D3DDD0] p-5 sm:p-7 shadow-lg transition-all duration-300 ${
            highlighted ? 'ring-4 ring-[#245B45]/40 border-[#245B45]' : ''
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            {/* Property Type */}
            <div className="lg:col-span-3">
              <label
                htmlFor="search-property-type"
                className="block mb-2 text-[14px] font-bold text-[#1F3229]"
              >
                Type of Property
              </label>
              <select
                id="search-property-type"
                value={draft.type}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    type: e.target.value as PropertyType | '',
                  }))
                }
                className="min-h-[56px] w-full rounded-2xl border border-[#D3DDD0] bg-[#FAF9F5] px-4 text-[16px] sm:text-[17px] text-[#1F3229]"
              >
                <option value="">All property types</option>
                {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((key) => (
                  <option key={key} value={key}>
                    {PROPERTY_TYPE_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            {/* Area / Location */}
            <div className="relative lg:col-span-3">
              <label
                htmlFor="search-location"
                className="block mb-2 text-[14px] font-bold text-[#1F3229]"
              >
                Choose Area / Location
              </label>
              <div className="relative">
                <input
                  ref={locationInputRef}
                  id="search-location"
                  type="text"
                  value={draft.location}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => window.setTimeout(() => setShowSuggestions(false), 160)}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, location: e.target.value }));
                    setShowSuggestions(true);
                  }}
                  placeholder="e.g. Othakadai"
                  autoComplete="off"
                  className="min-h-[56px] w-full rounded-2xl border border-[#D3DDD0] bg-[#FAF9F5] pl-4 pr-11 text-[16px] sm:text-[17px] text-[#1F3229] placeholder:text-[#666666]/70"
                />
                {draft.location && (
                  <button
                    type="button"
                    aria-label="Clear location"
                    onClick={() => setDraft((prev) => ({ ...prev, location: '' }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full text-[#666666] hover:bg-[#EEF1E8]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {showSuggestions && filteredSuggestions.length > 0 && (
                <ul
                  role="listbox"
                  aria-label="Suggested locations"
                  className="absolute left-0 right-0 top-full z-30 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-[#D3DDD0] bg-white p-1.5 shadow-xl"
                >
                  {filteredSuggestions.map((loc) => (
                    <li key={loc.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setDraft((prev) => ({ ...prev, location: loc.locality }));
                          setShowSuggestions(false);
                        }}
                        className="flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 py-2 text-left text-[16px] text-[#1F3229] hover:bg-[#EEF1E8]"
                      >
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#245B45]" aria-hidden="true" />
                          <span>{loc.locality}</span>
                        </span>
                        {typeof loc.publishedCount === 'number' && (
                          <span className="text-[14px] text-[#666666]">{loc.publishedCount}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Price From */}
            <div className="lg:col-span-2">
              <label
                htmlFor="search-min-price"
                className="block mb-2 text-[14px] font-bold text-[#1F3229]"
              >
                Price From (₹)
              </label>
              <input
                id="search-min-price"
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.minPrice}
                onChange={(e) => {
                  setPriceError(null);
                  setDraft((prev) => ({ ...prev, minPrice: e.target.value }));
                }}
                placeholder="Min ₹"
                className="min-h-[56px] w-full rounded-2xl border border-[#D3DDD0] bg-[#FAF9F5] px-4 text-[16px] sm:text-[17px] text-[#1F3229] placeholder:text-[#666666]/70"
              />
            </div>

            {/* Price To */}
            <div className="lg:col-span-2">
              <label
                htmlFor="search-max-price"
                className="block mb-2 text-[14px] font-bold text-[#1F3229]"
              >
                Price To (₹)
              </label>
              <input
                id="search-max-price"
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.maxPrice}
                onChange={(e) => {
                  setPriceError(null);
                  setDraft((prev) => ({ ...prev, maxPrice: e.target.value }));
                }}
                placeholder="Max ₹"
                className="min-h-[56px] w-full rounded-2xl border border-[#D3DDD0] bg-[#FAF9F5] px-4 text-[16px] sm:text-[17px] text-[#1F3229] placeholder:text-[#666666]/70"
              />
            </div>

            {/* Search Button */}
            <div className="lg:col-span-2">
              <button
                type="submit"
                className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-[#245B45] px-6 py-3.5 text-[16px] sm:text-[17px] font-bold text-white shadow-sm transition hover:bg-[#173E2F] active:scale-[0.98]"
              >
                <Search className="h-5 w-5" aria-hidden="true" />
                <span>Search</span>
              </button>
            </div>
          </div>

          {priceError && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-[#D8B490] bg-[#FDF3E7] px-4 py-3 text-[14px] font-bold text-[#8A4A18]"
            >
              {priceError}
            </p>
          )}
        </form>

        {/* Popular Locations Row */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3">
          <span className="text-[14px] font-bold text-[#666666] mr-1">Popular in Madurai:</span>
          {POPULAR_LOCATIONS.map((loc) => {
            const isSelected = filters.location.toLowerCase() === loc.toLowerCase();
            return (
              <button
                key={loc}
                type="button"
                onClick={() => onPopularLocationClick(loc)}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-[14px] font-bold transition-colors ${
                  isSelected
                    ? 'border-[#245B45] bg-[#245B45] text-white'
                    : 'border-[#D3DDD0] bg-[#EEF1E8] text-[#1F3229] hover:bg-[#E8EEE3]'
                }`}
              >
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{loc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
