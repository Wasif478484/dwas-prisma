// Technician jobs (T03): realtime-by-polling incoming request cards with the
// Urdu summary read aloud, countdown ring and big Accept/Decline buttons with
// icon reasons. Accept must reach the client tracker quickly (S1).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Volume2, Check, X, ThumbsUp, MapPinOff, Wrench, Loader2, Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDw } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { BookingDto } from "@/lib/api-client";
import type { DictKey } from "@/lib/i18n";
import { CountdownRing, StatusPill } from "@/components/dwas/shared";
import { speak } from "@/components/dwas/speech";
import { cn } from "@/lib/utils";

const DECLINE_REASONS: Array<{ code: string; icon: typeof ThumbsUp; key: DictKey }> = [
  { code: "busy", icon: ThumbsUp, key: "tech.decline.busy" },
  { code: "too_far", icon: MapPinOff, key: "tech.decline.too_far" },
  { code: "not_my_work", icon: Wrench, key: "tech.decline.not_my_work" },
];

function IncomingCard({ booking, onAccept, onDecline, busy }: {
  booking: BookingDto;
  onAccept: () => void;
  onDecline: (reason: string) => void;
  busy: boolean;
}) {
  const t = useDw((s) => s.t);
  const lang = useDw((s) => s.lang);
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, Math.round((booking.expiresAt - Date.now()) / 1000)));
  const [declining, setDeclining] = useState(false);
  const spokenRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft(Math.max(0, Math.round((booking.expiresAt - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [booking.expiresAt]);

  useEffect(() => {
    if (!spokenRef.current) {
      spokenRef.current = true;
      speak(booking.summary_ur || booking.summary_en, "ur-PK");
    }
  }, [booking.id]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="rounded-2xl border-2 border-amber-300 bg-white p-4 shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-urdu text-lg font-extrabold text-amber-800" dir="rtl">
          <Volume2 className="h-4 w-4" aria-hidden />
          {t("tech.newJob")}
        </p>
        <CountdownRing seconds={secondsLeft} total={booking.urgency === "now" ? 120 : 300} />
      </div>

      <p className="mt-2 font-urdu text-xl leading-relaxed font-bold text-stone-900" dir="rtl">
        {booking.summary_ur || booking.summary_en}
      </p>
      <p className="mt-1 text-xs text-stone-500" dir="ltr">{booking.summary_en}</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-stone-50 p-2">
          <p className="text-[10px] font-semibold text-stone-400">{t("tech.job.area")}</p>
          <p className="mt-0.5 truncate text-xs font-bold text-stone-800">{booking.location.areaId?.replace(/-/g, " ") ?? "—"}</p>
        </div>
        <div className="rounded-xl bg-stone-50 p-2">
          <p className="text-[10px] font-semibold text-stone-400">{t("booking.priceBand")}</p>
          <p className="mt-0.5 text-xs font-bold text-teal-800">
            {booking.priceBand ? `${booking.priceBand.min}–${booking.priceBand.max}` : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-stone-50 p-2">
          <p className="text-[10px] font-semibold text-stone-400">{t("request.urgencyLabel")}</p>
          <p className="mt-0.5 text-xs font-bold text-stone-800">{t(`urgency.${booking.urgency}` as DictKey)}</p>
        </div>
      </div>

      {!declining ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            onClick={onAccept}
            disabled={busy || secondsLeft <= 0}
            className="min-h-16 flex-col gap-0.5 rounded-2xl bg-emerald-600 font-urdu text-xl font-extrabold hover:bg-emerald-700"
          >
            <span className="flex items-center gap-1.5"><Check className="h-5 w-5" aria-hidden />{t("tech.accept")}</span>
            <span className="text-[10px] font-medium text-emerald-100">Accept</span>
          </Button>
          <Button
            onClick={() => setDeclining(true)}
            disabled={busy}
            variant="outline"
            className="min-h-16 flex-col gap-0.5 rounded-2xl border-2 border-rose-300 font-urdu text-xl font-extrabold text-rose-700"
          >
            <span className="flex items-center gap-1.5"><X className="h-5 w-5" aria-hidden />{t("tech.decline")}</span>
            <span className="text-[10px] font-medium text-rose-400">Decline</span>
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {DECLINE_REASONS.map((reason) => (
            <button
              key={reason.code}
              type="button"
              onClick={() => onDecline(reason.code)}
              className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:border-rose-300"
            >
              <reason.icon className="h-5 w-5 text-rose-500" aria-hidden />
              <span className="font-urdu text-sm" dir="rtl">{t(reason.key)}</span>
              <span className="text-[9px] text-stone-400">{reason.code.replace(/_/g, " ")}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <StatusPill status={booking.status} />
        <span className="text-[10px] text-stone-400">{lang === "ur" ? "لاگ: " + booking.id.slice(0, 8) : ""}{booking.clientName ? "" : ""}</span>
      </div>
    </motion.div>
  );
}

export function TechJobs() {
  const t = useDw((s) => s.t);
  const toast = useToast();
  const activeTechJobId = useDw((s) => s.techJobId);
  const openTechJob = useDw((s) => s.openTechJob);
  const navigate = useDw((s) => s.navigate);
  const demo = useDw((s) => s.demo);
  const [incoming, setIncoming] = useState<BookingDto[]>([]);
  const [active, setActive] = useState<BookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const aliveRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.techJobs();
      if (aliveRef.current) {
        setIncoming(res.incoming);
        setActive(res.active);
        setLoading(false);
      }
    } catch {
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    void refresh();
    const poll = setInterval(() => void refresh(), 3000);
    return () => {
      aliveRef.current = false;
      clearInterval(poll);
    };
  }, [refresh]);

  // Demo mode: auto-accept after 5s (S1 rehearsals).
  useEffect(() => {
    if (!demo.autoAccept || incoming.length === 0 || busy) return;
    const timer = setTimeout(() => {
      void act(incoming[0].id, "accepted");
    }, 5000);
    return () => clearTimeout(timer);
  }, [demo.autoAccept, incoming.length]);

  async function act(id: string, to: "accepted" | "declined", reason?: string) {
    setBusy(true);
    try {
      await api.bookingStatus(id, { to, ...(reason ? { reason } : {}) });
      if (to === "accepted") {
        openTechJob(id);
        navigate("tech-job");
        toast.toast({ description: t("status.accepted") });
      } else {
        toast.toast({ description: t("status.declined") });
      }
      await refresh();
    } catch {
      toast.toast({ description: t("common.errorGeneric") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-4 pb-10">
      <button type="button" onClick={() => navigate("tech-home")} className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-teal-700">
        <ChevronLeft className="flip-rtl h-4 w-4" aria-hidden />
        {t("common.back")}
      </button>
      <h1 className="mt-3 font-urdu text-2xl font-extrabold text-stone-900" dir="rtl">{t("tech.jobsTitle")}</h1>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" aria-hidden />
        </div>
      ) : (
        <>
          <section className="mt-4" aria-label={t("tech.jobsTitle")}>
            <AnimatePresence mode="popLayout">
              {incoming.length === 0 ? (
                <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-dashed border-stone-300 p-6 text-center font-urdu text-base text-stone-400" dir="rtl">
                  {t("tech.jobsEmpty")}
                </motion.p>
              ) : (
                incoming.map((booking) => (
                  <div key={booking.id} className="mb-3">
                    <IncomingCard
                      booking={booking}
                      busy={busy}
                      onAccept={() => void act(booking.id, "accepted")}
                      onDecline={(reason) => void act(booking.id, "declined", reason)}
                    />
                  </div>
                ))
              )}
            </AnimatePresence>
          </section>

          <section className="mt-6" aria-label={t("tech.currentJobs")}>
            <h2 className="font-urdu mb-2 text-lg font-bold text-stone-700" dir="rtl">{t("tech.currentJobs")}</h2>
            {active.length === 0 ? (
              <p className="rounded-2xl border border-stone-200 bg-white p-4 text-center text-sm text-stone-400">{t("tech.noCurrent")}</p>
            ) : (
              <ul className="space-y-2.5">
                {active.map((booking) => (
                  <li key={booking.id}>
                    <button
                      type="button"
                      onClick={() => {
                        openTechJob(booking.id);
                        navigate("tech-job");
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 text-start hover:border-teal-400"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white">
                        <Wrench className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-urdu text-sm font-bold text-stone-900" dir="rtl">{booking.summary_ur || booking.summary_en}</span>
                        <span className="mt-0.5 block text-[11px] text-stone-500">{booking.location.areaId?.replace(/-/g, " ")}</span>
                      </span>
                      <StatusPill status={booking.status} />
                      <Banknote className={cn("h-4 w-4 text-stone-300")} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
