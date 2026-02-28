import { z } from "zod";

export const OrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),

  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),

  county: z.string().min(1).optional(),
  city: z.string().min(1).optional(),

  source: z.string().min(1).optional(),

  minRate: z.coerce.number().min(0).optional(),
  maxRate: z.coerce.number().min(0).optional(),

  importBatchId: z.string().uuid().optional(),
  externalId: z.string().min(1).optional(),
});
