import { z } from 'zod';
export const DeleteLocationUserPermission = z.object({
    id: z.number(),
    permission_user_id: z.string(),
    dev_eui: z.string(),
});