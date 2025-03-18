import { z } from 'zod';
export const UpdateLocationUserPermission = z.object({
    id: z.number(),
    location_id: z.number(),
    permission_level: z.number(),
});