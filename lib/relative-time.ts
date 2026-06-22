// "written X ago" from a YYYY-MM-DD date, relative to `now` (epoch ms). Pure —
// no Node/fs imports — so it's safe to run in the browser as well as at build
// time. Returns null when there's no/invalid date.
export function writtenAgo(date: string, now: number): string | null {
  if (!date) return null;
  const then = new Date(date);
  if (isNaN(then.getTime())) return null;
  const days = Math.floor((now - then.getTime()) / 86_400_000);
  if (days <= 0) return "written today";
  const unit = (n: number, name: string) => `written ${n} ${name}${n === 1 ? "" : "s"} ago`;
  if (days < 30) return unit(days, "day");
  if (days < 365) return unit(Math.floor(days / 30), "month");
  return unit(Math.floor(days / 365), "year");
}
