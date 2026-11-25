// POST /api/bookings/:id/complaint — either party can raise a complaint
// (no-show, dispute, abuse). Admin resolves from the complaints queue (A06).
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { logEvent } from "@/lib/server/data";

const bodySchema = z.object({
  kind: z.enum(["no_show", "price_dispute", "abuse", "other"]).default("other"),
  text: z.string().min(1).max(500),
});
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, "invalid_input", "Complaint text is required.");

    const row = await db.booking.findUnique({ where: { id } });
    if (!row) throw new HttpError(404, "not_found", "Booking not found.");
    if (user.role !== "admin" && row.clientId !== user.id && row.technicianId !== user.id) {
      throw new HttpError(403, "forbidden", "Only booking parties may complain.");
    }

    await db.complaint.create({
      data: { bookingId: id, kind: parsed.data.kind, text: parsed.data.text, raisedBy: user.id, createdAt: Date.now() },
    });
    await logEvent("complaint", user.role, { bookingId: id, kind: parsed.data.kind });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
