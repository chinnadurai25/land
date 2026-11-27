import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AccessibleModal } from '../components/AccessibleModal';
import { SearchSection } from '../components/SearchSection';
import { formatINR, formatPropertyPrice } from '../utils/format';
import { buildListingPath, fromLocalitySlug, toLocalitySlug } from '../utils/seo';

describe('Landnest formatting and accessible UI behavior', () => {
  it('builds clean SEO-friendly URLs for buy, rent, and locations', () => {
    expect(toLocalitySlug('Anna Nagar')).toBe('anna-nagar');
    expect(fromLocalitySlug('anna-nagar')).toBe('Anna Nagar');
    expect(buildListingPath({ purpose: 'RENT' })).toBe('/rent-properties');
    expect(buildListingPath({ purpose: 'RENT', location: 'Othakadai' })).toBe(
      '/rent-properties/othakadai'
    );
    expect(buildListingPath({ purpose: 'SALE', location: 'Kadachanendhal' })).toBe(
      '/buy-properties/kadachanendhal'
    );
  });

  it('formats Indian Rupee prices accurately for sale and rent', () => {
    expect(formatINR(750000)).toBe('₹7,50,000');
    expect(formatPropertyPrice(18000, 'RENT', 'MONTHLY')).toBe('₹18,000/month');
  });

  it('validates that minimum price cannot exceed maximum price in search', () => {
    const onSearch = vi.fn();
    const ref = { current: null };
    render(
      <SearchSection
        filters={{
          purpose: 'SALE',
          type: '',
          location: '',
          minPrice: '',
          maxPrice: '',
          featuredOnly: false,
          sort: 'newest',
          page: 1,
        }}
        locations={[]}
        highlighted={false}
        locationInputRef={ref}
        onSearch={onSearch}
        onPopularLocationClick={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Price From/i), { target: { value: '2000000' } });
    fireEvent.change(screen.getByLabelText(/Price To/i), { target: { value: '500000' } });
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/Minimum price cannot exceed maximum price/i);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('supports Escape key closing on AccessibleModal', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <AccessibleModal open={true} onClose={onClose} title="Test Dialog">
          <button type="button">Inside Action</button>
        </AccessibleModal>
      </MemoryRouter>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
