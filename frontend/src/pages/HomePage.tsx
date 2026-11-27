import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiFetch, ApiError } from '../api/client';
import { ContactSection } from '../components/ContactSection';
import { Hero } from '../components/Hero';
import { MyPropertiesSection } from '../components/MyPropertiesSection';
import { PropertyDetailsDialog } from '../components/PropertyDetailsDialog';
import { PropertyListingsSection } from '../components/PropertyListingsSection';
import { SearchSection } from '../components/SearchSection';
import { TrustSection } from '../components/TrustSection';
import { useAuth } from '../context/AuthContext';
import type {
  ListingPurpose,
  LocationItem,
  PaginationMeta,
  PropertyItem,
  PropertyType,
  SearchFilters,
} from '../types';
import { buildListingPath, fromLocalitySlug, useSeoMeta } from '../utils/seo';

interface HomePageProps {
  routePurpose?: ListingPurpose;
  scrollToResults?: boolean;
  scrollToContact?: boolean;
  onOpenNewListing?: () => void;
  onEditListing?: (property: PropertyItem) => void;
  onPropertyDeleted?: () => void;
  listingRefreshNonce?: number;
}

function deriveFilters(
  params: URLSearchParams,
  routePurpose?: ListingPurpose,
  localitySlug?: string
): SearchFilters {
  const purposeParam = params.get('purpose');
  const purpose: ListingPurpose =
    routePurpose ?? (purposeParam === 'RENT' ? 'RENT' : 'SALE');
  const typeParam = (params.get('type') || '') as PropertyType | '';
  const sortParam = params.get('sort');
  const sort: SearchFilters['sort'] =
    sortParam === 'price_asc' || sortParam === 'price_desc' || sortParam === 'area_desc'
      ? sortParam
      : 'newest';
  const pageNum = Number(params.get('page') || '1');
  const locationFromRoute = localitySlug ? fromLocalitySlug(localitySlug) : '';

  return {
    purpose,
    type: typeParam,
    location: locationFromRoute || params.get('location') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    featuredOnly: params.get('featured') === 'true',
    sort,
    page: Number.isFinite(pageNum) && pageNum >= 1 ? pageNum : 1,
  };
}

