// GET /api/health — sandbox liveness probe. Reports whether the database
// answers and whether the LLM path is not disabled by env flag. There is no
// cheap LLM ping, so llm simply reports "configured".
import { db } from "@/lib/db";

export async function GET() {
  let dbOk = false;
  try {
    await db.user.count();
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const llmOk = process.env.DISABLE_LLM !== "true" && process.env.DISABLE_LLM !== "1";
  return Response.json({ ok: dbOk && llmOk, db: dbOk, llm: llmOk });
}
