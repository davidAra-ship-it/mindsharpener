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
html[data-ms-shorts] yt-tab-shape[tab-title="Shorts"],
html[data-ms-shorts] [data-ms-hide-shorts] {
  display: none !important;
}

html[data-ms-home] ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,
html[data-ms-home][data-ms-at-home] ytd-browse:not([hidden]) ytd-two-column-browse-results-renderer {
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

// Red de seguridad para cuando YouTube renombra sus etiquetas: en vez de
// fiarnos solo de los selectores de arriba, buscamos los enlaces a /shorts/ y
// ocultamos la tarjeta (o el estante entero) que los contiene.
const SHORTS_LINK = 'a[href^="/shorts/"], a[href*="youtube.com/shorts/"]';
const VIDEO_LINK = `${SHORTS_LINK}, a[href^="/watch"], a[href*="youtube.com/watch"]`;
const CARD = [
  'ytd-rich-item-renderer',
  'ytd-video-renderer',
  'ytd-grid-video-renderer',
  'ytd-compact-video-renderer',
  'ytd-reel-item-renderer',
  'yt-lockup-view-model',
  'ytm-shorts-lockup-view-model',
  'ytm-shorts-lockup-view-model-v2',
].join(',');
const SHELF = [
  'ytd-rich-section-renderer',
  'ytd-rich-shelf-renderer',
  'ytd-reel-shelf-renderer',
  'grid-shelf-view-model',
  'ytd-shelf-renderer',
  'yt-horizontal-list-renderer',
].join(',');
const MARK = 'data-ms-hide-shorts';

/** El contenedor más externo de tipo estante cuyos vídeos son todos Shorts. */
function shortsShelf(el: Element, cache: Map<Element, boolean>): Element | null {
  const allShorts = (s: Element) => {
    let v = cache.get(s);
    if (v === undefined) {
      v = s.querySelectorAll(VIDEO_LINK).length === s.querySelectorAll(SHORTS_LINK).length;
      cache.set(s, v);
    }
    return v;
  };
  let found: Element | null = null;
  for (let s = el.closest(SHELF); s && allShorts(s); s = s.parentElement?.closest(SHELF) ?? null) {
    found = s;
  }
  return found;
}

/** Elemento a ocultar para un enlace a un Short. */
function hideTarget(link: Element, cache: Map<Element, boolean>): Element | null {
  if (link.closest('ytd-guide-renderer, ytd-mini-guide-renderer, #masthead')) {
    return link.closest('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer');
  }
  // Enlaces sueltos dentro de texto (descripciones, comentarios): no tocar.
  if (link.closest('#description, ytd-comments, yt-attributed-string, yt-formatted-string')) {
    return null;
  }
  const shelf = shortsShelf(link, cache);
  if (shelf) return shelf;
  const card = link.closest(CARD);
  if (card) return card;
  // Etiqueta desconocida: subimos hasta el elemento de lista (hijo directo de
  // #contents / #items), que es como YouTube maqueta sus feeds.
  for (let e: Element | null = link; e && e !== document.body; e = e.parentElement) {
    const id = e.parentElement?.id;
    if (id === 'contents' || id === 'items') return e;
  }
  return null;
}

function scanShorts() {
  const targets = new Set<Element>();
  const cache = new Map<Element, boolean>();
  for (const link of document.querySelectorAll(SHORTS_LINK)) {
    const t = hideTarget(link, cache);
    if (t) targets.add(t);
  }
  // Chip «Shorts» de los filtros de búsqueda / portada.
  for (const chip of document.querySelectorAll('yt-chip-cloud-chip-renderer, chip-shape')) {
    if (chip.textContent?.trim() === 'Shorts') targets.add(chip);
  }
  // YouTube reutiliza los elementos con datos nuevos: desmarcamos los que ya
  // no contienen un Short.
  for (const el of document.querySelectorAll(`[${MARK}]`)) {
    if (!targets.has(el)) el.removeAttribute(MARK);
  }
  for (const el of targets) el.setAttribute(MARK, '');
}

function clearShorts() {
  for (const el of document.querySelectorAll(`[${MARK}]`)) el.removeAttribute(MARK);
}

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

    let scanQueued = false;
    const queueScan = () => {
      if (scanQueued) return;
      scanQueued = true;
      ctx.setTimeout(() => {
        scanQueued = false;
        if (root.hasAttribute('data-ms-shorts')) scanShorts();
      }, 200);
    };
    new MutationObserver(queueScan).observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });

    const apply = () => {
      const yt = settings.youtube;
      const on = state.active || yt.always;
      const hideShorts = on && yt.shorts;
      root.toggleAttribute('data-ms-shorts', hideShorts);
      root.toggleAttribute('data-ms-at-home', location.pathname === '/');
      if (hideShorts) queueScan();
      else clearShorts();
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
