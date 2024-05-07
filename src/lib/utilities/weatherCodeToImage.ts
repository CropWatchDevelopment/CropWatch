import day_clear from '$lib/images/weather/day/c01d.png';
import night_clear from '$lib/images/weather/night/c01n.png';

import partlyCloudyDay from '$lib/images/weather/day/c02d.png';
import partlyCloudyNight from '$lib/images/weather/night/c02n.png';

import partlyFoggyDay from '$lib/images/weather/day/a01d.png';
import partlyFoggyNight from '$lib/images/weather/night/a01n.png';

import drizzleDay from '$lib/images/weather/day/d01d.png';
import drizzleNight from '$lib/images/weather/night/d02n.png';

import freezingDrizzleDay from '$lib/images/weather/day/f01d.png';
import freezingDrizzleNight from '$lib/images/weather/night/f01n.png';

import rainDay from '$lib/images/weather/day/r01d.png';
import rainNight from '$lib/images/weather/night/r01n.png';

import freezingRainDay from '$lib/images/weather/day/f01d.png';
import freezingRainNight from '$lib/images/weather/night/f01n.png';

import snowFallDay from '$lib/images/weather/day/s01d.png';
import snowFallNight from '$lib/images/weather/night/s01n.png';

import rainShowersDay from '$lib/images/weather/day/r05d.png';
import rainShowersNight from '$lib/images/weather/night/r05n.png';

import snowShowersDay from '$lib/images/weather/day/s01d.png';
import snowShowersNight from '$lib/images/weather/night/s01n.png';

import thunderstormDay from '$lib/images/weather/day/t04d.png';
import thunderstormNight from '$lib/images/weather/night/t04n.png';

import unknown from '$lib/images/weather/unknown.png';

export async function getWeatherImage(code: number, isDaytime: boolean) {
    let baseIconName: string;

    switch (code) {
        case 0: // Clear sky
            return isDaytime ? day_clear : night_clear;
            break;
        case 1:
        case 2:
        case 3: // Mainly clear, partly cloudy, and overcast
            return isDaytime ? partlyCloudyDay : partlyCloudyNight;
            break;
        case 45:
        case 48: // Fog and depositing rime fog
            return isDaytime ? partlyFoggyDay : partlyFoggyNight;
            break;
        case 51:
        case 53:
        case 55: // Drizzle
            return isDaytime ? drizzleDay : drizzleNight;
            break;
        case 56:
        case 57: // Freezing Drizzle
            return isDaytime ? freezingDrizzleDay : freezingDrizzleNight;
            break;
        case 61:
        case 63:
        case 65: // Rain
            return isDaytime ? rainDay : rainNight;
            break;
        case 66:
        case 67: // Freezing Rain
            return isDaytime ? freezingRainDay : freezingRainNight;
            break;
        case 71:
        case 73:
        case 75:
        case 77: // Snow fall
            return isDaytime ? snowFallDay : snowFallNight;
            break;
        case 80:
        case 81:
        case 82: // Rain showers
            return isDaytime ? rainShowersDay : rainShowersNight;
            break;
        case 85:
        case 86: // Snow showers
            return isDaytime ? snowShowersDay : snowShowersNight;
            break;
        case 95:
        case 96:
        case 99: // Thunderstorm: Slight or moderate
            return isDaytime ? thunderstormDay : thunderstormNight;
            break;
        default:
            return unknown;
        // return await import('$lib/images/weather/unknown.png'); // Fallback for any unlisted codes
    }

    // Append 'd' for daytime or 'n' for nighttime to the base icon name
    let iconName = `images/weather/${isDaytime ? 'day' : 'night'}/${baseIconName}${isDaytime ? 'd' : 'n'}.png`;
    return iconName;
}
