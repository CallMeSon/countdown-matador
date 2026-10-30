'use client';

import { useEffect, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Bold, ChevronDown, Italic } from 'lucide-react';
import type { useLayoutEditor } from '@/hooks/useLayoutEditor';
import { timerStore } from '@/lib/timer-store';
import type { LayoutPage } from '@/lib/timer-store';
import { FONT_OPTIONS } from '@/lib/appearance';
import { LAYOUT_LIMITS } from '@/lib/layout';
import { DEFAULT_APPEARANCE } from '@/types/timer';
import type { AppearanceConfig, CustomTextBlock, ElementStyle, FontKey, TimerState } from '@/types/timer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { BUILTIN_KEYS } from './ElementList';

type Editor = ReturnType<typeof useLayoutEditor>;

const label = 'font-label text-[13px] font-medium uppercase tracking-[0.12em] text-sub';
const toggle = (on: boolean) =>
  `btn flex min-h-[44px] flex-1 items-center justify-center rounded-control border transition-colors ${
    on ? 'border-transparent bg-fg text-page' : 'border-line bg-input text-fg'
  }`;
const pct = (v: number, min: number, max: number) => `${((v - min) / (max - min)) * 100}%`;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));

/** Input angka dengan teks lokal (boleh kosong sementara), commit ke store bila valid. */
function NumberField({
  value,
  min,
  max,
  onCommit,
  ...rest
}: {
  value: number;
  min: number;
  max: number;
  onCommit: (v: number) => void;
  'aria-label': string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((t) => (Number(t) === value && t.trim() !== '' ? t : String(value)));
  }, [value]);
  return (
    <Field
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value.trim() !== '' && Number.isFinite(n)) onCommit(clamp(n, min, max));
      }}
      onBlur={() => setText(String(value))}
      className="w-full"
      {...rest}
    />
  );
}

