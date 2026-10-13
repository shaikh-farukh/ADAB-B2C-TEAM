/**
 * OpenStreetMap Nominatim Geocoding Service
 * Provides automated address-to-coordinate geocoding and reverse geocoding with resilient multi-tier fallbacks.
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const DEFAULT_USER_AGENT = 'ADAB-Shop-Portal/1.0 (support@adab.in)';

/**
 * Builds prioritized query strings from an address structure.
 * India addresses often have specific shop/flat numbers that OSM cannot index directly,
 * so we provide structured fallbacks from hyper-specific down to pincode/city level.
 *
 * @param {Object} params
 * @param {string} [params.addressLine]
 * @param {string} [params.city]
 * @param {string} [params.state]
 * @param {string} [params.pincode]
 * @returns {string[]}
 */
function buildQueryCandidates({ addressLine = '', city = '', state = '', pincode = '' }) {
  const cleanAddress = String(addressLine || '').trim();
  const cleanCity = String(city || '').trim();
  const cleanState = String(state || '').trim();
  const cleanPincode = String(pincode || '').replace(/\D/g, '').trim();

  const candidates = [];
  const parts = cleanAddress.split(',').map(s => s.trim()).filter(Boolean);

  // 1. Full address query
  if (cleanAddress) {
    candidates.push([cleanAddress, cleanCity, cleanState, cleanPincode, 'India'].filter(Boolean).join(', '));

    // 2. Sub-area / Locality without specific shop or flat prefix
    if (parts.length > 1) {
      candidates.push([parts.slice(-2).join(', '), cleanCity, cleanPincode, 'India'].filter(Boolean).join(', '));
      candidates.push([parts[parts.length - 1], cleanCity, cleanPincode, 'India'].filter(Boolean).join(', '));
    }
  }

  // 3. City + Pincode
  if (cleanCity && cleanPincode) {
    candidates.push([cleanCity, cleanPincode, 'India'].filter(Boolean).join(', '));
  }

  // 4. Pincode only
  if (cleanPincode) {
    candidates.push([cleanPincode, 'India'].filter(Boolean).join(', '));
  }

  // 5. City + State
  if (cleanCity) {
    candidates.push([cleanCity, cleanState, 'India'].filter(Boolean).join(', '));
  }

  // Deduplicate preserving order
  return [...new Set(candidates.map(c => c.trim()).filter(Boolean))];
}

/**
 * Geocodes an address to latitude and longitude using OpenStreetMap Nominatim.
 *
 * @param {Object} addressInfo
 * @param {string} [addressInfo.addressLine]
 * @param {string} [addressInfo.city]
 * @param {string} [addressInfo.state]
 * @param {string} [addressInfo.pincode]
 * @param {number} [timeoutMs=3000]
 * @returns {Promise<{ latitude: number, longitude: number, displayName: string, matchedQuery: string } | null>}
 */
async function geocodeAddress(addressInfo, timeoutMs = 3000) {
  const queries = buildQueryCandidates(addressInfo);
  if (queries.length === 0) return null;

  for (const query of queries) {
    try {
      const url = `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!res.ok) continue;

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        if (!isNaN(lat) && !isNaN(lon)) {
          return {
            latitude: Number(lat.toFixed(7)),
            longitude: Number(lon.toFixed(7)),
            displayName: item.display_name || query,
            matchedQuery: query
          };
        }
      }
    } catch (err) {
      // Gracefully continue to next fallback candidate on timeout or network error
      continue;
    }
  }

  return null;
}

/**
 * Reverse geocodes latitude & longitude into a human-readable address.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} [timeoutMs=3000]
 * @returns {Promise<Object | null>}
 */
async function reverseGeocode(latitude, longitude, timeoutMs = 3000) {
  if (latitude == null || longitude == null) return null;
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (isNaN(lat) || isNaN(lon)) return null;

  try {
    const url = `${NOMINATIM_BASE_URL}/reverse?lat=${lat}&lon=${lon}&format=json`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

module.exports = {
  buildQueryCandidates,
  geocodeAddress,
  reverseGeocode
};
