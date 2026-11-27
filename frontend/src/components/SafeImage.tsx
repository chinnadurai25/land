import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}

export function SafeImage({ src, alt, className = '', eager = false }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-[#EEF1E8] text-[#245B45] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="h-10 w-10 opacity-80" aria-hidden="true" />
        <span className="text-[14px] font-medium text-[#1F3229]">
          Property photograph unavailable
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
