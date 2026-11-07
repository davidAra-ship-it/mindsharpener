import { blockingStateItem, getSettings, settingsItem, withDefaults } from '@/lib/storage';
import { makeT, resolveLang } from '@/lib/i18n';

// Oculta las partes más adictivas de YouTube. Los selectores dependen del HTML
// de YouTube, que cambia de vez en cuando: si algo deja de ocultarse, este es
// el sitio que hay que actualizar.
const CSS = `
html[data-ms-shorts] ytd-reel-shelf-renderer,
html[data-ms-shorts] ytd-rich-shelf-renderer[is-shorts],
html[data-ms-shorts] ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
html[data-ms-shorts] ytd-rich-section-renderer:has(ytm-shorts-lockup-view-model),
html[data-ms-shorts] grid-shelf-view-model:has(ytm-shorts-lockup-view-model),
html[data-ms-shorts] ytd-rich-item-renderer:has(a[href^="/shorts/"]),
html[data-ms-shorts] ytd-video-renderer:has(a[href^="/shorts/"]),
html[data-ms-shorts] ytd-grid-video-renderer:has(a[href^="/shorts/"]),
html[data-ms-shorts] ytd-guide-entry-renderer:has(a[title="Shorts"]),
html[data-ms-shorts] ytd-mini-guide-entry-renderer[aria-label="Shorts"],
html[data-ms-shorts] yt-tab-shape[tab-title="Shorts"] {
  display: none !important;
}

html[data-ms-home] ytd-browse[page-subtype="home"] ytd-rich-grid-renderer {
  display: none !important;
}
html[data-ms-home] ytd-browse[page-subtype="home"]::before {
  content: var(--ms-home-msg, "");
  display: block;
  padding: 140px 24px;
  text-align: center;
  font-size: 22px;
  color: var(--yt-spec-text-secondary, #aaa);
}

html[data-ms-recs] ytd-watch-flexy #related,
html[data-ms-recs] ytd-watch-next-secondary-results-renderer,
html[data-ms-recs] .ytp-endscreen-content,
html[data-ms-recs] .ytp-ce-element,
html[data-ms-recs] .ytp-autonav-endscreen-countdown-overlay {
  display: none !important;
}

html[data-ms-comments] ytd-comments#comments,
html[data-ms-comments] ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"] {
  display: none !important;
}
`;

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_start',
  async main(ctx) {
    const root = document.documentElement;
    const style = document.createElement('style');
    style.id = 'mindsharpener-youtube';
    style.textContent = CSS;
    root.appendChild(style);

    let settings = await getSettings();
    let state = await blockingStateItem.getValue();

    const apply = () => {
      const yt = settings.youtube;
      const on = state.active || yt.always;
      root.toggleAttribute('data-ms-shorts', on && yt.shorts);
      root.toggleAttribute('data-ms-home', on && yt.home);
      root.toggleAttribute('data-ms-recs', on && yt.recommendations);
      root.toggleAttribute('data-ms-comments', on && yt.comments);
      root.style.setProperty(
        '--ms-home-msg',
        JSON.stringify(makeT(resolveLang(settings.language))('ytHomeMessage')),
      );

      // YouTube es una SPA: al pulsar un Short no hay petición nueva que la
      // regla de red pueda interceptar, así que redirigimos desde aquí.
      if (on && yt.shorts && /^\/shorts(\/|$)/.test(location.pathname)) {
        location.replace(`${browser.runtime.getURL('/blocked.html')}#${location.href}`);
      }
    };

    apply();
    settingsItem.watch((v) => {
      settings = withDefaults(v);
      apply();
    });
    blockingStateItem.watch((v) => {
      state = v ?? { active: false, source: null };
      apply();
    });
    document.addEventListener('yt-navigate-start', apply);
    document.addEventListener('yt-navigate-finish', apply);
    window.addEventListener('popstate', apply);
    ctx.setInterval(apply, 1000); // red de seguridad por si YouTube cambia sus eventos
  },
});
