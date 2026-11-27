import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Phone,
  Plus,
  ShieldCheck,
  Trees,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onNavigateSection: (section: 'home' | 'buy' | 'rent' | 'contact') => void;
  onAddFreeListing: () => void;
}

export function Header({ onNavigateSection, onAddFreeListing }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, openAuthModal, logout } = useAuth();
  const navigate = useNavigate();

  const handleNavClick = (target: 'home' | 'buy' | 'rent' | 'contact') => {
    setMobileMenuOpen(false);
    onNavigateSection(target);
  };

  const handleAccountAction = () => {
    setMobileMenuOpen(false);
    if (!user) {
      openAuthModal();
      return;
    }
    navigate('/account');
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Slim Sage Info Bar (Desktop >= 1024px) */}
      <div className="hidden lg:block bg-[#EEF1E8] border-b border-[#D3DDD0] text-[#1F3229]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-2 text-[14px]">
          <p className="font-medium">Your next chapter begins in Madurai.</p>
          <div className="flex items-center gap-6">
            <a
              href="mailto:hello@landnest.in"
              className="inline-flex items-center gap-2 hover:text-[#245B45] transition-colors"
            >
              <Mail className="h-4 w-4 text-[#245B45]" aria-hidden="true" />
              <span>hello@landnest.in</span>
            </a>
            <a
              href="tel:+914522530100"
              className="inline-flex items-center gap-2 hover:text-[#245B45] transition-colors"
            >
              <Phone className="h-4 w-4 text-[#245B45]" aria-hidden="true" />
              <span>+91 452 253 0100</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Sticky Warm-Ivory Navigation Bar */}
      <div className="border-b border-[#D3DDD0] bg-[#FAF9F5]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:py-3.5">
          {/* Logo */}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex items-center gap-3 shrink-0 rounded-full py-1 pr-2"
            aria-label="Landnest home"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#245B45] text-white shadow-sm">
              <Trees className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="text-[20px] sm:text-[22px] font-bold tracking-tight text-[#1F3229]">
              landnest.
            </span>
          </Link>

          {/* Desktop Navigation Links (>= 1024px) */}
          <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-6 xl:gap-8">
            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className="min-h-[44px] px-1 text-[17px] font-medium text-[#1F3229] hover:text-[#245B45] transition-colors whitespace-nowrap"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('buy')}
              className="min-h-[44px] px-1 text-[17px] font-medium text-[#1F3229] hover:text-[#245B45] transition-colors whitespace-nowrap"
            >
              Buy Properties
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('rent')}
              className="min-h-[44px] px-1 text-[17px] font-medium text-[#1F3229] hover:text-[#245B45] transition-colors whitespace-nowrap"
            >
              Rent Properties
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('contact')}
              className="min-h-[44px] px-1 text-[17px] font-medium text-[#1F3229] hover:text-[#245B45] transition-colors whitespace-nowrap"
            >
              Contact Us
            </button>
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/account"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D3DDD0] bg-white px-4 py-2 text-[14px] font-bold text-[#1F3229] hover:bg-[#EEF1E8] transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#245B45]" aria-hidden="true" />
                  <span className="max-w-[120px] truncate">{user.fullName.split(' ')[0]}</span>
                </Link>
                {user.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#245B45]/30 bg-[#EEF1E8] px-4 py-2 text-[14px] font-bold text-[#245B45] hover:bg-[#E8EEE3] transition-colors"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    <span>Admin</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => void logout()}
                  aria-label="Sign out"
                  title="Sign out"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D3DDD0] bg-white text-[#1F3229] hover:bg-[#EEF1E8] transition-colors"
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal()}
                aria-label="Login or Register"
                title="Login or Register"
                className="inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-full border border-[#D3DDD0] bg-white px-3.5 text-[#1F3229] hover:bg-[#EEF1E8] transition-colors"
              >
                <UserIcon className="h-5 w-5 text-[#245B45]" aria-hidden="true" />
                <span className="text-[14px] font-bold">Sign In</span>
              </button>
            )}

            <button
              type="button"
              onClick={onAddFreeListing}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-full bg-[#245B45] px-5 py-2.5 text-[16px] xl:text-[17px] font-bold text-white shadow-sm transition hover:bg-[#173E2F] active:scale-[0.98] whitespace-nowrap"
            >
              <span>Add Free Listing</span>
              <Plus className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Mobile & Tablet Compact Controls (<1024px) */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={handleAccountAction}
              aria-label={user ? 'My Account' : 'Login or Register'}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D3DDD0] bg-white text-[#1F3229] hover:bg-[#EEF1E8] transition-colors"
            >
              <UserIcon className="h-5 w-5 text-[#245B45]" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-menu"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D3DDD0] bg-[#EEF1E8] text-[#1F3229] hover:bg-[#E8EEE3] transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Menu */}
        {mobileMenuOpen && (
          <nav
            id="mobile-navigation-menu"
            aria-label="Mobile navigation"
            className="lg:hidden border-t border-[#D3DDD0] bg-[#FAF9F5] px-4 py-4 space-y-2"
          >
            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className="flex min-h-[48px] w-full items-center rounded-2xl px-4 py-3 text-left text-[16px] font-bold text-[#1F3229] hover:bg-[#EEF1E8]"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('buy')}
              className="flex min-h-[48px] w-full items-center rounded-2xl px-4 py-3 text-left text-[16px] font-bold text-[#1F3229] hover:bg-[#EEF1E8]"
            >
              Buy Properties
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('rent')}
              className="flex min-h-[48px] w-full items-center rounded-2xl px-4 py-3 text-left text-[16px] font-bold text-[#1F3229] hover:bg-[#EEF1E8]"
            >
              Rent Properties
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('contact')}
              className="flex min-h-[48px] w-full items-center rounded-2xl px-4 py-3 text-left text-[16px] font-bold text-[#1F3229] hover:bg-[#EEF1E8]"
            >
              Contact Us
            </button>

            {user && (
              <>
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[48px] w-full items-center gap-2 rounded-2xl px-4 py-3 text-[16px] font-bold text-[#245B45] hover:bg-[#EEF1E8]"
                >
                  <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
                  <span>My Account</span>
                </Link>
                {user.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[48px] w-full items-center gap-2 rounded-2xl px-4 py-3 text-[16px] font-bold text-[#245B45] hover:bg-[#EEF1E8]"
                  >
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}
              </>
            )}

            <div className="pt-2 space-y-2 border-t border-[#D3DDD0]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onAddFreeListing();
                }}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#245B45] px-5 py-3 text-[16px] font-bold text-white hover:bg-[#173E2F]"
              >
                <span>Add Free Listing</span>
                <Plus className="h-5 w-5" aria-hidden="true" />
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void logout();
                  }}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-[#D3DDD0] bg-white px-5 py-3 text-[16px] font-bold text-[#1F3229] hover:bg-[#EEF1E8]"
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal();
                  }}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-[#D3DDD0] bg-white px-5 py-3 text-[16px] font-bold text-[#1F3229] hover:bg-[#EEF1E8]"
                >
                  <UserIcon className="h-5 w-5 text-[#245B45]" aria-hidden="true" />
                  <span>Login / Register</span>
                </button>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
