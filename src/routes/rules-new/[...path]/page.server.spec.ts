import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { testEvent, testLocals } from '$lib/testing/server';
import { load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];

/** The redirect the (synchronous) load throws for /rules-new/<path><search>. */
function redirectFor(path: string, search = '') {
	const locals = testLocals();
	try {
		void load(
			testEvent<LoadEvent>({
				locals,
				params: { path },
				url: `http://localhost/rules-new/${path}${search}`
			})
		);
	} catch (thrown) {
		if (!isRedirect(thrown)) throw thrown;
		return { status: thrown.status, location: thrown.location, locals };
	}
	throw new Error('expected a redirect');
}

describe('legacy /rules-new redirect', () => {
	it('sends /rules-new to /rules permanently', () => {
		expect(redirectFor('')).toMatchObject({ status: 301, location: '/rules' });
	});

	it.each([
		['create', '/rules/create'],
		['edit/12', '/rules/edit/12']
	])('keeps the rest of the path: /rules-new/%s → %s', (path, location) => {
		expect(redirectFor(path)).toMatchObject({ status: 301, location });
	});

	it('keeps the query string, so a device preselection survives', () => {
		expect(redirectFor('create', '?dev_eui=DEV-1')).toMatchObject({
			status: 301,
			location: '/rules/create?dev_eui=DEV-1'
		});
		expect(redirectFor('', '?backTo=%2Flocations%2F3')).toMatchObject({
			location: '/rules?backTo=%2Flocations%2F3'
		});
	});

	it('does not call the API', () => {
		const { locals } = redirectFor('edit/12');

		expect(locals.services.rules.getRuleFormContext).not.toHaveBeenCalled();
		expect(locals.services.rules.getRuleTemplates).not.toHaveBeenCalled();
	});
});
