// PATCH /api/technicians/me — self-service profile edits (C13 / T07). Core
// profile fields (trades, area, radius, bios, fee, experience) push an
// approved technician back to "pending" so the operator re-approves; only
// online-status changes leave approval untouched.
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, HttpError, requireRole } from "@/lib/server/auth";
import { logEvent, recomputeTechnicianTrust, toTechnicianPublic } from "@/lib/server/data";

const TRADES = ["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor"] as const;

const bodySchema = z.object({
  isOnline: z.boolean().optional(),
  name: z.string().max(60).optional(),
  trades: z.array(z.enum(TRADES)).max(3).optional(),
  yearsExperience: z.number().int().min(0).max(60).optional(),
  visitFeePKR: z.number().int().min(0).max(100_000).optional(),
  bioUr: z.string().max(400).optional(),
  bioEn: z.string().max(400).optional(),
  areaId: z.string().max(60).optional(),
  radiusKm: z.number().min(0.5).max(50).optional(),
});

// Same defaults as the mock-otp auto-create: a minimal pending profile
// centred on Satellite Town until onboarding fills the real values.
function minimalProfile(userId: string, name: string) {
  return {
    id: userId,
    name,
    trades: JSON.stringify(["plumber"]),
    yearsExperience: 1,
    lat: 33.633,
    lng: 73.063,
    areaId: "satellite-town",
    radiusKm: 5,
    isOnline: false,
    approvalStatus: "pending",
    badges: "[]",
    workPhotos: "[]",
    lastActiveAt: Date.now(),
    isSeed: false,
  };
}

export async function PATCH(req: Request) {
  try {
    const user = await requireRole(req, "technician");
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, "invalid_input", "Profile payload is invalid.");

    let row = await db.technician.findUnique({ where: { id: user.id } });
    if (!row) {
      row = await db.technician.create({ data: minimalProfile(user.id, user.name) });
    }

    const data: {
      isOnline?: boolean;
      lastActiveAt?: number;
      name?: string;
      trades?: string;
      yearsExperience?: number;
      visitFeePKR?: number;
      bioUr?: string;
      bioEn?: string;
      areaId?: string;
      radiusKm?: number;
      approvalStatus?: string;
    } = {};
    if (parsed.data.isOnline !== undefined) {
      data.isOnline = parsed.data.isOnline;
      if (parsed.data.isOnline) data.lastActiveAt = Date.now();
    }
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.trades !== undefined) data.trades = JSON.stringify(parsed.data.trades);
    if (parsed.data.yearsExperience !== undefined) data.yearsExperience = parsed.data.yearsExperience;
    if (parsed.data.visitFeePKR !== undefined) data.visitFeePKR = parsed.data.visitFeePKR;
    if (parsed.data.bioUr !== undefined) data.bioUr = parsed.data.bioUr;
    if (parsed.data.bioEn !== undefined) data.bioEn = parsed.data.bioEn;
    if (parsed.data.areaId !== undefined) data.areaId = parsed.data.areaId;
    if (parsed.data.radiusKm !== undefined) data.radiusKm = parsed.data.radiusKm;

    // T07: core profile edits re-trigger approval, but only from "approved".
    const CORE_FIELDS_CHANGED =
      parsed.data.trades !== undefined ||
      parsed.data.areaId !== undefined ||
      parsed.data.radiusKm !== undefined ||
      parsed.data.bioUr !== undefined ||
      parsed.data.bioEn !== undefined ||
      parsed.data.visitFeePKR !== undefined ||
      parsed.data.yearsExperience !== undefined;
    if (CORE_FIELDS_CHANGED && row.approvalStatus === "approved") {
      data.approvalStatus = "pending";
    }

    const updated = await db.technician.update({ where: { id: user.id }, data });
    if (CORE_FIELDS_CHANGED) await recomputeTechnicianTrust(user.id);
    await logEvent("tech_profile_saved", "technician", { techId: user.id, coreChanged: CORE_FIELDS_CHANGED });

    return Response.json({ technician: toTechnicianPublic(updated) });
  } catch (error) {
    return errorResponse(error);
  }
}
