import { useEffect, useRef, useState } from 'react';
import { updateSettings, type DayStats, type FocusSession, type Settings, type Stats } from '@/lib/storage';
import { focusToday, formatMinutes } from '@/lib/session';
import { lastDays, streak } from '@/lib/policy';
import { useNow } from '@/lib/hooks';
import type { ResolvedLang, T } from '@/lib/i18n';
import { Group, Section, Select } from './ui';

const RANGES = [7, 30] as const;
type Range = (typeof RANGES)[number];

export function ProgressPanel({
  stats,
  history,
  session,
  settings,
  lang,
  t,
}: {
  stats: Stats;
  history: Record<string, DayStats>;
  session: FocusSession | null;
  settings: Settings;
  lang: ResolvedLang;
  t: T;
}) {
  const now = useNow(30_000);
  const [range, setRange] = useState<Range>(7);
  const goal = settings.dailyGoalMinutes;

  const today = focusToday(history, session, now);
  const days = lastDays(history, range, now).map((d, i, all) =>
    // El día de hoy incluye la sesión en curso.
    i === all.length - 1 ? { ...d, stats: { ...d.stats, focus: today } } : d,
  );
  const week = lastDays(history, 7, now).reduce(
    (sum, d, i) => sum + (i === 6 ? today : d.stats.focus),
    0,
  );
  const streakDays = streak(history, goal, now);

  const tiles = [
    { label: t('today'), value: formatMinutes(today), sub: t('ofGoal', { goal: formatMinutes(goal) }) },
    {
      label: t('statStreak'),
      value: streakDays === 1 ? t('streakDay') : t('streakDays', { n: streakDays }),
    },
    { label: t('lastNDays', { n: 7 }), value: formatMinutes(week) },
    { label: t('statFocus'), value: formatMinutes(stats.focusMinutes) },
    { label: t('statSessions'), value: String(stats.sessionsCompleted) },
    { label: t('statBlocked'), value: String(stats.blockedAttempts) },
  ];

  const hasData = days.some((d) => d.stats.focus > 0);

  return (
    <Section title={t('statsTitle')} desc={t('statsPrivacy')}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map((it) => (
          <div key={it.label} className="rounded-xl border border-line bg-panel px-4 py-3">
            <div className="text-2xl font-semibold tabular">
              {it.value}
              {it.sub && <span className="text-xs font-normal text-muted ml-1.5">{it.sub}</span>}
            </div>
            <div className="text-xs text-muted mt-0.5">{it.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-panel p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h3 className="text-sm font-medium">{t('chartTitle')}</h3>
            {goal > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <svg width="16" height="2" aria-hidden="true">
                  <line x1="0" x2="16" y1="1" y2="1" className="stroke-muted" strokeDasharray="4 3" />
                </svg>
                {t('goalLine', { goal: formatMinutes(goal) })}
              </span>
            )}
          </div>
          <div className="flex rounded-lg border border-line overflow-hidden text-xs" role="group">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={`px-3 py-1 whitespace-nowrap transition-colors ${
                  range === r ? 'bg-edge/15 text-edge' : 'text-muted hover:text-paper'
                }`}
              >
                {t('lastNDays', { n: r })}
              </button>
            ))}
          </div>
        </div>
        {hasData ? (
          <FocusChart days={days} goal={goal} lang={lang} t={t} />
        ) : (
          <p className="text-sm text-muted py-10 text-center">{t('noHistory')}</p>
        )}
        {hasData && (
          <details className="text-xs text-muted">
            <summary className="cursor-pointer hover:text-paper w-fit">{t('chartTable')}</summary>
            <table className="mt-2 w-full tabular">
              <thead>
                <tr className="text-left">
                  <th className="font-normal py-1">{t('date')}</th>
                  <th className="font-normal py-1 text-right">{t('statFocus')}</th>
                  <th className="font-normal py-1 text-right">{t('statSessions')}</th>
                </tr>
              </thead>
              <tbody>
                {[...days].reverse().map((d) => (
                  <tr key={d.key} className="border-t border-line text-paper">
                    <td className="py-1">
                      {d.date.toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-1 text-right">{formatMinutes(d.stats.focus)}</td>
                    <td className="py-1 text-right">{d.stats.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </div>

      <Group>
        <Select
          label={t('dailyGoal')}
          value={goal}
          options={[30, 60, 90, 120, 180, 240, 300, 360].map((m) => ({
            value: m,
            label: formatMinutes(m),
          }))}
          onChange={(v) => updateSettings({ dailyGoalMinutes: v })}
        />
      </Group>
    </Section>
  );
}

/** Escala del eje Y: un paso "redondo" que deje como mucho 4 líneas. */
function niceScale(max: number): { top: number; step: number } {
  const step = [15, 30, 60, 120, 180, 240, 360].find((s) => max / s <= 4) ?? 480;
  return { top: Math.max(step, Math.ceil(max / step) * step), step };
}

/** Barra con las esquinas de arriba redondeadas (4px) y apoyada en la base. */
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function FocusChart({
  days,
  goal,
  lang,
  t,
}: {
  days: { key: string; date: Date; stats: DayStats }[];
  goal: number;
  lang: ResolvedLang;
  t: T;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = 200;
  const pad = { top: 16, right: 4, bottom: 22, left: 44 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(goal, ...days.map((d) => d.stats.focus));
  const { top, step } = niceScale(max);
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;
  const band = innerW / days.length;
  const barW = Math.max(2, Math.min(36, band * (days.length > 10 ? 0.7 : 0.55)));
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
  const last = days.length - 1;

  const xLabel = (d: Date, i: number) => {
    if (i === last) return t('today');
    if (days.length <= 10) return d.toLocaleDateString(lang, { weekday: 'short' }).replace('.', '');
    return (last - i) % 5 === 0 ? String(d.getDate()) : '';
  };

  const hovered = hover !== null ? days[hover] : null;

  return (
    <div ref={wrap} className="relative" onMouseLeave={() => setHover(null)}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={t('chartAria', { n: days.length })}
        className="block overflow-visible"
      >
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(v)}
              y2={y(v)}
              className="stroke-line"
              strokeWidth={1}
            />
            <text
              x={pad.left - 8}
              y={y(v)}
              dy="0.32em"
              textAnchor="end"
              className="fill-muted tabular"
              fontSize={11}
            >
              {formatMinutes(v)}
            </text>
          </g>
        ))}

        {days.map((d, i) => {
          const v = d.stats.focus;
          const h = (v / top) * innerH;
          const x = pad.left + band * i + (band - barW) / 2;
          return (
            <g key={d.key}>
              {v > 0 && (
                <path
                  d={barPath(x, y(v), barW, h)}
                  className={hover === i ? 'fill-edge-strong' : 'fill-edge'}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
              )}
              <text
                x={pad.left + band * i + band / 2}
                y={height - 6}
                textAnchor="middle"
                className={i === last ? 'fill-paper' : 'fill-muted'}
                fontSize={11}
              >
                {xLabel(d.date, i)}
              </text>
              {/* Zona sensible: toda la columna, más grande que la barra. */}
              <rect
                x={pad.left + band * i}
                y={pad.top}
                width={band}
                height={innerH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${d.date.toLocaleDateString(lang)}: ${formatMinutes(v)}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="outline-none"
              />
            </g>
          );
        })}

        {goal > 0 && (
          <g pointerEvents="none">
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(goal)}
              y2={y(goal)}
              className="stroke-muted"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          </g>
        )}
      </svg>

      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-ink px-2.5 py-1.5 text-xs shadow-lg whitespace-nowrap"
          style={{
            left: Math.min(
              Math.max(pad.left + band * hover + band / 2, 70),
              width - 70,
            ),
            top: y(hovered.stats.focus) - 8,
          }}
        >
          <div className="text-muted">
            {hovered.date.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
          <div className="font-semibold tabular">
            {formatMinutes(hovered.stats.focus)}
            <span className="font-normal text-muted">
              {' · '}
              {hovered.stats.sessions === 1
                ? t('chartSessionsOne')
                : t('chartSessions', { n: hovered.stats.sessions })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
