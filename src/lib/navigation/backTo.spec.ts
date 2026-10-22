import { describe, expect, it } from 'vitest';
import { backHref } from './backTo';

const url = (search: string) => new URL(`http://localhost/locations/8/devices/DEV-1${search}`);

describe('backHref', () => {
	it('falls back to the default destination without a backTo param', () => {
		expect(backHref(url(''), '/locations/8')).toBe('/locations/8');
		expect(backHref(url('?backTo='), '/locations/8')).toBe('/locations/8');
	});

	it('ignores a dashboard filter when there is nowhere to go back to', () => {
		expect(backHref(url('?filter=Greenhouse'), '/locations/8')).toBe('/locations/8');
	});

	it('returns to the page the user came from', () => {
		expect(backHref(url('?backTo=%2F'), '/locations/8')).toBe('/');
		expect(backHref(url('?backTo=%2Freports%3Ftab%3Dall'), '/locations/8')).toBe(
			'/reports?tab=all'
		);
	});

	it('re-applies a dashboard group filter as the locationGroup param', () => {
		expect(backHref(url('?backTo=%2F&filter=Greenhouse'), '/locations/8')).toBe(
			'/?locationGroup=Greenhouse'
		);
	});

	it('appends the filter to a destination that already has a query', () => {
		expect(backHref(url('?backTo=%2F%3Fview%3Dcards&filter=North'), '/locations/8')).toBe(
			'/?view=cards&locationGroup=North'
		);
	});

	it('encodes the filter value', () => {
		expect(backHref(url('?backTo=%2F&filter=North+%26+South'), '/')).toBe(
			'/?locationGroup=North%20%26%20South'
		);
		expect(backHref(url('?backTo=%2F&filter=%E6%B8%A9%E5%AE%A4'), '/')).toBe(
			`/?locationGroup=${encodeURIComponent('温室')}`
		);
	});

	it('leaves the destination unchanged for an empty filter', () => {
		expect(backHref(url('?backTo=%2F&filter='), '/locations/8')).toBe('/');
	});
});
