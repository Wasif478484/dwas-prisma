// DWAS single-route shell (sandbox constraint: the user-visible app lives on
// /). Handles language direction (RTL for Urdu, C13), the top bar, animated
// view transitions and the sticky footer.
"use client";

import { useEffect, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, LogOut, Home, CalendarDays } from "lucide-react";
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
  const setLoginOpen = useDw((s) => s.setLoginOpen);
  const isClientView = view.startsWith("client-");
  const isTechView = view.startsWith("tech-");

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => navigate("landing")}
          className="flex items-center gap-2"
          aria-label="DWAS home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
            <Wrench className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-base font-extrabold tracking-tight text-stone-900">DWAS</span>
          <span className="hidden rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500 sm:inline">
            {t("common.demoData")}
          </span>
        </button>

        <div className="flex items-center gap-2">
          {isClientView && (
            <>
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => navigate("client-home")} aria-label={t("client.homeTitle")}>
                <Home className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t("client.homeTitle")}</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => navigate("client-history")} aria-label={t("booking.historyTitle")}>
                <CalendarDays className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t("booking.historyTitle")}</span>
              </Button>
            </>
          )}
          {isTechView && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => navigate("tech-home")} aria-label={t("tech.homeTitle")}>
              {t("tech.homeTitle")}
            </Button>
          )}
          <LangToggle />
          {user ? (
            <div className="flex items-center gap-1.5">
              <span className="hidden max-w-28 truncate text-xs font-semibold text-stone-600 sm:inline">{user.name}</span>
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800">{user.role}</span>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={logout} aria-label={t("common.logout")}>
                <LogOut className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ) : (
            <LoginDialog onLoggedIn={(u) => navigate(u.role === "admin" ? "admin" : u.role === "technician" ? "tech-home" : "client-home")}>
              <Button size="sm" className="h-9 bg-teal-600 text-xs font-bold hover:bg-teal-700">{t("common.demoLogin")}</Button>
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
    <footer className="safe-bottom mt-auto border-t border-stone-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-1.5 px-4 py-4 text-center sm:flex-row sm:px-6 sm:text-start">
        <p className="text-xs text-stone-500">{t("landing.footer")}</p>
        <p className="font-urdu text-sm text-teal-800" dir="auto">{t("app.quote")}</p>
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
    return <div className="min-h-screen flex flex-col bg-stone-50" aria-hidden />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      {view !== "landing" && <TopBar />}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
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
