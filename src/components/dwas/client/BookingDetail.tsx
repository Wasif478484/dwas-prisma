// Booking detail (C08-C12, C16): live five-step tracker via polling + lazy
// tick (D10), contact reveal only after acceptance (C12), over-band price
// confirmation (C11), cancel / no-show (C16) and the review form (C10).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, Loader2, Phone, MessageCircle, XCircle, UserX,
  Star, AlertTriangle, Mic, CheckCircle2, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDw } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { BookingDto } from "@/lib/api-client";
import type { DictKey } from "@/lib/i18n";
import { StatusTracker, StatusPill, PriceBand, StarRating } from "@/components/dwas/shared";
import { useDictation } from "@/components/dwas/speech";
import { cn } from "@/lib/utils";

const TAGS = ["on_time", "clean_work", "fair_price"] as const;

export function BookingDetail() {
  const t = useDw((s) => s.t);
  const lang = useDw((s) => s.lang);
  const toast = useToast();
  const activeBookingId = useDw((s) => s.activeBookingId);
  const navigate = useDw((s) => s.navigate);
  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [priceAck, setPriceAck] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const commentDictation = useDictation(lang === "ur" ? "ur-PK" : "en-PK");
  const aliveRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!activeBookingId) return;
    try {
      const res = await api.tickBooking(activeBookingId); // tick does expiry/cascade then returns current (D10)
      if (aliveRef.current) {
        setBooking(res.booking);
        setError(null);
      }
    } catch (e) {
      if (aliveRef.current) setError(e instanceof Error ? t("booking.notFound") : t("common.errorGeneric"));
    }
  }, [activeBookingId, t]);

  useEffect(() => {
    aliveRef.current = true;
    if (!activeBookingId) {
      navigate("client-history");
      return;
    }
    void refresh();
    const poll = setInterval(() => void refresh(), 4000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      aliveRef.current = false;
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [activeBookingId, navigate, refresh]);

  if (!activeBookingId) return null;

  if (error && !booking) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pt-16 pb-16 text-center sm:px-6">
        <p className="text-sm text-ink-500">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("client-history")}>{t("common.back")}</Button>
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden />
      </div>
    );
  }

  const overBand = booking.priceBand && booking.finalPrice !== undefined && booking.finalPrice > booking.priceBand.max * 1.25;
  const showOverBand = overBand && !priceAck && !booking.review && booking.status === "completed";
  const secondsLeft = Math.max(0, Math.round((booking.expiresAt - now) / 1000));
  const canCancel = ["requested", "accepted", "on_the_way"].includes(booking.status);
  const canNoShow = ["accepted", "on_the_way"].includes(booking.status);
  const canReview = booking.status === "completed" && !booking.review;

  async function act(to: string, extra?: { reason?: string }) {
    setBusy(true);
    try {
      const res = await api.bookingStatus(booking!.id, { to, ...extra });
      setBooking(res.booking);
    } catch {
      toast.toast({ description: t("common.errorGeneric") });
    } finally {
      setBusy(false);
    }
  }

  async function submitReview() {
    if (stars < 1) return;
    setSubmittingReview(true);
    try {
      const res = await api.reviewBooking(booking!.id, { stars, tags, comment: comment || commentDictation.finalText || undefined });
      setBooking(res.booking);
      toast.toast({ description: t("review.done") });
    } catch {
      toast.toast({ description: t("common.errorGeneric") });
    } finally {
      setSubmittingReview(false);
    }
  }

  const waText = encodeURIComponent(`${booking.summary_en} — ${booking.shareToken}`);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16 sm:px-6 sm:pt-6">
      <button type="button" onClick={() => navigate("client-history")} className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-brand-700">
        <ChevronLeft className="flip-rtl h-4 w-4" aria-hidden />
        {t("booking.historyTitle")}
      </button>

      <div className="mt-3 flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{t("booking.title")}</h1>
        <StatusPill status={booking.status} />
      </div>

      {/* Summary card */}
      <div className="mt-3 dw-card rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-lg font-extrabold text-brand-800">
            {booking.technicianName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink-900">{booking.technicianName}</p>
            <p className="text-xs text-ink-500">{t(`trade.${booking.trade}` as DictKey)} · {booking.jobType.replace(/_/g, " ")}</p>
          </div>
        </div>
        <p className={cn("mt-3 text-sm leading-relaxed text-ink-700", lang === "ur" && "font-urdu")} dir="auto">
          {lang === "ur" ? booking.summary_ur : booking.summary_en}
        </p>
        {booking.location.note && (
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
            <Timer className="h-3 w-3" aria-hidden /> {booking.location.note} · {booking.location.areaId?.replace(/-/g, " ")}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-50/60 px-3 py-2.5">
          <span className="text-xs font-semibold text-ink-600">
            {t("booking.priceBand")}
            {booking.finalPrice !== undefined && (booking.status === "completed" || booking.status === "reviewed") ? ` → ${t("booking.finalPrice")}` : ""}
          </span>
          {booking.finalPrice !== undefined && (booking.status === "completed" || booking.status === "reviewed") ? (
            <span className="font-extrabold text-brand-800">{booking.finalPrice.toLocaleString()} {t("common.pkr")}</span>
          ) : booking.priceBand ? (
            <PriceBand min={booking.priceBand.min} max={booking.priceBand.max} />
          ) : (
            <span className="text-xs text-ink-400">{t("card.noPrice")}</span>
          )}
        </div>
      </div>

      {/* Waiting banner */}
      {booking.status === "requested" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-amber-900">{t("booking.waiting")}</p>
              <p className="mt-0.5 text-xs text-amber-700">{t("booking.waitingHint")}</p>
            </div>
            <span className="rounded-xl bg-white px-3 py-2 text-sm font-extrabold tabular-nums text-amber-800 shadow-sm" role="timer">
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </span>
          </div>
        </motion.div>
      )}

      {/* Over-band confirmation (C11) */}
      {showOverBand && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-4" role="alert">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {t("booking.overBandTitle")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            {t("booking.overBandBody", { price: booking.finalPrice!.toLocaleString(), max: booking.priceBand!.max.toLocaleString() })}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" className="h-10 flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setPriceAck(true)}>
              {t("booking.acceptPrice")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-10 flex-1 border-rose-300 text-rose-700"
              onClick={() => void api.complaint(booking.id, { kind: "price_dispute", text: `Disputed final price ${booking.finalPrice}` })}
            >
              {t("booking.dispute")}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Tracker */}
      <div className="mt-3 dw-card rounded-3xl p-4 sm:p-5">
        <StatusTracker status={booking.status} />
      </div>

      {/* Contact after acceptance (C12) */}
      {booking.contact?.phone ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-900">{booking.contact.name}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-800" dir="ltr">{booking.contact.phone}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={`tel:${booking.contact.phone}`} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white">
              <Phone className="h-4 w-4" aria-hidden /> {t("booking.call")}
            </a>
            <a
              href={`https://wa.me/${booking.contact.phone.replace(/[^0-9]/g, "")}?text=${waText}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 text-sm font-bold text-emerald-800"
            >
              <MessageCircle className="h-4 w-4" aria-hidden /> {t("common.whatsapp")}
            </a>
          </div>
        </div>
      ) : (
        !["requested"].includes(booking.status) && booking.status !== "completed" && booking.status !== "reviewed" && (
          <p className="mt-3 rounded-xl border border-ink-200 bg-white p-3 text-xs text-ink-500">{t("booking.contactHidden")}</p>
        )
      )}

      {/* Review (C10) — unlocks at completed */}
      {canReview && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-brand-200 bg-white p-4">
          <h2 className="font-urdu text-lg font-bold text-ink-900" dir="rtl">{t("review.title")}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            {t("booking.done")}
          </p>
          <div className="mt-3">
            <StarRating value={stars} size={34} onChange={setStars} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]))}
                aria-pressed={tags.includes(tag)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold",
                  tags.includes(tag) ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 text-ink-600",
                )}
              >
                {t(`review.tag.${tag}` as DictKey)}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-500">{t("review.comment")}</span>
              <button
                type="button"
                onClick={() => (commentDictation.listening ? commentDictation.stop() : commentDictation.start())}
                className={cn("rounded-full p-2", commentDictation.listening ? "bg-rose-100 text-rose-600" : "bg-brand-50 text-brand-700")}
                aria-label={t("client.micStart")}
              >
                <Mic className={cn("h-4 w-4", commentDictation.listening && "animate-pulse")} aria-hidden />
              </button>
            </div>
            <Textarea
              value={comment || commentDictation.finalText}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              dir="auto"
              className="resize-none"
            />
          </div>
          <Button
            onClick={() => void submitReview()}
            disabled={stars < 1 || submittingReview}
            className="mt-3 h-12 w-full rounded-xl bg-brand-700 font-bold hover:bg-brand-800"
          >
            {submittingReview ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Star className="h-4 w-4" aria-hidden />}
            {t("review.submit")}
          </Button>
        </motion.section>
      )}

      {booking.review && booking.status === "reviewed" && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <StarRating value={booking.review.stars} size={18} />
          <p className="mt-1 text-sm font-semibold text-emerald-800">{t("review.done")}</p>
        </div>
      )}

      {/* Terminal state note */}
      {["declined", "expired", "cancelled_client", "cancelled_tech", "no_show"].includes(booking.status) && (
        <div className="mt-3 dw-card rounded-3xl p-4 sm:p-5 text-center text-sm text-ink-600">
          {t(`status.${booking.status}` as DictKey)}
        </div>
      )}

      {/* Client actions (C16) */}
      {canCancel && (
        <Button
          variant="outline"
          onClick={() => void act("cancelled_client", { reason: "client_cancel" })}
          disabled={busy}
          className="mt-4 h-12 w-full gap-2 border-rose-200 text-rose-700 hover:bg-rose-50"
        >
          <XCircle className="h-4 w-4" aria-hidden />
          {t("booking.cancel")}
        </Button>
      )}
      {canNoShow && (
        <Button
          variant="ghost"
          onClick={() => void act("no_show", { reason: "client_report" })}
          disabled={busy}
          className="mt-2 h-11 w-full gap-2 text-ink-500"
        >
          <UserX className="h-4 w-4" aria-hidden />
          {t("booking.noShow")}
        </Button>
      )}
    </div>
  );
}
