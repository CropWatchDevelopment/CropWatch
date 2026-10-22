import { describe, expect, it } from 'vitest';
import { testEvent } from '$lib/testing/server';
import { load } from './+page.server';

describe('gateways list load', () => {
	it('loads nothing: the table fetches its rows in the browser', async () => {
		await expect(load(testEvent<Parameters<typeof load>[0]>())).resolves.toEqual({});
	});
});
