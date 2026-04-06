export interface TelemetryRow {
    id: string;
    created_at: string;
    temperature_c: number;
    humidity: number;
    co2: number;
    alertRaised?: boolean;
    hasNotes?: boolean;
    notes: any[];
}