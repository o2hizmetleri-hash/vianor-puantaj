import Holidays from "date-holidays";

/** İstanbul saatiyle Türkiye resmi tatilleri (date-holidays paketi Diyanet yaklaşımı) */
let _hd: Holidays | null = null;

function turkeyHolidays(): Holidays {
  if (!_hd) {
    _hd = new Holidays("TR", { types: ["public", "bank"] });
    try {
      _hd.setTimezone("Europe/Istanbul");
    } catch {
      /* SSR / bazı ortamlarda sessiz düş */
    }
  }
  return _hd;
}

/** UTC tarih bileşeniyle haftanın günü — sadece YYYY-MM-DD için (saat kayması yok) */
export function isUtcSunday(dateIso: string): boolean {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

/** Resmi / banka tatili (paket bazı arifeleri de tatil olarak döndürür) */
export function turkeyPublicHolidaysOn(dateIso: string) {
  const hd = turkeyHolidays();
  const r = hd.isHoliday(dateIso);
  if (!r) return [];
  return r.filter((h) => h.type === "public" || h.type === "bank");
}

/** Pazar VEYA Türkiye resmi tatili — maktu maaşta kesinti yapılmaz (işe gelinmemiş gibi sayılır) */
export function isPaidWithoutAttendanceDay(dateIso: string): boolean {
  if (isUtcSunday(dateIso)) return true;
  return turkeyPublicHolidaysOn(dateIso).length > 0;
}

/** İşyerinde fiilen çalışılmış sayılması için puantaj statüleri */
export function attendanceCountsAsWorkedDay(status: string | undefined | null): boolean {
  return status === "present";
}

/**
 * İşyerinde puantaja "geldi" girilmiş VE gün Türkiye resmi tatili ise ek ücret (yasal olarak ücret x2’nin fazlalığı).
 * Pazarda çalışma için ek prim uygulanmaz (salt resmi tatil).
 */
export function qualifiesForHolidayWorkPremium(dateIso: string, attendanceStatus: string | undefined | null): boolean {
  if (!attendanceCountsAsWorkedDay(attendanceStatus)) return false;
  const hol = turkeyPublicHolidaysOn(dateIso);
  return hol.some((h) => h.type === "public");
}

/** Aralıkta her gün YYYY-MM-DD (dahil) — empStart empEnd sıralı */
export function eachDateInclusive(startIso: string, endIso: string): string[] {
  if (startIso > endIso) return [];
  const out: string[] = [];
  const [sy, sm, sd] = startIso.split("-").map(Number);
  let y = sy;
  let mo = sm;
  let d = sd;
  for (;;) {
    const cur = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    out.push(cur);
    if (cur === endIso) break;
    // Sonraki gün (UTC, ay sonu doğru döner)
    const next = new Date(Date.UTC(y, mo - 1, d + 1));
    y = next.getUTCFullYear();
    mo = next.getUTCMonth() + 1;
    d = next.getUTCDate();
    if (out.length > 400) break; // güvenlik
  }
  return out;
}
