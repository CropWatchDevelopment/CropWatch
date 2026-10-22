import { afterEach, describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import LogoutPage from './+page.svelte';

let view: ReturnType<typeof renderWithServices> | null = null;

afterEach(() => {
	view?.unmount();
	view = null;
});

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

describe('logout page', () => {
	// Shown for a GET of /auth/logout (an old link, or another site linking
	// here): signing out itself is the POST action (see page.server.spec.ts).
	it('asks before signing out, in the user’s language', () => {
		view = renderWithServices(LogoutPage);

		expect(view.target.querySelector('h1')?.textContent).toBe(m.auth_sign_out_title());
		expect(view.target.textContent).toContain(m.auth_sign_out_description());
	});

	it('signs out with a POST to this URL (keeping its ?redirect=), or goes back', () => {
		view = renderWithServices(LogoutPage);

		const form = byId<HTMLFormElement>('logout-form');
		expect(form.method).toBe('post');
		expect(form.hasAttribute('action')).toBe(false);
		const submit = byId<HTMLButtonElement>('logout-submit-button');
		expect(submit.type).toBe('submit');
		expect(submit.textContent?.trim()).toBe(m.nav_logout());
		expect(byId<HTMLAnchorElement>('logout-cancel-link').getAttribute('href')).toBe('/');
		expect(byId<HTMLAnchorElement>('logout-cancel-link').textContent?.trim()).toBe(
			m.action_cancel()
		);
	});
});
