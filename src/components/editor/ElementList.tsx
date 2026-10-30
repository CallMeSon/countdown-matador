'use client';

import { Eye, EyeOff, Megaphone, Tag, Timer, Type, type LucideIcon } from 'lucide-react';
import type { useLayoutEditor } from '@/hooks/useLayoutEditor';
import type { LayoutPage } from '@/lib/timer-store';
import { timerStore } from '@/lib/timer-store';
import { LAYOUT_LIMITS } from '@/lib/layout';
import { BUILTIN_LABELS } from '@/lib/layout-base';
import type { TimerState } from '@/types/timer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type Editor = ReturnType<typeof useLayoutEditor>;

export const BUILTIN_KEYS: Record<LayoutPage, string[]> = {
  timer: ['digit'],
  matador: ['label', 'ticker', 'clock'],
};

const BUILTIN_NAMES: Record<string, string> = { digit: 'Digit timer', clock: 'Jam' };
const BUILTIN_ICONS: Record<string, LucideIcon> = { digit: Timer, clock: Timer, label: Tag, ticker: Megaphone };
const BUILTIN_HINTS: Record<string, string> = { label: 'COUNTDOWN TIMER', ticker: 'Pesan ke panggung' };
const builtinName = (key: string): string => {
  if (BUILTIN_NAMES[key]) return BUILTIN_NAMES[key];
  const raw = BUILTIN_LABELS[key] ?? key;
  return raw.charAt(0) + raw.slice(1).toLowerCase();
};

const rowBase = 'flex min-h-[52px] items-center gap-3 rounded-control px-3.5 text-left transition-colors';

export function ElementList({
  page,
  state,
  editor,
  digitTime,
}: {
  page: LayoutPage;
  state: TimerState;
  editor: Editor;
  digitTime: string;
}) {
  const layout = page === 'timer' ? state.layoutTimer : state.layoutMatador;
  const texts = layout?.texts ?? [];
  const full = texts.length >= LAYOUT_LIMITS.BLOCKS_MAX;
  const sel = editor.selection;

  const rowClass = (active: boolean) =>
    `m-row ${rowBase} ${active ? 'border-2 border-accent bg-control' : 'border border-line bg-input hover:border-fg/30'}`;

  return (
    <Card className="!p-5 sm:!p-[26px]">
      <div className="mb-[18px] flex items-center justify-between">
        <h2 className="font-display text-[26px] font-light tracking-tight text-fg">Elemen</h2>
        <span className="text-[13px] text-sub">
          {texts.length} / {LAYOUT_LIMITS.BLOCKS_MAX} teks
        </span>
      </div>

      <ul className="space-y-3">
        {BUILTIN_KEYS[page].map((key) => {
          const active = sel?.kind === 'builtin' && sel.key === key;
          const hidden = !!layout?.styles?.[key]?.hidden;
          const Icon = BUILTIN_ICONS[key] ?? Timer;
          const hint = key === 'digit' || key === 'clock' ? digitTime : BUILTIN_HINTS[key];
          return (
            <li key={key} className={`${rowClass(active)} ${hidden ? 'opacity-60' : ''}`}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => editor.select({ kind: 'builtin', key })}
                className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 text-left"
              >
                <Icon size={18} className={`shrink-0 ${active ? 'text-accent' : 'text-sub'}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium text-fg">{builtinName(key)}</span>
                  {hint && <span className="block truncate text-[12.5px] text-sub">{hint}</span>}
                </span>
              </button>
              <button
                type="button"
                aria-label={hidden ? `Tampilkan ${builtinName(key)}` : `Sembunyikan ${builtinName(key)}`}
                aria-pressed={!hidden}
                onClick={() => editor.commit(() => timerStore.setElementStyle(page, key, { hidden: hidden ? undefined : true }))}
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-sub hover:text-fg"
              >
                {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </li>
          );
        })}

        {texts.map((t, i) => {
          const active = sel?.kind === 'text' && sel.id === t.id;
          return (
            <li key={t.id} className={`${rowClass(active)} ${t.hidden ? 'opacity-60' : ''}`}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => editor.select({ kind: 'text', id: t.id })}
                className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 text-left"
              >
                <Type size={18} className={`shrink-0 ${active ? 'text-accent' : 'text-sub'}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium text-fg">Teks {i + 1}</span>
                  <span className="block truncate text-[12.5px] text-sub">{t.text}</span>
                </span>
              </button>
              <button
                type="button"
                aria-label={t.hidden ? 'Tampilkan' : 'Sembunyikan'}
                aria-pressed={!t.hidden}
                onClick={() => editor.commit(() => timerStore.updateCustomText(page, t.id, { hidden: !t.hidden }))}
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-sub hover:text-fg"
              >
                {t.hidden ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </li>
          );
        })}
      </ul>

      <Button
        variant="accent"
        disabled={full}
        aria-describedby={full ? 'tambah-teks-hint' : undefined}
        onClick={() => editor.addText()}
        className="mt-[18px] min-h-12 w-full text-[17px]"
      >
        + Tambah teks
      </Button>
      {full && (
        <p id="tambah-teks-hint" className="mt-2 text-sm text-sub">
          Maksimal {LAYOUT_LIMITS.BLOCKS_MAX} teks
        </p>
      )}
    </Card>
  );
}
