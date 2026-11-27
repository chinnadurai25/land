import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 360);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      style={{
        bottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
      }}
      className="fixed right-4 sm:right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#245B45] text-white shadow-lg ring-2 ring-[#FAF9F5] transition hover:bg-[#173E2F] active:scale-95"
    >
      <ArrowUp className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}
