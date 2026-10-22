import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceDto, RuleFormContextDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import CreateRulePage from './+page.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => ({ goto }));

const CONTEXT: RuleFormContextDto = {
	devices: [{ dev_eui: 'DEV-A', name: 'Freezer A', location_id: 10, type: 5 } as DeviceDto],
	locations: [],
	actionTypes: [
		{ id: 1, name: 'EMail', value: 'email', createdAt: '' },
		{ id: 3, name: 'Push', value: 'push', createdAt: '' }
	],
	template: null
};

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(data: Record<string, unknown> = {}) {
	view = renderWithServices(CreateRulePage, {
		props: {
			data: {
				context: CONTEXT,
				authToken: 'jwt-token',
				devEui: null,
				session: null,
				profile: undefined,
				...data
			}
		} as never,
		services,
		app: { accessToken: 'jwt-token' }
	});
	return view;
}

const pushChips = () =>
	[
		...(document
			.getElementById('rule-form-action-0-push-recipients')
			?.closest('.cw-multiselect')
			?.querySelectorAll('.cw-multiselect__chip-label') ?? [])
	].map((chip) => chip.textContent);

beforeEach(() => {
	services = createMockServices();
	services.line.getLineRecipientCandidates.mockResolvedValue([]);
	services.push.getPushRecipientCandidates.mockResolvedValue([]);
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockClear();
});

describe('create rule page', () => {
	it('shows the rule form for a new rule', () => {
		render();

		expect(document.title).toBe(m.rules_new_create_page_title());
		expect(view!.target.querySelector('h1')?.textContent).toBe(m.rules_new_create_template());
		expect(document.getElementById('rule-form-submit-button')?.textContent?.trim()).toBe(
			m.rules_create_rule()
		);
		expect(view!.target.textContent).toContain(m.rules_step_4_title());
	});

	it('goes back to the rules list', () => {
		render();

		document.getElementById('rule-create-back-button')?.click();
		flushSync();

		expect(goto).toHaveBeenCalledWith('/rules');
	});

	it('preselects the device from the link it was opened with', async () => {
		render({ devEui: 'DEV-A' });

		expect(
			document
				.getElementById('rule-form-devices-multiselect')
				?.querySelector('.cw-multiselect__chip-label')?.textContent
		).toBe('Freezer A (DEV-A)');
		await vi.waitFor(() =>
			expect(services.push.getPushRecipientCandidates).toHaveBeenCalledWith(['DEV-A'])
		);
	});

	it.each([
		[
			'their full name',
			{ full_name: 'Ada Lovelace', username: 'ada', email: 'ada@example.com' },
			'Ada Lovelace'
		],
		['their username', { full_name: null, username: 'ada', email: 'ada@example.com' }, 'ada'],
		['their email', { email: 'ada@example.com' }, 'ada@example.com'],
		['their user id without a profile', undefined, 'user-1']
	])('addresses the default push alert to the creator, named by %s', (_label, profile, chip) => {
		render({ session: { sub: 'user-1' }, profile });

		expect(pushChips()).toEqual([chip]);
	});

	it('starts with a blank action without a session user', () => {
		render({ session: null });

		expect(document.getElementById('rule-form-action-0-push-recipients')).toBeNull();
		expect(document.getElementById('rule-form-action-0-recipient-input')).not.toBeNull();
	});
});
