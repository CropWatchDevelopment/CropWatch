import { z } from 'zod';

export const deviceEditSchema = z.object({
    name: z.string().min(3).max(255).default(''),
    lat: z.number().min(-90).max(90).default(0),
    long: z.number().min(-180).max(180).default(0),
    upload_interval: z.number().default(65),
    battery_changed_at: z.date().default(new Date()),
    location_id: z.number().default(-1),
});