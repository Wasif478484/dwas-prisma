// Shared DWAS UI primitives: trade icons, badges, stars, language toggle,
// the animated five-step tracker and the countdown ring. Every action has an
// icon plus a label (spec 9.2) and colour is never the only signal.
"use client";

import { motion } from "framer-motion";
import {
  Wrench, Zap, Snowflake, Hammer, HandHelping, Star,
  BadgeCheck, Timer, MessageSquareQuote, ThumbsUp, Sparkles,
  Languages, Volume2, Clock, MapPin, Phone, ShieldCheck,
} from "lucide-react";
import { useDw } from "@/lib/store";
import type { DictKey } from "@/lib/i18n";
import type { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// ---- Trade visuals ----

export const TRADE_ICONS: Record<Trade, typeof Wrench> = {
  plumber: Wrench,
  electrician: Zap,
  ac_fridge: Snowflake,
  carpenter: Hammer,
  mazdoor: HandHelping,
};

export const TRADE_COLORS: Record<Trade, string> = {
  plumber: "bg-brand-50 text-brand-700 border-brand-200",
  electrician: "bg-saffron-50 text-saffron-800 border-saffron-200",
  ac_fridge: "bg-sky-50 text-sky-700 border-sky-200",
  carpenter: "bg-orange-50 text-orange-800 border-orange-200",
  mazdoor: "bg-ink-100 text-ink-700 border-ink-300",
};

export function TradeIcon({ trade, size = "md", withLabel = true }: { trade: Trade; size?: "sm" | "md" | "lg"; withLabel?: boolean }) {
  const t = useDw((s) => s.t);
  const Icon = TRADE_ICONS[trade];
  const box = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const icon = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("inline-flex items-center justify-center rounded-2xl border shadow-inner shadow-white/60", box, TRADE_COLORS[trade])}>
        <Icon className={icon} aria-hidden />
      </span>
      {withLabel && <span className="text-sm font-medium">{t(`trade.${trade}` as DictKey)}</span>}
    </span>
  );
}

// ---- Trust badges (never say "verified" — spec 7.3) ----

const BADGE_ICONS: Record<string, typeof BadgeCheck> = {
  admin_approved: BadgeCheck,
  five_jobs: ThumbsUp,
  top_rated: Star,
  fast_replies: Timer,
  newcomer: Sparkles,
  id_checked_demo: ShieldCheck,
};

export function BadgeChip({ badge }: { badge: string }) {
  const t = useDw((s) => s.t);
  const Icon = BADGE_ICONS[badge] ?? BadgeCheck;
  const key = `badge.${badge}` as DictKey;
  const label = t(key);
  if (label === key && !label.includes(" ")) return null; // unknown badge -> skip
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

// ---- Stars ----

export function StarRating({ value, size = 16, onChange, ariaLabel }: { value: number; size?: number; onChange?: (v: number) => void; ariaLabel?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role={onChange ? "radiogroup" : undefined} aria-label={ariaLabel ?? `Rating ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          whileTap={onChange ? { scale: 0.85 } : undefined}
          whileHover={onChange ? { scale: 1.15 } : undefined}
          className={onChange ? "p-1" : "cursor-default p-0.5"}
          aria-label={ariaLabel ?? `${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= value ? "fill-amber-400 text-amber-500" : "fill-none text-ink-300"}
            aria-hidden
          />
        </motion.button>
      ))}
    </span>
  );
}

// ---- Status pill ----

export const STATUS_STYLES: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800 border-amber-200",
  accepted: "bg-brand-100 text-brand-800 border-brand-200",
  on_the_way: "bg-brand-100 text-brand-800 border-brand-200",
  in_progress: "bg-sky-100 text-sky-800 border-sky-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  reviewed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  declined: "bg-rose-100 text-rose-800 border-rose-200",
  expired: "bg-ink-100 text-ink-600 border-ink-200",
  cancelled_client: "bg-ink-100 text-ink-600 border-ink-200",
  cancelled_tech: "bg-ink-100 text-ink-600 border-ink-200",
  no_show: "bg-rose-100 text-rose-800 border-rose-200",
  disputed: "bg-rose-100 text-rose-800 border-rose-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
  suspended: "bg-rose-100 text-rose-800 border-rose-200",
};

export function StatusPill({ status }: { status: string }) {
  const t = useDw((s) => s.t);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLES[status] ?? "bg-ink-100 text-ink-700 border-ink-200")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_STYLES[status]?.includes("amber") ? "bg-amber-500" : STATUS_STYLES[status]?.includes("emerald") ? "bg-emerald-500" : STATUS_STYLES[status]?.includes("rose") ? "bg-rose-500" : "bg-brand-500")} aria-hidden />
      {t((`status.${status}`) as DictKey)}
    </span>
  );
}

