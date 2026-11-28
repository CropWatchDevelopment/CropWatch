import { describe, expect, it } from 'vitest';
import { knowledgeBaseUrl, ruleResetHelpUrl } from './help-urls';

describe('knowledgeBaseUrl', () => {
	it('links to the article in the language of the UI', () => {
		expect(knowledgeBaseUrl('software/setting-up-alert-rules', undefined, 'en')).toBe(
			'https://kb.cropwatch.io/en/software/setting-up-alert-rules'
		);
		expect(knowledgeBaseUrl('software/setting-up-alert-rules', undefined, 'ja')).toBe(
			'https://kb.cropwatch.io/ja/software/setting-up-alert-rules'
		);
	});

	it('adds the section, so the article opens scrolled to it', () => {
		expect(knowledgeBaseUrl('software/setting-up-alert-rules', 'common-mistakes', 'en')).toBe(
			'https://kb.cropwatch.io/en/software/setting-up-alert-rules#common-mistakes'
		);
	});

	it('follows the active locale when none is given', () => {
		// Tests run in the base locale (ja).
		expect(knowledgeBaseUrl('software/setting-up-alert-rules')).toBe(
			'https://kb.cropwatch.io/ja/software/setting-up-alert-rules'
		);
	});
});

describe('ruleResetHelpUrl', () => {
	it('opens the section that explains trigger and reset values', () => {
		expect(ruleResetHelpUrl('en')).toBe(
			'https://kb.cropwatch.io/en/software/setting-up-alert-rules#trigger-and-reset'
		);
		expect(ruleResetHelpUrl('ja')).toBe(
			'https://kb.cropwatch.io/ja/software/setting-up-alert-rules#trigger-and-reset'
		);
	});
});
