// GET /api/technicians/:id — public technician profile + recent visible
// reviews (C06). Unapproved profiles are only visible to the technician
// itself or an admin; everyone else gets a 404 so existence is not leaked.
import { db } from "@/lib/db";
import { currentUser, errorResponse, tokenFromRequest } from "@/lib/server/auth";
import { toReviewDto, toTechnicianPublic } from "@/lib/server/data";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const row = await db.technician.findUnique({ where: { id } });
    const requester = await currentUser(tokenFromRequest(req));
    const allowed = Boolean(
      row &&
        (row.approvalStatus === "approved" ||
          requester?.id === id ||
          requester?.role === "admin"),
    );
    if (!row || !allowed) {
      return Response.json({ error: { code: "not_found", message: "Technician not found." } }, { status: 404 });
    }

    const reviews = await db.review.findMany({
      where: { technicianId: id, hidden: false },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return Response.json({
      technician: toTechnicianPublic(row),
      reviews: reviews.map((review) => toReviewDto(review, row.name)),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
