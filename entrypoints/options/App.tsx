import { useEffect } from 'react';
import {
  blockingStateItem,
  historyItem,
  profilesItem,
  schedulesItem,
  sessionItem,
  statsItem,
} from '@/lib/storage';
import { loadProfiles } from '@/lib/profiles';
import { normalizeSession } from '@/lib/session';
import { useSettings, useStorageItem, useT } from '@/lib/hooks';
import { ProfilesSection } from './Lists';
import { Schedules } from './Schedules';
import {
  FrictionPrefs,
  LanguagePrefs,
  PassPrefs,
  PomodoroPrefs,
  YoutubePrefs,
} from './Preferences';
import { Backup } from './Data';
import { ProgressPanel } from './Progress';

export default function App() {
  const { t, lang } = useT();
  const settings = useSettings();
  const profiles = useStorageItem(profilesItem);
  const schedules = useStorageItem(schedulesItem);
  const state = useStorageItem(blockingStateItem);
  const stats = useStorageItem(statsItem);
  const history = useStorageItem(historyItem);
  const rawSession = useStorageItem(sessionItem);

  useEffect(() => {
    loadProfiles(); // crea el perfil «General» si vienes de la v0.2
  }, []);

  if (
    !settings ||
    !profiles?.length ||
    !schedules ||
    !state ||
    !stats ||
    !history ||
    rawSession === undefined
  ) {
    return null;
  }
  const locked = state.active;
  const activeIds = state.active ? (state.profileIds ?? []) : [];

  const youtubeFullyBlocked = profiles.some((p) =>
    p.mode === 'blocklist' ? p.blocklist.includes('youtube.com') : !p.allowlist.includes('youtube.com'),
  );

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Mind<span className="text-edge">Sharpener</span>
        </h1>
        <p className="text-sm text-muted">{t('tagline')}</p>
      </header>

      <ProgressPanel
        stats={stats}
        history={history}
        session={rawSession ? normalizeSession(rawSession) : null}
        settings={settings}
        lang={lang}
        t={t}
      />
      {locked && (
        <p className="text-sm rounded-lg border border-edge/40 bg-edge/10 text-edge px-3 py-2 -mb-4">
          {t('lockedNotice')}
        </p>
      )}

      <ProfilesSection profiles={profiles} schedules={schedules} activeIds={activeIds} t={t} />
      <Schedules schedules={schedules} profiles={profiles} locked={locked} t={t} />
      <YoutubePrefs
        settings={settings}
        youtubeFullyBlocked={youtubeFullyBlocked}
        locked={locked}
        t={t}
      />
      <PomodoroPrefs settings={settings} t={t} />
      <FrictionPrefs settings={settings} locked={locked} t={t} />
      <PassPrefs settings={settings} locked={locked} t={t} />
      <LanguagePrefs settings={settings} t={t} />
      <Backup locked={locked} t={t} />
    </main>
  );
}
