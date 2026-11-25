// Spec §7.1: zod schemas for the LLM output and the per-trade allowed jobType
// lists (appended to the prompt, spec §7.1: "Append the allowed jobType list
// per trade (section 11)"). Every field tolerates model omissions with a safe
// default so a partial JSON reply still parses; the merge step (§7.1) then
// decides what to trust. The emergency detection is always ORed with the
// rules detector, so a wrong default can never suppress a safety notice.
import { z } from "zod";
import type { Trade } from "@/lib/types";

export const TRADE_JOB_TYPES: Record<Exclude<Trade, "unknown">, string[]> = {
  plumber: ["tap_leak", "drain_block", "geyser_issue", "tank_pump", "pipe_burst"],
  electrician: ["switch_socket", "wiring_fault", "fan", "ups_inverter", "short_circuit"],
  ac_fridge: ["ac_not_cooling", "ac_gas", "ac_install", "fridge_not_cooling"],
  carpenter: ["door_lock", "door_repair", "furniture_repair", "cupboard"],
  mazdoor: ["day_labour", "shifting_help", "cleaning_help"],
};

export const intakeLLMResultSchema = z.object({
  trade: z.enum(["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor", "unknown"]).catch("unknown"),
  jobType: z.string().max(60).catch("other"),
  urgency: z.enum(["now", "today", "tomorrow", "flexible"]).catch("today"),
  emergency: z
    .object({
      is_emergency: z.boolean().catch(false),
      kind: z.enum(["gas", "electrical", "fire", "flood", "none"]).catch("none"),
    })
    .catch({ is_emergency: false, kind: "none" as const }),
  summary_en: z.string().min(1).max(400).catch("Household problem described by the client."),
  summary_ur: z.string().min(1).max(400).catch("گھریلو مسئلہ"),
  confidence: z.number().min(0).max(1).catch(0.5),
  language_detected: z.enum(["ur", "roman_ur", "en", "mixed"]).catch("roman_ur"),
  needs_clarification: z.boolean().catch(false),
  clarifying_question_ur: z.string().max(300).nullable().catch(null),
});
export type IntakeLLMResult = z.infer<typeof intakeLLMResultSchema>;
