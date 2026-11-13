export function localDate(timezone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function calendarDays(anchor: string, view: "month" | "week") {
  const date = new Date(`${anchor}T12:00:00Z`);
  const first = view === "month" ? `${anchor.slice(0, 7)}-01` : anchor;
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  const start = addDays(first, -((weekday + 6) % 7));
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const length = view === "week" ? 7 : Math.ceil(((Date.parse(`${last}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000 + 1) / 7) * 7;
  return Array.from({ length }, (_, index) => addDays(start, index));
}
export function shiftPeriod(anchor: string, view: "month" | "week", direction: number) {
  if (view === "week") return addDays(anchor, direction * 7);
  const date = new Date(`${anchor.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + direction);
  return date.toISOString().slice(0, 10);
}
