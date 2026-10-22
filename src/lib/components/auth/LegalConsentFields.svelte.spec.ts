import { flushSync } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { legalDocumentUrl } from '$lib/i18n/legal-urls';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import LegalConsentFields from './LegalConsentFields.svelte';

const CONSENTS = [
	{ id: 'privacy', kind: 'privacy_policy', label: m.auth_privacy_policy },
	{ id: 'terms', kind: 'terms_of_service', label: m.auth_terms_of_service },
	{ id: 'eula', kind: 'eula', label: m.auth_eula }
] as const;

type ConsentId = (typeof CONSENTS)[number]['id'];

let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	props: Partial<{
		agreedPrivacy: boolean;
		agreedTerms: boolean;
		agreedEula: boolean;
		allConsentsGiven: boolean;
		privacyUrl: string;
		termsUrl: string;
		eulaUrl: string;
	}> = {}
) {
	view = renderWithServices(LegalConsentFields, {
		props: {
			agreedPrivacy: false,
			agreedTerms: false,
			agreedEula: false,
			allConsentsGiven: false,
			...props
		}
	});
	return view;
}

/** Bound like the create-account and accept-terms pages bind it. */
function renderBound() {
	const agreed = $state({ privacy: false, terms: false, eula: false });
	view = renderWithServices(LegalConsentFields, {
		props: {
			get agreedPrivacy() {
				return agreed.privacy;
			},
			set agreedPrivacy(value: boolean) {
				agreed.privacy = value;
			},
			get agreedTerms() {
				return agreed.terms;
			},
			set agreedTerms(value: boolean) {
				agreed.terms = value;
			},
			get agreedEula() {
				return agreed.eula;
			},
			set agreedEula(value: boolean) {
				agreed.eula = value;
			},
			get allConsentsGiven() {
				return agreed.privacy && agreed.terms && agreed.eula;
			}
		}
	});
	return agreed;
}

const link = (id: ConsentId) =>
	document.getElementById(`create-account-consent-${id}-link`) as HTMLAnchorElement;
const checkbox = (id: ConsentId) =>
	document.getElementById(`create-account-consent-${id}-checkbox`) as HTMLInputElement;
const hint = () => document.querySelector('.consent-hint')?.textContent ?? null;

/** Opens a policy; it would open in a new tab, so the click's navigation is cancelled. */
function openPolicy(id: ConsentId) {
	link(id).addEventListener('click', (event) => event.preventDefault(), { once: true });
	link(id).click();
	flushSync();
}

function toggle(id: ConsentId) {
	checkbox(id).click();
	flushSync();
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('LegalConsentFields', () => {
	it('asks for the three agreements, each locked until its policy is opened', () => {
		render();

		expect(document.querySelector('legend')?.textContent).toBe(m.auth_required_agreements_label());
		expect(document.querySelector('.consent-note')?.textContent).toBe(m.auth_open_link_first());
		const squash = (value = '') => value.replace(/\s+/g, ' ').trim();
		expect(
			[...document.querySelectorAll('.consent-item')].map((item) => squash(item.textContent))
		).toEqual(CONSENTS.map(({ label }) => squash(`${m.auth_agree_to()} ${label()}`)));
		for (const { id } of CONSENTS) {
			expect(checkbox(id).type).toBe('checkbox');
			expect(checkbox(id).checked, id).toBe(false);
			expect(checkbox(id).disabled, id).toBe(true);
		}
		expect(hint()).toBeNull();
	});

	it('links each policy for the UI language, in a new tab', () => {
		render();

		for (const { id, kind, label } of CONSENTS) {
			expect(link(id).textContent).toBe(label());
			expect(link(id).getAttribute('href')).toBe(legalDocumentUrl(kind));
			expect(link(id).target).toBe('_blank');
			expect(link(id).rel).toBe('noopener noreferrer');
		}
	});

	it('links the policy URLs it is given', () => {
		render({
			privacyUrl: 'https://example.test/privacy',
			termsUrl: 'https://example.test/terms',
			eulaUrl: 'https://example.test/eula'
		});

		expect(CONSENTS.map(({ id }) => link(id).getAttribute('href'))).toEqual([
			'https://example.test/privacy',
			'https://example.test/terms',
			'https://example.test/eula'
		]);
	});

	it('unlocks a checkbox once its own policy has been opened', () => {
		render();

		openPolicy('terms');

		expect(CONSENTS.map(({ id }) => checkbox(id).disabled)).toEqual([true, false, true]);
		openPolicy('privacy');
		openPolicy('eula');
		expect(CONSENTS.map(({ id }) => checkbox(id).disabled)).toEqual([false, false, false]);
	});

	it('reports each agreement to the page that binds it', () => {
		const agreed = renderBound();
		for (const { id } of CONSENTS) openPolicy(id);

		toggle('privacy');
		expect(agreed).toEqual({ privacy: true, terms: false, eula: false });
		toggle('terms');
		toggle('eula');
		expect(agreed).toEqual({ privacy: true, terms: true, eula: true });
		toggle('terms');
		expect(agreed).toEqual({ privacy: true, terms: false, eula: true });
	});

	it('asks for all three once some, but not all, are given', () => {
		const agreed = renderBound();
		for (const { id } of CONSENTS) openPolicy(id);

		toggle('eula');
		expect(hint()).toBe(m.auth_all_three_required());
		toggle('privacy');
		expect(hint()).toBe(m.auth_all_three_required());
		toggle('terms');
		expect(hint()).toBeNull();
		toggle('privacy');
		toggle('terms');
		toggle('eula');
		expect(agreed).toEqual({ privacy: false, terms: false, eula: false });
		expect(hint()).toBeNull();
	});

	it('shows the agreements it is given', () => {
		render({ agreedPrivacy: true, agreedTerms: true, agreedEula: true, allConsentsGiven: true });

		expect(CONSENTS.map(({ id }) => checkbox(id).checked)).toEqual([true, true, true]);
		expect(hint()).toBeNull();
		view?.unmount();

		render({ agreedTerms: true, allConsentsGiven: false });
		expect(CONSENTS.map(({ id }) => checkbox(id).checked)).toEqual([false, true, false]);
		expect(hint()).toBe(m.auth_all_three_required());
	});
});
