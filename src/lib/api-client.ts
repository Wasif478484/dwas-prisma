// Typed API client — the single contract between the DWAS SPA and the API
// routes. Every helper sends the demo token when a session exists and
// surfaces spec-shaped errors as thrown ApiError.
"use client";

import type { BookingDoc, IntakeResult, MatchResult, ReviewDoc, Trade } from "@/lib/types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function token(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("dwas-state");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return parsed.state?.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as Record<string, string>) };
  const t = token();
  if (t) headers["x-demo-token"] = t;
  const res = await fetch(path, { ...init, headers, cache: "no-store" });
  const body = (await res.json().catch(() => null)) as (T & { error?: { code: string; message: string } }) | null;
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(res.status, err?.code ?? "unknown", err?.message ?? `Request failed (${res.status})`);
  }
  return body as T;
}

function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}
function post<T>(path: string, data?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) });
}
function patch<T>(path: string, data: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(data) });
}

// ---- Types shared with the API routes ----

export interface SessionUserDto {
  id: string;
  name: string;
  role: "client" | "technician" | "admin";
  language: string;
  isSeed: boolean;
}

export interface AreaDto {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

export interface TechnicianPublicDto {
  id: string;
  name: string;
  photoUrl: string | null;
  workPhotos: string[];
  trades: Trade[];
  yearsExperience: number;
  bioUr: string | null;
  bioEn: string | null;
  visitFeePKR: number | null;
  areaId: string | null;
  isOnline: boolean;
  approvalStatus: string;
  badges: string[];
  trustScore: number;
  stats: {
    jobsCompleted: number;
    ratingSum: number;
    ratingCount: number;
    ratingAvg: number | null;
    avgResponseSec: number | null;
    noShowCount: number;
  };
  isSeed: boolean;
}

export interface MatchCardDto extends MatchResult {
  avgResponseSec: number | null;
  visitFeePKR: number | null;
}

export interface ContactDto {
  name: string;
  phone: string | null;
}

export interface BookingDto extends BookingDoc {
  clientName: string;
  technicianName: string;
  emergencyKind: string;
  contact: ContactDto | null;
  review?: ReviewDto | null;
}

export interface IntakeResponse {
  intake: IntakeResult;
}

export interface MatchResponse {
  results: MatchCardDto[];
}

export interface CreateBookingInput {
  technicianId?: string;
  quick?: boolean;
  intake: IntakeResult;
  location: { lat: number; lng: number; areaId: string; note: string };
}

export interface AdminDataDto {
  stats: {
    bookingsTotal: number;
    approvedTechnicians: number;
    pendingTechnicians: number;
    acceptRate: number;
    avgRating: number | null;
    voiceOkRate: number;
    fallbackRate: number;
    avgAcceptSec: number | null;
    bookingsPerDay: { day: string; count: number }[];
    bookingsPerTrade: { trade: string; count: number }[];
    intakeSource: { source: string; count: number }[];
  };
  technicians: TechnicianPublicDto[];
  bookings: BookingDto[];
  reviews: ReviewDto[];
  complaints: ComplaintDto[];
}

export interface ReviewDto {
  id: string;
  bookingId: string;
  clientId: string;
  technicianId: string;
  technicianName?: string;
  stars: number;
  tags: string[];
  comment: string | null;
  hidden: boolean;
  createdAt: number;
}

export interface ComplaintDto {
  id: string;
  bookingId: string;
  kind: string;
  text: string;
  raisedBy: string;
  status: string;
  resolvedBy: string | null;
  note: string | null;
  createdAt: number;
}

export interface OnboardProfileDto {
  trades: Trade[];
  yearsExperience: number;
  serviceAreaIds: string[];
  serviceAreaText: string | null;
  visitFeePKR: number | null;
  bio_ur: string | null;
  confidence: { trades: number; years: number; areas: number; fee: number };
}

// ---- Endpoints ----

export const api = {
  health: () => get<{ ok: boolean; db: boolean; llm: boolean }>("/api/health"),

  mockOtp: (data: { phone: string; code: string; role: SessionUserDto["role"]; name?: string }) =>
    post<{ token: string; user: SessionUserDto }>("/api/auth/mock-otp", data),

  areas: () => get<{ areas: AreaDto[] }>("/api/areas"),

  intake: (text: string, lang?: string) => post<IntakeResponse>("/api/intake", { text, lang, llm: true }),

  match: (data: { trade: Trade; jobType: string; urgency: string; lat: number; lng: number; areaId: string }) =>
    post<MatchResponse>("/api/match", data),

  createBooking: (data: CreateBookingInput) => post<{ booking: BookingDto }>("/api/bookings", data),

  getBooking: (id: string) => get<{ booking: BookingDto }>(`/api/bookings/${id}`),

  tickBooking: (id: string) => post<{ booking: BookingDto }>(`/api/bookings/${id}/tick`),

  bookingStatus: (id: string, data: { to: string; finalPrice?: number; reason?: string }) =>
    patch<{ booking: BookingDto }>(`/api/bookings/${id}/status`, data),

  reviewBooking: (id: string, data: { stars: number; tags: string[]; comment?: string }) =>
    post<{ booking: BookingDto }>(`/api/bookings/${id}/review`, data),

  complaint: (id: string, data: { kind: string; text: string }) =>
    post<{ ok: boolean }>(`/api/bookings/${id}/complaint`, data),

  clientBookings: () => get<{ bookings: BookingDto[] }>("/api/client/bookings"),

  technicianPublic: (id: string) =>
    get<{ technician: TechnicianPublicDto; reviews: ReviewDto[] }>(`/api/technicians/${id}`),

  techMe: () => get<{ technician: TechnicianPublicDto }>("/api/tech/me"),

  techJobs: () => get<{ incoming: BookingDto[]; active: BookingDto[] }>("/api/tech/jobs"),

  techProfile: (data: Partial<{ isOnline: boolean; trades: Trade[]; yearsExperience: number; visitFeePKR: number; bioUr: string; bioEn: string; areaId: string; radiusKm: number; name: string }>) =>
    patch<{ technician: TechnicianPublicDto }>("/api/technicians/me", data),

  onboardParse: (data: { transcript: string; language?: string }) =>
    post<{ profile: OnboardProfileDto }>("/api/technicians/onboard-parse", data),

  adminData: () => get<AdminDataDto>("/api/admin/data"),

  adminApproval: (id: string, data: { action: "approve" | "reject" | "suspend" | "reinstate"; note?: string }) =>
    post<{ ok: boolean }>(`/api/admin/technicians/${id}/approval`, data),

  adminReview: (id: string, data: { hidden: boolean }) =>
    patch<{ ok: boolean }>(`/api/admin/reviews/${id}`, data),

  adminResolveComplaint: (id: string, data: { note?: string }) =>
    post<{ ok: boolean }>(`/api/admin/complaints/${id}/resolve`, data),

  adminReset: () => post<{ ok: boolean }>("/api/admin/demo/reset"),

  adminExport: () => get<{ csv: string }>("/api/admin/export"),
};
