import { z } from "zod";

export const AddLocationForm = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
    lat: z.string().default('0'),
    long: z.string().default('0'),
    description: z.string().optional(),
  });