// DWAS landing — "Paper & Pine" redesign. Hero shows the product in motion
// (a voice request typing itself out and resolving into a ranked, admin-approved
// technician), then a trade marquee, a feature bento, the four-step process and
// a closing call to action. Both entry buttons keep the spec route 9.1 behaviour.
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Mic, Wrench, ArrowRight, ShieldCheck, Banknote, LockKeyhole, AudioLines,
  MapPin, Star, CheckCircle2, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDw, TRADES } from "@/lib/store";
import { LangToggle, TRADE_ICONS, TradeIcon } from "@/components/dwas/shared";
import { LoginDialog } from "@/components/dwas/LoginDialog";
import type { DictKey } from "@/lib/i18n";
import type { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROBLEM_KEYS: Array<{ key: string; trade: Trade }> = [
  { key: "tap_leak", trade: "plumber" },
  { key: "geyser", trade: "plumber" },
  { key: "ac_cool", trade: "ac_fridge" },
  { key: "switch_spark", trade: "electrician" },
  { key: "fan", trade: "electrician" },
  { key: "door_lock", trade: "carpenter" },
  { key: "drain_block", trade: "plumber" },
  { key: "shift_help", trade: "mazdoor" },
];

const STEPS: DictKey[] = ["landing.step1", "landing.step2", "landing.step3", "landing.step4"];

const WAVE = [0.4, 0.8, 0.55, 1, 0.7, 0.9, 0.45, 0.75, 0.6, 0.95, 0.5, 0.7];

// Types the sample request out one character at a time, then holds, then loops.
function useTypedText(full: string, enabled: boolean) {
  const [len, setLen] = useState(enabled ? 0 : full.length);
  useEffect(() => {
    if (!enabled) {
      setLen(full.length);
      return;
    }
    setLen(0);
    let i = 0;
    let hold: ReturnType<typeof setTimeout> | undefined;
    const tick = setInterval(() => {
      i += 1;
      setLen(i);
      if (i >= full.length) {
        clearInterval(tick);
        hold = setTimeout(() => setLen(0), 4200);
      }
    }, 65);
    return () => {
      clearInterval(tick);
      if (hold) clearTimeout(hold);
    };
  }, [full, enabled]);
  return full.slice(0, len);
}

function VoiceDemoCard({ reduceMotion }: { reduceMotion: boolean | null }) {
  const t = useDw((s) => s.t);
  const lang = useDw((s) => s.lang);
  const sample = t("problem.prefill.tap_leak");
  const typed = useTypedText(sample, !reduceMotion);

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Glow behind the device */}
      <div className="dw-glow pointer-events-none absolute -inset-10 -z-10 rounded-full blur-2xl" aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-[28px] border border-ink-200 bg-white shadow-[0_30px_60px_-30px_rgb(10_50_40/0.35)]"
      >
        {/* Brand photo banner: the technician with a voice bubble */}
        <div className="relative h-44 w-full overflow-hidden bg-brand-50">
          <Image
            src="/hero-mistri.png"
            alt="A friendly Pakistani technician holding a phone with a voice message bubble"
            fill
            sizes="(min-width: 1024px) 28rem, 90vw"
            className="object-cover object-[center_35%]"
            priority
          />
        </div>

        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50 px-5 py-3">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink-600">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="dw-pulse-ring absolute inset-0 rounded-full text-emerald-500" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {t("landing.badge")}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-500 ring-1 ring-ink-200">
            <MapPin className="h-3 w-3" aria-hidden />
            {t("common.online")}
          </span>
        </div>

        <div className="space-y-5 p-5">
          {/* Voice request */}
          <div className="flex items-end gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white" aria-hidden>
              <Mic className="h-3.5 w-3.5" />
            </span>
            <div className="min-h-14 flex-1 rounded-2xl rounded-bl-md bg-ink-100 px-4 py-3">
              <p
                className={cn(
                  "text-[15px] leading-snug text-ink-900",
                  !reduceMotion && typed.length < sample.length && "dw-caret",
                  lang === "ur" && "font-urdu leading-loose",
                )}
                dir="auto"
              >
                {reduceMotion ? sample : typed}
              </p>
              <div className="mt-2 flex items-end gap-0.5" aria-hidden>
                {WAVE.map((h, i) => (
                  <motion.span
                    key={i}
                    className="w-0.5 rounded-full bg-brand-500"
                    animate={reduceMotion ? {} : { height: [`${h * 6}px`, `${h * 16}px`, `${h * 6}px`] }}
                    transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.08, ease: "easeInOut" }}
                    style={{ height: `${h * 10}px` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Resolved match */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 1.6, duration: 0.5 }}
            className="dw-lift flex items-center gap-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-4"
          >
            <TradeIcon trade="plumber" size="md" withLabel={false} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink-900">{t("trade.plumber")}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-800 ring-1 ring-brand-200">
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                  {t("badge.admin_approved")}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-700">
                  <Star className="h-3 w-3 fill-saffron-400 text-saffron-500" aria-hidden />
                  {t("landing.demoStatValue")}
                  <span className="font-medium text-ink-500">· {t("landing.demoStatLabel")}</span>
                </span>
              </div>
            </div>
            <span className="hidden items-center gap-1 rounded-xl bg-brand-700 px-3 py-2 text-xs font-bold text-white sm:inline-flex" aria-hidden>
              <Timer className="h-3.5 w-3.5" />
              {t("landing.clientBtnSub")}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Floating mic */}
      <motion.div
        animate={reduceMotion ? {} : { y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3.6, ease: "easeInOut" }}
        className="absolute -bottom-5 -end-4 flex h-16 w-16 items-center justify-center rounded-full bg-saffron-400 text-ink-900 shadow-xl shadow-saffron-600/30 ring-4 ring-ink-50"
        aria-hidden
      >
        <span className="dw-pulse-ring absolute inset-0 rounded-full text-saffron-400" />
        <Mic className="relative h-7 w-7" />
      </motion.div>
    </div>
  );
}

