import { createRawSnippet, flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeContextDto } from '$lib/api/api.dtos';
import { Capability } from '$lib/auth/capabilities';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import ManagementLayout from './+layout.svelte';

const nav = vi.hoisted(() => ({
	goto: vi.fn(),
	url: new URL('http://localhost/management/users')
}));
vi.mock('$app/navigation', () => ({ goto: nav.goto }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return nav.url;
		}
	}
}));

function orgContext(capabilities: string[], overrides: Partial<MeContextDto> = {}): MeContextDto {
	return {
		orgs_enabled: true,
		is_staff: false,
		suspended: false,
		org: { id: 'org-1', type: 'company', name: 'Acme', role: 'manager', capabilities },
		guest_orgs: [],
		child_orgs: [],
		...overrides
	};
}

const children = createRawSnippet(() => ({
	render: () => '<p id="management-child">Child page</p>'
}));

let view: ReturnType<typeof renderWithServices> | null = null;

function render(context: MeContextDto | undefined) {
	view = renderWithServices(ManagementLayout, {
		props: { children } as never,
		app: { accessToken: 'jwt-token', orgContext: context }
	});
	return view;
}

/** The tab buttons, as `[label, variant]`. */
const tabs = () =>
	[...document.querySelectorAll<HTMLButtonElement>('nav.management-tabs button')].map((button) => [
		button.textContent?.trim(),
		button.classList.contains('cw-button--primary') ? 'primary' : 'ghost'
	]);

const button = (label: string) =>
	[...document.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
		candidate.textContent?.includes(label)
	);

beforeEach(() => {
	nav.url = new URL('http://localhost/management/users');
});

afterEach(() => {
	view?.unmount();
	view = null;
	nav.goto.mockReset();
});

describe('management layout', () => {
	it('shows only the users tab to managers, marking it active', () => {
		render(orgContext([Capability.OrgManageOpen]));

		expect(tabs()).toEqual([[m.management_tab_users(), 'primary']]);
		expect(document.querySelector('nav.management-tabs')?.getAttribute('aria-label')).toBe(
			m.management_page_title()
		);
	});

	it('adds the settings tab for the owner and marks the current page', () => {
		nav.url = new URL('http://localhost/management/settings');
		render(orgContext([Capability.OrgManageOpen, Capability.OrgSettingsManage]));

		expect(tabs()).toEqual([
			[m.management_tab_users(), 'ghost'],
			[m.management_tab_settings(), 'primary']
		]);
	});

	it('shows the settings tab to staff, and hides it without an org context', () => {
		render(orgContext([], { is_staff: true }));
		expect(tabs().map(([label]) => label)).toEqual([
			m.management_tab_users(),
			m.management_tab_settings()
		]);
		view?.unmount();

		render(undefined);
		expect(tabs().map(([label]) => label)).toEqual([m.management_tab_users()]);
	});

	it('renders the page inside the layout', () => {
		render(orgContext([Capability.OrgManageOpen]));

		expect(document.getElementById('management-child')?.textContent).toBe('Child page');
	});

	it('navigates back to the dashboard and between tabs', () => {
		render(orgContext([Capability.OrgManageOpen, Capability.OrgSettingsManage]));

		button(m.action_back())?.click();
		button(m.management_tab_settings())?.click();
		button(m.management_tab_users())?.click();
		flushSync();

		expect(nav.goto.mock.calls).toEqual([['/'], ['/management/settings'], ['/management/users']]);
	});
});
