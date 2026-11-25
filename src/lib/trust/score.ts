// DWAS spec §7.3 / §12.2 — trust score and badge derivation (pure maths).
// Ported from the team's repo, Firebase I/O removed; persistence happens in
// the API routes via Prisma using the same derivation.
import { NEWCOMER_JOBS } from "@/lib/config";
import { bayesianRating, clamp01 } from "@/lib/match/score";
import type { Approval } from "@/lib/types";

export interface Stats {
  jobsCompleted: number;
  ratingSum: number;
  ratingCount: number;
  avgResponseSec: number | null;
  noShowCount: number;
}

export interface ReviewLike {
  stars: number;
  hidden?: boolean;
}

// Badges derived here are rebuilt on every recompute; only other keys survive.
const DERIVED = new Set(["admin_approved", "five_jobs", "top_rated", "fast_replies", "newcomer"]);

export function nonDerivedBadges(badges: string[] = []): string[] {
  return badges.filter((badge) => !DERIVED.has(badge) && !/verified/i.test(badge));
}

export function ratingsFromReviews(reviews: ReviewLike[]): { ratingSum: number; ratingCount: number } {
  const visible = reviews.filter((review) => review.hidden !== true && typeof review.stars === "number");
  return {
    ratingSum: visible.reduce((sum, review) => sum + review.stars, 0),
    ratingCount: visible.length,
  };
}

export function rating01(stats: Pick<Stats, "ratingSum" | "ratingCount">): number {
  return clamp01((bayesianRating(stats.ratingSum, stats.ratingCount) - 1) / 4);
}

export function trustScore(stats: Stats): number {
  // Spec §7.3: round(100 * (0.7*r + 0.3*v)). Integer weights avoid the
  // floating-point artifact where 100*(0.7*0.75) rounds down to 52.
  return Math.round(70 * rating01(stats) + 30 * Math.min(stats.jobsCompleted / 50, 1));
}

export function computeBadges(
  stats: Stats,
  opts: { approvalStatus?: Approval; manualBadges?: string[] },
): string[] {
  const derived: string[] = [];
  if (opts.approvalStatus === "approved") derived.push("admin_approved");
  if (stats.jobsCompleted >= NEWCOMER_JOBS) derived.push("five_jobs");
  if (stats.ratingCount >= 10 && stats.ratingSum / stats.ratingCount >= 4.5) derived.push("top_rated");
  if (stats.avgResponseSec !== null && stats.avgResponseSec <= 180 && stats.jobsCompleted >= NEWCOMER_JOBS) {
    derived.push("fast_replies");
  }
  if (stats.jobsCompleted < NEWCOMER_JOBS) derived.push("newcomer");
  return [...new Set([...derived, ...nonDerivedBadges(opts.manualBadges)])];
}

export function deriveTechnicianTrust(input: {
  jobsCompleted: number;
  ratingSum: number;
  ratingCount: number;
  avgResponseSec: number | null;
  noShowCount: number;
  approvalStatus?: Approval;
  manualBadges?: string[];
}): { stats: Stats; badges: string[]; trustScore: number } {
  const stats: Stats = {
    jobsCompleted: input.jobsCompleted,
    ratingSum: input.ratingSum,
    ratingCount: input.ratingCount,
    avgResponseSec: input.avgResponseSec,
    noShowCount: input.noShowCount,
  };
  return {
    stats,
    badges: computeBadges(stats, { approvalStatus: input.approvalStatus, manualBadges: input.manualBadges }),
    trustScore: trustScore(stats),
  };
}
