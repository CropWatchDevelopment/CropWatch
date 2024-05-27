import { writable } from 'svelte/store';

export const weatherData = writable({});

const CACHE_KEY_PREFIX = 'weatherDataCache_';
const CACHE_EXPIRY_KEY_PREFIX = 'weatherDataCacheExpiry_';
const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

function getCachedWeatherData(lat: number, lng: number) {
    const cacheKey = `${CACHE_KEY_PREFIX}${lat}_${lng}`;
    const cacheExpiryKey = `${CACHE_EXPIRY_KEY_PREFIX}${lat}_${lng}`;

    const cache = localStorage.getItem(cacheKey);
    const cacheExpiry = localStorage.getItem(cacheExpiryKey);

    if (cache && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
        return JSON.parse(cache);
    }
    return null;
}

function setCachedWeatherData(lat: number, lng: number, data: any) {
    const cacheKey = `${CACHE_KEY_PREFIX}${lat}_${lng}`;
    const cacheExpiryKey = `${CACHE_EXPIRY_KEY_PREFIX}${lat}_${lng}`;

    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(cacheExpiryKey, (Date.now() + CACHE_DURATION).toString());
}

export async function fetchWeatherData(lat: number, lng: number) {
    const cachedData = getCachedWeatherData(lat, lng);
    if (cachedData) {
        weatherData.update(currentData => ({ ...currentData, [`${lat}_${lng}`]: cachedData }));
        return cachedData;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

    try {
        const weatherRequest = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,is_day,rain,cloud_cover,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m&daily=uv_index_max`,
            { signal: controller.signal }
        );
        const weatherJSON = await weatherRequest.json();
        const result = convertApiResponseToResultIncludingLux(weatherJSON);
        setCachedWeatherData(lat, lng, result);
        weatherData.update(currentData => ({ ...currentData, [`${lat}_${lng}`]: result }));
        return result;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        const defaultData = {
            temperature: 0,
            humidity: 0,
            lux: 0,
            uv: 0,
            pressure: 0,
            windSpeed: 0,
            windDirection: 'N/A',
            rainfall: 0,
            weatherCode: 0,
        };
        weatherData.update(currentData => ({ ...currentData, [`${lat}_${lng}`]: defaultData }));
        return defaultData;
    }
}

export const degreesToDirection = (deg: number) => {
    if (deg >= 337.5 || deg < 22.5) {
        return 'N';
    } else if (deg >= 22.5 && deg < 67.5) {
        return 'NE';
    } else if (deg >= 67.5 && deg < 112.5) {
        return 'E';
    } else if (deg >= 112.5 && deg < 157.5) {
        return 'SE';
    } else if (deg >= 157.5 && deg < 202.5) {
        return 'S';
    } else if (deg >= 202.5 && deg < 247.5) {
        return 'SW';
    } else if (deg >= 247.5 && deg < 292.5) {
        return 'W';
    } else if (deg >= 292.5 && deg < 337.5) {
        return 'NW';
    } else {
        return 'N/A';
    }
};

function convertApiResponseToResultIncludingLux(apiResponse) {

    const cloudCoverToLux = (cloudCover: number) => {
        return Math.max(0, 100000 - (cloudCover * 1000));
    };

    const result = {
        temperature: apiResponse.current.temperature_2m || 0,
        humidity: apiResponse.current.relative_humidity_2m || 0,
        lux: apiResponse.current.cloud_cover !== undefined ? cloudCoverToLux(apiResponse.current.cloud_cover) : 0,
        uv: 0,
        pressure: apiResponse.current.surface_pressure || 0,
        windSpeed: apiResponse.current.wind_speed_10m || 0,
        windDirection: apiResponse.current.wind_direction_10m ? degreesToDirection(apiResponse.current.wind_direction_10m) : 'N/A',
        rainfall: apiResponse.current.rain || 0,
        weatherCode: apiResponse.current.weather_code || 0,
    };

    return result;
}
