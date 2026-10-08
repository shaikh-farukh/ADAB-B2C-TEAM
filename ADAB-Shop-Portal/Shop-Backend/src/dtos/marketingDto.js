const { z } = require('zod');

const createPromotionSchema = z.object({
  title: z.string().min(1),
  promo_type: z.string().min(1),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  banner_url: z.string().url().optional().nullable(),
  is_active: z.boolean().optional()
});

const updatePromotionSchema = createPromotionSchema.partial();

const createCouponSchema = z.object({
  code: z.string().min(1),
  discount_type: z.enum(['PERCENTAGE', 'FLAT_AMOUNT']),
  discount_value: z.coerce.number().positive(),
  min_order_value: z.coerce.number().min(0).optional(),
  max_discount_cap: z.coerce.number().positive().optional().nullable(),
  usage_limit: z.coerce.number().int().positive().optional().nullable(),
  valid_from: z.coerce.date(),
  valid_until: z.coerce.date(),
  applies_to: z.string().optional(),
  target_value: z.string().optional().nullable(),
  target_audience: z.string().optional(),
  is_active: z.boolean().optional()
});

const updateCouponSchema = createCouponSchema.partial();

module.exports = {
  createPromotionSchema,
  updatePromotionSchema,
  createCouponSchema,
  updateCouponSchema
};
