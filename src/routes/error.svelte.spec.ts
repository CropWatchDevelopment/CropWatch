import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import ErrorPage from './+error.svelte';

const { goto, appPage } = vi.hoisted(() => ({
	goto: vi.fn(),
	appPage: {
		url: new URL('http://localhost/locations/8'),
		params: {},
		data: {},
		error: null as { message?: string } | null,
		status: 500 as number | undefined
	}
}));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/state', () => ({ page: appPage }));

/**
 * Full page loads (`window.location.href = …`) are recorded and cancelled
 * through the Navigation API, so the test page stays put.
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

let view: ReturnType<typeof renderWithServices> | null = null;

function render(status: number | undefined, error: { message?: string } | null) {
	appPage.status = status;
	appPage.error = error;
	view = renderWithServices(ErrorPage);
	return view;
}

const statusCode = () => document.querySelector('.text-6xl')?.textContent?.trim();
const title = () => document.querySelector('h1')?.textContent?.trim();
const description = () => document.querySelector('p.text-center')?.textContent?.trim();
const emoji = () =>
	document.querySelector('.text-5xl')?.childNodes[0]?.textContent?.trim() ??
	document.querySelector('.text-5xl')?.textContent?.trim();
const button = (id: string) => document.getElementById(id) as HTMLButtonElement;

beforeEach(() => {
	appPage.error = null;
	appPage.status = 500;
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
	vi.restoreAllMocks();
});

describe('error page', () => {
	it.each([
		[400, () => m.error_bad_request_title(), () => m.error_bad_request_description()],
		[401, () => m.error_unauthorized_title(), () => m.error_unauthorized_description()],
		[403, () => m.error_forbidden_title(), () => m.error_forbidden_description()],
		[404, () => m.error_not_found_title(), () => m.error_not_found_description()],
		[408, () => m.error_timeout_title(), () => m.error_timeout_description()],
		[429, () => m.error_too_many_requests_title(), () => m.error_too_many_requests_description()],
		[500, () => m.error_internal_server_title(), () => m.error_internal_server_description()],
		[502, () => m.error_bad_gateway_title(), () => m.error_bad_gateway_description()],
		[
			503,
			() => m.error_service_unavailable_title(),
			() => m.error_service_unavailable_description()
		],
		[504, () => m.error_gateway_timeout_title(), () => m.error_gateway_timeout_description()]
	])('explains a %i', (status, expectedTitle, expectedDescription) => {
		render(status, {});

		expect(statusCode()).toBe(String(status));
		expect(title()).toBe(expectedTitle());
		expect(description()).toBe(expectedDescription());
	});

	// What SvelteKit and the handleError hooks put in `page.error.message` when
	// nothing more is known: English placeholders, not text for users.
	it.each([
		[404, 'Not Found', () => m.error_not_found_title(), () => m.error_not_found_description()],
		[
			500,
			'Internal Error',
			() => m.error_internal_server_title(),
			() => m.error_internal_server_description()
		],
		[
			400,
			'Internal Error',
			() => m.error_bad_request_title(),
			() => m.error_bad_request_description()
		],
		[403, 'Forbidden', () => m.error_forbidden_title(), () => m.error_forbidden_description()],
		[502, 'Error: 502', () => m.error_bad_gateway_title(), () => m.error_bad_gateway_description()]
	])(
		'explains a %i in words, not with the generic "%s"',
		(status, message, expectedTitle, expectedDescription) => {
			render(status, { message });

			expect(title()).toBe(expectedTitle());
			expect(description()).toBe(expectedDescription());
		}
	);

	it('shows a message the app gave the error itself', () => {
		render(404, { message: m.rules_new_rule_template_not_found() });

		expect(title()).toBe(m.error_not_found_title());
		expect(description()).toBe(m.rules_new_rule_template_not_found());
	});

	it('falls back to a generic explanation for other statuses', () => {
		render(418, {});

		expect(statusCode()).toBe('418');
		expect(title()).toBe(m.error_unexpected_title());
		expect(description()).toBe(m.error_unknown());
	});

	it('shows the message of an unexpected status, unless it is a generic one', () => {
		render(418, { message: "I'm a teapot" });
		expect(title()).toBe(m.error_unexpected_title());
		expect(description()).toBe("I'm a teapot");
		view?.unmount();

		render(418, { message: 'Internal Error' });
		expect(description()).toBe(m.error_unknown());
	});

	it('treats an error without a status as a 500', () => {
		render(undefined, { message: 'Internal Error' });

		expect(statusCode()).toBe('500');
		expect(title()).toBe(m.error_internal_server_title());
		expect(description()).toBe(m.error_internal_server_description());
	});

	it('treats a missing error as a 500 whatever the status', () => {
		render(404, null);

		expect(statusCode()).toBe('500');
		expect(title()).toBe(m.error_internal_server_title());
		expect(description()).toBe(m.error_internal_server_description());
	});

	it.each([
		[500, '💣'],
		[404, '🔍'],
		[401, '🔒'],
		[403, '⚠️'],
		[418, '⚠️']
	])('marks a %i with %s', (status, expected) => {
		render(status, {});

		expect(emoji()).toBe(expected);
	});

	it('goes home', () => {
		render(404, {});

		button('error-home-button').click();

		expect(button('error-home-button').textContent?.trim()).toBe(m.action_go_home());
		expect(goto).toHaveBeenCalledWith('/');
	});

	it('goes back', () => {
		const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
		render(404, {});

		button('error-back-button').click();

		expect(button('error-back-button').textContent?.trim()).toBe(m.action_go_back());
		expect(back).toHaveBeenCalledTimes(1);
	});

	it('clears all local state and signs in again', async () => {
		const pageLoads = interceptPageLoads();
		localStorage.setItem('cropwatch.dashboard.view', 'cards');
		sessionStorage.setItem('draft', 'x');
		document.cookie = 'cw_error_test=1; path=/';
		render(500, {});

		try {
			button('error-reset-login-button').click();

			expect(button('error-reset-login-button').textContent?.trim()).toBe(
				m.error_reset_and_login()
			);
			expect(localStorage.length).toBe(0);
			expect(sessionStorage.length).toBe(0);
			expect(document.cookie).not.toContain('cw_error_test');
			await expect
				.poll(() => pageLoads.urls)
				.toEqual([new URL('/auth/login?reason=error-recovery', location.origin).href]);
		} finally {
			pageLoads.stop();
		}
	});
});
