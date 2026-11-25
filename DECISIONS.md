# DWAS — decisions log

Choices made where the spec was silent or the sandbox required an adaptation.
The spec (docs/SPEC.pdf) wins on every conflict.

## Platform adaptations (sandbox constraints)

- **Firebase → Prisma + SQLite.** The sandbox runs one Next.js process with a local SQLite file
  (`db/custom.db`). The Firestore data model from §6 maps 1:1 to Prisma models; list-typed fields
  are stored as JSON strings (Prisma/SQLite has no list primitives). Aggregates are still computed
  from reviews, never typed in.
- **Auth → mock-OTP session tokens.** Firebase Auth custom tokens are replaced by a base64url
  `dwas:<userId>` token issued by `POST /api/auth/mock-otp` and sent as the `x-demo-token` header.
  OTP stays mocked (code 123456).
- **Firestore onSnapshot → in-app polling.** The documented fallback for push (§0 working rules).
  The client polls `GET /api/bookings/:id` every ~4 s and calls `POST /api/bookings/:id/tick`
  every ~15 s; tick performs lazy expiry and the quick-book cascade (D10, no scheduler).
- **Single route `/`.** The preview surface renders only `/`, so all client/tech/admin screens are
  views switched by client state in `src/app/page.tsx` + `src/components/dwas/*`; the API surface
  keeps the spec's route shapes under `src/app/api/*`.
- **FCM push → skipped** (same sandbox constraint); in-app polling covers T03/T10 with the
  documented fallback. Photos upload is client-side only (no Storage bucket) and does not block
  booking.
- **Leaflet maps → area list + geolocation.** C05 uses the Geolocation API with the seeded
  area-list fallback; no tile dependency.

## Behavioral decisions

- **Quick-book decline cascade (§7.4).** When the assigned mistri declines and spare candidates
  remain, the request is re-offered to the next candidate: status stays `requested`, a fresh
  `expiresAt` is set, the attempt is recorded, and the decliner's response is built from the
  client's view (they are no longer a booking party). Without spares, the decline is terminal.
- **Technician-actor guard.** Only the assigned technician may accept/decline/advance a booking
  (403 otherwise); admin cannot move bookings directly (§7.4 actors).
- **Seeded reply times.** Seeded past bookings record accepts 45–540 s after the request so the
  reply-speed signal (§7.2) and the "typical reply" display stay realistic.
- **Rafiq placement.** Rafiq is anchored ~1.6 km from Ayesha (Satellite Town) so the S1 story works
  with `MATCH_MAX_KM_NOW = 6`; Zainab (~3 km) is the S5 cascade spare.
- **Newcomers online.** The three newcomers are online so the newcomer slot (§7.2) and the NEW badge
  are visible in matches; the two offline technicians (Mehak, Salman) demonstrate T02 filtering.
- **Audio pack (D11).** speechSynthesis is used directly (Chrome ships Urdu voices on Android);
  no pre-generated clips in this build. The player degrades silently when no voice exists.
- **Trust labels.** Badges never say "verified"; the honest label is "Admin-approved" (§7.3).
