import { useState } from 'react';
import {
  ALLOW_PRESETS,
  BLOCK_PRESETS,
  profilesItem,
  schedulesItem,
  type BlockMode,
  type Profile,
  type Schedule,
} from '@/lib/storage';
import { normalizeDomain } from '@/lib/domains';
import { resolveProfile } from '@/lib/profiles';
import type { T } from '@/lib/i18n';
import { Section, ghostBtn, inputClass, primaryBtn } from './ui';

export function ProfilesSection({
  profiles,
  schedules,
  activeIds,
  t,
}: {
  profiles: Profile[];
  schedules: Schedule[];
  activeIds: string[];
  t: T;
}) {
  const [selectedId, setSelectedId] = useState<string>();
  const [editing, setEditing] = useState<'new' | 'rename' | null>(null);
  const [name, setName] = useState('');

  const selected = resolveProfile(profiles, selectedId);
  if (!selected) return null;
  // Con el bloqueo activo, el perfil que se está aplicando solo se puede endurecer.
  const locked = activeIds.includes(selected.id);

  const update = (patch: Partial<Profile>) =>
    profilesItem.setValue(profiles.map((p) => (p.id === selected.id ? { ...p, ...patch } : p)));

  const submitName = () => {
    if (editing === 'new') {
      const profile: Profile = {
        id: crypto.randomUUID(),
        name: name.trim() || t('newProfile'),
        mode: 'blocklist',
        blocklist: [],
        allowlist: [],
      };
      profilesItem.setValue([...profiles, profile]);
      setSelectedId(profile.id);
    } else if (name.trim()) {
      update({ name: name.trim() });
    }
    setEditing(null);
    setName('');
  };

  const remove = async () => {
    const rest = profiles.filter((p) => p.id !== selected.id);
    const fallback = rest[0];
    if (!fallback) return;
    if (!confirm(t('deleteProfileConfirm', { name: selected.name, fallback: fallback.name }))) return;
    await schedulesItem.setValue(
      schedules.map((s) =>
        resolveProfile(profiles, s.profileId)?.id === selected.id ? { ...s, profileId: fallback.id } : s,
      ),
    );
    await profilesItem.setValue(rest);
    setSelectedId(fallback.id);
  };

  const modes: { value: BlockMode; title: string; desc: string }[] = [
    { value: 'blocklist', title: t('modeBlocklist'), desc: t('modeBlocklistDesc') },
    { value: 'allowlist', title: t('modeAllowlist'), desc: t('modeAllowlistDesc') },
  ];

  const tab = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm transition-colors flex items-center gap-2 ${
      active ? 'border-edge bg-edge/10 text-edge' : 'border-line bg-panel hover:border-muted'
    }`;

  return (
    <Section title={t('profilesTitle')} desc={t('profilesDesc')}>
      <div className="flex flex-wrap gap-2">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedId(p.id);
              setEditing(null);
            }}
            aria-pressed={p.id === selected.id}
            className={tab(p.id === selected.id)}
          >
            {p.name}
            {activeIds.includes(p.id) && (
              <span className="h-1.5 w-1.5 rounded-full bg-edge" title={t('inUse')} />
            )}
          </button>
        ))}
        {editing !== 'new' && (
          <button
            onClick={() => {
              setEditing('new');
              setName('');
            }}
            className="rounded-full border border-dashed border-line px-3.5 py-1.5 text-sm text-muted hover:text-paper hover:border-muted transition-colors"
          >
            + {t('newProfile')}
          </button>
        )}
      </div>

      {editing && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitName();
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('profileNamePlaceholder')}
            maxLength={30}
            className={`flex-1 min-w-0 ${inputClass}`}
          />
          <button className={primaryBtn}>{editing === 'new' ? t('add') : t('save')}</button>
          <button type="button" className={ghostBtn} onClick={() => setEditing(null)}>
            {t('cancel')}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-5 rounded-xl border border-line p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold truncate">{selected.name}</h3>
          <div className="flex gap-4 text-xs shrink-0">
            <button
              onClick={() => {
                setEditing('rename');
                setName(selected.name);
              }}
              className="text-muted hover:text-paper transition-colors"
            >
              {t('rename')}
            </button>
            <button
              onClick={remove}
              disabled={profiles.length === 1 || locked}
              className="text-muted hover:text-red-400 disabled:opacity-30 disabled:hover:text-muted disabled:cursor-not-allowed transition-colors"
            >
              {t('delete')}
            </button>
          </div>
        </div>

        {locked && (
          <p className="text-sm rounded-lg border border-edge/40 bg-edge/10 text-edge px-3 py-2">
            {t('profileActive')}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {modes.map((m) => (
            <button
              key={m.value}
              disabled={locked}
              onClick={() => update({ mode: m.value })}
              className={`text-left rounded-xl border px-4 py-3 transition-colors disabled:cursor-not-allowed ${
                selected.mode === m.value
                  ? 'border-edge bg-edge/10'
                  : 'border-line bg-panel hover:border-muted disabled:opacity-50'
              }`}
            >
              <div className={`text-sm font-medium ${selected.mode === m.value ? 'text-edge' : ''}`}>
                {m.title}
              </div>
              <div className="text-xs text-muted mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>

        {selected.mode === 'blocklist' ? (
          <DomainList
            key={`${selected.id}-block`}
            title={t('blockedSites')}
            domains={selected.blocklist}
            presets={BLOCK_PRESETS}
            // Bloquear más siempre se puede; quitar, solo sin bloqueo activo.
            canAdd
            canRemove={!locked}
            onChange={(v) => update({ blocklist: v })}
            t={t}
          />
        ) : (
          <DomainList
            key={`${selected.id}-allow`}
            title={t('allowedSites')}
            domains={selected.allowlist}
            presets={ALLOW_PRESETS}
            // En lista blanca es al revés: permitir más relaja el bloqueo.
            canAdd={!locked}
            canRemove
            onChange={(v) => update({ allowlist: v })}
            warning={selected.allowlist.length === 0 ? t('allowEmptyWarn') : undefined}
            t={t}
          />
        )}
      </div>
    </Section>
  );
}

function DomainList({
  title,
  domains,
  presets,
  canAdd,
  canRemove,
  onChange,
  warning,
  t,
}: {
  title: string;
  domains: string[];
  presets: { label: string; domains: string[] }[];
  canAdd: boolean;
  canRemove: boolean;
  onChange: (v: string[]) => void;
  warning?: string;
  t: T;
}) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const add = (values: string[]) => onChange([...new Set([...domains, ...values])]);

  return (
    <Section title={title}>
      {canAdd && (
        <>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const domain = normalizeDomain(input);
              if (!domain) {
                setError(t('invalidDomain'));
                return;
              }
              setError('');
              setInput('');
              add([domain]);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('addPlaceholder')}
              className={`flex-1 ${inputClass}`}
            />
            <button className={primaryBtn}>{t('add')}</button>
          </form>
          {error && <p className="text-sm text-red-400 -mt-2">{error}</p>}

          <div className="flex flex-wrap gap-2">
            {presets
              .filter((p) => p.domains.some((d) => !domains.includes(d)))
              .map((p) => (
                <button
                  key={p.label}
                  onClick={() => add(p.domains)}
                  className="text-xs rounded-full border border-line px-3 py-1 text-muted hover:text-paper hover:border-muted transition-colors"
                >
                  + {p.label}
                </button>
              ))}
          </div>
        </>
      )}

      {warning && <p className="text-sm text-edge">{warning}</p>}

      {domains.length === 0 ? (
        <p className="text-sm text-muted">{t('emptyList')}</p>
      ) : (
        <ul className="rounded-xl border border-line divide-y divide-line overflow-hidden">
          {[...domains].sort().map((d) => (
            <li key={d} className="flex items-center justify-between px-4 py-2.5 bg-panel">
              <span className="text-sm">{d}</span>
              <button
                onClick={() => onChange(domains.filter((x) => x !== d))}
                disabled={!canRemove}
                className="text-xs text-muted hover:text-red-400 disabled:opacity-30 disabled:hover:text-muted disabled:cursor-not-allowed transition-colors"
              >
                {t('remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">{t('subdomainsNote')}</p>
    </Section>
  );
}
