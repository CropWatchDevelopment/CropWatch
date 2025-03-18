import { z } from 'zod';

export const deviceSchema = z.object({
    deviceName: z.string().min(1, 'Device name is required'),
    deviceDescription: z.string().optional(),
    deviceType: z.number({ required_error: 'Please select a device type' }),
    devEui: z
        .string()
        .regex(/^([0-9A-Fa-f]{2}:){7}[0-9A-Fa-f]{2}$/, 'Invalid DevEUI format'),
    joinEui: z
        .string()
        .regex(/^([0-9A-Fa-f]{2}:){7}[0-9A-Fa-f]{2}$/, 'Invalid JoinEUI format'),
    appKey: z
        .string()
        .regex(/^([0-9A-Fa-f]{2}:){15}[0-9A-Fa-f]{2}$/, 'Invalid AppKey format'),
    subscriptionId: z.string({ required_error: 'Please select a subscription plan' })
});