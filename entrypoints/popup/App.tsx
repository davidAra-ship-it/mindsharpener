import { useState } from 'react';
import {
  allowlistItem,
  blockingStateItem,
  blocklistItem,
  sessionItem,
  type FocusSession,
  type Settings,
} from '@/lib/storage';
import {
  formatClock,
  formatRemaining,
  normalizeSession,
  skipBreak,
  startFocus,
  stopSession,
} from '@/lib/session';
import { useNow, useSettings, useStorageItem, useT } from '@/lib/hooks';
import type { T } from '@/lib/i18n';

const DURATIONS = [25, 50, 90];

export default function App() {
  const { t, lang } = useT();
  const rawSession = useStorageItem(sessionItem);
  const state = useStorageItem(blockingStateItem);
  const blocklist = useStorageItem(blocklistItem);
  const allowlist = useStorageItem(allowlistItem);
  const settings = useSettings();
  const now = useNow();

  if (
    rawSession === undefined ||
    !state ||
    !blocklist ||
    !allowlist ||
    !settings
  ) {
    return <div className="w-80 h-72" />;
  }

  const session = rawSession ? normalizeSession(rawSession) : null;
  const allowMode = settings.mode === 'allowlist';

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
        <FocusView session={session} now={now} settings={settings} t={t} />
      ) : session?.kind === 'break' ? (
        <BreakView session={session} now={now} t={t} />
      ) : (
        <StartForm canStart={allowMode || blocklist.length > 0} t={t} />
      )}

      <footer className="text-xs text-muted">
        {allowMode
          ? t('footerAllow', { n: allowlist.length })
          : blocklist.length === 1
            ? t('footerSitesOne')
            : t('footerSites', { n: blocklist.length })}
      </footer>
    </div>
  );
}

function StartForm({ canStart, t }: { canStart: boolean; t: T }) {
  const [minutes, setMinutes] = useState(25);
  const [custom, setCustom] = useState('');
  const [task, setTask] = useState('');

  const effective = custom ? Number(custom) : minutes;
  const valid = Number.isFinite(effective) && effective >= 1 && effective <= 600;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && canStart) startFocus(effective, task);
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
              className={`rounded-lg py-2 text-sm border transition-colors ${
                !custom && minutes === d
                  ? 'border-edge bg-edge/10 text-edge'
                  : 'border-line bg-panel hover:border-muted'
              }`}
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

function Countdown({
  session,
  now,
  label,
  accent,
  t,
}: {
  session: FocusSession;
  now: number;
  label: string;
  accent: 'edge' | 'green';
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
  t,
}: {
  session: FocusSession;
  now: number;
  settings: Settings;
  t: T;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Countdown session={session} now={now} label={t('inFocus')} accent="edge" t={t} />
      <EndEarly settings={settings} now={now} t={t} />
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
        <button
          onClick={() => stopSession()}
          className="rounded-lg border border-line py-2 text-sm text-muted hover:text-paper hover:border-muted transition-colors"
        >
          {t('stop')}
        </button>
      </div>
    </div>
  );
}

const normalizePhrase = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Botón de terminar antes de tiempo con la fricción elegida en Ajustes. */
function EndEarly({ settings, now, t }: { settings: Settings; now: number; t: T }) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(0);
  const [typed, setTyped] = useState('');
  const { friction, waitSeconds } = settings;

  const ghost =
    'rounded-lg border border-line py-2 text-sm text-muted hover:text-paper hover:border-muted transition-colors';

  if (friction === 'locked') {
    return <p className="text-xs text-muted text-center">{t('strictNoEnd')}</p>;
  }

  if (!open) {
    return (
      <button
        className={ghost}
        onClick={() => {
          if (friction === 'none') {
            if (confirm(t('confirmEnd'))) stopSession();
            return;
          }
          setOpen(true);
          setOpenedAt(Date.now());
          setTyped('');
        }}
      >
        {t('endEarly')}
      </button>
    );
  }

  let canEnd = false;
  let body: React.ReactNode = null;

  if (friction === 'wait') {
    const left = Math.max(0, waitSeconds - Math.floor((now - openedAt) / 1000));
    canEnd = left === 0;
    body = (
      <p className="text-xs text-muted text-center">
        {canEnd ? t('waitDone') : t('waitToEnd', { s: left })}
      </p>
    );
  } else {
    const phrase = t('phrase');
    canEnd = normalizePhrase(typed) === normalizePhrase(phrase);
    body = (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted">{t('typePhrase')}</p>
        <p className="text-sm select-none">“{phrase}”</p>
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          autoComplete="off"
          spellCheck={false}
          className="bg-panel border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-edge"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
      {body}
      <div className="grid grid-cols-2 gap-2">
        <button className={ghost} onClick={() => setOpen(false)}>
          {t('cancel')}
        </button>
        <button
          disabled={!canEnd}
          onClick={() => stopSession()}
          className="rounded-lg bg-red-500/80 text-paper py-2 text-sm font-medium hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {t('endSession')}
        </button>
      </div>
    </div>
  );
}
