// Public technician profile (C07): reads only admin-approved technicians,
// shows badges (never "verified"), rating breakdown and last 5 visible reviews.
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, MapPin, Star, Banknote, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDw } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { ReviewDto, TechnicianPublicDto } from "@/lib/api-client";
import type { DictKey } from "@/lib/i18n";
import type { Trade } from "@/lib/types";
import { BadgeChip, OnlineDot, StarRating, TradeIcon, InfoRow } from "@/components/dwas/shared";
import { cn } from "@/lib/utils";

export function TechProfile() {
  const t = useDw((s) => s.t);
  const lang = useDw((s) => s.lang);
  const selectedTechId = useDw((s) => s.selectedTechId);
  const selectTech = useDw((s) => s.selectTech);
  const openBooking = useDw((s) => s.openBooking);
  const navigate = useDw((s) => s.navigate);
  const intake = useDw((s) => s.intake);
  const location = useDw((s) => s.location);
  const [tech, setTech] = useState<TechnicianPublicDto | null>(null);
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!selectedTechId) {
      navigate("client-results");
      return;
    }
    setLoading(true);
    api.technicianPublic(selectedTechId)
      .then((res) => {
        setTech(res.technician);
        setReviews(res.reviews);
      })
      .catch(() => setTech(null))
      .finally(() => setLoading(false));
  }, [selectedTechId, navigate]);

  async function book() {
    if (!tech || !intake || !location) return;
    setBooking(true);
    try {
      const res = await api.createBooking({ technicianId: tech.id, intake, location });
      openBooking(res.booking.id);
      navigate("client-booking");
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" aria-hidden />
      </div>
    );
  }
  if (!tech) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 pt-16 pb-10 text-center">
        <p className="text-sm text-stone-500">{t("results.empty")}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("client-results")}>{t("common.back")}</Button>
      </div>
    );
  }

  const bio = lang === "ur" ? tech.bioUr ?? tech.bioEn : tech.bioEn ?? tech.bioUr;

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-4 pb-10">
      <button
        type="button"
        onClick={() => {
          selectTech(null);
          navigate("client-results");
        }}
        className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-teal-700"
      >
        <ChevronLeft className="flip-rtl h-4 w-4" aria-hidden />
        {t("tech.back")}
      </button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-xl font-extrabold text-teal-800">
            {tech.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold text-stone-900">{tech.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <OnlineDot online={tech.isOnline} />
              {tech.isSeed && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">{t("common.demoData")}</span>}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {tech.trades.map((tr) => <TradeIcon key={tr} trade={tr as Trade} size="sm" />)}
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5">
          <StarRating value={Math.round(tech.stats.ratingAvg ?? 0)} size={15} />
          <span className="text-sm font-bold text-stone-800">{tech.stats.ratingAvg ?? "—"}</span>
          <span className="text-xs text-stone-500">
            {t("profile.stats", { jobs: tech.stats.jobsCompleted, rating: tech.stats.ratingAvg ?? "—", count: tech.stats.ratingCount })}
          </span>
        </div>

        <div className="mt-3">
          <h2 className="mb-1.5 text-xs font-bold tracking-wide text-stone-400 uppercase">{t("profile.badges")}</h2>
          <div className="flex flex-wrap gap-1.5">
            {tech.badges.map((b) => <BadgeChip key={b} badge={b} />)}
          </div>
        </div>

        {bio && (
          <div className="mt-3">
            <h2 className="mb-1 text-xs font-bold tracking-wide text-stone-400 uppercase">{t("profile.bio")}</h2>
            <p className={cn("text-sm leading-relaxed text-stone-700", lang === "ur" && "font-urdu")} dir="auto">{bio}</p>
          </div>
        )}

        <div className="mt-3 divide-y divide-stone-100">
          <InfoRow icon={<Hourglass className="h-4 w-4" aria-hidden />} label={t("tech.years")}>{tech.yearsExperience}</InfoRow>
          <InfoRow icon={<MapPin className="h-4 w-4" aria-hidden />} label={t("profile.areas")}>{tech.areaId?.replace(/-/g, " ") ?? "—"}</InfoRow>
          {tech.visitFeePKR !== null && (
            <InfoRow icon={<Banknote className="h-4 w-4" aria-hidden />} label={t("profile.visitFee")}>{tech.visitFeePKR.toLocaleString()} {t("common.pkr")}</InfoRow>
          )}
          <InfoRow icon={<Star className="h-4 w-4" aria-hidden />} label={t("profile.trustScore")}>{tech.trustScore}/100</InfoRow>
        </div>

        <Button onClick={() => void book()} disabled={booking} className="mt-4 h-13 w-full rounded-2xl bg-teal-600 py-4 text-base font-bold shadow-lg shadow-teal-600/20 hover:bg-teal-700">
          {booking ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Banknote className="h-5 w-5" aria-hidden />}
          {t("profile.book")}
        </Button>
      </motion.div>

      <section className="mt-5" aria-label={t("profile.reviews")}>
        <h2 className="mb-2 text-sm font-bold text-stone-700">{t("profile.reviews")}</h2>
        {reviews.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-500">{t("profile.noReviews")}</p>
        ) : (
          <ul className="space-y-2">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-xl border border-stone-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <StarRating value={review.stars} size={13} />
                  <span className="text-[10px] text-stone-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                {review.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {review.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
                        {t(`review.tag.${tag}` as DictKey)}
                      </span>
                    ))}
                  </div>
                )}
                {review.comment && <p className="mt-1.5 text-sm text-stone-600" dir="auto">{review.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
