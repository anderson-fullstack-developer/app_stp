/**
 * Datas locais do utilizador (docs/REGRAS_DE_NEGOCIO.md RN-05). Uma "data local" é uma
 * string ISO `AAAA-MM-DD` no fuso horário do utilizador.
 */
const formatters = new Map<string, Intl.DateTimeFormat>();

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Data local (`AAAA-MM-DD`) de um instante num fuso IANA. */
export function localDate(instant: Date, timeZone: string): string {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, fmt);
  }
  return fmt.format(instant);
}

const DAY_MS = 86_400_000;
const toUtcMs = (d: string) => Date.parse(`${d}T00:00:00Z`);

/** Dias de calendário de `from` até `to` (positivo se `to` é depois). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

export function addDays(date: string, days: number): string {
  return new Date(toUtcMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Segunda-feira (UTC) da semana ISO de um instante — início do ranking semanal (§9). */
export function isoWeekStartUtc(instant: Date): Date {
  const d = new Date(
    Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate()),
  );
  const weekday = (d.getUTCDay() + 6) % 7; // segunda = 0
  return new Date(d.getTime() - weekday * DAY_MS);
}
