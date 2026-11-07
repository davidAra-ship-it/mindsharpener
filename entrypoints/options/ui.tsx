import type { ReactNode } from 'react';

export function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">{title}</h2>
        {desc && <p className="text-sm text-muted">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-4 px-4 py-2.5 bg-panel ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${
          checked ? 'bg-edge' : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-paper transition-[left] ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  );
}

export function Select<V extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-4 px-4 py-2.5 bg-panel">
      <span className="text-sm">{label}</span>
      <select
        value={String(value)}
        disabled={disabled}
        onChange={(e) => {
          const opt = options.find((o) => String(o.value) === e.target.value);
          if (opt) onChange(opt.value);
        }}
        className="bg-ink border border-line rounded-md px-2 py-1 text-sm outline-none focus:border-edge disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Contenedor con bordes y separadores para filas de Toggle/Select. */
export function Group({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
      {children}
    </div>
  );
}

export const inputClass =
  'bg-panel border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-edge';
export const primaryBtn =
  'rounded-lg bg-edge text-ink font-semibold px-4 py-2 text-sm hover:bg-edge-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
export const ghostBtn =
  'rounded-lg border border-line px-4 py-2 text-sm hover:border-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
