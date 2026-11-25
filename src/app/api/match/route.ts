// POST /api/match — spec §7.2 (D02). Loads technicians + the rate table,
// runs the pure ranking function, returns the top 5 with reasons, rounded
// distance and the price band for the requested jobType. Never returns exact
// technician coordinates.
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimited } from "@/lib/server/limiter";
import { errorResponse, HttpError } from "@/lib/server/auth";
import { rankTechnicians } from "@/lib/match/rank";
import { rateBand } from "@/lib/rate-table";
import { toTechnicianDoc, logEvent } from "@/lib/server/data";
import type { MatchCardDto } from "@/lib/api-client";

const bodySchema = z.object({
  trade: z.enum(["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor"]),
  jobType: z.string().max(60).default("other"),
  urgency: z.enum(["now", "today", "tomorrow", "flexible"]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  areaId: z.string().max(60).optional(),
});

export async function POST(req: Request) {
  try {
    if (rateLimited(req)) {
      return Response.json({ error: { code: "rate_limited", message: "Too many requests." } }, { status: 429 });
    }
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new HttpError(400, "invalid_input", "Trade, urgency and location are required.");
    }
    const { trade, jobType, urgency, lat, lng } = parsed.data;

    const [techRows, rateRowsRaw] = await Promise.all([
      db.technician.findMany({ where: { approvalStatus: "approved" } }),
      db.rate.findMany(),
    ]);
    const rateRows = rateRowsRaw as import("@/lib/rate-table").RateTableRow[];
    const ranked = rankTechnicians({
      trade,
      urgency,
      client: { lat, lng },
      technicians: techRows.map(toTechnicianDoc),
      now: new Date(),
    });

    const results: MatchCardDto[] = ranked.slice(0, 5).map((row) => {
      let priceBand: { min: number; max: number } | null = null;
      try {
        priceBand = rateBand(row.trades[0], jobType, rateRows);
      } catch {
        priceBand = null;
      }
      const doc = techRows.find((t) => t.id === row.technicianId);
      return {
        ...row,
        priceBand,
        avgResponseSec: doc?.avgResponseSec ?? null,
        visitFeePKR: doc?.visitFeePKR ?? null,
      };
    });

    await logEvent("match_shown", "client", { trade, urgency, count: results.length });
    return Response.json({ results });
  } catch (error) {
    return errorResponse(error);
  }
}
