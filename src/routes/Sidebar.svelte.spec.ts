import { flushSync, tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page as browserPage } from 'vitest/browser';
import type { LocationDto } from '$lib/api/api.dtos';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import Sidebar from './Sidebar.svelte';

const { goto, appPage } = vi.hoisted(() => ({
	goto: vi.fn(),
	appPage: { url: new URL('http://localhost/'), params: {}, data: {} }
}));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/state', () => ({ page: appPage }));

const DESKTOP = [1280, 800] as const;
const TABLET = [800, 900] as const;
const PHONE = [414, 896] as const;
const GOTO_OPTIONS = { replaceState: true, keepFocus: true, noScroll: true };

/**
 * Full page loads and link clicks are recorded and cancelled through the
 * Navigation API, so the test page stays put.
 */
function interceptPageLoads() {
	const navigation = (window as unknown as { navigation: EventTarget }).navigation;
	const urls: string[] = [];
	const onNavigate = (event: Event) => {
		urls.push((event as Event & { destination: { url: string } }).destination.url);
		event.preventDefault();
	};
	navigation.addEventListener('navigate', onNavigate);
	return { urls, stop: () => navigation.removeEventListener('navigate', onNavigate) };
}

function session(email: string, exp = Math.floor(Date.now() / 1000) + 3_600): IJWT {
	return { sub: 'user-1', email, exp } as IJWT;
}

let view: ReturnType<typeof renderWithServices> | null = null;
let pageLoads: ReturnType<typeof interceptPageLoads>;

function render(
	app: { session?: IJWT | null; locationGroups?: unknown[]; locations?: LocationDto[] } = {}
) {
	view = renderWithServices(Sidebar, {
		props: { mode: 'open' } as never,
		app: {
			session: app.session === undefined ? session('grower@example.com') : app.session,
			locationGroups: app.locationGroups as string[] | undefined,
			locations: app.locations
		}
	});
	return view;
}

const nav = () => document.querySelector('nav.cw-sidenav') as HTMLElement;
const navLinks = () =>
	[...document.querySelectorAll<HTMLAnchorElement>('.cw-sidenav__items a.cw-sidenav__item')].map(
		(link) => ({
			label: link.textContent?.trim(),
			href: link.getAttribute('href'),
			current: link.getAttribute('aria-current') === 'page'
		})
	);
const groupLabels = () =>
	[...document.querySelectorAll('.cw-sidenav__group-label')].map((label) => label.textContent);
const filterItems = () =>
	[...document.querySelectorAll<HTMLButtonElement>('.cw-listbox__item')].map((item) => ({
		label: item.querySelector('.cw-listbox__label')?.textContent?.trim(),
		badge: item.querySelector('.cw-chip')?.textContent?.trim(),
		count: item.querySelector('.cw-listbox__count')?.textContent?.trim() ?? null,
		selected: item.getAttribute('aria-selected') === 'true'
	}));

function openFilters() {
	const header = [...document.querySelectorAll<HTMLButtonElement>('.cw-expand__header')].find(
		(button) => button.textContent?.includes(m.sidebar_dashboard_filters())
	);
	header?.click();
	flushSync();
}

function pickFilter(label: string) {
	const item = [...document.querySelectorAll<HTMLButtonElement>('.cw-listbox__item')].find(
		(entry) => entry.querySelector('.cw-listbox__label')?.textContent?.trim() === label
	);
	if (!item) throw new Error(`no "${label}" filter`);
	item.click();
	flushSync();
}

beforeEach(async () => {
	appPage.url = new URL('http://localhost/');
	pageLoads = interceptPageLoads();
	await browserPage.viewport(...DESKTOP);
});

afterEach(async () => {
	view?.unmount();
	view = null;
	pageLoads.stop();
	goto.mockReset();
	await browserPage.viewport(...PHONE);
});

