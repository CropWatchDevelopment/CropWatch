import { describe, expect, it } from 'vitest';
import * as dashboardPage from './+page';

describe('dashboard page options', () => {
	it('is rendered per request, never prerendered', () => {
		expect(dashboardPage.prerender).toBe(false);
	});
});
