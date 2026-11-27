// Request confirm (C03, C04, C05, C14): emergency notice first (S3 — the
// rules detector fires even with the AI off), then the Haan/Nahi confirm,
// editable urgency and the location step with area fallback.
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, MapPin, Navigation, AlertTriangle, ChevronLeft, CheckCircle2,
  Loader2, Info, Siren,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDw, TRADES, URGENCIES } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { AreaDto, MatchCardDto } from "@/lib/api-client";
import type { DictKey } from "@/lib/i18n";
import type { Trade, Urgency } from "@/lib/types";
import { TradeIcon } from "@/components/dwas/shared";
import { cn } from "@/lib/utils";

function EmergencyNotice({ kind, onContinue }: { kind: string; onContinue: () => void }) {
  const t = useDw((s) => s.t);
  const lang = useDw((s) => s.lang);
  const rtl = lang === "ur";
  const labelKey = `emergency.kind.${kind}` as DictKey;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col bg-rose-600 text-white"
      role="alertdialog"
      aria-label={t("emergency.title")}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center"
      >
        <motion.span
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: 3, duration: 0.9 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15"
        >
          <Siren className="h-10 w-10" aria-hidden />
        </motion.span>
        <div>
          <p className={rtl ? "font-urdu text-3xl font-bold" : "text-3xl font-bold"} dir={rtl ? "rtl" : "ltr"}>{t("emergency.title")}</p>
          <p className="mt-1 text-sm font-medium text-rose-100">{t("emergency.titleEn")}</p>
        </div>
        <p className={rtl ? "max-w-sm font-urdu text-lg leading-relaxed" : "max-w-sm text-lg leading-relaxed font-semibold"} dir="auto">
          {t("emergency.notice")}{" "}
          <strong>{t(labelKey)}</strong>
        </p>
        <ul className="max-w-sm space-y-2 rounded-2xl bg-rose-700/60 p-4 text-start" dir={rtl ? "rtl" : "ltr"}>
          {(["emergency.safety1", "emergency.safety2", "emergency.safety3"] as DictKey[]).map((key) => (
            <li key={key} className={rtl ? "flex gap-2 font-urdu text-base leading-relaxed" : "flex gap-2 text-base leading-relaxed font-semibold"}>
              <CheckCircle2 className={rtl ? "mt-1 h-4 w-4 shrink-0 text-rose-200" : "mt-1 h-4 w-4 shrink-0 order-last text-rose-200"} aria-hidden />
              {t(key)}
            </li>
          ))}
        </ul>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <a href="tel:1122" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white font-bold text-rose-700 shadow-lg">
            <Phone className="h-5 w-5" aria-hidden />
            {t("emergency.call")}
          </a>
          <button
            type="button"
            onClick={onContinue}
            className="flex h-12 items-center justify-center rounded-2xl border-2 border-white/60 font-semibold text-white"
          >
            {t("emergency.continue")}
          </button>
        </div>
        <p className="text-[11px] text-rose-200">{t("emergency.noAdvice")}</p>
      </motion.div>
    </motion.div>
  );
}

