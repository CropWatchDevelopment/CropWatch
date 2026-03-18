import type { RuleDto } from "$lib/api/api.dtos";
import type { Note } from "./note.interface";

export interface AirRow {
    id: string;
    created_at: string;
    temperature_c: number;
    humidity: number;
    co2: number;
    dev_eui: string;
    cw_air_annotations?: Note[] | null; // For rows that have notes, this will be an array of notes; otherwise undefined
    alerts: RuleDto[]; // For rows that have triggered rules, this will be an array of rules; otherwise an empty array
}