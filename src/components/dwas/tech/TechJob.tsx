// Technician job detail (T04, T05): one big status button that changes label
// with the state (Rawana hua -> Kaam shuru -> Kaam khatam), client contact
// after accept, and a big number pad for the final price. Only valid
// transitions are offered (state machine enforced server-side too).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Loader2, Phone, MessageCircle, MapPin, AlertTriangle, Trash, Volume2, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDw } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { BookingDto } from "@/lib/api-client";
import type { DictKey } from "@/lib/i18n";
import { StatusPill, PriceBand } from "@/components/dwas/shared";
import { speak } from "@/components/dwas/speech";
import { cn } from "@/lib/utils";

function NumPad({ value, onChange, onSubmit, band, busy }: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  band: { min: number; max: number } | null;
  busy: boolean;
}) {
  const t = useDw((s) => s.t);
  const num = Number(value || 0);
  const overBand = band !== null && num > band.max * 1.25;
  return (
    <div className="dw-card rounded-3xl p-4 sm:p-5">
      <p className="font-urdu text-lg font-bold text-ink-900" dir="rtl">{t("tech.job.price")}</p>
      <p className="text-[11px] text-ink-500">{t("tech.job.priceHint")}</p>
      <div className="mt-3 rounded-xl bg-ink-50 px-4 py-3 text-center">
        <span className="text-3xl font-extrabold tabular-nums text-brand-800">{value || "0"}</span>
        <span className="ms-1 text-sm font-semibold text-ink-400">{t("common.pkr")}</span>
      </div>
      {band && (
        <p className="mt-2 text-center text-xs text-ink-500">
          {t("tech.job.band")}: <PriceBand min={band.min} max={band.max} className="text-sm" />
        </p>
      )}
      {overBand && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-semibold text-amber-800" role="alert">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {t("tech.job.overBandWarn")}
        </p>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0"].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => onChange((value + digit).replace(/^0+(?=\d)/, "").slice(0, 7))}
            className="min-h-14 rounded-xl border border-ink-200 bg-white text-xl font-extrabold tabular-nums text-ink-800 hover:bg-brand-50 active:bg-brand-100"
            aria-label={digit}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(value.slice(0, -1))}
          className="flex min-h-14 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
          aria-label="backspace"
        >
          <Trash className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <Button
        onClick={onSubmit}
        disabled={num <= 0 || busy}
        className="mt-3 min-h-16 w-full flex-col gap-0.5 rounded-2xl bg-emerald-600 font-urdu text-xl font-extrabold hover:bg-emerald-700"
      >
        <span className="flex items-center gap-2"><Check className="h-5 w-5" aria-hidden />{t("tech.job.complete")}</span>
        <span className="text-[10px] font-medium text-emerald-100">Finish job</span>
      </Button>
    </div>
  );
}

