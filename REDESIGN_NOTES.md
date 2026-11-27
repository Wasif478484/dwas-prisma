# DWAS UI redesign — notes

Design direction: "Paper & Pine" (see DESIGN.md for tokens and rationale).

## What changed
- Design tokens: `src/app/globals.css` (brand pine, ink neutrals, saffron accent, motion utilities).
- Palette rename: every `teal-*` class is now `brand-*` and every `stone-*` class is `ink-*`.
  No logic, data or i18n keys were changed.
- Fonts: `src/app/layout.tsx` (Bricolage Grotesque for headlines, Inter, Noto Naskh Arabic).
- App shell: `src/app/page.tsx` (frosted top bar, icon-only controls on phones, pine footer).
- Landing: `src/components/dwas/Landing.tsx` (animated voice demo, trade marquee,
  feature bento, four-step timeline, closing band). Same entry buttons and login wiring.
- Client home: `src/components/dwas/client/ClientHome.tsx` (markup only; dictation and
  intake logic unchanged).
- Shared primitives: `src/components/dwas/shared.tsx`, `src/components/ui/button.tsx`.

## Verified
- Landing and client home render in Chromium at 390px and 1366px, with no console errors
  and no horizontal overflow at 390px.
- TypeScript: no new errors. The 29 remaining errors predate this work and come from the
  Prisma client not being generated (engine download blocked in the build sandbox).

## Round 2: remaining screens
- All screens now share one page width (max-w-2xl), one heading style (display font), one
  card surface (`dw-card`, rounded-3xl) and one primary button colour (pine, hover deeper).
- Results: new card treatment with a pine initials badge, hover lift, and a pine quick-book CTA.
- The `dw-*` component classes live in `@layer components` so utility colours (for example
  the dashed "newcomer" border) still override them.
- Verified in Chromium: landing, client home, request confirmation (mobile). The tech
  screens, booking detail, history, and admin console need a database and login, so they
  were only type-checked, not rendered. Check them on a machine where the database runs.
- Layouts of tech, booking detail, history and admin keep their original structure. A
  full layout pass there is the next step.

## Lockfile warning
The archive contains both `package-lock.json` and `bun.lock`, and they resolve different
versions (for example Next 16.4.6 vs 16.1.3, React 19.3.1 vs 19.2.3). With the npm
versions, the app rendered a blank page in our test environment, including the original
code. With the bun.lock versions it renders correctly. Pick one lockfile and delete the
other.
