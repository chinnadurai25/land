import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Heart,
  Info,
  Landmark,
  MapPin,
  Maximize2,
  MessageCircle,
  Minimize2,
  Phone,
  RefreshCw,
  Ruler,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { apiFetch, ApiError } from '../api/client';
import type { PropertyItem } from '../types';
import {
  APPROVAL_LABELS,
  FACING_LABELS,
  PROPERTY_TYPE_LABELS,
  formatINR,
  formatLocationLine,
  formatPropertyPrice,
  formatSqFt,
} from '../utils/format';
import { AccessibleModal } from './AccessibleModal';
import { SafeImage } from './SafeImage';

interface PropertyDetailsDialogProps {
  property: PropertyItem | null;
  onClose: () => void;
  onToggleFavorite: (property: PropertyItem) => void;
}

export function PropertyDetailsDialog({
  property,
  onClose,
  onToggleFavorite,
}: PropertyDetailsDialogProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedGallery, setExpandedGallery] = useState(false);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  // Property-specific inquiry state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setActiveIndex(0);
    setExpandedGallery(false);
    setShowInquiryForm(false);
    setFeedback(null);
    if (property) {
      setMessage(
        `Hello Landnest team, I would like more details about "${property.title}" in ${property.location.locality}.`
      );
    }
  }, [property]);

  const loadCaptcha = async () => {
    try {
      const data = await apiFetch<{ challengeId: string; question: string }>('/captcha');
      setCaptchaId(data.challengeId);
      setCaptchaQuestion(data.question);
      setCaptchaAnswer('');
    } catch {
      setCaptchaQuestion('Unable to load check');
    }
  };

  useEffect(() => {
    if (showInquiryForm && !captchaId) {
      void loadCaptcha();
    }
  }, [showInquiryForm, captchaId]);

  if (!property) {
    return (
      <AccessibleModal open={false} onClose={onClose} title="">
        <div />
      </AccessibleModal>
    );
  }

  const images =
    property.images.length > 0
      ? property.images
      : [
          {
            id: 'fallback',
            imageUrl: '/images/plot-bama.svg',
            altText: property.title,
            category: 'SITE_PHOTO' as const,
            displayOrder: 0,
            isCover: true,
          },
        ];

  const currentImage = images[activeIndex] || images[0];
  const isLayoutDiagram = currentImage?.category === 'LAYOUT';

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 45) {
      if (diff > 0) handlePrev();
      else handleNext();
    }
    touchStartX.current = null;
  };

  const locationQuery = encodeURIComponent(
    `${property.location.locality}, ${property.location.city}, ${property.location.state}`
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${locationQuery}`;

  const whatsappText = encodeURIComponent(
    `Hello Landnest, I am interested in "${property.title}" at ${formatLocationLine(
      property.location.locality,
      property.location.city
    )} (${formatPropertyPrice(property.price, property.listingPurpose, property.rentPeriod)}).`
  );
  const whatsappUrl = `https://wa.me/919842100000?text=${whatsappText}`;

  const handlePropertyInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await apiFetch<{ message: string }>('/inquiries', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: property.id,
          name,
          email,
          phone,
          propertyType: PROPERTY_TYPE_LABELS[property.propertyType],
          message,
          captchaChallengeId: captchaId,
          captchaAnswer,
        }),
      });
      setFeedback({ type: 'success', text: res.message });
      setName('');
      setEmail('');
      setPhone('');
      setCaptchaAnswer('');
      void loadCaptcha();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Could not save your inquiry. Please verify your entries and try again.';
      setFeedback({ type: 'error', text: msg });
      if (err instanceof ApiError && err.code === 'INVALID_CAPTCHA') {
        void loadCaptcha();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      open={Boolean(property)}
      onClose={onClose}
      title={property.title}
      subtitle={`${formatLocationLine(property.location.locality, property.location.city)} • ${
        PROPERTY_TYPE_LABELS[property.propertyType]
      }`}
      maxWidthClass={expandedGallery ? 'max-w-5xl' : 'max-w-4xl'}
      fullScreenMobile
    >
      <div className="space-y-6">
        {/* Demo / Approval Transparency Notice */}
        {property.isDemo && (
          <div className="flex items-start gap-3 rounded-2xl border border-[#D3DDD0] bg-[#EEF1E8] px-4 py-3 text-[14px] text-[#1F3229]">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#245B45]" aria-hidden="true" />
            <p>
              <strong>Illustrative Demo Listing:</strong> Sample property details and layout
              diagrams are for preview purposes only. Always verify original land records and
              official survey plans before any transaction.
            </p>
          </div>
        )}

        {/* Image Carousel */}
        <div className="space-y-3">
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`relative overflow-hidden rounded-[22px] border border-[#D3DDD0] bg-[#EEF1E8] ${
              expandedGallery ? 'h-[320px] sm:h-[460px]' : 'h-[240px] sm:h-[340px]'
            }`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentImage.id}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0.4, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0.4 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.28 }}
                className="h-full w-full"
              >
                <SafeImage
                  src={currentImage.imageUrl}
                  alt={currentImage.altText}
                  eager
                  className={`h-full w-full ${
                    isLayoutDiagram ? 'object-contain bg-[#FAF9F5] p-2' : 'object-cover'
                  }`}
                />
              </motion.div>
            </AnimatePresence>

            {/* Counter & Expand Toggle */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
              <span className="inline-flex items-center rounded-full bg-[#183D2E]/85 px-3.5 py-1.5 text-[14px] font-bold text-white backdrop-blur-sm">
                {activeIndex + 1} / {images.length}{' '}
                {isLayoutDiagram ? '• Illustrative Layout' : '• Site Photo'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleFavorite(property)}
                  aria-label={
                    property.isFavorited ? 'Remove from favorites' : 'Save to favorites'
                  }
                  className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition ${
                    property.isFavorited
                      ? 'border-[#245B45] bg-[#245B45] text-white'
                      : 'border-white/70 bg-[#FAF9F5]/90 text-[#1F3229] hover:bg-white'
                  }`}
                >
                  <Heart
                    className={`h-5 w-5 ${property.isFavorited ? 'fill-current' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setExpandedGallery((prev) => !prev)}
                  aria-label={expandedGallery ? 'Collapse gallery' : 'Expand gallery'}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-[#FAF9F5]/90 text-[#1F3229] shadow-sm transition hover:bg-white"
                >
                  {expandedGallery ? (
                    <Minimize2 className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Maximize2 className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Prev / Next Carousel Buttons */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-[#D3DDD0] bg-[#FAF9F5]/92 text-[#1F3229] shadow-md transition hover:bg-white"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-[#D3DDD0] bg-[#FAF9F5]/92 text-[#1F3229] shadow-md transition hover:bg-white"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {isLayoutDiagram && (
            <p className="flex items-center gap-2 rounded-xl border border-[#D8B490] bg-[#FDF3E7] px-4 py-2.5 text-[14px] font-bold text-[#8A4A18]">
              <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>
                Illustrative plot-layout diagram only — not a legal survey plan or government
                sketch.
              </span>
            </p>
          )}

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`View image ${idx + 1}: ${img.altText}`}
                  className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    idx === activeIndex
                      ? 'border-[#245B45] ring-2 ring-[#245B45]/30'
                      : 'border-[#D3DDD0] opacity-75 hover:opacity-100'
                  }`}
                >
                  <SafeImage
                    src={img.thumbnailUrl || img.imageUrl}
                    alt={img.altText}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price & Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-[#D3DDD0] bg-white p-5">
          <div>
            <p className="text-[14px] font-bold uppercase tracking-wide text-[#666666]">
              {property.listingPurpose === 'SALE' ? 'Asking Price' : 'Rental Rate'}
            </p>
            <p className="text-[26px] sm:text-[28px] font-bold text-[#245B45]">
              {formatPropertyPrice(property.price, property.listingPurpose, property.rentPeriod)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#EEF1E8] px-4 py-2 text-[14px] font-bold text-[#1F3229]">
              {PROPERTY_TYPE_LABELS[property.propertyType]}
            </span>
            <span className="rounded-full bg-[#245B45] px-4 py-2 text-[14px] font-bold text-white">
              {property.listingPurpose === 'SALE' ? 'For Sale' : 'For Rent'}
            </span>
          </div>
        </div>

        <p className="text-[16px] sm:text-[17px] leading-relaxed text-[#666666]">
          {property.description}
        </p>

        {/* Specification Grid */}
        <div>
          <h3 className="mb-3 text-[19px] sm:text-[20px] font-bold text-[#1F3229]">
            Property Specifications
          </h3>
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 gap-3.5">
            <div className="rounded-2xl border border-[#D3DDD0] bg-white p-4">
              <p className="text-[14px] text-[#666666]">Total Area</p>
              <p className="mt-1 text-[17px] font-bold text-[#1F3229]">
                {formatSqFt(property.totalAreaSqFt)}
              </p>
            </div>

            <div className="rounded-2xl border border-[#D3DDD0] bg-white p-4">
              <p className="text-[14px] text-[#666666]">Area in Cents</p>
              <p className="mt-1 text-[17px] font-bold text-[#1F3229]">
                {property.areaInCents} cents
              </p>
            </div>

            <div className="rounded-2xl border border-[#D3DDD0] bg-white p-4">
              <p className="flex items-center gap-1.5 text-[14px] text-[#666666]">
                <Compass className="h-4 w-4 text-[#245B45]" aria-hidden="true" />
                <span>Facing</span>
              </p>
              <p className="mt-1 text-[17px] font-bold text-[#1F3229]">
                {FACING_LABELS[property.facingDirection]}
              </p>
            </div>

            <div className="rounded-2xl border border-[#D3DDD0] bg-white p-4">
              <p className="flex items-center gap-1.5 text-[14px] text-[#666666]">
                <Ruler className="h-4 w-4 text-[#245B45]" aria-hidden="true" />
                <span>Road Width</span>
              </p>
              <p className="mt-1 text-[17px] font-bold text-[#1F3229] break-words">
                {property.roadWidth}
              </p>
            </div>

            <div className="rounded-2xl border border-[#D3DDD0] bg-white p-4">
              <p className="text-[14px] text-[#666666]">
                {property.listingPurpose === 'SALE' ? 'Price / sq.ft' : 'Rate / sq.ft'}
              </p>
              <p className="mt-1 text-[17px] font-bold text-[#245B45]">
                {formatINR(property.pricePerSqFt)}/sq.ft
              </p>
            </div>

            <div className="rounded-2xl border border-[#D3DDD0] bg-white p-4">
              <p className="flex items-center gap-1.5 text-[14px] text-[#666666]">
                <Landmark className="h-4 w-4 text-[#245B45]" aria-hidden="true" />
                <span>Nearby Landmark</span>
              </p>
              <p className="mt-1 text-[16px] font-bold text-[#1F3229] break-words">
                {property.landmark}
              </p>
            </div>

            <div className="min-[360px]:col-span-2 md:col-span-3 rounded-2xl border border-[#D3DDD0] bg-[#EEF1E8]/70 p-4">
              <p className="text-[14px] font-bold text-[#1F3229]">Approval Status</p>
              <p className="mt-1 text-[16px] text-[#1F3229]">
                {APPROVAL_LABELS[property.approvalStatus]}
                {property.approvalReference ? ` — ${property.approvalReference}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Map-style Location Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#D3DDD0] bg-[#E8EEE3] p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#245B45] text-white">
              <MapPin className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[16px] sm:text-[17px] font-bold text-[#1F3229]">
                {formatLocationLine(property.location.locality, property.location.city)}
              </p>
              <p className="text-[14px] text-[#666666]">
                {property.location.state}
                {property.location.postalCode ? ` – ${property.location.postalCode}` : ''}
              </p>
            </div>
          </div>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#245B45] bg-white px-5 py-2.5 text-[14px] sm:text-[16px] font-bold text-[#245B45] transition hover:bg-[#245B45] hover:text-white"
          >
            <span>Open in Google Maps</span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        {/* Contact Actions */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <a
            href="tel:+914522530100"
            className="inline-flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-full bg-[#245B45] px-6 py-3 text-[16px] font-bold text-white transition hover:bg-[#173E2F]"
          >
            <Phone className="h-5 w-5" aria-hidden="true" />
            <span>Call to Inquire</span>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-full border border-[#245B45] bg-[#EEF1E8] px-6 py-3 text-[16px] font-bold text-[#245B45] transition hover:bg-[#E8EEE3]"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            <span>WhatsApp Inquiry</span>
          </a>

          <button
            type="button"
            onClick={() => setShowInquiryForm((prev) => !prev)}
            className="inline-flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-full border border-[#D3DDD0] bg-white px-6 py-3 text-[16px] font-bold text-[#1F3229] transition hover:bg-[#EEF1E8]"
          >
            <Send className="h-5 w-5 text-[#245B45]" aria-hidden="true" />
            <span>{showInquiryForm ? 'Hide Inquiry Form' : 'Send Direct Inquiry'}</span>
          </button>
        </div>

        {/* Inline Property Inquiry Form */}
        {showInquiryForm && (
          <form
            onSubmit={handlePropertyInquirySubmit}
            className="space-y-4 rounded-2xl border border-[#D3DDD0] bg-white p-5"
          >
            <h4 className="text-[17px] font-bold text-[#1F3229]">
              Inquire about {property.title}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 text-[14px] font-bold text-[#1F3229]">
                  Your Name*
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-h-[50px] w-full rounded-xl border border-[#D3DDD0] bg-[#FAF9F5] px-4 text-[16px]"
                />
              </div>
              <div>
                <label className="block mb-1.5 text-[14px] font-bold text-[#1F3229]">
                  Email Address*
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[50px] w-full rounded-xl border border-[#D3DDD0] bg-[#FAF9F5] px-4 text-[16px]"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-[14px] font-bold text-[#1F3229]">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98421 00000"
                className="min-h-[50px] w-full rounded-xl border border-[#D3DDD0] bg-[#FAF9F5] px-4 text-[16px]"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-[14px] font-bold text-[#1F3229]">
                Message*
              </label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border border-[#D3DDD0] bg-[#FAF9F5] p-3.5 text-[16px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-xl bg-[#EEF1E8] px-4 py-2.5 text-[16px] font-bold text-[#1F3229]">
                {captchaQuestion || 'Loading check...'}
              </span>
              <input
                type="text"
                inputMode="numeric"
                required
                aria-label="Math security answer"
                placeholder="Answer"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                className="min-h-[48px] w-28 rounded-xl border border-[#D3DDD0] bg-[#FAF9F5] px-3 text-[16px]"
              />
              <button
                type="button"
                onClick={() => void loadCaptcha()}
                aria-label="Refresh math check"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D3DDD0] bg-[#FAF9F5] text-[#245B45] hover:bg-[#EEF1E8]"
              >
                <RefreshCw className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {feedback && (
              <p
                role="status"
                className={`rounded-xl border px-4 py-3 text-[14px] font-bold ${
                  feedback.type === 'success'
                    ? 'border-[#245B45] bg-[#EEF1E8] text-[#1F3229]'
                    : 'border-[#D8B490] bg-[#FDF3E7] text-[#8A4A18]'
                }`}
              >
                {feedback.text}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#245B45] px-6 py-3 text-[16px] font-bold text-white transition hover:bg-[#173E2F] disabled:opacity-60"
            >
              <span>{submitting ? 'Saving Inquiry...' : 'Submit Property Inquiry'}</span>
            </button>
          </form>
        )}
      </div>
    </AccessibleModal>
  );
}
