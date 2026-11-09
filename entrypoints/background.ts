import {
  blockingStateItem,
  getSettings,
  passesItem,
  profilesItem,
  schedulesItem,
  sessionItem,
  type BlockingState,
  type FocusSession,
  type Profile,
} from '@/lib/storage';
import { normalizeSession, recordFocus, startBreak, startFocus } from '@/lib/session';
import { findActiveSchedules, scheduleEnd } from '@/lib/schedule';
import { buildRules } from '@/lib/rules';
import {
  coversHost,
  currentPasses,
  effectivePolicy,
  passDomainFor,
  type PassResponse,
} from '@/lib/policy';
import { loadProfiles, resolveProfile } from '@/lib/profiles';
import { makeT, resolveLang } from '@/lib/i18n';

const SESSION_END_ALARM = 'session-end';
const PASS_END_ALARM = 'pass-end';
const TICK_ALARM = 'tick'; // cada minuto: horarios e insignia

const AMBER = '#f5b83d';
const GREEN = '#4ade80';

export default defineBackground(() => {
  // Serializamos las sincronizaciones para que dos cambios seguidos no
  // intenten crear reglas con el mismo id a la vez.
  let queue: Promise<unknown> = Promise.resolve();
  let lastRules = '';
  /** Ejecuta `fn` cuando terminen las tareas anteriores. */
  const enqueue = <R>(fn: () => Promise<R>): Promise<R> => {
    const run = queue.then(fn);
    queue = run.catch((err) => console.error('[MindSharpener]', err));
    return run;
  };
  const schedule = () => {
    enqueue(sync);
  };

  /** Perfiles que aplican ahora: el de la sesión de foco y los de los horarios activos. */
  async function activeProfiles(session: FocusSession | null, date: Date) {
    const [profiles, schedules] = await Promise.all([loadProfiles(), schedulesItem.getValue()]);
    const activeSchedules = findActiveSchedules(schedules, date);
    const active = new Map<string, Profile>();
    const add = (id: string | undefined) => {
      const p = resolveProfile(profiles, id);
      if (p) active.set(p.id, p);
    };
    if (session?.kind === 'focus') add(session.profileId);
    for (const s of activeSchedules) add(s.profileId);
    return { profiles: [...active.values()], activeSchedules };
  }

  async function sync() {
    const now = Date.now();
    const raw = await sessionItem.getValue();
    const session = raw ? normalizeSession(raw) : null;

    // Sesión o descanso terminado (también si el navegador estaba cerrado).
    if (session && session.endsAt <= now) {
      await finish(session); // cambia la sesión → watch → sync de nuevo
      return;
    }

    const date = new Date(now);
    const [{ profiles, activeSchedules }, settings, storedPasses] = await Promise.all([
      activeProfiles(session, date),
      getSettings(),
      passesItem.getValue(),
    ]);
    const policy = effectivePolicy(profiles);
    const focusing = session?.kind === 'focus';
    const firstSchedule = activeSchedules[0];
    const profileIds = profiles.map((p) => p.id);

    const state: BlockingState = focusing
      ? { active: true, source: 'session', until: session.endsAt, profileIds }
      : firstSchedule
        ? {
            active: true,
            source: 'schedule',
            scheduleName: firstSchedule.name,
            until: Math.max(...activeSchedules.map((s) => scheduleEnd(s, date))),
            profileIds,
          }
        : { active: false, source: null };

    // Pases: caducan solos, y sin bloqueo activo no tienen sentido.
    const passes = currentPasses(storedPasses, now);
    if (!policy) passes.active = [];
    const expired = storedPasses.active.filter((a) => !passes.active.some((p) => p.domain === a.domain));
    if (JSON.stringify(passes) !== JSON.stringify(storedPasses)) await passesItem.setValue(passes);

    // Reglas de bloqueo (solo se tocan si cambian).
    const rules = buildRules(
      {
        policy,
        passes: passes.active.map((a) => a.domain),
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

    // Al caducar un pase, recargamos las pestañas abiertas en esa web para
    // que vuelva a aparecer la página de foco.
    if (policy && expired.length > 0) await reloadTabs(expired.map((a) => a.domain));

    const prevState = await blockingStateItem.getValue();
    if (JSON.stringify(prevState) !== JSON.stringify(state)) {
      await blockingStateItem.setValue(state);
    }

    if (session) {
      await browser.alarms.create(SESSION_END_ALARM, { when: session.endsAt });
    } else {
      await browser.alarms.clear(SESSION_END_ALARM);
    }
    if (passes.active.length > 0) {
      await browser.alarms.create(PASS_END_ALARM, {
        when: Math.min(...passes.active.map((a) => a.until)),
      });
    } else {
      await browser.alarms.clear(PASS_END_ALARM);
    }

    await updateBadge(session, state, now);
  }

  async function reloadTabs(domains: string[]) {
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (tab.id === undefined || !tab.url) continue;
      let host: string;
      try {
        host = new URL(tab.url).hostname;
      } catch {
        continue;
      }
      if (domains.some((d) => coversHost(d, host))) browser.tabs.reload(tab.id).catch(() => {});
    }
  }

  async function grantPass(url: string): Promise<PassResponse> {
    const now = Date.now();
    const raw = await sessionItem.getValue();
    const session = raw ? normalizeSession(raw) : null;
    const [{ profiles }, settings, stored] = await Promise.all([
      activeProfiles(session, new Date(now)),
      getSettings(),
      passesItem.getValue(),
    ]);
    const policy = effectivePolicy(profiles);
    if (!policy) return { ok: false, reason: 'inactive' };
    if (settings.friction === 'locked' || settings.pass.perDay <= 0) {
      return { ok: false, reason: 'disabled' };
    }
    const passes = currentPasses(stored, now);
    if (passes.used >= settings.pass.perDay) return { ok: false, reason: 'none-left' };

    let host: string;
    try {
      host = new URL(url).hostname;
    } catch {
      return { ok: false, reason: 'inactive' };
    }
    const domain = passDomainFor(host, policy);
    await passesItem.setValue({
      ...passes,
      used: passes.used + 1,
      active: [
        ...passes.active.filter((a) => a.domain !== domain),
        { domain, until: now + settings.pass.minutes * 60_000 },
      ],
    });
    await sync(); // las reglas ya permiten la web cuando respondemos
    return { ok: true };
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
      await startFocus(session.focusMinutes, session.task, session.profileId, session.cycle + 1);
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
  profilesItem.watch(schedule);
  schedulesItem.watch(schedule);
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'settings' in changes) schedule();
  });
  browser.alarms.onAlarm.addListener((alarm) => {
    if ([SESSION_END_ALARM, PASS_END_ALARM, TICK_ALARM].includes(alarm.name)) schedule();
  });
  browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'grant-pass' && typeof msg.url === 'string') {
      enqueue(() => grantPass(msg.url)).then(sendResponse, () => sendResponse({ ok: false, reason: 'inactive' }));
      return true; // respuesta asíncrona
    }
  });
  browser.runtime.onStartup.addListener(schedule);
  browser.runtime.onInstalled.addListener(schedule);

  ensureTick();
  schedule();
});
