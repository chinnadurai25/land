import React, { useEffect, useState } from 'react';
import { ImagePlus, Star, Trash2, Upload } from 'lucide-react';
import { apiFetch, ApiError } from '../api/client';
import type {
  FacingDirection,
  ListingPurpose,
  PropertyImageItem,
  PropertyItem,
  PropertyType,
  RentPeriod,
} from '../types';
import { FACING_LABELS, PROPERTY_TYPE_LABELS, PUBLICATION_STATUS_META } from '../utils/format';
import { AccessibleModal } from './AccessibleModal';
import { SafeImage } from './SafeImage';

interface ListingFormModalProps {
  open: boolean;
  editingProperty: PropertyItem | null;
  onClose: () => void;
  onSaved: (property: PropertyItem, statusMessage: string) => void;
  onDeleted?: (propertyId: string) => void;
}

export function ListingFormModal({
  open,
  editingProperty,
  onClose,
  onSaved,
  onDeleted,
}: ListingFormModalProps) {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('LAND_PLOT');
  const [listingPurpose, setListingPurpose] = useState<ListingPurpose>('SALE');
  const [price, setPrice] = useState('');
  const [rentPeriod, setRentPeriod] = useState<RentPeriod>('MONTHLY');
  const [totalAreaSqFt, setTotalAreaSqFt] = useState('');
  const [facingDirection, setFacingDirection] = useState<FacingDirection>('EAST');
  const [roadWidth, setRoadWidth] = useState('30 ft blacktop road');
  const [landmark, setLandmark] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('Madurai');
  const [postalCode, setPostalCode] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<'NOT_PROVIDED' | 'PENDING_VERIFICATION'>(
    'NOT_PROVIDED'
  );
  const [approvalReference, setApprovalReference] = useState('');

  const [images, setImages] = useState<PropertyImageItem[]>([]);
  const [uploadCategory, setUploadCategory] = useState<'SITE_PHOTO' | 'LAYOUT'>('SITE_PHOTO');
  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setFeedback(null);
    setConfirmDelete(false);
    if (editingProperty) {
      setPropertyId(editingProperty.id);
      setTitle(editingProperty.title);
      setDescription(editingProperty.description);
      setPropertyType(editingProperty.propertyType);
      setListingPurpose(editingProperty.listingPurpose);
      setPrice(String(editingProperty.price));
      setRentPeriod(editingProperty.rentPeriod || 'MONTHLY');
      setTotalAreaSqFt(String(editingProperty.totalAreaSqFt));
      setFacingDirection(editingProperty.facingDirection);
      setRoadWidth(editingProperty.roadWidth);
      setLandmark(editingProperty.landmark);
      setLocality(editingProperty.location.locality);
      setCity(editingProperty.location.city);
      setPostalCode(editingProperty.location.postalCode || '');
      setApprovalStatus(
        editingProperty.approvalStatus === 'PENDING_VERIFICATION'
          ? 'PENDING_VERIFICATION'
          : 'NOT_PROVIDED'
      );
      setApprovalReference(editingProperty.approvalReference || '');
      setImages(editingProperty.images);
    } else {
      setPropertyId(null);
      setTitle('');
      setDescription('');
      setPropertyType('LAND_PLOT');
      setListingPurpose('SALE');
      setPrice('');
      setRentPeriod('MONTHLY');
      setTotalAreaSqFt('');
      setFacingDirection('EAST');
      setRoadWidth('30 ft road');
      setLandmark('');
      setLocality('');
      setCity('Madurai');
      setPostalCode('');
      setApprovalStatus('NOT_PROVIDED');
      setApprovalReference('');
      setImages([]);
    }
  }, [open, editingProperty]);

  const buildPayload = () => ({
    title: title.trim(),
    description: description.trim(),
    propertyType,
    listingPurpose,
    price: Number(price),
    rentPeriod: listingPurpose === 'RENT' ? rentPeriod : null,
    totalAreaSqFt: Number(totalAreaSqFt),
    facingDirection,
    roadWidth: roadWidth.trim(),
    landmark: landmark.trim(),
    locality: locality.trim(),
    city: city.trim() || 'Madurai',
    postalCode: postalCode.trim() || null,
    approvalStatus,
    approvalReference: approvalReference.trim() || null,
  });

  const saveDraftOrUpdate = async (): Promise<{ property: PropertyItem; message: string }> => {
    const payload = buildPayload();
    if (propertyId) {
      const res = await apiFetch<{ message: string; property: PropertyItem }>(
        `/properties/${propertyId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      );
      setPropertyId(res.property.id);
      return res;
    }

    const res = await apiFetch<{ message: string; property: PropertyItem }>('/properties', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setPropertyId(res.property.id);
    return res;
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await saveDraftOrUpdate();
      setFeedback({ type: 'success', text: res.message });
      onSaved(res.property, res.message);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Could not save listing draft. Check all fields and try again.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (saving) return;
    setSaving(true);
    setFeedback(null);

    try {
      const saved = await saveDraftOrUpdate();
      const submitted = await apiFetch<{ message: string; property: PropertyItem }>(
        `/properties/${saved.property.id}/submit`,
        { method: 'POST' }
      );
      setFeedback({ type: 'success', text: submitted.message });
      onSaved(submitted.property, submitted.message);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Could not submit listing for review. Please check required fields.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    setFeedback(null);

    try {
      let targetId = propertyId;
      if (!targetId) {
        const created = await saveDraftOrUpdate();
        targetId = created.property.id;
      }

      const formData = new FormData();
      formData.append('image', file);
      formData.append('category', uploadCategory);
      formData.append('isCover', images.length === 0 ? 'true' : 'false');

      const res = await apiFetch<{ image: PropertyImageItem }>(
        `/properties/${targetId}/images`,
        {
          method: 'POST',
          body: formData,
        }
      );

      setImages((prev) => [...prev, res.image]);
      setFeedback({ type: 'success', text: 'Photo uploaded and optimized.' });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Image upload failed. Ensure your listing details are filled in and file is JPEG/PNG/WebP under 5MB.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setUploading(false);
    }
  };

  const handleSetCover = async (imageId: string) => {
    if (!propertyId) return;
    try {
      await apiFetch(`/properties/${propertyId}/images/${imageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isCover: true }),
      });
      setImages((prev) => prev.map((img) => ({ ...img, isCover: img.id === imageId })));
    } catch {
      setFeedback({ type: 'error', text: 'Could not update cover photo.' });
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!propertyId) return;
    try {
      await apiFetch(`/properties/${propertyId}/images/${imageId}`, { method: 'DELETE' });
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch {
      setFeedback({ type: 'error', text: 'Could not delete image.' });
    }
  };

  const handleDeleteListing = async () => {
    if (!propertyId || deleting) return;
    setDeleting(true);
    setFeedback(null);
    try {
      await apiFetch(`/properties/${propertyId}`, { method: 'DELETE' });
      onDeleted?.(propertyId);
      onClose();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Could not delete property listing.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const statusMeta = editingProperty
    ? PUBLICATION_STATUS_META[editingProperty.publicationStatus]
    : null;

  return (
    <AccessibleModal
      open={open}
      onClose={onClose}
      title={editingProperty ? 'Edit Property Listing' : 'Add Free Property Listing'}
      subtitle="Save a draft in your account and submit for team review before public listing."
      maxWidthClass="max-w-4xl"
      fullScreenMobile
    >
      <form onSubmit={handleSaveDraft} className="space-y-6">
        {statusMeta && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D3DDD0] bg-[#EEF1E8] px-4 py-3">
            <span className="text-[14px] font-bold text-[#1F3229]">
              Current Status:{' '}
              <span
                className={`ml-1 inline-flex rounded-full border px-3 py-0.5 text-[14px] ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
            </span>
            {editingProperty?.publicationStatus === 'PUBLISHED' && (
              <span className="text-[14px] text-[#8A4A18] font-bold">
                Editing a published listing returns it to review before updates appear publicly.
              </span>
            )}
          </div>
        )}

        {editingProperty?.adminReviewNote && (
          <div className="rounded-2xl border border-[#D8B490] bg-[#FDF3E7] px-4 py-3 text-[14px] text-[#8A4A18]">
            <strong>Reviewer note:</strong> {editingProperty.adminReviewNote}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="listing-title" className="block mb-1.5 text-[14px] font-bold">
              Property Title*
            </label>
            <input
              id="listing-title"
              type="text"
              required
              minLength={4}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Green Meadow Corner Plot"
              className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white px-4 text-[16px]"
            />
          </div>

          <div>
            <label htmlFor="listing-purpose" className="block mb-1.5 text-[14px] font-bold">
              Listing Purpose*
            </label>
            <select
              id="listing-purpose"
              value={listingPurpose}
              onChange={(e) => setListingPurpose(e.target.value as ListingPurpose)}
              className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white px-4 text-[16px]"
            >
              <option value="SALE">For Sale</option>
              <option value="RENT">For Rent</option>
            </select>
          </div>

          <div>
            <label htmlFor="listing-type" className="block mb-1.5 text-[14px] font-bold">
              Property Type*
            </label>
            <select
              id="listing-type"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as PropertyType)}
              className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white px-4 text-[16px]"
            >
              {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((key) => (
                <option key={key} value={key}>
                  {PROPERTY_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="listing-locality" className="block mb-1.5 text-[14px] font-bold">
              Area / Locality*
            </label>
            <input
              id="listing-locality"
              type="text"
              required
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder="e.g. Othakadai"
              className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white px-4 text-[16px]"
            />
          </div>

          <div>
            <label htmlFor="listing-city" className="block mb-1.5 text-[14px] font-bold">
              City*
            </label>
            <input
              id="listing-city"
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white px-4 text-[16px]"
            />
          </div>

          <div>
            <label htmlFor="listing-price" className="block mb-1.5 text-[14px] font-bold">
              Asking Price (₹)*
            </label>
            <input
              id="listing-price"
              type="number"
              inputMode="numeric"
              min={1}
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 1250000"
              className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white px-4 text-[16px]"
            />
          </div>

          {listingPurpose === 'RENT' ? (
            <div>
              <label htmlFor="listing-rent-period" className="block mb-1.5 text-[14px] font-bold">
                Rent Period*
              </label>
              <select
                id="listing-rent-period"
                value={rentPeriod}
                onChange={(e) => setRentPeriod(e.target.value as RentPeriod)}
                className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white px-4 text-[16px]"
              >
                <option value="MONTHLY">Per Month</option>
                <option value="YEARLY">Per Year</option>
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="listing-postal" className="block mb-1.5 text-[14px] font-bold">
                Postal Code (Optional)
              </label>
              <input
                id="listing-postal"
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="e.g. 625107"
                className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white px-4 text-[16px]"
              />
            </div>
          )}

          <div>
            <label htmlFor="listing-area" className="block mb-1.5 text-[14px] font-bold">
              Total Area (sq.ft)*
            </label>
            <input
              id="listing-area"
              type="number"
              inputMode="numeric"
              min={50}
              required
              value={totalAreaSqFt}
              onChange={(e) => setTotalAreaSqFt(e.target.value)}
              placeholder="e.g. 1200"
              className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white px-4 text-[16px]"
            />
          </div>

          <div>
            <label htmlFor="listing-facing" className="block mb-1.5 text-[14px] font-bold">
              Facing Direction*
            </label>
            <select
              id="listing-facing"
              value={facingDirection}
              onChange={(e) => setFacingDirection(e.target.value as FacingDirection)}
              className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white px-4 text-[16px]"
            >
              {(Object.keys(FACING_LABELS) as FacingDirection[]).map((dir) => (
                <option key={dir} value={dir}>
                  {FACING_LABELS[dir]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="listing-road" className="block mb-1.5 text-[14px] font-bold">
              Road Width*
            </label>
            <input
              id="listing-road"
              type="text"
              required
              value={roadWidth}
              onChange={(e) => setRoadWidth(e.target.value)}
              placeholder="e.g. 30 ft blacktop road"
              className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white px-4 text-[16px]"
            />
          </div>

          <div>
            <label htmlFor="listing-landmark" className="block mb-1.5 text-[14px] font-bold">
              Nearby Landmark*
            </label>
            <input
              id="listing-landmark"
              type="text"
              required
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Near Ring Road Junction"
              className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white px-4 text-[16px]"
            />
          </div>

          <div>
            <label htmlFor="listing-approval" className="block mb-1.5 text-[14px] font-bold">
              Approval Status
            </label>
            <select
              id="listing-approval"
              value={approvalStatus}
              onChange={(e) =>
                setApprovalStatus(e.target.value as 'NOT_PROVIDED' | 'PENDING_VERIFICATION')
              }
              className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white px-4 text-[16px]"
            >
              <option value="NOT_PROVIDED">Not provided</option>
              <option value="PENDING_VERIFICATION">Submit reference for verification</option>
            </select>
          </div>

          <div>
            <label htmlFor="listing-approval-ref" className="block mb-1.5 text-[14px] font-bold">
              Approval / Document Reference (Optional)
            </label>
            <input
              id="listing-approval-ref"
              type="text"
              value={approvalReference}
              onChange={(e) => setApprovalReference(e.target.value)}
              placeholder="e.g. DTCP / Patta reference note"
              className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white px-4 text-[16px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="listing-description" className="block mb-1.5 text-[14px] font-bold">
              Property Description*
            </label>
            <textarea
              id="listing-description"
              required
              minLength={15}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe plot surroundings, soil, water access, road connectivity, and key highlights..."
              className="w-full rounded-2xl border border-[#D3DDD0] bg-white p-4 text-[16px]"
            />
          </div>
        </div>

        {/* Photo Upload Section */}
        <div className="rounded-2xl border border-[#D3DDD0] bg-[#EEF1E8]/60 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-[17px] font-bold text-[#1F3229] flex items-center gap-2">
                <ImagePlus className="h-5 w-5 text-[#245B45]" aria-hidden="true" />
                <span>Property Photographs &amp; Layout</span>
              </h3>
              <p className="text-[14px] text-[#666666]">
                Upload JPEG, PNG, or WebP images (up to 5 MB each). Save required fields first or
                upload directly after filling them above.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Image category"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as 'SITE_PHOTO' | 'LAYOUT')}
                className="min-h-[44px] rounded-full border border-[#D3DDD0] bg-white px-4 text-[14px] font-bold"
              >
                <option value="SITE_PHOTO">Site Photo</option>
                <option value="LAYOUT">Layout Diagram</option>
              </select>

              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-[#245B45] px-5 py-2 text-[14px] font-bold text-white hover:bg-[#173E2F]">
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative overflow-hidden rounded-2xl border border-[#D3DDD0] bg-white p-2 space-y-2"
                >
                  <div className="h-28 w-full overflow-hidden rounded-xl bg-[#EEF1E8]">
                    <SafeImage
                      src={img.thumbnailUrl || img.imageUrl}
                      alt={img.altText}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => void handleSetCover(img.id)}
                      className={`inline-flex min-h-[36px] items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold ${
                        img.isCover
                          ? 'bg-[#245B45] text-white'
                          : 'bg-[#EEF1E8] text-[#1F3229] hover:bg-[#E8EEE3]'
                      }`}
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{img.isCover ? 'Cover' : 'Set Cover'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeleteImage(img.id)}
                      aria-label="Remove image"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D3DDD0] text-[#8A4A18] hover:bg-[#FDF3E7]"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {feedback && (
          <p
            role="status"
            className={`rounded-2xl border px-4 py-3 text-[14px] sm:text-[16px] font-bold ${
              feedback.type === 'success'
                ? 'border-[#245B45] bg-[#EEF1E8] text-[#1F3229]'
                : 'border-[#D8B490] bg-[#FDF3E7] text-[#8A4A18]'
            }`}
          >
            {feedback.text}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || deleting}
            className="flex min-h-[52px] flex-1 items-center justify-center rounded-full border border-[#245B45] bg-white px-6 py-3 text-[16px] font-bold text-[#245B45] hover:bg-[#EEF1E8] disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            type="button"
            disabled={saving || deleting}
            onClick={() => void handleSubmitForReview()}
            className="flex min-h-[52px] flex-1 items-center justify-center rounded-full bg-[#245B45] px-6 py-3 text-[16px] font-bold text-white hover:bg-[#173E2F] disabled:opacity-60"
          >
            {saving ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>

        {propertyId && (
          <div className="border-t border-[#EEF1E8] pt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[14px] text-[#666666]">
              Want to remove this property permanently?
            </span>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDeleteListing()}
                  className="min-h-[44px] rounded-full bg-[#8A4A18] px-5 py-2 text-[14px] font-bold text-white disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="min-h-[44px] rounded-full border border-[#D3DDD0] px-4 py-2 text-[14px] font-bold text-[#1F3229]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D8B490] bg-[#FDF3E7] px-5 py-2 text-[14px] font-bold text-[#8A4A18]"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Delete Property</span>
              </button>
            )}
          </div>
        )}
      </form>
    </AccessibleModal>
  );
}
