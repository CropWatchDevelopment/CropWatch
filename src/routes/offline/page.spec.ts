import { describe, expect, it } from 'vitest';
import * as offlinePage from './+page';

describe('offline page options', () => {
	it('is a client-only page: never prerendered, never server-rendered', () => {
		expect(offlinePage.prerender).toBe(false);
		expect(offlinePage.ssr).toBe(false);
	});
});
