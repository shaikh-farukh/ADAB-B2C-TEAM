const { z } = require('zod');

const createPromotionSchema = z.object({
  title: z.string().min(1),
  promo_type: z.string().min(1),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  banner_url: z.string().url().optional().nullable(),
  is_active: z.boolean().optional()
});

const updatePromotionSchema = createPromotionSchema.partial();

const createCouponSchema = z.object({
  code: z.string().min(1),
  discount_type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discount_value: z.number().positive(),
  min_order_value: z.number().min(0).optional(),
  max_discount_cap: z.number().positive().optional().nullable(),
  usage_limit: z.number().int().positive().optional().nullable(),
  valid_from: z.string().datetime(),
  valid_until: z.string().datetime(),
  applies_to: z.string().optional(),
  target_value: z.string().optional().nullable(),
  target_audience: z.string().optional()
});

const updateCouponSchema = createCouponSchema.partial();

module.exports = {
  createPromotionSchema,
  updatePromotionSchema,
  createCouponSchema,
  updateCouponSchema
};
