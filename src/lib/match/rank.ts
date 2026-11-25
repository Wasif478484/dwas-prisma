// DWAS spec §7.2 / C06 — deterministic technician ranking. Pure: no I/O.
import { MATCH_MAX_KM, MATCH_MAX_KM_NOW, NEWCOMER_JOBS } from "@/lib/config";
import type { MatchResult, TechnicianDoc, Trade, Urgency } from "@/lib/types";
import { bayesianRating, clamp01, haversineKm, roundDistance } from "./score";

export interface RankInput {
  trade: Trade;
  urgency: Urgency;
  client: { lat: number; lng: number };
  technicians: TechnicianDoc[];
  now: Date;
}

// Payload the match API returns on top of MatchResult (reply time is needed by
// the results card and MatchResult has no field for it).
export type MatchCard = MatchResult & { avgResponseSec: number | null };

type Weights = {
  proximity: number; rating: number; experience: number;
  reply: number; availability: number; volume: number;
};

const WEIGHTS: Record<"normal" | "urgent", Weights> = {
  normal: { proximity: 0.35, rating: 0.25, experience: 0.1, reply: 0.1, availability: 0.1, volume: 0.1 },
  urgent: { proximity: 0.45, rating: 0.2, experience: 0.05, reply: 0.15, availability: 0.1, volume: 0.05 },
};

interface RankedRow {
  tech: TechnicianDoc;
  distanceKm: number;
  score: number;
}

function ratingAvg(tech: TechnicianDoc): number | null {
  if (tech.stats.ratingCount <= 0) return null;
  return Math.round((tech.stats.ratingSum / tech.stats.ratingCount) * 10) / 10;
}

function ratingSignal(tech: TechnicianDoc): number {
  return clamp01((bayesianRating(tech.stats.ratingSum, tech.stats.ratingCount) - 1) / 4);
}

function scoreTech(row: Omit<RankedRow, "score">, weights: Weights, maxKm: number): number {
  const { tech, distanceKm } = row;
  const stats = tech.stats;
  const score =
    weights.proximity * Math.max(0, 1 - distanceKm / maxKm) +
    weights.rating * ratingSignal(tech) +
    weights.experience * Math.min(tech.yearsExperience / 15, 1) +
    weights.reply * (stats.avgResponseSec === null ? 0.5 : 1 - Math.min(stats.avgResponseSec / 600, 1)) +
    weights.availability * (tech.isOnline ? 1 : 0.4) +
    weights.volume * Math.min(stats.jobsCompleted / 50, 1) -
    Math.min(stats.noShowCount, 3) * 0.1;
  return Math.round(clamp01(score) * 10000) / 10000;
}

function reasonsFor(row: RankedRow, rows: RankedRow[], newcomerSlot: boolean): MatchResult["reasons"] {
  const reasons: MatchResult["reasons"] = [];
  if (newcomerSlot) reasons.push({ key: "newcomer" });
  const nearest = Math.min(...rows.map((r) => r.distanceKm));
  if (row.distanceKm <= nearest + 1e-9) {
    reasons.push({ key: "nearest", value: roundDistance(row.distanceKm) });
  }
  const avg = ratingAvg(row.tech);
  if (avg !== null && avg >= 4.5) reasons.push({ key: "top_rated", value: avg });
  const reply = row.tech.stats.avgResponseSec;
  if (reply !== null && reply <= 180) reasons.push({ key: "fast_replies", value: reply });
  if (row.tech.stats.jobsCompleted >= 25) reasons.push({ key: "many_jobs", value: row.tech.stats.jobsCompleted });
  return reasons.slice(0, 2);
}

function toResult(row: RankedRow, rows: RankedRow[], newcomerSlot = false): MatchResult {
  return {
    technicianId: row.tech.id,
    name: row.tech.name,
    trades: row.tech.trades,
    photoUrl: row.tech.photoUrl,
    distanceKmRounded: roundDistance(row.distanceKm),
    ratingAvg: ratingAvg(row.tech),
    jobsCompleted: row.tech.stats.jobsCompleted,
    priceBand: null, // filled by the API from the rate table
    score: row.score,
    reasons: reasonsFor(row, rows, newcomerSlot),
    isNewcomerSlot: newcomerSlot,
  };
}

export function rankTechnicians(input: RankInput): MatchResult[] {
  const urgent = input.urgency === "now";
  const weights = urgent ? WEIGHTS.urgent : WEIGHTS.normal;
  const maxKm = urgent ? MATCH_MAX_KM_NOW : MATCH_MAX_KM;
  const needsOnline = input.urgency === "now" || input.urgency === "today";

  const rows: RankedRow[] = [];
  for (const tech of input.technicians) {
    if (tech.approvalStatus !== "approved") continue; // excludes suspended too
    if (!tech.trades.includes(input.trade)) continue;
    const distanceKm = haversineKm(input.client, tech.center);
    if (distanceKm > Math.min(tech.radiusKm, maxKm)) continue;
    if (needsOnline && !tech.isOnline) continue;
    rows.push({ tech, distanceKm, score: 0 });
  }
  for (const row of rows) row.score = scoreTech(row, weights, maxKm);

  rows.sort(
    (a, b) =>
      b.score - a.score ||
      a.distanceKm - b.distanceKm ||
      b.tech.lastActiveAt - a.tech.lastActiveAt,
  );

  const result = rows.map((row) => toResult(row, rows));
  // One reserved slot in a full top five so newcomers can get a first job.
  if (result.length >= 5 && !result.slice(0, 5).some((r) => r.jobsCompleted < NEWCOMER_JOBS)) {
    const newcomer = rows.slice(5).find((r) => r.tech.stats.jobsCompleted < NEWCOMER_JOBS);
    if (newcomer) result[4] = toResult(newcomer, rows, true);
  }
  return result;
}