function TextProperties({
  page,
  block,
  fontColor,
  fontFamily,
  editor,
  atMax,
}: {
  page: LayoutPage;
  block: CustomTextBlock;
  fontColor: string;
  fontFamily: string;
  editor: Editor;
  atMax: boolean;
}) {
  const [draft, setDraft] = useState(block.text);
  useEffect(() => {
    // Sinkron dari store (mis. pembaruan remote) tanpa menimpa draft yang sedang dikosongkan/diketik.
    setDraft((d) => (d.trim() === '' || d.trim() === block.text ? d : block.text));
  }, [block.text, block.id]);

  const update = (patch: Partial<Omit<CustomTextBlock, 'id'>>) =>
    editor.commit(() => timerStore.updateCustomText(page, block.id, patch), `${block.id}:${Object.keys(patch).join(',')}`);
  const bold = block.bold ?? true;
  const italic = block.italic ?? false;
  const align = block.align ?? 'center';
  const color = block.color ?? fontColor;
  const spacing = block.spacing ?? 0;

  const alignBtn = (a: 'left' | 'center' | 'right', name: string, Icon: typeof AlignLeft) => (
    <button type="button" aria-label={name} aria-pressed={align === a} className={toggle(align === a)} onClick={() => update({ align: a })}>
      <Icon size={18} />
    </button>
  );

  return (
    <div className="space-y-[18px]">
      <div className="space-y-2">
        <label htmlFor="prop-text" className={`block ${label}`}>Isi teks</label>
        <Field
          id="prop-text"
          maxLength={LAYOUT_LIMITS.TEXT_MAX}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value.trim()) update({ text: e.target.value });
          }}
          onBlur={() => setDraft(block.text)}
          className="w-full"
        />
      </div>

      <div>
        <p className={`mb-2 ${label}`}>Posisi</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-[15px] font-medium text-sub">
            X
            <NumberField aria-label="Posisi X" value={block.x} min={LAYOUT_LIMITS.X_MIN} max={LAYOUT_LIMITS.X_MAX} onCommit={(x) => update({ x })} />
          </label>
          <label className="flex items-center gap-2 text-[15px] font-medium text-sub">
            Y
            <NumberField aria-label="Posisi Y" value={block.y} min={LAYOUT_LIMITS.Y_MIN} max={LAYOUT_LIMITS.Y_MAX} onCommit={(y) => update({ y })} />
          </label>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label htmlFor="prop-size" className={label}>Ukuran</label>
          <span className="text-[15px] font-medium text-fg">{block.size} px</span>
        </div>
        <input
          id="prop-size"
          type="range"
          min={LAYOUT_LIMITS.SIZE_MIN}
          max={LAYOUT_LIMITS.SIZE_MAX}
          value={block.size}
          onChange={(e) => update({ size: Number(e.target.value) })}
          style={{ '--pct': pct(block.size, LAYOUT_LIMITS.SIZE_MIN, LAYOUT_LIMITS.SIZE_MAX) } as React.CSSProperties}
          className="m-range"
        />
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label htmlFor="prop-spacing" className={label}>Jarak huruf</label>
          <span className="text-[15px] font-medium text-fg">{spacing}</span>
        </div>
        <input
          id="prop-spacing"
          type="range"
          min={LAYOUT_LIMITS.SPACING_MIN}
          max={LAYOUT_LIMITS.SPACING_MAX}
          value={spacing}
          onChange={(e) => update({ spacing: Number(e.target.value) })}
          style={{ '--pct': pct(spacing, LAYOUT_LIMITS.SPACING_MIN, LAYOUT_LIMITS.SPACING_MAX) } as React.CSSProperties}
          className="m-range"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="prop-font" className={`block ${label}`}>Font</label>
        <div className="relative">
          <select
            id="prop-font"
            value={block.font ?? fontFamily}
            onChange={(e) => update({ font: e.target.value as CustomTextBlock['font'] })}
            className="min-h-[44px] w-full cursor-pointer appearance-none rounded-control border border-line bg-input pl-3.5 pr-10 text-[15px] text-fg"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sub" />
        </div>

        <div className="flex gap-2.5 pt-1">
          <button type="button" aria-label="Bold" aria-pressed={bold} className={toggle(bold)} onClick={() => update({ bold: !bold })}>
            <Bold size={18} />
          </button>
          <button type="button" aria-label="Italic" aria-pressed={italic} className={toggle(italic)} onClick={() => update({ italic: !italic })}>
            <Italic size={18} />
          </button>
          {alignBtn('left', 'Rata kiri', AlignLeft)}
          {alignBtn('center', 'Rata tengah', AlignCenter)}
          {alignBtn('right', 'Rata kanan', AlignRight)}
        </div>

        <label className="flex min-h-[44px] items-center justify-between rounded-control border border-line bg-input px-3.5 text-[15px] text-fg">
          Warna teks
          <span className="flex items-center gap-2.5">
            <span className="text-sm uppercase text-sub">{color}</span>
            <input
              type="color"
              aria-label="Warna teks"
              value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#ffffff'}
              onChange={(e) => update({ color: e.target.value })}
              className="h-6 w-9 cursor-pointer rounded-[3px] border border-line bg-transparent p-0"
            />
          </span>
        </label>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" className="min-h-[44px] flex-1 text-[17px]" disabled={atMax} onClick={() => editor.duplicateSelected()}>
          Duplikat
        </Button>
        <Button variant="danger" className="min-h-[44px] flex-1 text-[17px]" onClick={() => editor.removeSelected()}>
          Hapus teks
        </Button>
      </div>
    </div>
  );
}

