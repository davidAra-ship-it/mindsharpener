import { useRef, useState } from 'react';
import {
  allowlistItem,
  blocklistItem,
  getSettings,
  schedulesItem,
  settingsItem,
  statsItem,
  withDefaults,
  type Schedule,
  type Stats,
} from '@/lib/storage';
import { normalizeDomain } from '@/lib/domains';
import type { T } from '@/lib/i18n';
import { Section, ghostBtn } from './ui';

export function StatsPanel({ stats, t }: { stats: Stats; t: T }) {
  const hours = Math.floor(stats.focusMinutes / 60);
  const mins = stats.focusMinutes % 60;
  const items = [
    { label: t('statFocus'), value: hours ? `${hours}h ${mins}m` : `${mins}m` },
    { label: t('statSessions'), value: stats.sessionsCompleted },
    { label: t('statBlocked'), value: stats.blockedAttempts },
  ];

  return (
    <Section title={t('statsTitle')}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl border border-line bg-panel px-4 py-3">
            <div className="text-2xl font-semibold tabular">{it.value}</div>
            <div className="text-xs text-muted mt-0.5">{it.label}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

const domainsFrom = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.map((d) => (typeof d === 'string' ? normalizeDomain(d) : null)))].filter(
        (d): d is string => d !== null,
      )
    : [];

const isTime = (v: unknown) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);

const schedulesFrom = (value: unknown): Schedule[] =>
  Array.isArray(value)
    ? value
        .filter(
          (s) =>
            s &&
            typeof s.name === 'string' &&
            Array.isArray(s.days) &&
            isTime(s.start) &&
            isTime(s.end),
        )
        .map((s) => ({
          id: crypto.randomUUID(),
          name: String(s.name).slice(0, 40),
          days: s.days.filter((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6),
          start: s.start,
          end: s.end,
          enabled: s.enabled !== false,
        }))
    : [];

export function Backup({ locked, t }: { locked: boolean; t: T }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const exportConfig = async () => {
    const data = {
      app: 'MindSharpener',
      version: 2,
      blocklist: await blocklistItem.getValue(),
      allowlist: await allowlistItem.getValue(),
      schedules: await schedulesItem.getValue(),
      settings: await getSettings(),
      stats: await statsItem.getValue(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mindsharpener-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importConfig = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object') throw new Error('invalid');
      const blocklist = domainsFrom(data.blocklist);

      if (locked) {
        // Durante el bloqueo solo se permite ampliar la lista negra.
        const current = await blocklistItem.getValue();
        await blocklistItem.setValue([...new Set([...current, ...blocklist])]);
        setMessage(t('importedLocked'));
        return;
      }

      if (Array.isArray(data.blocklist)) await blocklistItem.setValue(blocklist);
      if (Array.isArray(data.allowlist)) await allowlistItem.setValue(domainsFrom(data.allowlist));
      if (Array.isArray(data.schedules)) await schedulesItem.setValue(schedulesFrom(data.schedules));
      if (data.settings && typeof data.settings === 'object') {
        await settingsItem.setValue(withDefaults(data.settings));
      }
      setMessage(t('imported'));
    } catch {
      setMessage(t('importError'));
    }
  };

  return (
    <Section title={t('backupTitle')} desc={t('backupDesc')}>
      <div className="flex gap-2">
        <button onClick={exportConfig} className={ghostBtn}>
          {t('export')}
        </button>
        <button onClick={() => fileRef.current?.click()} className={ghostBtn}>
          {t('import')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importConfig(file);
            e.target.value = '';
          }}
        />
      </div>
      {message && <p className="text-sm text-muted">{message}</p>}
    </Section>
  );
}
