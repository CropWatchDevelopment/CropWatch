import type { LegalDocumentKind } from '$lib/api/api.dtos';
import { getLocale } from '$lib/paraglide/runtime';
import { getUiLocale } from './format';

// Canonical hosts (verified 2026-10-13): both marketing sites are apex-canonical —
// www.cropwatch.io 308s to cropwatch.io and www.cropwatch.co.jp 307s to
// cropwatch.co.jp. Never link to a www host: www.cropwatch.co.jp is not attached
// to the Vercel project that serves the site, so its certificate is not renewed.
const LEGAL_SITE_ORIGIN = {
	en: 'https://cropwatch.io',
	ja: 'https://cropwatch.co.jp'
} as const;

const LEGAL_DOCUMENT_PATH: Record<LegalDocumentKind, string> = {
	privacy_policy: '/legal/privacy-policy',
	terms_of_service: '/legal/terms-of-service',
	eula: '/legal/EULA'
};

/**
 * Public URL of a legal document on the marketing site that matches the UI locale.
 *
 * cropwatch.io geo-redirects visitors in Japan to the cropwatch.co.jp *home page*
 * (the path is dropped), so Japanese-locale users must be linked straight to
 * cropwatch.co.jp to land on the document they are agreeing to.
 */
export function legalDocumentUrl(kind: LegalDocumentKind, locale = getLocale()): string {
	return `${LEGAL_SITE_ORIGIN[getUiLocale(locale)]}${LEGAL_DOCUMENT_PATH[kind]}`;
}
