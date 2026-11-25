// Spec §7.1 + §11.1 keyword groups for the rules classifier (D01). Keywords
// come in Roman Urdu and Urdu script; native review of the Urdu lists is
// tracked in DECISIONS.md.
import type { Trade } from "@/lib/types";

export const TRADE_KEYWORDS: Record<Trade, string[]> = {
  plumber: [
    "nal", "nalka", "tonti", "tap", "pani", "tapak", "leak", "tank", "motor",
    "geyser", "pipe", "nali", "drain", "block", "flush", "commode", "washroom", "bathroom",
  ],
  electrician: [
    "bijli", "current", "switch", "socket", "wire", "wiring", "taar", "fan", "pankha",
    "light", "bulb", "meter", "ups", "inverter", "short circuit", "trip", "mcb",
  ],
  ac_fridge: [
    "ac", "air conditioner", "fridge", "freezer", "thanda nahi", "cooling",
    "gas bharwani", "compressor", "washing machine", "geyser",
  ],
  carpenter: [
    "darwaza", "door", "lock", "kundi", "almari", "cupboard", "furniture",
    "kursi", "table", "bed", "lakri", "wood", "polish",
  ],
  mazdoor: [
    "mazdoor", "labour", "helper", "saman", "shift", "shifting", "safai",
    "khudai", "utarna", "uthana", "loading",
  ],
};

export const EMERGENCY_KEYWORDS: Record<"gas" | "electrical" | "fire" | "flood", string[]> = {
  gas: ["gas ki boo", "gas leak", "cylinder", "gas lag rahi"],
  electrical: ["current lag raha", "current laga", "chingari", "sparking", "shock", "short circuit", "jalne ki boo"],
  fire: ["aag", "dhuan", "fire", "jal raha"],
  flood: ["pani bhar gaya", "sailab", "chhat se pani", "pipe phat gaya"],
};

export const URGENCY_NOW_KEYWORDS = ["abhi", "foran", "jaldi", "urgent", "emergency", "fauran"];
export const URGENCY_TOMORROW_KEYWORDS = ["kal", "subah", "agle din"];
