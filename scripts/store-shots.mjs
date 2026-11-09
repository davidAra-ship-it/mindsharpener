// Genera las capturas de la Chrome Web Store en store/screenshots/<idioma>/.
//
// 1. npm run build
// 2. Abre un Brave/Chrome aparte, sin tocar tu perfil:
//    brave.exe --headless=new --remote-debugging-port=9333 --user-data-dir=<carpeta-temporal>
//      --load-extension=<ruta>/.output/chrome-mv3 --disable-extensions-except=<ruta>/.output/chrome-mv3
//      --allow-file-access-from-files about:blank
// 3. node scripts/store-shots.mjs store/screenshots <carpeta-temporal-para-intermedios>
//
// Usa datos de ejemplo: borra el almacenamiento de la extensión de ESE navegador.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , OUT, TMP] = process.argv;
const ver = await (await fetch('http://127.0.0.1:9333/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
};
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}, sessionId) =>
  new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evalIn = async (sid, expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid);
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
};

const { result: { targetInfos } } = await send('Target.getTargets');
const sw = targetInfos.find((t) => t.type === 'service_worker' && t.url.startsWith('chrome-extension://'));
const extId = new URL(sw.url).host;
const { result: { sessionId: S } } = await send('Target.attachToTarget', { targetId: sw.targetId, flatten: true });
const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
const { result: { sessionId: P } } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, P);

const viewport = (width, height, dpr = 1) =>
  send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false }, P);
const go = async (url, wait = 1800) => { await send('Page.navigate', { url }, P); await sleep(wait); };
const shot = async (file, clip) => {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!clip, ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }, P);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
};
const rectOf = (sel, index = 0, pad = 0) =>
  evalIn(P, `(() => { const r = document.querySelectorAll(${JSON.stringify(sel)})[${index}].getBoundingClientRect();
    return { x: r.x - ${pad}, y: r.y + scrollY - ${pad}, width: r.width + ${pad * 2}, height: r.height + ${pad * 2} }; })()`);

const TEXT = {
  es: {
    profiles: ['General', 'Estudio', 'Trabajo'],
    task: 'Terminar el trabajo de fin de grado',
    popup: ['Empieza a concentrarte en un segundo', 'Alt+Mayús+F, escribe tu tarea y pulsa Enter. Las webs que te distraen quedan bloqueadas hasta que acabes.'],
    progress: ['Mira cómo crece tu foco', 'Objetivo diario, racha y gráfica de 7 o 30 días. Solo se guardan totales, nunca qué webs visitas.'],
    profilesShot: ['Un perfil para cada actividad', 'Para estudiar bloqueas unas webs; para trabajar, otras. O permite solo las que necesitas.'],
    pass: ['¿De verdad lo necesitas?', 'Pide un pase de 5 minutos, pero tendrás que ganártelo. Al acabar, la web vuelve a bloquearse sola.'],
    tile: ['Bloquea distracciones.', 'Recupera tu foco.'],
  },
  en: {
    profiles: ['General', 'Study', 'Work'],
    task: 'Finish the thesis draft',
    popup: ['Start focusing in a second', 'Alt+Shift+F, type your task and press Enter. Distracting sites stay blocked until you are done.'],
    progress: ['Watch your focus grow', 'Daily goal, streak and a 7 or 30-day chart. Only totals are stored, never the sites you visit.'],
    profilesShot: ['A profile for every activity', 'Block some sites while you study and others while you work. Or allow only the ones you need.'],
    pass: ['Do you really need it?', 'Ask for a 5-minute pass, but you will have to earn it. When it ends, the site is blocked again.'],
    tile: ['Block distractions.', 'Get your focus back.'],
  },
};

// Historial de ejemplo: 30 días alrededor del objetivo (2 h), determinista.
const history = {};
let seed = 7;
const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
for (let off = 1; off <= 30; off++) {
  const d = new Date(); d.setDate(d.getDate() - off);
  const weekend = [0, 6].includes(d.getDay());
  const focus = weekend && rand() < 0.6 ? 0 : Math.round((60 + rand() * 120) / 5) * 5;
  if (focus) history[d.toLocaleDateString('sv')] = { focus, sessions: Math.max(1, Math.round(focus / 45)), blocked: Math.round(rand() * 9) };
}
for (const off of [1, 2, 3, 4]) { // racha reciente
  const d = new Date(); d.setDate(d.getDate() - off);
  history[d.toLocaleDateString('sv')] = { focus: 125 + off * 10, sessions: 3, blocked: 4 };
}

function compose(file, [title, sub], imgPath, imgWidth) {
  const html = `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;width:1280px;height:800px;background:#141210;color:#f3eee7;font-family:'Segoe UI',system-ui,sans-serif;overflow:hidden}
    .wrap{display:flex;align-items:center;gap:64px;height:100%;padding:0 80px;box-sizing:border-box}
    .text{flex:1;min-width:0}
    .brand{font-size:20px;font-weight:600;letter-spacing:-.01em;margin-bottom:40px}.brand span{color:#f5b83d}
    h1{font-size:46px;line-height:1.1;margin:0 0 20px;font-weight:650;letter-spacing:-.02em}
    p{font-size:21px;line-height:1.5;color:#a39b91;margin:0}
    .shot{flex:none;width:${imgWidth}px;border:1px solid #2f2a25;border-radius:16px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.5)}
    .shot img{display:block;width:100%}
  </style><div class="wrap"><div class="text"><div class="brand">Mind<span>Sharpener</span></div><h1>${title}</h1><p>${sub}</p></div>
  <div class="shot"><img src="${pathToFileURL(imgPath)}"></div></div>`;
  fs.writeFileSync(file, html);
}

