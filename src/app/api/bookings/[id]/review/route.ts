// POST /api/bookings/:id/review — C10. Reviews unlock only at "completed",
// from the booking's own client, one per booking (structural: review id
// equals booking id). Writes the review, moves the booking to "reviewed"
// through the state machine and recomputes technician aggregates in one
// transaction (spec §7.3).
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { bookingPatchFromDoc, logEvent, recomputeTechnicianTrust, toBookingDoc } from "@/lib/server/data";
import { buildBookingDto } from "@/lib/server/bookings";
import { transition, TransitionError } from "@/lib/booking/machine";

const bodySchema = z.object({
  stars: z.number().int().min(1).max(5),
  tags: z.array(z.enum(["on_time", "clean_work", "fair_price"])).max(3).default([]),
  comment: z.string().max(500).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, "invalid_input", "Stars (1-5) are required.");

    const row = await db.booking.findUnique({ where: { id } });
    if (!row) throw new HttpError(404, "not_found", "Booking not found.");
    if (row.clientId !== user.id) throw new HttpError(403, "forbidden", "Only the booking's client may review.");
    if (row.status !== "completed") throw new HttpError(409, "not_completed", "Reviews unlock after the job is completed.");
    const existing = await db.review.findUnique({ where: { bookingId: id } });
    if (existing) throw new HttpError(409, "already_reviewed", "One review per booking.");

    const doc = toBookingDoc(row);
    const updated = transition(doc, "reviewed", "client", { stars: parsed.data.stars as 1 | 2 | 3 | 4 | 5, now: Date.now() });

    await db.$transaction(async (tx) => {
      await tx.booking.update({ where: { id }, data: bookingPatchFromDoc(updated) });
      await tx.review.create({
        data: {
          id,
          bookingId: id,
          clientId: user.id,
          technicianId: doc.technicianId,
          stars: parsed.data.stars,
          tags: JSON.stringify(parsed.data.tags),
          comment: parsed.data.comment ?? null,
          createdAt: Date.now(),
        },
      });
    });

    await recomputeTechnicianTrust(doc.technicianId);
    await logEvent("reviewed", "client", { bookingId: id, stars: parsed.data.stars });

    const booking = await buildBookingDto(id, user);
    return Response.json({ booking });
  } catch (error) {
    if (error instanceof TransitionError) {
      return Response.json({ error: { code: error.code, message: error.message } }, { status: 409 });
    }
    return errorResponse(error);
  }
}
