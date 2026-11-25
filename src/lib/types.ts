// DWAS build specification v1.0 — Appendix A. Exact type shapes.
export type Trade = 'plumber' | 'electrician' | 'ac_fridge' | 'carpenter' | 'mazdoor';
export type Urgency = 'now' | 'today' | 'tomorrow' | 'flexible';
export type Role = 'client' | 'technician' | 'admin';
export type Approval = 'pending' | 'approved' | 'rejected' | 'suspended';
export type BookingStatus =
  | 'requested' | 'accepted' | 'declined' | 'expired' | 'cancelled_client' | 'cancelled_tech'
  | 'on_the_way' | 'in_progress' | 'completed' | 'reviewed' | 'disputed' | 'no_show';
export interface GeoPoint { lat: number; lng: number; areaId?: string }
export interface IntakeResult {
  trade: Trade | 'unknown'; jobType: string; urgency: Urgency;
  emergency: { is_emergency: boolean; kind: 'gas' | 'electrical' | 'fire' | 'flood' | 'none' };
  summary_en: string; summary_ur: string; confidence: number;
  language_detected: 'ur' | 'roman_ur' | 'en' | 'mixed';
  needs_clarification: boolean; clarifying_question_ur: string | null;
  source: 'llm' | 'rules' | 'merged';
}
export interface TechnicianDoc {
  id: string; name: string; photoUrl?: string; workPhotos: string[];
  trades: Trade[]; yearsExperience: number; bio_ur?: string; bio_en?: string;
  visitFeePKR?: number; center: GeoPoint; radiusKm: number;
  isOnline: boolean; lastActiveAt: number; approvalStatus: Approval; badges: string[];
  stats: { jobsCompleted: number; ratingSum: number; ratingCount: number;
           avgResponseSec: number | null; noShowCount: number };
  isSeed?: boolean;
}
export interface MatchResult {
  technicianId: string; name: string; trades: Trade[]; photoUrl?: string;
  distanceKmRounded: number; ratingAvg: number | null; jobsCompleted: number;
  priceBand: { min: number; max: number } | null; score: number;
  reasons: { key: string; value?: number }[]; isNewcomerSlot: boolean;
}
export interface BookingDoc {
  id: string; clientId: string; technicianId: string; trade: Trade; jobType: string;
  problemRaw: string; summary_en: string; summary_ur: string; urgency: Urgency;
  location: GeoPoint & { note?: string };
  priceBand: { min: number; max: number } | null; finalPrice?: number;
  status: BookingStatus;
  statusHistory: { status: BookingStatus; at: number; actor: Role | 'system'; reason?: string }[];
  candidates: string[]; attempts: { technicianId: string; at: number; result: string }[];
  expiresAt: number; scheduledFor?: number; photoUrls: string[];
  phoneRevealed: boolean; shareToken: string; createdAt: number;
}
export interface ReviewDoc {
  bookingId: string; clientId: string; technicianId: string;
  stars: 1 | 2 | 3 | 4 | 5; tags: string[]; comment?: string; hidden: boolean; createdAt: number;
}
