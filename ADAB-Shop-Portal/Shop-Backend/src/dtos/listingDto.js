const { z } = require('zod');

// Helper to convert empty string to null to ensure DB consistency
const emptyStringAsNull = (val) => val === '' ? null : val;

// Schema for child variations in a multi-SKU listing
const variantItemSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().min(1, "Variant SKU is required"),
  barcode: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  mrp: z.coerce.number().nonnegative("Variant MRP must be non-negative"),
  sell_price: z.coerce.number().nonnegative("Variant sell price must be non-negative"),
  stock_qty: z.coerce.number().nonnegative().default(0),
  variant_attributes: z.record(z.any()).default({}),
  image_url: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  is_active: z.boolean().optional().default(true)
});

// DTO for Seller Listing creation and validation
const createListingSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters long"),
  sku: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  barcode: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  brand_tag: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  product_type: z.preprocess(emptyStringAsNull, z.string().nullable().optional()), // PACKED_ITEM, LOOSE_WEIGHT, OWN_BRAND
  unit: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  mrp: z.coerce.number().nonnegative("MRP must be positive"),
  sell_price: z.coerce.number().nonnegative("Sell price must be positive"),
  min_order_qty: z.coerce.number().positive().default(1),
  allowed_buyers: z.preprocess(emptyStringAsNull, z.string().nullable().optional()), // CUSTOMERS, STORES, BOTH
  approval_status: z.preprocess(emptyStringAsNull, z.string().nullable().optional()).default('DRAFT'), // DRAFT, SUBMITTED
  is_active: z.boolean().optional().default(true),
  image_url: z.preprocess(emptyStringAsNull, z.string().nullable().optional()),
  stock_qty: z.coerce.number().nonnegative().optional().default(0), // Supports lossless decimals (e.g. 0.500 kg)
  category_id: z.preprocess(emptyStringAsNull, z.coerce.number().int().positive().nullable().optional()),
  wholesale_price: z.preprocess(emptyStringAsNull, z.coerce.number().nonnegative().nullable().optional()),
  tiered_pricing: z.any().optional(),
  sample_available: z.boolean().optional().default(true),
  is_refundable: z.boolean().optional().default(true),
  refund_percentage: z.preprocess(emptyStringAsNull, z.coerce.number().min(0).max(100).nullable().optional()).default(100),
  return_window_days: z.preprocess(emptyStringAsNull, z.coerce.number().int().min(0).max(90).nullable().optional()).default(7),
  
  // Dynamic Catalog & Variants Architecture fields
  attributes: z.record(z.any()).optional().default({}),
  has_variants: z.boolean().optional().default(false),
  variants: z.array(variantItemSchema).optional().default([]),
  master_catalog_id: z.preprocess(emptyStringAsNull, z.string().uuid().nullable().optional()),
  manufacturer_product_id: z.preprocess(emptyStringAsNull, z.union([z.string(), z.number()]).nullable().optional()),
  rejection_reason: z.preprocess(emptyStringAsNull, z.string().nullable().optional())
});

const updateListingSchema = createListingSchema.partial();

module.exports = {
  createListingSchema,
  updateListingSchema,
  variantItemSchema
};
