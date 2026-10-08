const { z } = require('zod');

const pricingUpdateSchema = z.object({
  sell_price: z.coerce.number().positive(),
  mrp: z.coerce.number().positive()
});

const bulkPricingUpdateSchema = z.object({
  updates: z.array(z.object({
    listing_id: z.string().uuid(),
    sell_price: z.coerce.number().positive(),
    mrp: z.coerce.number().positive()
  }))
});

const schedulePricingSchema = z.object({
  scheduled_price: z.coerce.number().positive(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

module.exports = {
  pricingUpdateSchema,
  bulkPricingUpdateSchema,
  schedulePricingSchema
};
