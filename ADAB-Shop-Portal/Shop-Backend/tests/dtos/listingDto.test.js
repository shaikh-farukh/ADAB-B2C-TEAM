const { createListingSchema } = require('../../src/dtos/listingDto');

describe('Listing DTO Validation', () => {
  it('should validate a correct listing payload', () => {
    const validPayload = {
      title: 'Premium Wireless Headphones',
      mrp: 399.99,
      sell_price: 299.99,
      stock_qty: 50,
      manufacturer_product_id: 1,
    };

    const result = createListingSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should fail if title is too short', () => {
    const invalidPayload = {
      title: 'B',
      mrp: 399.99,
      sell_price: 299.99,
      stock_qty: 50,
    };

    const result = createListingSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Title must be at least 2 characters long');
  });

  it('should fail if price is negative', () => {
    const invalidPayload = {
      title: 'Valid Title',
      mrp: 100,
      sell_price: -10,
      stock_qty: 50,
    };

    const result = createListingSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Sell price must be positive');
  });
});
