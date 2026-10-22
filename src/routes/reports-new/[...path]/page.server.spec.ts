import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { testEvent, testLocals } from '$lib/testing/server';
import { load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];

/** The redirect the load throws for `/reports-new/<path>`, as `{ status, location }`. */
async function redirectFor(path: string, url = `http://localhost/reports-new/${path}`) {
	let thrown: unknown = new Error('expected the load to redirect');
	try {
		await load(testEvent<LoadEvent>({ params: { path }, url }));
	} catch (error) {
		thrown = error;
	}
	if (!isRedirect(thrown)) throw thrown;
	return { status: thrown.status, location: thrown.location };
}

describe('reports-new redirect', () => {
	it('sends the old list page to /reports, permanently', async () => {
		await expect(redirectFor('')).resolves.toEqual({ status: 301, location: '/reports' });
	});

	it.each([
		['create', '/reports/create'],
		['edit/12', '/reports/edit/12'],
		['edit/12/data/DEV-1', '/reports/edit/12/data/DEV-1']
	])('keeps the rest of an old bookmark: /reports-new/%s', async (path, location) => {
		await expect(redirectFor(path)).resolves.toEqual({ status: 301, location });
	});

	it('keeps the query string, so a device preselection survives', async () => {
		await expect(
			redirectFor('create', 'http://localhost/reports-new/create?dev_eui=DEV-1')
		).resolves.toEqual({ status: 301, location: '/reports/create?dev_eui=DEV-1' });
		await expect(
			redirectFor('edit/12/data/DEV-1', 'http://localhost/reports-new/edit/12/data/DEV-1?a=1&b=2')
		).resolves.toEqual({ status: 301, location: '/reports/edit/12/data/DEV-1?a=1&b=2' });
	});

	it('redirects without touching the API or the session', async () => {
		const locals = testLocals({ jwtString: null });
		let thrown: unknown;
		try {
			await load(testEvent<LoadEvent>({ locals, params: { path: 'create' } }));
		} catch (error) {
			thrown = error;
		}

		expect(isRedirect(thrown)).toBe(true);
		expect(locals.services.reports.getReportTemplates).not.toHaveBeenCalled();
		expect(locals.services.reports.getReportFormContext).not.toHaveBeenCalled();
	});
});
