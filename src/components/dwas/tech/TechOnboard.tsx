// Voice onboarding (T06, T07): four spoken questions, parsed by the LLM with
// a rules fallback, confirmed on icon cards (low-confidence fields start
// empty), saved as a pending profile for admin approval (S4).
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, Mic, Loader2, Volume2, Check, Wrench, Hourglass, MapPin, Banknote, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useDw, TRADES } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { OnboardProfileDto } from "@/lib/api-client";
import type { DictKey } from "@/lib/i18n";
import type { Trade } from "@/lib/types";
import { TradeIcon } from "@/components/dwas/shared";
import { useDictation, speak } from "@/components/dwas/speech";
import { cn } from "@/lib/utils";

const QUESTIONS: Array<{ key: DictKey; field: "trades" | "years" | "areas" | "fee"; icon: typeof Wrench }> = [
  { key: "tech.onboard.q1", field: "trades", icon: Wrench },
  { key: "tech.onboard.q2", field: "years", icon: Hourglass },
  { key: "tech.onboard.q3", field: "areas", icon: MapPin },
  { key: "tech.onboard.q4", field: "fee", icon: Banknote },
];

export function TechOnboard() {
  const t = useDw((s) => s.t);
  const toast = useToast();
  const navigate = useDw((s) => s.navigate);
  const [step, setStep] = useState(0); // 0..3 questions, 4 = confirm
  const [answers, setAnswers] = useState<string[]>(["", "", "", ""]);
  const [profile, setProfile] = useState<OnboardProfileDto | null>(null);
  const [parseBusy, setParseBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [years, setYears] = useState("");
  const [fee, setFee] = useState("");
  const [areaId, setAreaId] = useState("");
  const spokenRef = useRef(false);

  const dictation = useDictation("ur-PK");

  useEffect(() => {
    if (!spokenRef.current && step === 0) {
      spokenRef.current = true;
      speak(t("tech.onboard.q1"), "ur-PK");
    }
  }, [step]);

  // Live transcript for the current question.
  useEffect(() => {
    if (dictation.finalText || dictation.interim) {
      setAnswers((prev) => {
        const next = [...prev];
        next[step] = [dictation.finalText, dictation.interim].filter(Boolean).join(" ");
        return next;
      });
    }
  }, [dictation.finalText, dictation.interim, step]);

  function nextStep() {
    dictation.reset();
    dictation.setFinalText("");
    if (step < 3) {
      setStep(step + 1);
      setTimeout(() => speak(t(QUESTIONS[step + 1].key), "ur-PK"), 300);
    } else {
      void parseAnswers();
    }
  }

  async function parseAnswers() {
    setParseBusy(true);
    try {
      const transcript = answers.filter(Boolean).join(". ");
      const res = await api.onboardParse({ transcript, language: "ur" });
      setProfile(res.profile);
      // Fields under 0.6 confidence start empty for the technician to tap in.
      const conf = res.profile.confidence;
      setTrades(conf.trades >= 0.6 ? res.profile.trades : []);
      setYears(conf.years >= 0.6 ? String(res.profile.yearsExperience ?? "") : "");
      setFee(conf.fee >= 0.6 ? String(res.profile.visitFeePKR ?? "") : "");
      setAreaId(conf.areas >= 0.6 && res.profile.serviceAreaIds[0] ? res.profile.serviceAreaIds[0] : "");
      setStep(4);
    } catch {
      toast.toast({ description: t("common.errorGeneric") });
    } finally {
      setParseBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api.techProfile({
        trades: trades.length ? trades : ["plumber"],
        yearsExperience: Number(years) || 1,
        visitFeePKR: Number(fee) || undefined,
        areaId: areaId || "satellite-town",
        radiusKm: 6,
        bioUr: profile?.bio_ur ?? undefined,
      });
      toast.toast({ description: t("tech.onboard.saved") });
      navigate("tech-home");
    } catch {
      toast.toast({ description: t("common.errorGeneric") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-4 pb-10">
      <button type="button" onClick={() => navigate("tech-home")} className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-teal-700">
        <ChevronLeft className="flip-rtl h-4 w-4" aria-hidden />
        {t("common.back")}
      </button>

      <h1 className="mt-3 font-urdu text-2xl font-extrabold text-stone-900" dir="rtl">{t("tech.onboardTitle")}</h1>
      <p className="font-urdu text-sm text-stone-500" dir="rtl">{t("tech.onboardSub")}</p>

      {step < 4 && (
        <div className="mt-6">
          {/* Progress */}
          <div className="flex gap-1.5" aria-hidden>
            {QUESTIONS.map((_, i) => (
              <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-teal-600" : "bg-stone-200")} />
            ))}
          </div>

          <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="mt-6 rounded-2xl border border-teal-100 bg-white p-5 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white">
              {(() => {
                const Icon = QUESTIONS[step].icon;
                return <Icon className="h-7 w-7" aria-hidden />;
              })()}
            </span>
            <p className="mt-3 font-urdu text-2xl leading-relaxed font-extrabold text-stone-900" dir="rtl">
              {t(QUESTIONS[step].key)}
            </p>
            <p className="mt-1 text-xs text-stone-400">{QUESTIONS[step].key.split(".")[2]}</p>

            <button
              type="button"
              onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
              className={cn(
                "mx-auto mt-6 flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-full text-white shadow-xl",
                dictation.listening ? "bg-rose-500 shadow-rose-500/30" : "bg-teal-600 shadow-teal-600/30",
              )}
              aria-label={dictation.listening ? t("tech.onboard.recording") : t("tech.onboard.record")}
            >
              <Mic className={cn("h-8 w-8", dictation.listening && "animate-pulse")} aria-hidden />
              <span className="font-urdu text-xs font-bold" dir="rtl">
                {dictation.listening ? t("tech.onboard.recording") : t("tech.onboard.record")}
              </span>
            </button>

            <div className="mt-4 min-h-12 rounded-xl bg-stone-50 px-3 py-2.5">
              <p className="font-urdu text-base leading-relaxed text-stone-800" dir="rtl">
                {answers[step] || <span className="text-stone-400">{t("client.listeningLive")}</span>}
              </p>
            </div>

            <div className="mt-4 grid gap-2">
              <Button onClick={nextStep} disabled={parseBusy} className="h-13 min-h-12 rounded-xl bg-teal-600 font-bold hover:bg-teal-700">
                {parseBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : step < 3 ? null : <Volume2 className="h-4 w-4" aria-hidden />}
                {step < 3 ? t("common.continue") : t("tech.onboard.confirmTitle")}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {step === 4 && profile && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="font-urdu text-lg font-bold text-stone-900" dir="rtl">{t("tech.onboard.confirmTitle")}</h2>

          <section className="mt-4">
            <h3 className="font-urdu mb-2 flex items-center gap-1.5 text-sm font-bold text-stone-700" dir="rtl">
              <Wrench className="h-4 w-4 text-teal-700" aria-hidden />
              {t("tech.trades")}
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {TRADES.map((tr) => (
                <button
                  key={tr}
                  type="button"
                  onClick={() => setTrades((prev) => (prev.includes(tr) ? prev.filter((x) => x !== tr) : [...prev, tr]))}
                  aria-pressed={trades.includes(tr)}
                  className={cn("flex flex-col items-center gap-1 rounded-xl border p-2", trades.includes(tr) ? "border-teal-600 bg-teal-50" : "border-stone-200")}
                  aria-label={t(`trade.${tr}` as DictKey)}
                >
                  <TradeIcon trade={tr} size="sm" withLabel={false} />
                  <span className="text-center text-[9px] leading-tight font-semibold text-stone-600">{t(`trade.${tr}` as DictKey)}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-urdu mb-1 flex items-center gap-1 text-xs font-bold text-stone-600" dir="rtl">
                <Hourglass className="h-3.5 w-3.5 text-teal-700" aria-hidden />
                {t("tech.years")}
              </span>
              <Input inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="5" />
            </label>
            <label className="block">
              <span className="font-urdu mb-1 flex items-center gap-1 text-xs font-bold text-stone-600" dir="rtl">
                <Banknote className="h-3.5 w-3.5 text-teal-700" aria-hidden />
                {t("tech.visitFee")}
              </span>
              <Input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={t("tech.onboard.feeExample")} />
            </label>
          </div>

          <label className="mt-3 block">
            <span className="font-urdu mb-1 flex items-center gap-1 text-xs font-bold text-stone-600" dir="rtl">
              <MapPin className="h-3.5 w-3.5 text-teal-700" aria-hidden />
              {t("request.areaLabel")}
            </span>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium"
            >
              <option value="">—</option>
              {["saddar", "satellite-town", "chaklala", "bahria-4", "g-11", "f-10", "i-8"].map((id) => (
                <option key={id} value={id}>{id.replace(/-/g, " ")}</option>
              ))}
            </select>
          </label>

          <Button onClick={() => void save()} disabled={saving || trades.length === 0} className="mt-5 min-h-16 w-full gap-2 rounded-2xl bg-teal-600 font-urdu text-lg font-extrabold hover:bg-teal-700">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Save className="h-5 w-5" aria-hidden />}
            {t("tech.onboard.save")}
          </Button>
          <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-stone-400">
            <Check className="h-3 w-3" aria-hidden />
            {t("tech.onboard.saved")}
          </p>
        </motion.div>
      )}
    </div>
  );
}
