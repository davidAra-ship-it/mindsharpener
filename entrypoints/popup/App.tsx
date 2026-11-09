import { useEffect, useState } from 'react';
import {
  blockingStateItem,
  historyItem,
  profilesItem,
  sessionItem,
  updateSettings,
  type FocusSession,
  type Profile,
  type Settings,
} from '@/lib/storage';
import {
  focusToday,
  formatClock,
  formatMinutes,
  formatRemaining,
  normalizeSession,
  skipBreak,
  startFocus,
  stopSession,
} from '@/lib/session';
import { loadProfiles, profileBlocksSomething, resolveProfile } from '@/lib/profiles';
import { streak } from '@/lib/policy';
import { useNow, useSettings, useStorageItem, useT } from '@/lib/hooks';
import type { T } from '@/lib/i18n';
import { FrictionGate, ghostBtn } from '@/components/FrictionGate';

const DURATIONS = [25, 50, 90];

export default function App() {
  const { t, lang } = useT();
  const rawSession = useStorageItem(sessionItem);
  const state = useStorageItem(blockingStateItem);
  const profiles = useStorageItem(profilesItem);
  const history = useStorageItem(historyItem);
  const settings = useSettings();
  const now = useNow();
  const [pickedId, setPickedId] = useState<string>();
  useEffect(() => {
    loadProfiles(); // crea el perfil «General» si vienes de la v0.2
  }, []);

  if (rawSession === undefined || !state || !profiles || !history || !settings) {
    return <div className="w-80 h-72" />;
  }

  const session = rawSession ? normalizeSession(rawSession) : null;
  const shownProfile = resolveProfile(
    profiles,
    session ? session.profileId : (pickedId ?? settings.lastProfileId),
  );

  return (
    <div className="w-80 p-5 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight">
          Mind<span className="text-edge">Sharpener</span>
        </h1>
        <button
          onClick={() => browser.runtime.openOptionsPage()}
          className="text-xs text-muted hover:text-paper transition-colors"
        >
          {t('settings')}
        </button>
      </header>

      {state.source === 'schedule' && state.until && (
        <div className="rounded-lg border border-edge/40 bg-edge/10 px-3 py-2 text-sm">
          <div className="text-edge font-medium">{t('scheduleActive')}</div>
          <div className="text-muted text-xs mt-0.5">
            {t('scheduleUntil', {
              name: state.scheduleName ?? '',
              time: formatClock(state.until, lang),
            })}
          </div>
        </div>
      )}

      {session?.kind === 'focus' ? (
        <FocusView session={session} now={now} settings={settings} profiles={profiles} t={t} />
      ) : session?.kind === 'break' ? (
        <BreakView session={session} now={now} t={t} />
      ) : (
        <StartForm
          profiles={profiles}
          selected={shownProfile}
          onSelect={setPickedId}
          t={t}
        />
      )}

      <TodayBar
        minutes={focusToday(history, session, now)}
        goal={settings.dailyGoalMinutes}
        streakDays={streak(history, settings.dailyGoalMinutes, now)}
        t={t}
      />

      <footer className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
        <span>{shownProfile ? profileSummary(shownProfile, t) : ''}</span>
        <ShortcutHint t={t} />
      </footer>
    </div>
  );
}

function profileSummary(p: Profile, t: T): string {
  if (p.mode === 'allowlist') return t('footerAllow', { n: p.allowlist.length });
  return p.blocklist.length === 1 ? t('footerSitesOne') : t('footerSites', { n: p.blocklist.length });
}

function StartForm({
  profiles,
  selected,
  onSelect,
  t,
}: {
  profiles: Profile[];
  selected: Profile | undefined;
  onSelect: (id: string) => void;
  t: T;
}) {
  const [minutes, setMinutes] = useState(25);
  const [custom, setCustom] = useState('');
  const [task, setTask] = useState('');

  const effective = custom ? Number(custom) : minutes;
  const valid = Number.isFinite(effective) && effective >= 1 && effective <= 600;
  const canStart = profileBlocksSomething(selected);

  const chip = (active: boolean) =>
    `rounded-lg py-2 text-sm border transition-colors ${
      active ? 'border-edge bg-edge/10 text-edge' : 'border-line bg-panel hover:border-muted'
    }`;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid || !canStart || !selected) return;
        updateSettings({ lastProfileId: selected.id });
        startFocus(effective, task, selected.id);
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">{t('whatWorkOn')}</span>
        <input
          autoFocus
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder={t('taskPlaceholder')}
          maxLength={80}
          className="bg-panel border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-edge"
        />
      </label>

      {profiles.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">{t('profile')}</span>
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => onSelect(p.id)}
                aria-pressed={selected?.id === p.id}
                className={`${chip(selected?.id === p.id)} px-3`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">{t('duration')}</span>
        <div className="grid grid-cols-4 gap-2">
          {DURATIONS.map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => {
                setMinutes(d);
                setCustom('');
              }}
              className={chip(!custom && minutes === d)}
            >
              {d}m
            </button>
          ))}
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))}
            placeholder={t('minutesShort')}
            inputMode="numeric"
            aria-label={t('customMinutes')}
            className={`rounded-lg py-2 text-sm text-center bg-panel border outline-none ${
              custom ? 'border-edge text-edge' : 'border-line'
            }`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!valid || !canStart}
        className="rounded-lg bg-edge text-ink font-semibold py-2.5 hover:bg-edge-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {t('startFocus')}
      </button>
      {!canStart && <p className="text-xs text-muted -mt-2">{t('addSitesFirst')}</p>}
    </form>
  );
}

