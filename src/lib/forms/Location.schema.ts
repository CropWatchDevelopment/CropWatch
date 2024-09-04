import { z } from 'zod';

export const LocationSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters long').default(''),
    description: z.string().default(''),
    lat: z.number().min(-90, 'Latitude must be at least -90').max(90, 'Latitude must be at most 90'),
    long: z.number().min(-180, 'Longitude must be at least -180').max(180, 'Longitude must be at most 180'),
    upload_interval: z.number().min(10, 'Upload interval must be at least 10').default(15),
});