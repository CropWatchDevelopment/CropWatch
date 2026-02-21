import { getContext, setContext } from "svelte";
import type { IJWT } from "./interfaces/jwt.interface";
import type { IDevice } from "./interfaces/device.interface";

export interface AppContext {
    session: IJWT | null;
    devices: IDevice[];
    timezoneOffset: number;
    temperatureUnit: "C" | "F";

};

export const appContextKey = Symbol("appContext");

export const defaultAppContext: AppContext = {
    session: null,
    devices: [],
    timezoneOffset: new Date().getTimezoneOffset(),
    temperatureUnit: "C",
};

export function setAppContext(context: AppContext) {
    setContext(appContextKey, context);
}

export function getAppContext(): AppContext {
    return getContext(appContextKey);
}

export function updateAppContext(updates: Partial<AppContext>) {
    const context = getAppContext();
    setAppContext({ ...context, ...updates });
}