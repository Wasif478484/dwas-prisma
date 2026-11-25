// POST /api/admin/technicians/:id/approval — operator moderation (S4). The
// action maps onto an approvalStatus; approving also guarantees the user row
// carries the technician role. Trust badges are recomputed afterwards so the
// score always reflects the current approval state.
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, HttpError, requireRole } from "@/lib/server/auth";
import { logAudit, logEvent, recomputeTechnicianTrust } from "@/lib/server/data";

const bodySchema = z.object({
  action: z.enum(["approve", "reject", "suspend", "reinstate"]),
  note: z.string().max(200).optional(),
});

const STATUS_BY_ACTION: Record<string, string> = {
  approve: "approved",
  reject: "rejected",
  suspend: "suspended",
  reinstate: "approved",
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole(req, "admin");
    const { id } = await ctx.params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, "invalid_input", "Action must be approve, reject, suspend or reinstate.");
    const { action, note } = parsed.data;

    const tech = await db.technician.findUnique({ where: { id } });
    if (!tech) throw new HttpError(404, "not_found", "Technician not found.");

    const approvalStatus = STATUS_BY_ACTION[action];
    await db.technician.update({ where: { id }, data: { approvalStatus } });

    if (action === "approve") {
      const user = await db.user.findUnique({ where: { id } });
      if (user && user.role !== "technician") {
        await db.user.update({ where: { id }, data: { role: "technician" } });
      }
    }

    await recomputeTechnicianTrust(id);
    await logAudit(admin.id, `technician_${action}`, id, note);
    await logEvent(`technician_${action}`, "admin", { techId: id, note: note ?? null });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
