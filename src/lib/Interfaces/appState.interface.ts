import type { Alert } from "./alert.interface";
import type { Device } from "./device.interface";
import type { Facility } from "./facility.interface";
import type { Location } from "./location.interface";

export interface AppState {
    facilities: Facility[];
    locations: Location[];
    devices: Device[];
    alerts: Alert[];
    isLoggedIn: boolean;
    profile: {
        id?: string;
        full_name?: string | null;
        avatar_url?: string | null;
        email?: string | null;
    } | null;
    userEmail?: string | null;
}
