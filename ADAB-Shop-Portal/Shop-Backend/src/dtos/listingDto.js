const { z } = require('zod');

// Helper to convert empty string to null to ensure DB consistency
const emptyStringAsNull = (val) => val === '' ? null : val;

// DTO for Seller Listing creation and validation
const createListingSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters long"),
  sku: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  barcode: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  brand_tag: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  product_type: z.preprocess(emptyStringAsNull, z.string().nullable().optional()), // PACKED, LOOSE, OWN_BRAND, etc
  unit: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  mrp: z.coerce.number().nonnegative("MRP must be positive"),
  sell_price: z.coerce.number().nonnegative("Sell price must be positive"),
  min_order_qty: z.coerce.number().positive().default(1),
  allowed_buyers: z.preprocess(emptyStringAsNull, z.string().nullable().optional()), // CUSTOMERS, STORES, BOTH
  approval_status: z.preprocess(emptyStringAsNull, z.string().nullable().optional()).default('DRAFT'), // DRAFT, SUBMITTED
  is_active: z.boolean().optional().default(true),
  image_url: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  stock_qty: z.coerce.number().int().nonnegative().optional().default(0),
  category_id: z.preprocess(emptyStringAsNull, z.coerce.number().int().positive().nullable().optional()),
  wholesale_price: z.preprocess(emptyStringAsNull, z.coerce.number().nonnegative().nullable().optional()),
  tiered_pricing: z.any().optional(),
  sample_available: z.boolean().optional().default(true),
  is_refundable: z.boolean().optional().default(true),
  refund_percentage: z.preprocess(emptyStringAsNull, z.coerce.number().min(0).max(100).nullable().optional()).default(100),
  return_window_days: z.preprocess(emptyStringAsNull, z.coerce.number().int().min(0).max(90).nullable().optional()).default(7),
});

const updateListingSchema = createListingSchema.partial();

module.exports = {
  createListingSchema,
  updateListingSchema
};
