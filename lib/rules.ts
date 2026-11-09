import type { Browser } from 'wxt/browser';
import type { Policy } from './policy';

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
  /** Bloqueo activo (sesión de foco u horario); null si no hay ninguno. */
  policy: Policy | null;
  /** Dominios con un pase temporal en vigor. */
  passes: string[];
  blockShorts: boolean;
}

/**
 * Traduce la configuración a reglas declarativeNetRequest. Las webs bloqueadas
 * se redirigen a la página de foco con la URL original tras el "#".
 *
 * Prioridades (gana la más alta):
 * 1 = bloquear todo (lista blanca)   2 = webs permitidas
 * 3 = webs de lista negra            4 = pases temporales
 * 5 = Shorts (ni la lista blanca ni un pase los desbloquean)
 */
export function buildRules(input: RuleInput, blockedPageUrl: string): Rule[] {
  const redirect = {
    type: 'redirect',
    redirect: { regexSubstitution: `${blockedPageUrl}#\\0` },
  };
  const rules: Omit<Rule, 'id'>[] = [];
  const { policy } = input;

  if (policy?.blockAll) {
    rules.push({
      priority: 1,
      action: redirect,
      condition: { regexFilter: '^https?://.*$', resourceTypes: ['main_frame'] },
    } as Omit<Rule, 'id'>);
    if (policy.allow.length > 0) {
      rules.push({
        priority: 2,
        action: { type: 'allow' },
        condition: { requestDomains: policy.allow, resourceTypes: ['main_frame'] },
      } as Omit<Rule, 'id'>);
    }
  }

  for (const domain of policy?.block ?? []) {
    rules.push({
      priority: 3,
      action: redirect,
      condition: { regexFilter: domainRegex(domain), resourceTypes: ['main_frame', 'sub_frame'] },
    } as Omit<Rule, 'id'>);
  }

  if (policy && input.passes.length > 0) {
    rules.push({
      priority: 4,
      action: { type: 'allow' },
      condition: { requestDomains: input.passes, resourceTypes: ['main_frame', 'sub_frame'] },
    } as Omit<Rule, 'id'>);
  }

  if (input.blockShorts) {
    rules.push({
      priority: 5,
      action: redirect,
      condition: { regexFilter: SHORTS_REGEX, resourceTypes: ['main_frame'] },
    } as Omit<Rule, 'id'>);
  }

  return rules.map((r, i) => ({ id: i + 1, ...r })) as Rule[];
}
