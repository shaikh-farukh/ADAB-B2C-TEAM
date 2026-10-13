const { buildQueryCandidates, geocodeAddress, reverseGeocode } = require('../../src/services/geocodingService');

describe('geocodingService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('buildQueryCandidates', () => {
    it('should generate tiered fallback queries from specific to broad', () => {
      const candidates = buildQueryCandidates({
        addressLine: 'Shop 14, Sardar Market, Ring Road',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395007'
      });

      expect(candidates.length).toBeGreaterThan(1);
      // Top candidate is full address
      expect(candidates[0]).toContain('Shop 14, Sardar Market, Ring Road');
      expect(candidates[0]).toContain('Surat');
      expect(candidates[0]).toContain('395007');

      // Contains pincode and city fallback
      expect(candidates).toContain('Surat, 395007, India');
      expect(candidates).toContain('395007, India');
      expect(candidates).toContain('Surat, Gujarat, India');
    });

    it('should return empty list when no address components provided', () => {
      const candidates = buildQueryCandidates({});
      expect(candidates).toEqual([]);
    });
  });

  describe('geocodeAddress', () => {
    it('should return coordinates when first query matches', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [{
          lat: '21.1702401',
          lon: '72.8310607',
          display_name: 'Surat, Gujarat, India'
        }]
      });

      const result = await geocodeAddress({
        addressLine: 'Sardar Market',
        city: 'Surat',
        pincode: '395007'
      });

      expect(result).not.toBeNull();
      expect(result.latitude).toBeCloseTo(21.1702401, 4);
      expect(result.longitude).toBeCloseTo(72.8310607, 4);
      expect(result.displayName).toBe('Surat, Gujarat, India');
    });

    it('should try fallback candidate when first query returns empty results', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [] // specific address not in OSM
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            lat: '23.1100643',
            lon: '72.5811205',
            display_name: 'Chandkheda, Ahmedabad, Gujarat, India'
          }]
        });

      const result = await geocodeAddress({
        addressLine: 'Flat 101, Super Unique Apartment',
        city: 'Ahmedabad',
        pincode: '382424'
      });

      expect(result).not.toBeNull();
      expect(result.latitude).toBeCloseTo(23.1100643, 4);
      expect(result.longitude).toBeCloseTo(72.5811205, 4);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return null and not throw if network fails completely', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await geocodeAddress({
        addressLine: 'Somewhere',
        city: 'Surat'
      });

      expect(result).toBeNull();
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode valid lat and lon', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          display_name: 'Surat, Gujarat, India',
          address: { city: 'Surat', state: 'Gujarat' }
        })
      });

      const result = await reverseGeocode(21.1702, 72.8311);
      expect(result).not.toBeNull();
      expect(result.display_name).toBe('Surat, Gujarat, India');
    });

    it('should return null if lat or lon is missing or NaN', async () => {
      const result = await reverseGeocode(null, undefined);
      expect(result).toBeNull();
    });
  });
});
