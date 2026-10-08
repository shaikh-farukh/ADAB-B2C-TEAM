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
      st.store_name as "sellerName", 
      'https://via.placeholder.com/150' as image, 
      sl.is_active as status 
    FROM seller_listings sl
    LEFT JOIN stores st ON sl.store_id = st.id
    WHERE sl.id = $1 AND sl.is_active = true 
  `, [id]);
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    ...row,
    status: row.status ? 'PUBLISHED' : 'HIDDEN',
    price: parseFloat(row.price),
    mrp: parseFloat(row.mrp),
    rating: parseFloat(row.rating || 4.5)
  };
};

exports.searchProducts = async (q, page = 1, limit = 10, filters = {}, sortBy = 'relevance') => {
  const offset = (page - 1) * limit;
  let query = `
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
  `;
  const params = [];
  let paramIdx = 1;

  if (q) {
    query += ` AND sl.title ILIKE $${paramIdx}`;
    params.push(`%${q}%`);
    paramIdx++;
  }

  if (filters.category) {
    query += ` AND sl.category_id = $${paramIdx}`;
    params.push(filters.category);
    paramIdx++;
  }

  if (filters.minPrice !== null && filters.minPrice !== undefined) {
    query += ` AND sl.sell_price >= $${paramIdx}`;
    params.push(filters.minPrice);
    paramIdx++;
  }

  if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
    query += ` AND sl.sell_price <= $${paramIdx}`;
    params.push(filters.maxPrice);
    paramIdx++;
  }

  if (filters.brand) {
    query += ` AND sl.brand_tag ILIKE $${paramIdx}`;
    params.push(`%${filters.brand}%`);
    paramIdx++;
  }

  if (filters.minRating) {
    query += ` AND sl.rating >= $${paramIdx}`;
    params.push(filters.minRating);
    paramIdx++;
  }

  if (filters.inStockOnly === true || filters.inStockOnly === 'true') {
    query += ` AND sl.stock_qty > 0`;
  }

  switch(sortBy) {
    case 'price_asc':
      query += ` ORDER BY sl.sell_price ASC`;
      break;
    case 'price_desc':
      query += ` ORDER BY sl.sell_price DESC`;
      break;
    case 'rating_desc':
      query += ` ORDER BY sl.rating DESC NULLS LAST`;
      break;
    case 'relevance':
    default:
      query += ` ORDER BY sl.id DESC`;
      break;
  }

  query += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
  params.push(limit, offset);

  const res = await pool.query(query, params);
  
  return res.rows.map(row => ({
    ...row,
    status: row.status ? 'PUBLISHED' : 'HIDDEN',
    price: parseFloat(row.price),
    mrp: parseFloat(row.mrp),
    rating: parseFloat(row.rating || 4.5)
  }));
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
      '1.2 km' as distance
    FROM stores 
    LIMIT 10
  `);
  
  return res.rows.map(row => ({
    ...row,
    tags: row.tags ? [row.tags] : [],
    rating: parseFloat(row.rating || 4.5)
  }));
};
