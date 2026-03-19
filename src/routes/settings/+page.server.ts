import { getLocale } from '$lib/paraglide/runtime';
import type { PageServerLoad } from './$types';

type Option = {
	label: string;
	value: string;
};

type SupportedLocale = 'ja' | 'en';

type PreferenceDraft = {
	language: SupportedLocale;
	theme: 'dark' | 'light' | 'system';
	temperatureUnit: string;
	ecUnit: string;
	soilMoistureUnit: string;
	rainfallUnit: string;
	windSpeedUnit: string;
	pressureUnit: string;
	waterDepthUnit: string;
	co2Unit: string;
	distanceUnit: string;
	areaUnit: string;
	dateFormat: string;
	timeFormat: string;
	decimalSeparator: string;
	compactDashboard: boolean;
	showDerivedMetrics: boolean;
	includeUnitsInExports: boolean;
	highlightAlertThresholds: boolean;
};

const languageOptions: Option[] = [
	{ label: 'Japanese', value: 'ja' },
	{ label: 'English', value: 'en' }
];

const temperatureUnitOptions: Option[] = [
	{ label: 'Celsius (C)', value: 'celsius' },
	{ label: 'Fahrenheit (F)', value: 'fahrenheit' },
	{ label: 'Kelvin (K)', value: 'kelvin' }
];

const ecUnitOptions: Option[] = [
	{ label: 'uS/cm', value: 'us_cm' },
	{ label: 'mS/cm', value: 'ms_cm' },
	{ label: 'dS/m', value: 'ds_m' },
	{ label: 'dS/cm', value: 'ds_cm' }
];

const soilMoistureUnitOptions: Option[] = [
	{ label: 'VWC (%)', value: 'vwc_percent' },
	{ label: 'Relative saturation (%)', value: 'relative_percent' },
	{ label: 'kPa', value: 'kpa' },
	{ label: 'centibar', value: 'centibar' }
];

const rainfallUnitOptions: Option[] = [
	{ label: 'Millimeters (mm)', value: 'mm' },
	{ label: 'Centimeters (cm)', value: 'cm' },
	{ label: 'Inches (in)', value: 'in' }
];

const windSpeedUnitOptions: Option[] = [
	{ label: 'Meters per second (m/s)', value: 'm_s' },
	{ label: 'Kilometers per hour (km/h)', value: 'km_h' },
	{ label: 'Miles per hour (mph)', value: 'mph' },
	{ label: 'Knots (kt)', value: 'kt' }
];

const pressureUnitOptions: Option[] = [
	{ label: 'hPa', value: 'hpa' },
	{ label: 'kPa', value: 'kpa' },
	{ label: 'bar', value: 'bar' },
	{ label: 'PSI', value: 'psi' }
];

const waterDepthUnitOptions: Option[] = [
	{ label: 'Centimeters (cm)', value: 'cm' },
	{ label: 'Meters (m)', value: 'm' },
	{ label: 'Inches (in)', value: 'in' },
	{ label: 'Feet (ft)', value: 'ft' }
];

const co2UnitOptions: Option[] = [
	{ label: 'PPM', value: 'ppm' },
	{ label: 'mg/m3', value: 'mg_m3' }
];

const distanceUnitOptions: Option[] = [
	{ label: 'Kilometers (km)', value: 'km' },
	{ label: 'Miles (mi)', value: 'mi' }
];

const areaUnitOptions: Option[] = [
	{ label: 'Hectares (ha)', value: 'hectares' },
	{ label: 'Acres (ac)', value: 'acres' },
	{ label: 'Square meters (m2)', value: 'square_meters' }
];

const dateFormatOptions: Option[] = [
	{ label: 'YYYY-MM-DD', value: 'yyyy_mm_dd' },
	{ label: 'DD/MM/YYYY', value: 'dd_mm_yyyy' },
	{ label: 'MM/DD/YYYY', value: 'mm_dd_yyyy' }
];

const timeFormatOptions: Option[] = [
	{ label: '24-hour', value: '24h' },
	{ label: '12-hour', value: '12h' }
];

const decimalSeparatorOptions: Option[] = [
	{ label: 'Dot (1,234.56)', value: 'dot' },
	{ label: 'Comma (1.234,56)', value: 'comma' }
];

const readString = (value: unknown): string => {
	if (typeof value !== 'string') {
		return '';
	}

	return value.trim();
};

const createDefaultPreferences = (locale: string): PreferenceDraft => ({
	language: locale.startsWith('en') ? 'en' : 'ja',
	theme: 'system',
	temperatureUnit: 'celsius',
	ecUnit: 'us_cm',
	soilMoistureUnit: 'vwc_percent',
	rainfallUnit: 'mm',
	windSpeedUnit: 'm_s',
	pressureUnit: 'hpa',
	waterDepthUnit: 'cm',
	co2Unit: 'ppm',
	distanceUnit: 'km',
	areaUnit: 'hectares',
	dateFormat: 'yyyy_mm_dd',
	timeFormat: '24h',
	decimalSeparator: 'dot',
	compactDashboard: false,
	showDerivedMetrics: true,
	includeUnitsInExports: true,
	highlightAlertThresholds: true
});

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.jwt ?? null;
	const locale = getLocale();

	return {
		email: readString(session?.email) || null,
		role: readString(session?.role) || null,
		preferences: createDefaultPreferences(locale),
		options: {
			language: languageOptions,
			temperature: temperatureUnitOptions,
			ec: ecUnitOptions,
			soilMoisture: soilMoistureUnitOptions,
			rainfall: rainfallUnitOptions,
			windSpeed: windSpeedUnitOptions,
			pressure: pressureUnitOptions,
			waterDepth: waterDepthUnitOptions,
			co2: co2UnitOptions,
			distance: distanceUnitOptions,
			area: areaUnitOptions,
			dateFormat: dateFormatOptions,
			timeFormat: timeFormatOptions,
			decimalSeparator: decimalSeparatorOptions
		}
	};
};
