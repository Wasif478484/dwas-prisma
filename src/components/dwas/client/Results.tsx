// Results (C06, C11): ranked technician cards with reasons, rounded distance,
// price band and reply time. Quick book (C18) sends to the best match and the
// cascade moves on if they do not answer (S5).
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, ChevronRight, Zap, Clock, Loader2, ChevronLeft, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDw } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { MatchCardDto } from "@/lib/api-client";
import type { DictKey } from "@/lib/i18n";
import type { Trade } from "@/lib/types";
import { TradeIcon, PriceBand } from "@/components/dwas/shared";
import { cn } from "@/lib/utils";

function reasonText(key: string, value: number | undefined, t: (k: DictKey, v?: Record<string, string | number>) => string): string | null {
  switch (key) {
    case "nearest": return t("reasons.nearest");
    case "top_rated": return t("reasons.top_rated", { value: value ?? 4.5 });
    case "many_jobs": return t("reasons.many_jobs", { value: value ?? 0 });
    case "fast_replies": return value !== undefined && value !== null ? t("reasons.fast_replies", { value }) : null;
    case "newcomer": return t("reasons.newcomer");
    default: return null;
  }
}

function ResultCard({ card, index, onOpen, onBook, bookingBusy }: {
  card: MatchCardDto;
  index: number;
  onOpen: () => void;
  onBook: () => void;
  bookingBusy: boolean;
}) {
  const t = useDw((s) => s.t);
  const reasons = card.reasons.map((r) => reasonText(r.key, r.value, t)).filter(Boolean) as string[];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      className={cn(
        "dw-card dw-lift rounded-3xl p-4 sm:p-5",
        card.isNewcomerSlot ? "border-dashed border-brand-400" : "border-ink-200 hover:border-brand-300",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-700 font-display text-lg font-extrabold text-white shadow-sm shadow-brand-900/20">
          {card.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onOpen} className="truncate text-start text-base font-bold text-ink-900 hover:text-brand-700" aria-label={card.name}>
              {card.name}
            </button>
            {card.isNewcomerSlot && (
              <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{t("common.new")}</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden />
              <strong className="text-ink-700">{card.ratingAvg ?? "—"}</strong>
              <span>({card.jobsCompleted} {t("common.jobs")})</span>
            </span>
            <span>{card.distanceKmRounded} {t("common.km")}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden />
              {card.avgResponseSec !== null ? `${Math.round(card.avgResponseSec / 60)} ${t("common.min")}` : t("card.replyUnknown")}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.trades.map((tr) => <TradeIcon key={tr} trade={tr as Trade} size="sm" withLabel={false} />)}
          </div>
        </div>
        <div className="text-end">
          {card.priceBand ? (
            <PriceBand min={card.priceBand.min} max={card.priceBand.max} />
          ) : (
            <span className="text-xs text-ink-400">{t("card.noPrice")}</span>
          )}
        </div>
      </div>
      {reasons.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="reasons">
          {reasons.slice(0, 2).map((reason) => (
            <li key={reason} className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-800">
              {reason}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={onOpen} className="h-10 flex-1 gap-1 border-ink-200 text-sm font-semibold text-ink-700">
          {t("profile.title")}
          <ChevronRight className="flip-rtl h-4 w-4" aria-hidden />
        </Button>
        <Button size="sm" onClick={onBook} disabled={bookingBusy} className="h-10 flex-1 gap-1 bg-brand-700 text-sm font-bold hover:bg-brand-800">
          <Banknote className="h-4 w-4" aria-hidden />
          {t("profile.book")}
        </Button>
      </div>
    </motion.div>
  );
}

export function Results() {
  const t = useDw((s) => s.t);
  const results = useDw((s) => s.matchResults);
  const meta = useDw((s) => s.matchMeta);
  const setIntake = useDw((s) => s.setIntake);
  const selectTech = useDw((s) => s.selectTech);
  const openBooking = useDw((s) => s.openBooking);
  const navigate = useDw((s) => s.navigate);
  const intake = useDw((s) => s.intake);
  const location = useDw((s) => s.location);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [quickBusy, setQuickBusy] = useState(false);

  async function book(technicianId?: string) {
    if (!intake || !location) return;
    setBusyId(technicianId ?? "__quick");
    if (!technicianId) setQuickBusy(true);
    try {
      const res = await api.createBooking({
        technicianId,
        quick: !technicianId,
        intake,
        location,
      });
      openBooking(res.booking.id);
      navigate("client-booking");
    } catch {
      // leave the list open; error surfaced by toasts elsewhere
    } finally {
      setBusyId(null);
      setQuickBusy(false);
    }
  }

  if (results.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pt-16 pb-16 text-center sm:px-6">
        <p className="text-sm text-ink-500">{t("results.empty")}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("client-request")}>{t("results.back")}</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16 sm:px-6 sm:pt-6">
      <button type="button" onClick={() => navigate("client-request")} className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-brand-700">
        <ChevronLeft className="flip-rtl h-4 w-4" aria-hidden />
        {t("results.back")}
      </button>
      <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{t("results.title")}</h1>
      <p className="mt-0.5 text-sm text-ink-500">
        {meta ? `${t(`trade.${meta.trade}` as DictKey)} · ${t(`urgency.${meta.urgency}` as DictKey)} · ` : ""}
        {t("results.sub")}
      </p>

      <Button
        onClick={() => void book()}
        disabled={quickBusy}
        className="dw-press mt-4 h-14 w-full gap-2 rounded-2xl bg-brand-700 py-4 text-base font-bold text-white shadow-lg shadow-brand-900/25 hover:bg-brand-800"
      >
        {quickBusy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Zap className="h-5 w-5" aria-hidden />}
        {t("results.quickBook")}
      </Button>
      <p className="mt-1.5 text-center text-[11px] text-ink-400">{t("results.indicative")}</p>

      <div className="mt-5 space-y-3">
        {results.map((card, i) => (
          <ResultCard
            key={card.technicianId}
            card={card}
            index={i}
            bookingBusy={busyId === card.technicianId}
            onOpen={() => {
              selectTech(card.technicianId);
              navigate("client-tech");
            }}
            onBook={() => void book(card.technicianId)}
          />
        ))}
      </div>
    </div>
  );
}
