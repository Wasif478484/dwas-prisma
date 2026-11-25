// Booking DTO assembly with the privacy rules of C12: contact details are
// returned only to the two parties of a booking whose status is accepted or
// later. Before that, no client-readable payload contains a phone number.
import "server-only";
import { db } from "@/lib/db";
import { toBookingDoc, toReviewDto } from "@/lib/server/data";
import type { BookingDto, ContactDto, SessionUserDto } from "@/lib/api-client";
import type { BookingStatus } from "@/lib/types";
import type { Booking } from "@prisma/client";

const REVEAL_STATES: BookingStatus[] = ["accepted", "on_the_way", "in_progress", "completed", "reviewed"];

export async function buildBookingDto(
  bookingId: string,
  requester: SessionUserDto,
  row?: Booking,
): Promise<BookingDto> {
  const bookingRow = row ?? (await db.booking.findUnique({ where: { id: bookingId } }));
  if (!bookingRow) {
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }
  const doc = toBookingDoc(bookingRow);

  const [techRow, clientRow, reviewRow] = await Promise.all([
    db.technician.findUnique({ where: { id: doc.technicianId } }),
    db.user.findUnique({ where: { id: doc.clientId } }),
    db.review.findUnique({ where: { bookingId: doc.id } }),
  ]);

  const isClient = requester.id === doc.clientId;
  const isTech = requester.id === doc.technicianId;
  const isAdmin = requester.role === "admin";
  if (!isClient && !isTech && !isAdmin) {
    throw Object.assign(new Error("Not a booking party"), { status: 403 });
  }

  const revealed = doc.phoneRevealed && REVEAL_STATES.includes(doc.status);
  let contact: ContactDto | null = null;
  if (revealed && (isClient || isTech)) {
    if (isClient && techRow) {
      const techUser = await db.user.findUnique({ where: { id: techRow.id } });
      contact = { name: techRow?.name ?? "Technician", phone: techUser?.phone ?? null };
    } else if (isTech && clientRow) {
      contact = { name: clientRow.name, phone: clientRow.phone };
    }
  }

  return {
    ...doc,
    clientName: clientRow?.name ?? "Client",
    technicianName: techRow?.name ?? doc.technicianId,
    emergencyKind: bookingRow.emergencyKind,
    contact,
    review: reviewRow ? toReviewDto(reviewRow, techRow?.name) : null,
  };
}
