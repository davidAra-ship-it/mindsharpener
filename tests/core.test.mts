import { buildRules, domainRegex, SHORTS_REGEX } from '../lib/rules.ts';
import { normalizeDomain } from '../lib/domains.ts';
import { isScheduleActive, scheduleEnd } from '../lib/schedule.ts';

let fail = 0;
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} -> ${JSON.stringify(got)}`);
};

// Dominios
check('url completa', normalizeDomain('https://www.YouTube.com/watch?v=abc'), 'youtube.com');
check('puerto', normalizeDomain('reddit.com:443'), 'reddit.com');
check('invalido', normalizeDomain('hola'), null);

// Regex de dominio
const re = new RegExp(domainRegex('youtube.com'), 'i');
for (const [url, want] of [
  ['https://www.youtube.com/watch?v=1', true],
  ['http://YOUTUBE.com:8080/', true],
  ['https://notyoutube.com/', false],
  ['https://youtube.com.evil.com/', false],
  ['https://google.com/?q=youtube.com', false],
] as const) check(`dominio ${url}`, re.test(url), want);

// Shorts
const sr = new RegExp(SHORTS_REGEX, 'i');
check('shorts', sr.test('https://www.youtube.com/shorts/abc'), true);
check('shorts sin barra', sr.test('https://youtube.com/shorts'), true);
check('video normal', sr.test('https://www.youtube.com/watch?v=shorts'), false);
check('canal "shortsfan"', sr.test('https://www.youtube.com/shortsfan'), false);

// Construcción de reglas
const base = { blocklist: ['a.com', 'b.com'], allowlist: ['work.com'], blockShorts: false };
check('inactivo = 0 reglas', buildRules({ ...base, full: false, mode: 'blocklist' }, 'x').length, 0);
check('lista negra = 2 reglas', buildRules({ ...base, full: true, mode: 'blocklist' }, 'x').length, 2);
const allow = buildRules({ ...base, full: true, mode: 'allowlist', blockShorts: true }, 'x');
check('lista blanca: prioridades', allow.map((r) => [r.action.type, r.priority]), [
  ['redirect', 1],
  ['allow', 2],
  ['redirect', 3],
]);
check('ids únicos', new Set(allow.map((r) => r.id)).size, allow.length);
check('solo shorts fuera del foco', buildRules({ ...base, full: false, mode: 'blocklist', blockShorts: true }, 'x').length, 1);

// Horarios (fechas locales). 2026-11-09 es lunes.
const work = { id: '1', name: 'w', days: [1, 2, 3, 4, 5], start: '09:00', end: '13:00', enabled: true };
const at = (d: string) => new Date(d);
check('lunes 10:00 activo', isScheduleActive(work, at('2026-11-09T10:00')), true);
check('lunes 13:00 inactivo', isScheduleActive(work, at('2026-11-09T13:00')), false);
check('lunes 08:59 inactivo', isScheduleActive(work, at('2026-11-09T08:59')), false);
check('domingo 10:00 inactivo', isScheduleActive(work, at('2026-11-08T10:00')), false);
check('desactivado', isScheduleActive({ ...work, enabled: false }, at('2026-11-09T10:00')), false);
check('fin hoy 13:00', new Date(scheduleEnd(work, at('2026-11-09T10:00'))).toString(), at('2026-11-09T13:00').toString());

const night = { ...work, days: [5], start: '22:00', end: '02:00' }; // viernes noche
check('viernes 23:00', isScheduleActive(night, at('2026-11-13T23:00')), true);
check('sábado 01:00 (sigue)', isScheduleActive(night, at('2026-11-14T01:00')), true);
check('sábado 03:00', isScheduleActive(night, at('2026-11-14T03:00')), false);
check('jueves 23:00', isScheduleActive(night, at('2026-11-12T23:00')), false);
check('fin noche = sábado 02:00', new Date(scheduleEnd(night, at('2026-11-13T23:00'))).toString(), at('2026-11-14T02:00').toString());

if (fail) throw new Error(`${fail} pruebas fallidas`);
console.log('\nTodo OK');
