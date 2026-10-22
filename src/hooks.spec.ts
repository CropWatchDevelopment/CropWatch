import { describe, expect, it } from 'vitest';
import { reroute } from './hooks';

const route = (href: string) => reroute({ url: new URL(href) } as Parameters<typeof reroute>[0]);

describe('reroute', () => {
	it('serves English URLs from the same routes as the Japanese (base locale) ones', () => {
		expect(route('http://localhost/en/locations/8')).toBe('/locations/8');
		expect(route('http://localhost/en/')).toBe('/');
	});

	it('leaves base-locale URLs as they are', () => {
		expect(route('http://localhost/locations/8')).toBe('/locations/8');
		expect(route('http://localhost/')).toBe('/');
	});

	it('routes on the path only', () => {
		expect(route('http://localhost/en/rules?page=2#top')).toBe('/rules');
	});
});
