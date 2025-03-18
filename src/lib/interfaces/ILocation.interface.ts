import type { Tables } from "$lib/types/database.types";
import type { IDevice } from "./IDevice.interface";

export interface ILocation extends Tables<'cw_locations'> {
    cw_devices: IDevice[];
}
