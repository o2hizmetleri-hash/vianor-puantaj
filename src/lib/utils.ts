import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ========== TARİH ========== */
export function formatDate(date: Date | string | null | undefined, pattern = "dd MMMM yyyy") {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (isNaN(d.getTime())) return "—";
  return format(d, pattern, { locale: tr });
}

export function formatDateTime(date: Date | string | null | undefined) {
  return formatDate(date, "dd MMMM yyyy, HH:mm");
}

export function formatTime(time: string | null | undefined) {
  if (!time) return "—";
  return time.slice(0, 5);
}

export function formatRelative(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true, locale: tr });
}

const TZ_ISTANBUL = "Europe/Istanbul";

/** İstanbul takvim günü `yyyy-MM-dd` (Vercel UTC ortamında bile doğru; puantaj tarihleriyle uyumlu) */
export function calendarDayIstanbul(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_ISTANBUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function todayStr() {
  return calendarDayIstanbul(new Date());
}

/** Bugünden geriye `count` gün, eskiden yeniye sıralı tarihler (grafik / haftalık sorgu için) */
export function istanbulPastDaysAscending(count: number): string[] {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_ISTANBUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const out: string[] = [];
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    out.push(fmt.format(new Date(now - i * 86400000)));
  }
  return out;
}

export function monthStr(date: Date = new Date()) {
  return calendarDayIstanbul(date).slice(0, 7);
}

export function monthLabel(month: string) {
  try {
    const d = parseISO(month + "-01");
    return format(d, "MMMM yyyy", { locale: tr });
  } catch {
    return month;
  }
}

/** `YYYY-MM` için takvimdeki gerçek ay sonu `YYYY-MM-DD` (örn. Şubat 28/29, Nisan 30) */
export function monthEndIso(monthYyyyMm: string): string {
  const [y, m] = monthYyyyMm.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${monthYyyyMm}-${String(last).padStart(2, "0")}`;
}

/* ========== PARA ========== */
export function formatTRY(value: number | null | undefined, withSymbol = true) {
  const v = Number(value || 0);
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
  return withSymbol ? `₺${formatted}` : formatted;
}

export function formatNumber(value: number | null | undefined, fractionDigits = 2) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(value || 0));
}

export function formatHours(hours: number | null | undefined) {
  return `${formatNumber(hours, 2)} sa`;
}

/* ========== STATÜ ========== */
export const ATTENDANCE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  present: { label: "Geldi", color: "#6B8E4E", bg: "#EDF3E5" },
  absent: { label: "Gelmedi", color: "#A03030", bg: "#F5DCDC" },
  leave: { label: "İzinli", color: "#C77D3A", bg: "#F8E8D4" },
  sick: { label: "Raporlu", color: "#A04757", bg: "#F4D8DC" },
  holiday: { label: "Resmi Tatil", color: "#722F37", bg: "#F4D8DC" },
  off: { label: "Haftalık İzin", color: "#5C4A3D", bg: "#F5E6D3" },
};

export const LEAVE_TYPES: Record<string, string> = {
  annual: "Yıllık İzin",
  sick: "Raporlu",
  unpaid: "Ücretsiz İzin",
  maternity: "Doğum İzni",
  other: "Diğer",
};

export const PAYMENT_METHODS: Record<string, string> = {
  cash: "Nakit",
  bank: "Banka",
  other: "Diğer",
};

export const DISTRIBUTION_METHODS: Record<string, string> = {
  equal: "Eşit Dağıtım",
  by_hours: "Çalışma Saatine Göre",
  by_position: "Pozisyona Göre",
};

/* ========== HESAP YARDIMCILARI ========== */
export interface PayrollSettings {
  monthly_work_days: number;
  daily_work_hours: number;
  late_tolerance_minutes: number;
  overtime_threshold_minutes: number;
}

export function calcUnitRates(monthlySalary: number, settings: PayrollSettings) {
  const dailyRate = monthlySalary / Math.max(1, settings.monthly_work_days);
  const hourlyRate = dailyRate / Math.max(1, settings.daily_work_hours);
  const minuteRate = hourlyRate / 60;
  return { dailyRate, hourlyRate, minuteRate };
}

export function diffMinutes(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return (bh * 60 + bm) - (ah * 60 + am);
}

export function diffHoursOvernight(checkIn: string, checkOut: string) {
  const [ih, im] = checkIn.split(":").map(Number);
  const [oh, om] = checkOut.split(":").map(Number);
  let mins = (oh * 60 + om) - (ih * 60 + im);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

/**
 * Vianor standart vardiya: 7.5 saat yasal çalışma + 1.5 saat mola = 9 saat dükkanda.
 * Geliş saati üzerine eklenerek otomatik çıkış saati hesaplanır.
 */
export const DEFAULT_SHIFT_HOURS = 9;

/** "HH:MM" formatındaki saate verilen saat ekler, sonucu "HH:MM" döndürür (24 saat döngülü) */
export function addHoursToTime(time: string, hours: number): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m + Math.round(hours * 60);
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const newH = Math.floor(wrapped / 60);
  const newM = wrapped % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

export const POSITION_WEIGHTS: Record<string, number> = {
  "Şef": 1.2,
  "Sous Şef": 1.0,
  "Garson": 1.0,
  "Şef Garson": 1.1,
  "Komi": 0.6,
  "Barmen": 1.0,
  "Bulaşıkçı": 0.5,
  "Yönetici": 1.0,
  "Diğer": 0.7,
};
