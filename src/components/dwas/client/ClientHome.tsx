// Client home (C01, C02): one huge mic button with live transcript, typed
// fallback always available, 8 common-problem cards and the 5-trade icon grid.
// Voice failure never blocks the flow (S2).
"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Keyboard, AlertTriangle, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDw, TRADES } from "@/lib/store";
import { useDictation, speak } from "@/components/dwas/speech";
import { TradeIcon } from "@/components/dwas/shared";
import { api } from "@/lib/api-client";
import type { DictKey } from "@/lib/i18n";
import { translate } from "@/lib/i18n";
import type { IntakeResult, Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROBLEM_CARDS: Array<{ key: string; trade: Trade; jobType: string; emergency?: "gas" | "electrical" | "fire" | "flood" }> = [
  { key: "tap_leak", trade: "plumber", jobType: "tap_leak" },
  { key: "geyser", trade: "plumber", jobType: "geyser_issue" },
  { key: "ac_cool", trade: "ac_fridge", jobType: "ac_not_cooling" },
  { key: "switch_spark", trade: "electrician", jobType: "switch_socket", emergency: "electrical" },
  { key: "fan", trade: "electrician", jobType: "fan" },
  { key: "door_lock", trade: "carpenter", jobType: "door_lock" },
  { key: "drain_block", trade: "plumber", jobType: "drain_block" },
  { key: "shift_help", trade: "mazdoor", jobType: "shifting_help" },
];

function cardToIntake(card: (typeof PROBLEM_CARDS)[number], lang: "en" | "ur"): IntakeResult {
  const t = (key: DictKey) => translate(lang, key);
  return {
    trade: card.trade,
    jobType: card.jobType,
    urgency: "today",
    emergency: { is_emergency: Boolean(card.emergency), kind: card.emergency ?? "none" },
    summary_en: t(`problem.${card.key}` as DictKey),
    summary_ur: t(`problem.prefill.${card.key}` as DictKey),
    confidence: 1,
    language_detected: "roman_ur",
    needs_clarification: false,
    clarifying_question_ur: null,
    source: "rules",
  };
}

export function ClientHome() {
  const t = useDw((s) => s.t);
  const lang = useDw((s) => s.lang);
  const draftText = useDw((s) => s.draftText);
  const setDraftText = useDw((s) => s.setDraftText);
  const setIntake = useDw((s) => s.setIntake);
  const navigate = useDw((s) => s.navigate);
  const demo = useDw((s) => s.demo);
  const [voiceLang, setVoiceLang] = useState<"ur-PK" | "en-PK">(lang === "ur" ? "ur-PK" : "en-PK");
  const [sending, setSending] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);

  const dictation = useDictation(voiceLang);
  const voiceDisabled = demo.forceVoiceOff;

  const liveText = useMemo(() => {
    const parts = [dictation.finalText, dictation.interim].filter(Boolean);
    return parts.join(" ");
  }, [dictation.finalText, dictation.interim]);

  const text = draftText || liveText;

  async function sendToIntake() {
    if (!text.trim() || sending) return;
    setSending(true);
    setIntakeError(null);
    try {
      const res = await api.intake(text.trim(), lang);
      setIntake(res.intake);
      navigate("client-request");
    } catch {
      setIntakeError(t("common.errorGeneric"));
    } finally {
      setSending(false);
    }
  }

  function pickCard(card: (typeof PROBLEM_CARDS)[number]) {
    setDraftText(t(`problem.prefill.${card.key}` as DictKey));
    setIntake(cardToIntake(card, lang));
    navigate("client-request");
  }

  const canSend = text.trim().length > 0 && !sending;

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-6 pb-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">{t("client.homeTitle")}</h1>
        <p className="mt-1 text-sm text-stone-500">{t("client.homeSub")}</p>
      </motion.div>

      {/* Mic */}
      <div className="mt-8 flex flex-col items-center">
        <motion.button
          type="button"
          onClick={() => (voiceDisabled || dictation.listening ? undefined : dictation.start())}
          whileTap={{ scale: 0.94 }}
          disabled={!dictation.supported || voiceDisabled}
          aria-label={dictation.listening ? t("client.micListening") : t("client.micStart")}
          className={cn(
            "relative flex h-32 w-32 items-center justify-center rounded-full text-white shadow-xl transition-colors",
            dictation.listening ? "bg-rose-500 shadow-rose-500/30" : "bg-teal-600 shadow-teal-600/30",
            (!dictation.supported || voiceDisabled) && "opacity-40",
          )}
        >
          {dictation.listening && !reduceMotionSafe() && (
            <>
              <motion.span
                className="absolute inset-0 rounded-full bg-rose-400/50"
                animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                aria-hidden
              />
              <motion.span
                className="absolute inset-0 rounded-full bg-rose-400/40"
                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut", delay: 0.35 }}
                aria-hidden
              />
            </>
          )}
          <Mic className="relative h-12 w-12" aria-hidden />
        </motion.button>

        <div className="mt-3 flex items-center gap-2 text-sm font-medium text-stone-600">
          {dictation.listening ? (
            <span className="inline-flex items-center gap-2 text-rose-600">
              <span className="flex items-end gap-0.5" aria-hidden>
                {[0.35, 0.7, 1, 0.6, 0.4].map((h, i) => (
                  <motion.span
                    key={i}
                    className="w-1 rounded-full bg-rose-500"
                    animate={{ height: [`${h * 10}px`, `${h * 20}px`, `${h * 10}px`] }}
                    transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.1 }}
                    style={{ height: `${h * 14}px` }}
                  />
                ))}
              </span>
              {t("client.micListening")}
            </span>
          ) : (
            <span>{t("client.micStart")}</span>
          )}
          <button
            type="button"
            onClick={() => speak(t("client.homeTitle"), lang === "ur" ? "ur-PK" : "en-PK")}
            className="rounded-full p-1.5 text-teal-700 hover:bg-teal-50"
            aria-label="Read aloud"
          >
            <Volume2 className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {dictation.error === "denied" && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800" role="alert">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            {t("client.micDenied")}
          </p>
        )}
        {(!dictation.supported || voiceDisabled) && (
          <p className="mt-2 rounded-lg bg-stone-50 px-3 py-1.5 text-xs text-stone-500">{t("client.micUnsupported")}</p>
        )}

        {/* Voice language switch */}
        <div className="mt-3 inline-flex items-center rounded-full border border-stone-200 bg-white p-0.5 text-xs" role="group" aria-label={t("client.voiceLang")}>
          {(["ur-PK", "en-PK"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVoiceLang(v)}
              aria-pressed={voiceLang === v}
              className={cn("rounded-full px-3 py-1 font-semibold transition-colors", voiceLang === v ? "bg-teal-600 text-white" : "text-stone-500")}
            >
              {v === "ur-PK" ? "اردو" : "English"}
            </button>
          ))}
        </div>
      </div>

      {/* Live transcript / typed fallback */}
      <div className="mt-6">
        <Textarea
          value={text}
          onChange={(e) => setDraftText(e.target.value)}
          placeholder={dictation.listening && !text ? t("client.listeningLive") : t("client.typePlaceholder")}
          rows={3}
          dir={/[\u0600-\u06FF]/.test(text) ? "rtl" : "auto"}
          className={cn("resize-none border-stone-200 text-base", /[\u0600-\u06FF]/.test(text) && "font-urdu leading-loose")}
          aria-label={t("client.typePlaceholder")}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-400">
            <Keyboard className="h-3.5 w-3.5" aria-hidden />
            {dictation.interim && text ? "…" : ""}
            {dictation.finalText ? "" : ""}
          </span>
          <Button
            onClick={() => void sendToIntake()}
            disabled={!canSend}
            className="h-12 min-w-36 gap-2 rounded-xl bg-teal-600 font-bold hover:bg-teal-700"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            {t("client.send")}
          </Button>
        </div>
        {intakeError && (
          <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{intakeError}</p>
        )}
      </div>

      {/* Common problems */}
      <section className="mt-8" aria-label={t("client.cardsTitle")}>
        <h2 className="mb-3 text-sm font-bold text-stone-700">{t("client.cardsTitle")}</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {PROBLEM_CARDS.map((card, i) => (
            <motion.button
              key={card.key}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              whileTap={{ scale: 0.97 }}
              onClick={() => pickCard(card)}
              className={cn(
                "flex min-h-16 flex-col justify-center gap-1.5 rounded-2xl border bg-white p-3 text-start shadow-sm transition-colors hover:border-teal-400",
                card.emergency ? "border-rose-200 hover:border-rose-400" : "border-stone-200",
              )}
            >
              <TradeIcon trade={card.trade} size="sm" withLabel={false} />
              <span className="flex items-center gap-1 text-sm font-semibold text-stone-800">
                {t(`problem.${card.key}` as DictKey)}
                {card.emergency && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" aria-label="emergency" />}
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Trade picker */}
      <section className="mt-6" aria-label={t("client.tradesTitle")}>
        <h2 className="mb-3 text-sm font-bold text-stone-700">{t("client.tradesTitle")}</h2>
        <div className="grid grid-cols-5 gap-2">
          {TRADES.map((trade) => (
            <motion.button
              key={trade}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => pickCard({ key: "tap_leak", trade, jobType: "other" })}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-stone-200 bg-white p-2.5 hover:border-teal-400"
              aria-label={t(`trade.${trade}` as DictKey)}
            >
              <TradeIcon trade={trade} size="sm" withLabel={false} />
              <span className="text-center text-[10px] leading-tight font-semibold text-stone-600">
                {t(`trade.${trade}` as DictKey)}
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      <AnimatePresence>{dictation.listening && <span className="sr-only">listening</span>}</AnimatePresence>
    </div>
  );
}

function reduceMotionSafe(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
