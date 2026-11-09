import { useState } from 'react';
import type { Settings } from '@/lib/storage';
import type { T } from '@/lib/i18n';
import { useNow } from '@/lib/hooks';

const normalizePhrase = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export const ghostBtn =
  'rounded-lg border border-line py-2 text-sm text-muted hover:text-paper hover:border-muted transition-colors';

/**
 * Pide la fricción elegida en Ajustes (esperar o escribir una frase) antes de
 * dejar hacer algo que relaja el bloqueo. Con fricción «none» solo confirma.
 * El modo estricto lo gestiona quien lo usa (normalmente, ni se muestra).
 */
export function FrictionGate({
  settings,
  purpose,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  t,
}: {
  settings: Settings;
  purpose: 'end' | 'continue';
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
  t: T;
}) {
  const [openedAt] = useState(Date.now);
  const [typed, setTyped] = useState('');
  const now = useNow(250);
  const { friction, waitSeconds } = settings;
  const end = purpose === 'end';

  let canConfirm = true;
  let body: React.ReactNode = null;

  if (friction === 'wait') {
    const left = Math.max(0, waitSeconds - Math.floor((now - openedAt) / 1000));
    canConfirm = left === 0;
    body = (
      <p className="text-xs text-muted text-center">
        {canConfirm
          ? t(end ? 'waitDone' : 'waitDoneContinue')
          : t(end ? 'waitToEnd' : 'waitToContinue', { s: left })}
      </p>
    );
  } else if (friction === 'phrase') {
    const phrase = t('phrase');
    canConfirm = normalizePhrase(typed) === normalizePhrase(phrase);
    body = (
      <div className="flex flex-col gap-2 text-left">
        <p className="text-xs text-muted">{t(end ? 'typePhrase' : 'typePhraseContinue')}</p>
        <p className="text-sm select-none">“{phrase}”</p>
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          autoComplete="off"
          spellCheck={false}
          className="bg-panel border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-edge"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line p-3 w-full">
      {body}
      <div className="grid grid-cols-2 gap-2">
        <button className={ghostBtn} onClick={onCancel}>
          {t('cancel')}
        </button>
        <button disabled={!canConfirm} onClick={onConfirm} className={confirmClass}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
