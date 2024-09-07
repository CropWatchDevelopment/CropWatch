import { z } from 'zod';

export const LocationPermissionSchema = z.object({
    email: z.string().min(1).max(255),
    location_id: z.number().min(0),
    permission_level: z.number().min(1).max(5),
    is_active: z.boolean().default(true),
});