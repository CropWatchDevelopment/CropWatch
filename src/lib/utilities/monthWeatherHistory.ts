// WMO Weather interpretation codes for icons
const getWeatherIcon = (weatherCode: number | null) => {
	if (weatherCode === null) return '❓';
	const iconMap: { [key: number]: string } = {
		0: '☀️', // Clear sky
		1: '🌤️', // Mainly clear
		2: '⛅', // Partly cloudy
		3: '☁️', // Overcast
		45: '🌫️', // Fog
		48: '🌫️', // Depositing rime fog
		51: '🌦️', // Light drizzle
		53: '🌦️', // Moderate drizzle
		55: '🌦️', // Dense drizzle
		56: '🌧️', // Light freezing drizzle
		57: '🌧️', // Dense freezing drizzle
		61: '🌧️', // Slight rain
		63: '🌧️', // Moderate rain
		65: '🌧️', // Heavy rain
		66: '🌧️', // Light freezing rain
		67: '🌧️', // Heavy freezing rain
		71: '🌨️', // Slight snow fall
		73: '🌨️', // Moderate snow fall
		75: '🌨️', // Heavy snow fall
		77: '🌨️', // Snow grains
		80: '🌦️', // Slight rain showers
		81: '🌦️', // Moderate rain showers
		82: '🌦️', // Violent rain showers
		85: '🌨️', // Slight snow showers
		86: '🌨️', // Heavy snow showers
		95: '⛈️', // Thunderstorm
		96: '⛈️', // Thunderstorm with slight hail
		99: '⛈️' // Thunderstorm with heavy hail
	};
	return iconMap[weatherCode] || '❓';
};

const getWeatherDescription = (weatherCode: number | null) => {
	if (weatherCode === null) return 'Unknown';
	const descriptionMap: { [key: number]: string } = {
		0: 'Clear sky',
		1: 'Mainly clear',
		2: 'Partly cloudy',
		3: 'Overcast',
		45: 'Fog',
		48: 'Depositing rime fog',
		51: 'Light drizzle',
		53: 'Moderate drizzle',
		55: 'Dense drizzle',
		56: 'Light freezing drizzle',
		57: 'Dense freezing drizzle',
		61: 'Slight rain',
		63: 'Moderate rain',
		65: 'Heavy rain',
		66: 'Light freezing rain',
		67: 'Heavy freezing rain',
		71: 'Slight snow fall',
		73: 'Moderate snow fall',
		75: 'Heavy snow fall',
		77: 'Snow grains',
		80: 'Slight rain showers',
		81: 'Moderate rain showers',
		82: 'Violent rain showers',
		85: 'Slight snow showers',
		86: 'Heavy snow showers',
		95: 'Thunderstorm',
		96: 'Thunderstorm with slight hail',
		99: 'Thunderstorm with heavy hail'
	};
	return descriptionMap[weatherCode] || 'Unknown';
};

// Cache management
interface WeatherCacheEntry {
	date: string;
	weather: {
		maxtemp_c: number | null;
		mintemp_c: number | null;
		totalprecip_mm: number;
		condition: {
			text: string;
			icon: string;
			code: number | null;
		};
	};
	cachedAt: number; // timestamp
}

interface WeatherCache {
	[key: string]: WeatherCacheEntry; // key is the date string
}

const CACHE_KEY = 'cropwatch_weather_cache';
const CACHE_EXPIRY_HOURS = 800; // Cache expires after 800 hours (slightly over a month)
const getCurrentYear = () => new Date().getFullYear();

// Get cached weather data
function getWeatherCache(): WeatherCache {
	if (typeof window === 'undefined') return {};

	try {
		const cached = localStorage.getItem(CACHE_KEY);
		if (!cached) return {};

		const cache: WeatherCache = JSON.parse(cached);
		const now = Date.now();
		const currentYear = getCurrentYear();

		// Filter out expired entries and entries from other years
		const validCache: WeatherCache = {};
		Object.entries(cache).forEach(([date, entry]) => {
			const entryYear = new Date(date).getFullYear();
			const isCurrentYear = entryYear === currentYear;
			const isNotExpired = now - entry.cachedAt < CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

			if (isCurrentYear && isNotExpired) {
				validCache[date] = entry;
			}
		});

		return validCache;
	} catch (error) {
		console.warn('Failed to read weather cache:', error);
		return {};
	}
}

// Save weather data to cache
function setWeatherCache(weatherData: WeatherCacheEntry[]): void {
	if (typeof window === 'undefined') return;

	try {
		const existingCache = getWeatherCache();
		const now = Date.now();

		// Add new entries to cache
		weatherData.forEach((entry) => {
			existingCache[entry.date] = {
				...entry,
				cachedAt: now
			};
		});

		localStorage.setItem(CACHE_KEY, JSON.stringify(existingCache));
		//console.log(`Cached ${weatherData.length} weather entries`);
	} catch (error) {
		console.warn('Failed to save weather cache:', error);
	}
}

