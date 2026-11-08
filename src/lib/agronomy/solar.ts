/**
 * Where the sun is: its elevation above the horizon for a place and moment,
 * from NOAA's general solar position equations (accurate to well under a
 * degree, which is plenty for spreading a day's light over its hours).
 */

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;

export interface Coordinates {
	/** Degrees north (negative south). */
	lat: number;
	/** Degrees east (negative west). */
	long: number;
}

/** Valid coordinates, or null (a missing or impossible latitude/longitude). */
export function toCoordinates(lat: unknown, long: unknown): Coordinates | null {
	const la = typeof lat === 'string' && lat.trim() !== '' ? Number(lat) : lat;
	const lo = typeof long === 'string' && long.trim() !== '' ? Number(long) : long;
	if (typeof la !== 'number' || typeof lo !== 'number') return null;
	if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
	if (Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
	return { lat: la, long: lo };
}

/** The sun's elevation above the horizon in degrees (negative below it). */
export function solarElevation(date: Date, { lat, long }: Coordinates): number {
	const year = date.getUTCFullYear();
	const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	const dayOfYear = Math.floor((date.getTime() - Date.UTC(year, 0, 1)) / DAY_MS) + 1;
	const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

	// Fractional year (radians), then the equation of time (minutes) and the
	// sun's declination (radians).
	const g = ((2 * Math.PI) / (isLeapYear ? 366 : 365)) * (dayOfYear - 1 + (utcHours - 12) / 24);
	const equationOfTime =
		229.18 *
		(0.000075 +
			0.001868 * Math.cos(g) -
			0.032077 * Math.sin(g) -
			0.014615 * Math.cos(2 * g) -
			0.040849 * Math.sin(2 * g));
	const declination =
		0.006918 -
		0.399912 * Math.cos(g) +
		0.070257 * Math.sin(g) -
		0.006758 * Math.cos(2 * g) +
		0.000907 * Math.sin(2 * g) -
		0.002697 * Math.cos(3 * g) +
		0.00148 * Math.sin(3 * g);

	const trueSolarMinutes = utcHours * 60 + equationOfTime + 4 * long;
	const hourAngle = (trueSolarMinutes / 4 - 180) * RAD;
	const latitude = lat * RAD;
	const cosZenith =
		Math.sin(latitude) * Math.sin(declination) +
		Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
	return 90 - Math.acos(Math.max(-1, Math.min(1, cosZenith))) / RAD;
}

/**
 * The sun's elevation at the published sunrise and sunset: its upper edge on
 * the horizon, lifted by refraction.
 */
export const SUNSET_ELEVATION = -0.833;

const MINUTE_MS = 60_000;

/**
 * The next sunset after `from`, to the minute; null when the sun does not set
 * within a day (polar day or night).
 */
export function nextSunset(from: Date, coordinates: Coordinates): Date | null {
	let wasUp = solarElevation(from, coordinates) > SUNSET_ELEVATION;
	for (let t = from.getTime() + MINUTE_MS; t <= from.getTime() + DAY_MS; t += MINUTE_MS) {
		const up = solarElevation(new Date(t), coordinates) > SUNSET_ELEVATION;
		if (wasUp && !up) return new Date(t);
		wasUp = up;
	}
	return null;
}
