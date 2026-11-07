import { storage } from '#imports';

// Todo se guarda en local (chrome.storage.local). Nada sale de tu navegador.

export type Lang = 'auto' | 'es' | 'en';
export type BlockMode = 'blocklist' | 'allowlist';
/** De menos a más estricta. */
export const FRICTIONS = ['none', 'wait', 'phrase', 'locked'] as const;
export type Friction = (typeof FRICTIONS)[number];

export interface FocusSession {
  kind: 'focus' | 'break';
  startedAt: number; // epoch ms
  endsAt: number; // epoch ms
  task: string;
  /** Nº de sesión de foco dentro de la tanda Pomodoro (1, 2, 3…). */
  cycle: number;
  /** Duración de las sesiones de foco de esta tanda (para encadenar la siguiente). */
  focusMinutes: number;
}

export interface Schedule {
  id: string;
  name: string;
  /** 0 = domingo … 6 = sábado (como Date.getDay()). */
  days: number[];
  start: string; // "HH:MM"
  end: string; // "HH:MM" (si es menor que start, termina al día siguiente)
  enabled: boolean;
}

export interface YoutubeSettings {
  shorts: boolean;
  home: boolean;
  recommendations: boolean;
  comments: boolean;
  /** Aplicar también fuera del foco. */
  always: boolean;
}

export interface Settings {
  mode: BlockMode;
  friction: Friction;
  waitSeconds: number;
  pomodoro: {
    enabled: boolean;
    breakMinutes: number;
    longBreakMinutes: number;
    longBreakEvery: number;
    autoStartFocus: boolean;
  };
  youtube: YoutubeSettings;
  language: Lang;
}

/** Estado calculado por el background: ¿está el bloqueo activo ahora y por qué? */
export interface BlockingState {
  active: boolean;
  source: 'session' | 'schedule' | null;
  scheduleName?: string;
  until?: number;
}

export interface Stats {
  blockedAttempts: number;
  sessionsCompleted: number;
  focusMinutes: number;
}

export const DEFAULT_BLOCKLIST = [
  'youtube.com',
  'instagram.com',
  'tiktok.com',
  'x.com',
  'twitter.com',
  'reddit.com',
  'facebook.com',
];

export const DEFAULT_SETTINGS: Settings = {
  mode: 'blocklist',
  friction: 'phrase',
  waitSeconds: 30,
  pomodoro: {
    enabled: false,
    breakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    autoStartFocus: false,
  },
  youtube: {
    shorts: true,
    home: true,
    recommendations: true,
    comments: false,
    always: false,
  },
  language: 'auto',
};

export const BLOCK_PRESETS: { label: string; domains: string[] }[] = [
  { label: 'YouTube', domains: ['youtube.com'] },
  { label: 'Instagram', domains: ['instagram.com'] },
  { label: 'TikTok', domains: ['tiktok.com'] },
  { label: 'X / Twitter', domains: ['x.com', 'twitter.com'] },
  { label: 'Reddit', domains: ['reddit.com'] },
  { label: 'Facebook', domains: ['facebook.com'] },
  { label: 'Twitch', domains: ['twitch.tv'] },
  { label: 'Netflix', domains: ['netflix.com'] },
  { label: 'Kick', domains: ['kick.com'] },
  { label: 'Pinterest', domains: ['pinterest.com'] },
];

export const ALLOW_PRESETS: { label: string; domains: string[] }[] = [
  { label: 'Google', domains: ['google.com'] },
  { label: 'GitHub', domains: ['github.com'] },
  { label: 'Stack Overflow', domains: ['stackoverflow.com'] },
  { label: 'Wikipedia', domains: ['wikipedia.org'] },
  { label: 'Notion', domains: ['notion.so'] },
  { label: 'Claude', domains: ['claude.ai'] },
  { label: 'ChatGPT', domains: ['chatgpt.com'] },
  { label: 'Figma', domains: ['figma.com'] },
  { label: 'Slack', domains: ['slack.com'] },
  { label: 'Microsoft 365', domains: ['office.com', 'microsoft.com'] },
];

export const blocklistItem = storage.defineItem<string[]>('local:blocklist', {
  fallback: DEFAULT_BLOCKLIST,
});

export const allowlistItem = storage.defineItem<string[]>('local:allowlist', {
  fallback: [],
});

export const schedulesItem = storage.defineItem<Schedule[]>('local:schedules', {
  fallback: [],
});

export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
});

export const sessionItem = storage.defineItem<FocusSession | null>('local:session', {
  fallback: null,
});

export const blockingStateItem = storage.defineItem<BlockingState>('local:blockingState', {
  fallback: { active: false, source: null },
});

export const statsItem = storage.defineItem<Stats>('local:stats', {
  fallback: { blockedAttempts: 0, sessionsCompleted: 0, focusMinutes: 0 },
});

/** Rellena con valores por defecto los ajustes que falten (p. ej. tras una actualización). */
export function withDefaults(s: Partial<Settings> | null | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    pomodoro: { ...DEFAULT_SETTINGS.pomodoro, ...s?.pomodoro },
    youtube: { ...DEFAULT_SETTINGS.youtube, ...s?.youtube },
  };
}

export async function getSettings(): Promise<Settings> {
  return withDefaults(await settingsItem.getValue());
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await settingsItem.setValue({ ...(await getSettings()), ...patch });
}