function BentoCard({
  className,
  tone,
  icon: Icon,
  title,
  body,
  children,
}: {
  className?: string;
  tone: "dark" | "saffron" | "light";
  icon: typeof Mic;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const palette = {
    dark: { card: "bg-brand-800 text-white border-brand-700", icon: "bg-white/10 text-saffron-300", body: "text-brand-100" },
    saffron: { card: "bg-saffron-100 text-ink-900 border-saffron-200", icon: "bg-white text-saffron-700", body: "text-ink-700" },
    light: { card: "bg-white text-ink-900 border-ink-200", icon: "bg-brand-50 text-brand-700", body: "text-ink-600" },
  }[tone];
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn("dw-lift flex flex-col rounded-3xl border p-6 sm:p-7", palette.card, className)}
    >
      <span className={cn("mb-5 flex h-11 w-11 items-center justify-center rounded-2xl", palette.icon)}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="font-display text-xl font-bold leading-snug tracking-tight">{title}</h3>
      <p className={cn("mt-2 max-w-md text-sm leading-relaxed", palette.body)}>{body}</p>
      {children && <div className="mt-auto pt-6">{children}</div>}
    </motion.article>
  );
}

function SpeakBars({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <div className="flex h-14 items-end gap-1" aria-hidden>
      {Array.from({ length: 28 }).map((_, i) => {
        const h = 0.25 + Math.abs(Math.sin(i * 0.7)) * 0.75;
        return (
          <motion.span
            key={i}
            className="w-1.5 rounded-full bg-saffron-300/90"
            animate={reduceMotion ? {} : { height: [`${h * 14}px`, `${h * 56}px`, `${h * 14}px`] }}
            transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.05, ease: "easeInOut" }}
            style={{ height: `${h * 30}px` }}
          />
        );
      })}
    </div>
  );
}

