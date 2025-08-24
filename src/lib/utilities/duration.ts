export enum DurationUnits {
	Millisecond = 0,
	Second = 1,
	Minute = 2,
	Hour = 3,
	Day = 4
}

export function formatDuration(
	start: string | Date,
	{
		totalUnits = 2,
		minUnits = DurationUnits.Second
	}: { totalUnits?: number; minUnits?: DurationUnits } = {}
) {
	const startTime = new Date(start).getTime();
	const diffMs = Date.now() - startTime;
	const units: { unit: DurationUnits; label: string; ms: number }[] = [
		{ unit: DurationUnits.Day, label: 'd', ms: 86400000 },
		{ unit: DurationUnits.Hour, label: 'h', ms: 3600000 },
		{ unit: DurationUnits.Minute, label: 'm', ms: 60000 },
		{ unit: DurationUnits.Second, label: 's', ms: 1000 }
	];
	const parts: string[] = [];
	let remaining = diffMs;
	for (const u of units) {
		if (u.unit < minUnits) continue;
		if (parts.length >= totalUnits) break;
		const value = Math.floor(remaining / u.ms);
		if (value > 0 || u.unit === minUnits) {
			parts.push(`${value}${u.label}`);
			remaining -= value * u.ms;
		}
	}
	return parts.slice(0, totalUnits).join(' ');
}
