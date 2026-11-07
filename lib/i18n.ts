import type { Lang } from './storage';

const es = {
  // General
  settings: 'Ajustes',
  tagline: 'Código abierto y 100% local: tu configuración nunca sale de este navegador.',
  cancel: 'Cancelar',
  add: 'Añadir',
  remove: 'Quitar',
  delete: 'Eliminar',
  minutesShort: 'min',

  // Popup
  whatWorkOn: '¿En qué vas a trabajar?',
  taskPlaceholder: 'Ej.: terminar el informe',
  duration: 'Duración',
  customMinutes: 'Minutos personalizados',
  startFocus: 'Empezar sesión de foco',
  addSitesFirst: 'Añade alguna web en Ajustes para empezar.',
  inFocus: 'En foco',
  onBreak: 'Descanso',
  sessionN: 'Sesión {n}',
  endEarly: 'Terminar antes de tiempo',
  confirmEnd: '¿Seguro que quieres terminar la sesión antes de tiempo?',
  strictNoEnd: 'Modo estricto: esta sesión no se puede terminar antes de tiempo.',
  waitToEnd: 'Podrás terminar en {s} s. Respira y piénsalo.',
  waitDone: 'Ya puedes terminar la sesión, si de verdad quieres.',
  endSession: 'Terminar sesión',
  typePhrase: 'Escribe esta frase (sin pegar) para terminar:',
  phrase: 'Elijo distraerme en lugar de cumplir mi objetivo',
  skipBreak: 'Saltar descanso',
  stop: 'Terminar',
  scheduleActive: 'Bloqueo programado',
  scheduleUntil: '«{name}» hasta las {time}',
  footerSites: '{n} webs bloqueadas durante el foco',
  footerSitesOne: '1 web bloqueada durante el foco',
  footerAllow: 'Lista blanca: {n} webs permitidas',

  // Ajustes: modo y listas
  modeTitle: 'Modo de bloqueo',
  modeBlocklist: 'Lista negra',
  modeBlocklistDesc: 'Bloquea solo las webs de tu lista.',
  modeAllowlist: 'Lista blanca',
  modeAllowlistDesc: 'Bloquea todo excepto las webs permitidas. Ideal para trabajo profundo.',
  blockedSites: 'Webs bloqueadas',
  allowedSites: 'Webs permitidas',
  lockedNotice:
    'El bloqueo está activo: puedes endurecer las reglas, pero no relajarlas hasta que termine.',
  addPlaceholder: 'youtube.com o pega una URL',
  invalidDomain: 'Eso no parece un dominio válido (ej.: youtube.com).',
  emptyList: 'Todavía no hay webs en la lista.',
  subdomainsNote:
    'Un dominio incluye sus subdominios (youtube.com → m.youtube.com, music.youtube.com…).',
  allowEmptyWarn: 'La lista está vacía: durante el foco se bloqueará cualquier web.',

  // Ajustes: horarios
  schedulesTitle: 'Horarios',
  schedulesDesc: 'El bloqueo se activa solo en estas franjas, sin tener que empezar una sesión.',
  scheduleName: 'Nombre',
  scheduleNamePlaceholder: 'Trabajo',
  from: 'Desde',
  to: 'Hasta',
  addSchedule: 'Añadir horario',
  noSchedules: 'Todavía no hay horarios.',
  scheduleInvalid: 'Elige al menos un día y horas de inicio y fin distintas.',
  activeNow: 'Activo ahora',
  overnight: '(día siguiente)',
  enabledLabel: 'Activado',
  days: 'D,L,M,X,J,V,S',

  // Ajustes: YouTube
  ytTitle: 'YouTube sin distracciones',
  ytDesc:
    'Si YouTube no está bloqueado del todo, oculta sus partes más adictivas durante el foco.',
  ytFullyBlocked:
    'YouTube está en tu lista negra, así que durante el foco se bloquea entero. Estas opciones se aplican fuera del foco si activas «Aplicar siempre».',
  ytShorts: 'Bloquear Shorts',
  ytHome: 'Ocultar la página de inicio',
  ytRecs: 'Ocultar vídeos recomendados',
  ytComments: 'Ocultar comentarios',
  ytAlways: 'Aplicar siempre, no solo durante el foco',
  ytHomeMessage: 'Busca solo lo que necesitas.',

  // Ajustes: Pomodoro
  pomoTitle: 'Pomodoro',
  pomoEnable: 'Encadenar un descanso al terminar cada sesión',
  pomoBreak: 'Descanso corto',
  pomoLong: 'Descanso largo',
  pomoEvery: 'Descanso largo cada',
  pomoSessions: '{n} sesiones',
  pomoAutoFocus: 'Empezar la siguiente sesión al acabar el descanso',

  // Ajustes: fricción
  frictionTitle: 'Terminar antes de tiempo',
  frictionDesc: 'Cuánto cuesta abandonar una sesión de foco.',
  f_none: 'Confirmar',
  f_noneDesc: 'Un simple aviso.',
  f_wait: 'Esperar',
  f_waitDesc: 'Una cuenta atrás antes de poder terminar.',
  f_phrase: 'Escribir una frase',
  f_phraseDesc: 'Tienes que teclear, sin pegar, una frase incómoda.',
  f_locked: 'Estricto',
  f_lockedDesc:
    'Imposible terminar antes de tiempo (solo desactivando la extensión). Úsalo con cuidado.',
  waitSeconds: 'Tiempo de espera',
  seconds: '{n} s',

  // Ajustes: idioma
  languageTitle: 'Idioma',
  langAuto: 'Automático (navegador)',

  // Ajustes: estadísticas y copia
  statsTitle: 'Tus estadísticas',
  statFocus: 'Tiempo en foco',
  statSessions: 'Sesiones completadas',
  statBlocked: 'Distracciones evitadas',
  backupTitle: 'Copia de seguridad',
  backupDesc:
    'No hay cuentas ni servidores. Para llevar tu configuración a otro navegador, expórtala e impórtala allí.',
  export: 'Exportar',
  import: 'Importar',
  imported: 'Configuración importada.',
  importedLocked: 'Bloqueo activo: solo se han añadido las webs bloqueadas.',
  importError: 'No se pudo leer el archivo.',

  // Página de bloqueo
  bInFocus: 'Estás en foco',
  bScheduled: 'Bloqueo programado',
  bShorts: 'Shorts bloqueados',
  bShortsTitle: 'Los Shorts están diseñados para que no pares.',
  canWait: 'puede esperar.',
  siteCanWait: 'Esta web puede esperar.',
  rightNow: 'Ahora toca:',
  backToWork: 'Volver al trabajo',
  bDone: 'Bloqueo terminado',
  bGoodJob: 'Buen trabajo.',
  bDoneDesc: 'El bloqueo ha terminado. Ya puedes continuar.',
  goTo: 'Ir a {host}',
  theSite: 'la web',
  embedded: 'Contenido bloqueado por MindSharpener',
  q1: 'Lo que haces ahora mismo es lo que construye tu semana.',
  q2: 'Una distracción de 2 minutos cuesta 20 de concentración.',
  q3: 'El aburrimiento es el precio de entrada al trabajo profundo.',
  q4: 'No necesitas motivación, necesitas menos interrupciones.',
  q5: 'Tu atención es lo más valioso que tienes. No la regales.',
  q6: 'Termina esto primero. El vídeo seguirá ahí después.',

  // Notificaciones
  nFocusDone: '¡Sesión completada!',
  nFocusDoneBody: 'Buen trabajo. Tus webs vuelven a estar disponibles.',
  nBreakStart: 'Buen trabajo. Tómate {n} min de descanso.',
  nBreakDone: 'Descanso terminado',
  nBreakDoneBody: 'Cuando quieras, empieza la siguiente sesión.',
  nNextStarted: 'Empieza la sesión {n}. ¡A por ello!',
};

