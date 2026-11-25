// POST /api/admin/demo/reset — wipes and re-seeds the demo dataset (section
// 11). Guarded by DEMO_MODE_ENABLED so production deployments cannot wipe
// real data by accident. Audited.
import { errorResponse, requireRole } from "@/lib/server/auth";
import { logAudit, logEvent } from "@/lib/server/data";
import { seedDemoData } from "@/lib/server/seed";

export async function POST(req: Request) {
  try {
    const admin = await requireRole(req, "admin");
    if ((process.env.DEMO_MODE_ENABLED ?? "true") === "false") {
      return Response.json({ error: { code: "demo_disabled", message: "Demo reset is disabled." } }, { status: 403 });
    }

    const counts = await seedDemoData();
    await logAudit(admin.id, "demo_reset", "demo");
    await logEvent("demo_reset", "admin", { ...counts });

    return Response.json({ ok: true, counts });
  } catch (error) {
    return errorResponse(error);
  }
}
