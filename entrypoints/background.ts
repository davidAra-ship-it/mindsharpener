import {
  allowlistItem,
  blockingStateItem,
  blocklistItem,
  getSettings,
  schedulesItem,
  sessionItem,
  type BlockingState,
  type FocusSession,
} from '@/lib/storage';
import { normalizeSession, recordFocus, startBreak, startFocus } from '@/lib/session';
import { findActiveSchedule, scheduleEnd } from '@/lib/schedule';
import { buildRules } from '@/lib/rules';
import { makeT, resolveLang } from '@/lib/i18n';

const SESSION_END_ALARM = 'session-end';
const TICK_ALARM = 'tick'; // cada minuto: horarios e insignia

const AMBER = '#f5b83d';
const GREEN = '#4ade80';

export default defineBackground(() => {
  // Serializamos las sincronizaciones para que dos cambios seguidos no
  // intenten crear reglas con el mismo id a la vez.
  let queue = Promise.resolve();
  let lastRules = '';
  const schedule = () => {
    queue = queue.then(sync).catch((err) => console.error('[MindSharpener]', err));
  };

  async function sync() {
    const now = Date.now();
    const raw = await sessionItem.getValue();
    const session = raw ? normalizeSession(raw) : null;

    // Sesión o descanso terminado (también si el navegador estaba cerrado).
    if (session && session.endsAt <= now) {
      await finish(session); // cambia la sesión → watch → sync de nuevo
      return;
    }

    const [blocklist, allowlist, schedules, settings] = await Promise.all([
      blocklistItem.getValue(),
      allowlistItem.getValue(),
      schedulesItem.getValue(),
      getSettings(),
    ]);

    const date = new Date(now);
    const activeSchedule = findActiveSchedule(schedules, date);
    const focusing = session?.kind === 'focus';

    const state: BlockingState = focusing
      ? { active: true, source: 'session', until: session.endsAt }
      : activeSchedule
        ? {
            active: true,
            source: 'schedule',
            scheduleName: activeSchedule.name,
            until: scheduleEnd(activeSchedule, date),
          }
        : { active: false, source: null };

    // Reglas de bloqueo (solo se tocan si cambian).
    const rules = buildRules(
      {
        full: state.active,
        mode: settings.mode,
        blocklist,
        allowlist,
        blockShorts: settings.youtube.shorts && (state.active || settings.youtube.always),
      },
      browser.runtime.getURL('/blocked.html'),
    );
    const signature = JSON.stringify(rules);
    if (signature !== lastRules) {
      const existing = await browser.declarativeNetRequest.getDynamicRules();
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existing.map((r) => r.id),
        addRules: rules,
      });
      lastRules = signature;
    }

    const prevState = await blockingStateItem.getValue();
    if (JSON.stringify(prevState) !== JSON.stringify(state)) {
      await blockingStateItem.setValue(state);
    }

    if (session) {
      await browser.alarms.create(SESSION_END_ALARM, { when: session.endsAt });
    } else {
      await browser.alarms.clear(SESSION_END_ALARM);
    }

    await updateBadge(session, state, now);
  }

  async function finish(session: FocusSession) {
    const settings = await getSettings();
    const t = makeT(resolveLang(settings.language));
    const { pomodoro } = settings;

    if (session.kind === 'focus') {
      await recordFocus(session, true);
      if (pomodoro.enabled) {
        const long = session.cycle % pomodoro.longBreakEvery === 0;
        const minutes = long ? pomodoro.longBreakMinutes : pomodoro.breakMinutes;
        await startBreak(session, minutes);
        notify(t('nFocusDone'), t('nBreakStart', { n: minutes }));
      } else {
        await sessionItem.setValue(null);
        notify(t('nFocusDone'), t('nFocusDoneBody'));
      }
      return;
    }

    // Fin del descanso.
    if (pomodoro.enabled && pomodoro.autoStartFocus) {
      await startFocus(session.focusMinutes, session.task, session.cycle + 1);
      notify(t('nBreakDone'), t('nNextStarted', { n: session.cycle + 1 }));
    } else {
      await sessionItem.setValue(null);
      notify(t('nBreakDone'), t('nBreakDoneBody'));
    }
  }

  function notify(title: string, message: string) {
    browser.notifications
      .create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('/icon/128.png'),
        title,
        message,
      })
      .catch(() => {});
  }

  async function updateBadge(session: FocusSession | null, state: BlockingState, now: number) {
    let text = '';
    let color = AMBER;
    if (session) {
      const minutes = Math.ceil((session.endsAt - now) / 60_000);
      text = minutes >= 100 ? `${Math.round(minutes / 60)}h` : `${minutes}m`;
      if (session.kind === 'break') color = GREEN;
    } else if (state.active) {
      text = 'ON';
    }
    await browser.action.setBadgeText({ text });
    await browser.action.setBadgeBackgroundColor({ color });
  }

  async function ensureTick() {
    if (!(await browser.alarms.get(TICK_ALARM))) {
      await browser.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
    }
  }

  sessionItem.watch(schedule);
  blocklistItem.watch(schedule);
  allowlistItem.watch(schedule);
  schedulesItem.watch(schedule);
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'settings' in changes) schedule();
  });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SESSION_END_ALARM || alarm.name === TICK_ALARM) schedule();
  });
  browser.runtime.onStartup.addListener(schedule);
  browser.runtime.onInstalled.addListener(schedule);

  ensureTick();
  schedule();
});
