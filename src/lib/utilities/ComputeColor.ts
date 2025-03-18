export function computeColor(temp: number): string {
    // Temperature range from -40 to +150
    const minTemp = -20;
    const maxTemp = 40;

    // Normalize temperature to a 0-1 scale
    const normalized = (temp - minTemp) / (maxTemp - minTemp);

    // Calculate the red and blue components based on temperature
    const red = Math.round(255 * normalized);
    const blue = Math.round(255 * (1 - normalized));

    // Return the computed RGB color
    return `rgb(${red}, 0, ${blue})`;
}