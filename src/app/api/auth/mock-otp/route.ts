// POST /api/auth/mock-otp — demo login (spec section 10.1). The OTP code is
// fixed for the hackathon sandbox; users are created on first login with a
// deterministic id derived from the phone so repeat logins return the same
// user. Signing in as technician auto-creates a pending technician profile.
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimited } from "@/lib/server/limiter";
import { errorResponse, HttpError, issueToken } from "@/lib/server/auth";
import { logEvent } from "@/lib/server/data";
import type { Role } from "@/lib/types";

const bodySchema = z.object({
  phone: z.string().min(6).max(20),
  code: z.string().min(3).max(8),
  role: z.enum(["client", "technician", "admin"]),
  name: z.string().max(60).optional(),
});

function normalisePhone(raw: string): string {
  const stripped = raw.replace(/\s+/g, "");
  if (stripped.startsWith("+")) return stripped;
  if (stripped.startsWith("0")) return `+92${stripped.slice(1)}`;
  return stripped;
}

// A brand-new technician profile: pending approval, centred on Satellite
// Town until onboarding runs.
function newTechnicianDefaults(userId: string, name: string) {
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

export async function POST(req: Request) {
  try {
    if (rateLimited(req)) {
      return Response.json({ error: { code: "rate_limited", message: "Too many attempts. Wait a minute." } }, { status: 429 });
    }
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, "invalid_input", "Phone, code and role are required.");

    const expected = process.env.MOCK_OTP_CODE ?? "123456";
    if (parsed.data.code !== expected) {
      return Response.json({ error: { code: "bad_code", message: "Wrong verification code." } }, { status: 401 });
    }

    const phone = normalisePhone(parsed.data.phone);
    const existing = await db.user.findUnique({ where: { phone } });

    let user = existing;
    if (!user) {
      const name = parsed.data.name ?? (parsed.data.role === "client" ? "Guest" : parsed.data.role === "technician" ? "New mistri" : "Admin");
      user = await db.user.create({
        data: {
          id: `u-${phone.replace(/[^0-9]/g, "")}`,
          phone,
          name,
          role: parsed.data.role,
        },
      });
    }
    // A stored role always wins over the requested one.
    const role = user.role as Role;

    if (role === "technician") {
      const tech = await db.technician.findUnique({ where: { id: user.id } });
      if (!tech) {
        await db.technician.create({ data: newTechnicianDefaults(user.id, user.name) }).catch(() => null);
      }
    }

    await logEvent("login", role, { userId: user.id });
    return Response.json({
      token: issueToken(user.id),
      user: { id: user.id, name: user.name, role, language: user.language, isSeed: user.isSeed },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