describe('Sidebar navigation', () => {
	it('lists every section, grouped, with the current one highlighted', async () => {
		appPage.url = new URL('http://localhost/locations/8?tab=devices');

		render();

		await expect.poll(() => nav().classList.contains('cw-sidenav--open')).toBe(true);
		expect(navLinks()).toEqual([
			{ label: m.nav_overview(), href: '/overview', current: false },
			{ label: m.nav_dashboard(), href: '/', current: false },
			{ label: m.nav_locations(), href: '/locations', current: true },
			{ label: m.nav_rules(), href: '/rules', current: false },
			{ label: m.nav_reports(), href: '/reports', current: false },
			{ label: m.nav_gateways(), href: '/gateways', current: false }
		]);
		expect(groupLabels()).toEqual([
			m.nav_group_info_management(),
			m.nav_group_connectivity_hardware()
		]);
		expect(nav().getAttribute('aria-label')).toBe(m.cwui_sidenav_aria());
		expect(document.querySelector('.app-sidebar__brand-mark')?.getAttribute('alt')).toBe(
			m.app_name()
		);
	});

	it('highlights the dashboard only on the dashboard itself', async () => {
		render();

		await expect.poll(() => navLinks().find((link) => link.current)?.href).toBe('/');
		expect(navLinks().filter((link) => link.current)).toHaveLength(1);
	});

	it('does not highlight a section whose name merely starts the same', async () => {
		appPage.url = new URL('http://localhost/reports-new/x');

		render();

		await expect.poll(() => navLinks().length).toBe(6);
		expect(navLinks().some((link) => link.current)).toBe(false);
	});

	it('shows the admin section to CropWatch staff only', async () => {
		appPage.url = new URL('http://localhost/admin/billing');

		render({ session: session(' Ops@CropWatch.io ') });

		await expect
			.poll(() => navLinks().at(-1))
			.toEqual({
				label: m.nav_admin(),
				href: '/admin/billing',
				current: true
			});
		expect(groupLabels()).toContain(m.nav_group_admin());
	});

	it('has no admin section for customers', async () => {
		render({ session: session('grower@cropwatch.io.example.com') });

		await expect.poll(() => navLinks().length).toBe(6);
		expect(navLinks().map((link) => link.href)).not.toContain('/admin/billing');
	});

	it('keeps the docked navigation open when a link is chosen', async () => {
		render();
		await expect.poll(() => nav().classList.contains('cw-sidenav--open')).toBe(true);

		document.querySelector<HTMLAnchorElement>('a[href="/rules"]')?.click();
		flushSync();

		expect(nav().classList.contains('cw-sidenav--open')).toBe(true);
	});

	it('closes the expanded navigation on smaller screens when a link is chosen', async () => {
		await browserPage.viewport(...TABLET);
		render();
		await expect.poll(() => nav().classList.contains('cw-sidenav--mini')).toBe(true);
		document.querySelector<HTMLButtonElement>('.cw-sidenav__toggle--mini')?.click();
		flushSync();
		expect(nav().classList.contains('cw-sidenav--open')).toBe(true);

		document.querySelector<HTMLAnchorElement>('a[href="/rules"]')?.click();
		flushSync();

		expect(nav().classList.contains('cw-sidenav--hidden')).toBe(true);
	});

	it('offers the language and theme controls for small screens', async () => {
		render();

		await expect
			.poll(() =>
				document.querySelector('.app-sidebar__mobile-utilities .language-switcher--compact')
			)
			.not.toBeNull();
	});
});

