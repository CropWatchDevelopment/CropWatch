import { writable } from 'svelte/store';

const cacheDuration = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

function createWeatherDataStore() {
	const weatherDataStore = writable({});

	// Function to fetch weather data for a given location
	async function fetchWeatherData(lat: number, lng: number, locationId: string) {
		const cachedData = localStorage.getItem(`weatherData_${locationId}`);
		const cacheTime = localStorage.getItem(`weatherDataCacheTime_${locationId}`);
		const currentTime = Date.now();

		// Check if data is cached and still valid
		if (cachedData && cacheTime && currentTime - parseInt(cacheTime) < cacheDuration) {
			updateStore(locationId, JSON.parse(cachedData));
			return;
		}

		try {
			const controller = new AbortController();
			if (lat != null && lng != null) {
				const weatherRequest = await fetch(
					`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&wind_speed_unit=ms&current=temperature_2m,relative_humidity_2m,is_day,rain,cloud_cover,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m&daily=uv_index_max`,
					{ signal: controller.signal }
				);

				if (!weatherRequest.ok) throw new Error('Failed to fetch weather data.');

				const data = await weatherRequest.json();
				updateStore(locationId, data);

				// Cache the data
				localStorage.setItem(`weatherData_${locationId}`, JSON.stringify(data));
				localStorage.setItem(`weatherDataCacheTime_${locationId}`, `${Date.now()}`);
			}
		} catch (error) {
			console.error('Error fetching weather data:', error);
		}
	}

	// Update the store with the specific location's data
	function updateStore(locationId: string, data: any) {
		weatherDataStore.update((storeData) => ({
			...storeData,
			[locationId]: data,
		}));
	}

	return {
		subscribe: weatherDataStore.subscribe,
		fetchWeatherData,
	};
}

export const locationWeatherDataStore = createWeatherDataStore();
