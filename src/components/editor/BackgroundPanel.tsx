'use client';

import { useEffect, useRef, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { timerStore } from '@/lib/timer-store';
import { GALLERY_BACKGROUNDS, sanitizeImageUrl } from '@/lib/appearance';
import { uploadImage } from '@/lib/upload';
import { DEFAULT_APPEARANCE } from '@/types/timer';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

const sectionTitle = 'font-label text-[13px] font-medium uppercase tracking-[0.12em] text-sub';

export function BackgroundPanel() {
  const { state } = useTimer();
  const appearance = state.appearance ?? DEFAULT_APPEARANCE;
  const [imageUrl, setImageUrl] = useState(appearance.bgImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setImageUrl(appearance.bgImage);
  }, [appearance.bgImage]);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      timerStore.setAppearance({ bgMode: 'image', bgImage: url });
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
        timerStore.setAppearance({ bgMode: mode });
      }}
      aria-pressed={appearance.bgMode === mode}
      className={`btn min-h-12 flex-1 rounded-control border px-4 py-3 font-medium tracking-wide ${
        appearance.bgMode === mode
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-line bg-control text-fg hover:border-fg/30'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <section>
        <h2 className={`mb-3 ${sectionTitle}`}>BACKGROUND</h2>
        <div className="mb-3 flex gap-3">
          {modeButton('color', 'WARNA')}
          {modeButton('image', 'GAMBAR')}
        </div>

        {appearance.bgMode === 'color' ? (
          <label className="flex items-center justify-between rounded-control border border-line bg-input px-4 py-3 text-sm font-semibold text-fg">
            Warna background
            <input
              type="color"
              aria-label="Warna background"
              value={appearance.bgColor}
              onChange={(e) => timerStore.setAppearance({ bgColor: e.target.value })}
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
              onBlur={() => timerStore.setAppearance({ bgImage: sanitizeImageUrl(imageUrl) })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') timerStore.setAppearance({ bgImage: sanitizeImageUrl(imageUrl) });
              }}
              placeholder="https://... atau /backgrounds/..."
              className="w-full text-sm"
            />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {GALLERY_BACKGROUNDS.map((path) => (
                <button
                  key={path}
                  aria-label={`Pilih background ${path}`}
                  aria-pressed={appearance.bgImage === path}
                  onClick={() => timerStore.setAppearance({ bgImage: path })}
                  className={`h-14 overflow-hidden rounded-control border-2 ${
                    appearance.bgImage === path ? 'border-accent' : 'border-line'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={path} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => timerStore.setAppearance({ bgImage: '' })}
              className="w-full text-sm tracking-wide"
            >
              KOSONGKAN GAMBAR
            </Button>
          </div>
        )}
      </section>

      <Button
        variant="ghost"
        onClick={() =>
          timerStore.setAppearance({
            bgMode: DEFAULT_APPEARANCE.bgMode,
            bgColor: DEFAULT_APPEARANCE.bgColor,
            bgImage: DEFAULT_APPEARANCE.bgImage,
          })
        }
        className="w-full tracking-wide"
      >
        RESET LATAR
      </Button>
    </div>
  );
}
