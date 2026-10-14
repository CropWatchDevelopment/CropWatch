export interface Coordinates {
	lat: number;
	long: number;
}

export const isValidLatitude = (value: number) =>
	Number.isFinite(value) && value >= -90 && value <= 90;
export const isValidLongitude = (value: number) =>
	Number.isFinite(value) && value >= -180 && value <= 180;

const NUMBER = String.raw`[-+]?\d{1,3}(?:\.\d+)?`;

function checked(lat: number, long: number): Coordinates | null {
	return isValidLatitude(lat) && isValidLongitude(long) ? { lat, long } : null;
}

/**
 * Coordinates from text a user pasted: a "lat, long" pair (with or without
 * degree signs and N/S/E/W) or a Google Maps link. Returns null when nothing
 * usable is found — shortened maps.app.goo.gl links carry no coordinates.
 */
export function parseCoordinateText(input: string): Coordinates | null {
	const text = input.trim();
	if (!text) return null;

	// Place links: "!3d<lat>!4d<long>" is the place itself, "@lat,long" only the viewport.
	const place = text.match(new RegExp(`!3d(${NUMBER})!4d(${NUMBER})`));
	if (place) return checked(Number(place[1]), Number(place[2]));

	const viewport = text.match(new RegExp(`@(${NUMBER}),(${NUMBER})`));
	if (viewport) return checked(Number(viewport[1]), Number(viewport[2]));

	const query = text.match(
		new RegExp(`[?&](?:q|query|ll|center|destination)=(${NUMBER})(?:,|%2C)\\s*(${NUMBER})`, 'i')
	);
	if (query) return checked(Number(query[1]), Number(query[2]));

	// "31.9147, 131.4232", "31.9147 131.4232", "31.9147° N, 131.4232° E"
	const pair = text.match(
		new RegExp(`^(${NUMBER})\\s*°?\\s*([NS])?\\s*[,\\s]\\s*(${NUMBER})\\s*°?\\s*([EW])?$`, 'i')
	);
	if (pair) {
		const lat = Number(pair[1]) * (pair[2]?.toUpperCase() === 'S' ? -1 : 1);
		const long = Number(pair[3]) * (pair[4]?.toUpperCase() === 'W' ? -1 : 1);
		return checked(lat, long);
	}

	return null;
}

/**
 * Middle of the given points (simple average — devices in one location sit
 * close together), skipping missing and 0,0 placeholder positions.
 */
export function centreOf(
	points: { lat: number | null; long: number | null }[]
): Coordinates | null {
	const usable = points.filter(
		(point): point is Coordinates =>
			point.lat != null &&
			point.long != null &&
			!(point.lat === 0 && point.long === 0) &&
			checked(point.lat, point.long) !== null
	);
	if (usable.length === 0) return null;
	const round = (value: number) => Math.round(value * 1e6) / 1e6;
	return {
		lat: round(usable.reduce((sum, point) => sum + point.lat, 0) / usable.length),
		long: round(usable.reduce((sum, point) => sum + point.long, 0) / usable.length)
	};
}
