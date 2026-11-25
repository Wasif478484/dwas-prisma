import { describe, expect, it } from "vitest";
import { classifyTrades, countHits } from "@/lib/rules/classify";
import { rateBand } from "@/lib/rate-table";
import { trustScore } from "@/lib/trust/score";

// Maintenance smoke test: the pure logic modules still typecheck and behave.
describe("smoke", () => {
  it("classifies a common problem", () => {
    expect(classifyTrades("geyser se pani tapak raha hai").trade).toBe("plumber");
    expect(countHits("pankha band ho gaya hai", ["pankha", "fan"])).toBeGreaterThan(0);
  });

  it("rate band falls back to the trade default", () => {
    expect(rateBand("plumber", "tap_leak", [{ trade: "plumber", jobType: "tap_leak", minPKR: 500, maxPKR: 1500 }])).toEqual({
      min: 500,
      max: 1500,
    });
  });

  it("trust score is bounded 0..100", () => {
    expect(trustScore({ jobsCompleted: 0, ratingSum: 0, ratingCount: 0, avgResponseSec: null, noShowCount: 0 })).toBeGreaterThanOrEqual(0);
    expect(trustScore({ jobsCompleted: 50, ratingSum: 250, ratingCount: 50, avgResponseSec: 60, noShowCount: 0 })).toBeLessThanOrEqual(100);
  });
});
