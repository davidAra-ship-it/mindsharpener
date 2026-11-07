import type { Browser } from 'wxt/browser';
import type { BlockMode } from './storage';

type Rule = Browser.declarativeNetRequest.Rule;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Coincide con el dominio y sus subdominios, pero no con "notdomain.com" ni "domain.com.otro.com". */
export function domainRegex(domain: string): string {
  return `^https?://([^/?#]*\\.)?${escapeRegex(domain)}(:[0-9]+)?([/?#].*)?$`;
}

export const SHORTS_REGEX = '^https?://([^/?#]*\\.)?youtube\\.com/shorts([/?#].*)?$';

export interface RuleInput {
  /** Bloqueo completo activo (sesión de foco u horario). */
  full: boolean;
  mode: BlockMode;
  blocklist: string[];
  allowlist: string[];
  blockShorts: boolean;
}

/**
 * Traduce la configuración a reglas declarativeNetRequest. Las webs bloqueadas
 * se redirigen a la página de foco con la URL original tras el "#".
 *
 * Prioridades: 1 = bloqueo general, 2 = lista blanca (allow), 3 = Shorts
 * (gana incluso si YouTube está en la lista blanca).
 */
export function buildRules(input: RuleInput, blockedPageUrl: string): Rule[] {
  const redirect = {
    type: 'redirect',
    redirect: { regexSubstitution: `${blockedPageUrl}#\\0` },
  };
  const rules: Omit<Rule, 'id'>[] = [];

  if (input.full && input.mode === 'blocklist') {
    for (const domain of input.blocklist) {
      rules.push({
        priority: 1,
        action: redirect,
        condition: { regexFilter: domainRegex(domain), resourceTypes: ['main_frame', 'sub_frame'] },
      } as Omit<Rule, 'id'>);
    }
  }

  if (input.full && input.mode === 'allowlist') {
    rules.push({
      priority: 1,
      action: redirect,
      condition: { regexFilter: '^https?://.*$', resourceTypes: ['main_frame'] },
    } as Omit<Rule, 'id'>);
    if (input.allowlist.length > 0) {
      rules.push({
        priority: 2,
        action: { type: 'allow' },
        condition: { requestDomains: input.allowlist, resourceTypes: ['main_frame'] },
      } as Omit<Rule, 'id'>);
    }
  }

  if (input.blockShorts) {
    rules.push({
      priority: 3,
      action: redirect,
      condition: { regexFilter: SHORTS_REGEX, resourceTypes: ['main_frame'] },
    } as Omit<Rule, 'id'>);
  }

  return rules.map((r, i) => ({ id: i + 1, ...r })) as Rule[];
}
