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
        99: '⛈️', // Thunderstorm with heavy hail
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
        99: 'Thunderstorm with heavy hail',
    };
    return descriptionMap[weatherCode] || 'Unknown';
};

export async function fetchHistoricalWeather(startDate: Date, endDate: Date, latitude: number = 32.1085, longitude: number = 131.4013): Promise<any[]> {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Open-Meteo Historical Weather API
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDateStr}&end_date=${endDateStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=JST`;

    try {
        console.log('Fetching weather from Open-Meteo:', url);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Error fetching data: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Open-Meteo response:', data);

        // Check if the response has the expected structure
        if (data.daily && data.daily.time && data.daily.time.length > 0) {
            const results = data.daily.time.map((date: string, index: number) => ({
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
                }
            }));

            console.log('Processed weather results:', results);
            return results;
        } else {
            console.warn('No weather data available in response:', data);
            return [];
        }
    } catch (error) {
        console.error('Failed to fetch weather data:', error);
        return [];
    }
}
