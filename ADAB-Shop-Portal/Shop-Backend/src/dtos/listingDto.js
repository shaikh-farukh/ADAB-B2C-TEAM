const { z } = require('zod');

// DTO for Seller Listing creation and validation
const createListingSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters long"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  brand_tag: z.string().optional(),
  product_type: z.string().optional(), // PACKED, LOOSE, OWN_BRAND, etc
  unit: z.string().optional(),
  mrp: z.coerce.number().nonnegative("MRP must be positive"),
  sell_price: z.coerce.number().nonnegative("Sell price must be positive"),
  min_order_qty: z.coerce.number().positive().default(1),
  allowed_buyers: z.string().optional(), // CUSTOMERS, STORES, BOTH
  approval_status: z.string().optional().default('DRAFT'), // DRAFT, SUBMITTED
  is_active: z.boolean().optional().default(true),
  image_url: z.string().url().optional().or(z.literal('')), // allow empty string if deleted
  stock_qty: z.coerce.number().int().nonnegative().optional().default(0),
});

const updateListingSchema = createListingSchema.partial();

module.exports = {
  createListingSchema,
  updateListingSchema
};
