import { getLocale } from '#lib/paraglide/runtime.js';
import { getUiLocale } from './format';

const KNOWLEDGE_BASE_ORIGIN = 'https://kb.cropwatch.io';

/**
 * A knowledge base article in the language of the UI, at one of its sections.
 * Both languages keep the same paths and section ids.
 */
export function knowledgeBaseUrl(path: string, section?: string, locale = getLocale()): string {
	return `${KNOWLEDGE_BASE_ORIGIN}/${getUiLocale(locale)}/${path}${section ? `#${section}` : ''}`;
}

/** Why a rule needs a reset value: the section the rule form's help mark opens. */
export const ruleResetHelpUrl = (locale = getLocale()) =>
	knowledgeBaseUrl('software/setting-up-alert-rules', 'trigger-and-reset', locale);
