export async function getWeatherImage(code: number, isDaytime: boolean) {
    let baseIconName: string;

    switch (code) {
        case 0: // Clear sky
            baseIconName = 'c01';
            break;
        case 1:
        case 2:
        case 3: // Mainly clear, partly cloudy, and overcast
            baseIconName = 'c02';
            break;
        case 45:
        case 48: // Fog and depositing rime fog
            baseIconName = 'a05';
            break;
        case 51:
        case 53:
        case 55: // Drizzle
            baseIconName = 'd01';
            break;
        case 56:
        case 57: // Freezing Drizzle
            baseIconName = 'f01';
            break;
        case 61:
        case 63:
        case 65: // Rain
            baseIconName = 'r01';
            break;
        case 66:
        case 67: // Freezing Rain
            baseIconName = 'f01';
            break;
        case 71:
        case 73:
        case 75: // Snow fall
            baseIconName = 's01';
            break;
        case 77: // Snow grains
            baseIconName = 's06';
            break;
        case 80:
        case 81:
        case 82: // Rain showers
            baseIconName = 'r04';
            break;
        case 85:
        case 86: // Snow showers
            baseIconName = 's01';
            break;
        case 95: // Thunderstorm: Slight or moderate
            baseIconName = 't02';
            break;
        case 96:
        case 99: // Thunderstorm with hail
            baseIconName = 't05';
            break;
        default:
            return await import('$lib/images/weather/unknown.png'); // Fallback for any unlisted codes
    }

    // Append 'd' for daytime or 'n' for nighttime to the base icon name
    let iconName = await import(`$lib/images/weather/${isDaytime ? 'day' : 'night'}/${baseIconName}${isDaytime ? 'd' : 'n'}.png`);
    return iconName.default;
}
