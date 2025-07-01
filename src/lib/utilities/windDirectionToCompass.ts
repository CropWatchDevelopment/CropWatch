export function windDirectionToCompass(
	degrees: number
): 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' {
	const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
	const index = Math.round((degrees % 360) / 45) % 8;
	return directions[index];
}
