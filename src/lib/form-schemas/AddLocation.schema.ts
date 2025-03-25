import { z } from "zod";

export const AddLocationForm = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
    lat: z.number().min(-90).max(90).default(0),
    long: z.number().min(-180).max(180).default(0),
    description: z.string().optional(),
  });