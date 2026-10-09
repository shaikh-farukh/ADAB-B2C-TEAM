const pool = require('../db');

exports.getRecommendedProducts = async () => {
  const res = await pool.query(`
    SELECT 
      sl.id, 
      sl.title as name, 
      sl.sell_price as price, 
      sl.mrp, 
      sl.rating, 
      sl.review_count as reviews, 
      st.store_name as "sellerName", 
      'https://via.placeholder.com/150' as image, 
      sl.is_active as status 
    FROM seller_listings sl
    LEFT JOIN stores st ON sl.store_id = st.id
    WHERE sl.is_active = true 
    LIMIT 10
  `);
  return res.rows.map(row => ({
    ...row,
    status: row.status ? 'PUBLISHED' : 'HIDDEN',
    price: parseFloat(row.price),
    mrp: parseFloat(row.mrp),
    rating: parseFloat(row.rating || 4.5)
  }));
};

exports.getProductById = async (id) => {
  const res = await pool.query(`
    SELECT 
      sl.id, 
      sl.title as name, 
      sl.sell_price as price, 
      sl.mrp, 
      sl.rating, 
      sl.review_count as reviews, 
      COALESCE(st.store_name, 'AgroFoods') as "sellerName", 
      'https://via.placeholder.com/150' as image, 
      sl.is_active as status,
      c.slug as category_slug,
      c.name as category_name
    FROM seller_listings sl
    LEFT JOIN stores st ON sl.store_id = st.id
    LEFT JOIN categories c ON sl.category_id = c.id
    WHERE sl.id = $1 AND sl.is_active = true 
  `, [id]);

  if (res.rows.length === 0) return null;
  const row = res.rows[0];

  return {
    ...row,
    status: row.status ? 'PUBLISHED' : 'HIDDEN',
    price: parseFloat(row.price),
    mrp: parseFloat(row.mrp),
    rating: parseFloat(row.rating || 4.5),
    description: "Detailed product description goes here. This product is highly rated and sourced directly from verified sellers.",
    images: [row.image, 'https://via.placeholder.com/150?text=Image+2', 'https://via.placeholder.com/150?text=Image+3'],
    specs: {
      brand: "Fresh Farms",
      weight: "500g",
      shelfLife: "6 months"
    },
    variants: [
      { id: 1, name: "500g", price: parseFloat(row.price) },
      { id: 2, name: "1kg", price: parseFloat(row.price) * 1.9 }
    ],
    deliveryEstimate: 'Tomorrow, by 10 AM',
    returnPolicy: '7 Days Returnable'
  };
};

exports.getProductSellers = async (id) => {
  // Mock seller offers for the product
  const res = await pool.query(`
    SELECT sl.id, sl.sell_price as price, sl.mrp, sl.stock_qty, sl.delivery_estimate, st.store_name, st.rating, st.id as store_id
    FROM seller_listings sl
    LEFT JOIN stores st ON sl.store_id = st.id
    WHERE sl.product_id = (SELECT product_id FROM seller_listings WHERE id = $1 LIMIT 1) 
      AND sl.is_active = true
  `, [id]);
  
  if (res.rows.length === 0) {
    // Return mock sellers if product_id logic fails (as we only have seller_listings seeded directly sometimes)
    return [
      {
        id: id,
        store_id: 1,
        store_name: "Fresh Farms",
        price: 199,
        mrp: 249,
        stock_qty: 50,
        rating: 4.8,
        delivery_estimate: "Tomorrow, by 10 AM",
        return_policy: "7 Days Returnable"
      },
      {
        id: id + 1000,
        store_id: 2,
        store_name: "Daily Mart",
        price: 205,
        mrp: 249,
        stock_qty: 12,
        rating: 4.2,
        delivery_estimate: "Today, by 8 PM",
        return_policy: "Non-returnable"
      }
    ];
  }

  return res.rows.map(row => ({
    ...row,
    price: parseFloat(row.price),
    mrp: parseFloat(row.mrp),
    rating: parseFloat(row.rating || 4.5),
    return_policy: "7 Days Returnable"
  }));
};

