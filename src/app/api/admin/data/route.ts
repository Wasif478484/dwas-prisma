// GET /api/admin/data — the operator dashboard payload (D08). Everything is
// computed from stored rows: aggregate stats from bookings/reviews/events,
// the 14-day volume trend, per-trade split and the intake source split
// (llm vs rules fallback). Nothing is typed in by hand.
import { db } from "@/lib/db";
import { errorResponse, requireRole } from "@/lib/server/auth";
import { buildBookingDto } from "@/lib/server/bookings";
import { toReviewDto, toTechnicianPublic } from "@/lib/server/data";
import type { AdminDataDto, BookingDto } from "@/lib/api-client";
import type { Booking, EventLog } from "@prisma/client";

function dayKey(ms: number): string {
  const d = new Date(ms);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function computeStats(bookings: Booking[], reviews: { hidden: boolean; stars: number }[], events: EventLog[]) {
  const bookingsTotal = bookings.length;
  const counted = bookings.filter(
    (b) => b.status !== "declined" && b.status !== "expired" && b.status !== "cancelled_client" && b.status !== "cancelled_tech",
  );
  const movedPastRequested = counted.filter((b) => b.status !== "requested").length;
  const acceptRate = counted.length > 0 ? Math.round((movedPastRequested / counted.length) * 100) : 0;

  const visible = reviews.filter((r) => !r.hidden);
  const avgRating = visible.length
    ? Math.round((visible.reduce((sum, r) => sum + r.stars, 0) / visible.length) * 10) / 10
    : null;

  const recentEvents = events.slice(0, 200);
  const llmOk = recentEvents.filter((e) => e.type === "llm_ok").length;
  const fallbackUsed = recentEvents.filter((e) => e.type === "fallback_used").length;
  const voiceTotal = llmOk + fallbackUsed;
  const voiceOkRate = voiceTotal > 0 ? llmOk / voiceTotal : 0;
  const fallbackRate = voiceTotal > 0 ? fallbackUsed / voiceTotal : 0;

  // Reply time: requested -> accepted deltas, averaged across bookings.
  const acceptSecs: number[] = [];
  for (const b of bookings) {
    let history: { status: string; at: number }[] = [];
    try {
      history = JSON.parse(b.statusHistory) as { status: string; at: number }[];
    } catch {
      continue;
    }
    const requested = history.find((h) => h.status === "requested");
    const accepted = history.find((h) => h.status === "accepted");
    if (requested && accepted && accepted.at >= requested.at) {
      acceptSecs.push((accepted.at - requested.at) / 1000);
    }
  }
  const avgAcceptSec = acceptSecs.length
    ? Math.round(acceptSecs.reduce((a, b) => a + b, 0) / acceptSecs.length)
    : null;

  // 14-day volume trend with zero-filled days.
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const perDay = new Map<string, number>();
  for (let i = 13; i >= 0; i -= 1) perDay.set(dayKey(startOfToday - i * 86_400_000), 0);
  for (const b of bookings) {
    const key = dayKey(b.createdAt);
    if (perDay.has(key)) perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }

  const perTrade = new Map<string, number>();
  for (const b of bookings) perTrade.set(b.trade, (perTrade.get(b.trade) ?? 0) + 1);

  return {
    bookingsTotal,
    acceptRate,
    avgRating,
    voiceOkRate,
    fallbackRate,
    avgAcceptSec,
    bookingsPerDay: [...perDay.entries()].map(([day, count]) => ({ day, count })),
    bookingsPerTrade: [...perTrade.entries()]
      .map(([trade, count]) => ({ trade, count }))
      .sort((a, b) => b.count - a.count),
    intakeSource: [
      { source: "llm", count: llmOk },
      { source: "rules", count: fallbackUsed },
    ],
  };
}

export async function GET(req: Request) {
  try {
    const admin = await requireRole(req, "admin");

    const [techRows, bookingRows, reviewRows, complaintRows, eventRows] = await Promise.all([
      db.technician.findMany(),
      db.booking.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      db.review.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      db.complaint.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      db.eventLog.findMany({ orderBy: { ts: "desc" }, take: 500 }),
    ]);

    const approved = techRows.filter((t) => t.approvalStatus === "approved").length;
    const pending = techRows.filter((t) => t.approvalStatus === "pending").length;

    const stats = computeStats(bookingRows, reviewRows, eventRows);

    // Skip bookings that fail serialisation instead of failing the dashboard.
    const bookings = (
      await Promise.all(
        bookingRows.map(async (row): Promise<BookingDto | null> => {
          try {
            return await buildBookingDto(row.id, admin, row);
          } catch {
            return null;
          }
        }),
      )
    ).filter((b): b is BookingDto => b !== null);

    const techNames = new Map(techRows.map((t) => [t.id, t.name]));
    const data: AdminDataDto = {
      stats: {
        bookingsTotal: stats.bookingsTotal,
        approvedTechnicians: approved,
        pendingTechnicians: pending,
        acceptRate: stats.acceptRate,
        avgRating: stats.avgRating,
        voiceOkRate: Math.round(stats.voiceOkRate * 100) / 100,
        fallbackRate: Math.round(stats.fallbackRate * 100) / 100,
        avgAcceptSec: stats.avgAcceptSec,
        bookingsPerDay: stats.bookingsPerDay,
        bookingsPerTrade: stats.bookingsPerTrade,
        intakeSource: stats.intakeSource,
      },
      technicians: techRows.map(toTechnicianPublic),
      bookings,
      reviews: reviewRows.map((row) => toReviewDto(row, techNames.get(row.technicianId))),
      complaints: complaintRows.map((row) => ({
        id: row.id,
        bookingId: row.bookingId,
        kind: row.kind,
        text: row.text,
        raisedBy: row.raisedBy,
        status: row.status,
        resolvedBy: row.resolvedBy,
        note: row.note,
        createdAt: row.createdAt,
      })),
    };

    return Response.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
