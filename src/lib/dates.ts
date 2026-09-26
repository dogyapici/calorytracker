export const TIME_ZONE = process.env.APP_TIME_ZONE ?? "Europe/Berlin";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Today's calendar day (YYYY-MM-DD) in the app's time zone. */
export function today(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

export function isIsoDay(value: unknown): value is string {
  return typeof value === "string" && ISO_DAY.test(value) && !Number.isNaN(Date.parse(value));
}

/** The given day if valid, otherwise today. */
export function dayOrToday(value: unknown): string {
  return isIsoDay(value) ? value : today();
}

export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("de-DE", { ...opts, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}