export type Key = keyof typeof es;

const en: Record<Key, string> = {
  settings: 'Settings',
  tagline: 'Open source and 100% local: your settings never leave this browser.',
  cancel: 'Cancel',
  add: 'Add',
  remove: 'Remove',
  delete: 'Delete',
  minutesShort: 'min',

  whatWorkOn: 'What are you working on?',
  taskPlaceholder: 'e.g. finish the report',
  duration: 'Duration',
  customMinutes: 'Custom minutes',
  startFocus: 'Start focus session',
  addSitesFirst: 'Add some sites in Settings to get started.',
  inFocus: 'Focused',
  onBreak: 'Break',
  sessionN: 'Session {n}',
  endEarly: 'End early',
  confirmEnd: 'Are you sure you want to end the session early?',
  strictNoEnd: "Strict mode: this session can't be ended early.",
  waitToEnd: 'You can end it in {s}s. Take a breath and think it over.',
  waitDone: 'You can end the session now, if you really want to.',
  endSession: 'End session',
  typePhrase: 'Type this phrase (no pasting) to end:',
  phrase: 'I choose distraction over my goal',
  skipBreak: 'Skip break',
  stop: 'Stop',
  scheduleActive: 'Scheduled block',
  scheduleUntil: '"{name}" until {time}',
  footerSites: '{n} sites blocked while focused',
  footerSitesOne: '1 site blocked while focused',
  footerAllow: 'Allowlist: {n} sites allowed',

  modeTitle: 'Blocking mode',
  modeBlocklist: 'Blocklist',
  modeBlocklistDesc: 'Block only the sites on your list.',
  modeAllowlist: 'Allowlist',
  modeAllowlistDesc: 'Block everything except allowed sites. Ideal for deep work.',
  blockedSites: 'Blocked sites',
  allowedSites: 'Allowed sites',
  lockedNotice: 'Blocking is active: you can tighten the rules, but not loosen them until it ends.',
  addPlaceholder: 'youtube.com or paste a URL',
  invalidDomain: "That doesn't look like a valid domain (e.g. youtube.com).",
  emptyList: 'No sites on the list yet.',
  subdomainsNote: 'A domain includes its subdomains (youtube.com → m.youtube.com, music.youtube.com…).',
  allowEmptyWarn: 'The list is empty: every site will be blocked while focused.',

  schedulesTitle: 'Schedules',
  schedulesDesc: 'Blocking turns on automatically during these times, no session needed.',
  scheduleName: 'Name',
  scheduleNamePlaceholder: 'Work',
  from: 'From',
  to: 'To',
  addSchedule: 'Add schedule',
  noSchedules: 'No schedules yet.',
  scheduleInvalid: 'Pick at least one day and different start and end times.',
  activeNow: 'Active now',
  overnight: '(next day)',
  enabledLabel: 'Enabled',
  days: 'Su,Mo,Tu,We,Th,Fr,Sa',

  ytTitle: 'Distraction-free YouTube',
  ytDesc: "If YouTube isn't fully blocked, hide its most addictive parts while you focus.",
  ytFullyBlocked:
    'YouTube is on your blocklist, so it is fully blocked while you focus. These options apply outside focus if you turn on "Always apply".',
  ytShorts: 'Block Shorts',
  ytHome: 'Hide the home feed',
  ytRecs: 'Hide recommended videos',
  ytComments: 'Hide comments',
  ytAlways: 'Always apply, not just while focused',
  ytHomeMessage: 'Search only for what you need.',

  pomoTitle: 'Pomodoro',
  pomoEnable: 'Start a break after each session',
  pomoBreak: 'Short break',
  pomoLong: 'Long break',
  pomoEvery: 'Long break every',
  pomoSessions: '{n} sessions',
  pomoAutoFocus: 'Start the next session when the break ends',

  frictionTitle: 'Ending early',
  frictionDesc: 'How hard it is to quit a focus session.',
  f_none: 'Confirm',
  f_noneDesc: 'A simple prompt.',
  f_wait: 'Wait',
  f_waitDesc: 'A countdown before you can end it.',
  f_phrase: 'Type a phrase',
  f_phraseDesc: 'You have to type, without pasting, an uncomfortable phrase.',
  f_locked: 'Strict',
  f_lockedDesc: 'No way to end early (except disabling the extension). Use with care.',
  waitSeconds: 'Wait time',
  seconds: '{n}s',

  languageTitle: 'Language',
  langAuto: 'Automatic (browser)',

  statsTitle: 'Your stats',
  statFocus: 'Focus time',
  statSessions: 'Sessions completed',
  statBlocked: 'Distractions avoided',
  backupTitle: 'Backup',
  backupDesc:
    'No accounts or servers. To move your settings to another browser, export them and import them there.',
  export: 'Export',
  import: 'Import',
  imported: 'Settings imported.',
  importedLocked: 'Blocking is active: only blocked sites were added.',
  importError: "Couldn't read the file.",

  bInFocus: "You're focused",
  bScheduled: 'Scheduled block',
  bShorts: 'Shorts blocked',
  bShortsTitle: 'Shorts are designed so you never stop.',
  canWait: 'can wait.',
  siteCanWait: 'This site can wait.',
  rightNow: 'Right now:',
  backToWork: 'Back to work',
  bDone: 'Blocking over',
  bGoodJob: 'Nice work.',
  bDoneDesc: 'Blocking has ended. You can carry on.',
  goTo: 'Go to {host}',
  theSite: 'the site',
  embedded: 'Content blocked by MindSharpener',
  q1: 'What you do right now is what builds your week.',
  q2: 'A 2-minute distraction costs 20 minutes of focus.',
  q3: 'Boredom is the entry fee to deep work.',
  q4: "You don't need motivation, you need fewer interruptions.",
  q5: 'Your attention is the most valuable thing you have. Don’t give it away.',
  q6: 'Finish this first. The video will still be there later.',

  nFocusDone: 'Session complete!',
  nFocusDoneBody: 'Nice work. Your sites are available again.',
  nBreakStart: 'Nice work. Take a {n}-minute break.',
  nBreakDone: 'Break over',
  nBreakDoneBody: 'Start your next session whenever you are ready.',
  nNextStarted: 'Session {n} is starting. Go!',
};

const DICTS = { es, en } as const;
export type ResolvedLang = keyof typeof DICTS;
export type T = (key: Key, vars?: Record<string, string | number>) => string;

export function resolveLang(lang?: Lang): ResolvedLang {
  if (lang === 'es' || lang === 'en') return lang;
  const ui = globalThis.navigator?.language ?? 'en';
  return ui.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function makeT(lang: ResolvedLang): T {
  return (key, vars) => {
    let text = DICTS[lang][key];
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  };
}
