// Serialization helpers: Prisma rows -> spec-shaped docs (Appendix A) so the
// pure logic modules (state machine, ranking) can run unchanged.
import "server-only";
import { db } from "@/lib/db";
import { deriveTechnicianTrust } from "@/lib/trust/score";
import type { BookingDoc, BookingStatus, Role, Trade } from "@/lib/types";
import type { Booking, Review, Technician } from "@prisma/client";
import type { BookingDto, ReviewDto, TechnicianPublicDto } from "@/lib/api-client";

type StatusEntry = BookingDoc["statusHistory"][number];
type Attempt = BookingDoc["attempts"][number];

export function toBookingDoc(row: Booking): BookingDoc {
  return {
    id: row.id,
    clientId: row.clientId,
    technicianId: row.technicianId,
    trade: row.trade as Trade,
    jobType: row.jobType,
    problemRaw: row.problemRaw,
    summary_en: row.summaryEn,
    summary_ur: row.summaryUr,
    urgency: row.urgency as BookingDoc["urgency"],
    location: { lat: row.lat, lng: row.lng, areaId: row.areaId ?? undefined, note: row.note ?? undefined },
    priceBand: row.priceBandMin !== null && row.priceBandMax !== null ? { min: row.priceBandMin, max: row.priceBandMax } : null,
    finalPrice: row.finalPrice ?? undefined,
    status: row.status as BookingStatus,
    statusHistory: JSON.parse(row.statusHistory) as StatusEntry[],
    candidates: JSON.parse(row.candidates) as string[],
    attempts: JSON.parse(row.attempts) as Attempt[],
    expiresAt: row.expiresAt,
    scheduledFor: row.scheduledFor ?? undefined,
    photoUrls: JSON.parse(row.photoUrls) as string[],
    phoneRevealed: row.phoneRevealed,
    shareToken: row.shareToken,
    createdAt: row.createdAt,
  };
}

export function bookingPatchFromDoc(doc: BookingDoc) {
  return {
    technicianId: doc.technicianId,
    status: doc.status,
    statusHistory: JSON.stringify(doc.statusHistory),
    candidates: JSON.stringify(doc.candidates),
    attempts: JSON.stringify(doc.attempts),
    finalPrice: doc.finalPrice ?? null,
    phoneRevealed: doc.phoneRevealed,
    expiresAt: doc.expiresAt,
  };
}

export function toReviewDto(row: Review, technicianName?: string): ReviewDto {
  return {
    id: row.id,
    bookingId: row.bookingId,
    clientId: row.clientId,
    technicianId: row.technicianId,
    technicianName,
    stars: row.stars,
    tags: JSON.parse(row.tags) as string[],
    comment: row.comment,
    hidden: row.hidden,
    createdAt: row.createdAt,
  };
}

// Spec-shaped TechnicianDoc for the pure ranking module (§7.2).
export function toTechnicianDoc(row: Technician): import("@/lib/types").TechnicianDoc {
  return {
    id: row.id,
    name: row.name,
    photoUrl: row.photoUrl ?? undefined,
    workPhotos: JSON.parse(row.workPhotos) as string[],
    trades: JSON.parse(row.trades) as import("@/lib/types").TechnicianDoc["trades"],
    yearsExperience: row.yearsExperience,
    bio_ur: row.bioUr ?? undefined,
    bio_en: row.bioEn ?? undefined,
    visitFeePKR: row.visitFeePKR ?? undefined,
    center: { lat: row.lat, lng: row.lng, areaId: row.areaId ?? undefined },
    radiusKm: row.radiusKm,
    isOnline: row.isOnline,
    lastActiveAt: row.lastActiveAt,
    approvalStatus: row.approvalStatus as import("@/lib/types").TechnicianDoc["approvalStatus"],
    badges: JSON.parse(row.badges) as string[],
    stats: {
      jobsCompleted: row.jobsCompleted,
      ratingSum: row.ratingSum,
      ratingCount: row.ratingCount,
      avgResponseSec: row.avgResponseSec,
      noShowCount: row.noShowCount,
    },
    isSeed: row.isSeed,
  };
}

export function toTechnicianPublic(row: Technician): TechnicianPublicDto {
  const ratingAvg = row.ratingCount > 0 ? Math.round((row.ratingSum / row.ratingCount) * 10) / 10 : null;
  return {
    id: row.id,
    name: row.name,
    photoUrl: row.photoUrl,
    workPhotos: JSON.parse(row.workPhotos) as string[],
    trades: JSON.parse(row.trades) as Trade[],
    yearsExperience: row.yearsExperience,
    bioUr: row.bioUr,
    bioEn: row.bioEn,
    visitFeePKR: row.visitFeePKR,
    areaId: row.areaId,
    isOnline: row.isOnline,
    approvalStatus: row.approvalStatus,
    badges: JSON.parse(row.badges) as string[],
    trustScore: row.trustScore,
    stats: {
      jobsCompleted: row.jobsCompleted,
      ratingSum: row.ratingSum,
      ratingCount: row.ratingCount,
      ratingAvg,
      avgResponseSec: row.avgResponseSec,
      noShowCount: row.noShowCount,
    },
    isSeed: row.isSeed,
  };
}

// One shared recompute used by the review route, the admin review moderation
// route and the demo reset, so aggregates can never drift.
export async function recomputeTechnicianTrust(technicianId: string): Promise<void> {
  const COMPLETED = ["completed", "reviewed", "disputed"];
  const [tech, reviews, doneCount] = await Promise.all([
    db.technician.findUnique({ where: { id: technicianId } }),
    db.review.findMany({ where: { technicianId } }),
    db.booking.count({ where: { technicianId, status: { in: COMPLETED } } }),
  ]);
  if (!tech) return;
  const ratings = reviews.filter((r) => !r.hidden);
  const derived = deriveTechnicianTrust({
    jobsCompleted: doneCount,
    ratingSum: ratings.reduce((sum, r) => sum + r.stars, 0),
    ratingCount: ratings.length,
    avgResponseSec: tech.avgResponseSec,
    noShowCount: tech.noShowCount,
    approvalStatus: tech.approvalStatus as import("@/lib/types").Approval,
    manualBadges: (JSON.parse(tech.badges) as string[]).filter((b) => b === "id_checked_demo"),
  });
  await db.technician.update({
    where: { id: technicianId },
    data: {
      jobsCompleted: derived.stats.jobsCompleted,
      ratingSum: derived.stats.ratingSum,
      ratingCount: derived.stats.ratingCount,
      badges: JSON.stringify(derived.badges),
      trustScore: derived.trustScore,
    },
  });
}

export async function logEvent(type: string, actorRole: Role | "system", meta: Record<string, unknown> = {}): Promise<void> {
  await db.eventLog.create({
    data: { type, ts: Date.now(), actorRole, meta: JSON.stringify(meta) },
  });
}

export async function logAudit(actor: string, action: string, target: string, note?: string): Promise<void> {
  await db.audit.create({ data: { actor, action, target, note: note ?? null, ts: Date.now() } });
}
