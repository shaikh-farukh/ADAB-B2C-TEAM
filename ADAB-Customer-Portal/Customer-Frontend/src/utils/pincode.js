/**
 * Indian Pincode Auto-detection Utility
 * Provides offline instant heuristic lookup for Gujarat & major metros,
 * supplemented with live Indian Postal PIN Code API query.
 */

const PINCODE_CACHE = new Map();

// Offline high-confidence prefix map for Gujarat and major Indian hubs
const OFFLINE_PREFIX_MAP = {
  // Gujarat
  '380': { city: 'Ahmedabad', state: 'Gujarat' },
  '382': { city: 'Gandhinagar', state: 'Gujarat' },
  '395': { city: 'Surat', state: 'Gujarat' },
  '394': { city: 'Surat', state: 'Gujarat' },
  '390': { city: 'Vadodara', state: 'Gujarat' },
  '391': { city: 'Vadodara', state: 'Gujarat' },
  '360': { city: 'Rajkot', state: 'Gujarat' },
  '361': { city: 'Jamnagar', state: 'Gujarat' },
  '364': { city: 'Bhavnagar', state: 'Gujarat' },
  '388': { city: 'Anand', state: 'Gujarat' },
  '387': { city: 'Kheda', state: 'Gujarat' },
  '384': { city: 'Mehsana', state: 'Gujarat' },
  '385': { city: 'Banaskantha', state: 'Gujarat' },
  '383': { city: 'Sabarkantha', state: 'Gujarat' },
  '362': { city: 'Junagadh', state: 'Gujarat' },
  '363': { city: 'Surendranagar', state: 'Gujarat' },
  '365': { city: 'Amreli', state: 'Gujarat' },
  '370': { city: 'Kutch', state: 'Gujarat' },
  '396': { city: 'Valsad', state: 'Gujarat' },
  '392': { city: 'Bharuch', state: 'Gujarat' },
  '393': { city: 'Ankleshwar', state: 'Gujarat' },

  // Major Indian Metros
  '400': { city: 'Mumbai', state: 'Maharashtra' },
  '411': { city: 'Pune', state: 'Maharashtra' },
  '110': { city: 'Delhi', state: 'Delhi' },
  '560': { city: 'Bengaluru', state: 'Karnataka' },
  '500': { city: 'Hyderabad', state: 'Telangana' },
  '600': { city: 'Chennai', state: 'Tamil Nadu' },
  '700': { city: 'Kolkata', state: 'West Bengal' },
  '302': { city: 'Jaipur', state: 'Rajasthan' },
  '226': { city: 'Lucknow', state: 'Uttar Pradesh' },
  '452': { city: 'Indore', state: 'Madhya Pradesh' },
  '462': { city: 'Bhopal', state: 'Madhya Pradesh' },
  '682': { city: 'Kochi', state: 'Kerala' },
  '751': { city: 'Bhubaneswar', state: 'Odisha' },
  '781': { city: 'Guwahati', state: 'Assam' },
  '160': { city: 'Chandigarh', state: 'Chandigarh' }
};

/**
 * Returns instant offline detection if prefix matches
 */
export function getOfflinePincodeHint(pincode) {
  const clean = String(pincode || '').replace(/\D/g, '').slice(0, 6);
  if (clean.length < 3) return null;
  const prefix = clean.slice(0, 3);
  return OFFLINE_PREFIX_MAP[prefix] || null;
}

/**
 * Performs full pincode lookup (instant cache -> offline heuristic -> postal API)
 * @param {string} pincode 6-digit Indian PIN code
 * @returns {Promise<{ city: string, state: string, source: 'cache'|'api'|'offline' } | null>}
 */
export async function lookupPincode(pincode) {
  const clean = String(pincode || '').replace(/\D/g, '').slice(0, 6);
  if (clean.length !== 6) return null;

  // 1. Check memory cache
  if (PINCODE_CACHE.has(clean)) {
    return PINCODE_CACHE.get(clean);
  }

  // 2. Offline prefix hint as immediate fallback candidate
  const offlineCandidate = getOfflinePincodeHint(clean);

  // 3. Try live postal API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        const detectedCity = po.District || po.Block || po.Circle || (offlineCandidate ? offlineCandidate.city : '');
        const detectedState = po.State || (offlineCandidate ? offlineCandidate.state : 'Gujarat');

        const result = {
          city: detectedCity.trim(),
          state: detectedState.trim(),
          source: 'api'
        };
        PINCODE_CACHE.set(clean, result);
        return result;
      }
    }
  } catch (err) {
    // Network failure, timeout, or offline - fallback to offline candidate
    console.debug('Pincode API lookup fallback:', err.message);
  }

  // 4. Return offline candidate if available
  if (offlineCandidate) {
    const result = { ...offlineCandidate, source: 'offline' };
    PINCODE_CACHE.set(clean, result);
    return result;
  }

  return null;
}
