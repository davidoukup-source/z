// Petites fonctions de fuseau horaire, sans dépendance externe.
// Une "date locale" est une chaîne YYYY-MM-DD dans le fuseau de l'utilisateur.

const MINUTE = 60_000;

function parts(date: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
}

// Décalage du fuseau par rapport à UTC, en millisecondes, à cet instant.
export function tzOffsetMs(date: Date, tz: string): number {
  const p = parts(date, tz);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// "2026-10-30" + "09:00" en Europe/Brussels → instant UTC correspondant.
export function zonedToUtc(ymd: string, hm: string, tz: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const off = tzOffsetMs(new Date(guess), tz);
  let result = guess - off;
  const off2 = tzOffsetMs(new Date(result), tz);
  if (off2 !== off) result = guess - off2;
  return new Date(result);
}

export function localDate(date: Date, tz: string): string {
  const p = parts(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

export function localTime(date: Date, tz: string): string {
  const p = parts(date, tz);
  return `${p.hour}:${p.minute}`;
}

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function dayBounds(ymd: string, tz: string): { debut: Date; fin: Date } {
  return { debut: zonedToUtc(ymd, "00:00", tz), fin: zonedToUtc(addDays(ymd, 1), "00:00", tz) };
}

export function isValidYmd(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MINUTE);
}

export function formatDuree(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export function formatJourCourt(ymd: string, tz: string): string {
  return new Intl.DateTimeFormat("fr-BE", { timeZone: tz, weekday: "short", day: "numeric" }).format(
    zonedToUtc(ymd, "12:00", tz)
  );
}

export function formatJourLong(ymd: string, tz: string): string {
  return new Intl.DateTimeFormat("fr-BE", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(zonedToUtc(ymd, "12:00", tz));
}

export function formatDateHeure(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("fr-BE", {
    timeZone: tz,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