exports.getRelatedProducts = async (id) => {
  // Just reuse getRecommendedProducts for now
  return exports.getRecommendedProducts();
};

exports.searchProducts = async (qOrFilters = {}, pageArg = 1, limitArg = 20, filtersArg = {}, sortByArg = 'relevance') => {
  let q, page, limit, category, categories, minPrice, maxPrice, brand, minRating, inStockOnly, sortBy, sortOrder;

  if (typeof qOrFilters === 'object' && qOrFilters !== null) {
    q = qOrFilters.q || '';
    page = parseInt(qOrFilters.page) || 1;
    limit = parseInt(qOrFilters.limit) || 20;
    category = qOrFilters.category || null;
    categories = Array.isArray(qOrFilters.categories) ? qOrFilters.categories : [];
    minPrice = qOrFilters.minPrice !== undefined && qOrFilters.minPrice !== null && qOrFilters.minPrice !== '' ? parseFloat(qOrFilters.minPrice) : null;
    maxPrice = qOrFilters.maxPrice !== undefined && qOrFilters.maxPrice !== null && qOrFilters.maxPrice !== '' ? parseFloat(qOrFilters.maxPrice) : null;
    brand = qOrFilters.brand || null;
    minRating = qOrFilters.minRating ? parseFloat(qOrFilters.minRating) : null;
    inStockOnly = qOrFilters.inStockOnly === true || qOrFilters.inStockOnly === 'true';
    sortBy = qOrFilters.sortBy || null;
    sortOrder = qOrFilters.sortOrder || null;
  } else {
    q = qOrFilters || '';
    page = parseInt(pageArg) || 1;
    limit = parseInt(limitArg) || 20;
    category = filtersArg.category || null;
    categories = Array.isArray(filtersArg.categories) ? filtersArg.categories : [];
    minPrice = filtersArg.minPrice !== undefined && filtersArg.minPrice !== null && filtersArg.minPrice !== '' ? parseFloat(filtersArg.minPrice) : null;
    maxPrice = filtersArg.maxPrice !== undefined && filtersArg.maxPrice !== null && filtersArg.maxPrice !== '' ? parseFloat(filtersArg.maxPrice) : null;
    brand = filtersArg.brand || null;
    minRating = filtersArg.minRating ? parseFloat(filtersArg.minRating) : null;
    inStockOnly = filtersArg.inStockOnly === true || filtersArg.inStockOnly === 'true';
    sortBy = sortByArg || 'relevance';
    sortOrder = filtersArg.sortOrder || null;
  }

  const offset = (page - 1) * limit;
  let whereClause = ` WHERE sl.is_active = true`;
  const params = [];
  let paramIdx = 1;

  if (q) {
    whereClause += ` AND sl.title ILIKE $${paramIdx++}`;
    params.push(`%${q}%`);
  }

  if (category) {
    whereClause += ` AND (sl.category_id::text = $${paramIdx} OR c.slug = $${paramIdx})`;
    paramIdx++;
    params.push(String(category));
  }

  if (categories && categories.length > 0) {
    whereClause += ` AND c.name = ANY($${paramIdx++})`;
    params.push(categories);
  }

  if (minPrice !== null && !isNaN(minPrice)) {
    whereClause += ` AND sl.sell_price >= $${paramIdx++}`;
    params.push(minPrice);
  }

  if (maxPrice !== null && !isNaN(maxPrice)) {
    whereClause += ` AND sl.sell_price <= $${paramIdx++}`;
    params.push(maxPrice);
  }

  if (brand) {
    whereClause += ` AND sl.brand_tag ILIKE $${paramIdx++}`;
    params.push(`%${brand}%`);
  }

  if (minRating !== null && !isNaN(minRating)) {
    whereClause += ` AND sl.rating >= $${paramIdx++}`;
    params.push(minRating);
  }

  if (inStockOnly) {
    whereClause += ` AND sl.stock_qty > 0`;
  }

  // Count total matches for accurate pagination
  const countQuery = `
    SELECT COUNT(*) as total
    FROM seller_listings sl
    LEFT JOIN stores st ON sl.store_id = st.id
    LEFT JOIN categories c ON sl.category_id = c.id
    ${whereClause}
  `;
  const countRes = await pool.query(countQuery, params);
  const total = parseInt(countRes.rows[0]?.total || 0, 10);

  let query = `
    SELECT 
      sl.id, 
      sl.title as name, 
      sl.sell_price as price, 
      sl.mrp, 
      sl.rating, 
      sl.review_count as reviews, 
      COALESCE(st.store_name, 'AgroFoods') as "sellerName", 
      'https://via.placeholder.com/150' as image, 
      sl.is_active as status,
      c.slug as category_slug,
      c.name as category_name
    FROM seller_listings sl
    LEFT JOIN stores st ON sl.store_id = st.id
    LEFT JOIN categories c ON sl.category_id = c.id
    ${whereClause}
  `;

  const effectiveSort = sortOrder || sortBy;
  switch (effectiveSort) {
    case 'Price: Low to High':
    case 'price_asc':
      query += ` ORDER BY sl.sell_price ASC`;
      break;
    case 'Price: High to Low':
    case 'price_desc':
      query += ` ORDER BY sl.sell_price DESC`;
      break;
    case 'Customer Rating':
    case 'rating_desc':
      query += ` ORDER BY sl.rating DESC NULLS LAST`;
      break;
    case 'relevance':
    default:
      query += ` ORDER BY sl.id DESC`;
      break;
  }

  const dataParams = [...params, limit, offset];
  query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;

  const res = await pool.query(query, dataParams);

  const data = res.rows.map(row => ({
    ...row,
    status: row.status ? 'PUBLISHED' : 'HIDDEN',
    price: parseFloat(row.price),
    mrp: parseFloat(row.mrp),
    rating: parseFloat(row.rating || 4.5)
  }));

  return { data, total };
};

