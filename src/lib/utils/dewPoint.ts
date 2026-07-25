/**
 * Dew point from air temperature and relative humidity via the Magnus
 * approximation (Alduchov & Eskridge coefficients, accurate to ~0.1 °C over
 * -40…+50 °C). `cw_air_data` has no stored dew point column, so it is always
 * derived client-side from the two readings every air device reports.
 */
const MAGNUS_A = 17.625;
const MAGNUS_B = 243.04; // °C

/**
 * Compute the dew point in °C, or `null` when either input is missing,
 * non-finite, or the humidity is outside the physically valid (0, 100] range.
 */
export function computeDewPoint(temperatureC: number, humidity: number): number | null {
	if (!Number.isFinite(temperatureC) || !Number.isFinite(humidity)) return null;
	if (humidity <= 0 || humidity > 100) return null;
	const gamma = Math.log(humidity / 100) + (MAGNUS_A * temperatureC) / (MAGNUS_B + temperatureC);
	return (MAGNUS_B * gamma) / (MAGNUS_A - gamma);
}