describe('Sidebar dashboard filters', () => {
	it('are only offered on the dashboard', async () => {
		appPage.url = new URL('http://localhost/locations');

		render({ locationGroups: ['Farm'] });

		await expect.poll(() => navLinks().length).toBe(6);
		expect(document.body.textContent).not.toContain(m.sidebar_dashboard_filters());
		expect(filterItems()).toEqual([]);
	});

	it('list the location groups once each, sorted, under "all"', async () => {
		render({
			locationGroups: ['Orchard', ' Farm ', 'Farm', '', '  ', null, 7, 'barn'],
			locations: [{ location_id: 1 } as LocationDto, { location_id: 2 } as LocationDto]
		});

		await expect.poll(() => filterItems().length).toBe(4);
		expect(document.body.textContent).toContain(m.sidebar_dashboard_filters());
		expect(document.body.textContent).toContain(m.sidebar_filter_devices_in_view());
		expect(document.querySelector('.cw-listbox__heading')?.textContent).toBe(
			`📍 ${m.sidebar_location_groups()}`
		);
		expect(filterItems()).toEqual([
			{
				label: m.sidebar_all_location_groups(),
				badge: m.common_all_short(),
				count: '2',
				selected: true
			},
			{ label: 'barn', badge: 'BA', count: null, selected: false },
			{ label: 'Farm', badge: 'FA', count: null, selected: false },
			{ label: 'Orchard', badge: 'OR', count: null, selected: false }
		]);
	});

	it('show only "all" when the groups are not loaded yet', async () => {
		render({ locationGroups: undefined, locations: undefined });

		await expect
			.poll(() => filterItems())
			.toEqual([
				{
					label: m.sidebar_all_location_groups(),
					badge: m.common_all_short(),
					count: '0',
					selected: true
				}
			]);
	});

	it('mark the group in the URL as selected', async () => {
		appPage.url = new URL('http://localhost/?locationGroup=Farm');

		render({ locationGroups: ['Farm', 'Orchard'] });

		await expect.poll(() => filterItems().find((item) => item.selected)?.label).toBe('Farm');
	});

	it('filter the dashboard in place, keeping the other parameters', async () => {
		appPage.url = new URL('http://localhost/?name=probe&locationGroup=Orchard');
		render({ locationGroups: ['North Farm', 'Orchard'] });
		await expect.poll(() => filterItems().length).toBe(3);
		openFilters();

		pickFilter('North Farm');

		expect(goto).toHaveBeenCalledWith('/?name=probe&locationGroup=North+Farm', GOTO_OPTIONS);
	});

	it('clear the group filter with "all"', async () => {
		appPage.url = new URL('http://localhost/?locationGroup=Farm&name=probe');
		render({ locationGroups: ['Farm'] });
		await expect.poll(() => filterItems().length).toBe(2);
		openFilters();

		pickFilter(m.sidebar_all_location_groups());

		expect(goto).toHaveBeenCalledWith('/?name=probe', GOTO_OPTIONS);
	});

	it('go back to the bare dashboard when no filter is left', async () => {
		appPage.url = new URL('http://localhost/?locationGroup=Farm');
		render({ locationGroups: ['Farm'] });
		await expect.poll(() => filterItems().length).toBe(2);
		openFilters();

		pickFilter(m.sidebar_all_location_groups());

		expect(goto).toHaveBeenCalledWith('/', GOTO_OPTIONS);
	});

	it('close the expanded navigation on smaller screens once a filter is picked', async () => {
		await browserPage.viewport(...TABLET);
		render({ locationGroups: ['Farm'] });
		await expect.poll(() => nav().classList.contains('cw-sidenav--mini')).toBe(true);
		document.querySelector<HTMLButtonElement>('.cw-sidenav__toggle--mini')?.click();
		flushSync();
		openFilters();

		pickFilter('Farm');

		expect(goto).toHaveBeenCalledWith('/?locationGroup=Farm', GOTO_OPTIONS);
		expect(nav().classList.contains('cw-sidenav--hidden')).toBe(true);
	});
});

describe('Sidebar session footer', () => {
	it('counts down to the end of the session', async () => {
		render({ session: session('grower@example.com', Math.floor(Date.now() / 1000) + 3_600) });

		await expect
			.poll(() => document.querySelector('.app-sidebar__session-copy')?.textContent)
			.toContain(m.sidebar_current_session_expires());
		expect(document.querySelector('.app-sidebar__session-copy time.cw-duration')).not.toBeNull();
		expect(pageLoads.urls).toEqual([]);
	});

	it('has no countdown without a session', async () => {
		render({ session: null });

		await expect.poll(() => nav().classList.contains('cw-sidenav--open')).toBe(true);
		expect(document.querySelector('.app-sidebar__session-copy')).toBeNull();
	});

	it('only shows an expired session as over, leaving the redirect to the layout', async () => {
		appPage.url = new URL('http://localhost/rules?page=2');

		// Long past its expiry. Sending the user to sign in is the root layout's
		// session-expiry watcher's job; the countdown navigates nowhere itself.
		render({ session: session('grower@example.com', Math.floor(Date.now() / 1000) - 45) });

		await expect
			.poll(() =>
				document.querySelector('.app-sidebar__session-copy time.cw-duration')?.textContent?.trim()
			)
			.toBe('0s');
		await tick();
		expect(pageLoads.urls).toEqual([]);
	});
});
