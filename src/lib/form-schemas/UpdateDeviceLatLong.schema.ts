import { z } from 'zod';

export const UpdateDeviceLatLong = z.object({
    dev_eui: z.string().min(16).max(16),
    name: z.string().min(3).max(255),
    lat: z.number().min(-180).max(180),
    long: z.number().min(-180).max(180),
});