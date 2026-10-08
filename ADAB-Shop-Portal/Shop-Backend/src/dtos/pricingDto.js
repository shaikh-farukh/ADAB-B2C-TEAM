const { z } = require('zod');

const pricingUpdateSchema = z.object({
  sell_price: z.number().positive(),
  mrp: z.number().positive()
});

const bulkPricingUpdateSchema = z.object({
  updates: z.array(z.object({
    listing_id: z.string().uuid(),
    sell_price: z.number().positive(),
    mrp: z.number().positive()
  }))
});

const schedulePricingSchema = z.object({
  scheduled_price: z.number().positive(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime()
});

module.exports = {
  pricingUpdateSchema,
  bulkPricingUpdateSchema,
  schedulePricingSchema
};