export function TechJob() {
  const t = useDw((s) => s.t);
  const toast = useToast();
  const techJobId = useDw((s) => s.techJobId);
  const navigate = useDw((s) => s.navigate);
  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [numpadOpen, setNumpadOpen] = useState(false);
  const aliveRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!techJobId) return;
    try {
      const res = await api.getBooking(techJobId);
      if (aliveRef.current) setBooking(res.booking);
    } catch {
      if (aliveRef.current) setBooking(null);
    }
  }, [techJobId]);

  useEffect(() => {
    aliveRef.current = true;
    if (!techJobId) {
      navigate("tech-jobs");
      return;
    }
    void refresh();
    const poll = setInterval(() => void refresh(), 4000);
    return () => {
      aliveRef.current = false;
      clearInterval(poll);
    };
  }, [techJobId, navigate, refresh]);

  if (!techJobId) return null;
  if (!booking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden />
      </div>
    );
  }

  const overBand = booking.priceBand && Number(price || 0) > booking.priceBand.max * 1.25;

  async function move(to: "on_the_way" | "in_progress" | "completed") {
    setBusy(true);
    try {
      const res = await api.bookingStatus(booking!.id, {
        to,
        ...(to === "completed" ? { finalPrice: Number(price) } : {}),
      });
      setBooking(res.booking);
      if (to === "completed") {
        toast.toast({ description: t("status.completed") });
      } else {
        speak(res.booking.summary_ur, "ur-PK");
      }
    } catch {
      toast.toast({ description: t("common.errorGeneric") });
    } finally {
      setBusy(false);
    }
  }

  const nextAction =
    booking.status === "accepted"
      ? { to: "on_the_way" as const, urKey: "tech.job.onWay" as DictKey, en: "On the way" }
      : booking.status === "on_the_way"
        ? { to: "in_progress" as const, urKey: "tech.job.start" as DictKey, en: "Start work" }
        : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16 sm:px-6 sm:pt-6">
      <button type="button" onClick={() => navigate("tech-jobs")} className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-brand-700">
        <ChevronLeft className="flip-rtl h-4 w-4" aria-hidden />
        {t("common.back")}
      </button>

      <div className="mt-3 flex items-center justify-between gap-2">
        <h1 className="font-urdu text-xl font-extrabold text-ink-900" dir="rtl">{t("booking.job")}</h1>
        <StatusPill status={booking.status} />
      </div>

      <div className="mt-3 dw-card rounded-3xl p-4 sm:p-5">
        <p className="font-urdu text-xl leading-relaxed font-bold text-ink-900" dir="rtl">{booking.summary_ur || booking.summary_en}</p>
        <p className="mt-1 text-xs text-ink-500" dir="ltr">{booking.summary_en}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-ink-50 p-2.5">
            <p className="text-[10px] font-semibold text-ink-400">{t("tech.job.area")}</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-xs font-bold text-ink-800">
              <MapPin className="h-3 w-3" aria-hidden />
              {booking.location.areaId?.replace(/-/g, " ") ?? "—"}
            </p>
          </div>
          <div className="rounded-xl bg-ink-50 p-2.5">
            <p className="text-[10px] font-semibold text-ink-400">{t("booking.priceBand")}</p>
            <p className="mt-0.5 text-xs font-bold text-brand-800">
              {booking.priceBand ? `${booking.priceBand.min.toLocaleString()}–${booking.priceBand.max.toLocaleString()}` : "—"}
            </p>
          </div>
        </div>
        {booking.location.note && <p className="mt-2 text-xs text-ink-500">{booking.location.note}</p>}
      </div>

      {/* Client contact appears after accept (C12) */}
      {booking.contact?.phone ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-bold tracking-wide text-emerald-700 uppercase">{t("tech.job.clientContact")}</p>
          <p className="mt-1 text-sm font-bold text-ink-900">{booking.contact.name}</p>
          <p className="text-sm font-semibold tabular-nums text-emerald-900" dir="ltr">{booking.contact.phone}</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <a href={`tel:${booking.contact.phone}`} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-sm font-bold text-white">
              <Phone className="h-4 w-4" aria-hidden /> {t("common.call")}
            </a>
            <a
              href={`https://wa.me/${booking.contact.phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-emerald-600 text-sm font-bold text-emerald-800"
            >
              <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
            </a>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-ink-200 bg-white p-3 text-xs text-ink-500">{t("booking.contactHidden")}</p>
      )}

      {/* Big status button (T04) */}
      {nextAction && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Button
            onClick={() => void move(nextAction.to)}
            disabled={busy}
            className="mt-4 min-h-20 w-full flex-col gap-0.5 rounded-2xl bg-brand-600 font-urdu text-2xl font-extrabold shadow-lg shadow-brand-600/25 hover:bg-brand-700"
          >
            <span className="flex items-center gap-2">
              <Volume2 className="h-6 w-6" aria-hidden />
              {t(nextAction.urKey)}
            </span>
            <span className="text-[11px] font-medium text-brand-100">{nextAction.en}</span>
          </Button>
        </motion.div>
      )}

      {/* Completion with the numpad (T05) */}
      {booking.status === "in_progress" && (
        <>
          {!numpadOpen ? (
            <Button
              onClick={() => {
                setNumpadOpen(true);
                speak(t("tech.job.price"), "ur-PK");
              }}
              disabled={busy}
              className="mt-4 min-h-20 w-full flex-col gap-0.5 rounded-2xl bg-brand-600 font-urdu text-2xl font-extrabold shadow-lg shadow-brand-600/25 hover:bg-brand-700"
            >
              {t("tech.job.complete")}
              <span className="text-[11px] font-medium text-brand-100">Enter final price</span>
            </Button>
          ) : (
            <div className="mt-4">
              <NumPad
                value={price}
                onChange={setPrice}
                band={booking.priceBand}
                busy={busy}
                onSubmit={() => void move("completed")}
              />
              <AnimatePresence>
                {overBand && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center text-[11px] font-semibold text-amber-700">
                    Client will confirm the over-band price.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {["completed", "reviewed"].includes(booking.status) && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="font-urdu text-xl font-extrabold text-emerald-800" dir="rtl">{t("status.completed")}</p>
          {booking.finalPrice !== undefined && (
            <p className="mt-1 text-sm font-bold text-emerald-900">
              {t("booking.finalPrice")}: {booking.finalPrice.toLocaleString()} {t("common.pkr")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
