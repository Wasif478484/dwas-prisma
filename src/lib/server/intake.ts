// Spec §7.1 intake pipeline (D01): normalise -> rules classifier -> LLM ->
// zod validation -> merge. Emergency is rules OR LLM, so the safety notice
// fires even with the LLM switched off (S3). The LLM never produces prices.
import { INTAKE_MAX_CHARS, INTAKE_TIMEOUT_MS } from "@/lib/config";
import { classifyTrades, classifyUrgency } from "@/lib/rules/classify";
import { detectEmergency } from "@/lib/rules/emergency";
import { buildIntakeSystemPrompt } from "@/lib/llm/prompt";
import { intakeLLMResultSchema } from "@/lib/llm/schema";
import { getLLMClient } from "@/lib/llm/provider";
import type { IntakeResult } from "@/lib/types";

export function normaliseText(raw: string): string {
  return raw
    .slice(0, INTAKE_MAX_CHARS)
    // strip control characters
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim();
}

function looksLikeUrduScript(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function isRomanUrdu(text: string): boolean {
  return /\b(se|hai|hain|kar|raha|rahi|nahi|chahiye|kaam|masla|pani|band|tuta|toot)\b/i.test(text);
}

function detectLanguage(text: string): IntakeResult["language_detected"] {
  const urdu = looksLikeUrduScript(text);
  const roman = isRomanUrdu(text);
  const english = /\b(is|the|and|not|working|need|my|broken)\b/i.test(text);
  if (urdu && (roman || english)) return "mixed";
  if (urdu) return "ur";
  if (roman && english) return "mixed";
  if (roman) return "roman_ur";
  return "en";
}

async function callLLM(text: string, timeoutMs: number): Promise<intakeLLMResult | null> {
  try {
    const client = getLLMClient();
    if (!client) return null;
    const result = await Promise.race([
      (async () => {
        const raw = await client.call(buildIntakeSystemPrompt(), text);
        // The model must reply with one JSON object; tolerate code fences.
        const jsonText = raw.replace(/^```(?:json)?/m, "").replace(/```\s*$/m, "").trim();
        const start = jsonText.indexOf("{");
        const end = jsonText.lastIndexOf("}");
        if (start < 0 || end <= start) return null;
        return intakeLLMResultSchema.parse(JSON.parse(jsonText.slice(start, end + 1)));
      })(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return result;
  } catch {
    return null;
  }
}

type intakeLLMResult = import("zod").infer<typeof intakeLLMResultSchema>;

export async function runIntake(text: string, opts: { useLLM?: boolean } = {}): Promise<IntakeResult> {
  const clean = normaliseText(text);

  // Rules classifier runs always and takes about a millisecond (spec §7.1).
  const rulesTrade = classifyTrades(clean);
  const rulesUrgency = classifyUrgency(clean);
  const rulesEmergency = detectEmergency(clean);

  const useLLM = opts.useLLM !== false;
  const llm = useLLM ? await callLLM(clean, INTAKE_TIMEOUT_MS) : null;

  // Merge (spec §7.1): emergency ORed; trade from LLM when confident enough,
  // otherwise rules; urgency from LLM, else rules, else today.
  const emergency = {
    is_emergency: rulesEmergency.is_emergency || (llm?.emergency.is_emergency ?? false),
    kind: rulesEmergency.is_emergency
      ? rulesEmergency.kind
      : llm?.emergency.is_emergency
        ? llm.emergency.kind
        : "none",
  } as IntakeResult["emergency"];

  let trade: IntakeResult["trade"] = "unknown";
  let confidence = 0;
  let source: IntakeResult["source"] = "rules";
  if (llm && llm.trade !== "unknown" && llm.confidence >= 0.6) {
    trade = llm.trade;
    confidence = llm.confidence;
    source = rulesTrade.trade === trade ? "merged" : "llm";
  } else if (rulesTrade.trade !== "unknown" && rulesTrade.confidence >= 0.5) {
    trade = rulesTrade.trade;
    confidence = rulesTrade.confidence;
    source = "rules";
    if (llm && llm.trade === trade) source = "merged";
  } else if (llm && llm.trade !== "unknown") {
    // Low-confidence LLM guess — keep it but flag clarification.
    trade = llm.trade;
    confidence = llm.confidence;
    source = "llm";
  }

  const urgency: IntakeResult["urgency"] = llm?.urgency ?? rulesUrgency;

  const needsClarification = trade === "unknown" || confidence < 0.6;

  return {
    trade,
    jobType: llm?.jobType ?? "other",
    urgency,
    emergency,
    summary_en: llm?.summary_en ?? `${trade === "unknown" ? "Household problem" : `${trade} problem`}: ${clean.slice(0, 120)}`,
    summary_ur:
      llm?.summary_ur ??
      (trade === "unknown" ? "گھریلو مسئلہ" : "مسئلہ دیکھ کر کام کرنا ہے"),
    confidence: Math.round(confidence * 100) / 100,
    language_detected: detectLanguage(clean),
    needs_clarification: needsClarification,
    clarifying_question_ur: needsClarification
      ? llm?.clarifying_question_ur ?? "براہ کرم بتائیں کہ آپ کو کون سی مستری چاہیے؟"
      : null,
    source: useLLM ? (llm ? (source === "rules" ? "merged" : source) : "rules") : "rules",
  };
}
