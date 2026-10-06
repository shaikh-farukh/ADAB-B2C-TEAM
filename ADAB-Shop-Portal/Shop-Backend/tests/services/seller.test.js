// Mock the DB and repository so we don't instantiate real PG connections during tests
jest.mock('../../db', () => ({
  query: jest.fn()
}));
jest.mock('../../src/repositories/seller');

const sellerService = require('../../src/services/seller');
const sellerRepository = require('../../src/repositories/seller');

describe('Seller Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch the seller profile successfully', async () => {
    const mockProfile = { id: '123', full_name: 'Test Seller' };
    sellerRepository.getProfile.mockResolvedValue(mockProfile);

    const result = await sellerService.getSellerProfile('123');
    
    expect(sellerRepository.getProfile).toHaveBeenCalledWith('123');
    expect(result).toEqual(mockProfile);
  });

  it('should throw an error if seller ID is missing when fetching profile', async () => {
    await expect(sellerService.getSellerProfile(null)).rejects.toThrow('Seller ID is required');
    expect(sellerRepository.getProfile).not.toHaveBeenCalled();
  });

  it('should fetch the seller store successfully', async () => {
    const mockStore = { id: 'store-1', store_name: 'Test Store' };
    sellerRepository.getStore.mockResolvedValue(mockStore);

    const result = await sellerService.getSellerStore('123');
    
    expect(sellerRepository.getStore).toHaveBeenCalledWith('123');
    expect(result).toEqual(mockStore);
  });

  it('should throw an error if seller ID is missing when fetching store', async () => {
    await expect(sellerService.getSellerStore(undefined)).rejects.toThrow('Seller ID is required');
    expect(sellerRepository.getStore).not.toHaveBeenCalled();
  });
});
