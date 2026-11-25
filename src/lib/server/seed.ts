// DWAS spec section 11 — seed data. Wipes demo tables and writes: the 7 areas
// (11.2), the rate table (11.3), 24 technicians (11.1), 3 demo clients, one
// admin, and ~60 past bookings and reviews. Aggregates are computed from the
// reviews, never typed in. Everything carries isSeed so the UI can show
// "Demo data". Shared by the reset route and the CLI script.
import { db } from "@/lib/db";
import { AREAS } from "@/lib/areas";
import type { BookingDoc, ReviewDoc, Trade } from "@/lib/types";
import { deriveTechnicianTrust } from "@/lib/trust/score";
import type { RateTableRow } from "@/lib/rate-table";

export const RATE_TABLE: RateTableRow[] = [
  { trade: "plumber", jobType: "tap_leak", minPKR: 500, maxPKR: 1500 },
  { trade: "plumber", jobType: "drain_block", minPKR: 800, maxPKR: 2500 },
  { trade: "plumber", jobType: "geyser_issue", minPKR: 1000, maxPKR: 4000 },
  { trade: "plumber", jobType: "tank_pump", minPKR: 1000, maxPKR: 3500 },
  { trade: "plumber", jobType: "pipe_burst", minPKR: 1500, maxPKR: 5000 },
  { trade: "electrician", jobType: "switch_socket", minPKR: 300, maxPKR: 1000 },
  { trade: "electrician", jobType: "wiring_fault", minPKR: 1000, maxPKR: 4000 },
  { trade: "electrician", jobType: "fan", minPKR: 400, maxPKR: 1500 },
  { trade: "electrician", jobType: "ups_inverter", minPKR: 1000, maxPKR: 4000 },
  { trade: "electrician", jobType: "short_circuit", minPKR: 800, maxPKR: 3000 },
  { trade: "ac_fridge", jobType: "ac_not_cooling", minPKR: 1500, maxPKR: 4500 },
  { trade: "ac_fridge", jobType: "ac_gas", minPKR: 3000, maxPKR: 7000 },
  { trade: "ac_fridge", jobType: "ac_install", minPKR: 3500, maxPKR: 8000 },
  { trade: "ac_fridge", jobType: "fridge_not_cooling", minPKR: 1500, maxPKR: 5000 },
  { trade: "carpenter", jobType: "door_lock", minPKR: 500, maxPKR: 2000 },
  { trade: "carpenter", jobType: "door_repair", minPKR: 800, maxPKR: 3000 },
  { trade: "carpenter", jobType: "furniture_repair", minPKR: 1000, maxPKR: 4000 },
  { trade: "carpenter", jobType: "cupboard", minPKR: 1500, maxPKR: 6000 },
  { trade: "mazdoor", jobType: "day_labour", minPKR: 1500, maxPKR: 2500 },
  { trade: "mazdoor", jobType: "shifting_help", minPKR: 2000, maxPKR: 6000 },
  { trade: "mazdoor", jobType: "cleaning_help", minPKR: 1500, maxPKR: 3000 },
];

// Deterministic pseudo-random source: re-seeds produce the same demo data.
let state = 20261116;
function rnd(min = 0, max = 1): number {
  state = (state * 1664525 + 1013904223 + Math.floor(min * 7)) >>> 0;
  return min + (state / 2 ** 32) * (max - min);
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rnd() * items.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(rnd(min, max + 1));
}

const TRADE_GROUPS: Array<{ trade: Trade; names: string[] }> = [
  { trade: "plumber", names: ["Rafiq Ahmad", "Zubair Rana", "Hassan Alvi", "Zainab Rizvi", "Ahsan Javed", "Kamran Butt"] },
  { trade: "electrician", names: ["Mira Nadeem", "Iqbal Nadeem", "Nosheen Akhtar", "Faisal Chaudhry", "Tooba Rizvi", "Mehboob Rana"] },
  { trade: "ac_fridge", names: ["Summaiya Khan", "Suleman Akhtar", "Amna Nadeem", "Salman Khan", "Zeba Rana"] },
  { trade: "carpenter", names: ["Shahrukh Alvi", "Taimoor Nadeem", "Anam Rizvi", "Zainab Khan"] },
  { trade: "mazdoor", names: ["Junaid Akhtar", "Mehak Rana", "Talha Nadeem"] },
];

