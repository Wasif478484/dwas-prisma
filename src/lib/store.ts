// DWAS client store — session, language, view routing and demo controls.
// The whole product is a single-route app (sandbox constraint), so view
// switching happens through this store instead of the Next.js router.
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { IntakeResult, Trade, Urgency } from "@/lib/types";
import type { DictKey, Lang } from "@/lib/i18n";
import { translate } from "@/lib/i18n";
import type { MatchCardDto } from "@/lib/api-client";

export type View =
  | "landing"
  | "client-home"
  | "client-request"
  | "client-results"
  | "client-tech"
  | "client-booking"
  | "client-history"
  | "tech-home"
  | "tech-jobs"
  | "tech-job"
  | "tech-onboard"
  | "admin";

export interface SessionUser {
  id: string;
  name: string;
  role: "client" | "technician" | "admin";
  language: string;
  isSeed: boolean;
}

export interface RequestLocation {
  lat: number;
  lng: number;
  areaId: string;
  note: string;
}

interface DwState {
  view: View;
  lang: Lang;
  token: string | null;
  user: SessionUser | null;
  intake: IntakeResult | null;
  draftText: string;
  location: RequestLocation | null;
  matchResults: MatchCardDto[];
  matchMeta: { trade: Trade; jobType: string; urgency: Urgency } | null;
  selectedTechId: string | null;
  activeBookingId: string | null;
  techJobId: string | null;
  demo: {
    autoAccept: boolean;
    forceLLMOff: boolean;
    forceVoiceOff: boolean;
  };
  loginOpen: boolean;

  navigate: (view: View) => void;
  setLang: (lang: Lang) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  setSession: (token: string, user: SessionUser) => void;
  logout: () => void;
  setLoginOpen: (open: boolean) => void;
  setIntake: (intake: IntakeResult | null) => void;
  setDraftText: (text: string) => void;
  setLocation: (location: RequestLocation) => void;
  setMatchResults: (results: MatchCardDto[], meta?: { trade: Trade; jobType: string; urgency: Urgency }) => void;
  selectTech: (id: string | null) => void;
  openBooking: (id: string | null) => void;
  openTechJob: (id: string | null) => void;
  setDemo: (patch: Partial<DwState["demo"]>) => void;
  startClientFlow: () => void;
  startTechFlow: () => void;
}

export const useDw = create<DwState>()(
  persist(
    (set, get) => ({
      view: "landing",
      lang: "en",
      token: null,
      user: null,
      intake: null,
      draftText: "",
      location: null,
      matchResults: [],
      matchMeta: null,
      selectedTechId: null,
      activeBookingId: null,
      techJobId: null,
      demo: { autoAccept: false, forceLLMOff: false, forceVoiceOff: false },
      loginOpen: false,

      navigate: (view) => set({ view }),
      setLang: (lang) => set({ lang }),
      t: (key, vars) => translate(get().lang, key, vars),
      setSession: (token, user) => set({ token, user, loginOpen: false }),
      logout: () =>
        set({ token: null, user: null, view: "landing", intake: null, activeBookingId: null, techJobId: null }),
      setLoginOpen: (open) => set({ loginOpen: open }),
      setIntake: (intake) => set({ intake }),
      setDraftText: (draftText) => set({ draftText }),
      setLocation: (location) => set({ location }),
      setMatchResults: (matchResults, meta) => set({ matchResults, matchMeta: meta ?? null }),
      selectTech: (selectedTechId) => set({ selectedTechId }),
      openBooking: (activeBookingId) => set({ activeBookingId }),
      openTechJob: (techJobId) => set({ techJobId }),
      setDemo: (patch) => set({ demo: { ...get().demo, ...patch } }),

      startClientFlow: () => {
        const user = get().user;
        if (user && user.role !== "client") {
          set({ view: "client-home" });
          return;
        }
        set({ view: "client-home" });
      },
      startTechFlow: () => set({ view: "tech-home" }),
    }),
    {
      name: "dwas-state",
      partialize: (state) => ({ lang: state.lang, token: state.token, user: state.user }),
    },
  ),
);

export const TRADES: Trade[] = ["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor"];
export const URGENCIES: Urgency[] = ["now", "today", "tomorrow", "flexible"];