// Get missing dates that need to be fetched
function getMissingDates(startDate: Date, endDate: Date): { start: Date; end: Date } | null {
	const cache = getWeatherCache();
	const current = new Date(startDate);
	const end = new Date(endDate);

	const missingDates: string[] = [];

	while (current <= end) {
		const dateStr = current.toISOString().split('T')[0];
		if (!cache[dateStr]) {
			missingDates.push(dateStr);
		}
		current.setDate(current.getDate() + 1);
	}

	if (missingDates.length === 0) {
		return null; // All dates are cached
	}

	// Find continuous ranges to minimize API calls
	const firstMissing = new Date(missingDates[0]);
	const lastMissing = new Date(missingDates[missingDates.length - 1]);

	return { start: firstMissing, end: lastMissing };
}

export async function fetchHistoricalWeather(
	startDate: Date,
	endDate: Date,
	latitude: number = 34.6937,
	longitude: number = 135.5023
): Promise<any[]> {
	//console.log(
	//	`Fetching weather data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
	//);

	// Check cache first
	const cache = getWeatherCache();
	const cachedResults: WeatherCacheEntry[] = [];

	// Collect cached data for the requested range
	const current = new Date(startDate);
	const end = new Date(endDate);

	while (current <= end) {
		const dateStr = current.toISOString().split('T')[0];
		if (cache[dateStr]) {
			cachedResults.push(cache[dateStr]);
		}
		current.setDate(current.getDate() + 1);
	}

	// Check if we need to fetch missing data
	const missingRange = getMissingDates(startDate, endDate);

	if (!missingRange) {
		//console.log('All data available in cache');
		return cachedResults.sort((a, b) => a.date.localeCompare(b.date));
	}

	// Fetch missing data from API
	// test
	const startDateStr = missingRange.start.toISOString().split('T')[0];
	const endDateStr = missingRange.end.toISOString().split('T')[0];

	//console.log(`Fetching missing data from ${startDateStr} to ${endDateStr}`);

	// Open-Meteo Historical Weather API
	const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDateStr}&end_date=${endDateStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto`;

	try {
		//console.log('Fetching weather from Open-Meteo:', url);
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Error fetching data: ${response.statusText}`);
		}

		const data = await response.json();
		//console.log('Open-Meteo response:', data);

		let newResults: WeatherCacheEntry[] = [];

		// Check if the response has the expected structure
		if (data.daily && data.daily.time && data.daily.time.length > 0) {
			newResults = data.daily.time.map((date: string, index: number) => ({
				date,
				weather: {
					maxtemp_c: data.daily.temperature_2m_max[index] ?? null,
					mintemp_c: data.daily.temperature_2m_min[index] ?? null,
					totalprecip_mm: data.daily.precipitation_sum[index] ?? 0,
					condition: {
						text: getWeatherDescription(data.daily.weather_code[index] ?? null),
						icon: getWeatherIcon(data.daily.weather_code[index] ?? null),
						code: data.daily.weather_code[index] ?? null
					}
				},
				cachedAt: Date.now()
			}));

			// Cache the new results
			setWeatherCache(newResults);
			//console.log(`Fetched and cached ${newResults.length} new entries`);
		} else {
			console.warn('No weather data available in response:', data);
		}

		// Combine cached and new results
		const allResults = [...cachedResults, ...newResults];

		// Filter to only return data within the requested range and sort by date
		const filteredResults = allResults
			.filter((entry) => {
				const entryDate = new Date(entry.date);
				return entryDate >= startDate && entryDate <= endDate;
			})
			.sort((a, b) => a.date.localeCompare(b.date));

		//console.log(`Returning ${filteredResults.length} total weather entries`);
		return filteredResults;
	} catch (error) {
		console.error('Failed to fetch weather data:', error);
		// Return cached data even if API fails
		if (cachedResults.length > 0) {
			//console.log('API failed, returning cached data only');
			return cachedResults.sort((a, b) => a.date.localeCompare(b.date));
		}
		return [];
	}
}

// Utility function to clear old cache entries (optional)
export function clearWeatherCache(): void {
	if (typeof window !== 'undefined') {
		localStorage.removeItem(CACHE_KEY);
		//console.log('Weather cache cleared');
	}
}

// Utility function to get cache statistics (optional)
export function getWeatherCacheStats(): {
	entries: number;
	oldestEntry: string | null;
	newestEntry: string | null;
} {
	const cache = getWeatherCache();
	const entries = Object.keys(cache).length;

	if (entries === 0) {
		return { entries: 0, oldestEntry: null, newestEntry: null };
	}

	const dates = Object.keys(cache).sort();
	return {
		entries,
		oldestEntry: dates[0],
		newestEntry: dates[dates.length - 1]
	};
}