export function HomePage({
  routePurpose,
  scrollToResults = false,
  scrollToContact = false,
  onOpenNewListing,
  onEditListing,
  onPropertyDeleted,
  listingRefreshNonce = 0,
}: HomePageProps) {
  const [searchParams] = useSearchParams();
  const { localitySlug, slug: propertySlugParam } = useParams<{
    localitySlug?: string;
    slug?: string;
  }>();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { user, openAuthModal } = useAuth();

  const filters = useMemo(
    () => deriveFilters(searchParams, routePurpose, localitySlug),
    [searchParams, routePurpose, localitySlug]
  );

  const [items, setItems] = useState<PropertyItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 9,
    total: 0,
    totalPages: 1,
  });
  const [metaCounts, setMetaCounts] = useState({
    totalPublishedCount: 8,
    uniqueLocationCount: 6,
  });
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);
  const [searchHighlighted, setSearchHighlighted] = useState(false);

  const locationInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const returnPathRef = useRef<string>('/');

  const scrollToElement = useCallback((elementId: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    const headerOffset = 92;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, []);

  // SEO title, description & canonical path
  const seoInfo = useMemo(() => {
    if (selectedProperty) {
      return {
        title: `${selectedProperty.title} in ${selectedProperty.location.locality}, Madurai | landnest.`,
        description: selectedProperty.description.slice(0, 155),
        canonical: `/property/${selectedProperty.slug}`,
      };
    }
    if (filters.location) {
      const purposeWord = filters.purpose === 'RENT' ? 'Rent' : 'Buy';
      return {
        title: `${purposeWord} Properties in ${filters.location}, Madurai | landnest.`,
        description: `Browse verified lands, plots, and properties in ${filters.location}, Madurai on Landnest.`,
        canonical: routerLocation.pathname,
      };
    }
    if (routePurpose === 'RENT') {
      return {
        title: 'Rent Homes & Commercial Spaces in Madurai | landnest.',
        description:
          'Find residential homes and commercial spaces for rent across Madurai on Landnest.',
        canonical: '/rent-properties',
      };
    }
    if (routePurpose === 'SALE') {
      return {
        title: 'Buy Lands, Plots & Properties in Madurai | landnest.',
        description:
          'Explore residential plots, agricultural land, and properties for sale in and around Madurai.',
        canonical: '/buy-properties',
      };
    }
    return {
      title: 'landnest. — Handpicked Lands, Plots & Properties in Madurai',
      description:
        'Discover handpicked lands, plots, and properties in and around Madurai. Transparent details, local roots, and personal guidance.',
      canonical: routerLocation.pathname === '/contact' ? '/contact' : '/',
    };
  }, [selectedProperty, filters.location, filters.purpose, routePurpose, routerLocation.pathname]);

  useSeoMeta(seoInfo.title, seoInfo.description, seoInfo.canonical);

  // Scroll when route changes to /buy-properties, /rent-properties, /properties/:locality, or /contact
  useEffect(() => {
    if (scrollToContact) {
      window.setTimeout(() => scrollToElement('contact'), 80);
    } else if (scrollToResults) {
      window.setTimeout(() => scrollToElement('listings-section'), 80);
    }
  }, [scrollToResults, scrollToContact, routerLocation.pathname, scrollToElement]);

  // Load property from /property/:slug when visited directly
  useEffect(() => {
    if (!propertySlugParam) {
      setSelectedProperty(null);
      return;
    }

    const existing = items.find((item) => item.slug === propertySlugParam);
    if (existing) {
      setSelectedProperty(existing);
      return;
    }

    let cancelled = false;
    apiFetch<{ property: PropertyItem }>(`/properties/${encodeURIComponent(propertySlugParam)}`)
      .then((res) => {
        if (!cancelled) setSelectedProperty(res.property);
      })
      .catch(() => {
        if (!cancelled) setSelectedProperty(null);
      });
    return () => {
      cancelled = true;
    };
  }, [propertySlugParam, items]);

  // Navigate cleanly with SEO paths + optional secondary query parameters
  const applyFilters = useCallback(
    (
      next: SearchFilters,
      options?: { scrollToResults?: boolean; explicitBase?: 'root' | 'purpose' }
    ) => {
      const basePath = buildListingPath({
        purpose: next.purpose,
        location: next.location,
        explicitBase: options?.explicitBase ?? (routePurpose ? 'purpose' : 'root'),
      });

      const nextParams = new URLSearchParams();
      if (next.type) nextParams.set('type', next.type);
      if (next.minPrice) nextParams.set('minPrice', next.minPrice);
      if (next.maxPrice) nextParams.set('maxPrice', next.maxPrice);
      if (next.featuredOnly) nextParams.set('featured', 'true');
      if (next.sort !== 'newest') nextParams.set('sort', next.sort);
      if (next.page > 1) nextParams.set('page', String(next.page));

      const queryString = nextParams.toString();
      const targetUrl = queryString ? `${basePath}?${queryString}` : basePath;
      navigate(targetUrl);

      if (options?.scrollToResults) {
        window.setTimeout(() => scrollToElement('listings-section'), 60);
      }
    },
    [navigate, routePurpose, scrollToElement]
  );

  // Fetch locations once
  useEffect(() => {
    apiFetch<{ locations: LocationItem[] }>('/locations')
      .then((res) => setLocations(res.locations))
      .catch(() => undefined);
  }, []);

  // Fetch properties with AbortController to cancel stale responses
  const fetchProperties = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams();
      qs.set('purpose', filters.purpose);
      if (filters.type) qs.set('type', filters.type);
      if (filters.location.trim()) qs.set('location', filters.location.trim());
      if (filters.minPrice) qs.set('minPrice', filters.minPrice);
      if (filters.maxPrice) qs.set('maxPrice', filters.maxPrice);
      if (filters.featuredOnly) qs.set('featured', 'true');
      qs.set('sort', filters.sort);
      qs.set('page', String(filters.page));
      qs.set('pageSize', '9');

      const data = await apiFetch<{
        items: PropertyItem[];
        pagination: PaginationMeta;
        meta: { totalPublishedCount: number; uniqueLocationCount: number };
      }>(`/properties?${qs.toString()}`, { signal: controller.signal });

      setItems(data.items);
      setPagination(data.pagination);
      setMetaCounts(data.meta);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Could not reach the Landnest server. Please check your connection and try again.';
      setError(msg);
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [filters, user?.id, listingRefreshNonce]);

  useEffect(() => {
    void fetchProperties();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchProperties]);

  const handleFindNewLand = () => {
    scrollToElement('property-search-card');
    setSearchHighlighted(true);
    window.setTimeout(() => {
      locationInputRef.current?.focus({ preventScroll: true });
    }, 350);
    window.setTimeout(() => setSearchHighlighted(false), 1800);
  };

  const handleOpenDetails = (property: PropertyItem) => {
    if (!propertySlugParam) {
      returnPathRef.current = `${routerLocation.pathname}${routerLocation.search}`;
    }
    setSelectedProperty(property);
    navigate(`/property/${property.slug}`);
  };

  const handleCloseDetails = () => {
    setSelectedProperty(null);
    if (propertySlugParam) {
      navigate(returnPathRef.current || '/');
    }
  };

  const handleToggleFavorite = async (property: PropertyItem) => {
    if (!user) {
      openAuthModal({
        notice: 'Sign in or create an account to save properties across your devices.',
      });
      return;
    }

    const nextFavorited = !property.isFavorited;
    setItems((prev) =>
      prev.map((item) =>
        item.id === property.id ? { ...item, isFavorited: nextFavorited } : item
      )
    );
    if (selectedProperty?.id === property.id) {
      setSelectedProperty((prev) => (prev ? { ...prev, isFavorited: nextFavorited } : null));
    }

    try {
      await apiFetch(`/me/favorites/${property.id}`, {
        method: nextFavorited ? 'POST' : 'DELETE',
      });
    } catch {
      setItems((prev) =>
        prev.map((item) =>
          item.id === property.id ? { ...item, isFavorited: !nextFavorited } : item
        )
      );
      if (selectedProperty?.id === property.id) {
        setSelectedProperty((prev) => (prev ? { ...prev, isFavorited: !nextFavorited } : null));
      }
    }
  };

  return (
    <main>
      <Hero
        propertyCount={metaCounts.totalPublishedCount}
        destinationCount={metaCounts.uniqueLocationCount}
        onFindNewLand={handleFindNewLand}
      />

      <SearchSection
        filters={filters}
        locations={locations}
        highlighted={searchHighlighted}
        locationInputRef={locationInputRef}
        onSearch={(next) =>
          applyFilters(next, { scrollToResults: true, explicitBase: 'purpose' })
        }
        onPopularLocationClick={(locality) =>
          applyFilters(
            { ...filters, purpose: 'SALE', location: locality, page: 1 },
            { scrollToResults: true, explicitBase: 'purpose' }
          )
        }
      />

      {user && onOpenNewListing && onEditListing && (
        <MyPropertiesSection
          onOpenNewListing={onOpenNewListing}
          onEditListing={onEditListing}
          onDeleted={onPropertyDeleted}
          listingRefreshNonce={listingRefreshNonce}
        />
      )}

      <PropertyListingsSection
        items={items}
        pagination={pagination}
        filters={filters}
        loading={loading}
        error={error}
        onRetry={() => void fetchProperties()}
        onToggleFeaturedView={() =>
          applyFilters({
            ...filters,
            featuredOnly: !filters.featuredOnly,
            page: 1,
          })
        }
        onSortChange={(sort) => applyFilters({ ...filters, sort, page: 1 })}
        onPageChange={(page) =>
          applyFilters({ ...filters, page }, { scrollToResults: true })
        }
        onClearFilters={() => {
          navigate('/');
        }}
        onOpenDetails={handleOpenDetails}
        onToggleFavorite={(prop) => void handleToggleFavorite(prop)}
      />

      <TrustSection />

      <ContactSection />

      <PropertyDetailsDialog
        property={selectedProperty}
        onClose={handleCloseDetails}
        onToggleFavorite={(prop) => void handleToggleFavorite(prop)}
      />
    </main>
  );
}
