import { Compass, Handshake, ShieldCheck } from 'lucide-react';

const PILLARS = [
  {
    icon: ShieldCheck,
    title: 'A foundation of trust',
    description: 'Transparent details. No hidden surprises.',
  },
  {
    icon: Compass,
    title: 'Local roots. Better choices.',
    description: 'Handpicked locations with real potential.',
  },
  {
    icon: Handshake,
    title: 'With you, all the way',
    description: 'From your first search to your fresh start.',
  },
];

export function TrustSection() {
  return (
    <section aria-labelledby="trust-heading" className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="rounded-[32px] border border-[#D3DDD0] bg-[#EEF1E8] px-6 py-10 sm:px-10 sm:py-14">
        <div className="max-w-2xl mb-8 sm:mb-10">
          <p className="text-[14px] font-bold tracking-wide text-[#245B45] uppercase">
            WHY LANDNEST
          </p>
          <h2
            id="trust-heading"
            className="mt-2 text-[26px] sm:text-[34px] lg:text-[36px] font-bold leading-tight text-[#1F3229]"
          >
            Built on clarity and local care.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="rounded-[24px] border border-[#D3DDD0] bg-[#FAF9F5] p-6 sm:p-7 shadow-sm"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8EEE3] text-[#245B45]">
                  <Icon className="h-8 w-8" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-[19px] sm:text-[20px] font-bold text-[#1F3229]">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-[16px] sm:text-[17px] leading-relaxed text-[#666666]">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
