/**
 * Date/time helpers for Asia/Kuala_Lumpur timezone.
 * All dates displayed in ms-MY locale, 24-hour format.
 * Timestamps stored in UTC in MongoDB; converted here for display/filtering.
 */

const KL_TIMEZONE = "Asia/Kuala_Lumpur";
const KL_LOCALE = "ms-MY";

/**
 * Returns today's date string in YYYY-MM-DD format in KL timezone.
 * This is the canonical "today" for attendance marking.
 */
export function getTodayKL(): string {
  const now = new Date();
  const kl = new Date(now.toLocaleString("en-US", { timeZone: KL_TIMEZONE }));
  const y = kl.getFullYear();
  const m = String(kl.getMonth() + 1).padStart(2, "0");
  const d = String(kl.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns a Date object for the start of today in KL timezone (00:00:00).
 */
export function getTodayStartKL(): Date {
  return dateStringToKLDate(getTodayKL());
}

/**
 * Converts a YYYY-MM-DD string (interpreted in KL timezone) to a UTC Date.
 * Example: "2026-07-19" → 2026-07-18T16:00:00Z (KL is UTC+8)
 */
export function dateStringToKLDate(dateStr: string): Date {
  // Add explicit time as midnight KL -> this is 16:00 UTC the day before
  const utc = new Date(`${dateStr}T00:00:00+08:00`);
  return utc;
}

/**
 * Formats a Date for display in Malay.
 * Example output: "19 Julai 2026"
 */
export function formatDateMalay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(KL_LOCALE, {
    timeZone: KL_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Formats a Date for display with day name.
 * Example output: "Ahad, 19 Julai 2026"
 */
export function formatDateMalayFull(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(KL_LOCALE, {
    timeZone: KL_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Formats a time string.
 * Example output: "14:30"
 */
export function formatTimeKL(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString(KL_LOCALE, {
    timeZone: KL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Formats date + time.
 * Example output: "19 Julai 2026, 14:30"
 */
export function formatDateTimeKL(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const datePart = formatDateMalay(d);
  const timePart = formatTimeKL(d);
  return `${datePart}, ${timePart}`;
}

/**
 * Returns the start and end YYYY-MM-DD strings for various period types.
 * All calculated in KL timezone.
 */
export function getDateRange(
  type: "daily" | "weekly" | "monthly" | "yearly" | "custom",
  customFrom?: string,
  customTo?: string
): { from: string; to: string } {
  const today = getTodayKL();
  const [y, m, d] = today.split("-").map(Number);

  switch (type) {
    case "daily":
      return { from: today, to: today };

    case "weekly": {
      // Week starting Monday (Isnin)
      const date = new Date(`${today}T00:00:00+08:00`);
      const dayOfWeek = date.getUTCDay(); // 0=Sun ... 6=Sat
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Shift to Monday
      date.setUTCDate(date.getUTCDate() + mondayOffset);
      const from = formatKLDate(date);
      date.setUTCDate(date.getUTCDate() + 6);
      const to = formatKLDate(date);
      return { from, to };
    }

    case "monthly": {
      const from = `${y}-${String(m).padStart(2, "0")}-01`;
      // Last day of this month
      const lastDay = new Date(y, m, 0).getDate(); // m is 1-indexed so m gives last day of month
      const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { from, to };
    }

    case "yearly": {
      return {
        from: `${y}-01-01`,
        to: `${y}-12-31`,
      };
    }

    case "custom":
      return {
        from: customFrom || today,
        to: customTo || today,
      };

    default:
      return { from: today, to: today };
  }
}

/**
 * Formats a Date as YYYY-MM-DD in KL timezone.
 */
export function formatKLDate(date: Date): string {
  const kl = new Date(date.toLocaleString("en-US", { timeZone: KL_TIMEZONE }));
  const y = kl.getFullYear();
  const m = String(kl.getMonth() + 1).padStart(2, "0");
  const d = String(kl.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns an array of dates (YYYY-MM-DD) within a range.
 */
export function getDatesInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${from}T00:00:00+08:00`);
  const end = new Date(`${to}T00:00:00+08:00`);
  while (current <= end) {
    dates.push(formatKLDate(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Returns the day name in Malay for a given date string.
 */
export function getDayName(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+08:00`);
  const dayIndex = d.getUTCDay(); // 0=Sun ... 6=Sat
  const days = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
  return days[dayIndex];
}

/**
 * Default school days (Monday-Friday). Configurable per school.
 */
export type SchoolDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun ... 6=Sat

export const DEFAULT_SCHOOL_DAYS: SchoolDay[] = [1, 2, 3, 4, 5]; // Mon-Fri

export function isSchoolDay(dateStr: string, schoolDays: SchoolDay[] = DEFAULT_SCHOOL_DAYS): boolean {
  const d = new Date(`${dateStr}T00:00:00+08:00`);
  const dow = d.getUTCDay() as SchoolDay;
  return schoolDays.includes(dow);
}