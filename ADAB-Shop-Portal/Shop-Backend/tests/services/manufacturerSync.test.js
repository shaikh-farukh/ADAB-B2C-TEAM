const listingService = require('../../src/services/listing');
const listingRepository = require('../../src/repositories/listing');

jest.mock('../../src/repositories/listing');
jest.mock('../../db', () => ({
  query: jest.fn()
}));

describe('Listing Service - Manufacturer Master Sync Flow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should query manufacturer products via repository', async () => {
    const mockData = {
      data: [{ id: 1, product_name: 'Tata Salt 1kg', price: 24 }],
      total: 1
    };
    listingRepository.getManufacturerProducts.mockResolvedValue(mockData);

    const result = await listingService.getManufacturerProducts({ search: 'Tata' });
    expect(listingRepository.getManufacturerProducts).toHaveBeenCalledWith({ search: 'Tata' });
    expect(result).toEqual(mockData);
  });
});
