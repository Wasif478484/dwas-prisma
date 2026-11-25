// POST /api/intake — spec §7.1. Public, rate limited, caps text at 500 chars.
// LLM output is zod-validated; on timeout/error/invalid JSON the rules result
// is used alone. Logs intake events for the admin dashboard (D08).
import { runIntake } from "@/lib/server/intake";
import { rateLimited } from "@/lib/server/limiter";
import { errorResponse } from "@/lib/server/auth";
import { logEvent } from "@/lib/server/data";

export async function POST(req: Request) {
  try {
    if (rateLimited(req)) {
      return Response.json({ error: { code: "rate_limited", message: "Too many requests. Wait a minute." } }, { status: 429 });
    }
    const body = (await req.json().catch(() => ({}))) as { text?: string; lang?: string; llm?: boolean };
    const text = typeof body.text === "string" ? body.text : "";
    if (!text.trim()) {
      return Response.json({ error: { code: "empty_text", message: "Describe the problem first." } }, { status: 400 });
    }
    await logEvent("intake_started", "client", { textLength: text.length });
    const intake = await runIntake(text, { useLLM: body.llm !== false });
    await logEvent(intake.source === "rules" ? "fallback_used" : "llm_ok", "client", {
      trade: intake.trade,
      emergency: intake.emergency.is_emergency,
      confidence: intake.confidence,
    });
    return Response.json({ intake });
  } catch (error) {
    return errorResponse(error);
  }
}