/** Properti elemen bawaan: posisi terkunci, hanya tampilan (warna, font, gaya, ukuran) yang bisa diubah. */
function ElementProperties({
  page,
  elementKey,
  style,
  appearance,
  editor,
}: {
  page: LayoutPage;
  elementKey: string;
  style: ElementStyle | undefined;
  appearance: AppearanceConfig;
  editor: Editor;
}) {
  const update = (patch: Partial<ElementStyle>) =>
    editor.commit(
      () => timerStore.setElementStyle(page, elementKey, patch),
      `${elementKey}:${Object.keys(patch).join(',')}`,
    );
  const bold = style?.bold ?? true;
  const italic = style?.italic ?? false;
  const color = style?.color ?? appearance.fontColor;
  const size = style?.size ?? 100;
  const spacing = style?.spacing ?? 0;
  const timeLike = elementKey === 'digit' || elementKey === 'clock';

  return (
    <div className="space-y-[18px]">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label htmlFor="el-size" className={label}>Ukuran</label>
          <span className="text-[15px] font-medium text-fg">{size}%</span>
        </div>
        <input
          id="el-size"
          type="range"
          min={LAYOUT_LIMITS.ELEMENT_SIZE_MIN}
          max={LAYOUT_LIMITS.ELEMENT_SIZE_MAX}
          step={5}
          value={size}
          onChange={(e) => update({ size: Number(e.target.value) })}
          style={{ '--pct': pct(size, LAYOUT_LIMITS.ELEMENT_SIZE_MIN, LAYOUT_LIMITS.ELEMENT_SIZE_MAX) } as React.CSSProperties}
          className="m-range"
        />
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label htmlFor="el-spacing" className={label}>Jarak huruf</label>
          <span className="text-[15px] font-medium text-fg">{spacing}</span>
        </div>
        <input
          id="el-spacing"
          type="range"
          min={LAYOUT_LIMITS.SPACING_MIN}
          max={LAYOUT_LIMITS.SPACING_MAX}
          value={spacing}
          onChange={(e) => update({ spacing: Number(e.target.value) })}
          style={{ '--pct': pct(spacing, LAYOUT_LIMITS.SPACING_MIN, LAYOUT_LIMITS.SPACING_MAX) } as React.CSSProperties}
          className="m-range"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="el-font" className={`block ${label}`}>Font</label>
        <div className="relative">
          <select
            id="el-font"
            value={style?.font ?? appearance.fontFamily}
            onChange={(e) => update({ font: e.target.value as FontKey })}
            className="min-h-[44px] w-full cursor-pointer appearance-none rounded-control border border-line bg-input pl-3.5 pr-10 text-[15px] text-fg"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sub" />
        </div>

        <div className="flex gap-2.5 pt-1">
          <button type="button" aria-label="Bold" aria-pressed={bold} className={toggle(bold)} onClick={() => update({ bold: !bold })}>
            <Bold size={18} />
          </button>
          <button type="button" aria-label="Italic" aria-pressed={italic} className={toggle(italic)} onClick={() => update({ italic: !italic })}>
            <Italic size={18} />
          </button>
        </div>

        <label className="flex min-h-[44px] items-center justify-between rounded-control border border-line bg-input px-3.5 text-[15px] text-fg">
          Warna teks
          <span className="flex items-center gap-2.5">
            <span className="text-sm uppercase text-sub">{color}</span>
            <input
              type="color"
              aria-label="Warna teks"
              value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#ffffff'}
              onChange={(e) => update({ color: e.target.value })}
              className="h-6 w-9 cursor-pointer rounded-[3px] border border-line bg-transparent p-0"
            />
          </span>
        </label>
        {timeLike && (
          <p className="text-[12.5px] text-sub">
            Saat waktu hampir habis (kuning, merah) dan overtime, warna otomatis tetap dipakai.
          </p>
        )}
      </div>

      <Button variant="ghost" className="w-full" onClick={() => editor.commit(() => timerStore.resetElementStyle(page, elementKey))}>
        Kembalikan ke bawaan
      </Button>
    </div>
  );
}

export function PropertiesPanel({ page, state, editor }: { page: LayoutPage; state: TimerState; editor: Editor }) {
  const layout = page === 'timer' ? state.layoutTimer : state.layoutMatador;
  const texts = layout?.texts ?? [];
  const appearance = state.appearance ?? DEFAULT_APPEARANCE;
  const sel = editor.selection;
  const index = sel?.kind === 'text' ? texts.findIndex((t) => t.id === sel.id) : -1;
  const block = index >= 0 ? texts[index] : undefined;
  const builtinKey = sel?.kind === 'builtin' && BUILTIN_KEYS[page].includes(sel.key) ? sel.key : null;

  let chip = '';
  let body: React.ReactNode = (
    <p className="text-sm text-sub">Pilih elemen di kanvas atau daftar untuk mengubah propertinya.</p>
  );

  if (block) {
    chip = `TEKS ${index + 1}`;
    body = (
      <TextProperties
        key={block.id}
        page={page}
        block={block}
        fontColor={appearance.fontColor}
        fontFamily={appearance.fontFamily}
        editor={editor}
        atMax={texts.length >= LAYOUT_LIMITS.BLOCKS_MAX}
      />
    );
  } else if (builtinKey) {
    chip = builtinKey.toUpperCase();
    body = (
      <ElementProperties
        key={builtinKey}
        page={page}
        elementKey={builtinKey}
        style={layout?.styles?.[builtinKey]}
        appearance={appearance}
        editor={editor}
      />
    );
  }

  return (
    <Card className="!p-5 sm:!p-[26px]">
      <div className="mb-[18px] flex items-center justify-between">
        <h2 className="font-display text-[26px] font-light tracking-tight text-fg">Properti</h2>
        {chip && (
          <span className="rounded-[3px] bg-accent px-2 py-0.5 font-label text-[12.5px] font-medium tracking-wide text-on-accent">
            {chip}
          </span>
        )}
      </div>
      {body}
    </Card>
  );
}
