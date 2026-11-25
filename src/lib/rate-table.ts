// Rate table lookup (spec D03). Prices are read from seeded rateTable docs —
// the LLM never produces prices.
import { OVER_BAND_PCT } from "./config";
import type { Trade } from "./types";

export interface RateTableRow {
  trade: Trade;
  jobType: string;
  minPKR: number;
  maxPKR: number;
  note?: string;
}

export function rateBand(
  trade: Trade,
  jobType: string,
  rows: RateTableRow[],
): { min: number; max: number } {
  const row = rows.find((r) => r.trade === trade && r.jobType === jobType);
  if (row) return { min: row.minPKR, max: row.maxPKR };
  const tradeDefault = rows.find((r) => r.trade === trade);
  if (tradeDefault) return { min: tradeDefault.minPKR, max: tradeDefault.maxPKR };
  throw new Error(`No rate row or trade default for ${trade}/${jobType}`);
}

// C11: a final price is over band only when it exceeds max by more than pct.
export function isOverBand(
  priceBand: { min: number; max: number } | null,
  finalPrice: number | undefined,
  overBandPct: number = OVER_BAND_PCT,
): boolean {
  if (!priceBand || finalPrice === undefined) return false;
  return finalPrice > priceBand.max * (1 + overBandPct / 100);
}
