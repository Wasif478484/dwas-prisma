// GET /api/bookings/:id — parties and admin only. Contact details are included
// only when phoneRevealed is true (C12).
import { db } from "@/lib/db";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { buildBookingDto } from "@/lib/server/bookings";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const row = await db.booking.findUnique({ where: { id } });
    if (!row) throw new HttpError(404, "not_found", "Booking not found.");
    if (user.role !== "admin" && row.clientId !== user.id && row.technicianId !== user.id) {
      throw new HttpError(403, "forbidden", "Only booking parties may view this booking.");
    }
    const booking = await buildBookingDto(id, user, row);
    return Response.json({ booking });
  } catch (error) {
    return errorResponse(error);
  }
}
