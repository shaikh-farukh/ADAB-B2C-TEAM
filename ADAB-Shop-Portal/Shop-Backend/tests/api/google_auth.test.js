const request = require('supertest');
const express = require('express');

// Mock db BEFORE importing routes
jest.mock('../../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
  end: jest.fn(),
}));

// Mock the auth middleware
jest.mock('../../src/middlewares/auth', () => ({
  requireSellerAuth: (req, res, next) => next(),
  getAuthenticatedSellerContext: () => ({
    userId: '00000000-0000-0000-0000-000000000001',
    storeId: '00000000-0000-0000-0000-000000000001',
    roles: ['seller']
  })
}));

// Mock seller service
jest.mock('../../src/services/seller', () => ({
  loginWithGoogle: jest.fn(),
  login: jest.fn(),
  loginWithOtp: jest.fn(),
  signup: jest.fn(),
}));

const sellerService = require('../../src/services/seller');
const sellerRoutes = require('../../src/routes/seller');

const app = express();
app.use(express.json());
app.use('/api/v1/seller', sellerRoutes);

describe('POST /api/v1/seller/auth/google', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should authenticate user and return token on valid google credentials', async () => {
    const mockAuthResult = {
      token: 'jwt_mock_token_12345',
      userId: 'usr-1234',
      storeId: 'str-1234',
      email: 'merchant@gmail.com',
      profile: { legal_name: 'Merchant Store' },
      store: { id: 'str-1234', store_name: 'Merchant Store' },
      isNewSignup: false
    };

    sellerService.loginWithGoogle.mockResolvedValueOnce(mockAuthResult);

    const res = await request(app)
      .post('/api/v1/seller/auth/google')
      .send({ accessToken: 'valid_access_token_abc' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('jwt_mock_token_12345');
    expect(res.body.data.email).toBe('merchant@gmail.com');
    expect(sellerService.loginWithGoogle).toHaveBeenCalledWith({
      credential: undefined,
      idToken: undefined,
      accessToken: 'valid_access_token_abc'
    });
  });

  it('should return 400 when google authentication fails', async () => {
    sellerService.loginWithGoogle.mockRejectedValueOnce(
      new Error('Failed to verify Google access token')
    );

    const res = await request(app)
      .post('/api/v1/seller/auth/google')
      .send({ accessToken: 'bad_token' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Failed to verify Google access token');
  });
});
