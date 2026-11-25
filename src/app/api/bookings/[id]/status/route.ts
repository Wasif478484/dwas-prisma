// PATCH /api/bookings/:id/status — the only API surface that changes booking
// status. Every change goes through transition() (spec §7.4 / D04), which
// validates actor, current state and required fields. 409 on invalid
// transitions. Side effects: reply-time tracking on accept, reliability
// counter + complaint on technician cancel / no-show, aggregate recompute on
// completion.
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { bookingPatchFromDoc, logEvent, recomputeTechnicianTrust, toBookingDoc } from "@/lib/server/data";
import { buildBookingDto } from "@/lib/server/bookings";
import { quickBookNext, transition, TransitionError } from "@/lib/booking/machine";
import type { BookingStatus, Role } from "@/lib/types";

const bodySchema = z.object({
  to: z.enum([
    "accepted", "declined", "cancelled_client", "cancelled_tech",
    "on_the_way", "in_progress", "completed", "disputed", "no_show", "reviewed",
  ]),
  finalPrice: z.number().min(0).max(10_000_000).optional(),
  reason: z.string().max(80).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, "invalid_input", "Invalid status change.");
    const { to, finalPrice, reason } = parsed.data;

    const row = await db.booking.findUnique({ where: { id } });
    if (!row) throw new HttpError(404, "not_found", "Booking not found.");
    if (user.role === "admin") throw new HttpError(403, "forbidden", "Admins do not move bookings directly.");
    const doc = toBookingDoc(row);
    const actor: Role = user.role;
    // Technician-actor transitions belong to the ASSIGNED mistri only — a
    // different technician must not be able to accept or decline the request.
    if (actor === "technician" && doc.technicianId !== user.id) {
      throw new HttpError(403, "forbidden", "This request is assigned to another mistri.");
    }

    // §7.4 quick-book cascade: when the assigned mistri declines and spare
    // candidates remain, the request is re-offered to the next one (status
    // stays "requested", fresh expiry). Without spares the decline is final.
    const hasSpareCandidate =
      to === "declined" &&
      actor === "technician" &&
      doc.candidates.some((c) => c !== doc.technicianId);
    const updated = hasSpareCandidate
      ? quickBookNext(doc, "declined", Date.now())!
      : transition(doc, to as BookingStatus, actor, { finalPrice, reason, now: Date.now() });

    // Side effects per §7.4.
    let responseSec: number | null = null;
    if (updated.status === "accepted") {
      const entry = updated.statusHistory[updated.statusHistory.length - 1];
      if (entry.reason?.startsWith("reply_sec:")) {
        responseSec = Number(entry.reason.split(":")[1]);
      }
    }

    await db.$transaction(async (tx) => {
      await tx.booking.update({ where: { id }, data: bookingPatchFromDoc(updated) });
      if (updated.status === "accepted" && responseSec !== null) {
        const tech = await tx.technician.findUnique({ where: { id: updated.technicianId } });
        if (tech) {
          const prev = tech.avgResponseSec ?? responseSec;
          await tx.technician.update({
            where: { id: tech.id },
            data: { avgResponseSec: Math.round((prev + responseSec) / 2) },
          });
        }
      }
      if (updated.status === "cancelled_tech" || updated.status === "no_show") {
        await tx.technician.update({
          where: { id: doc.technicianId },
          data: { noShowCount: { increment: 1 } },
        });
        await tx.complaint.create({
          data: {
            bookingId: id,
            kind: to === "no_show" ? "no_show" : "tech_cancelled",
            text: reason ?? to,
            raisedBy: user.id,
            createdAt: Date.now(),
          },
        });
      }
    });

    if (updated.status === "completed") {
      await recomputeTechnicianTrust(updated.technicianId);
    }
    if (hasSpareCandidate) {
      await logEvent("cascade_next", "system", { bookingId: id, to: updated.technicianId });
    } else {
      await logEvent(to, actor, { bookingId: id, finalPrice });
    }

    let booking;
    try {
      booking = await buildBookingDto(id, user);
    } catch {
      // After a quick-book cascade the decliner is no longer a booking party;
      // fall back to the client's view so the action still gets a confirmation.
      const clientUser = await db.user.findUnique({ where: { id: doc.clientId } });
      if (!clientUser) throw Object.assign(new Error("Not a booking party"), { status: 403 });
      booking = await buildBookingDto(id, {
        id: clientUser.id,
        name: clientUser.name,
        role: "client",
        language: clientUser.language,
        isSeed: clientUser.isSeed,
      });
    }
    return Response.json({ booking });
  } catch (error) {
    if (error instanceof TransitionError) {
      return Response.json({ error: { code: error.code, message: error.message } }, { status: 409 });
    }
    return errorResponse(error);
  }
}
