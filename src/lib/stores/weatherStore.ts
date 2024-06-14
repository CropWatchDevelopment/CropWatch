import { writable } from 'svelte/store';

export const weatherData = writable({});

const CACHE_KEY_PREFIX = 'weatherDataCache_';
const CACHE_EXPIRY_KEY_PREFIX = 'weatherDataCacheExpiry_';
const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

function getCachedWeatherData(identifier: string) {
    const cacheKey = `${CACHE_KEY_PREFIX}${identifier}`;
    const cacheExpiryKey = `${CACHE_EXPIRY_KEY_PREFIX}${identifier}`;

    const cache = localStorage.getItem(cacheKey);
    const cacheExpiry = localStorage.getItem(cacheExpiryKey);

    if (cache && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
        return JSON.parse(cache);
    }
    return null;
}

function setCachedWeatherData(identifier: string, data: any) {
    const cacheKey = `${CACHE_KEY_PREFIX}${identifier}`;
    const cacheExpiryKey = `${CACHE_EXPIRY_KEY_PREFIX}${identifier}`;

    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(cacheExpiryKey, (Date.now() + CACHE_DURATION).toString());
}

export async function fetchWeatherData(lat: number, lng: number, location_id: string = null) {
    const identifier = location_id ? location_id : `${lat}_${lng}`;
    const cachedData = getCachedWeatherData(identifier);
    if (cachedData) {
        weatherData.update(currentData => ({ ...currentData, [identifier]: cachedData }));
        return cachedData;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

    if (!lat || !lng) {
        console.error('Invalid lat/lng:', lat, lng);
        return null;
    }
    
    try {
        const weatherRequest = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,is_day,rain,cloud_cover,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m&daily=uv_index_max`,
            { signal: controller.signal }
        );
        const weatherJSON = await weatherRequest.json();
        const result = convertApiResponseToResultIncludingLux(weatherJSON);
        if (result) {
            setCachedWeatherData(identifier, result);
            weatherData.update(currentData => ({ ...currentData, [identifier]: result }));
        }
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
        weatherData.update(currentData => ({ ...currentData, [identifier]: defaultData }));
        return defaultData;
    } finally {
        clearTimeout(timeoutId);
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

export function UVI_to_text(uvIndex: number) {
    if (uvIndex < 3) {
        return 'Low';
    }
    if (uvIndex < 6) {
        return 'Moderate';
    }
    if (uvIndex < 8) {
        return 'High';
    }
    if (uvIndex < 11) {
        return 'Very high';
    }
}

function convertApiResponseToResultIncludingLux(apiResponse: any) {
    const cloudCoverToLux = (cloudCover: number) => {
        return Math.max(0, 100000 - (cloudCover * 1000));
    };

    if (!apiResponse.error) {
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
    return null;
}
