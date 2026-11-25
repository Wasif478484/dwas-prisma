// Spec §7.1 rules classifier + emergency detector (§6 keywords in keywords.ts).
import { EMERGENCY_KEYWORDS } from "./keywords";

export interface EmergencyResult {
  is_emergency: boolean;
  kind: "gas" | "electrical" | "fire" | "flood" | "none";
}

export function detectEmergency(text: string): EmergencyResult {
  const normalised = text.toLowerCase();
  for (const kind of ["gas", "electrical", "fire", "flood"] as const) {
    if (EMERGENCY_KEYWORDS[kind].some((keyword) => normalised.includes(keyword.toLowerCase()))) {
      return { is_emergency: true, kind };
    }
  }
  return { is_emergency: false, kind: "none" };
}