for (const lang of ['es', 'en']) {
  const T = TEXT[lang];
  const dir = path.join(OUT, lang);
  const now = Date.now();
  await evalIn(S, `chrome.storage.local.clear()`);
  await evalIn(S, `chrome.storage.local.set(${JSON.stringify({
    profiles: [
      { id: 'general', name: T.profiles[0], mode: 'blocklist', blocklist: ['youtube.com', 'instagram.com', 'tiktok.com', 'x.com', 'reddit.com', 'twitch.tv'], allowlist: [] },
      { id: 'study', name: T.profiles[1], mode: 'allowlist', blocklist: [], allowlist: ['wikipedia.org', 'google.com', 'notion.so', 'claude.ai'] },
      { id: 'work', name: T.profiles[2], mode: 'blocklist', blocklist: ['youtube.com', 'reddit.com', 'netflix.com'], allowlist: [] },
    ],
    schedules: [{ id: 's1', name: lang === 'es' ? 'Mañanas' : 'Mornings', days: [1, 2, 3, 4, 5], start: '09:00', end: '13:00', enabled: true, profileId: 'work' }],
    settings: { friction: 'phrase', waitSeconds: 30, language: lang, dailyGoalMinutes: 120, lastProfileId: 'general', pass: { minutes: 5, perDay: 2 },
      pomodoro: { enabled: true, breakMinutes: 5, longBreakMinutes: 15, longBreakEvery: 4, autoStartFocus: false },
      youtube: { shorts: true, home: true, recommendations: true, comments: false, always: true } },
    history,
    stats: { focusMinutes: 3125, sessionsCompleted: 71, blockedAttempts: 214 },
    session: { kind: 'focus', startedAt: now - 22 * 60000 - 17000, endsAt: now + 27 * 60000 + 43000, task: T.task, cycle: 1, focusMinutes: 50, profileId: 'general' },
  })})`);
  await sleep(1500);

  // 1. Página de foco, tal cual.
  await viewport(1280, 800);
  await go('https://www.youtube.com/', 3000);
  await shot(path.join(dir, '1-focus-page.png'));

  // 5. Pase temporal (con la frase empezada).
  await evalIn(P, `[...document.querySelectorAll('button')].find(b => /min$/.test(b.textContent.trim()) && b.className.includes('underline')).click()`);
  await sleep(400);
  await evalIn(P, `(() => { const i = document.querySelector('input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ${JSON.stringify(lang === 'es' ? 'Elijo distraerme en lugar' : 'I choose distraction')}); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(300);
  await shot(path.join(dir, '5-pass.png'));

  // 2. Popup en reposo (sin sesión) con los perfiles.
  await evalIn(S, `chrome.storage.local.set({ session: null })`);
  await viewport(320, 600, 2);
  await go(`chrome-extension://${extId}/popup.html`);
  const popupH = await evalIn(P, `document.body.firstElementChild.firstElementChild.getBoundingClientRect().height`);
  const popupRaw = path.join(TMP, `${lang}-popup.png`);
  await shot(popupRaw, { x: 0, y: 0, width: 320, height: Math.ceil(popupH) });

  // 3 y 4. Ajustes: progreso y perfiles.
  await evalIn(S, `chrome.storage.local.set({ session: ${JSON.stringify({ kind: 'focus', startedAt: now - 30 * 60000, endsAt: now + 20 * 60000, task: T.task, cycle: 1, focusMinutes: 50, profileId: 'general' })} })`);
  await viewport(760, 2600, 2);
  await go(`chrome-extension://${extId}/options.html`, 2200);
  await evalIn(P, `[...document.querySelectorAll('button[aria-pressed]')].find(b => b.textContent.includes('30')).click()`);
  await sleep(400);
  const progressRaw = path.join(TMP, `${lang}-progress.png`);
  await shot(progressRaw, await rectOf('section', 0, 16));
  // Perfil «Estudio» (lista blanca) seleccionado.
  await evalIn(P, `[...document.querySelectorAll('section')[1].querySelectorAll('button[aria-pressed]')][1].click()`);
  await sleep(400);
  const profilesRaw = path.join(TMP, `${lang}-profiles.png`);
  const pr = await rectOf('section', 1, 16);
  await shot(profilesRaw, { ...pr, height: Math.min(pr.height, 760) });

  // Composiciones 1280x800.
  await viewport(1280, 800, 1);
  for (const [name, text, img, w] of [
    ['2-popup', T.popup, popupRaw, 340],
    ['3-progress', T.progress, progressRaw, 600],
    ['4-profiles', T.profilesShot, profilesRaw, 560],
  ]) {
    const html = path.join(TMP, `${lang}-${name}.html`);
    compose(html, text, img, w);
    await go(pathToFileURL(html).href, 900);
    await shot(path.join(dir, `${name}.png`));
  }

  // Imagen promocional pequeña 440x280.
  const tile = path.join(TMP, `${lang}-tile.html`);
  fs.writeFileSync(tile, `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;width:440px;height:280px;background:#141210;color:#f3eee7;font-family:'Segoe UI',system-ui,sans-serif;overflow:hidden}
    .w{height:100%;display:flex;flex-direction:column;justify-content:center;padding:0 40px;box-sizing:border-box;gap:14px;border-left:6px solid #f5b83d}
    .b{font-size:34px;font-weight:650;letter-spacing:-.02em}.b span{color:#f5b83d}
    p{margin:0;font-size:19px;line-height:1.35;color:#a39b91}
  </style><div class="w"><div class="b">Mind<span>Sharpener</span></div><p>${T.tile[0]}<br>${T.tile[1]}</p></div>`);
  await viewport(440, 280, 1);
  await go(pathToFileURL(tile).href, 600);
  await shot(path.join(dir, 'promo-small-440x280.png'));
  console.log(lang, 'ok');
}
ws.close();
process.exit(0);
