import { z } from 'zod';

export const deviceSchema = z.object({
    device_id: z
        .string()
        .min(2, 'Device ID must be at least 2 characters')
        .max(36, 'Device ID cannot exceed 36 characters')
        .regex(/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,}$/, 'Must contain only lowercase letters, numbers, and hyphens'),
    description: z
        .string()
        .max(200, 'Description cannot exceed 200 characters')
        .optional(),
    devEui: z
        .string()
        .regex(/^[a-f0-9]{16}$/, 'DevEUI must be 16 hexadecimal characters'),
    joinEui: z
        .string()
        .regex(/^[a-f0-9]{16}$/, 'JoinEUI/AppEUI must be 16 hexadecimal characters'),
    appKey: z
        .string()
        .regex(/^[a-f0-9]{32}$/, 'AppKey must be 32 hexadecimal characters'),
    tti_application_id: z.string(),
    frequency_plan_id: z.string(),
    lorawan_version: z.string(),
    lorawan_phy_version: z.string()
});

export type DeviceSchema = typeof deviceSchema;