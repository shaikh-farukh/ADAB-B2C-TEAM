const { createListingSchema } = require('../../src/dtos/listingDto');

describe('Listing DTO Validation', () => {
  it('should validate a correct listing payload', () => {
    const validPayload = {
      title: 'Premium Wireless Headphones',
      description: 'High quality noise cancelling wireless headphones.',
      base_price: 299.99,
      stock_quantity: 50,
      category_id: '123e4567-e89b-12d3-a456-426614174000',
    };

    const result = createListingSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should fail if title is too short', () => {
    const invalidPayload = {
      title: 'Bad',
      description: 'High quality noise cancelling wireless headphones.',
      base_price: 299.99,
      stock_quantity: 50,
      category_id: '123e4567-e89b-12d3-a456-426614174000',
    };

    const result = createListingSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Title must be at least 5 characters long');
  });

  it('should fail if price is negative', () => {
    const invalidPayload = {
      title: 'Valid Title',
      description: 'High quality noise cancelling wireless headphones.',
      base_price: -10,
      stock_quantity: 50,
      category_id: '123e4567-e89b-12d3-a456-426614174000',
    };

    const result = createListingSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Base price must be positive');
  });
});
