import { buildRules, domainRegex, SHORTS_REGEX } from '../lib/rules.ts';
import { normalizeDomain } from '../lib/domains.ts';
import { isScheduleActive, scheduleEnd } from '../lib/schedule.ts';
import {
  currentPasses,
  effectivePolicy,
  lastDays,
  minutesByDay,
  passDomainFor,
  pruneHistory,
  streak,
} from '../lib/policy.ts';

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
const bl = (blocklist: string[]) => ({ id: 'b', name: 'b', mode: 'blocklist' as const, blocklist, allowlist: [] });
const al = (allowlist: string[]) => ({ id: 'a', name: 'a', mode: 'allowlist' as const, blocklist: [], allowlist });
const none = { passes: [], blockShorts: false };
check('inactivo = 0 reglas', buildRules({ ...none, policy: effectivePolicy([]) }, 'x').length, 0);
check('lista negra = 2 reglas', buildRules({ ...none, policy: effectivePolicy([bl(['a.com', 'b.com'])]) }, 'x').length, 2);
const allow = buildRules({ policy: effectivePolicy([al(['work.com'])]), passes: [], blockShorts: true }, 'x');
check('lista blanca: prioridades', allow.map((r) => [r.action.type, r.priority]), [
  ['redirect', 1],
  ['allow', 2],
  ['redirect', 5],
]);
check('ids únicos', new Set(allow.map((r) => r.id)).size, allow.length);
check('solo shorts fuera del foco', buildRules({ policy: null, passes: [], blockShorts: true }, 'x').length, 1);
const withPass = buildRules({ policy: effectivePolicy([bl(['a.com'])]), passes: ['a.com'], blockShorts: true }, 'x');
check('pase gana al bloqueo, no a Shorts', withPass.map((r) => [r.action.type, r.priority]), [
  ['redirect', 3],
  ['allow', 4],
  ['redirect', 5],
]);
check('pase sin bloqueo = ignorado', buildRules({ policy: null, passes: ['a.com'], blockShorts: false }, 'x').length, 0);
check('redirección conserva la URL', (allow[0]!.action.redirect as any).regexSubstitution, 'x#\\0');

// Perfiles combinados: gana lo más estricto
check('dos listas negras se suman', effectivePolicy([bl(['a.com']), bl(['b.com', 'a.com'])]), {
  blockAll: false, allow: [], block: ['a.com', 'b.com'],
});
check('listas blancas se intersecan', effectivePolicy([al(['x.com', 'y.com']), al(['y.com', 'z.com'])]), {
  blockAll: true, allow: ['y.com'], block: [],
});
check('negra + blanca', effectivePolicy([al(['a.com', 'w.com']), bl(['a.com'])]), {
  blockAll: true, allow: ['a.com', 'w.com'], block: ['a.com'],
});
const pol = effectivePolicy([bl(['youtube.com'])])!;
check('pase al dominio bloqueado', passDomainFor('m.youtube.com', pol), 'youtube.com');
check('pase en lista blanca = host', passDomainFor('www.news.com', effectivePolicy([al([])])!), 'news.com');

// Pases del día
const t0 = new Date('2026-11-09T10:00').getTime();
check('pases: mismo día', currentPasses({ day: '2026-11-09', used: 1, active: [{ domain: 'a.com', until: t0 + 1 }] }, t0), {
  day: '2026-11-09', used: 1, active: [{ domain: 'a.com', until: t0 + 1 }],
});
check('pases: nuevo día reinicia', currentPasses({ day: '2026-11-08', used: 2, active: [{ domain: 'a.com', until: t0 - 1 }] }, t0), {
  day: '2026-11-09', used: 0, active: [],
});

// Historial
check('reparto por días (cruza medianoche)', minutesByDay(new Date('2026-11-09T23:40').getTime(), new Date('2026-11-10T00:30').getTime()), {
  '2026-11-09': 20, '2026-11-10': 30,
});
const h = { '2026-11-07': { focus: 130, sessions: 2, blocked: 0 }, '2026-11-08': { focus: 120, sessions: 1, blocked: 0 } };
check('racha viva aunque hoy aún no', streak(h, 120, t0), 2);
check('racha cuenta hoy si se cumple', streak({ ...h, '2026-11-09': { focus: 125, sessions: 1, blocked: 0 } }, 120, t0), 3);
check('racha rota', streak({ '2026-11-07': { focus: 200, sessions: 1, blocked: 0 } }, 120, t0), 0);
check('últimos 7 días', lastDays(h, 7, t0).map((d) => d.key), [
  '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09',
]);
check('poda', Object.keys(pruneHistory({ '2020-01-01': h['2026-11-07'], ...h }, t0)), ['2026-11-07', '2026-11-08']);

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
