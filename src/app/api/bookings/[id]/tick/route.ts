// POST /api/bookings/:id/tick — lazy expiry and quick-book cascade (D10).
// No scheduler: the waiting client calls this endpoint and the server checks
// expiresAt. An expired request is re-offered to the next candidate, or marked
// expired when the candidate list is empty.
import { db } from "@/lib/db";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { bookingPatchFromDoc, logEvent, toBookingDoc } from "@/lib/server/data";
import { buildBookingDto } from "@/lib/server/bookings";
import { quickBookNext, transition } from "@/lib/booking/machine";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const row = await db.booking.findUnique({ where: { id } });
    if (!row) throw new HttpError(404, "not_found", "Booking not found.");
    if (user.role !== "admin" && row.clientId !== user.id && row.technicianId !== user.id) {
      throw new HttpError(403, "forbidden", "Only booking parties may tick this booking.");
    }

    let doc = toBookingDoc(row);
    if (doc.status === "requested" && Date.now() > doc.expiresAt) {
      const next = quickBookNext(doc, "expired");
      if (next) {
        doc = next;
        await db.booking.update({ where: { id }, data: bookingPatchFromDoc(doc) });
        await logEvent("cascade_next", "system", { bookingId: id, to: doc.technicianId });
      } else {
        doc = transition(doc, "expired", "system", { now: Date.now() });
        await db.booking.update({ where: { id }, data: bookingPatchFromDoc(doc) });
        await logEvent("expired", "system", { bookingId: id });
      }
    }

    const booking = await buildBookingDto(id, user);
    return Response.json({ booking });
  } catch (error) {
    return errorResponse(error);
  }
}
