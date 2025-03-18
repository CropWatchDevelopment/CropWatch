import { z } from 'zod';
export const AddLocationUserPermission = z.object({
    id: z.number().optional(),
    location_id: z.number(),
    email: z.string().email(),
    applyToAllSubDevices: z.boolean(),
    permission_level: z.number(),
});