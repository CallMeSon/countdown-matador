'use client';

import { useEffect, useRef, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { timerStore } from '@/lib/timer-store';
import type { LayoutPage } from '@/lib/timer-store';
import { GALLERY_BACKGROUNDS, resolvePageBackground, sanitizeImageUrl } from '@/lib/appearance';
import { uploadImage } from '@/lib/upload';
import { DEFAULT_APPEARANCE } from '@/types/timer';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

const sectionTitle = 'font-label text-[13px] font-medium uppercase tracking-[0.12em] text-sub';

const PAGE_LABEL: Record<LayoutPage, string> = { timer: 'Layar Timer', matador: 'Layar Matador' };

// Latar yang diedit adalah latar halaman `page` (bukan global); nilai yang kosong tampil dari global.
export function BackgroundPanel({ page }: { page: LayoutPage }) {
  const { state } = useTimer();
  const appearance = state.appearance ?? DEFAULT_APPEARANCE;
  const bg = resolvePageBackground(page === 'timer' ? state.layoutTimer : state.layoutMatador, appearance);
  const [imageUrl, setImageUrl] = useState(bg.bgImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setImageUrl(bg.bgImage);
  }, [bg.bgImage]);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      timerStore.setPageBackground(page, { bgMode: 'image', bgImage: url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload gagal.');
    } finally {
      setUploading(false);
    }
  };

  const modeButton = (mode: 'color' | 'image', label: string) => (
    <button
      onClick={() => {
        setUploadError(null);
        timerStore.setPageBackground(page, { bgMode: mode });
      }}
      aria-pressed={bg.bgMode === mode}
      className={`btn min-h-12 flex-1 rounded-control border px-4 py-3 font-medium tracking-wide ${
        bg.bgMode === mode
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-line bg-control text-fg hover:border-fg/30'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-sub">
        Latar untuk <span className="font-semibold text-fg">{PAGE_LABEL[page]}</span>
      </p>
      <section>
        <h2 className={`mb-3 ${sectionTitle}`}>BACKGROUND</h2>
        <div className="mb-3 flex gap-3">
          {modeButton('color', 'WARNA')}
          {modeButton('image', 'GAMBAR')}
        </div>

        {bg.bgMode === 'color' ? (
          <label className="flex items-center justify-between rounded-control border border-line bg-input px-4 py-3 text-sm font-semibold text-fg">
            Warna background
            <input
              type="color"
              aria-label="Warna background"
              value={bg.bgColor}
              onChange={(e) => timerStore.setPageBackground(page, { bgColor: e.target.value })}
              className="h-10 w-14 rounded"
            />
          </label>
        ) : (
          <div className="space-y-3">
            <Button
              variant="accent"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full tracking-wide"
            >
              {uploading ? 'MENGUNGGAH…' : 'UPLOAD GAMBAR'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              aria-label="Upload gambar"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                handleUpload(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {uploadError && (
              <p role="alert" className="text-sm text-danger">
                {uploadError}
              </p>
            )}
            <Field
              aria-label="URL gambar"
              value={imageUrl}
              onChange={(e) => {
                setUploadError(null);
                setImageUrl(e.target.value);
              }}
              onBlur={() => timerStore.setPageBackground(page, { bgImage: sanitizeImageUrl(imageUrl) })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') timerStore.setPageBackground(page, { bgImage: sanitizeImageUrl(imageUrl) });
              }}
              placeholder="https://... atau /backgrounds/..."
              className="w-full text-sm"
            />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {GALLERY_BACKGROUNDS.map((path) => (
                <button
                  key={path}
                  aria-label={`Pilih background ${path}`}
                  aria-pressed={bg.bgImage === path}
                  onClick={() => timerStore.setPageBackground(page, { bgImage: path })}
                  className={`h-14 overflow-hidden rounded-control border-2 ${
                    bg.bgImage === path ? 'border-accent' : 'border-line'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={path} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => timerStore.setPageBackground(page, { bgImage: '' })}
              className="w-full text-sm tracking-wide"
            >
              KOSONGKAN GAMBAR
            </Button>
          </div>
        )}
      </section>

      <Button
        variant="ghost"
        onClick={() => timerStore.resetPageBackground(page)}
        className="w-full tracking-wide"
      >
        RESET LATAR
      </Button>
    </div>
  );
}
