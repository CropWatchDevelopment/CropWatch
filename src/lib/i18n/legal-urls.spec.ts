import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLocale, type Locale } from '$lib/paraglide/runtime';
import { legalDocumentUrl } from './legal-urls';

// The active Paraglide locale is the base locale (ja) in tests; one test
// switches it by stubbing getLocale, and afterEach puts the real one back.
vi.mock('$lib/paraglide/runtime', async (importOriginal) => {
	const runtime = await importOriginal<typeof import('$lib/paraglide/runtime')>();
	return { ...runtime, getLocale: vi.fn(runtime.getLocale) };
});

afterEach(() => {
	vi.mocked(getLocale).mockReset();
});

describe('legalDocumentUrl', () => {
	it('links English users to the global site', () => {
		expect(legalDocumentUrl('privacy_policy', 'en')).toBe(
			'https://cropwatch.io/legal/privacy-policy'
		);
		expect(legalDocumentUrl('terms_of_service', 'en')).toBe(
			'https://cropwatch.io/legal/terms-of-service'
		);
		expect(legalDocumentUrl('eula', 'en')).toBe('https://cropwatch.io/legal/EULA');
	});

	it('links Japanese users directly to the Japanese site so the geo redirect cannot drop the path', () => {
		expect(legalDocumentUrl('privacy_policy', 'ja')).toBe(
			'https://cropwatch.co.jp/legal/privacy-policy'
		);
		expect(legalDocumentUrl('terms_of_service', 'ja')).toBe(
			'https://cropwatch.co.jp/legal/terms-of-service'
		);
		expect(legalDocumentUrl('eula', 'ja')).toBe('https://cropwatch.co.jp/legal/EULA');
	});

	it('treats a regional English locale as English', () => {
		expect(legalDocumentUrl('eula', 'en-US' as Locale)).toBe('https://cropwatch.io/legal/EULA');
	});

	it('follows the active UI locale when no locale is given', () => {
		expect(legalDocumentUrl('privacy_policy')).toBe('https://cropwatch.co.jp/legal/privacy-policy');

		vi.mocked(getLocale).mockReturnValue('en');
		expect(legalDocumentUrl('privacy_policy')).toBe('https://cropwatch.io/legal/privacy-policy');
	});
});
