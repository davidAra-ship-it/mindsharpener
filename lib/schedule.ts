import type { Schedule } from './storage';

export function toMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * ¿Está el horario activo en `date`?
 * Si `end` < `start` la franja cruza la medianoche (ej. 22:00–02:00) y
 * `days` se refiere al día en que empieza.
 */
export function isScheduleActive(s: Schedule, date: Date): boolean {
  if (!s.enabled) return false;
  const start = toMinutes(s.start);
  const end = toMinutes(s.end);
  if (start === end) return false;

  const day = date.getDay();
  const prevDay = (day + 6) % 7;
  const m = date.getHours() * 60 + date.getMinutes();

  if (start < end) return s.days.includes(day) && m >= start && m < end;
  return (s.days.includes(day) && m >= start) || (s.days.includes(prevDay) && m < end);
}

/** Momento (epoch ms) en que termina la franja activa de `s`. */
export function scheduleEnd(s: Schedule, date: Date): number {
  const start = toMinutes(s.start);
  const end = toMinutes(s.end);
  const m = date.getHours() * 60 + date.getMinutes();
  const d = new Date(date);
  d.setHours(Math.floor(end / 60), end % 60, 0, 0);
  if (start > end && m >= start) d.setDate(d.getDate() + 1);
  return d.getTime();
}

export function findActiveSchedule(list: Schedule[], date: Date): Schedule | undefined {
  return list.find((s) => isScheduleActive(s, date));
}
