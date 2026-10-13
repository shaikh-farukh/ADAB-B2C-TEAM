const { createListingSchema } = require('../../src/dtos/listingDto');

describe('Listing DTO Validation', () => {
  it('should validate a correct listing payload', () => {
    const validPayload = {
      title: 'Premium Wireless Headphones',
      mrp: 350.00,
      sell_price: 299.99,
      stock_qty: 50,
    };

    const result = createListingSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should fail if title is too short', () => {
    const invalidPayload = {
      title: 'B',
      mrp: 350.00,
      sell_price: 299.99,
    };

    const result = createListingSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Title must be at least 2 characters long');
  });

  it('should fail if price is negative', () => {
    const invalidPayload = {
      title: 'Valid Title',
      mrp: 350.00,
      sell_price: -10,
    };

    const result = createListingSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Sell price must be positive');
  });

  it('should allow image_url to be null or empty string without error', () => {
    const payloadWithNull = {
      title: 'Valid Title',
      mrp: 100,
      sell_price: 90,
      image_url: null,
    };
    const resNull = createListingSchema.safeParse(payloadWithNull);
    expect(resNull.success).toBe(true);
    expect(resNull.data.image_url).toBeNull();

    const payloadWithEmpty = {
      title: 'Valid Title',
      mrp: 100,
      sell_price: 90,
      image_url: '',
    };
    const resEmpty = createListingSchema.safeParse(payloadWithEmpty);
    expect(resEmpty.success).toBe(true);
    expect(resEmpty.data.image_url).toBeNull();
  });

  it('should preserve valid image_url string', () => {
    const payload = {
      title: 'Valid Title',
      mrp: 100,
      sell_price: 90,
      image_url: 'https://images.example.com/product.jpg',
    };
    const res = createListingSchema.safeParse(payload);
    expect(res.success).toBe(true);
    expect(res.data.image_url).toBe('https://images.example.com/product.jpg');
  });
});
