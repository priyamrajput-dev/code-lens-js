import { z } from "zod";

export const createSubscriptionSchema = z.object({
  planId: z.string().optional(),
});
