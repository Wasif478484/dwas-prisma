// GET /api/tech/me — the signed-in technician's own profile. Null when the
// technician row does not exist yet (client routes treat it as "onboarding
// needed").
import { db } from "@/lib/db";
import { errorResponse, requireRole } from "@/lib/server/auth";
import { toTechnicianPublic } from "@/lib/server/data";

export async function GET(req: Request) {
  try {
    const user = await requireRole(req, "technician");
    const row = await db.technician.findUnique({ where: { id: user.id } });
    if (!row) return Response.json({ technician: null });
    return Response.json({ technician: toTechnicianPublic(row) });
  } catch (error) {
    return errorResponse(error);
  }
}