export function Landing() {
  const t = useDw((s) => s.t);
  const lang = useDw((s) => s.lang);
  const user = useDw((s) => s.user);
  const navigate = useDw((s) => s.navigate);
  const loginOpen = useDw((s) => s.loginOpen);
  const setLoginOpen = useDw((s) => s.setLoginOpen);
  const reduceMotion = useReducedMotion();

  function goClient() {
    if (!user || user.role !== "client") {
      setLoginOpen(true);
      return;
    }
    navigate("client-home");
  }

  function goTech() {
    if (!user || user.role !== "technician") {
      setLoginOpen(true);
      return;
    }
    navigate("tech-home");
  }

  // Marquee: the list is rendered twice so the -50% translate loops seamlessly.
  const marquee = [...PROBLEM_KEYS, ...PROBLEM_KEYS];

  return (
    <div className="relative overflow-hidden">
      {/* Top bar (landing has its own; the app shell is hidden on this view) */}
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pt-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white shadow-md shadow-brand-900/20">
            <Wrench className="h-5 w-5" aria-hidden />
            <span className="absolute -end-1 -top-1 h-3 w-3 rounded-full border-2 border-ink-50 bg-saffron-400" aria-hidden />
          </span>
          <span className="font-display font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">DWAS</span>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Button
            variant="ghost"
            size="sm"
            className="hidden text-ink-600 hover:bg-white hover:text-brand-800 sm:inline-flex"
            onClick={() => navigate("admin")}
            aria-label={t("landing.adminLink")}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {t("landing.adminLink")}
          </Button>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* ---------- Hero ---------- */}
        <section className="grid items-center gap-12 pt-10 pb-16 lg:grid-cols-[1.02fr_0.98fr] lg:pt-14 lg:pb-24">
          <div className="text-center lg:text-start">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-800 shadow-sm"
            >
              <MapPin className="h-3.5 w-3.5 text-brand-600" aria-hidden />
              {t("landing.badge")}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[2.6rem] leading-[1.02] font-extrabold tracking-[-0.03em] text-ink-900 sm:text-6xl lg:text-[4.25rem]"
            >
              {t("landing.heroTitle")}{" "}
              <span className="relative inline-block text-brand-700">
                {t("landing.heroTitleAccent")}
                <motion.span
                  className="absolute inset-x-0 bottom-[0.08em] -z-10 h-[0.42em] rounded-md bg-saffron-300/80"
                  initial={reduceMotion ? { scaleX: 1 } : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ originX: lang === "ur" ? 1 : 0 }}
                  aria-hidden
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.14 }}
              className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-ink-600 lg:mx-0"
            >
              {t("landing.heroSub")}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 font-urdu text-xl text-saffron-800"
              dir="auto"
            >
              {t("app.quote")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22 }}
              className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start"
            >
              <Button
                onClick={goClient}
                className="dw-press h-16 gap-3.5 rounded-2xl bg-brand-700 px-7 text-base font-bold text-white shadow-lg shadow-brand-900/25 hover:bg-brand-800"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-400 text-ink-900">
                  <Mic className="h-4.5 w-4.5" aria-hidden />
                </span>
                <span className="flex flex-col items-start leading-tight">
                  {t("landing.clientBtn")}
                  <span className="text-xs font-medium text-brand-200">{t("landing.clientBtnSub")}</span>
                </span>
                <ArrowRight className="flip-rtl h-4 w-4 opacity-80" aria-hidden />
              </Button>
              <Button
                onClick={goTech}
                variant="outline"
                className="dw-press h-16 gap-3.5 rounded-2xl border-ink-300 bg-white px-7 text-base font-bold text-ink-900 hover:border-brand-400 hover:bg-brand-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <Wrench className="h-4.5 w-4.5" aria-hidden />
                </span>
                <span className="flex flex-col items-start leading-tight">
                  {t("landing.techBtn")}
                  <span className="text-xs font-medium text-ink-500">{t("landing.techBtnSub")}</span>
                </span>
              </Button>
            </motion.div>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
              aria-label={t("client.tradesTitle")}
            >
              {TRADES.map((trade, i) => {
                const Icon = TRADE_ICONS[trade as Trade];
                return (
                  <motion.li
                    key={trade}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 + i * 0.06 }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700"
                  >
                    <Icon className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                    {t(`trade.${trade}` as DictKey)}
                  </motion.li>
                );
              })}
            </motion.ul>
          </div>

          <VoiceDemoCard reduceMotion={reduceMotion} />
        </section>

        {/* ---------- Problem marquee ---------- */}
        <section className="relative -mx-4 border-y border-ink-200/80 bg-white/60 py-5 sm:-mx-6" aria-label={t("client.cardsTitle")}>
          <div className="flex w-max dw-marquee">
            {marquee.map((item, i) => {
              const Icon = TRADE_ICONS[item.trade];
              return (
                <span
                  key={`${item.key}-${i}`}
                  className="me-3 inline-flex shrink-0 items-center gap-2 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 shadow-xs"
                  aria-hidden={i >= PROBLEM_KEYS.length}
                >
                  <Icon className="h-4 w-4 text-brand-600" aria-hidden />
                  {t(`problem.${item.key}` as DictKey)}
                </span>
              );
            })}
          </div>
        </section>

        {/* ---------- Feature bento ---------- */}
        <section className="grid gap-4 py-20 md:grid-cols-2" aria-label="Why DWAS">
          <BentoCard
            tone="dark"
            className="md:col-span-2 md:flex-row md:items-end md:justify-between md:gap-10 md:p-9"
            icon={AudioLines}
            title={t("landing.feature1Title")}
            body={t("landing.feature1Body")}
          >
            <div className="hidden w-full max-w-xs md:block">
              <SpeakBars reduceMotion={reduceMotion} />
            </div>
          </BentoCard>
          <BentoCard tone="saffron" icon={Banknote} title={t("landing.feature2Title")} body={t("landing.feature2Body")} />
          <BentoCard tone="light" icon={LockKeyhole} title={t("landing.feature3Title")} body={t("landing.feature3Body")} />
          <BentoCard tone="light" className="md:col-span-2" icon={ShieldCheck} title={t("landing.feature4Title")} body={t("landing.feature4Body")} />
        </section>

        {/* ---------- How it works ---------- */}
        <section className="pb-20" aria-label={t("landing.howItWorks")}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 max-w-xl"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">{t("landing.howItWorks")}</p>
          </motion.div>
          <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <span className="pointer-events-none absolute start-0 end-0 top-7 hidden h-px bg-gradient-to-r from-brand-200 via-brand-300 to-saffron-300 lg:block" aria-hidden />
            {STEPS.map((step, i) => (
              <motion.li
                key={step}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="dw-lift relative rounded-3xl border border-ink-200 bg-white p-6"
              >
                <span
                  className={cn(
                    "relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl font-display text-2xl font-extrabold",
                    i === STEPS.length - 1 ? "bg-saffron-400 text-ink-900" : "bg-brand-700 text-white",
                  )}
                >
                  {i + 1}
                </span>
                <p className="text-[15px] leading-relaxed font-semibold text-ink-800">{t(step)}</p>
              </motion.li>
            ))}
          </ol>
        </section>

        {/* ---------- Closing call to action ---------- */}
        <section className="relative mb-16 overflow-hidden rounded-[28px] bg-brand-900 px-6 py-12 text-center sm:px-12 sm:py-16" aria-label="Get started">
          <div className="dw-glow pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full opacity-70" aria-hidden />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {t("landing.heroTitle")} <span className="text-saffron-300">{t("landing.heroTitleAccent")}</span>
            </h2>
            <p className="mt-3 font-urdu text-lg text-saffron-200" dir="auto">{t("app.quote")}</p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button
                onClick={goClient}
                className="dw-press h-14 gap-2.5 rounded-2xl bg-saffron-400 px-7 text-base font-bold text-ink-900 hover:bg-saffron-300"
              >
                <Mic className="h-5 w-5" aria-hidden />
                {t("landing.clientBtn")}
              </Button>
              <Button
                onClick={goTech}
                variant="outline"
                className="dw-press h-14 gap-2.5 rounded-2xl border-white/25 bg-transparent px-7 text-base font-bold text-white hover:border-white/50 hover:bg-white/10 hover:text-white"
              >
                <Wrench className="h-5 w-5" aria-hidden />
                {t("landing.techBtn")}
              </Button>
            </div>
            <p className="mt-6 text-xs text-brand-300">{t("landing.demoNote")}</p>
          </div>
        </section>
      </main>

      {/* Store-driven login dialog (opened by the two entry buttons) */}
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} onLoggedIn={(u) => navigate(u.role === "admin" ? "admin" : u.role === "technician" ? "tech-home" : "client-home")}>
        <span />
      </LoginDialog>
    </div>
  );
}
