// DWAS landing — animated hero (motionsites style: motion as meaning, staggered
// reveals, a live "voice" waveform loop) with the two spec-required entry
// buttons (route 9.1) and the demo login.
"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Mic, Wrench, ArrowRight, ShieldCheck, Banknote, LockKeyhole, AudioLines,
  MapPin, Star, CheckCircle2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDw } from "@/lib/store";
import { LangToggle, TRADE_ICONS } from "@/components/dwas/shared";
import { LoginDialog } from "@/components/dwas/LoginDialog";
import type { DictKey } from "@/lib/i18n";
import type { Trade } from "@/lib/types";
import { TRADES } from "@/lib/store";

const FEATURES: Array<{ icon: typeof Mic; titleKey: DictKey; bodyKey: DictKey }> = [
  { icon: AudioLines, titleKey: "landing.feature1Title", bodyKey: "landing.feature1Body" },
  { icon: Banknote, titleKey: "landing.feature2Title", bodyKey: "landing.feature2Body" },
  { icon: LockKeyhole, titleKey: "landing.feature3Title", bodyKey: "landing.feature3Body" },
  { icon: ShieldCheck, titleKey: "landing.feature4Title", bodyKey: "landing.feature4Body" },
];

const STEPS: DictKey[] = ["landing.step1", "landing.step2", "landing.step3", "landing.step4"];

const WAVE_BARS = [0.5, 0.9, 0.4, 1, 0.7, 0.35, 0.85, 0.55, 0.95, 0.45, 0.75, 0.6];

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

  return (
    <div className="relative overflow-hidden">
      {/* soft background field */}
      <div className="hero-dots pointer-events-none absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-teal-100/50 blur-3xl" aria-hidden />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pt-5 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
            <Wrench className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-stone-900">DWAS</span>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Button
            variant="ghost"
            size="sm"
            className="hidden text-stone-500 hover:text-teal-800 sm:inline-flex"
            onClick={() => navigate("admin")}
            aria-label={t("landing.adminLink")}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {t("landing.adminLink")}
          </Button>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <section className="grid items-center gap-8 pt-10 pb-14 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16 lg:pb-20">
          <div className="text-center lg:text-start">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-wide text-teal-800 shadow-sm"
            >
              <MapPin className="h-3 w-3" aria-hidden />
              {t("landing.badge")}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="text-4xl leading-tight font-extrabold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl"
            >
              {t("landing.heroTitle")}{" "}
              <span className="relative inline-block text-teal-700">
                {t("landing.heroTitleAccent")}
                <motion.span
                  className="absolute inset-x-0 -bottom-1 h-3 rounded-full bg-teal-200/70"
                  initial={reduceMotion ? { scaleX: 1 } : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  style={{ originX: lang === "ur" ? 1 : 0 }}
                  aria-hidden
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-600 lg:mx-0"
            >
              {t("landing.heroSub")}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-3 font-urdu text-lg text-teal-800"
              dir="auto"
            >
              {t("app.quote")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
            >
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={goClient}
                  className="h-14 gap-3 rounded-2xl bg-teal-600 px-7 text-base font-bold shadow-lg shadow-teal-600/20 hover:bg-teal-700"
                >
                  <Mic className="h-5 w-5" aria-hidden />
                  <span className="flex flex-col items-start leading-tight">
                    {t("landing.clientBtn")}
                    <span className="text-[11px] font-medium text-teal-100">{t("landing.clientBtnSub")}</span>
                  </span>
                  <ArrowRight className="flip-rtl h-4 w-4" aria-hidden />
                </Button>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={goTech}
                  variant="outline"
                  className="h-14 gap-3 rounded-2xl border-2 border-teal-600 px-7 text-base font-bold text-teal-800 hover:bg-teal-50"
                >
                  <Wrench className="h-5 w-5" aria-hidden />
                  <span className="flex flex-col items-start leading-tight">
                    {t("landing.techBtn")}
                    <span className="text-[11px] font-medium text-teal-600">{t("landing.techBtnSub")}</span>
                  </span>
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-stone-500 lg:justify-start"
            >
              {TRADES.map((trade, i) => {
                const Icon = TRADE_ICONS[trade as Trade];
                return (
                  <motion.span
                    key={trade}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 + i * 0.06 }}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Icon className="h-3.5 w-3.5 text-teal-700" aria-hidden />
                    {t(`trade.${trade}` as DictKey)}
                  </motion.span>
                );
              })}
            </motion.div>
          </div>

          {/* Hero art with floating proof chips */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <div className="overflow-hidden rounded-3xl border border-teal-100 bg-white shadow-xl shadow-teal-900/5">
              <Image
                src="/hero-mistri.png"
                alt="A friendly Pakistani technician holding a phone with a voice message bubble"
                className="h-auto w-full object-cover"
                width={1344}
                height={768}
                priority
              />
            </div>

            <motion.div
              animate={reduceMotion ? {} : { y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3.4, ease: "easeInOut" }}
              className="absolute -top-4 -left-3 flex items-center gap-2 rounded-2xl border border-teal-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur"
            >
              <span className="flex items-end gap-0.5" aria-hidden>
                {WAVE_BARS.slice(0, 5).map((h, i) => (
                  <motion.span
                    key={i}
                    className="w-1 rounded-full bg-teal-600"
                    animate={reduceMotion ? {} : { height: [`${h * 18}px`, `${h * 26}px`, `${h * 18}px`] }}
                    transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.12, ease: "easeInOut" }}
                    style={{ height: `${h * 20}px` }}
                  />
                ))}
              </span>
              <span className="font-urdu text-sm font-semibold text-teal-900" dir="rtl">بولیے، کیا مسئلہ ہے؟</span>
            </motion.div>

            <motion.div
              animate={reduceMotion ? {} : { y: [0, 7, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.6 }}
              className="absolute -bottom-4 left-6 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
              <span className="text-xs font-semibold text-stone-700">{t("badge.admin_approved")}</span>
            </motion.div>

            <motion.div
              animate={reduceMotion ? {} : { y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.6, ease: "easeInOut", delay: 1.1 }}
              className="absolute top-1/3 -right-3 flex items-center gap-1.5 rounded-2xl border border-amber-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur"
            >
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden />
              <span className="text-xs font-bold text-stone-800">4.8</span>
              <span className="text-[10px] text-stone-500">· 32 {t("common.jobs")}</span>
            </motion.div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="grid gap-4 pb-14 sm:grid-cols-2 lg:grid-cols-4" aria-label="Why DWAS">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.titleKey}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <feature.icon className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="text-sm font-bold text-stone-900">{t(feature.titleKey)}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{t(feature.bodyKey)}</p>
            </motion.div>
          ))}
        </section>

        {/* How it works */}
        <section className="pb-16" aria-label="How it works">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-6 text-center text-2xl font-extrabold tracking-tight text-stone-900"
          >
            {lang === "ur" ? "کیسے چلتا ہے" : "How it works"}
          </motion.h2>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <motion.li
                key={step}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: i * 0.1 }}
                className="relative flex gap-3 rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50/60 to-white p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed font-medium text-stone-700">{t(step)}</p>
                <ChevronRight className="flip-rtl absolute top-1/2 -right-2 hidden h-5 w-5 -translate-y-1/2 text-teal-300 lg:block" aria-hidden />
              </motion.li>
            ))}
          </ol>
        </section>
      </main>

      {/* Store-driven login dialog (opened by the two entry buttons) */}
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} onLoggedIn={(u) => navigate(u.role === "admin" ? "admin" : u.role === "technician" ? "tech-home" : "client-home")}>
        <span />
      </LoginDialog>
    </div>
  );
}
