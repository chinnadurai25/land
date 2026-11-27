import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { SafeImage } from './SafeImage';

interface HeroProps {
  propertyCount: number;
  destinationCount: number;
  onFindNewLand: () => void;
}

export function Hero({ propertyCount, destinationCount, onFindNewLand }: HeroProps) {
  const shouldReduceMotion = useReducedMotion();

  const statsBlock = (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 pt-2">
      <div className="rounded-2xl bg-[#EEF1E8]/80 border border-[#D3DDD0] p-4 lg:bg-transparent lg:border-0 lg:p-0">
        <p className="text-[24px] sm:text-[26px] font-bold leading-tight text-[#245B45]">
          {propertyCount}+
        </p>
        <p className="mt-1 text-[14px] text-[#666666]">Curated properties</p>
      </div>
      <div className="rounded-2xl bg-[#EEF1E8]/80 border border-[#D3DDD0] p-4 lg:bg-transparent lg:border-0 lg:p-0">
        <p className="text-[24px] sm:text-[26px] font-bold leading-tight text-[#245B45]">
          {destinationCount}
        </p>
        <p className="mt-1 text-[14px] text-[#666666]">Local destinations</p>
      </div>
      <div className="col-span-2 sm:col-span-1 rounded-2xl bg-[#EEF1E8]/80 border border-[#D3DDD0] p-4 lg:bg-transparent lg:border-0 lg:p-0">
        <p className="text-[24px] sm:text-[26px] font-bold leading-tight text-[#245B45]">1:1</p>
        <p className="mt-1 text-[14px] text-[#666666]">Personal guidance</p>
      </div>
    </div>
  );

  const heroVisual = (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.7, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-[28px] lg:rounded-[40px] border border-[#D3DDD0] bg-[#EEF1E8] shadow-xl"
    >
      <div className="relative h-[260px] sm:h-[320px] lg:h-[540px] w-full">
        <SafeImage
          src="/images/hero-madurai.svg"
          alt="Lush green fields, coconut palms, and distant hills in the Madurai countryside"
          eager
          className="h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#183D2E]/35 via-transparent to-[#245B45]/10"
          aria-hidden="true"
        />
        <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
          <span className="inline-flex items-center rounded-full bg-[#FAF9F5]/92 px-4 py-2 text-[14px] font-bold text-[#1F3229] shadow-sm backdrop-blur-sm">
            Madurai &amp; Surrounding Green Corridors
          </span>
        </div>
      </div>
    </motion.div>
  );

  return (
    <section
      id="hero"
      className="relative bg-[#FAF9F5] pt-8 pb-8 sm:pt-12 sm:pb-12 lg:pt-16 lg:pb-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:items-center gap-8 lg:gap-12">
          {/* Left Content Column */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: 'easeOut' }}
            className="lg:col-span-6 space-y-6"
          >
            <div>
              <span className="inline-block rounded-full bg-[#EEF1E8] border border-[#D3DDD0] px-4 py-2 text-[14px] font-bold tracking-wide text-[#245B45]">
                ROOTED IN NATURE. BUILT FOR YOU.
              </span>
            </div>

            <h1 className="font-bold tracking-tight text-[#1F3229] leading-[1.12] text-[clamp(30px,4.2vw,58px)] break-words">
              A little land.
              <br />A world of{' '}
              <span className="relative inline-block text-[#245B45]">
                possibilities.
                <svg
                  viewBox="0 0 280 20"
                  fill="none"
                  aria-hidden="true"
                  className="absolute -bottom-2 left-0 w-full h-4 text-[#245B45]"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d="M4 14 C75 4, 195 3, 276 13"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray="1"
                    initial={{ strokeDashoffset: shouldReduceMotion ? 0 : 1 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.85,
                      delay: shouldReduceMotion ? 0 : 0.25,
                      ease: 'easeOut',
                    }}
                  />
                </svg>
              </span>
            </h1>

            <p className="max-w-xl text-[16px] sm:text-[17px] leading-relaxed text-[#666666]">
              Discover handpicked lands, plots, and properties in and around Madurai. The right
              place. The right price. A fresh start.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
              <button
                type="button"
                onClick={onFindNewLand}
                className="inline-flex min-h-[56px] w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#245B45] px-8 py-4 text-[16px] sm:text-[17px] font-bold text-white shadow-md transition hover:bg-[#173E2F] active:scale-[0.98]"
              >
                <span>Find New Land</span>
                <ArrowUpRight className="h-6 w-6" aria-hidden="true" />
              </button>

              <p className="inline-flex items-center justify-center sm:justify-start gap-2 text-[14px] sm:text-[16px] font-bold text-[#1F3229]">
                <ShieldCheck className="h-5 w-5 text-[#245B45] shrink-0" aria-hidden="true" />
                <span>Your trust. Our foundation.</span>
              </p>
            </div>

            {/* Mobile Image placed before statistics per mobile spec */}
            <div className="block lg:hidden pt-2">{heroVisual}</div>

            {/* Statistics */}
            {statsBlock}
          </motion.div>

          {/* Desktop Right Visual Column */}
          <div className="hidden lg:block lg:col-span-6">{heroVisual}</div>
        </div>
      </div>
    </section>
  );
}
