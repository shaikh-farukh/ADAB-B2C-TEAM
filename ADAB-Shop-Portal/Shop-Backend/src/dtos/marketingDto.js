const { z } = require('zod');

const promotionProductItemSchema = z.object({
  listing_id: z.string().uuid(),
  promo_price: z.coerce.number().positive()
});

const createPromotionSchema = z.object({
  title: z.string().min(1),
  promo_type: z.string().min(1),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  banner_url: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  products: z.array(promotionProductItemSchema).optional()
});

const updatePromotionSchema = createPromotionSchema.partial();

const emptyToNull = (val) => (val === '' || val === undefined || val === null ? null : val);
const emptyToZero = (val) => (val === '' || val === undefined || val === null ? 0 : val);

const createCouponSchema = z.object({
  code: z.string().min(1),
  discount_type: z.enum(['PERCENTAGE', 'FLAT_AMOUNT']),
  discount_value: z.coerce.number().positive(),
  min_order_value: z.preprocess(emptyToZero, z.coerce.number().min(0)).optional().nullable(),
  max_discount_cap: z.preprocess(emptyToNull, z.coerce.number().positive().nullable()).optional(),
  usage_limit: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable()).optional(),
  valid_from: z.coerce.date(),
  valid_until: z.coerce.date(),
  applies_to: z.string().optional(),
  target_value: z.preprocess(emptyToNull, z.string().nullable()).optional(),
  target_audience: z.string().optional(),
  is_active: z.boolean().optional()
});

const updateCouponSchema = z.object({
  code: z.string().min(1).optional(),
  discount_type: z.enum(['PERCENTAGE', 'FLAT_AMOUNT']).optional(),
  discount_value: z.coerce.number().positive().optional(),
  min_order_value: z.preprocess(emptyToZero, z.coerce.number().min(0)).optional().nullable(),
  max_discount_cap: z.preprocess(emptyToNull, z.coerce.number().positive().nullable()).optional(),
  usage_limit: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable()).optional(),
  valid_from: z.coerce.date().optional(),
  valid_until: z.coerce.date().optional(),
  applies_to: z.string().optional(),
  target_value: z.preprocess(emptyToNull, z.string().nullable()).optional(),
  target_audience: z.string().optional(),
  is_active: z.boolean().optional()
});

module.exports = {
  createPromotionSchema,
  updatePromotionSchema,
  createCouponSchema,
  updateCouponSchema
};
