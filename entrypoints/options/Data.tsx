import { useRef, useState } from 'react';
import {
  DEFAULT_PROFILE_ID,
  getSettings,
  historyItem,
  profilesItem,
  schedulesItem,
  settingsItem,
  statsItem,
  withDefaults,
  type DayStats,
  type Profile,
  type Schedule,
} from '@/lib/storage';
import { loadProfiles } from '@/lib/profiles';
import { normalizeDomain } from '@/lib/domains';
import type { T } from '@/lib/i18n';
import { Section, ghostBtn } from './ui';

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
          profileId: typeof s.profileId === 'string' ? s.profileId : undefined,
        }))
    : [];

/** Perfiles del archivo. Las copias de la v0.2 traen una sola lista: se convierte en «General». */
function profilesFrom(data: any): Profile[] {
  if (Array.isArray(data.profiles)) {
    return data.profiles
      .filter((p: any) => p && typeof p.id === 'string' && typeof p.name === 'string')
      .map((p: any) => ({
        id: p.id,
        name: String(p.name).slice(0, 30),
        mode: p.mode === 'allowlist' ? 'allowlist' : 'blocklist',
        blocklist: domainsFrom(p.blocklist),
        allowlist: domainsFrom(p.allowlist),
      }));
  }
  if (Array.isArray(data.blocklist) || Array.isArray(data.allowlist)) {
    return [
      {
        id: DEFAULT_PROFILE_ID,
        name: 'General',
        mode: data.settings?.mode === 'allowlist' ? 'allowlist' : 'blocklist',
        blocklist: domainsFrom(data.blocklist),
        allowlist: domainsFrom(data.allowlist),
      },
    ];
  }
  return [];
}

const historyFrom = (value: unknown): Record<string, DayStats> => {
  if (!value || typeof value !== 'object') return {};
  const num = (v: unknown) => (typeof v === 'number' && v >= 0 ? Math.round(v) : 0);
  return Object.fromEntries(
    Object.entries(value as Record<string, any>)
      .filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v === 'object')
      .map(([k, v]) => [k, { focus: num(v.focus), sessions: num(v.sessions), blocked: num(v.blocked) }]),
  );
};

export function Backup({ locked, t }: { locked: boolean; t: T }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const exportConfig = async () => {
    const data = {
      app: 'MindSharpener',
      version: 3,
      profiles: await loadProfiles(),
      schedules: await schedulesItem.getValue(),
      settings: await getSettings(),
      stats: await statsItem.getValue(),
      history: await historyItem.getValue(),
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
      const imported = profilesFrom(data);

      if (locked) {
        // Durante el bloqueo solo se permite ampliar las listas negras de los
        // perfiles que ya existen.
        const current = await loadProfiles();
        await profilesItem.setValue(
          current.map((p) => {
            const extra = imported.find((i) => i.id === p.id)?.blocklist ?? [];
            return { ...p, blocklist: [...new Set([...p.blocklist, ...extra])] };
          }),
        );
        setMessage(t('importedLocked'));
        return;
      }

      if (imported.length > 0) await profilesItem.setValue(imported);
      if (Array.isArray(data.schedules)) await schedulesItem.setValue(schedulesFrom(data.schedules));
      if (data.history) {
        // Se combina con lo que ya hay: nos quedamos con el mayor de cada día.
        const current = await historyItem.getValue();
        const merged = { ...current };
        for (const [k, v] of Object.entries(historyFrom(data.history))) {
          const c = current[k];
          merged[k] = c
            ? {
                focus: Math.max(c.focus, v.focus),
                sessions: Math.max(c.sessions, v.sessions),
                blocked: Math.max(c.blocked, v.blocked),
              }
            : v;
        }
        await historyItem.setValue(merged);
      }
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
