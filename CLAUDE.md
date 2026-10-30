# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — runs the WS/upload relay (`server/ws-server.js`, port 8081) together with `next dev` via `scripts/dev.mjs`. Extra args go to Next, e.g. `npm run dev -- -p 3099`. Use `dev:next` only if you do not need the relay.
- `npm test` — Vitest (jsdom) for `src/__tests__`. Single file: `npx vitest run src/__tests__/timer-store.test.ts`; single test: add `-t "name"`. `npm run test:watch` for watch mode.
- `npm run test:server` — Node's built-in test runner for `server/*.test.js` (relay, upload handler).
- `npm run lint`, `npm run typecheck`, `npm run build`.

## Architecture

Event countdown system with three pages sharing one timer state per **room** (code from `src/lib/room-code.ts`):

- `/control` — operator panel (`src/app/control/page.tsx`, large single file). Starts with a room gate, then controls timer and stage messages; links to `/layar` for appearance and layout.
- `/timer` and `/matador` — display screens meant for other monitors; they read state only. Stage-nya ada di `src/components/stage/` dan dipakai juga oleh editor `/layar`.
- `/layar` — editor layar (real-time lewat `timerStore`): elemen bawaan (digit, label, ticker, jam) posisinya terkunci dan hanya gayanya yang bisa diubah (warna, font, tebal/miring, jarak huruf, ukuran, sembunyikan); teks tambahan bisa digeser dan di-resize langsung di preview stage. Tab Latar hanya untuk background. Logika di `src/hooks/useLayoutEditor.ts`, komponen di `src/components/editor/`.
- `/` just redirects to `/control`.

### State sync

- The server never computes timer state. `server/ws-server.js` (plain CommonJS, no build step) stores the last full `TimerState` per room, fans it out to other clients in that room, persists to `server/state.json`, and prunes rooms older than 7 days. It also serves `POST /upload` for background images (saved into `public/uploads`, pruned by age).
- `src/lib/timer-store.ts` is the client singleton. It connects over WebSocket (reconnect with backoff) and also uses `BroadcastChannel` as a same-browser fallback when the relay is down. `useTimer` / `useRoom` expose it to components.
- Timer state is timestamp-based (`startedAt`, `pausedRemaining`, `duration`), so displays derive remaining time locally. `src/lib/timer-phase.ts` maps it to phases (running, overtime, and so on).
- Incoming state is normalized with `mergeIncomingState` (`src/lib/appearance.ts`), so older or partial state from the relay still works. `DEFAULT_TIMER_STATE` is duplicated in `server/ws-server.js` and `src/types/timer.ts`. Change both.
- `NEXT_PUBLIC_WS_URL` overrides the WebSocket URL. The default is same-origin `/ws`.
- Relay limits: WS messages max 64 KiB, room id `[A-Za-z0-9_-]{1,32}`, max rooms `MAX_ROOMS` (500), uploads capped by `MAX_UPLOAD_BYTES` (8 MiB each), `MAX_UPLOAD_DIR_BYTES` (512 MiB total), 4 concurrent. Every STATE message is filtered by `normalizeState` (`server/layout-style.js`).
- Access control is only the room code (no accounts). Keep codes random (5 chars); avoid short custom codes. Per-IP rate limits belong in nginx: `limit_req` on `/ws` and `/upload`, `client_max_body_size 8m`. The relay needs Node >= 18.

### Build and deploy

- Production build uses `output: 'export'` (static site in `out/`, `trailingSlash: true`), set only when `NODE_ENV=production` in `next.config.mjs`. In dev, `/upload` is proxied to the relay by a rewrite. In production, `/ws` and `/upload` must be routed to the relay by a reverse proxy (nginx). Static export ignores rewrites.
- `netlify.toml` publishes `out/`.

### Display layout

- Displays render a fixed 1920×1080 stage scaled to the viewport (`useStageScale`, `.timer-container` container queries in `globals.css`). Sizing uses `cqw`/`cqh`, not viewport units.
- Per-page layout (`layoutTimer`, `layoutMatador` in state) = `styles` (gaya per elemen bawaan, key `digit`/`label`/`ticker`/`clock`, dipakai lewat `resolveElementStyle` di `src/lib/element-style.ts`) + `texts` (teks tambahan, dirender `LayoutOverlay`). Diedit di `/layar` (`useLayoutEditor` + `src/components/editor/`). Helpers dan batas ada di `src/lib/layout.ts`; aturan validasi satu-satunya ada di `server/layout-style.js` (CommonJS, dipakai relay dan diimpor `src/lib/layout.ts`). Field `offsets` lama diabaikan.
- Appearance (background, font, colors) is part of the synced state. Fonts load through a Google Fonts `@import` in `globals.css`, and font classes are `.app-font-*`.

## Conventions

- UI copy and code comments are mostly Indonesian, mixed with English button labels. Follow the surrounding text.
- Styling: Tailwind 3 dengan warna semantik (`page`, `card`, `fg`, `sub`, `accent`, ...) dari `src/styles/tokens.css`; mode terang/gelap via `data-theme` (`src/lib/theme.ts`, `ThemeSwitch`). Komponen UI bersama di `src/components/ui/`. Detail di `DESIGN.md`. Animasi UI di `src/styles/motion.css`.
- Specs and plans for past features are in `docs/superpowers/`.
- `tsconfig`/Next use the `@/*` alias for `src/*`. The relay in `server/` cannot use it.
