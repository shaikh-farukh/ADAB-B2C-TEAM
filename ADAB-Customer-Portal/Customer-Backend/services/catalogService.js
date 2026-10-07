const pool = require('../db');

exports.getRecommendedProducts = async () => {
  const res = await pool.query(`
    SELECT id, title as name, sell_price as price, mrp, rating, review_count as reviews, 'FreshBakes' as "sellerName", 'https://via.placeholder.com/150' as image, is_active as status 
    FROM seller_listings 
    WHERE is_active = true 
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

exports.searchProducts = async (filters = {}) => {
  let query = `
    SELECT s.id, s.title as name, s.sell_price as price, s.mrp, s.rating, s.review_count as reviews, 'AgroFoods' as "sellerName", 'https://via.placeholder.com/150' as image, s.is_active as status, c.slug as category_slug, c.name as category_name
    FROM seller_listings s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.is_active = true
  `;
  const values = [];
  let paramIndex = 1;

  if (filters.q) {
    query += ` AND s.title ILIKE $${paramIndex++}`;
    values.push(`%${filters.q}%`);
  }

  if (filters.categories && filters.categories.length > 0) {
    query += ` AND c.name = ANY($${paramIndex++})`;
    values.push(filters.categories);
  }

  if (filters.minPrice) {
    query += ` AND s.sell_price >= $${paramIndex++}`;
    values.push(parseFloat(filters.minPrice));
  }

  if (filters.maxPrice) {
    query += ` AND s.sell_price <= $${paramIndex++}`;
    values.push(parseFloat(filters.maxPrice));
  }

  if (filters.sortOrder) {
    switch (filters.sortOrder) {
      case 'Price: Low to High': query += ` ORDER BY s.sell_price ASC`; break;
      case 'Price: High to Low': query += ` ORDER BY s.sell_price DESC`; break;
      case 'Customer Rating': query += ` ORDER BY s.rating DESC NULLS LAST`; break;
      default: break;
    }
  }

  const limit = parseInt(filters.limit) || 20;
  const page = parseInt(filters.page) || 1;
  const offset = (page - 1) * limit;

  query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  values.push(limit, offset);

  const res = await pool.query(query, values);
  
  return res.rows.map(row => ({
    ...row,
    status: row.status ? 'PUBLISHED' : 'HIDDEN',
    price: parseFloat(row.price),
    mrp: parseFloat(row.mrp),
    rating: parseFloat(row.rating || 4.5)
  }));
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

exports.getProductById = async (id) => {
  const res = await pool.query(`
    SELECT s.id, s.title as name, s.sell_price as price, s.mrp, s.rating, s.review_count as reviews, 'AgroFoods' as "sellerName", 'https://via.placeholder.com/150' as image, s.is_active as status, c.slug as category_slug, c.name as category_name
    FROM seller_listings s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.id = $1
  `, [id]);
  
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  
  // Dummy variants/specs data for the detailed view
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
    ]
  };
};

exports.getCategories = async () => {
  const res = await pool.query('SELECT id, name, slug FROM categories WHERE is_active = true');
  return res.rows;
};

exports.getProductsByCategory = async (slug) => {
  // Ideally joined with categories table, assuming category_id match
  const res = await pool.query(`
    SELECT s.id, s.title as name, s.sell_price as price, s.mrp, s.rating, s.review_count as reviews, 'AgroFoods' as "sellerName", 'https://via.placeholder.com/150' as image, s.is_active as status 
    FROM seller_listings s
    JOIN categories c ON s.category_id = c.id
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
