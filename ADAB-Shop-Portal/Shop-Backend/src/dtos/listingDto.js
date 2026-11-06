const { z } = require('zod');

// Helper to convert empty string to null to ensure DB consistency
const emptyStringAsNull = (val) => val === '' ? null : val;

// Helper to convert non-UUID string or empty string to null for foreign key consistency
const uuidOrNull = (val) => {
  if (!val || typeof val !== 'string' || val.trim() === '') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val.trim()) ? val.trim() : null;
};

// Schema for child variations in a multi-SKU listing
const variantItemSchema = z.object({
  id: z.preprocess(uuidOrNull, z.string().uuid().nullable().optional()),
  sku: z.string().min(1, "Variant SKU is required"),
  barcode: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  mrp: z.coerce.number().nonnegative("Variant MRP must be non-negative"),
  sell_price: z.coerce.number().nonnegative("Variant sell price must be non-negative"),
  stock_qty: z.coerce.number().nonnegative().default(0),
  variant_attributes: z.record(z.any()).default({}),
  image_url: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  is_active: z.boolean().optional().default(true)
});

// DTO for Seller Listing base fields (without defaults that could overwrite on partial updates)
const baseListingSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters long"),
  sku: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  barcode: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  brand_tag: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  product_type: z.preprocess(emptyStringAsNull, z.string().nullable().optional()), // PACKED_ITEM, LOOSE_WEIGHT, OWN_BRAND
  unit: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  mrp: z.coerce.number().nonnegative("MRP must be positive"),
  sell_price: z.coerce.number().nonnegative("Sell price must be positive"),
  min_order_qty: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number(val) <= 0 ? 1 : val),
    z.coerce.number().positive().optional()
  ),
  allowed_buyers: z.preprocess(emptyStringAsNull, z.string().nullable().optional()), // ALL, CUSTOMERS_ONLY, STORES_ONLY
  approval_status: z.preprocess(emptyStringAsNull, z.string().nullable().optional()), // DRAFT, SUBMITTED, PUBLISHED
  is_active: z.boolean().optional(),
  image_url: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  stock_qty: z.coerce.number().nonnegative().optional(), // Supports lossless decimals (e.g. 0.500 kg)
  category_id: z.preprocess(emptyStringAsNull, z.coerce.number().int().positive().nullable().optional()),
  wholesale_price: z.preprocess(emptyStringAsNull, z.coerce.number().nonnegative().nullable().optional()),
  tiered_pricing: z.any().optional(),
  sample_available: z.boolean().optional(),
  is_refundable: z.boolean().optional(),
  refund_percentage: z.preprocess(emptyStringAsNull, z.coerce.number().min(0).max(100).nullable().optional()),
  return_window_days: z.preprocess(emptyStringAsNull, z.coerce.number().int().min(0).max(90).nullable().optional()),
  
  // Dynamic Catalog & Variants Architecture fields
  attributes: z.record(z.any()).optional(),
  has_variants: z.boolean().optional(),
  variants: z.array(variantItemSchema).optional(),
  master_catalog_id: z.preprocess(uuidOrNull, z.string().uuid().nullable().optional()),
  manufacturer_product_id: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = parseInt(val, 10);
      return !isNaN(num) ? num : null;
    },
    z.number().int().positive().nullable().optional()
  ),
  rejection_reason: z.preprocess(emptyStringAsNull, z.string().nullable().optional())
});

// Schema for listing creation with defaults applied
const createListingSchema = baseListingSchema.extend({
  min_order_qty: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number(val) <= 0 ? 1 : val),
    z.coerce.number().positive().default(1)
  ),
  approval_status: z.preprocess(emptyStringAsNull, z.string().nullable().optional()).default('DRAFT'),
  is_active: z.boolean().optional().default(true),
  stock_qty: z.coerce.number().nonnegative().optional().default(0),
  sample_available: z.boolean().optional().default(true),
  is_refundable: z.boolean().optional().default(true),
  refund_percentage: z.preprocess(emptyStringAsNull, z.coerce.number().min(0).max(100).nullable().optional()).default(100),
  return_window_days: z.preprocess(emptyStringAsNull, z.coerce.number().int().min(0).max(90).nullable().optional()).default(7),
  attributes: z.record(z.any()).optional().default({}),
  has_variants: z.boolean().optional().default(false),
  variants: z.array(variantItemSchema).optional().default([])
});

const updateListingSchema = baseListingSchema.partial();

module.exports = {
  createListingSchema,
  updateListingSchema,
  variantItemSchema
};
