// GET /api/admin/export — CSV export of bookings for the operator (D08).
// Returns { csv } JSON; the UI turns it into a blob download. Never includes
// phone numbers.
import { db } from "@/lib/db";
import { errorResponse, requireRole } from "@/lib/server/auth";

const HEADERS = ["id", "status", "trade", "jobType", "clientName", "technicianName", "summary", "finalPrice", "createdAt"];

function csvField(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  try {
    await requireRole(req, "admin");

    const [bookingRows, userRows, techRows] = await Promise.all([
      db.booking.findMany({ orderBy: { createdAt: "desc" }, take: 1000 }),
      db.user.findMany(),
      db.technician.findMany(),
    ]);
    const clientNames = new Map(userRows.map((u) => [u.id, u.name]));
    const techNames = new Map(techRows.map((t) => [t.id, t.name]));

    const lines = [HEADERS.join(",")];
    for (const row of bookingRows) {
      lines.push(
        [
          row.id,
          row.status,
          row.trade,
          row.jobType,
          clientNames.get(row.clientId) ?? row.clientId,
          techNames.get(row.technicianId) ?? row.technicianId,
          row.summaryEn,
          row.finalPrice,
          new Date(row.createdAt).toISOString(),
        ]
          .map(csvField)
          .join(","),
      );
    }

    return Response.json({ csv: lines.join("\n") });
  } catch (error) {
    return errorResponse(error);
  }
}
