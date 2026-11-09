import {
  DEFAULT_PROFILE_ID,
  legacyAllowlistItem,
  legacyBlocklistItem,
  profilesItem,
  settingsItem,
  type BlockMode,
  type Profile,
} from './storage';

let migrating: Promise<Profile[]> | null = null;

/**
 * Devuelve los perfiles. La primera vez tras actualizar desde la v0.2 crea el
 * perfil «General» con las listas y el modo que ya tenías.
 */
export function loadProfiles(): Promise<Profile[]> {
  return profilesItem.getValue().then((profiles) => {
    if (profiles.length > 0) return profiles;
    migrating ??= (async () => {
      const raw = (await settingsItem.getValue()) as { mode?: BlockMode } | null;
      const general: Profile = {
        id: DEFAULT_PROFILE_ID,
        name: 'General',
        mode: raw?.mode === 'allowlist' ? 'allowlist' : 'blocklist',
        blocklist: await legacyBlocklistItem.getValue(),
        allowlist: await legacyAllowlistItem.getValue(),
      };
      await profilesItem.setValue([general]);
      return [general];
    })().finally(() => {
      migrating = null;
    });
    return migrating;
  });
}

/** El perfil con ese id, o el primero si ya no existe. */
export function resolveProfile(profiles: Profile[], id: string | undefined): Profile | undefined {
  return profiles.find((p) => p.id === id) ?? profiles[0];
}

/** ¿Se puede empezar una sesión con este perfil? (Lista negra vacía = no bloquea nada.) */
export const profileBlocksSomething = (p: Profile | undefined) =>
  !!p && (p.mode === 'allowlist' || p.blocklist.length > 0);
