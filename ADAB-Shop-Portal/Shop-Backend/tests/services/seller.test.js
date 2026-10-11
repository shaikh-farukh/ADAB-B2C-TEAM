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

  it('should forward storeId and filters to getOrders', async () => {
    const mockOrders = [{ id: 'ORD-101', status: 'new' }];
    sellerRepository.getOrders.mockResolvedValue(mockOrders);

    const res = await sellerService.getSellerOrders('store-1', { status: 'NEW', limit: 10 });
    expect(sellerRepository.getOrders).toHaveBeenCalledWith('store-1', { status: 'NEW', limit: 10 });
    expect(res).toEqual(mockOrders);
  });

  it('should validate required args and forward storeId in updateOrderStatus', async () => {
    await expect(sellerService.updateOrderStatus(null, 'packing')).rejects.toThrow('Order ID and status are required');
    sellerRepository.updateOrderStatus.mockResolvedValue({ seller_order_status: 'ACCEPTED' });

    const res = await sellerService.updateOrderStatus('ORD-101', 'packing', 'store-1');
    expect(sellerRepository.updateOrderStatus).toHaveBeenCalledWith('ORD-101', 'packing', 'store-1');
    expect(res.seller_order_status).toBe('ACCEPTED');
  });

  it('should validate required args and forward storeId in updateReturnStatus', async () => {
    await expect(sellerService.updateReturnStatus('ret-1', '')).rejects.toThrow('Return ID and status are required');
    sellerRepository.updateReturnStatus.mockResolvedValue({ status: 'approved', rawStatus: 'APPROVED' });

    const res = await sellerService.updateReturnStatus('ret-1', 'approved', null, 'store-1');
    expect(sellerRepository.updateReturnStatus).toHaveBeenCalledWith('ret-1', 'approved', null, 'store-1');
    expect(res.rawStatus).toBe('APPROVED');
  });

  it('should fetch finance summary and process withdrawal settlement', async () => {
    sellerRepository.getFinanceSummary.mockResolvedValue({ balance: 1200, gross_sales: 1500 });
    sellerRepository.createWithdrawalSettlement.mockResolvedValue({ id: 'stl-1', net_payable: 1200, status: 'PAID' });

    const summary = await sellerService.getFinanceSummary('store-1', 'user-1');
    expect(summary.balance).toBe(1200);

    const settlement = await sellerService.createWithdrawalSettlement('store-1');
    expect(settlement.status).toBe('PAID');
    expect(settlement.net_payable).toBe(1200);
  });
});