// ---- Language toggle ----

export function LangToggle() {
  const lang = useDw((s) => s.lang);
  const setLang = useDw((s) => s.setLang);
  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl border border-ink-200 bg-white p-0.5" role="group" aria-label="Language">
      <Languages className="mx-1.5 hidden h-3.5 w-3.5 text-ink-500 sm:block" aria-hidden />
      {(["en", "ur"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 sm:px-3",
            lang === l ? "bg-brand-700 text-white shadow-sm" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
            l === "ur" && "font-urdu text-base leading-none",
          )}
        >
          {l === "en" ? "English" : "اردو"}
        </button>
      ))}
    </div>
  );
}

// ---- Five-step tracker (C09) ----

const TRACKER_STEPS: Array<{ key: DictKey; status: string }> = [
  { key: "tracker.requested", status: "requested" },
  { key: "tracker.accepted", status: "accepted" },
  { key: "tracker.on_the_way", status: "on_the_way" },
  { key: "tracker.in_progress", status: "in_progress" },
  { key: "tracker.completed", status: "completed" },
];

const PROGRESS_ORDER: Record<string, number> = {
  requested: 0, accepted: 1, on_the_way: 2, in_progress: 3, completed: 4, reviewed: 5,
};

export function StatusTracker({ status }: { status: string }) {
  const t = useDw((s) => s.t);
  const current = PROGRESS_ORDER[status] ?? 0;
  return (
    <ol className="w-full" aria-label="Job progress">
      {TRACKER_STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.status} className="relative flex gap-3 pb-4 last:pb-0">
            {index < TRACKER_STEPS.length - 1 && (
              <span
                className={cn("absolute top-6 left-[13px] h-[calc(100%-1.5rem)] w-0.5", done ? "bg-brand-500" : "bg-ink-200")}
                aria-hidden
              />
            )}
            <motion.span
              initial={false}
              animate={active ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={active ? { repeat: Infinity, duration: 1.6, ease: "easeInOut" } : { duration: 0.2 }}
              className={cn(
                "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                done && "border-brand-500 bg-brand-500 text-white",
                active && "border-brand-500 bg-brand-50 text-brand-700",
                !done && !active && "border-ink-200 bg-white text-ink-400",
              )}
            >
              {done ? "✓" : index + 1}
            </motion.span>
            <span className={cn("pt-1 text-sm font-medium", active ? "text-brand-800" : done ? "text-ink-700" : "text-ink-400")}>
              {t(step.key)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---- Countdown ring (T03) ----

export function CountdownRing({ seconds, total, ariaLabel }: { seconds: number; total: number; ariaLabel?: string }) {
  const pct = Math.max(0, Math.min(1, seconds / total));
  const R = 26;
  const C = 2 * Math.PI * R;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return (
    <span className="relative inline-flex h-16 w-16 items-center justify-center" role="timer" aria-label={ariaLabel ?? `${mins}m ${secs}s remaining`}>
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" stroke="#E4DED1" strokeWidth="6" />
        <motion.circle
          cx="32" cy="32" r={R} fill="none"
          stroke={pct > 0.3 ? "#1D7059" : "#D92D20"}
          strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 0.5, ease: "linear" }}
        />
      </svg>
      <span className="absolute font-display text-xs font-bold tabular-nums text-ink-800">
        {mins}:{String(secs).padStart(2, "0")}
      </span>
    </span>
  );
}

// ---- Small labelled row ----

export function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-2 text-sm text-ink-500">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold text-ink-800">{children}</span>
    </div>
  );
}

export function PriceBand({ min, max, className }: { min: number; max: number; className?: string }) {
  const t = useDw((s) => s.t);
  return (
    <span className={cn("inline-flex items-baseline gap-1 font-semibold text-brand-800", className)}>
      {min.toLocaleString()}–{max.toLocaleString()}
      <span className="text-xs font-medium text-ink-500">{t("common.pkr")}</span>
    </span>
  );
}

export function OnlineDot({ online }: { online: boolean }) {
  const t = useDw((s) => s.t);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={cn("h-2 w-2 rounded-full", online ? "animate-pulse bg-emerald-500" : "bg-ink-300")} aria-hidden />
      <span className={online ? "text-emerald-700" : "text-ink-500"}>
        {online ? t("common.online") : t("common.offline")}
      </span>
    </span>
  );
}
