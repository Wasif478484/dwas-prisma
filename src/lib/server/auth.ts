// Server-side auth for the demo: the mock-OTP route issues a token (base64 of
// userId) and every authenticated route resolves it back to a user. This is a
// deliberate stand-in for Firebase ID tokens in the sandbox demo.
import "server-only";
import { db } from "@/lib/db";
import type { SessionUserDto } from "@/lib/api-client";

export function issueToken(userId: string): string {
  return Buffer.from(`dwas:${userId}`).toString("base64url");
}

export function readToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    if (!decoded.startsWith("dwas:")) return null;
    return decoded.slice(5);
  } catch {
    return null;
  }
}

export async function currentUser(token: string | null): Promise<SessionUserDto | null> {
  const id = readToken(token);
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    role: user.role as SessionUserDto["role"],
    language: user.language,
    isSeed: user.isSeed,
  };
}

export function tokenFromRequest(req: Request): string | null {
  return req.headers.get("x-demo-token");
}

export async function requireUser(req: Request): Promise<SessionUserDto> {
  const user = await currentUser(tokenFromRequest(req));
  if (!user) throw new HttpError(401, "unauthorized", "Sign in first.");
  return user;
}

export async function requireRole(req: Request, role: SessionUserDto["role"]): Promise<SessionUserDto> {
  const user = await requireUser(req);
  if (user.role !== role) throw new HttpError(403, "forbidden", `Only ${role}s may call this route.`);
  return user;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  return Response.json({ error: { code: "internal", message } }, { status: 500 });
}
