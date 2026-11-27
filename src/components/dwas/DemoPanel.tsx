// Demo panel (D09): floating controls behind ?demo=1 so a presenter can run
// the S1-S5 stories without luck — auto-accept, force the AI off, force voice
// off, and quick navigation.
"use client";

import { useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useDw } from "@/lib/store";

const emptySubscribe = () => () => {};

export function DemoPanel() {
  const t = useDw((s) => s.t);
  const demo = useDw((s) => s.demo);
  const setDemo = useDw((s) => s.setDemo);
  const navigate = useDw((s) => s.navigate);
  const setIntake = useDw((s) => s.setIntake);
  const setDraftText = useDw((s) => s.setDraftText);
  // Only render after mount so the URL check cannot cause a hydration mismatch.
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [enabled] = useState(() =>
    typeof window === "undefined" ? false : new URLSearchParams(window.location.search).get("demo") === "1",
  );
  const [open, setOpen] = useState(true);

  if (!mounted || !enabled) return null;

  function runS1Script() {
    setDraftText("geyser se pani tapak raha hai");
    setIntake(null);
    navigate("client-home");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="fixed inset-x-3 bottom-20 z-40 rounded-2xl border border-brand-300 bg-white/95 p-3 shadow-2xl backdrop-blur sm:right-4 sm:left-auto sm:w-72"
          role="complementary"
          aria-label={t("demo.panel")}
        >
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-brand-900 uppercase">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              {t("demo.panel")}
            </p>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 text-ink-400 hover:bg-ink-100" aria-label={t("common.close")}>
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          <p className="mt-1 text-[10px] leading-snug text-ink-400">{t("demo.hint")}</p>

          <div className="mt-2.5 space-y-2">
            {[
              { key: "demo.autoAccept" as const, prop: "autoAccept" as const, value: demo.autoAccept },
              { key: "demo.forceLLMOff" as const, prop: "forceLLMOff" as const, value: demo.forceLLMOff },
              { key: "demo.forceVoiceOff" as const, prop: "forceVoiceOff" as const, value: demo.forceVoiceOff },
            ].map((row) => (
              <label key={row.key} className="flex items-center justify-between gap-2 text-xs font-semibold text-ink-700">
                {t(row.key)}
                <Switch
                  checked={row.value}
                  onCheckedChange={(v) => setDemo({ [row.prop]: v })}
                  aria-label={t(row.key)}
                  className="h-6 w-11 data-[state=checked]:bg-brand-600"
                />
              </label>
            ))}
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => navigate("client-home")}>{t("admin.demo.role.client")}</Button>
            <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => navigate("tech-home")}>{t("admin.demo.role.technician")}</Button>
            <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => navigate("admin")}>{t("admin.demo.role.admin")}</Button>
          </div>
          <Button size="sm" className="mt-1.5 h-8 w-full bg-brand-600 text-[11px] font-bold hover:bg-brand-700" onClick={runS1Script}>
            {t("demo.script")}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
