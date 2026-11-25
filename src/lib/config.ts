// DWAS build specification v1.0 — section 5.3 constants.
export const REQUEST_EXPIRY_SEC = 300;
export const QUICKBOOK_STEP_SEC = 120;
export const MATCH_MAX_KM = 15;
export const MATCH_MAX_KM_NOW = 6;
export const OVER_BAND_PCT = 25;
export const TECH_IDLE_OFFLINE_HOURS = 4;
export const NEWCOMER_JOBS = 5;
export const INTAKE_TIMEOUT_MS = 4000;
export const INTAKE_MAX_CHARS = 500;
export const EMERGENCY_NUMBERS = "Rescue 1122 and gas utility emergency line; the team must confirm numbers before launch";
export const CANCEL_REASONS = ["busy", "too_far", "not_needed", "reschedule"] as const;
