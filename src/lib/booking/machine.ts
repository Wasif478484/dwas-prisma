// Spec §7.4 booking state machine. Pure: no Firestore, no I/O.
import { OVER_BAND_PCT, QUICKBOOK_STEP_SEC } from "@/lib/config";
import type { BookingDoc, BookingStatus, Role } from "@/lib/types";

export type Actor = Role | "system";

export interface TransitionPayload {
  now?: number;
  reason?: string;
  finalPrice?: number;
  stars?: 1 | 2 | 3 | 4 | 5;
}

export class TransitionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TransitionError";
  }
}

export const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ["accepted", "declined", "expired", "cancelled_client"],
  accepted: ["on_the_way", "cancelled_client", "cancelled_tech", "no_show"],
  on_the_way: ["in_progress", "cancelled_client", "cancelled_tech", "no_show"],
  in_progress: ["completed"],
  completed: ["reviewed", "disputed"],
  declined: [],
  expired: [],
  cancelled_client: [],
  cancelled_tech: [],
  no_show: [],
  reviewed: [],
  disputed: [],
};

function requireActor(actor: Actor, expected: Actor, to: BookingStatus): void {
  if (actor !== expected) {
    throw new TransitionError("forbidden_actor", `Only ${expected} may move a booking to ${to}`);
  }
}

// C16: a no-show can only be reported 30 minutes after the scheduled time.
export function noShowEligible(booking: BookingDoc, now = Date.now()): boolean {
  if (typeof booking.scheduledFor !== "number") return false;
  if (booking.status !== "accepted" && booking.status !== "on_the_way") return false;
  return now >= booking.scheduledFor + 30 * 60_000;
}

// The only function that changes booking.status.
export function transition(
  booking: BookingDoc,
  to: BookingStatus,
  actor: Actor,
  payload: TransitionPayload = {},
): BookingDoc {
  const from = booking.status;
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new TransitionError("invalid_transition", `Cannot move ${from} to ${to}`);
  }
  const now = payload.now ?? Date.now();
  let reason = payload.reason;
  const next: BookingDoc = { ...booking, status: to, statusHistory: [...booking.statusHistory] };

  switch (`${from}->${to}`) {
    case "requested->accepted": {
      requireActor(actor, "technician", to);
      if (now >= booking.expiresAt) {
        throw new TransitionError("request_expired", "Request has expired");
      }
      next.phoneRevealed = true;
      const requestedAt = booking.statusHistory.find((h) => h.status === "requested")?.at ?? booking.createdAt;
      const replySec = Math.max(0, Math.round((now - requestedAt) / 1000));
      reason = `reply_sec:${replySec}`;
      break;
    }
    case "requested->declined":
      requireActor(actor, "technician", to);
      reason = reason ?? "declined";
      next.attempts = [...booking.attempts, { technicianId: booking.technicianId, at: now, result: "declined" }];
      next.candidates = booking.candidates.filter((id) => id !== booking.technicianId);
      break;
    case "requested->expired":
      requireActor(actor, "system", to);
      if (now <= booking.expiresAt) {
        throw new TransitionError("request_not_expired", "Request has not expired");
      }
      reason = reason ?? "expired";
      next.attempts = [...booking.attempts, { technicianId: booking.technicianId, at: now, result: "expired" }];
      next.candidates = booking.candidates.filter((id) => id !== booking.technicianId);
      break;
    case "requested->cancelled_client":
    case "accepted->cancelled_client":
    case "on_the_way->cancelled_client":
      requireActor(actor, "client", to);
      break;
    case "accepted->cancelled_tech":
    case "on_the_way->cancelled_tech":
      requireActor(actor, "technician", to);
      break;
    case "accepted->no_show":
    case "on_the_way->no_show": {
      requireActor(actor, "client", to);
      if (booking.scheduledFor === undefined) {
        reason = reason ? `${reason};no_scheduled_for` : "no_scheduled_for";
      } else if (now < booking.scheduledFor + 30 * 60_000) {
        throw new TransitionError("too_early", "No-show can only be reported 30 minutes after the scheduled time");
      }
      break;
    }
    case "accepted->on_the_way":
      requireActor(actor, "technician", to);
      break;
    case "on_the_way->in_progress":
      requireActor(actor, "technician", to);
      break;
    case "in_progress->completed": {
      requireActor(actor, "technician", to);
      const price = payload.finalPrice;
      if (price === undefined || !Number.isFinite(price) || price < 0) {
        throw new TransitionError("invalid_final_price", "A valid finalPrice is required to complete a job");
      }
      next.finalPrice = price;
      if (booking.priceBand && price > booking.priceBand.max * (1 + OVER_BAND_PCT / 100)) {
        reason = "over_band_confirmation_required";
      }
      break;
    }
    case "completed->reviewed": {
      requireActor(actor, "client", to);
      if (!payload.stars || payload.stars < 1 || payload.stars > 5) {
        throw new TransitionError("invalid_stars", "Stars must be between 1 and 5");
      }
      break;
    }
    case "completed->disputed":
      requireActor(actor, "client", to);
      reason = reason ?? "price_rejected";
      break;
  }

  next.statusHistory.push({
    status: to,
    at: now,
    actor,
    ...(reason ? { reason } : {}),
  });
  return next;
}

// Quick book: a declined/expired request is re-offered to the next candidate
// without changing status (so `transition` stays the only status change).
export function quickBookNext(booking: BookingDoc, result: "declined" | "expired", now = Date.now()): BookingDoc | null {
  const index = booking.candidates.findIndex((id) => id !== booking.technicianId);
  if (index < 0) return null;
  const nextId = booking.candidates[index];
  return {
    ...booking,
    technicianId: nextId,
    candidates: booking.candidates.filter((_, i) => i !== index),
    expiresAt: now + QUICKBOOK_STEP_SEC * 1000,
    phoneRevealed: false,
    attempts: [...booking.attempts, { technicianId: booking.technicianId, at: now, result }],
    statusHistory: [
      ...booking.statusHistory,
      { status: "requested", at: now, actor: "system", reason: `quick_book_after_${result}` },
    ],
  };
}