exports.getSearchSuggestions = async (q) => {
  const res = await pool.query(`
    SELECT title as suggestion 
    FROM seller_listings 
    WHERE is_active = true AND title ILIKE $1 
    LIMIT 5
  `, [`%${q || ''}%`]);
  return res.rows.map(r => r.suggestion);
};

exports.getCategories = async () => {
  const res = await pool.query('SELECT id, name, slug FROM categories WHERE is_active = true');
  return res.rows;
};

exports.getProductsByCategory = async (slug) => {
  // Ideally joined with categories table, assuming category_id match
  const res = await pool.query(`
    SELECT 
      s.id, 
      s.title as name, 
      s.sell_price as price, 
      s.mrp, 
      s.rating, 
      s.review_count as reviews, 
      st.store_name as "sellerName", 
      'https://via.placeholder.com/150' as image, 
      s.is_active as status 
    FROM seller_listings s
    JOIN categories c ON s.category_id = c.id
    LEFT JOIN stores st ON s.store_id = st.id
    WHERE s.is_active = true AND c.slug = $1
    LIMIT 20
  `, [slug]);
  
  return res.rows.map(row => ({
    ...row,
    status: row.status ? 'PUBLISHED' : 'HIDDEN',
    price: parseFloat(row.price),
    mrp: parseFloat(row.mrp),
    rating: parseFloat(row.rating || 4.5)
  }));
};

exports.getStores = async () => {
  const res = await pool.query(`
    SELECT 
      id, 
      store_name as name, 
      category as tags, 
      rating, 
      address_line as area,
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80' as image,
      COALESCE(delivery_radius_km || ' km', '1.2 km') as distance
    FROM stores 
    LIMIT 10
  `);
  
  return res.rows.map(row => ({
    ...row,
    tags: row.tags ? [row.tags] : [],
    rating: parseFloat(row.rating || 4.5)
  }));
};

exports.getPromotions = async () => {
  const res = await pool.query(`
    SELECT 
      p.*, 
      s.store_name 
    FROM promotions p
    LEFT JOIN stores s ON p.store_id = s.id
    WHERE p.is_active = true
    ORDER BY p.created_at DESC
  `);
  return res.rows;
};

