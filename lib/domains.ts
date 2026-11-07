const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

/**
 * Convierte lo que escriba el usuario ("https://www.YouTube.com/watch?v=..." ,
 * "youtube.com", "m.youtube.com/") en un dominio limpio ("youtube.com").
 * Devuelve null si no parece un dominio válido.
 */
export function normalizeDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;

  value = value.replace(/^[a-z]+:\/\//, ''); // protocolo
  value = value.split(/[/?#]/)[0] ?? ''; // ruta, query, hash
  value = value.replace(/:\d+$/, ''); // puerto
  value = value.replace(/^www\./, '');
  value = value.replace(/\.$/, '');

  return DOMAIN_RE.test(value) ? value : null;
}

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
