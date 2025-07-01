import { getDarkMode } from '$lib/components/theme/theme.svelte';

/**
 * Color selection for various statistics keys.
 */
const colors: Record<string, string> = {
	humidity: 'blue',
	Humidity: 'blue',
	moisture: 'blue',
	Moisture: 'blue',
	soil_moisture: 'blue',
	Temperature: 'orange',
	temperature: 'orange',
	temperatureC: 'orange',
	temperature_c: 'orange',
	dew_point: 'orange',
	dew_pointC: 'orange',
	dewPointC: 'orange',
	soil_EC: 'violet',
	soil_ec: 'violet',
	ec: 'violet',
	soil_N: 'red',
	soil_n: 'red',
	soil_nitrogen: 'red',
	soil_P: 'red',
	soil_p: 'red',
	soil_phosphorus: 'red',
	soil_K: 'red',
	soil_k: 'red',
	soil_potassium: 'red',
	soil_PH: 'yellow',
	ph: 'yellow',
	soil_ph: 'yellow',
	co2_level: 'purple',
	co2: 'purple',
	vpd: 'red',
	rainfall: 'blue',
	pressure: 'green',
	wind_speed: 'yellow',
	lux: 'red',
	uv: 'red',
	uv_index: 'red',
	soil_temperature: 'orange',
	soil_temperatureC: 'orange',
	soil_humidity: 'sky',
	wind_direction: 'red',
	water_level: 'blue',
	battery_level: 'red',
	battery: 'red',
	Battery: 'red',
	sos: 'red',
	people_count: 'orange',
	car_count: 'yellow',
	bicycle_count: 'red',
	truck_count: 'blue',
	bus_count: 'green'
};

/**
 * Get a color name associated with a given key. If the key is not found, it defaults to 'zinc'.
 */
export const getColorNameByKey = (key: string): string => colors[key] ?? 'red';

/**
 * Get the background color based on the key. If isMetadata is true, it returns a transparent color.
 * Otherwise, it returns a color based on the key.
 */
export const getBorderColorByKey = (key: string, isMetadata: boolean = false): string => {
	const color = getColorNameByKey(key);

	if (isMetadata) {
		return 'transparent';
	}

	return `var(--color-${color}-400)`;
};

/**
 * Get the text color based on the key. If isMetadata is true, it returns a gray color. Otherwise,
 * it returns a color based on the key.
 */
export const getTextColorByKey = (key: string, isMetadata: boolean = false): string => {
	const color = getColorNameByKey(key);

	if (isMetadata) {
		return 'var(--text-gray-400)';
	}

	return `var(--color-${color}-${getDarkMode() ? '400' : '500'})`;
};

/**
 * Default options for number formatting. This sets the maximum number of fraction digits to 1.
 */
const defaultNumberFormatOptions: Intl.NumberFormatOptions = { maximumFractionDigits: 1 };

/**
 * Custom format options for various statistics keys.
 */
const customNumberFormatOptions: Record<string, Intl.NumberFormatOptions> = {
	battery_level: { maximumFractionDigits: 0 },
	pressure: { maximumFractionDigits: 0 },
	lux: { maximumFractionDigits: 0 },
	people_count: { maximumFractionDigits: 0 },
	car_count: { maximumFractionDigits: 0 },
	bicycle_count: { maximumFractionDigits: 0 }
};

/**
 * Formats a number based on the provided key and locale. If the value is undefined, it returns
 * 'N/A'. If the key is not found in formatOptions, it defaults to a maximum of 1 decimal place.
 */
export const formatNumber = ({
	locale = 'en',
	key,
	value
}: {
	locale?: string;
	key: string;
	value: number | string | undefined;
}): string => {
	if (value === undefined) {
		return 'N/A';
	}

	const options = customNumberFormatOptions[key] ?? defaultNumberFormatOptions;

	return Intl.NumberFormat(locale, options).format(Number(value));
};