/** Minutos de foco de hoy frente al objetivo diario. */
function TodayBar({
  minutes,
  goal,
  streakDays,
  t,
}: {
  minutes: number;
  goal: number;
  streakDays: number;
  t: T;
}) {
  const met = goal > 0 && minutes >= goal;
  const progress = goal > 0 ? Math.min(1, minutes / goal) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span>
          <span className="text-muted">{t('today')} </span>
          <span className="font-semibold tabular">{formatMinutes(minutes)}</span>
          {goal > 0 && (
            <span className="text-muted">
              {' '}
              {met ? `· ${t('goalMet')}` : t('ofGoal', { goal: formatMinutes(goal) })}
            </span>
          )}
        </span>
        {streakDays > 0 && (
          <span className="text-muted">
            {t('statStreak')}:{' '}
            <span className="text-paper tabular">
              {streakDays === 1 ? t('streakDay') : t('streakDays', { n: streakDays })}
            </span>
          </span>
        )}
      </div>
      {goal > 0 && (
        <div
          className="h-1 rounded-full bg-line overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuenow={Math.min(minutes, goal)}
          aria-label={t('dailyGoal')}
        >
          <div className="h-full bg-edge" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </div>
  );
}

/** Muestra el atajo real (el usuario puede haberlo cambiado) o cómo configurarlo. */
function ShortcutHint({ t }: { t: T }) {
  const [keys, setKeys] = useState<string | null>(null);
  useEffect(() => {
    browser.commands
      .getAll()
      .then((cmds) => setKeys(cmds.find((c) => c.name === '_execute_action')?.shortcut ?? ''))
      .catch(() => setKeys(''));
  }, []);
  if (keys === null) return null;
  const open = () => browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
  return (
    <button onClick={open} className="shrink-0 hover:text-paper transition-colors" title={t('setShortcut')}>
      {keys ? t('shortcut', { keys }) : t('setShortcut')}
    </button>
  );
}

function Countdown({
  session,
  now,
  label,
  accent,
  profileName,
  t,
}: {
  session: FocusSession;
  now: number;
  label: string;
  accent: 'edge' | 'green';
  profileName?: string;
  t: T;
}) {
  const remaining = session.endsAt - now;
  const total = session.endsAt - session.startedAt;
  const progress = Math.min(1, Math.max(0, 1 - remaining / total));
  const color = accent === 'edge' ? 'text-edge' : 'text-green-400';
  const bar = accent === 'edge' ? 'bg-edge' : 'bg-green-400';

  return (
    <>
      <div className="flex flex-col items-center gap-1 py-2">
        <span className={`text-xs uppercase tracking-widest ${color}`}>
          {label}
          {profileName ? ` · ${profileName}` : ''}
          {session.cycle > 1 || session.kind === 'break'
            ? ` · ${t('sessionN', { n: session.cycle })}`
            : ''}
        </span>
        <span className="text-5xl font-semibold tabular">{formatRemaining(remaining)}</span>
        {session.task && <span className="text-sm text-muted text-center mt-1">{session.task}</span>}
      </div>
      <div className="h-1.5 rounded-full bg-line overflow-hidden">
        <div className={`h-full ${bar} transition-[width]`} style={{ width: `${progress * 100}%` }} />
      </div>
    </>
  );
}

function FocusView({
  session,
  now,
  settings,
  profiles,
  t,
}: {
  session: FocusSession;
  now: number;
  settings: Settings;
  profiles: Profile[];
  t: T;
}) {
  // El nombre solo aporta si hay más de un perfil.
  const profileName =
    profiles.length > 1 ? resolveProfile(profiles, session.profileId)?.name : undefined;
  return (
    <div className="flex flex-col gap-4">
      <Countdown
        session={session}
        now={now}
        label={t('inFocus')}
        accent="edge"
        profileName={profileName}
        t={t}
      />
      <EndEarly settings={settings} t={t} />
    </div>
  );
}

function BreakView({ session, now, t }: { session: FocusSession; now: number; t: T }) {
  return (
    <div className="flex flex-col gap-4">
      <Countdown session={session} now={now} label={t('onBreak')} accent="green" t={t} />
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => skipBreak()}
          className="rounded-lg bg-edge text-ink font-semibold py-2 text-sm hover:bg-edge-strong transition-colors"
        >
          {t('skipBreak')}
        </button>
        <button onClick={() => stopSession()} className={ghostBtn}>
          {t('stop')}
        </button>
      </div>
    </div>
  );
}

/** Botón de terminar antes de tiempo con la fricción elegida en Ajustes. */
function EndEarly({ settings, t }: { settings: Settings; t: T }) {
  const [open, setOpen] = useState(false);

  if (settings.friction === 'locked') {
    return <p className="text-xs text-muted text-center">{t('strictNoEnd')}</p>;
  }

  if (!open) {
    return (
      <button className={ghostBtn} onClick={() => setOpen(true)}>
        {t('endEarly')}
      </button>
    );
  }

  return (
    <FrictionGate
      settings={settings}
      purpose="end"
      confirmLabel={t('endSession')}
      confirmClass="rounded-lg bg-red-500/80 text-paper py-2 text-sm font-medium hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      onConfirm={() => stopSession()}
      onCancel={() => setOpen(false)}
      t={t}
    />
  );
}
