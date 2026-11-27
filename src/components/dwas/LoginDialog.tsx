// Demo login (D05): mock OTP — any phone with code 123456. Clearly labelled
// as a demo; never claims real phone verification (honest labels rule).
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, KeyRound, User, Loader2, ShieldAlert, UserRound, Wrench, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDw, type SessionUser } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { DictKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const QUICK_ACCOUNTS: Array<{ role: SessionUser["role"]; phone: string; name: string; labelKey: DictKey; icon: typeof User }> = [
  { role: "client", phone: "+923001234567", name: "Ayesha Khan", labelKey: "login.quickClient", icon: UserRound },
  { role: "technician", phone: "+923010000001", name: "Rafiq Ahmad", labelKey: "login.quickTech", icon: Wrench },
  { role: "admin", phone: "+923009876543", name: "Sara (operator)", labelKey: "login.quickAdmin", icon: ShieldCheck },
];

export function LoginDialog({ children, onLoggedIn, open: controlledOpen, onOpenChange }: {
  children: React.ReactNode;
  onLoggedIn?: (user: SessionUser) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useDw((s) => s.t);
  const setSession = useDw((s) => s.setSession);
  const storeLoginOpen = useDw((s) => s.loginOpen);
  const setLoginOpen = useDw((s) => s.setLoginOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : storeLoginOpen;
  const handleOpenChange = isControlled ? (o: boolean) => onOpenChange?.(o) : (o: boolean) => setLoginOpen(o);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<SessionUser["role"]>("client");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(p: string, c: string, r: SessionUser["role"], n?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await api.mockOtp({ phone: p, code: c || "123456", role: r, name: n || undefined });
      setSession(res.token, res.user);
      onLoggedIn?.(res.user);
      handleOpenChange(false);
    } catch {
      setError(t("login.failed"));
    } finally {
      setBusy(false);
    }
  }

  const trigger = isControlled ? null : <DialogTrigger asChild>{children}</DialogTrigger>;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger}
      <DialogContent className="sm:max-w-md" dir="auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-brand-700" aria-hidden />
            {t("login.title")}
          </DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void login(phone, code, role, name);
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="dwas-phone">{t("login.phone")}</Label>
            <div className="relative">
              <Phone className="absolute top-2.5 left-2.5 h-4 w-4 text-ink-400" aria-hidden />
              <Input id="dwas-phone" inputMode="tel" placeholder="03xx xxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-8" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="dwas-code">{t("login.code")}</Label>
              <Input id="dwas-code" inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dwas-name">{t("login.name")}</Label>
              <Input id="dwas-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("admin.demo.role")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["client", "technician", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  aria-pressed={role === r}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs font-semibold transition-colors",
                    role === r ? "border-brand-600 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-500 hover:bg-ink-50",
                  )}
                >
                  {t(`admin.demo.role.${r}` as DictKey)}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="h-11 bg-brand-700 hover:bg-brand-800">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {t("login.submit")}
          </Button>
        </form>
        <div className="grid gap-2 rounded-xl bg-brand-50/70 p-3">
          <p className="text-xs font-medium text-brand-900">{t("login.quick")}</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_ACCOUNTS.map((acc) => (
              <motion.button
                key={acc.phone}
                type="button"
                whileTap={{ scale: 0.96 }}
                disabled={busy}
                onClick={() => void login(acc.phone, "123456", acc.role, acc.name)}
                className="flex flex-col items-center gap-1 rounded-xl border border-brand-200 bg-white px-2 py-2.5 text-[11px] font-semibold text-brand-900 hover:border-brand-400"
              >
                <acc.icon className="h-4 w-4 text-brand-700" aria-hidden />
                {t(acc.labelKey)}
              </motion.button>
            ))}
          </div>
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-ink-500">
            <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" aria-hidden />
            {t("login.mockNote")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
