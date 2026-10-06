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

exports.searchProducts = async (q) => {
  const res = await pool.query(`
    SELECT id, title as name, sell_price as price, mrp, rating, review_count as reviews, 'AgroFoods' as "sellerName", 'https://via.placeholder.com/150' as image, is_active as status 
    FROM seller_listings 
    WHERE is_active = true 
    AND title ILIKE $1
    LIMIT 20
  `, [`%${q || ''}%`]);
  
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
