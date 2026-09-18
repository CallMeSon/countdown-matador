'use client';

import { useEffect, useState } from 'react';
import type { AppearanceConfig } from '@/types/timer';

/**
 * Lapisan background halaman display. Mode warna = solid; mode gambar = <img>
 * (bukan CSS url() inline) supaya URL dari user tidak bisa jadi CSS injection,
 * dengan bgColor sebagai fallback saat gambar gagal dimuat.
 */
export function StageBackground({ appearance }: { appearance: AppearanceConfig }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [appearance.bgImage]);

  const showImage = appearance.bgMode === 'image' && appearance.bgImage !== '' && !imageFailed;

  return (
    <div
      data-testid="stage-background"
      className="absolute inset-0"
      style={{ backgroundColor: appearance.bgColor }}
    >
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-testid="stage-background-image"
          src={appearance.bgImage}
          alt=""
          aria-hidden="true"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
