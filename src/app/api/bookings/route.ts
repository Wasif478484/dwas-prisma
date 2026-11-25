// GET/POST /api/bookings — create a booking (C08) or list the caller's
// bookings. Creation goes through the rate table for the indicative band
// (D03), never through the LLM. Quick book (C18) stores the ranked top 5 in
// booking.candidates and starts the cascade.
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { logEvent, toTechnicianDoc } from "@/lib/server/data";
import { rankTechnicians } from "@/lib/match/rank";
import { rateBand } from "@/lib/rate-table";
import { QUICKBOOK_STEP_SEC, REQUEST_EXPIRY_SEC } from "@/lib/config";
import { buildBookingDto } from "@/lib/server/bookings";
import type { BookingDoc, Role } from "@/lib/types";

const createSchema = z.object({
  technicianId: z.string().max(80).optional(),
  quick: z.boolean().optional(),
  intake: z.object({
    trade: z.enum(["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor", "unknown"]),
    jobType: z.string().max(60),
    urgency: z.enum(["now", "today", "tomorrow", "flexible"]),
    summary_en: z.string().max(400),
    summary_ur: z.string().max(400),
    emergency: z.object({ is_emergency: z.boolean(), kind: z.enum(["gas", "electrical", "fire", "flood", "none"]) }),
    confidence: z.number(),
  }),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    areaId: z.string().max(60),
    note: z.string().max(200).optional(),
  }),
});

function actorFromRole(role: Role): BookingDoc["statusHistory"][number]["actor"] {
  return role === "admin" ? "system" : role;
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== "client") throw new HttpError(403, "forbidden", "Only clients book jobs.");
    const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, "invalid_input", "Booking payload is invalid.");
    const { intake, location } = parsed.data;
    if (intake.trade === "unknown") throw new HttpError(400, "unknown_trade", "Pick a trade first.");

    const now = Date.now();
    let technicianId = parsed.data.technicianId;
    let candidates: string[] = technicianId ? [technicianId] : [];

    if (parsed.data.quick) {
      const techRows = await db.technician.findMany({ where: { approvalStatus: "approved" } });
      const ranked = rankTechnicians({
        trade: intake.trade,
        urgency: intake.urgency,
        client: { lat: location.lat, lng: location.lng },
        technicians: techRows.map(toTechnicianDoc),
        now: new Date(),
      });
      candidates = ranked.slice(0, 5).map((r) => r.technicianId);
      technicianId = candidates[0];
      if (!technicianId) throw new HttpError(409, "no_technician", "No technician is available right now.");
      candidates = candidates.slice(1); // the assigned one is no longer a spare
    } else if (!technicianId) {
      throw new HttpError(400, "missing_technician", "Pick a technician or use quick book.");
    }

    const tech = await db.technician.findUnique({ where: { id: technicianId } });
    if (!tech) throw new HttpError(404, "technician_not_found", "That technician does not exist.");

    let priceBand: { min: number; max: number } | null = null;
    try {
      const rateRows = (await db.rate.findMany()) as import("@/lib/rate-table").RateTableRow[];
      priceBand = rateBand(intake.trade, intake.jobType, rateRows);
    } catch {
      priceBand = null;
    }

    const doc: BookingDoc = {
      id: "",
      clientId: user.id,
      technicianId,
      trade: intake.trade,
      jobType: intake.jobType || "other",
      problemRaw: "",
      summary_en: intake.summary_en,
      summary_ur: intake.summary_ur,
      urgency: intake.urgency,
      location: { lat: location.lat, lng: location.lng, areaId: location.areaId, note: location.note },
      priceBand,
      status: "requested",
      statusHistory: [{ status: "requested", at: now, actor: actorFromRole(user.role) }],
      candidates,
      attempts: [],
      expiresAt: now + (parsed.data.quick ? QUICKBOOK_STEP_SEC : REQUEST_EXPIRY_SEC) * 1000,
      photoUrls: [],
      phoneRevealed: false,
      shareToken: Math.random().toString(36).slice(2) + Date.now().toString(36),
      createdAt: now,
    };

    const row = await db.booking.create({
      data: {
        clientId: doc.clientId,
        technicianId: doc.technicianId,
        trade: doc.trade,
        jobType: doc.jobType,
        problemRaw: doc.problemRaw,
        summaryEn: doc.summary_en,
        summaryUr: doc.summary_ur,
        urgency: doc.urgency,
        emergencyKind: intake.emergency.is_emergency ? intake.emergency.kind : "none",
        lat: doc.location.lat,
        lng: doc.location.lng,
        areaId: location.areaId,
        note: location.note ?? null,
        priceBandMin: priceBand?.min ?? null,
        priceBandMax: priceBand?.max ?? null,
        status: "requested",
        statusHistory: JSON.stringify(doc.statusHistory),
        candidates: JSON.stringify(doc.candidates),
        attempts: JSON.stringify(doc.attempts),
        expiresAt: doc.expiresAt,
        photoUrls: "[]",
        phoneRevealed: false,
        shareToken: doc.shareToken,
        createdAt: now,
      },
    });

    await logEvent("booking_created", "client", { bookingId: row.id, trade: doc.trade, quick: Boolean(parsed.data.quick) });
    const booking = await buildBookingDto(row.id, user);
    return Response.json({ booking });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status") ?? undefined;
    const rows = await db.booking.findMany({
      where: {
        ...(user.role === "technician" ? { technicianId: user.id } : user.role === "client" ? { clientId: user.id } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const bookings = await Promise.all(rows.map((row) => buildBookingDto(row.id, user, row)));
    return Response.json({ bookings });
  } catch (error) {
    return errorResponse(error);
  }
}
