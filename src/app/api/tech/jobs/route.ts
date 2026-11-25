// GET /api/tech/jobs — the technician job board (C10): incoming "requested"
// offers oldest-first so the earliest claim wins, plus active jobs. Touches
// lastActiveAt for the idle-offline rule (section 5.3).
import { db } from "@/lib/db";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { buildBookingDto } from "@/lib/server/bookings";

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== "technician") {
      throw new HttpError(403, "forbidden", "Only technicians can load their jobs.");
    }

    const [incomingRows, activeRows] = await Promise.all([
      db.booking.findMany({
        where: { technicianId: user.id, status: "requested" },
        orderBy: { createdAt: "asc" },
      }),
      db.booking.findMany({
        where: { technicianId: user.id, status: { in: ["accepted", "on_the_way", "in_progress"] } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const [incoming, active] = await Promise.all([
      Promise.all(incomingRows.map((row) => buildBookingDto(row.id, user, row))),
      Promise.all(activeRows.map((row) => buildBookingDto(row.id, user, row))),
    ]);

    // The technician row may not exist yet for freshly signed-up users.
    try {
      await db.technician.update({ where: { id: user.id }, data: { lastActiveAt: Date.now() } });
    } catch {
      // ignore: profile row missing
    }

    return Response.json({ incoming, active });
  } catch (error) {
    return errorResponse(error);
  }
}
