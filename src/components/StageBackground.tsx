'use client';

import { useEffect, useState } from 'react';
import type { BackgroundConfig } from '@/types/timer';

/**
 * Lapisan background halaman display. Mode warna = solid; mode gambar = <img>
 * (bukan CSS url() inline) supaya URL dari user tidak bisa jadi CSS injection,
 * dengan bgColor sebagai fallback saat gambar gagal dimuat.
 */
export function StageBackground({ background }: { background: BackgroundConfig }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [background.bgImage]);

  const showImage = background.bgMode === 'image' && background.bgImage !== '' && !imageFailed;

  return (
    <div
      data-testid="stage-background"
      className="absolute inset-0"
      style={{ backgroundColor: background.bgColor }}
    >
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-testid="stage-background-image"
          src={background.bgImage}
          alt=""
          aria-hidden="true"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
