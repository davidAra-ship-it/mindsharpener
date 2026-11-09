import type { DayStats, Passes, Profile } from './storage';

// Lógica pura (sin APIs del navegador) para poder probarla con `npm test`.

/** Respuesta del background al pedir un pase temporal. */
export type PassResponse =
  | { ok: true }
  | { ok: false; reason: 'inactive' | 'none-left' | 'disabled' };

/** Lo que hay que bloquear ahora mismo, combinando todos los perfiles activos. */
export interface Policy {
  /** Bloquear todo salvo `allow` (algún perfil activo usa lista blanca). */
  blockAll: boolean;
  allow: string[];
  /** Bloqueado siempre, incluso si está en `allow`. */
  block: string[];
}

/**
 * Si coinciden varios perfiles (una sesión y un horario, o dos horarios), gana
 * lo más estricto: se suman las listas negras y las listas blancas se
 * intersecan (solo se permite lo que todas permiten).
 */
export function effectivePolicy(active: Profile[]): Policy | null {
  if (active.length === 0) return null;
  const block = new Set<string>();
  const allowSets: Set<string>[] = [];
  for (const p of active) {
    if (p.mode === 'blocklist') for (const d of p.blocklist) block.add(d);
    else allowSets.push(new Set(p.allowlist));
  }
  const [first, ...rest] = allowSets;
  return {
    blockAll: allowSets.length > 0,
    allow: first ? [...first].filter((d) => rest.every((s) => s.has(d))).sort() : [],
    block: [...block].sort(),
  };
}

export const coversHost = (domain: string, host: string) =>
  host === domain || host.endsWith(`.${domain}`);

/**
 * Dominio al que se le da el pase: el de la lista negra que bloquea la web
 * (m.youtube.com → youtube.com) o, en lista blanca, el propio host.
 */
export function passDomainFor(host: string, policy: Policy): string {
  return policy.block.find((d) => coversHost(d, host)) ?? host.replace(/^www\./, '');
}

/** YYYY-MM-DD en hora local. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Pases del día: si cambió el día se reinicia el contador; se quitan los caducados. */
export function currentPasses(p: Passes, now: number): Passes {
  const today = dayKey(new Date(now));
  return {
    day: today,
    used: p.day === today ? p.used : 0,
    active: p.active.filter((a) => a.until > now),
  };
}

/** Reparte los minutos de un intervalo entre los días (locales) que toca. */
export function minutesByDay(start: number, end: number): Record<string, number> {
  const out: Record<string, number> = {};
  let cursor = start;
  while (cursor < end) {
    const d = new Date(cursor);
    const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    const sliceEnd = Math.min(end, nextMidnight);
    const key = dayKey(d);
    out[key] = (out[key] ?? 0) + (sliceEnd - cursor) / 60_000;
    cursor = sliceEnd;
  }
  for (const k of Object.keys(out)) out[k] = Math.round(out[k]!);
  return out;
}

export const emptyDay = (): DayStats => ({ focus: 0, sessions: 0, blocked: 0 });

/** Los últimos `n` días terminando hoy, del más antiguo al más reciente. */
export function lastDays(
  history: Record<string, DayStats>,
  n: number,
  now: number,
): { key: string; date: Date; stats: DayStats }[] {
  const today = new Date(now);
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1 - i));
    const key = dayKey(date);
    return { key, date, stats: history[key] ?? emptyDay() };
  });
}

/**
 * Días seguidos cumpliendo el objetivo. Hoy cuenta si ya lo has cumplido; si
 * todavía no, la racha sigue viva desde ayer.
 */
export function streak(history: Record<string, DayStats>, goal: number, now: number): number {
  if (goal <= 0) return 0;
  const today = new Date(now);
  let count = 0;
  for (let i = 0; i < 3660; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const met = (history[dayKey(d)]?.focus ?? 0) >= goal;
    if (met) count++;
    else if (i > 0) break;
  }
  return count;
}

/** Quita los días más antiguos que `keepDays`. */
export function pruneHistory(
  history: Record<string, DayStats>,
  now: number,
  keepDays = 400,
): Record<string, DayStats> {
  const today = new Date(now);
  const oldest = dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - keepDays));
  return Object.fromEntries(Object.entries(history).filter(([k]) => k >= oldest));
}
