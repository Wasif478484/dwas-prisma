// GET /api/client/bookings — the client's own bookings, newest first (C09).
// buildBookingDto enforces the contact-privacy rules of C12.
import { db } from "@/lib/db";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { buildBookingDto } from "@/lib/server/bookings";

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== "client") throw new HttpError(403, "forbidden", "Only clients can list their bookings.");
    const rows = await db.booking.findMany({
      where: { clientId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const bookings = await Promise.all(rows.map((row) => buildBookingDto(row.id, user, row)));
    return Response.json({ bookings });
  } catch (error) {
    return errorResponse(error);
  }
}
