// POST /api/admin/complaints/:id/resolve — close an open complaint (S5) with
// an optional operator note. Audited like every admin mutation.
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, HttpError, requireRole } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/data";

const bodySchema = z.object({ note: z.string().max(300).optional() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole(req, "admin");
    const { id } = await ctx.params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, "invalid_input", "Invalid note.");

    const complaint = await db.complaint.findUnique({ where: { id } });
    if (!complaint) throw new HttpError(404, "not_found", "Complaint not found.");

    await db.complaint.update({
      where: { id },
      data: { status: "resolved", resolvedBy: admin.id, note: parsed.data.note ?? null },
    });
    await logAudit(admin.id, "complaint_resolve", id, parsed.data.note);

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
