import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeContextDto } from '$lib/api/api.dtos';
import { Capability } from '$lib/auth/capabilities';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import type { Profile } from '$lib/interfaces/profile.interface';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import Header from './Header.svelte';

const { goto, appPage } = vi.hoisted(() => ({
	goto: vi.fn(),
	appPage: { url: new URL('http://localhost/locations/8?tab=devices'), params: {}, data: {} }
}));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/state', () => ({ page: appPage }));

const SESSION = { sub: 'user-1', email: 'grower@example.com', exp: 4102444800 } as IJWT;
const OWNER: MeContextDto = {
	orgs_enabled: true,
	is_staff: false,
	suspended: false,
	org: {
		id: 'org-1',
		type: 'company',
		name: 'Acme',
		role: 'owner',
		capabilities: [Capability.BillingManage, Capability.OrgManageOpen]
	} as MeContextDto['org'],
	guest_orgs: [],
	child_orgs: []
};

/**
 * Full page loads (`window.location.href = …`) are recorded and cancelled
 * through the Navigation API, so the test page stays put.
 */
function interceptPageLoads() {
	const navigation = (window as unknown as { navigation: EventTarget }).navigation;
	const urls: string[] = [];
	/** `POST` for a form submission (the navigation carries form data), else `GET`. */
	const methods: string[] = [];
	const onNavigate = (event: Event) => {
		const navigate = event as Event & { destination: { url: string }; formData: FormData | null };
		urls.push(navigate.destination.url);
		methods.push(navigate.formData ? 'POST' : 'GET');
		event.preventDefault();
	};
	navigation.addEventListener('navigate', onNavigate);
	return { urls, methods, stop: () => navigation.removeEventListener('navigate', onNavigate) };
}

let view: ReturnType<typeof renderWithServices> | null = null;
let pageLoads: ReturnType<typeof interceptPageLoads> | null = null;

function render(
	app: { session?: IJWT | null; profile?: Partial<Profile>; orgContext?: MeContextDto } = {},
	mode = 'open'
) {
	view = renderWithServices(Header, {
		props: { mode } as never,
		app: {
			session: app.session === undefined ? SESSION : app.session,
			profile: app.profile as Profile | undefined,
			orgContext: app.orgContext,
			accessToken: 'jwt-token'
		}
	});
	return view;
}

const profileName = () => document.querySelector('.cw-profile-menu__name')?.textContent?.trim();
const profileSubtitle = () =>
	document.querySelector('.cw-profile-menu__subtitle')?.textContent?.trim() ?? null;

async function openMenu() {
	document.querySelector<HTMLButtonElement>('.cw-profile-menu__trigger')?.click();
	await expect.poll(() => document.querySelectorAll('[role="menuitem"]').length).toBeGreaterThan(0);
}

const menuLabels = () =>
	[...document.querySelectorAll('[role="menuitem"]')].map((item) => item.textContent?.trim());

async function choose(label: string) {
	await openMenu();
	const item = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(
		(entry) => entry.textContent?.trim() === label
	);
	if (!item) throw new Error(`no "${label}" menu item`);
	item.click();
	flushSync();
}

beforeEach(() => {
	appPage.url = new URL('http://localhost/locations/8?tab=devices');
});

afterEach(() => {
	view?.unmount();
	view = null;
	pageLoads?.stop();
	pageLoads = null;
	goto.mockReset();
});

describe('Header profile menu', () => {
	it("shows the user's name and employer", () => {
		render({ profile: { full_name: '  Kevin Tanaka ', employer: ' Acme Farms ' } });

		expect(profileName()).toBe('Kevin Tanaka');
		expect(profileSubtitle()).toBe('Acme Farms');
	});

	it('falls back to the email under the name when there is no employer', () => {
		render({ profile: { full_name: 'Kevin Tanaka', employer: '  ' } });

		expect(profileName()).toBe('Kevin Tanaka');
		expect(profileSubtitle()).toBe('grower@example.com');
	});

	it('shows only the email when there is no name', () => {
		render({ profile: { full_name: '   ' } });

		expect(profileName()).toBe('grower@example.com');
		expect(profileSubtitle()).toBeNull();
	});

	it('shows an empty name without a session or profile', () => {
		render({ session: null });

		expect(profileName()).toBe('');
		expect(profileSubtitle()).toBeNull();
	});

	it('lists the entries the org standing allows', async () => {
		render({ orgContext: OWNER });

		await openMenu();

		expect(menuLabels()).toEqual([
			m.nav_profile(),
			m.nav_organization(),
			m.nav_billing(),
			m.nav_management(),
			m.nav_settings(),
			m.nav_logout()
		]);
	});

	it('hides org entries without an org context', async () => {
		render();

		await openMenu();

		expect(menuLabels()).toEqual([m.nav_profile(), m.nav_settings(), m.nav_logout()]);
	});

	it.each([
		[() => m.nav_profile(), '/account/profile'],
		[() => m.nav_organization(), '/organization'],
		[() => m.nav_billing(), '/account/billing'],
		[() => m.nav_management(), '/management/users'],
		[() => m.nav_settings(), '/settings']
	])('navigates from "%s"', async (label, target) => {
		render({ orgContext: OWNER });

		await choose(label());

		expect(goto).toHaveBeenCalledWith(target);
	});

	it('signs out with a POST to the logout action that returns to the current page', async () => {
		pageLoads = interceptPageLoads();
		const { app } = render({ profile: { full_name: 'Kevin' }, orgContext: OWNER });

		await choose(m.nav_logout());

		expect(goto).not.toHaveBeenCalled();
		await expect
			.poll(() => pageLoads?.urls)
			.toEqual([
				new URL('/auth/logout?redirect=%2Flocations%2F8%3Ftab%3Ddevices', location.origin).href
			]);
		expect(pageLoads?.methods).toEqual(['POST']);
		// The app context is cleared first, so no stale data shows during the load.
		expect(app.session).toBeNull();
		expect(app.accessToken).toBeUndefined();
		expect(app.profile).toBeUndefined();
		expect(app.orgContext).toBeUndefined();
	});
});

describe('Header navigation toggle', () => {
	it('hides and shows the side navigation, with the logo while it is hidden', () => {
		render({}, 'open');
		const hamburger = () => document.querySelector<HTMLButtonElement>('.cw-header__hamburger');
		expect(document.querySelector('.app-header__brand')).toBeNull();
		expect(hamburger()?.getAttribute('aria-expanded')).toBe('true');

		hamburger()?.click();
		flushSync();

		expect(hamburger()?.getAttribute('aria-expanded')).toBe('false');
		expect(document.querySelector('.app-header__brand-name')?.textContent).toBe('CropWatch');
		expect(document.querySelector('.app-header__brand-mark')?.getAttribute('alt')).toBe(
			m.app_name()
		);

		hamburger()?.click();
		flushSync();
		expect(hamburger()?.getAttribute('aria-expanded')).toBe('true');
		expect(document.querySelector('.app-header__brand')).toBeNull();
	});

	it('hides a collapsed (mini) navigation too', () => {
		render({}, 'mini');
		const hamburger = document.querySelector<HTMLButtonElement>('.cw-header__hamburger');
		expect(hamburger?.getAttribute('aria-expanded')).toBe('true');

		hamburger?.click();
		flushSync();

		expect(hamburger?.getAttribute('aria-expanded')).toBe('false');
	});
});
