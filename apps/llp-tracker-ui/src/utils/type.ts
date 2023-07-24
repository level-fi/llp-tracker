import { z } from 'zod';

export const LvlPriceSchema = z.object({
  price: z.string(),
  decimals: z.number(),
});

export const TokenLVLSchema = z.object({
  price: LvlPriceSchema,
});
