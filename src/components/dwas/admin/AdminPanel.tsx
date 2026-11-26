"use client";

// Admin panel — operator console (spec 9.5): calm, trustworthy, teal primary,
// colour never the only signal (every action has an icon plus a label).
// All data is fetched client-side and refetched after every mutation; every
// visible string comes from the i18n dictionary via the DWAS store.

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, CalendarCheck, Check, Clock, Download, Eye, EyeOff,
  LayoutDashboard, MapPin, MessageSquareWarning, Mic, RefreshCw, Repeat,
  RotateCcw, ShieldCheck, ShieldOff, Star, Timer, TrendingUp, Wrench, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";

import { TRADES, useDw } from "@/lib/store";
import { api } from "@/lib/api-client";
import type {
  AdminDataDto, AreaDto, BookingDto, ComplaintDto, ReviewDto, TechnicianPublicDto,
} from "@/lib/api-client";
import type { DictKey } from "@/lib/i18n";
import type { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  BadgeChip, LangToggle, OnlineDot, StarRating, StatusPill, TradeIcon,
} from "@/components/dwas/shared";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type AdminTab = "dashboard" | "technicians" | "bookings" | "reviews" | "complaints";
type NoteAction = "reject" | "suspend";

const ALL = "ALL";

const BOOKING_STATUSES = [
  "requested", "accepted", "declined", "expired", "cancelled_client", "cancelled_tech",
  "on_the_way", "in_progress", "completed", "reviewed", "disputed", "no_show",
] as const;

const TAG_KEYS: Record<string, DictKey> = {
  on_time: "review.tag.on_time",
  clean_work: "review.tag.clean_work",
  fair_price: "review.tag.fair_price",
};

const PIE_COLORS: Record<string, string> = { llm: "#0f766e", rules: "#d97706" };
const CHART_COLORS = { grid: "#e7e5e4", bar: "#0f766e", fallback: "#a8a29e", surface: "#ffffff" } as const;

const TABS: { id: AdminTab; icon: LucideIcon; label: DictKey }[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "admin.nav.dashboard" },
  { id: "technicians", icon: Wrench, label: "admin.nav.technicians" },
  { id: "bookings", icon: CalendarCheck, label: "admin.nav.bookings" },
  { id: "reviews", icon: Star, label: "admin.nav.reviews" },
  { id: "complaints", icon: MessageSquareWarning, label: "admin.nav.complaints" },
];

// ---- Small building blocks ----

function MetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card className="gap-1.5 p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
        <Icon className="h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden />
        <span className="line-clamp-2">{label}</span>
      </div>
      <p className="text-xl font-bold tabular-nums text-stone-900">{value}</p>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-xl bg-stone-50 py-8 text-center text-sm text-stone-500">{text}</p>;
}

// Icon-only trade glyph with an accessible name (colour/icon never the only signal).
function TradeGlyph({ trade }: { trade: Trade }) {
  const t = useDw((s) => s.t);
  return (
    <span role="img" aria-label={t(`trade.${trade}` as DictKey)}>
      <TradeIcon trade={trade} size="sm" withLabel={false} />
    </span>
  );
}

function TechActions({
  tech, busy, onApprove, onOpenNote,
}: {
  tech: TechnicianPublicDto;
  busy: boolean;
  onApprove: (tech: TechnicianPublicDto) => void;
  onOpenNote: (tech: TechnicianPublicDto, action: NoteAction) => void;
}) {
  const t = useDw((s) => s.t);
  if (tech.approvalStatus === "pending") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm" disabled={busy}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => onApprove(tech)}
        >
          <Check aria-hidden />
          {t("admin.approve")}
        </Button>
        <Button
          size="sm" variant="outline" disabled={busy}
          className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
          onClick={() => onOpenNote(tech, "reject")}
        >
          <X aria-hidden />
          {t("admin.reject")}
        </Button>
      </div>
    );
  }
  if (tech.approvalStatus === "approved") {
    return (
      <Button
        size="sm" variant="outline" disabled={busy}
        className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
        onClick={() => onOpenNote(tech, "suspend")}
      >
        <ShieldOff aria-hidden />
        {t("admin.suspend")}
      </Button>
    );
  }
  if (tech.approvalStatus === "suspended" || tech.approvalStatus === "rejected") {
    return (
      <Button
        size="sm" variant="outline" disabled={busy}
        className="border-teal-300 text-teal-700 hover:bg-teal-50 hover:text-teal-800"
        onClick={() => onApprove(tech)}
      >
        <ShieldCheck aria-hidden />
        {tech.approvalStatus === "suspended" ? t("admin.reinstate") : t("admin.approve")}
      </Button>
    );
  }
  return null;
}

