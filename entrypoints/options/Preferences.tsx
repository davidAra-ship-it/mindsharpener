import {
  FRICTIONS,
  updateSettings,
  type Friction,
  type Lang,
  type Settings,
  type YoutubeSettings,
} from '@/lib/storage';
import type { Key, T } from '@/lib/i18n';
import { Group, Section, Select, Toggle } from './ui';

export function YoutubePrefs({
  settings,
  youtubeFullyBlocked,
  locked,
  t,
}: {
  settings: Settings;
  youtubeFullyBlocked: boolean;
  locked: boolean;
  t: T;
}) {
  const yt = settings.youtube;
  const set = (patch: Partial<YoutubeSettings>) =>
    updateSettings({ youtube: { ...yt, ...patch } });
  // Durante el bloqueo se pueden activar, pero no desactivar.
  const offLocked = (on: boolean) => locked && on;

  const rows: { key: keyof YoutubeSettings; label: Key }[] = [
    { key: 'shorts', label: 'ytShorts' },
    { key: 'home', label: 'ytHome' },
    { key: 'recommendations', label: 'ytRecs' },
    { key: 'comments', label: 'ytComments' },
  ];

  return (
    <Section title={t('ytTitle')} desc={youtubeFullyBlocked ? t('ytFullyBlocked') : t('ytDesc')}>
      <Group>
        {rows.map((r) => (
          <Toggle
            key={r.key}
            label={t(r.label)}
            checked={yt[r.key]}
            disabled={offLocked(yt[r.key])}
            onChange={(v) => set({ [r.key]: v })}
          />
        ))}
        <Toggle label={t('ytAlways')} checked={yt.always} onChange={(v) => set({ always: v })} />
      </Group>
    </Section>
  );
}

export function PomodoroPrefs({ settings, t }: { settings: Settings; t: T }) {
  const p = settings.pomodoro;
  const set = (patch: Partial<Settings['pomodoro']>) =>
    updateSettings({ pomodoro: { ...p, ...patch } });
  const mins = (values: number[]) => values.map((v) => ({ value: v, label: `${v} min` }));

  return (
    <Section title={t('pomoTitle')}>
      <Group>
        <Toggle label={t('pomoEnable')} checked={p.enabled} onChange={(v) => set({ enabled: v })} />
        {p.enabled && (
          <>
            <Select
              label={t('pomoBreak')}
              value={p.breakMinutes}
              options={mins([3, 5, 10, 15])}
              onChange={(v) => set({ breakMinutes: v })}
            />
            <Select
              label={t('pomoLong')}
              value={p.longBreakMinutes}
              options={mins([10, 15, 20, 30])}
              onChange={(v) => set({ longBreakMinutes: v })}
            />
            <Select
              label={t('pomoEvery')}
              value={p.longBreakEvery}
              options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: t('pomoSessions', { n }) }))}
              onChange={(v) => set({ longBreakEvery: v })}
            />
            <Toggle
              label={t('pomoAutoFocus')}
              checked={p.autoStartFocus}
              onChange={(v) => set({ autoStartFocus: v })}
            />
          </>
        )}
      </Group>
    </Section>
  );
}

export function FrictionPrefs({
  settings,
  locked,
  t,
}: {
  settings: Settings;
  locked: boolean;
  t: T;
}) {
  const current = FRICTIONS.indexOf(settings.friction);

  return (
    <Section title={t('frictionTitle')} desc={t('frictionDesc')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FRICTIONS.map((f: Friction, i) => {
          const selected = settings.friction === f;
          // Con el bloqueo activo solo se puede subir la exigencia.
          const disabled = locked && i < current;
          return (
            <button
              key={f}
              disabled={disabled}
              onClick={() => updateSettings({ friction: f })}
              className={`text-left rounded-xl border px-4 py-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                selected ? 'border-edge bg-edge/10' : 'border-line bg-panel hover:border-muted'
              }`}
            >
              <div className={`text-sm font-medium ${selected ? 'text-edge' : ''}`}>
                {t(`f_${f}` as Key)}
              </div>
              <div className="text-xs text-muted mt-0.5">{t(`f_${f}Desc` as Key)}</div>
            </button>
          );
        })}
      </div>
      {settings.friction === 'wait' && (
        <Group>
          <Select
            label={t('waitSeconds')}
            value={settings.waitSeconds}
            disabled={locked}
            options={[10, 30, 60, 120, 300].map((n) => ({ value: n, label: t('seconds', { n }) }))}
            onChange={(v) => updateSettings({ waitSeconds: v })}
          />
        </Group>
      )}
    </Section>
  );
}

export function LanguagePrefs({ settings, t }: { settings: Settings; t: T }) {
  return (
    <Section title={t('languageTitle')}>
      <Group>
        <Select<Lang>
          label={t('languageTitle')}
          value={settings.language}
          options={[
            { value: 'auto', label: t('langAuto') },
            { value: 'es', label: 'Español' },
            { value: 'en', label: 'English' },
          ]}
          onChange={(v) => updateSettings({ language: v })}
        />
      </Group>
    </Section>
  );
}
