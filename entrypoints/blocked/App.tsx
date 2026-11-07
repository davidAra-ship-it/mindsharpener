import { useEffect, useMemo } from 'react';
import { blockingStateItem, sessionItem, statsItem } from '@/lib/storage';
import { formatRemaining, normalizeSession } from '@/lib/session';
import { hostnameOf } from '@/lib/domains';
import { useNow, useSettings, useStorageItem, useT } from '@/lib/hooks';
import type { Key } from '@/lib/i18n';

const QUOTES: Key[] = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
const SHORTS_RE = /^https?:\/\/([^/?#]*\.)?youtube\.com\/shorts/i;
const isTopFrame = window.top === window;

export default function App() {
  const { t } = useT();
  const settings = useSettings();
  const state = useStorageItem(blockingStateItem);
  const rawSession = useStorageItem(sessionItem);
  const now = useNow();

  // La regla de bloqueo añade la URL original tal cual tras el "#".
  const originalUrl = useMemo(() => location.hash.slice(1), []);
  const host = hostnameOf(originalUrl);
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]!, []);

  // Contamos el intento una sola vez y solo para páginas completas (no iframes).
  useEffect(() => {
    if (!isTopFrame) return;
    statsItem
      .getValue()
      .then((s) => statsItem.setValue({ ...s, blockedAttempts: s.blockedAttempts + 1 }));
  }, []);

  if (!settings || !state || rawSession === undefined) return null;

  // Versión compacta si lo bloqueado es un iframe (p. ej. un vídeo incrustado).
  if (!isTopFrame) {
    return (
      <div className="h-screen flex items-center justify-center text-sm text-muted p-4 text-center">
        {t('embedded')}
      </div>
    );
  }

  const session = rawSession ? normalizeSession(rawSession) : null;
  const shortsBlocked =
    SHORTS_RE.test(originalUrl) &&
    settings.youtube.shorts &&
    (state.active || settings.youtube.always);
  const blocked = (state.active && (!state.until || state.until > now)) || shortsBlocked;

  const closeTab = async () => {
    const tab = await browser.tabs.getCurrent();
    if (tab?.id !== undefined) await browser.tabs.remove(tab.id);
  };

  const btn =
    'rounded-lg bg-edge text-ink font-semibold px-6 py-2.5 hover:bg-edge-strong transition-colors';

  if (!blocked) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full flex flex-col items-center text-center gap-6">
          <span className="text-xs uppercase tracking-[0.3em] text-edge">{t('bDone')}</span>
          <h1 className="text-3xl font-semibold">{t('bGoodJob')}</h1>
          <p className="text-muted">{t('bDoneDesc')}</p>
          {originalUrl.startsWith('http') && (
            <a href={originalUrl} className={btn}>
              {t('goTo', { host: host ?? t('theSite') })}
            </a>
          )}
        </div>
      </main>
    );
  }

  const label = state.active
    ? state.source === 'schedule'
      ? t('bScheduled')
      : t('bInFocus')
    : t('bShorts');

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full flex flex-col items-center text-center gap-6">
        <span className="text-xs uppercase tracking-[0.3em] text-edge">{label}</span>
        <h1 className="text-3xl font-semibold leading-tight">
          {shortsBlocked ? (
            t('bShortsTitle')
          ) : host ? (
            <>
              <span className="text-muted">{host}</span> {t('canWait')}
            </>
          ) : (
            t('siteCanWait')
          )}
        </h1>
        {session?.kind === 'focus' && session.task && (
          <p className="text-muted">
            {t('rightNow')} <span className="text-paper">{session.task}</span>
          </p>
        )}
        {state.active && state.until && (
          <div className="text-6xl font-semibold tabular py-2">
            {formatRemaining(state.until - now)}
          </div>
        )}
        <p className="text-sm text-muted italic max-w-xs">“{t(quote)}”</p>
        <button onClick={closeTab} className={btn}>
          {t('backToWork')}
        </button>
      </div>
    </main>
  );
}
