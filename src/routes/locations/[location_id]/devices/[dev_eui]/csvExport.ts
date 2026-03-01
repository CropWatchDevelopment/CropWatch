


export function downloadCsv(selectedTelemetry, locationName, devEui, selectedRangeHours) {
    const header = ['created_at', 'Temperature_C', 'Humidity_pct', 'CO2_ppm'];
    const records = selectedTelemetry.map((row) =>
        [row.created_at, row.temperature_c.toFixed(1), row.humidity.toFixed(1), row.co2].map(
            escapeCsvValue
        )
    );
    const csv = [header.join(','), ...records.map((record) => record.join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeDevEui = devEui.replace(/[^a-zA-Z0-9_-]/g, '_');

    link.href = url;
    link.download = `${locationName}-${safeDevEui}-${selectedRangeHours}h-mock-data.csv`;
    document.body.append(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string | number): string {
    const normalized = String(value);
    if (/[,"\n]/.test(normalized)) {
        return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
}