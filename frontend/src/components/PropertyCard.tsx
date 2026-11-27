import { motion, useReducedMotion } from 'framer-motion';
import { Heart, MapPin, Phone, Plus } from 'lucide-react';
import type { PropertyItem } from '../types';
import {
  FACING_LABELS,
  PROPERTY_TYPE_LABELS,
  formatLocationLine,
  formatPropertyPrice,
  formatSqFt,
} from '../utils/format';
import { SafeImage } from './SafeImage';

interface PropertyCardProps {
  property: PropertyItem;
  index: number;
  onOpenDetails: (property: PropertyItem) => void;
  onToggleFavorite: (property: PropertyItem) => void;
}

export function PropertyCard({
  property,
  index,
  onOpenDetails,
  onToggleFavorite,
}: PropertyCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const coverImage = property.images[0];
  const imageSrc = coverImage?.thumbnailUrl || coverImage?.imageUrl || '/images/plot-bama.svg';
  const imageAlt = coverImage?.altText || `${property.title} in ${property.location.locality}`;

  return (
    <motion.article
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.4,
        delay: shouldReduceMotion ? 0 : Math.min(index * 0.06, 0.28),
        ease: 'easeOut',
      }}
      className="group flex flex-col justify-between rounded-[28px] border border-[#D3DDD0] bg-white p-4 sm:p-5 shadow-sm transition-shadow duration-300 hover:shadow-xl"
    >
      <div>
        {/* Image Container */}
        <div className="relative overflow-hidden rounded-[20px] bg-[#EEF1E8]">
          <button
            type="button"
            onClick={() => onOpenDetails(property)}
            className="block w-full text-left focus-visible:outline-none"
            aria-label={`View details for ${property.title}`}
          >
            <div className="h-[240px] sm:h-[265px] w-full overflow-hidden">
              <SafeImage
                src={imageSrc}
                alt={imageAlt}
                className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:saturate-[1.12]"
              />
            </div>
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#183D2E]/80 via-[#183D2E]/15 to-[#183D2E]/30"
              aria-hidden="true"
            />
          </button>

          {/* Top Badges + Favorite Button */}
          <div className="pointer-events-none absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[14px] font-bold shadow-sm ${
                  property.isFeatured
                    ? 'bg-[#C8DC9F] text-[#183D2E]'
                    : 'bg-[#FAF9F5]/95 text-[#1F3229]'
                }`}
              >
                {property.isFeatured ? 'Featured' : 'New listing'}
              </span>
              <span className="inline-flex items-center rounded-full bg-[#245B45]/95 px-3.5 py-1.5 text-[14px] font-bold text-white shadow-sm">
                {property.listingPurpose === 'SALE' ? 'For Sale' : 'For Rent'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onToggleFavorite(property)}
              aria-label={
                property.isFavorited
                  ? `Remove ${property.title} from saved properties`
                  : `Save ${property.title} to favorites`
              }
              aria-pressed={property.isFavorited}
              className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition-colors ${
                property.isFavorited
                  ? 'border-[#245B45] bg-[#245B45] text-white'
                  : 'border-white/60 bg-[#FAF9F5]/90 text-[#1F3229] hover:bg-white'
              }`}
            >
              <Heart
                className={`h-5 w-5 ${property.isFavorited ? 'fill-current' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>

          {/* Bottom Area Overlay */}
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-full bg-[#183D2E]/85 px-3.5 py-1.5 text-[14px] font-bold text-white backdrop-blur-sm">
              {formatSqFt(property.totalAreaSqFt)}
            </span>
            <span className="inline-flex items-center rounded-full bg-[#FAF9F5]/90 px-3 py-1 text-[14px] font-medium text-[#1F3229]">
              {FACING_LABELS[property.facingDirection]}
            </span>
          </div>
        </div>

        {/* Title, Location, Price */}
        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={() => onOpenDetails(property)}
            className="block w-full text-left"
          >
            <h3 className="text-[19px] sm:text-[20px] font-bold leading-snug text-[#1F3229] transition-colors group-hover:text-[#245B45] break-words">
              {property.title}
            </h3>
          </button>

          <p className="flex items-start gap-2 text-[16px] text-[#666666]">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#245B45]" aria-hidden="true" />
            <span className="break-words">
              {formatLocationLine(property.location.locality, property.location.city)}
            </span>
          </p>

          <p className="text-[24px] sm:text-[26px] font-bold leading-tight text-[#245B45] break-words">
            {formatPropertyPrice(property.price, property.listingPurpose, property.rentPeriod)}
          </p>
        </div>
      </div>

      {/* Bottom Action Row */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF1E8] pt-4">
        <span className="inline-flex items-center rounded-full bg-[#EEF1E8] px-3.5 py-1.5 text-[14px] font-bold text-[#1F3229]">
          {PROPERTY_TYPE_LABELS[property.propertyType]}
        </span>

        <div className="flex items-center gap-2.5">
          <a
            href="tel:+914522530100"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#E8EEE3] px-4 py-2 text-[14px] font-bold text-[#245B45] transition hover:bg-[#245B45] hover:text-white active:scale-[0.98]"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            <span>Call Now</span>
          </a>

          <button
            type="button"
            onClick={() => onOpenDetails(property)}
            aria-label={`Quick view ${property.title}`}
            title="Quick view details"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D3DDD0] bg-[#FAF9F5] text-[#1F3229] transition hover:bg-[#245B45] hover:text-white hover:border-[#245B45] active:scale-[0.96]"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
