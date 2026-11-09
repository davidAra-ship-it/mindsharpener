import { historyItem, sessionItem, statsItem, type FocusSession } from './storage';
import { dayKey, emptyDay, minutesByDay, pruneHistory } from './policy';

/** Compatibilidad con sesiones guardadas por la v0.1 (sin kind/cycle). */
export function normalizeSession(s: Partial<FocusSession> & { startedAt: number; endsAt: number }): FocusSession {
  return {
    kind: 'focus',
    task: '',
    cycle: 1,
    focusMinutes: Math.round((s.endsAt - s.startedAt) / 60_000),
    ...s,
  };
}

export async function startFocus(
  minutes: number,
  task: string,
  profileId: string | undefined,
  cycle = 1,
): Promise<void> {
  const now = Date.now();
  await sessionItem.setValue({
    kind: 'focus',
    startedAt: now,
    endsAt: now + minutes * 60_000,
    task: task.trim(),
    cycle,
    focusMinutes: minutes,
    profileId,
  });
}

export async function startBreak(focus: FocusSession, minutes: number): Promise<void> {
  const now = Date.now();
  await sessionItem.setValue({
    ...focus,
    kind: 'break',
    startedAt: now,
    endsAt: now + minutes * 60_000,
  });
}

/** Suma a las estadísticas (totales e historial diario) el tiempo de una sesión de foco. */
export async function recordFocus(session: FocusSession, completed: boolean): Promise<void> {
  const now = Date.now();
  const end = Math.min(now, session.endsAt);
  const minutes = Math.max(0, Math.round((end - session.startedAt) / 60_000));
  const stats = await statsItem.getValue();
  await statsItem.setValue({
    ...stats,
    focusMinutes: stats.focusMinutes + minutes,
    sessionsCompleted: stats.sessionsCompleted + (completed ? 1 : 0),
  });

  const history = { ...(await historyItem.getValue()) };
  for (const [key, m] of Object.entries(minutesByDay(session.startedAt, end))) {
    const day = history[key] ?? emptyDay();
    history[key] = { ...day, focus: day.focus + m };
  }
  if (completed) {
    const key = dayKey(new Date(end));
    const day = history[key] ?? emptyDay();
    history[key] = { ...day, sessions: day.sessions + 1 };
  }
  await historyItem.setValue(pruneHistory(history, now));
}

/** Suma un intento de entrar en una web bloqueada. */
export async function recordBlocked(): Promise<void> {
  const stats = await statsItem.getValue();
  await statsItem.setValue({ ...stats, blockedAttempts: stats.blockedAttempts + 1 });
  const history = await historyItem.getValue();
  const key = dayKey(new Date());
  const day = history[key] ?? emptyDay();
  await historyItem.setValue({ ...history, [key]: { ...day, blocked: day.blocked + 1 } });
}

/** Minutos de foco de hoy, contando la sesión en curso. */
export function focusToday(
  history: Record<string, { focus: number }>,
  session: FocusSession | null,
  now: number,
): number {
  const key = dayKey(new Date(now));
  let total = history[key]?.focus ?? 0;
  if (session?.kind === 'focus') {
    total += minutesByDay(session.startedAt, Math.min(now, session.endsAt))[key] ?? 0;
  }
  return total;
}

/** Termina la sesión o el descanso en curso antes de tiempo. */
export async function stopSession(): Promise<void> {
  const raw = await sessionItem.getValue();
  if (!raw) return;
  const session = normalizeSession(raw);
  if (session.kind === 'focus') await recordFocus(session, false);
  await sessionItem.setValue(null);
}

export async function skipBreak(): Promise<void> {
  const raw = await sessionItem.getValue();
  if (!raw) return;
  const session = normalizeSession(raw);
  if (session.kind !== 'break') return;
  await startFocus(session.focusMinutes, session.task, session.profileId, session.cycle + 1);
}

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 95 → "1h 35m", 40 → "40m". */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  return h > 0 ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export function formatClock(epoch: number, lang: string): string {
  return new Date(epoch).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
}
