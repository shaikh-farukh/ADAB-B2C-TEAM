const cloudinaryService = require('../../src/services/cloudinaryService');

describe('CloudinaryService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('should verify service is configured with env or default credentials', () => {
    expect(cloudinaryService.isConfigured()).toBe(true);
    expect(cloudinaryService.cloudName).toBe('dqjb134t9');
  });

  it('should generate valid SHA-1 signature', () => {
    const params = { folder: 'adab/products', timestamp: '1700000000' };
    const sig = cloudinaryService.generateSignature(params);
    expect(typeof sig).toBe('string');
    expect(sig.length).toBe(40); // 40-char hex for SHA-1
  });

  it('should upload an image buffer successfully and return secure_url and public_id', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        secure_url: 'https://res.cloudinary.com/dqjb134t9/image/upload/v1/adab/products/test.jpg',
        public_id: 'adab/products/test',
        format: 'jpg',
        width: 800,
        height: 600,
        bytes: 12345
      })
    });

    const buffer = Buffer.from('fake-image-bytes');
    const result = await cloudinaryService.uploadImage(buffer, 'test.jpg', 'image/jpeg', {
      folder: 'adab/products'
    });

    expect(result.url).toBe('https://res.cloudinary.com/dqjb134t9/image/upload/v1/adab/products/test.jpg');
    expect(result.public_id).toBe('adab/products/test');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should call destroyImage and return result', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'ok' })
    });

    const res = await cloudinaryService.destroyImage('adab/products/test');
    expect(res.result).toBe('ok');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle destroyImage when publicId is empty', async () => {
    const res = await cloudinaryService.destroyImage('');
    expect(res.result).toBe('skipped');
  });
});