function SeedTag({ t }: { t: (key: DictKey) => string }) {
  return (
    <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-500">
      {t("admin.isSeed")}
    </Badge>
  );
}

// ---- Main panel ----

export default function AdminPanel() {
  const t = useDw((s) => s.t);
  const lang = useDw((s) => s.lang);
  const user = useDw((s) => s.user);
  const token = useDw((s) => s.token);
  const { toast } = useToast();

  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [data, setData] = useState<AdminDataDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [areas, setAreas] = useState<AreaDto[]>([]);

  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [tradeFilter, setTradeFilter] = useState<string>(ALL);

  const [noteAction, setNoteAction] = useState<{ techId: string; techName: string; action: NoteAction } | null>(null);
  const [note, setNote] = useState("");
  const [detailBooking, setDetailBooking] = useState<BookingDto | null>(null);
  const [resolveComplaint, setResolveComplaint] = useState<ComplaintDto | null>(null);
  const [complaintNote, setComplaintNote] = useState("");

  // Reload whenever the session token changes so logging in as admin from the
  // error state refetches the dashboard instead of staying stuck on the error.
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const d = await api.adminData();
      setData(d);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
    api.areas().then((r) => setAreas(r.areas)).catch(() => undefined);
  }, [load]);

  const runAction = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      toast({ title: t("admin.actionDone") });
      await load();
    } catch {
      toast({ title: t("common.errorGeneric") });
    } finally {
      setBusy(false);
    }
  }, [load, t, toast]);

  const approveTech = (tech: TechnicianPublicDto) => {
    void runAction(() =>
      api.adminApproval(tech.id, { action: tech.approvalStatus === "suspended" ? "reinstate" : "approve" }));
  };

  const openNoteDialog = (tech: TechnicianPublicDto, action: NoteAction) => {
    setNote("");
    setNoteAction({ techId: tech.id, techName: tech.name, action });
  };

  const confirmNoteAction = async () => {
    const current = noteAction;
    if (!current) return;
    setNoteAction(null);
    await runAction(() =>
      api.adminApproval(current.techId, { action: current.action, note: note.trim() || undefined }));
    setNote("");
  };

  const confirmResolve = async () => {
    const current = resolveComplaint;
    if (!current) return;
    setResolveComplaint(null);
    await runAction(() => api.adminResolveComplaint(current.id, { note: complaintNote.trim() || undefined }));
    setComplaintNote("");
  };

  const onReset = async () => {
    setBusy(true);
    try {
      await api.adminReset();
      toast({ title: t("admin.resetDone") });
      await load();
    } catch {
      toast({ title: t("common.errorGeneric") });
    } finally {
      setBusy(false);
    }
  };

  const onExport = async () => {
    try {
      const res = await api.adminExport();
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dwas-bookings.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: t("common.errorGeneric") });
    }
  };

  const filteredBookings = useMemo(() => {
    if (!data) return [] as BookingDto[];
    return data.bookings.filter(
      (b) => (statusFilter === ALL || b.status === statusFilter) && (tradeFilter === ALL || b.trade === tradeFilter),
    );
  }, [data, statusFilter, tradeFilter]);

  const localeTag = lang === "ur" ? "ur-PK" : "en-PK";
  const fmtDate = (ms: number) => new Date(ms).toLocaleDateString(localeTag);
  const fmtDateTime = (ms: number) => new Date(ms).toLocaleString(localeTag);

  const priceLabel = (b: BookingDto) => {
    if (b.finalPrice != null) return `${b.finalPrice.toLocaleString()} ${t("common.pkr")}`;
    if (b.priceBand) return `${b.priceBand.min.toLocaleString()}–${b.priceBand.max.toLocaleString()} ${t("common.pkr")}`;
    return "—";
  };

  const areaLabel = (b: BookingDto) => {
    const area = areas.find((a) => a.id === b.location.areaId);
    if (area) return `${area.name}, ${area.city}`;
    return b.location.areaId || b.location.note || "—";
  };

  // ---- Tab renderers ----

  const renderDashboard = () => {
    if (!data) return null;
    const s = data.stats;
    const metrics: { key: DictKey; icon: LucideIcon; value: string }[] = [
      { key: "admin.metric.bookings", icon: CalendarCheck, value: String(s.bookingsTotal) },
      { key: "admin.metric.approved", icon: ShieldCheck, value: String(s.approvedTechnicians) },
      { key: "admin.metric.pending", icon: Clock, value: String(s.pendingTechnicians) },
      { key: "admin.metric.acceptRate", icon: TrendingUp, value: `${s.acceptRate}%` },
      { key: "admin.metric.avgRating", icon: Star, value: s.avgRating == null ? "—" : s.avgRating.toFixed(1) },
      { key: "admin.metric.voiceOk", icon: Mic, value: `${Math.round(s.voiceOkRate * 100)}%` },
      { key: "admin.metric.fallback", icon: Repeat, value: `${Math.round(s.fallbackRate * 100)}%` },
      { key: "admin.metric.avgAcceptSec", icon: Timer, value: s.avgAcceptSec == null ? "—" : `${Math.round(s.avgAcceptSec)}s` },
    ];
    const perTrade = s.bookingsPerTrade.map((x) => {
      const key = `trade.${x.trade}` as DictKey;
      const label = t(key);
      return { name: label === key ? x.trade : label, count: x.count };
    });
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {metrics.map((m) => (
            <MetricCard key={m.key} icon={m.icon} label={t(m.key)} value={m.value} />
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="gap-3 p-4">
            <CardTitle className="text-sm font-semibold text-stone-700">{t("admin.chart.bookingsPerDay")}</CardTitle>
            <div role="img" aria-label={t("admin.chart.bookingsPerDay")}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={s.bookingsPerDay} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                  <ChartTooltip cursor={{ fill: "rgba(15,118,110,0.08)" }} />
                  <Bar dataKey="count" name={t("admin.metric.bookings")} fill={CHART_COLORS.bar} radius={[4, 4, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="gap-3 p-4">
            <CardTitle className="text-sm font-semibold text-stone-700">{t("admin.chart.perTrade")}</CardTitle>
            <div role="img" aria-label={t("admin.chart.perTrade")}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={perTrade} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                  <ChartTooltip cursor={{ fill: "rgba(15,118,110,0.08)" }} />
                  <Bar dataKey="count" name={t("admin.metric.bookings")} fill={CHART_COLORS.bar} radius={[4, 4, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="gap-3 p-4">
          <CardTitle className="text-sm font-semibold text-stone-700">{t("admin.chart.intakeSource")}</CardTitle>
          {s.intakeSource.length === 0 ? (
            <EmptyState text={t("admin.queueEmpty")} />
          ) : (
            <div className="flex flex-wrap items-center gap-8">
              <div className="h-[150px] w-[150px]" role="img" aria-label={t("admin.chart.intakeSource")}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <ChartTooltip />
                    <Pie
                      data={s.intakeSource} dataKey="count" nameKey="source"
                      innerRadius={36} outerRadius={62} paddingAngle={3} stroke={CHART_COLORS.surface} strokeWidth={2}
                    >
                      {s.intakeSource.map((entry) => (
                        <Cell key={entry.source} fill={PIE_COLORS[entry.source] ?? CHART_COLORS.fallback} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {s.intakeSource.map((entry) => (
                  <li key={entry.source} className="flex items-center justify-between gap-6 text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: PIE_COLORS[entry.source] ?? CHART_COLORS.fallback }}
                        aria-hidden
                      />
                      <span className="font-medium text-stone-700">{entry.source}</span>
                    </span>
                    <span className="font-semibold tabular-nums text-stone-900">{entry.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderTechnicians = () => {
    if (!data) return null;
    const all = data.technicians;
    const pending = all.filter((x) => x.approvalStatus === "pending");
    return (
      <div className="space-y-5">
        <section aria-labelledby="admin-pending-heading" className="space-y-3">
          <h2 id="admin-pending-heading" className="flex items-center gap-2 text-sm font-semibold text-stone-700">
            {t("admin.metric.pending")}
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-800">
              {pending.length}
            </span>
          </h2>
          {pending.length === 0 ? (
            <EmptyState text={t("admin.queueEmpty")} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {pending.map((tech) => (
                <Card key={tech.id} className="gap-3 border-l-4 border-l-amber-400 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-stone-900">{tech.name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {tech.trades.map((tr) => <TradeGlyph key={tr} trade={tr} />)}
                      </div>
                    </div>
                    <StatusPill status={tech.approvalStatus} />
                  </div>
                  <TechActions tech={tech} busy={busy} onApprove={approveTech} onOpenNote={openNoteDialog} />
                </Card>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="admin-tech-all-heading" className="space-y-3">
          <h2 id="admin-tech-all-heading" className="text-sm font-semibold text-stone-700">
            {t("admin.nav.technicians")} <span className="font-normal text-stone-400">({all.length})</span>
          </h2>
          {all.length === 0 ? (
            <EmptyState text={t("admin.queueEmpty")} />
          ) : (
            <div className="max-h-[420px] overflow-y-auto scroll-slim rounded-xl border border-stone-200 bg-white">
              {/* Stacked cards — small screens */}
              <div className="space-y-2 p-3 md:hidden">
                {all.map((tech) => (
                  <Card key={tech.id} className="gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-stone-900">{tech.name}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {tech.trades.map((tr) => <TradeGlyph key={tr} trade={tr} />)}
                        </div>
                      </div>
                      <StatusPill status={tech.approvalStatus} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
                      <OnlineDot online={tech.isOnline} />
                      <span>{tech.yearsExperience} {t("common.years")}</span>
                      <span>{tech.stats.jobsCompleted} {t("common.jobs")}</span>
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-500" aria-hidden />
                        {tech.stats.ratingAvg != null ? tech.stats.ratingAvg.toFixed(1) : "—"}
                      </span>
                      <span>{t("admin.trustScore")} {tech.trustScore}</span>
                      {tech.isSeed && <SeedTag t={t} />}
                    </div>
                    {tech.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tech.badges.map((b) => <BadgeChip key={b} badge={b} />)}
                      </div>
                    )}
                    <TechActions tech={tech} busy={busy} onApprove={approveTech} onOpenNote={openNoteDialog} />
                  </Card>
                ))}
              </div>
              {/* Table — md and up */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.bookings.tech")}</TableHead>
                      <TableHead>{t("admin.bookings.status")}</TableHead>
                      <TableHead>{t("admin.trustScore")}</TableHead>
                      <TableHead />
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {all.map((tech) => (
                      <TableRow key={tech.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-stone-900">{tech.name}</span>
                            <OnlineDot online={tech.isOnline} />
                            <div className="flex flex-wrap items-center gap-1.5">
                              {tech.trades.map((tr) => <TradeGlyph key={tr} trade={tr} />)}
                            </div>
                            <span className="text-xs text-stone-500">
                              {tech.yearsExperience} {t("common.years")} · {tech.stats.jobsCompleted} {t("common.jobs")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1.5">
                            <StatusPill status={tech.approvalStatus} />
                            {tech.isSeed && <SeedTag t={t} />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5">
                              <StarRating value={Math.round(tech.stats.ratingAvg ?? 0)} size={12} />
                              <span className="text-xs font-semibold tabular-nums text-stone-700">
                                {tech.stats.ratingAvg != null ? tech.stats.ratingAvg.toFixed(1) : "—"}
                              </span>
                            </span>
                            <span className="text-xs text-stone-500">
                              {t("admin.trustScore")}: <span className="font-semibold text-stone-700">{tech.trustScore}</span>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          {tech.badges.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {tech.badges.map((b) => <BadgeChip key={b} badge={b} />)}
                            </div>
                          ) : (
                            <span className="text-xs text-stone-300">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <TechActions tech={tech} busy={busy} onApprove={approveTech} onOpenNote={openNoteDialog} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderBookings = () => {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-56" aria-label={t("admin.filter.status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72 overflow-y-auto scroll-slim">
              <SelectItem value={ALL}>{t("admin.filter.all")}</SelectItem>
              {BOOKING_STATUSES.map((st) => (
                <SelectItem key={st} value={st}>{t(`status.${st}` as DictKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tradeFilter} onValueChange={setTradeFilter}>
            <SelectTrigger className="w-full sm:w-56" aria-label={t("admin.filter.trade")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("admin.filter.all")}</SelectItem>
              {TRADES.map((tr) => (
                <SelectItem key={tr} value={tr}>{t(`trade.${tr}` as DictKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredBookings.length === 0 ? (
          <EmptyState text={t("admin.queueEmpty")} />
        ) : (
          <div className="max-h-[420px] overflow-y-auto scroll-slim rounded-xl border border-stone-200 bg-white">
            {/* Stacked cards — small screens */}
            <div className="space-y-2 p-3 md:hidden">
              {filteredBookings.map((b) => (
                <Card
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailBooking(b)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setDetailBooking(b);
                    }
                  }}
                  aria-label={`${t("admin.bookings.client")}: ${b.clientName} · ${t("admin.bookings.tech")}: ${b.technicianName}`}
                  className="cursor-pointer gap-2 p-4 transition-colors hover:border-teal-300 hover:bg-teal-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-stone-400">{b.id.slice(0, 8)}</span>
                    <StatusPill status={b.status} />
                  </div>
                  <p className="text-sm font-semibold text-stone-900">
                    {b.clientName} <span className="text-stone-400">→</span> {b.technicianName}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
                    <span>{t(`trade.${b.trade}` as DictKey)}</span>
                    <span className="font-medium text-teal-800">{priceLabel(b)}</span>
                    <span>{fmtDate(b.createdAt)}</span>
                  </div>
                </Card>
              ))}
            </div>
            {/* Table — md and up */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.bookings.client")}</TableHead>
                    <TableHead>{t("admin.bookings.tech")}</TableHead>
                    <TableHead>{t("admin.filter.trade")}</TableHead>
                    <TableHead>{t("admin.bookings.status")}</TableHead>
                    <TableHead>{t("admin.bookings.price")}</TableHead>
                    <TableHead>{t("admin.bookings.created")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((b) => (
                    <TableRow key={b.id} className="cursor-pointer hover:bg-teal-50/40" onClick={() => setDetailBooking(b)}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-stone-900">{b.clientName}</span>
                          <span className="font-mono text-xs text-stone-400">{b.id.slice(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-stone-700">{b.technicianName}</TableCell>
                      <TableCell>
                        <TradeIcon trade={b.trade} size="sm" withLabel />
                      </TableCell>
                      <TableCell><StatusPill status={b.status} /></TableCell>
                      <TableCell className="whitespace-nowrap text-sm font-medium text-teal-800">{priceLabel(b)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-stone-600">{fmtDate(b.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReviews = () => {
    if (!data) return null;
    const reviews: ReviewDto[] = data.reviews;
    if (reviews.length === 0) return <EmptyState text={t("admin.queueEmpty")} />;
    return (
      <div className="max-h-[420px] scroll-slim space-y-2 overflow-y-auto pr-1">
        {reviews.map((r) => (
          <Card key={r.id} className="gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate font-semibold text-stone-900">{r.technicianName ?? r.technicianId}</span>
                {r.hidden && (
                  <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-500">
                    {t("admin.reviews.hiddenTag")}
                  </Badge>
                )}
              </div>
              <Button
                size="sm" variant="outline" disabled={busy}
                onClick={() => void runAction(() => api.adminReview(r.id, { hidden: !r.hidden }))}
              >
                {r.hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
                {r.hidden ? t("admin.reviews.unhide") : t("admin.reviews.hide")}
              </Button>
            </div>
            <StarRating value={r.stars} size={14} />
            {r.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {r.tags.map((tg, j) => (
                  <Badge key={`${tg}-${j}`} variant="secondary" className="border-teal-200 bg-teal-50 text-teal-800">
                    {TAG_KEYS[tg] ? t(TAG_KEYS[tg]) : tg}
                  </Badge>
                ))}
              </div>
            )}
            {r.comment && <p className="text-sm text-stone-600">{r.comment}</p>}
            <p className="text-xs text-stone-400">{fmtDate(r.createdAt)}</p>
          </Card>
        ))}
      </div>
    );
  };

  const renderComplaints = () => {
    if (!data) return null;
    const complaints = data.complaints;
    if (complaints.length === 0) return <EmptyState text={t("admin.queueEmpty")} />;
    return (
      <div className="max-h-[420px] scroll-slim space-y-2 overflow-y-auto pr-1">
        {complaints.map((c) => (
          <Card key={c.id} className="gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-stone-400">{c.bookingId.slice(0, 8)}</span>
                <Badge variant="outline" className="border-stone-300 text-stone-600">{c.kind}</Badge>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                <span
                  className={cn("h-2 w-2 rounded-full", c.status === "resolved" ? "bg-emerald-500" : "bg-amber-500")}
                  aria-hidden
                />
                {c.status === "resolved" ? t("admin.complaints.resolved") : c.status}
              </span>
            </div>
            <p className="text-sm text-stone-700">{c.text}</p>
            <p className="text-xs text-stone-400">{c.raisedBy} · {fmtDate(c.createdAt)}</p>
            {c.status === "resolved" && (c.resolvedBy || c.note) && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {c.resolvedBy ? <span className="font-semibold">{c.resolvedBy}</span> : null}
                {c.note ? (c.resolvedBy ? ` — ${c.note}` : c.note) : null}
              </p>
            )}
            {c.status !== "resolved" && (
              <div>
                <Button
                  size="sm" disabled={busy}
                  onClick={() => {
                    setComplaintNote("");
                    setResolveComplaint(c);
                  }}
                >
                  <Check aria-hidden />
                  {t("admin.complaints.resolve")}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-teal-50">
            <ShieldCheck className="h-5 w-5 text-teal-700" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-stone-900">{t("admin.title")}</h1>
            {user && <p className="truncate text-xs text-stone-500">{user.name}</p>}
          </div>
        </div>
        <LangToggle />
      </header>

      <div
        role="tablist"
        aria-label={t("admin.title")}
        className="flex gap-1 overflow-x-auto scroll-slim rounded-xl border border-stone-200 bg-white p-1"
      >
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            id={`admin-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`admin-panel-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex min-w-fit items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600",
              tab === id ? "bg-teal-600 text-white shadow-sm" : "text-stone-600 hover:bg-teal-50 hover:text-teal-800",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">{t(label)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4" role="status" aria-label={t("common.loading")}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : error || !data ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500" aria-hidden />
          <p className="text-sm text-stone-600">{t("common.errorGeneric")}</p>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw aria-hidden />
            {t("common.retry")}
          </Button>
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            id={`admin-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`admin-tab-${tab}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {tab === "dashboard" && renderDashboard()}
            {tab === "technicians" && renderTechnicians()}
            {tab === "bookings" && renderBookings()}
            {tab === "reviews" && renderReviews()}
            {tab === "complaints" && renderComplaints()}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Panel-level actions — always rendered, independent of the active tab */}
      <div className="mt-auto flex flex-col gap-2 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline" disabled={busy}
              className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            >
              <RotateCcw aria-hidden />
              {t("admin.reset")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("admin.reset")}</AlertDialogTitle>
              <AlertDialogDescription>{t("admin.resetConfirm")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void onReset()}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {t("common.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="outline" disabled={busy} onClick={() => void onExport()}>
          <Download aria-hidden />
          {t("admin.export")}
        </Button>
      </div>

      {/* Approve-flow note dialog (reject / suspend) */}
      <Dialog open={noteAction !== null} onOpenChange={(open) => { if (!open) setNoteAction(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {noteAction?.action === "reject" ? t("admin.reject") : t("admin.suspend")}
              {noteAction ? ` — ${noteAction.techName}` : ""}
            </DialogTitle>
            <DialogDescription>{t("admin.note")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="admin-tech-note">{t("admin.note")}</Label>
            <Textarea
              id="admin-tech-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteAction(null)}>{t("common.cancel")}</Button>
            <Button
              disabled={busy}
              className={noteAction?.action === "reject"
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-amber-600 text-white hover:bg-amber-700"}
              onClick={() => void confirmNoteAction()}
            >
              {noteAction?.action === "reject" ? <X aria-hidden /> : <ShieldOff aria-hidden />}
              {noteAction?.action === "reject" ? t("admin.reject") : t("admin.suspend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking detail dialog */}
      <Dialog open={detailBooking !== null} onOpenChange={(open) => { if (!open) setDetailBooking(null); }}>
        <DialogContent className="max-h-[85vh] scroll-slim overflow-y-auto sm:max-w-lg">
          {detailBooking && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-stone-500">{detailBooking.id.slice(0, 8)}</span>
                  <StatusPill status={detailBooking.status} />
                </DialogTitle>
                <DialogDescription>
                  {t(`trade.${detailBooking.trade}` as DictKey)} · {fmtDateTime(detailBooking.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <p className="text-sm text-stone-800">{detailBooking.summary_en}</p>
                  {detailBooking.summary_ur && (
                    <p className="font-urdu mt-2 text-sm leading-loose text-stone-700" dir="rtl" lang="ur">
                      {detailBooking.summary_ur}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-stone-600">
                    <Clock className="h-4 w-4 text-teal-700" aria-hidden />
                    {t(`urgency.${detailBooking.urgency}` as DictKey)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-stone-600">
                    <MapPin className="h-4 w-4 text-teal-700" aria-hidden />
                    {areaLabel(detailBooking)}
                  </span>
                  <span className="inline-flex items-center font-semibold text-teal-800">
                    {priceLabel(detailBooking)}
                  </span>
                </div>
                {detailBooking.statusHistory.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                      {t("admin.bookings.status")}
                    </h3>
                    <ol className="space-y-2">
                      {detailBooking.statusHistory.map((h, i) => (
                        <li
                          key={`${h.at}-${i}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 bg-white px-3 py-2"
                        >
                          <StatusPill status={h.status} />
                          <span className="text-xs text-stone-500">{fmtDateTime(h.at)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Complaint resolve dialog */}
      <Dialog open={resolveComplaint !== null} onOpenChange={(open) => { if (!open) setResolveComplaint(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("admin.complaints.resolve")}</DialogTitle>
            <DialogDescription className="line-clamp-3">{resolveComplaint?.text}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="admin-complaint-note">{t("admin.note")}</Label>
            <Textarea
              id="admin-complaint-note"
              rows={3}
              value={complaintNote}
              onChange={(e) => setComplaintNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveComplaint(null)}>{t("common.cancel")}</Button>
            <Button disabled={busy} onClick={() => void confirmResolve()}>
              <Check aria-hidden />
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
