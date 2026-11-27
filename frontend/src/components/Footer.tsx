import { Mail, MapPin, Phone, Trees } from 'lucide-react';

interface FooterProps {
  onNavigateSection: (section: 'home' | 'buy' | 'rent' | 'contact') => void;
  onSelectLocation: (locality: string) => void;
}

const FOOTER_LOCATIONS = [
  'Othakadai',
  'Kadachanendhal',
  'Alanganallur',
  'Thirumangalam',
  'Melur',
];

export function Footer({ onNavigateSection, onSelectLocation }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const handleNav = (section: 'home' | 'buy' | 'rent' | 'contact') => {
    onNavigateSection(section);
  };

  const handleLoc = (locality: string) => {
    onSelectLocation(locality);
  };

  return (
    <footer className="mt-10 rounded-t-[32px] bg-[#183D2E] text-[#FAF9F5]">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 pt-12 pb-10 sm:pt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="lg:col-span-4 space-y-4">
            <div className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C8DC9F] text-[#183D2E]">
                <Trees className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-[22px] font-bold tracking-tight text-white">landnest.</span>
            </div>
            <p className="text-[16px] leading-relaxed text-[#E8EEE3]/90">
              A calm, nature-first real estate and land marketplace rooted in Madurai—helping
              families and builders find honest ground to grow.
            </p>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-[16px] font-bold uppercase tracking-wide text-[#C8DC9F]">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('home')}
                  className="min-h-[44px] py-1 text-left text-[16px] text-[#FAF9F5]/90 hover:text-[#C8DC9F] transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('buy')}
                  className="min-h-[44px] py-1 text-left text-[16px] text-[#FAF9F5]/90 hover:text-[#C8DC9F] transition-colors"
                >
                  Buy Properties
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('rent')}
                  className="min-h-[44px] py-1 text-left text-[16px] text-[#FAF9F5]/90 hover:text-[#C8DC9F] transition-colors"
                >
                  Rent Properties
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('contact')}
                  className="min-h-[44px] py-1 text-left text-[16px] text-[#FAF9F5]/90 hover:text-[#C8DC9F] transition-colors"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Popular Locations */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-[16px] font-bold uppercase tracking-wide text-[#C8DC9F]">
              Popular Locations
            </h3>
            <ul className="space-y-2">
              {FOOTER_LOCATIONS.map((loc) => (
                <li key={loc}>
                  <button
                    type="button"
                    onClick={() => handleLoc(loc)}
                    className="inline-flex min-h-[44px] items-center gap-2 py-1 text-left text-[16px] text-[#FAF9F5]/90 hover:text-[#C8DC9F] transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-[#C8DC9F] shrink-0" aria-hidden="true" />
                    <span>{loc}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-[16px] font-bold uppercase tracking-wide text-[#C8DC9F]">
              Contact Details
            </h3>
            <div className="space-y-3 text-[16px] text-[#FAF9F5]/90">
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#C8DC9F]" aria-hidden="true" />
                <span>Anna Nagar, Madurai, Tamil Nadu – 625020</span>
              </p>
              <a
                href="tel:+914522530100"
                className="flex min-h-[44px] items-center gap-2.5 hover:text-[#C8DC9F] transition-colors"
              >
                <Phone className="h-5 w-5 shrink-0 text-[#C8DC9F]" aria-hidden="true" />
                <span>+91 452 253 0100</span>
              </a>
              <a
                href="mailto:hello@landnest.in"
                className="flex min-h-[44px] items-center gap-2.5 break-all hover:text-[#C8DC9F] transition-colors"
              >
                <Mail className="h-5 w-5 shrink-0 text-[#C8DC9F]" aria-hidden="true" />
                <span>hello@landnest.in</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[#245B45] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[14px] text-[#E8EEE3]/80">
          <p>© {currentYear} landnest. Madurai Real Estate &amp; Land Marketplace.</p>
          <p>Sample demo properties are illustrative until independently verified.</p>
        </div>
      </div>
    </footer>
  );
}
