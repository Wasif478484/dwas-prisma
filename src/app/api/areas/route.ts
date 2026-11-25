// GET /api/areas — the 7 service areas (spec section 11.2) for the client
// location picker (C05). Reads the Area table; falls back to the AREAS const
// when the table is empty so the picker works even before seeding.
import { db } from "@/lib/db";
import { AREAS } from "@/lib/areas";
import { errorResponse } from "@/lib/server/auth";
import type { AreaDto } from "@/lib/api-client";

export async function GET() {
  try {
    const rows = await db.area.findMany({ orderBy: { name: "asc" } });
    const areas: AreaDto[] = rows.length
      ? rows.map((row) => ({ id: row.id, name: row.name, city: row.city, lat: row.lat, lng: row.lng }))
      : AREAS.map((area) => ({ id: area.id, name: area.name, city: area.city, lat: area.lat, lng: area.lng }));
    return Response.json({ areas });
  } catch (error) {
    return errorResponse(error);
  }
}
