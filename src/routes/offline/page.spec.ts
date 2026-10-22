import { describe, expect, it } from 'vitest';
import * as offlinePage from './+page';

describe('offline page options', () => {
	it('is server-rendered on request and never hydrated', () => {
		expect(offlinePage.prerender).toBe(false);
		expect(offlinePage.csr).toBe(false);
		expect('ssr' in offlinePage).toBe(false);
	});
});
