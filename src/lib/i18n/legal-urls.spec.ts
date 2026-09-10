import { describe, expect, it } from 'vitest';
import { legalDocumentUrl } from './legal-urls';

describe('legalDocumentUrl', () => {
	it('links English users to the global site', () => {
		expect(legalDocumentUrl('privacy_policy', 'en')).toBe(
			'https://www.cropwatch.io/legal/privacy-policy'
		);
		expect(legalDocumentUrl('terms_of_service', 'en')).toBe(
			'https://www.cropwatch.io/legal/terms-of-service'
		);
		expect(legalDocumentUrl('eula', 'en')).toBe('https://www.cropwatch.io/legal/EULA');
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
});
