import { useEffect, useMemo, useState } from 'react';
import type { WxtStorageItem } from 'wxt/utils/storage';
import { settingsItem, withDefaults, type Settings } from './storage';
import { makeT, resolveLang, type ResolvedLang, type T } from './i18n';

/** Lee un valor del storage y se mantiene sincronizado con sus cambios. */
export function useStorageItem<V>(item: WxtStorageItem<V, any>): V | undefined {
  const [value, setValue] = useState<V>();
  useEffect(() => {
    item.getValue().then(setValue);
    return item.watch((next) => setValue(next));
  }, [item]);
  return value;
}

/** Devuelve Date.now() actualizado cada `intervalMs`. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useSettings(): Settings | undefined {
  const raw = useStorageItem(settingsItem);
  return useMemo(() => (raw === undefined ? undefined : withDefaults(raw)), [raw]);
}

export function useT(): { t: T; lang: ResolvedLang } {
  const settings = useSettings();
  const lang = resolveLang(settings?.language);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return useMemo(() => ({ t: makeT(lang), lang }), [lang]);
}
