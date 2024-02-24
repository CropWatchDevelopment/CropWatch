import type { ICwSSTmepnpk } from '$lib/interfaces/ICW_SS_TMEPNPK.interface';
import { writable } from 'svelte/store';

export const sensorDataState = writable<ICwSSTmepnpk[]>([]);

export function SetData(data: ICwSSTmepnpk[]) {
    sensorDataState.set(data);
}

export function AddData(data: ICwSSTmepnpk) {
    sensorDataState.update((existing) => [data, ...existing.slice(0,10)])
}