// 11.1 states: 3 newcomers (under 5 jobs), 2 offline, 1 pending approval
// (S4 + admin demo), 1 suspended. Rafiq stays approved + online near Ayesha.
const NEWCOMERS = new Set(["Suleman Akhtar", "Taimoor Nadeem", "Talha Nadeem"]);
const OFFLINE = new Set(["Mehak Rana", "Salman Khan"]);
const SUSPENDED = new Set(["Iqbal Nadeem"]);
const PENDING = new Set(["Mira Nadeem"]);

const BIOS_UR: Record<Trade, string> = {
  plumber: "پلمبر — پانی، نالی اور گیزر کا کام۔ تیز اور صاف کام کی ضمانت۔",
  electrician: "الیکٹریشن — وائرنگ، سوئچ اور پنکھا کام۔ محفوٹ طریقے سے کام۔",
  ac_fridge: "اے سی اور فریج کا مستری — سروس، گیس بھروائی اور تنصیب۔",
  carpenter: "بڑھئی — دروازہ، الماری اور فرنیچر کا کام۔",
  mazdoor: "مزدور — سامان اٹھانا، شفٹنگ اور صفائی کی مدد۔",
};

const AREAS_IDS = AREAS.map((a) => a.id);

export async function seedDemoData(): Promise<{ technicians: number; bookings: number; reviews: number }> {
  state = 20261116;

  // Wipe (order matters because Review.id equals the booking id).
  await db.review.deleteMany();
  await db.booking.deleteMany();
  await db.complaint.deleteMany();
  await db.eventLog.deleteMany();
  await db.audit.deleteMany();
  await db.technician.deleteMany();
  await db.user.deleteMany();
  await db.rate.deleteMany();
  await db.area.deleteMany();

  await db.area.createMany({ data: AREAS.map((a) => ({ id: a.id, name: a.name, city: a.city, lat: a.lat, lng: a.lng })) });
  await db.rate.createMany({
    data: RATE_TABLE.map((r) => ({ id: `${r.trade}__${r.jobType}`, trade: r.trade, jobType: r.jobType, minPKR: r.minPKR, maxPKR: r.maxPKR })),
  });

  const now = Date.now();

  // Demo users (11.1): Ayesha + 2 extra clients, Sara admin, technician users.
  const clients = [
    { id: "ayesha-khan", name: "Ayesha Khan", phone: "+923001234567" },
    { id: "farah-rizvi", name: "Farah Rizvi", phone: "+923002345678" },
    { id: "tauseef-ali", name: "Tauseef Ali", phone: "+923003456789" },
  ];
  for (const client of clients) {
    await db.user.create({ data: { id: client.id, phone: client.phone, name: client.name, role: "client", isSeed: true } });
  }
  await db.user.create({ data: { id: "sara-admin", phone: "+923009876543", name: "Sara (operator)", role: "admin", isSeed: true } });

  // 24 technicians with centers spread over the seeded areas.
  interface TechSeed {
    id: string;
    name: string;
    trade: Trade;
    years: number;
    areaId: string;
    lat: number;
    lng: number;
    radiusKm: number;
    isOnline: boolean;
    approvalStatus: string;
    visitFeePKR: number;
  }
  const techSeeds: TechSeed[] = [];
  let techIndex = 0;
  for (const group of TRADE_GROUPS) {
    for (const name of group.names) {
      techIndex += 1;
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const area = AREAS[randInt(0, AREAS.length - 1)];
      const isNewcomer = NEWCOMERS.has(name);
      const isOffline = OFFLINE.has(name);
      const isSuspended = SUSPENDED.has(name);
      const isPending = PENDING.has(name);
      // Rafiq anchors on Satellite Town (~2 km from Ayesha) for the S1 story.
      const homeArea = name === "Rafiq Ahmad" ? AREAS.find((a) => a.id === "satellite-town")! : area;
      const areaId = name === "Rafiq Ahmad" ? "satellite-town" : area.id;
      const lat = name === "Rafiq Ahmad" ? homeArea.lat + 0.012 : area.lat + rnd(-0.02, 0.02);
      const lng = name === "Rafiq Ahmad" ? homeArea.lng + 0.008 : area.lng + rnd(-0.02, 0.02);
      techSeeds.push({
        id,
        name,
        trade: group.trade,
        years: isNewcomer ? randInt(1, 3) : randInt(4, 22),
        areaId,
        lat,
        lng,
        radiusKm: randInt(4, 10),
        // Newcomers stay online so the newcomer slot and NEW badge are visible in matches.
        isOnline: !(isOffline || isSuspended || isPending),
        approvalStatus: isPending ? "pending" : isSuspended ? "suspended" : "approved",
        visitFeePKR: pick([200, 300, 500]),
      });
      await db.user.create({
        data: { id, phone: `+92301${String(techIndex).padStart(7, "0")}`, name, role: "technician", isSeed: true },
      });
    }
  }

  // ~60 past bookings + reviews; statuses weighted to completed history.
  const STATUS_POOL = [
    "completed", "completed", "completed", "completed", "completed",
    "accepted", "requested", "declined", "expired", "cancelled_client", "no_show",
  ] as const;
  const TAGS = [["on_time"], ["clean_work"], ["fair_price"], ["on_time", "clean_work"], ["clean_work", "fair_price"], []];
  const PROBLEM_TEXTS: Record<Trade, string[]> = {
    plumber: ["geyser se pani tapak raha hai", "bathroom ki nali block hai", "tap ka nal tot gaya"],
    electrician: ["switch se chingari nikal rahi hai", "pankha band ho gaya hai", "UPS beep kar raha hai"],
    ac_fridge: ["AC thanda nahi kar raha", "fridge ka cooling kharab hai"],
    carpenter: ["darwaze ka lock toot gaya", "almari ka darwaza theek nahi"],
    mazdoor: ["saman shift karna hai", "safai mein madad chahiye"],
  };

  const bookings: (BookingDoc & { emergencyKind?: string })[] = [];
  const reviews: ReviewDoc[] = [];

  for (let i = 1; i <= 60; i += 1) {
    // Rafiq (the S1 demo hero) gets a denser, mostly-completed history.
    const tech = rnd() < 0.22 ? techSeeds[0] : techSeeds[randInt(0, techSeeds.length - 1)];
    const client = pick(clients);
    const isRafiq = tech.id === techSeeds[0].id;
    const status = isRafiq && rnd() < 0.85 ? "completed" : pick(STATUS_POOL);
    const createdAt = now - randInt(0, 45 * 24 * 3600) * 1000;
    const rateRow = pick(RATE_TABLE.filter((r) => r.trade === tech.trade));
    const history: BookingDoc["statusHistory"] = [{ status: "requested", at: createdAt, actor: "client" }];
    const isCompleted = status === "completed";
    if (isCompleted) {
      // Mistries accept within minutes; a realistic reply time keeps the
      // reply-speed signal (7.2) meaningful instead of scoring everyone 0.
      const acceptedAt = createdAt + randInt(45, 540) * 1000;
      history.push({ status: "accepted", at: acceptedAt, actor: "technician" });
      history.push({ status: "completed", at: acceptedAt + randInt(7200, 432000) * 1000, actor: "technician" });
    } else if (status === "accepted") {
      history.push({ status: "accepted", at: createdAt + randInt(45, 540) * 1000, actor: "technician" });
    } else if (status === "declined") {
      history.push({ status: "declined", at: createdAt + randInt(300, 3600) * 1000, actor: "technician", reason: "busy" });
    } else if (status === "expired") {
      history.push({ status: "expired", at: createdAt + 300 * 1000, actor: "system" });
    }
    const finalPrice = isCompleted
      ? rnd() < 0.25
        ? Math.round(rateRow.maxPKR * (1 + rnd(0.28, 0.35)))
        : randInt(rateRow.minPKR, rateRow.maxPKR)
      : undefined;
    const area = AREAS[randInt(0, AREAS.length - 1)];
    bookings.push({
      id: `demo-b${String(i).padStart(3, "0")}`,
      clientId: client.id,
      technicianId: tech.id,
      trade: tech.trade,
      jobType: rateRow.jobType,
      problemRaw: pick(PROBLEM_TEXTS[tech.trade]),
      summary_en: `${rateRow.jobType.replace(/_/g, " ")} in ${area.name}`,
      summary_ur: pick(PROBLEM_TEXTS[tech.trade]),
      urgency: pick(["now", "today", "tomorrow", "flexible"]),
      location: { lat: area.lat + rnd(-0.01, 0.01), lng: area.lng + rnd(-0.01, 0.01), areaId: area.id },
      priceBand: { min: rateRow.minPKR, max: rateRow.maxPKR },
      finalPrice,
      status,
      statusHistory: history,
      candidates: [],
      attempts: [],
      expiresAt: createdAt + 300 * 1000,
      photoUrls: [],
      phoneRevealed: ["accepted", "on_the_way", "in_progress", "completed", "reviewed", "reviewed"].includes(status),
      shareToken: `tok-${i}-${Math.floor(rnd(1000, 9999))}`,
      createdAt,
      emergencyKind: "none",
    });
    if (isCompleted) {
      const completedAt = history[history.length - 1].at;
      reviews.push({
        bookingId: `demo-b${String(i).padStart(3, "0")}`,
        clientId: client.id,
        technicianId: tech.id,
        stars: pick([4, 4, 5, 5, 5, 3]) as ReviewDoc["stars"],
        tags: pick(TAGS),
        comment: rnd() < 0.6 ? pick(["Kaam acha tha.", "Time par aa gaye.", "Theek thaak kam mukammal kiya."]) : undefined,
        hidden: false,
        createdAt: completedAt + randInt(0, 172800) * 1000,
      });
    }
  }

  // Give each completed booking a spot in the DB; write technicians with
  // aggregates computed from the reviews (7.3: computed, never typed).
  for (const booking of bookings) {
    await db.booking.create({
      data: {
        id: booking.id,
        clientId: booking.clientId,
        technicianId: booking.technicianId,
        trade: booking.trade,
        jobType: booking.jobType,
        problemRaw: booking.problemRaw,
        summaryEn: booking.summary_en,
        summaryUr: booking.summary_ur,
        urgency: booking.urgency,
        emergencyKind: booking.emergencyKind ?? "none",
        lat: booking.location.lat,
        lng: booking.location.lng,
        areaId: booking.location.areaId ?? null,
        note: null,
        priceBandMin: booking.priceBand?.min ?? null,
        priceBandMax: booking.priceBand?.max ?? null,
        finalPrice: booking.finalPrice ?? null,
        status: booking.status,
        statusHistory: JSON.stringify(booking.statusHistory),
        candidates: JSON.stringify(booking.candidates),
        attempts: JSON.stringify(booking.attempts),
        expiresAt: booking.expiresAt,
        scheduledFor: booking.scheduledFor ?? null,
        photoUrls: JSON.stringify(booking.photoUrls),
        phoneRevealed: booking.phoneRevealed,
        shareToken: booking.shareToken,
        createdAt: booking.createdAt,
      },
    });
  }
  for (const review of reviews) {
    await db.review.create({
      data: {
        id: review.bookingId,
        bookingId: review.bookingId,
        clientId: review.clientId,
        technicianId: review.technicianId,
        stars: review.stars,
        tags: JSON.stringify(review.tags),
        comment: review.comment ?? null,
        hidden: review.hidden,
        createdAt: review.createdAt,
      },
    });
  }

  for (const tech of techSeeds) {
    const mine = bookings.filter((b) => b.technicianId === tech.id);
    const techReviews = reviews.filter((r) => mine.some((b) => b.id === r.bookingId));
    const responseSecs: number[] = [];
    for (const b of mine) {
      const requested = b.statusHistory[0];
      const accepted = b.statusHistory.find((h) => h.status === "accepted");
      if (accepted && accepted.at > requested.at) responseSecs.push((accepted.at - requested.at) / 1000);
    }
    const derived = deriveTechnicianTrust({
      jobsCompleted: mine.filter((b) => b.status === "completed").length,
      ratingSum: techReviews.reduce((sum, r) => sum + r.stars, 0),
      ratingCount: techReviews.length,
      avgResponseSec: responseSecs.length ? Math.round(responseSecs.reduce((a, b) => a + b, 0) / responseSecs.length) : null,
      noShowCount: mine.filter((b) => b.status === "no_show").length,
      approvalStatus: tech.approvalStatus as "approved",
    });
    await db.technician.create({
      data: {
        id: tech.id,
        name: tech.name,
        workPhotos: "[]",
        trades: JSON.stringify([tech.trade]),
        yearsExperience: tech.years,
        bioUr: BIOS_UR[tech.trade],
        bioEn: `${tech.trade} specialist with ${tech.years} years of experience.`,
        visitFeePKR: tech.visitFeePKR,
        lat: tech.lat,
        lng: tech.lng,
        areaId: tech.areaId,
        radiusKm: tech.radiusKm,
        isOnline: tech.isOnline,
        lastActiveAt: now - randInt(0, 3 * 24 * 3600) * 1000,
        approvalStatus: tech.approvalStatus,
        badges: JSON.stringify(derived.badges),
        trustScore: derived.trustScore,
        jobsCompleted: derived.stats.jobsCompleted,
        ratingSum: derived.stats.ratingSum,
        ratingCount: derived.stats.ratingCount,
        avgResponseSec: derived.stats.avgResponseSec,
        noShowCount: derived.stats.noShowCount,
        isSeed: true,
      },
    });
  }

  return { technicians: techSeeds.length, bookings: bookings.length, reviews: reviews.length };
}
