import { z } from 'zod';

export const LocationEditSchema = z.object({
    name: z.string().min(1).max(255),
    lat: z.number().min(-90).max(90),
    long: z.number().min(-180).max(180),
});