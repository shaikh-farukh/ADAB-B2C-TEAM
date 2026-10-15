const http = require('http');
const pool = require('../db');
const catalogService = require('../services/catalogService');

const BASE_URL = 'http://localhost:5002';

function httpRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          parsed = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runDealsAndOffersTests() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING DEALS & OFFERS API VERIFICATION TEST SUITE');
  console.log('Target: Customer Portal Deals & Offers (Mahi)');
  console.log('Canonical Tables: products, product_variants, seller_listings, categories, brands');
  console.log('Strict DB Boundary: Zero mutations on foreign tables');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] Test ${total}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // SERVICE LAYER TESTS (Unit verification against live database projections)
    // -------------------------------------------------------------------------

    // 1. Service: getDeals basic retrieval
    const serviceDealsResult = await catalogService.getDeals();
    const serviceDeals = serviceDealsResult.deals;
    assert(Array.isArray(serviceDeals) && serviceDeals.length > 0, 
      `catalogService.getDeals() returned ${serviceDeals.length} active deals from PostgreSQL`);

    // 2. Service: Deal attributes verification
    const firstDeal = serviceDeals[0];
    assert(
      firstDeal.id && 
      firstDeal.title && 
      typeof firstDeal.price === 'number' && 
      typeof firstDeal.mrp === 'number' && 
      firstDeal.discount && 
      typeof firstDeal.discountPercent === 'number' && 
      firstDeal.code && 
      firstDeal.categoryName && 
      firstDeal.sellerName && 
      typeof firstDeal.stock_qty === 'number',
      `Deal projection contains all required contract fields: title="${firstDeal.title}", price=₹${firstDeal.price}, mrp=₹${firstDeal.mrp}, discount="${firstDeal.discount}", code="${firstDeal.code}", seller="${firstDeal.sellerName}"`
    );

    // 3. Service: Category filter
    const snacksDeals = await catalogService.getDeals({ category: 'snacks-packaged-food' });
    assert(
      snacksDeals.deals.length > 0 && snacksDeals.deals.every(d => d.categorySlug === 'snacks-packaged-food'),
      `Category filter ?category=snacks-packaged-food returned ${snacksDeals.deals.length} deals, all within snacks-packaged-food`
    );

    // 4. Service: Search filter
    const searchResult = await catalogService.getDeals({ search: 'cutlets' });
    assert(
      searchResult.deals.length > 0 && searchResult.deals.some(d => d.title.toLowerCase().includes('cutlets')),
      `Search filter ?search=cutlets found ${searchResult.deals.length} matching deal(s)`
    );

    // 5. Service: Min discount filter
    const highDiscountDeals = await catalogService.getDeals({ min_discount: 10 });
    assert(
      highDiscountDeals.deals.length > 0 && highDiscountDeals.deals.every(d => d.discountPercent >= 10),
      `Min discount filter ?min_discount=10 returned ${highDiscountDeals.deals.length} deal(s) with discount >= 10%`
    );

    // 6. Service: Featured deals
    const featuredDeals = await catalogService.getFeaturedDeals();
    assert(
      Array.isArray(featuredDeals) && featuredDeals.length > 0 && featuredDeals.every(d => d.featured),
      `catalogService.getFeaturedDeals() returned ${featuredDeals.length} featured deal(s)`
    );

    // 7. Service: Deal categories aggregation
    const dealCategories = await catalogService.getDealCategories();
    assert(
      Array.isArray(dealCategories) && dealCategories.length > 0 && dealCategories[0].slug && typeof dealCategories[0].count === 'number',
      `catalogService.getDealCategories() returned ${dealCategories.length} distinct categories: ${dealCategories.map(c => `${c.name} (${c.count})`).join(', ')}`
    );

    // 8. Service: getDealById for approved listing
    const approvedListingId = firstDeal.id;
    const singleDeal = await catalogService.getDealById(approvedListingId);
    assert(
      singleDeal !== null && singleDeal.id === approvedListingId && singleDeal.sellerName,
      `catalogService.getDealById("${approvedListingId}") returned full detail with seller="${singleDeal.sellerName}" and stock=${singleDeal.stock_qty}`
    );

    // 9. Service: Strict Approval Gate for unapproved listing
    const unapprovedRes = await pool.query(
      `SELECT id, title, approval_status FROM seller_listings WHERE approval_status != 'APPROVED' LIMIT 1`
    );
    if (unapprovedRes.rows.length > 0) {
      const unapprovedId = unapprovedRes.rows[0].id;
      const unapprovedDeal = await catalogService.getDealById(unapprovedId);
      assert(
        unapprovedDeal === null,
        `Strict Approval Gate: unapproved listing "${unapprovedRes.rows[0].title}" (${unapprovedRes.rows[0].approval_status}) correctly returned null from service`
      );
    } else {
      assert(true, 'No unapproved listing found in database to test (skipped null assertion)');
    }

    // -------------------------------------------------------------------------
    // HTTP API ENDPOINT TESTS (Live Express Server on Port 5002)
    // -------------------------------------------------------------------------

    // 10. HTTP: GET /api/v1/catalog/deals (API #1 from specification)
    const httpDeals = await httpRequest('/api/v1/catalog/deals');
    assert(
      httpDeals.statusCode === 200 && httpDeals.data.success === true && Array.isArray(httpDeals.data.data),
      `HTTP GET /api/v1/catalog/deals returned 200 OK with ${httpDeals.data.data.length} deals`
    );

    // 11. HTTP: Pagination contract verification
    const httpPaginated = await httpRequest('/api/v1/catalog/deals?page=1&limit=3');
    assert(
      httpPaginated.statusCode === 200 && 
      httpPaginated.data.data.length <= 3 && 
      httpPaginated.data.pagination &&
      httpPaginated.data.pagination.page === 1 &&
      httpPaginated.data.pagination.limit === 3 &&
      httpPaginated.data.pagination.total >= httpPaginated.data.data.length,
      `HTTP Pagination verified: page=${httpPaginated.data.pagination.page}, limit=${httpPaginated.data.pagination.limit}, total=${httpPaginated.data.pagination.total}, totalPages=${httpPaginated.data.pagination.totalPages}`
    );

    // 12. HTTP: Validation error on invalid query parameters (400 Bad Request)
    const httpInvalidDiscount = await httpRequest('/api/v1/catalog/deals?min_discount=invalid_number');
    assert(
      httpInvalidDiscount.statusCode === 400 && 
      httpInvalidDiscount.data.success === false && 
      httpInvalidDiscount.data.message.includes('Validation Error'),
      `HTTP 400 validation error returned on invalid min_discount: "${httpInvalidDiscount.data.message}"`
    );

    const httpInvalidPage = await httpRequest('/api/v1/catalog/deals?page=-5');
    assert(
      httpInvalidPage.statusCode === 400 && 
      httpInvalidPage.data.success === false && 
      httpInvalidPage.data.message.includes('Validation Error'),
      `HTTP 400 validation error returned on invalid negative page: "${httpInvalidPage.data.message}"`
    );

    // 13. HTTP: GET /api/v1/catalog/deals/:id (API #2 from specification)
    const httpSingleDeal = await httpRequest(`/api/v1/catalog/deals/${firstDeal.id}`);
    assert(
      httpSingleDeal.statusCode === 200 && 
      httpSingleDeal.data.success === true && 
      httpSingleDeal.data.data.id === firstDeal.id &&
      httpSingleDeal.data.data.price === firstDeal.price,
      `HTTP GET /api/v1/catalog/deals/:id returned 200 OK for approved listing "${firstDeal.title}" with valid pricing and stock`
    );

    // 14. HTTP: Strict Approval Gate returns 404 for unapproved listing
    if (unapprovedRes.rows.length > 0) {
      const unapprovedId = unapprovedRes.rows[0].id;
      const httpUnapproved = await httpRequest(`/api/v1/catalog/deals/${unapprovedId}`);
      assert(
        httpUnapproved.statusCode === 404 && 
        httpUnapproved.data.success === false && 
        httpUnapproved.data.message.includes('not found'),
        `HTTP 404 correctly returned for unapproved (${unapprovedRes.rows[0].approval_status}) listing: "${httpUnapproved.data.message}"`
      );
    }

    // 15. HTTP: 404 for non-existent UUID
    const httpNotFound = await httpRequest('/api/v1/catalog/deals/00000000-0000-0000-0000-000000000000');
    assert(
      httpNotFound.statusCode === 404 && httpNotFound.data.success === false,
      'HTTP 404 correctly returned for non-existent deal ID'
    );

    // 16. HTTP: GET /api/v1/catalog/deals/categories
    const httpCategories = await httpRequest('/api/v1/catalog/deals/categories');
    assert(
      httpCategories.statusCode === 200 && Array.isArray(httpCategories.data.data),
      `HTTP GET /api/v1/catalog/deals/categories returned 200 OK with ${httpCategories.data.data.length} categories`
    );

    // 17. HTTP: GET /api/v1/catalog/deals/featured
    const httpFeatured = await httpRequest('/api/v1/catalog/deals/featured');
    assert(
      httpFeatured.statusCode === 200 && Array.isArray(httpFeatured.data.data),
      `HTTP GET /api/v1/catalog/deals/featured returned 200 OK with ${httpFeatured.data.data.length} featured deals`
    );

    console.log('\n======================================================');
    console.log(`🎉 TEST SUITE COMPLETED: ${passed}/${total} TESTS PASSED`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Test suite aborted with error:', err.message);
    process.exit(1);
  } finally {
    pool.end();
  }
}

runDealsAndOffersTests();
