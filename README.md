# DWAS — Digital Work Appointment System

**Voice-first technician booking for Pakistan.** _"Boliye, mistri aa jayega."_

A person describes a household problem by voice in Urdu, Roman Urdu or English. DWAS works out
which trade is needed, ranks nearby admin-approved technicians, and books one. Technicians who
cannot read use the same system through big icons and spoken Urdu. Reviews are only allowed after a
completed booking, phone numbers stay hidden until a technician accepts, and price ranges come from
a rate table instead of an AI guess.

Built for fast, fair, voice-first local hiring in Pakistan.

---

## Demo accounts (mock OTP code: `123456`)

| Who               | Phone          | Role       |
| ----------------- | -------------- | ---------- |
| Ayesha Khan       | +923001234567  | client     |
| Rafiq Ahmad       | +923010000001  | technician |
| Sara (operator)   | +923009876543  | admin      |

Use the quick-login buttons on the "Demo login" dialog, or type any phone number with code
`123456`. **OTP is mocked** — it creates or opens a demo user; no real SMS is sent. All seeded
people carry `isSeed: true` and appear as "Demo data" in the UI.

Open the app with **`?demo=1`** for the floating demo panel (auto-accept, force AI off, force voice
off, S1 script, quick client/tech/admin navigation).

## Run locally

```bash
npm install
npx prisma generate
npx prisma db push --accept-data-loss   # create tables in Postgres
npx tsx scripts/seed.ts                  # seed areas, rate table, 24 technicians, 60 bookings, reviews
npm run dev                              # http://localhost:3000
```

- Reset demo data any time: the admin panel button, or `npx tsx scripts/seed.ts` again.
- Health check: `GET /api/health` (db + LLM reachability).

## Deploy to Vercel

```bash
vercel link --yes --project <name>
vercel install neon --non-interactive   # provisions Postgres + sets DATABASE_URL
vercel env pull                          # get DATABASE_URL locally
npx prisma db push --accept-data-loss    # create tables on Neon
npx tsx scripts/seed.ts                  # seed demo data
vercel deploy --prod --yes --project <name>
```

## Architecture

- **Next.js 16 App Router + TypeScript strict** — one page (`/`) with view switching; API routes
  under `src/app/api/*` hold every business rule.
- **Prisma + SQLite** stands in for Firebase/Firestore from the spec (sandbox constraint). The data
  model (§6) maps 1:1: `User`, `Technician`, `Booking`, `Review` (id = booking id, so one review per
  booking is structural), `Area`, `Rate`, `Complaint`, `EventLog`, `Audit`.
- **Realtime** uses in-app polling (the documented fallback for push): the client polls
  `GET /api/bookings/:id` every ~4 s and calls `POST /api/bookings/:id/tick` for lazy expiry and the
  quick-book cascade (D10, no scheduler).
- **LLM intake (D01)**: `POST /api/intake` runs a keyword-rules classifier + emergency detector
  synchronously, then an LLM call (z-ai-web-dev-sdk) with temperature 0, zod validation and a 4 s
  timeout; results are merged per §7.1. With the LLM unavailable the rules path alone still
  completes every flow, including emergencies (S3).
- **Matching (D02)**: `rankTechnicians` is a pure function — eligibility, weighted signals, no-show
  penalty, newcomer slot, reason keys, 0.5 km distance rounding.
- **State machine (D04)**: `transition()` in `src/lib/booking/machine.ts` is the only code allowed
  to change booking status; every allowed/forbidden transition follows §7.4. Quick-book decline/expiry
  cascades through `quickBookNext`.
- **Trust (D06/D03)**: Bayesian rating, trust score and badges recomputed inside the review
  transaction; prices come from the seeded rate table, never the LLM.
- **Privacy (C12)**: phones live on the `User` row and are exposed only via `contact` in the booking
  DTO, only to the two parties, only from `accepted` onward. Coordinates are rounded; clients never
  see a technician's exact location.
- **i18n (C13)**: full Urdu + English dictionaries (`src/lib/i18n.ts`), `dir="rtl"` switch, persisted
  choice, Noto Naskh Arabic for Urdu.
- **Motion UI**: framer-motion feedback (press, status changes, countdown ring, tracker steps) —
  feedback only, per spec §9.5.

## Honest limitations

- Data is **seeded demo data**; OTP is **mocked** (code 123456, no SMS).
- Rate table values are **placeholders** ("indicative range", never a quote).
- Voice input uses the Web Speech API and works best in Chrome/Edge; unsupported browsers show the
  typed box — the whole flow also completes with no voice and no typing (8 problem cards + trade
  icons).
- Push notifications, Firestore security rules, maps and PWA install from the spec are replaced by
  polling + API-level authorization checks in this sandbox build.
- Badges never say "verified" — the honest label is **"Admin-approved"**.

## Origin

The idea comes from an OOAD course proposal (OOAD Group 14-B). All application code was written
inside the competition window (16–28 November).

## Disclosure of external APIs and libraries

| Item                                            | Used for                                    |
| ----------------------------------------------- | ------------------------------------------- |
| Next.js, React, Tailwind CSS, lucide-react       | App framework, UI                           |
| shadcn/ui (Radix primitives)                     | Accessible component set                    |
| framer-motion                                    | UI feedback motion                          |
| Prisma + SQLite                                  | Data persistence (stand-in for Firestore)   |
| z-ai-web-dev-sdk (LLM API)                       | Intake classification + onboarding parse    |
| zod                                              | API input and LLM output validation         |
| Web Speech API (browser)                         | Speech recognition and read-aloud           |
| Zustand                                          | Client state                                |
