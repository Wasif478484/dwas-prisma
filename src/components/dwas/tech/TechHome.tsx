// Technician app (T01, T02): three huge tiles (>=96px) with icon + Urdu label
// + small English, the big availability switch and a speaker button that reads
// the screen. Built for low-literacy users: never text alone.
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Layers, UserRound, Volume2, Loader2, BadgeCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useDw } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { TechnicianPublicDto } from "@/lib/api-client";
import type { DictKey } from "@/lib/i18n";
import { speak, stopSpeaking } from "@/components/dwas/speech";
import { LangToggle, BadgeChip } from "@/components/dwas/shared";
import { cn } from "@/lib/utils";

export function TechHome() {
  const t = useDw((s) => s.t);
  const lang = useDw((s) => s.lang);
  const toast = useToast();
  const navigate = useDw((s) => s.navigate);
  const [tech, setTech] = useState<TechnicianPublicDto | null>(null);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    api.techMe()
      .then((res) => {
        setTech(res.technician);
        setOnline(res.technician?.isOnline ?? false);
      })
      .catch(() => setTech(null))
      .finally(() => setLoading(false));
  }, []);

  async function toggleOnline(next: boolean) {
    setToggling(true);
    try {
      const res = await api.techProfile({ isOnline: next });
      setTech(res.technician);
      setOnline(res.technician.isOnline);
      if (next) {
        // T02: auto-offline after 4h of inactivity is server-side policy; also
        // refresh lastActiveAt on every job poll.
        toast.toast({ description: t("tech.onlineLabel") });
      }
    } catch {
      toast.toast({ description: t("common.errorGeneric") });
    } finally {
      setToggling(false);
    }
  }

  function readScreen() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const text = `${t("tech.homeTitle")}. ${t("tech.homeSub")}. ${t("tech.tile.jobs")}, ${t("tech.tile.current")}, ${t("tech.tile.profile")}. ${online ? t("tech.onlineLabel") : t("common.offline")}`;
    speak(text, lang === "ur" ? "ur-PK" : "en-PK");
    setSpeaking(true);
    setTimeout(() => setSpeaking(false), 8000);
  }

  const tiles: Array<{ icon: typeof Briefcase; urKey: DictKey; enKey: DictKey; badge?: number; onClick: () => void }> = [
    { icon: Briefcase, urKey: "tech.tile.jobs", enKey: "tech.tile.jobsEn", onClick: () => navigate("tech-jobs") },
    { icon: Layers, urKey: "tech.tile.current", enKey: "tech.tile.currentEn", onClick: () => navigate("tech-jobs") },
    { icon: UserRound, urKey: "tech.tile.profile", enKey: "tech.tile.profileEn", onClick: () => navigate("tech-onboard") },
  ];

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-6 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="font-urdu text-2xl font-extrabold text-stone-900" dir={lang === "ur" ? "rtl" : "ltr"}>
          {t("tech.homeTitle")}
        </h1>
        <LangToggle />
      </div>
      <p className="mt-0.5 text-sm text-stone-500">{t("tech.homeSub")}</p>

      {/* Online switch */}
      <div className={cn(
        "mt-5 flex items-center justify-between rounded-2xl border-2 p-4 transition-colors",
        online ? "border-emerald-300 bg-emerald-50" : "border-stone-200 bg-white",
      )}>
        <div className="flex items-center gap-3">
          <span className={cn("h-3.5 w-3.5 rounded-full", online ? "animate-pulse bg-emerald-500" : "bg-stone-300")} aria-hidden />
          <div>
            <p className="font-urdu text-lg font-bold text-stone-900" dir="rtl">{t("tech.onlineLabel")}</p>
            <p className="text-[11px] font-medium text-stone-500">{t("tech.onlineLabelEn")}</p>
          </div>
        </div>
        <Switch
          checked={online}
          disabled={toggling}
          onCheckedChange={(v) => void toggleOnline(v)}
          aria-label={t("tech.onlineLabel")}
          className="h-8 w-14 data-[state=checked]:bg-emerald-500"
        />
      </div>

      {tech?.approvalStatus !== "approved" && tech && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800">
          <BadgeCheck className="h-4 w-4" aria-hidden />
          {t("tech.pendingBadge")}
        </div>
      )}

      {/* Tiles — min height 96px, icon + Urdu + small English (T01) */}
      <div className="mt-5 grid gap-3">
        {tiles.map((tile, i) => (
          <motion.button
            key={tile.urKey}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileTap={{ scale: 0.97 }}
            onClick={tile.onClick}
            className="flex min-h-24 items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 text-start shadow-sm transition-colors hover:border-teal-400 hover:bg-teal-50/40"
            aria-label={t(tile.urKey)}
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white">
              <tile.icon className="h-7 w-7" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block font-urdu text-xl font-bold text-stone-900" dir="rtl">{t(tile.urKey)}</span>
              <span className="block text-xs font-medium text-stone-500">{t(tile.enKey)}</span>
            </span>
            {i === 0 && <span className="rounded-full bg-teal-100 px-2 py-1 text-[10px] font-bold text-teal-800">{t("tech.newJob")}</span>}
          </motion.button>
        ))}
      </div>

      {/* Stats strip (T09 light version) */}
      {tech && (
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {[
            { label: t("tech.stats.jobs"), value: String(tech.stats.jobsCompleted) },
            { label: t("tech.stats.rating"), value: `${tech.stats.ratingAvg ?? "—"}` },
            { label: t("tech.stats.trust"), value: `${tech.trustScore}` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-stone-200 bg-white p-3 text-center">
              <p className="text-2xl font-extrabold text-teal-800">{stat.value}</p>
              <p className="font-urdu mt-0.5 text-[11px] font-semibold text-stone-500" dir="rtl">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {tech && tech.badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tech.badges.map((b) => <BadgeChip key={b} badge={b} />)}
        </div>
      )}

      {/* Speaker button */}
      <button
        type="button"
        onClick={readScreen}
        className={cn(
          "mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-teal-200 bg-white font-bold text-teal-800",
          speaking && "bg-teal-50",
        )}
        aria-label={t("tech.speak")}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Volume2 className={cn("h-5 w-5", speaking && "animate-pulse")} aria-hidden />}
        {t("tech.speak")}
      </button>
    </div>
  );
}
