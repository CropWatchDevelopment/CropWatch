import { z } from 'zod';

export const UpdateDeviceGeneralSchema = z.object({
    name: z.string().min(3).max(255),
    lat: z.number(),
    long: z.number(),
});