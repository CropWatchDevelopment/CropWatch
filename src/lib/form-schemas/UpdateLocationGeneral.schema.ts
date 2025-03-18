import { z } from 'zod';

export const UpdateLocationGeneralSchema = z.object({
    name: z.string().min(3).max(255),
    location_id: z.number(),
    lat: z.number(),
    long: z.number(),
});