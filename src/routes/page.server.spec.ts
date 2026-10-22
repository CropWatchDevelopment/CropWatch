import { describe, expect, it } from 'vitest';
import { testEvent, testLocals } from '$lib/testing/server';
import { load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];

describe('dashboard page server load', () => {
	it('only exists as the route gate: the dashboard views load their own data', async () => {
		const locals = testLocals();
		const event = testEvent<LoadEvent>({ locals });

		await expect(load(event)).resolves.toEqual({});
		// Mock services reject every unstubbed call, so any request would have failed the load.
		expect(event.fetch).not.toHaveBeenCalled();
		expect(event.parent).not.toHaveBeenCalled();
	});
});
