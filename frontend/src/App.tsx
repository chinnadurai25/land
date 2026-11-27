import { useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ListingFormModal } from './components/ListingFormModal';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { HomePage } from './pages/HomePage';
import type { PropertyItem } from './types';
import { toLocalitySlug } from './utils/seo';

function AppShell() {
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);
  const [listingRefreshNonce, setListingRefreshNonce] = useState(0);

  const handleOpenAddListing = () => {
    if (!user) {
      openAuthModal({
        notice: 'Please sign in or create an account to save and submit your property listing.',
        onAuthenticated: () => {
          setEditingProperty(null);
          setListingModalOpen(true);
        },
      });
      return;
    }
    setEditingProperty(null);
    setListingModalOpen(true);
  };

  const handleEditListing = (property: PropertyItem) => {
    setEditingProperty(property);
    setListingModalOpen(true);
  };

  const handleNavigateSection = (section: 'home' | 'buy' | 'rent' | 'contact') => {
    if (section === 'home') {
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'buy') {
      navigate('/buy-properties');
    } else if (section === 'rent') {
      navigate('/rent-properties');
    } else if (section === 'contact') {
      navigate('/contact');
    }
  };

  const handleSelectLocation = (locality: string) => {
    navigate(`/properties/${toLocalitySlug(locality)}`);
  };

  const homeProps = {
    onOpenNewListing: handleOpenAddListing,
    onEditListing: handleEditListing,
    onPropertyDeleted: () => setListingRefreshNonce((n) => n + 1),
    listingRefreshNonce,
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F5] text-[#1F3229]">
      <Header
        onNavigateSection={handleNavigateSection}
        onAddFreeListing={handleOpenAddListing}
      />

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage {...homeProps} />} />
          <Route
            path="/buy-properties"
            element={<HomePage {...homeProps} routePurpose="SALE" scrollToResults />}
          />
          <Route
            path="/buy-properties/:localitySlug"
            element={<HomePage {...homeProps} routePurpose="SALE" scrollToResults />}
          />
          <Route
            path="/rent-properties"
            element={<HomePage {...homeProps} routePurpose="RENT" scrollToResults />}
          />
          <Route
            path="/rent-properties/:localitySlug"
            element={<HomePage {...homeProps} routePurpose="RENT" scrollToResults />}
          />
          <Route
            path="/properties/:localitySlug"
            element={<HomePage {...homeProps} scrollToResults />}
          />
          <Route path="/property/:slug" element={<HomePage {...homeProps} />} />
          <Route path="/contact" element={<HomePage {...homeProps} scrollToContact />} />
          <Route
            path="/account"
            element={
              <AccountPage
                onOpenNewListing={handleOpenAddListing}
                onEditListing={handleEditListing}
                listingRefreshNonce={listingRefreshNonce}
              />
            }
          />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<HomePage {...homeProps} />} />
        </Routes>
      </div>

      <Footer
        onNavigateSection={handleNavigateSection}
        onSelectLocation={handleSelectLocation}
      />

      <ScrollToTopButton />
      <AuthModal />

      <ListingFormModal
        open={listingModalOpen}
        editingProperty={editingProperty}
        onClose={() => setListingModalOpen(false)}
        onSaved={() => {
          setListingRefreshNonce((n) => n + 1);
        }}
        onDeleted={() => {
          setListingRefreshNonce((n) => n + 1);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
