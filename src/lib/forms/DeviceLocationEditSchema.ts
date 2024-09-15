import { z } from 'zod';

export const deviceLocationEditSchema = z.object({
    id: z.number(),
    dev_eui: z.string().min(16).max(16),
    location_id: z.number().min(1),
});