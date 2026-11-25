// Spec §7.1: "Count keyword hits per trade; the highest count wins; a tie
// gives unknown. Confidence is 0.5 for one hit and 0.8 for two or more."
import type { Trade, Urgency } from "@/lib/types";
import { TRADE_KEYWORDS, URGENCY_NOW_KEYWORDS, URGENCY_TOMORROW_KEYWORDS } from "./keywords";

export interface RulesTradeResult {
  trade: Trade | "unknown";
  confidence: number;
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\s]/gu, " ").trim();
}

export function countHits(text: string, keywords: string[]): number {
  const normalised = normalise(text);
  if (!normalised) return 0;
  return keywords.filter((keyword) => normalised.includes(normalise(keyword))).length;
}

export function classifyTrades(text: string): RulesTradeResult {
  const rows = (Object.keys(TRADE_KEYWORDS) as Trade[]).map((trade) => ({
    trade,
    hits: countHits(text, TRADE_KEYWORDS[trade]),
  }));
  const max = Math.max(...rows.map((r) => r.hits));
  if (max === 0) return { trade: "unknown", confidence: 0 };
  const winners = rows.filter((r) => r.hits === max);
  if (winners.length > 1) return { trade: "unknown", confidence: 0 };
  return { trade: winners[0].trade, confidence: max >= 2 ? 0.8 : 0.5 };
}

export function classifyUrgency(text: string): Urgency {
  if (countHits(text, URGENCY_NOW_KEYWORDS) > 0) return "now";
  if (countHits(text, URGENCY_TOMORROW_KEYWORDS) > 0) return "tomorrow";
  return "today";
}
