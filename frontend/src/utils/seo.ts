import { useEffect } from 'react';

export function toLocalitySlug(locality: string): string {
  return locality
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function fromLocalitySlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function buildListingPath(options: {
  purpose?: 'SALE' | 'RENT';
  location?: string;
  explicitBase?: 'root' | 'purpose';
}): string {
  const locSlug = options.location?.trim() ? toLocalitySlug(options.location) : '';
  if (options.purpose === 'RENT') {
    return locSlug ? `/rent-properties/${locSlug}` : '/rent-properties';
  }
  if (options.explicitBase === 'purpose' || locSlug) {
    return locSlug ? `/buy-properties/${locSlug}` : '/buy-properties';
  }
  return '/';
}

export function useSeoMeta(title: string, description: string, canonicalPath?: string) {
  useEffect(() => {
    document.title = title;

    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    if (canonicalPath) {
      let linkCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.rel = 'canonical';
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.href = `${window.location.origin}${canonicalPath}`;
    }
  }, [title, description, canonicalPath]);
}
