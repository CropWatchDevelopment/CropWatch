export function computeCo2Color(co2: number): string {
    // 1) Clamp CO₂ to the [400, 100000] range
    const minCo2 = 400;
    const maxCo2 = 100000;
    const clampedCo2 = Math.min(Math.max(co2, minCo2), maxCo2);
  
    // 2) Compute the interpolation ratio (0 → at 400 ppm, 1 → at 100k ppm)
    const ratio = (clampedCo2 - minCo2) / (maxCo2 - minCo2);
  
    // 3) Interpolate between Green (0, 255, 0) and Red (255, 0, 0)
    const r = Math.round(0   + ratio * (255 - 0));
    const g = Math.round(255 + ratio * (0   - 255));
    const b = 0;
  
    return `rgb(${r}, ${g}, ${b})`;
  }
  