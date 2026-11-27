// DWAS single-route shell (sandbox constraint: the user-visible app lives on
// /). Handles language direction (RTL for Urdu, C13), the top bar, animated
// view transitions and the sticky footer.
"use client";

import { useEffect, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, LogOut, Home, CalendarDays, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDw } from "@/lib/store";
import { LangToggle } from "@/components/dwas/shared";
import { Landing } from "@/components/dwas/Landing";
import { LoginDialog } from "@/components/dwas/LoginDialog";
import { DemoPanel } from "@/components/dwas/DemoPanel";
import { ClientHome } from "@/components/dwas/client/ClientHome";
import { RequestConfirm } from "@/components/dwas/client/RequestConfirm";
import { Results } from "@/components/dwas/client/Results";
import { TechProfile } from "@/components/dwas/client/TechProfile";
import { BookingDetail } from "@/components/dwas/client/BookingDetail";
import { History } from "@/components/dwas/client/History";
import { TechHome } from "@/components/dwas/tech/TechHome";
import { TechJobs } from "@/components/dwas/tech/TechJobs";
import { TechJob } from "@/components/dwas/tech/TechJob";
import { TechOnboard } from "@/components/dwas/tech/TechOnboard";
import AdminPanel from "@/components/dwas/admin/AdminPanel";
import type { DictKey } from "@/lib/i18n";

const VIEW_LABELS: Partial<Record<string, DictKey>> = {
  "client-home": "client.homeTitle",
  "client-request": "request.title",
  "client-results": "results.title",
  "client-history": "booking.historyTitle",
  "tech-home": "tech.homeTitle",
  "tech-jobs": "tech.jobsTitle",
  "tech-onboard": "tech.onboardTitle",
  admin: "admin.title",
};

function TopBar() {
  const t = useDw((s) => s.t);
  const user = useDw((s) => s.user);
  const view = useDw((s) => s.view);
  const navigate = useDw((s) => s.navigate);
  const logout = useDw((s) => s.logout);
  const isClientView = view.startsWith("client-");
  const isTechView = view.startsWith("tech-");

  return (
    <header className="dw-glass sticky top-0 z-30 border-b border-ink-200/70">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
        <button
          type="button"
          onClick={() => navigate("landing")}
          className="dw-press flex items-center gap-2.5 rounded-xl py-1 pe-2"
          aria-label="DWAS home"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm shadow-brand-900/20">
            <Wrench className="h-[18px] w-[18px]" aria-hidden />
            <span className="absolute -end-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-ink-50 bg-saffron-400" aria-hidden />
          </span>
          <span className="font-display text-[17px] font-extrabold tracking-tight text-ink-900">DWAS</span>
          <span className="hidden rounded-full border border-ink-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500 md:inline">
            {t("common.demoData")}
          </span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {isClientView && (
            <nav className="flex items-center rounded-xl border border-ink-200 bg-white p-0.5" aria-label="Client navigation">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg px-2 text-xs text-ink-700 sm:px-2.5" onClick={() => navigate("client-home")} aria-label={t("client.homeTitle")}>
                <Home className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t("client.homeTitle")}</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg px-2 text-xs text-ink-700 sm:px-2.5" onClick={() => navigate("client-history")} aria-label={t("booking.historyTitle")}>
                <CalendarDays className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t("booking.historyTitle")}</span>
              </Button>
            </nav>
          )}
          {isTechView && (
            <Button variant="ghost" size="sm" className="h-8 rounded-lg px-3 text-xs text-ink-700" onClick={() => navigate("tech-home")} aria-label={t("tech.homeTitle")}>
              {t("tech.homeTitle")}
            </Button>
          )}
          <LangToggle />
          {user ? (
            <div className="flex items-center gap-1.5">
              <span className="hidden items-center gap-2 rounded-full border border-ink-200 bg-white ps-1 pe-3 py-1 sm:inline-flex">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-800" aria-hidden>
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-24 truncate text-xs font-semibold text-ink-800">{user.name}</span>
              </span>
              <span className="rounded-full bg-saffron-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-saffron-800">{user.role}</span>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-lg p-0 text-ink-600" onClick={logout} aria-label={t("common.logout")}>
                <LogOut className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ) : (
            <LoginDialog onLoggedIn={(u) => navigate(u.role === "admin" ? "admin" : u.role === "technician" ? "tech-home" : "client-home")}>
              <Button size="sm" aria-label={t("common.demoLogin")} className="h-9 rounded-lg bg-brand-700 px-3 text-xs font-bold hover:bg-brand-800 sm:px-4"><LogIn className="h-4 w-4 sm:hidden" aria-hidden /><span className="hidden sm:inline">{t("common.demoLogin")}</span></Button>
            </LoginDialog>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const t = useDw((s) => s.t);
  return (
    <footer className="safe-bottom mt-auto bg-brand-900 text-brand-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-center sm:flex-row sm:px-6 sm:text-start">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
            <Wrench className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-xs leading-relaxed text-brand-200">{t("landing.footer")}</p>
        </div>
        <p className="font-urdu text-base text-saffron-300" dir="auto">{t("app.quote")}</p>
      </div>
    </footer>
  );
}

export default function Page() {
  const lang = useDw((s) => s.lang);
  const view = useDw((s) => s.view);
  const navigate = useDw((s) => s.navigate);

  // Persisted state (lang, session) rehydrates on the client only, so the
  // first client render must match the server. Render an empty shell until
  // mounted, then swap — no hydration mismatch, no visible flash.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Language direction: RTL for Urdu (C13). Also expose it for the html tag.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
  }, [lang]);

  // ?view= deep link used by the demo panel / judges.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("view");
    if (target) navigate(target as typeof view);
  }, []);

  const screen = (() => {
    switch (view) {
      case "landing": return <Landing />;
      case "client-home": return <ClientHome />;
      case "client-request": return <RequestConfirm />;
      case "client-results": return <Results />;
      case "client-tech": return <TechProfile />;
      case "client-booking": return <BookingDetail />;
      case "client-history": return <History />;
      case "tech-home": return <TechHome />;
      case "tech-jobs": return <TechJobs />;
      case "tech-job": return <TechJob />;
      case "tech-onboard": return <TechOnboard />;
      case "admin": return <AdminPanel />;
      default: return <Landing />;
    }
  })();

  if (!mounted) {
    return <div className="dw-paper min-h-screen flex flex-col" aria-hidden />;
  }

  return (
    <div className="dw-paper flex min-h-screen flex-col text-ink-900">
      {view !== "landing" && <TopBar />}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-full"
          >
            {screen}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <DemoPanel />
    </div>
  );
}