export function RequestConfirm() {
  const t = useDw((s) => s.t);
  const lang = useDw((s) => s.lang);
  const intake = useDw((s) => s.intake);
  const setIntake = useDw((s) => s.setIntake);
  const location = useDw((s) => s.location);
  const setLocation = useDw((s) => s.setLocation);
  const setMatchResults = useDw((s) => s.setMatchResults);
  const navigate = useDw((s) => s.navigate);

  const [emergencyAck, setEmergencyAck] = useState(false);
  const [trade, setTrade] = useState<Trade | "unknown">("unknown");
  const [urgency, setUrgency] = useState<Urgency>("today");
  const [areas, setAreas] = useState<AreaDto[]>([]);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const landmarkRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!intake) {
      navigate("client-home");
      return;
    }
    setTrade(intake.trade);
    setUrgency(intake.urgency);
    api.areas().then((res) => setAreas(res.areas)).catch(() => undefined);
  }, []);

  if (!intake) return null;

  const isEmergency = intake.emergency.is_emergency && !emergencyAck;
  const needsPick = trade === "unknown" || intake.needs_clarification;

  async function findTechnicians() {
    const area = location?.areaId || areas[0]?.id || "satellite-town";
    const loc = location ?? {
      lat: areas.find((a) => a.id === area)?.lat ?? 33.633,
      lng: areas.find((a) => a.id === area)?.lng ?? 73.063,
      areaId: area,
      note: "",
    };
    setLocation(loc);
    setMatching(true);
    setMatchError(null);
    try {
      const res = await api.match({
        trade: trade as Trade,
        jobType: intake!.jobType,
        urgency,
        lat: Number(loc.lat.toFixed(3)),
        lng: Number(loc.lng.toFixed(3)),
        areaId: area,
      });
      setMatchResults(res.results as MatchCardDto[], { trade: trade as Trade, jobType: intake!.jobType, urgency });
      navigate("client-results");
    } catch {
      setMatchError(t("common.errorGeneric"));
    } finally {
      setMatching(false);
    }
  }

  function useMyLocation() {
    setGeoBusy(true);
    if (!navigator.geolocation) {
      setGeoDenied(true);
      setGeoBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoDenied(false);
        setGeoBusy(false);
        const nearest = areas.length
          ? areas.reduce((best, area) => {
              const d = (area.lat - pos.coords.latitude) ** 2 + (area.lng - pos.coords.longitude) ** 2;
              const bd = (best.lat - pos.coords.latitude) ** 2 + (best.lng - pos.coords.longitude) ** 2;
              return d < bd ? area : best;
            })
          : null;
        setLocation({
          lat: Number(pos.coords.latitude.toFixed(3)),
          lng: Number(pos.coords.longitude.toFixed(3)),
          areaId: nearest?.id ?? location?.areaId ?? areas[0]?.id ?? "satellite-town",
          note: location?.note ?? "",
        });
      },
      () => {
        setGeoDenied(true);
        setGeoBusy(false);
      },
      { timeout: 8000 },
    );
  }

  return (
    <>
      <AnimatePresence>{isEmergency && <EmergencyNotice kind={intake.emergency.kind} onContinue={() => setEmergencyAck(true)} />}</AnimatePresence>

      <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16 sm:px-6 sm:pt-6">
        <button type="button" onClick={() => navigate("client-home")} className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-brand-700">
          <ChevronLeft className="flip-rtl h-4 w-4" aria-hidden />
          {t("common.back")}
        </button>

        <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{t("request.title")}</h1>

        {/* Understanding card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">{t("request.understood")}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
              <Info className="h-3 w-3" aria-hidden />
              {intake.source === "rules" ? t("request.sourceRules") : intake.source === "merged" ? t("request.sourceLLM") : t("request.sourceLLM")}
              {" · "}
              {Math.round(intake.confidence * 100)}%
            </span>
          </div>

          {needsPick ? (
            <div className="mt-3">
              <p className="font-urdu text-base text-amber-800" dir="rtl">{intake.clarifying_question_ur ?? t("request.clarify")}</p>
              <p className="mt-1 text-sm font-semibold text-ink-700">{t("request.clarify")}</p>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {TRADES.map((tr) => (
                  <button
                    key={tr}
                    type="button"
                    onClick={() => setTrade(tr)}
                    aria-pressed={trade === tr}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border p-2",
                      trade === tr ? "border-brand-600 bg-brand-50" : "border-ink-200 hover:border-brand-300",
                    )}
                    aria-label={t(`trade.${tr}` as DictKey)}
                  >
                    <TradeIcon trade={tr} size="sm" withLabel={false} />
                    <span className="text-center text-[9px] leading-tight font-semibold text-ink-600">{t(`trade.${tr}` as DictKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <TradeIcon trade={trade as Trade} size="lg" withLabel={false} />
              <div className="flex-1">
                <p className="text-lg font-bold text-ink-900">
                  {t("request.tradeAsk", { trade: t(`trade.${trade}` as DictKey) })}
                </p>
                <p className={cn("mt-1 text-sm text-ink-600", /[\u0600-\u06FF]/.test(intake.summary_ur) && lang === "ur" && "font-urdu")} dir="auto">
                  {lang === "ur" ? intake.summary_ur : intake.summary_en}
                </p>
                {intake.emergency.is_emergency && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                    {t(`emergency.kind.${intake.emergency.kind}` as DictKey)}
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Urgency */}
        <section className="mt-4" aria-label={t("request.urgencyLabel")}>
          <h2 className="mb-2 text-sm font-bold text-ink-700">{t("request.urgencyLabel")}</h2>
          <div className="grid grid-cols-4 gap-2">
            {URGENCIES.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUrgency(u)}
                aria-pressed={urgency === u}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-xs font-bold transition-colors",
                  urgency === u ? "border-brand-600 bg-brand-600 text-white shadow-sm" : "border-ink-200 bg-white text-ink-600 hover:border-brand-300",
                )}
              >
                {t(`urgency.${u}` as DictKey)}
              </button>
            ))}
          </div>
        </section>

        {/* Location */}
        <section className="mt-4 dw-card rounded-3xl p-4 sm:p-5" aria-label={t("request.whereLabel")}>
          <h2 className="mb-2 text-sm font-bold text-ink-700">{t("request.whereLabel")}</h2>
          <Button
            type="button"
            variant="outline"
            onClick={useMyLocation}
            disabled={geoBusy}
            className="h-11 w-full gap-2 border-brand-200 text-brand-800"
          >
            {geoBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Navigation className="h-4 w-4" aria-hidden />}
            {t("request.useLocation")}
          </Button>
          {geoDenied && (
            <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              {t("request.locationDenied")}
            </p>
          )}
          {location && !geoDenied && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
            </p>
          )}
          <div className="mt-3">
            <label className="mb-1 block text-xs font-semibold text-ink-500" htmlFor="area-select">
              {t("request.areaLabel")}
            </label>
            <select
              id="area-select"
              value={location?.areaId ?? ""}
              onChange={(e) =>
                setLocation({
                  lat: areas.find((a) => a.id === e.target.value)?.lat ?? 33.633,
                  lng: areas.find((a) => a.id === e.target.value)?.lng ?? 73.063,
                  areaId: e.target.value,
                  note: location?.note ?? "",
                })
              }
              className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm font-medium text-ink-800"
            >
              <option value="">—</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-semibold text-ink-500" htmlFor="landmark-input">
              {t("request.landmarkLabel")}
            </label>
            <Input
              id="landmark-input"
              ref={landmarkRef}
              defaultValue={location?.note ?? ""}
              onBlur={(e) =>
                setLocation({
                  lat: location?.lat ?? areas.find((a) => a.id === location?.areaId)?.lat ?? 33.633,
                  lng: location?.lng ?? areas.find((a) => a.id === location?.areaId)?.lng ?? 73.063,
                  areaId: location?.areaId ?? areas[0]?.id ?? "satellite-town",
                  note: e.target.value.slice(0, 200),
                })
              }
              placeholder={t("common.optional")}
            />
          </div>
        </section>

        {matchError && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{matchError}</p>
        )}

        <Button
          onClick={() => void findTechnicians()}
          disabled={matching || trade === "unknown"}
          className="mt-5 h-14 w-full gap-2 rounded-2xl bg-brand-600 text-base font-bold shadow-lg shadow-brand-900/20 hover:bg-brand-700"
        >
          {matching ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <MapPin className="h-5 w-5" aria-hidden />}
          {t("request.findTech")}
        </Button>
      </div>
    </>
  );
}
