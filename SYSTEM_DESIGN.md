# DWAS — System Design (scaling)

Scope: take the deployed DWAS app (Next.js 16 on Vercel + Neon Postgres, shadcn UI,
Prisma, demo auth) from a single-region hackathon deployment to a multi-city,
multi-tenant production. Assumptions are stated where the spec is silent; choices
are recorded in `DECISIONS.md`.

## 1. Current state (baseline)

- **Compute**: Vercel serverless functions (Node runtime) for every `src/app/api/*`
  route; the Next.js App Router renders the shell. Stateless per request.
- **Data**: Neon Postgres (single primary, pooled connections), accessed via
  Prisma. Schema in `prisma/schema.prisma` (User, Technician, Booking, Review,
  Area, Rate, Complaint, EventLog, Audit).
- **Realtime**: client polling every ~4s (`GET /api/bookings/:id`) + lazy expiry
  via `POST /api/bookings/:id/tick` (D10, no scheduler).
- **Auth**: demo-token (base64 of `dwas:userId`) in `x-demo-token` header;
  `requireUser`/`requireRole` in `src/lib/server/auth.ts`.
- **LLM**: z-ai-web-dev-sdk intake classifier with a keyword-rules fallback.
- **Storage**: none in the sandbox build (photos are URLs).
- **Limits today**: single DB primary, in-process rate limiter (per-instance),
  no cache, polling-based realtime, no geo index beyond a full-table scan in
  `rankTechnicians`, no observability beyond `EventLog`.

## 2. Scaling principles

1. **Stateless compute, stateful data.** Vercel functions scale horizontally;
   nothing lives in process memory that matters (rate limits, sessions, caches
   move to Redis).
2. **Reads scale, writes don't.** Split read paths (match, profile, history) from
   write paths (booking, review, status) early; add read replicas before
   sharding.
3. **Geo-locality.** Technicians and bookings are city-scoped; shard/partition
   by `areaId`/city before global sharding.
4. **Cache the hot, invalidate on write.** Match results and technician profiles
   are read far more than written; cache with short TTL + event-driven invalidation.
5. **Async the slow.** Notifications, SMS, FCM, audio generation, audit fan-out
   go through a queue; never block the booking write.
6. **Measure before scaling.** Add observability (§6) before adding infra.

## 3. Target architecture (phased)

### Phase 0 — single region, 10k MAU (current + small fixes)
- Keep Vercel + Neon single primary.
- Add a pooled connection string (`DATABASE_URL` already pooled via Neon).
- Add DB indexes (§4.1).
- Move rate limiter to a shared store (Redis) so limits hold across instances.
- Add `/api/health` (done) + structured logs.

### Phase 1 — multi-city, 100k MAU
- Neon read replica for match/profile/history reads; writes stay on primary.
- Redis (Upstash) for: rate limits, match-result cache (TTL 30s, key
  `match:{trade}:{urgency}:{areaId}`), session/demo tokens, FCM token cache.
- Geo index: Postgres `earthdistance`/`cube` or a dedicated geo service for
  `rankTechnicians` (currently full scan).
- Queue (Upstash QStash or a small worker) for notifications, SMS, FCM, audio.
- CDN for static assets + audio pack (`public/audio`).

### Phase 2 — national, 1M+ MAU
- Partition bookings/technicians by city (schema: `city` column + composite keys).
- Read replicas per region; write primary per partition.
- Dedicated search service (Elasticsearch/Meilisearch) for technician discovery
  beyond the in-process ranker.
- WebSocket/SSE realtime via a managed service (Pusher/Ably) replacing 4s polling.
- Multi-region deployment on Vercel (edge functions for read paths).

## 4. Concrete scaling moves

### 4.1 Database indexes (add now, cheap)
On `Booking`: `(technicianId, status)`, `(clientId, createdAt desc)`,
`(shareToken)` unique, `(status, expiresAt)` for the tick sweep.
On `Technician`: `(approvalStatus, isOnline)`, `(areaId)`.
On `Review`: `(technicianId, hidden)`, `(bookingId)` (already PK).
On `EventLog`: `(type, ts)`, `(actorRole, ts)`.

### 4.2 Caching
- Match results: Redis, TTL 30s, invalidate on technician online/offline or
  approval change. Cache key includes trade/urgency/area.
- Technician profile: TTL 60s, invalidate on profile edit/approval.
- Rate table: TTL 1h (rarely changes).
- Areas: TTL 24h.

### 4.3 Rate limiting
Replace the in-process `Map` in `src/lib/server/limiter.ts` with a Redis
sliding window (Upstash) keyed by IP; current per-instance limiter is bypassed
by horizontal scaling.

### 4.4 Realtime
Replace 4s polling with SSE from a managed realtime service; keep polling as
fallback (spec §10.4 "Core flow with all third parties off"). Booking status
updates publish to a channel `booking:{id}`.

### 4.5 Geo search
`rankTechnicians` currently scans all approved technicians. Add a bounding-box
pre-filter (`lat between X and Y`, `lng between ...`) plus a Postgres geo index;
or move discovery to a geo-capable store when technician count exceeds ~10k per
city.

### 4.6 Async work
Move to a queue: FCM push on new job, SMS/WhatsApp (when added), audio pack
generation (`scripts/make-audio.ts`), audit fan-out, CSV export (A08). Booking
writes must not wait on these.

### 4.7 Connection pooling
Use Neon's pooled connection string in production (`DATABASE_URL`); keep a
direct (non-pooled) URL for migrations (`DATABASE_URL_UNPOOLED`/`POSTGRES_URL_NON_POOLING`,
already provisioned by the Neon integration).

## 5. Capacity estimates (rough, single region)

| Metric | Phase 0 | Phase 1 | Phase 2 |
|---|---|---|---|
| MAU | 10k | 100k | 1M+ |
| Bookings/day | 500 | 5k | 50k |
| Technicians | 1k | 10k | 100k |
| Match QPS (peak) | 20 | 200 | 2k |
| DB connections | 10 | 50 | 200+ (pooled) |

## 6. Observability

- `/api/health` (done) extended with DB latency + LLM reachability + queue depth.
- Structured logs (JSON) from every route; ship to a log aggregator.
- Metrics: request latency p50/p95, error rate, intake fallback rate, match
  latency, booking acceptance rate, FCM delivery success.
- Tracing: OpenTelemetry across Vercel functions → DB → LLM calls.
- Alerting on error rate spikes and DB connection exhaustion.

## 7. Security at scale

- Rate limits in Redis (per IP + per user), not in process.
- Admin auth via verified ID tokens only (remove demo fallback in production —
  already done in the Firebase build; the Prisma build still uses demo tokens).
- Secrets in Vercel env vars; never in repo (`.env` is gitignored).
- DB credentials rotated via Neon; connection strings never logged.
- Input validation with zod on every route (already in place).

## 8. Trade-offs / what we are NOT doing

- No microservices yet: the monolith on Vercel functions is fine until Phase 2.
- No event sourcing: status history on the Booking row is enough.
- No global DB sharding until Phase 2 — partition by city first.
- No WebSocket server on Vercel (serverless) — use a managed realtime service.

## 9. Next steps

1. Add the indexes in §4.1 (migration).
2. Move rate limiter to Redis (§4.3).
3. Add match-result caching (§4.2).
4. Add observability (§6) before any further scaling.
5. Re-evaluate at 10k MAU before Phase 1 infra spend.
