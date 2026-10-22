import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceDto, RuleFormContextDto, RuleTemplateDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import EditRulePage from './+page.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => ({ goto }));

const TEMPLATE: RuleTemplateDto = {
	id: 7,
	name: 'Cold room',
	description: null,
	deviceTypeId: 5,
	isActive: true,
	createdAt: null,
	assignments: [],
	criteria: [],
	actions: [
		{
			id: 31,
			templateId: 7,
			actionType: 1,
			actionTypeName: 'EMail',
			actionTypeValue: 'email',
			config: { recipient: 'ops@example.com' },
			createdAt: null
		}
	]
};

function context(template: RuleTemplateDto | null = TEMPLATE): RuleFormContextDto {
	return {
		devices: [{ dev_eui: 'DEV-A', name: 'Freezer A', location_id: 10, type: 5 } as DeviceDto],
		locations: [],
		actionTypes: [
			{ id: 1, name: 'EMail', value: 'email', createdAt: '' },
			{ id: 3, name: 'Push', value: 'push', createdAt: '' }
		],
		template
	};
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(data: Record<string, unknown> = {}) {
	view = renderWithServices(EditRulePage, {
		props: {
			data: { context: context(), authToken: 'jwt-token', session: { sub: 'user-1' }, ...data }
		} as never,
		services,
		app: { accessToken: 'jwt-token' }
	});
	return view;
}

beforeEach(() => {
	services = createMockServices();
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockClear();
});

describe('edit rule page', () => {
	it('shows the saved rule in the form', () => {
		render();

		expect(document.title).toBe(m.rules_new_edit_page_title());
		expect(view!.target.querySelector('h1')?.textContent).toBe(m.rules_new_edit_template());
		expect(view!.target.textContent).toContain(`${m.rules_new_template_id()}: 7`);
		expect(
			(document.getElementById('rule-form-name-input') as HTMLInputElement | null)?.value
		).toBe('Cold room');
		expect(document.getElementById('rule-form-submit-button')?.textContent?.trim()).toBe(
			m.action_save_changes()
		);
		expect(view!.target.textContent).toContain(m.rules_step_4_review_save_title());
	});

	it('keeps the saved actions instead of preselecting the editor for push alerts', () => {
		render();

		expect(document.getElementById('rule-form-action-0-push-recipients')).toBeNull();
		expect(
			(document.getElementById('rule-form-action-0-recipient-input') as HTMLInputElement).value
		).toBe('ops@example.com');
	});

	it('shows template id 0 when the context has no template', () => {
		render({ context: context(null) });

		expect(view!.target.textContent).toContain(`${m.rules_new_template_id()}: 0`);
	});

	it('works without a session user', () => {
		render({ session: null, context: context({ ...TEMPLATE, actions: [] }) });

		// A rule without actions gets a blank one, never a push action for the editor.
		expect(document.getElementById('rule-form-action-0-recipient-input')).not.toBeNull();
		expect(document.getElementById('rule-form-action-0-push-recipients')).toBeNull();
	});

	it('goes back to the rules list', () => {
		render();

		document.getElementById('rule-edit-back-button')?.click();
		flushSync();

		expect(goto).toHaveBeenCalledWith('/rules');
	});
});
