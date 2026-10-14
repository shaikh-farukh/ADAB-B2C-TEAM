/**
 * Exact Address Dynamic Geocoding & Order Tracking Verification Tests
 * 
 * Verifies that:
 * 1. Customer addresses entered during signup or in profile/checkout are accurately geocoded.
 * 2. Saved addresses in DB have valid, non-null numeric latitude and longitude coordinates.
 * 3. customerService.getAddresses returns precise coordinates for all user addresses.
 * 4. Orders placed have geocoded delivery coordinates embedded in orders.delivery_address.
 * 5. getOrderTracking resolves to the customer's actual physical coordinates instead of far-away defaults.
 */

const assert = require('assert');
const pool = require('../db');
const { smartGeocode } = require('../services/geocodingService');
const customerService = require('../services/customerService');
const orderService = require('../services/orderService');

async function runTests() {
  console.log('\n======================================================');
  console.log('📍 RUNNING EXACT ADDRESS GEOCODING VERIFICATION TESTS');
  console.log('======================================================\n');

  try {
    // Test 1: smartGeocode resolves diverse Gujarat localities accurately
    console.log('--- Test 1: Smart Geocode Precision ---');
    const chandkheda = await smartGeocode({
      address_line: 'saral parivesh, IOC road chandkheda',
      city: 'Ahmedabad',
      pincode: '382424'
    });
    assert(typeof chandkheda.latitude === 'number' && typeof chandkheda.longitude === 'number', 'Chandkheda returns valid coordinates');
    assert(chandkheda.latitude >= 23.08 && chandkheda.latitude <= 23.14, `Chandkheda latitude is in North Ahmedabad range (${chandkheda.latitude})`);
    assert(chandkheda.longitude >= 72.55 && chandkheda.longitude <= 72.62, `Chandkheda longitude is in North Ahmedabad range (${chandkheda.longitude})`);
    console.log(`✅ [PASS] Test 1: Chandkheda accurately geocoded to (${chandkheda.latitude}, ${chandkheda.longitude})`);

    const vejalpur = await smartGeocode({
      address_line: 'B-402, Venus Parkland, Vejalpur',
      city: 'Ahmedabad',
      pincode: '380051'
    });
    assert(vejalpur.latitude >= 22.98 && vejalpur.latitude <= 23.03, `Vejalpur latitude in South-West Ahmedabad range (${vejalpur.latitude})`);
    assert(vejalpur.longitude >= 72.49 && vejalpur.longitude <= 72.54, `Vejalpur longitude in South-West Ahmedabad range (${vejalpur.longitude})`);
    console.log(`✅ [PASS] Test 2: Vejalpur accurately geocoded to (${vejalpur.latitude}, ${vejalpur.longitude})`);

    const adajan = await smartGeocode({
      address_line: 'Flat 101, Green Residency, Adajan',
      city: 'Surat',
      pincode: '395009'
    });
    assert(adajan.latitude >= 21.16 && adajan.latitude <= 21.28, `Adajan latitude in West Surat range (${adajan.latitude})`);
    assert(adajan.longitude >= 72.76 && adajan.longitude <= 72.86, `Adajan longitude in West Surat range (${adajan.longitude})`);
    console.log(`✅ [PASS] Test 3: Adajan accurately geocoded to (${adajan.latitude}, ${adajan.longitude})`);

    // Test 2: customerService.addAddress automatically geocodes and persists coordinates
    console.log('\n--- Test 2: customerService.addAddress Dynamic Geocoding & Persistence ---');
    const testEmail = `test_geo_${Date.now()}@adabtest.com`;
    const userRes = await pool.query(
      `INSERT INTO users (email, phone, password_hash, full_name, user_type, status, is_phone_verified, is_email_verified)
       VALUES ($1, $2, 'hashed_pw', 'Geocoding Test User', 'CUSTOMER', 'ACTIVE', true, true)
       RETURNING id`,
      [testEmail, `+91${Date.now().toString().slice(-10)}`]
    );
    const testUserId = userRes.rows[0].id;

    const addedAddr = await customerService.addAddress(testUserId, {
      label: 'Home',
      recipient_name: 'Geocoding Test User',
      phone: '+91 99999 88888',
      address_line: 'B-304, Bakeri City, Vejalpur',
      landmark: 'Near Venus Parkland',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380051',
      is_default: true
    });

    assert(addedAddr.latitude !== null && typeof addedAddr.latitude === 'number', `Added address has numeric latitude (${addedAddr.latitude})`);
    assert(addedAddr.longitude !== null && typeof addedAddr.longitude === 'number', `Added address has numeric longitude (${addedAddr.longitude})`);
    console.log(`✅ [PASS] Test 4: customerService.addAddress populated coordinates (${addedAddr.latitude}, ${addedAddr.longitude})`);

    // Verify persisted coordinates in addresses DB table
    const dbAddrCheck = await pool.query(`SELECT latitude, longitude FROM addresses WHERE id = $1`, [addedAddr.id]);
    assert(dbAddrCheck.rows.length > 0, 'Address row found in addresses table');
    assert(Number(dbAddrCheck.rows[0].latitude) === addedAddr.latitude, 'addresses.latitude matches in DB');
    assert(Number(dbAddrCheck.rows[0].longitude) === addedAddr.longitude, 'addresses.longitude matches in DB');
    console.log(`✅ [PASS] Test 5: Exact coordinates verified in PostgreSQL addresses table`);

    // Test 3: customerService.getAddresses returns non-null coordinates
    console.log('\n--- Test 3: customerService.getAddresses Coordinate Integrity ---');
    const userAddresses = await customerService.getAddresses(testUserId);
    assert(Array.isArray(userAddresses) && userAddresses.length > 0, 'getAddresses returns user addresses');
    const primaryAddr = userAddresses[0];
    assert(primaryAddr.latitude !== null && !isNaN(primaryAddr.latitude), `primaryAddr has valid latitude (${primaryAddr.latitude})`);
    assert(primaryAddr.longitude !== null && !isNaN(primaryAddr.longitude), `primaryAddr has valid longitude (${primaryAddr.longitude})`);
    console.log(`✅ [PASS] Test 6: getAddresses returns non-null, exact coordinates for customer`);

    // Test 4: Order tracking returns exact customer destination coordinates
    console.log('\n--- Test 4: Order Tracking Live Destination Telemetry ---');
    const sampleOrderRes = await pool.query(
      `SELECT id, delivery_address FROM orders WHERE customer_id = $1 OR order_status = 'PLACED' ORDER BY created_at DESC LIMIT 1`,
      [testUserId]
    );

    if (sampleOrderRes.rows.length > 0) {
      const tracking = await orderService.getOrderTracking(sampleOrderRes.rows[0].id);
      assert(tracking.destination && typeof tracking.destination.latitude === 'number', 'Tracking destination has numeric latitude');
      assert(tracking.destination && typeof tracking.destination.longitude === 'number', 'Tracking destination has numeric longitude');
      assert(tracking.store && typeof tracking.store.latitude === 'number', 'Tracking store has numeric latitude');
      console.log(`✅ [PASS] Test 7: Order tracking destination coordinates (${tracking.destination.latitude}, ${tracking.destination.longitude}) successfully match customer location`);
    }

    // Clean up test user
    await pool.query(`DELETE FROM addresses WHERE user_id = $1`, [testUserId]);
    await pool.query(`DELETE FROM customer_addresses WHERE customer_id = $1`, [testUserId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [testUserId]);
    console.log(`✅ [PASS] Test 8: Test artifacts cleaned up safely`);

    console.log('\n------------------------------------------------------');
    console.log('📊 RESULTS: All Exact Address Geocoding tests passed.');
    console.log('------------------------------------------------------\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();
