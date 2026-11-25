// Simple in-memory per-IP rate limiter shared by public routes (spec §10.2:
// "Rate limit /api/intake and /api/auth/mock-otp per IP (for example 20
// requests per minute)").
import "server-only";

const hits = new Map<string, number[]>();

export function rateLimited(req: Request, limit = 20): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const window = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  window.push(now);
  hits.set(ip, window);
  if (hits.size > 10_000) hits.clear();
  return window.length > limit;
}
