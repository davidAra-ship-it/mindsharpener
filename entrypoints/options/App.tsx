import {
  allowlistItem,
  blockingStateItem,
  blocklistItem,
  schedulesItem,
  statsItem,
} from '@/lib/storage';
import { useSettings, useStorageItem, useT } from '@/lib/hooks';
import { ModeAndLists } from './Lists';
import { Schedules } from './Schedules';
import { FrictionPrefs, LanguagePrefs, PomodoroPrefs, YoutubePrefs } from './Preferences';
import { Backup, StatsPanel } from './Data';

export default function App() {
  const { t } = useT();
  const settings = useSettings();
  const blocklist = useStorageItem(blocklistItem);
  const allowlist = useStorageItem(allowlistItem);
  const schedules = useStorageItem(schedulesItem);
  const state = useStorageItem(blockingStateItem);
  const stats = useStorageItem(statsItem);

  if (!settings || !blocklist || !allowlist || !schedules || !state || !stats) return null;
  const locked = state.active;

  const youtubeFullyBlocked =
    settings.mode === 'blocklist'
      ? blocklist.includes('youtube.com')
      : !allowlist.includes('youtube.com');

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Mind<span className="text-edge">Sharpener</span>
        </h1>
        <p className="text-sm text-muted">{t('tagline')}</p>
      </header>

      <ModeAndLists
        mode={settings.mode}
        blocklist={blocklist}
        allowlist={allowlist}
        locked={locked}
        t={t}
      />
      <Schedules schedules={schedules} locked={locked} t={t} />
      <YoutubePrefs
        settings={settings}
        youtubeFullyBlocked={youtubeFullyBlocked}
        locked={locked}
        t={t}
      />
      <PomodoroPrefs settings={settings} t={t} />
      <FrictionPrefs settings={settings} locked={locked} t={t} />
      <LanguagePrefs settings={settings} t={t} />
      <StatsPanel stats={stats} t={t} />
      <Backup locked={locked} t={t} />
    </main>
  );
}
