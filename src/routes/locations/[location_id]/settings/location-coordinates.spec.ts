import { describe, expect, it } from 'vitest';
import { centreOf, parseCoordinateText } from './location-coordinates';

describe('parseCoordinateText', () => {
	it('reads plain pairs', () => {
		expect(parseCoordinateText('31.9147, 131.4232')).toEqual({ lat: 31.9147, long: 131.4232 });
		expect(parseCoordinateText(' 31.9147 131.4232 ')).toEqual({ lat: 31.9147, long: 131.4232 });
		expect(parseCoordinateText('-33.86,151.2')).toEqual({ lat: -33.86, long: 151.2 });
	});

	it('reads degree signs and hemispheres', () => {
		expect(parseCoordinateText('31.9147° N, 131.4232° E')).toEqual({
			lat: 31.9147,
			long: 131.4232
		});
		expect(parseCoordinateText('33.86 S, 151.2 E')).toEqual({ lat: -33.86, long: 151.2 });
		expect(parseCoordinateText('40.7 N, 74.0 W')).toEqual({ lat: 40.7, long: -74 });
	});

	it('prefers the place over the viewport in Google Maps place links', () => {
		expect(
			parseCoordinateText(
				'https://www.google.com/maps/place/Office/@31.91,131.42,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d31.914721!4d131.423226'
			)
		).toEqual({ lat: 31.914721, long: 131.423226 });
	});

	it('reads viewport and query links', () => {
		expect(parseCoordinateText('https://www.google.com/maps/@31.9147,131.4232,17z')).toEqual({
			lat: 31.9147,
			long: 131.4232
		});
		expect(
			parseCoordinateText('https://www.google.com/maps/search/?api=1&query=31.9147,131.4232')
		).toEqual({ lat: 31.9147, long: 131.4232 });
		expect(parseCoordinateText('https://maps.google.com/?q=31.9147%2C131.4232')).toEqual({
			lat: 31.9147,
			long: 131.4232
		});
	});

	it('rejects text without usable coordinates', () => {
		expect(parseCoordinateText('')).toBeNull();
		expect(parseCoordinateText('https://maps.app.goo.gl/AbCdEf123')).toBeNull();
		expect(parseCoordinateText('Miyazaki station')).toBeNull();
		expect(parseCoordinateText('95, 131')).toBeNull();
		expect(parseCoordinateText('31, 200')).toBeNull();
	});
});

describe('centreOf', () => {
	it('averages usable points and skips missing or 0,0 ones', () => {
		expect(
			centreOf([
				{ lat: 31.9, long: 131.4 },
				{ lat: 32.1, long: 131.6 },
				{ lat: null, long: 131 },
				{ lat: 0, long: 0 }
			])
		).toEqual({ lat: 32, long: 131.5 });
	});

	it('is null when no point is usable', () => {
		expect(centreOf([{ lat: null, long: null }])).toBeNull();
		expect(centreOf([])).toBeNull();
	});
});
