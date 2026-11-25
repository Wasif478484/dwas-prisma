// Booking history (C15): past bookings ordered by date with "Dubara
// bulayein" rebook that skips intake and goes straight to the results.
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, History as HistoryIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDw } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { BookingDto } from "@/lib/api-client";
import type { DictKey } from "@/lib/i18n";
import type { Trade, Urgency } from "@/lib/types";
import { StatusPill } from "@/components/dwas/shared";

export function History() {
  const t = useDw((s) => s.t);
  const openBooking = useDw((s) => s.openBooking);
  const setIntake = useDw((s) => s.setIntake);
  const setLocation = useDw((s) => s.setLocation);
  const setMatchResults = useDw((s) => s.setMatchResults);
  const navigate = useDw((s) => s.navigate);
  const [bookings, setBookings] = useState<BookingDto[] | null>(null);
  const [rebooking, setRebooking] = useState<string | null>(null);

  useEffect(() => {
    api.clientBookings()
      .then((res) => setBookings(res.bookings))
      .catch(() => setBookings([]));
  }, []);

  async function rebook(booking: BookingDto) {
    setRebooking(booking.id);
    try {
      const intake = {
        trade: booking.trade as Trade,
        jobType: booking.jobType,
        urgency: booking.urgency as Urgency,
        emergency: { is_emergency: false, kind: "none" as const },
        summary_en: booking.summary_en,
        summary_ur: booking.summary_ur,
        confidence: 1,
        language_detected: "roman_ur" as const,
        needs_clarification: false,
        clarifying_question_ur: null,
        source: "rules" as const,
      };
      setIntake(intake);
      const res = await api.match({
        trade: booking.trade as Trade,
        jobType: booking.jobType,
        urgency: booking.urgency,
        lat: booking.location.lat,
        lng: booking.location.lng,
        areaId: booking.location.areaId ?? "satellite-town",
      });
      setLocation({
        lat: booking.location.lat,
        lng: booking.location.lng,
        areaId: booking.location.areaId ?? "satellite-town",
        note: booking.location.note ?? "",
      });
      setMatchResults(res.results, { trade: booking.trade as Trade, jobType: booking.jobType, urgency: booking.urgency as Urgency });
      navigate("client-results");
    } finally {
      setRebooking(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-4 pb-10">
      <button type="button" onClick={() => navigate("client-home")} className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-teal-700">
        <ChevronLeft className="flip-rtl h-4 w-4" aria-hidden />
        {t("common.back")}
      </button>
      <h1 className="mt-3 flex items-center gap-2 text-xl font-extrabold tracking-tight text-stone-900">
        <HistoryIcon className="h-5 w-5 text-teal-700" aria-hidden />
        {t("booking.historyTitle")}
      </h1>

      {bookings === null ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" aria-hidden />
        </div>
      ) : bookings.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 p-8 text-center">
          <p className="text-sm text-stone-500">{t("booking.historyEmpty")}</p>
          <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={() => navigate("client-home")}>{t("client.homeTitle")}</Button>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {bookings.map((booking, i) => (
            <motion.li
              key={booking.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm"
            >
              <button
                type="button"
                className="w-full text-start"
                onClick={() => {
                  openBooking(booking.id);
                  navigate("client-booking");
                }}
                aria-label={booking.summary_en}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-stone-900">{booking.technicianName}</p>
                  <StatusPill status={booking.status} />
                </div>
                <p className="mt-1 truncate text-xs text-stone-500" dir="auto">
                  {t(`trade.${booking.trade}` as DictKey)} · {new Date(booking.createdAt).toLocaleDateString()}
                  {booking.finalPrice !== undefined ? ` · ${booking.finalPrice.toLocaleString()} ${t("common.pkr")}` : ""}
                </p>
              </button>
              <div className="mt-2.5 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={rebooking === booking.id}
                  onClick={() => void rebook(booking)}
                  className="h-9 gap-1.5 border-teal-200 text-xs font-bold text-teal-800"
                >
                  {rebooking === booking.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden />}
                  {t("booking.rebook")}
                </Button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
