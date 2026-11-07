import { useState } from 'react';
import { schedulesItem, type Schedule } from '@/lib/storage';
import { isScheduleActive, toMinutes } from '@/lib/schedule';
import type { T } from '@/lib/i18n';
import { useNow } from '@/lib/hooks';
import { Section, inputClass, primaryBtn } from './ui';

/** Lunes primero en la interfaz; los valores siguen Date.getDay(). */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function Schedules({
  schedules,
  locked,
  t,
}: {
  schedules: Schedule[];
  locked: boolean;
  t: T;
}) {
  const now = useNow(30_000);
  const dayNames = t('days').split(',');
  const save = (next: Schedule[]) => schedulesItem.setValue(next);

  return (
    <Section title={t('schedulesTitle')} desc={t('schedulesDesc')}>
      {schedules.length === 0 ? (
        <p className="text-sm text-muted">{t('noSchedules')}</p>
      ) : (
        <ul className="rounded-xl border border-line divide-y divide-line overflow-hidden">
          {schedules.map((s) => {
            const active = isScheduleActive(s, new Date(now));
            // Con el bloqueo activo, un horario encendido no se puede apagar ni borrar.
            const frozen = locked && s.enabled;
            return (
              <li key={s.id} className="flex items-center gap-4 px-4 py-3 bg-panel">
                <button
                  role="switch"
                  aria-checked={s.enabled}
                  aria-label={t('enabledLabel')}
                  disabled={frozen}
                  onClick={() =>
                    save(schedules.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)))
                  }
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    s.enabled ? 'bg-edge' : 'bg-line'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-paper transition-[left] ${
                      s.enabled ? 'left-[18px]' : 'left-0.5'
                    }`}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm flex items-center gap-2">
                    <span className="truncate">{s.name}</span>
                    {active && (
                      <span className="text-[10px] uppercase tracking-wider text-edge border border-edge/40 rounded px-1.5 py-0.5">
                        {t('activeNow')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted tabular mt-0.5">
                    {DAY_ORDER.filter((d) => s.days.includes(d))
                      .map((d) => dayNames[d])
                      .join(' ')}{' '}
                    · {s.start}–{s.end}
                    {toMinutes(s.end) < toMinutes(s.start) ? ` ${t('overnight')}` : ''}
                  </div>
                </div>
                <button
                  disabled={frozen}
                  onClick={() => save(schedules.filter((x) => x.id !== s.id))}
                  className="text-xs text-muted hover:text-red-400 disabled:opacity-30 disabled:hover:text-muted disabled:cursor-not-allowed transition-colors"
                >
                  {t('delete')}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <NewSchedule dayNames={dayNames} onAdd={(s) => save([...schedules, s])} t={t} />
    </Section>
  );
}

function NewSchedule({
  dayNames,
  onAdd,
  t,
}: {
  dayNames: string[];
  onAdd: (s: Schedule) => void;
  t: T;
}) {
  const [name, setName] = useState('');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('13:00');
  const [error, setError] = useState('');

  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-dashed border-line p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (days.length === 0 || !start || !end || start === end) {
          setError(t('scheduleInvalid'));
          return;
        }
        setError('');
        onAdd({
          id: crypto.randomUUID(),
          name: name.trim() || t('scheduleNamePlaceholder'),
          days: [...days].sort(),
          start,
          end,
          enabled: true,
        });
        setName('');
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`${t('scheduleName')}: ${t('scheduleNamePlaceholder')}`}
        maxLength={40}
        className={inputClass}
      />
      <div className="flex flex-wrap gap-1.5">
        {DAY_ORDER.map((d) => (
          <button
            type="button"
            key={d}
            onClick={() => toggleDay(d)}
            aria-pressed={days.includes(d)}
            className={`h-8 min-w-8 px-2 rounded-lg text-xs border transition-colors ${
              days.includes(d)
                ? 'border-edge bg-edge/10 text-edge'
                : 'border-line bg-panel text-muted hover:border-muted'
            }`}
          >
            {dayNames[d]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">{t('from')}</span>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">{t('to')}</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </label>
        <button className={`${primaryBtn} ml-auto`}>{t('addSchedule')}</button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
