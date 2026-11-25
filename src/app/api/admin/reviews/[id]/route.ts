// PATCH /api/admin/reviews/:id — moderation of abusive or fake reviews (S5).
// Hiding a review immediately affects aggregates, so trust is recomputed for
// the affected technician.
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, HttpError, requireRole } from "@/lib/server/auth";
import { logAudit, recomputeTechnicianTrust } from "@/lib/server/data";

const bodySchema = z.object({ hidden: z.boolean() });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole(req, "admin");
    const { id } = await ctx.params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, "invalid_input", "hidden must be a boolean.");

    const review = await db.review.findUnique({ where: { id } });
    if (!review) throw new HttpError(404, "not_found", "Review not found.");

    const updated = await db.review.update({ where: { id }, data: { hidden: parsed.data.hidden } });
    await recomputeTechnicianTrust(updated.technicianId);
    await logAudit(admin.id, parsed.data.hidden ? "review_hide" : "review_unhide", id);

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
