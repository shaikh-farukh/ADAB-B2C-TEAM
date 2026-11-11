const pool = require('../../db');

class CatalogController {
  /**
   * GET /api/v1/shop/catalog/categories/tree
   * Returns complete hierarchical category tree (Root -> Sub-category -> Leaf)
   */
  async getCategoryTree(req, res) {
    try {
      const result = await pool.query(`
        SELECT id, name, slug, parent_id, level, materialized_path, is_leaf, display_order
        FROM categories
        WHERE is_active = true OR is_active IS NULL
        ORDER BY level ASC, display_order ASC, name ASC
      `);

      const categories = result.rows;
      const categoryMap = {};
      const rootCategories = [];

      categories.forEach(cat => {
        categoryMap[cat.id] = { ...cat, children: [] };
      });

      categories.forEach(cat => {
        if (cat.parent_id && categoryMap[cat.parent_id]) {
          categoryMap[cat.parent_id].children.push(categoryMap[cat.id]);
        } else {
          rootCategories.push(categoryMap[cat.id]);
        }
      });

      res.json({
        success: true,
        data: rootCategories
      });
    } catch (err) {
      console.error('Error fetching category tree:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/shop/catalog/categories/:id/attributes
   * Resolves top-down inherited attributes for a given category using recursive CTE
   */
  async getCategoryAttributes(req, res) {
    try {
      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        return res.status(400).json({ success: false, error: 'Invalid category ID' });
      }

      // Check category exists
      const catCheck = await pool.query('SELECT id, name, slug, level, materialized_path FROM categories WHERE id = $1', [categoryId]);
      if (catCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      const category = catCheck.rows[0];

      // Recursive CTE to traverse from category up to ancestors
      const query = `
        WITH RECURSIVE cat_tree AS (
          SELECT id, parent_id, 1 as depth
          FROM categories
          WHERE id = $1
          UNION ALL
          SELECT c.id, c.parent_id, ct.depth + 1
          FROM categories c
          JOIN cat_tree ct ON c.id = ct.parent_id
        )
        SELECT DISTINCT ON (ad.code)
          ad.id AS attribute_id,
          ad.code,
          ad.label,
          ad.description,
          ad.data_type,
          ad.ui_type,
          ad.allowed_values,
          ad.unit_options,
          ad.validation_regex,
          ca.section_group,
          ca.display_order,
          BOOL_OR(ca.is_required) OVER (PARTITION BY ad.code) AS is_required,
          BOOL_OR(ca.is_variant_key) OVER (PARTITION BY ad.code) AS is_variant_key,
          BOOL_OR(ca.is_filter_facet) OVER (PARTITION BY ad.code) AS is_filter_facet,
          c.name AS assigned_at_category
        FROM cat_tree ct
        JOIN category_attributes ca ON ct.id = ca.category_id
        JOIN attribute_definitions ad ON ca.attribute_id = ad.id
        JOIN categories c ON ca.category_id = c.id
        ORDER BY ad.code, ct.depth ASC;
      `;

      const result = await pool.query(query, [categoryId]);

      // Sort by section_group and display_order
      const attributes = result.rows.sort((a, b) => {
        if (a.section_group !== b.section_group) {
          return a.section_group.localeCompare(b.section_group);
        }
        return a.display_order - b.display_order;
      });

      res.json({
        success: true,
        category,
        attributes
      });
    } catch (err) {
      console.error('Error fetching category attributes:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/shop/catalog/master/search?q=...
   * Searches the FMCG Master Catalog by name, brand, or barcode
   */
  async searchMasterCatalog(req, res) {
    try {
      const q = req.query.q ? req.query.q.trim() : '';
      if (!q) {
        // Return popular items if no search query
        const popular = await pool.query(`
          SELECT id, barcode, product_name, brand_name, printed_mrp, standard_unit, default_image_url, category_id
          FROM master_catalog_items
          ORDER BY product_name ASC
          LIMIT 50
        `);
        return res.json({ success: true, data: popular.rows });
      }

      const isBarcode = /^[0-9]{8,14}$/.test(q);
      let query;
      let values;

      if (isBarcode) {
        query = `
          SELECT id, barcode, product_name, brand_name, printed_mrp, standard_unit, default_image_url, category_id
          FROM master_catalog_items
          WHERE barcode = $1
          LIMIT 20
        `;
        values = [q];
      } else {
        query = `
          SELECT id, barcode, product_name, brand_name, printed_mrp, standard_unit, default_image_url, category_id
          FROM master_catalog_items
          WHERE product_name ILIKE $1 OR brand_name ILIKE $1
          ORDER BY 
            CASE WHEN product_name ILIKE $2 THEN 1 ELSE 2 END,
            product_name ASC
          LIMIT 30
        `;
        values = [`%${q}%`, `${q}%`];
      }

      const result = await pool.query(query, values);
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error('Error searching master catalog:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/shop/catalog/b2b/products?q=...
   * Fetches products sourced from registered B2B manufacturers
   */
  async getB2BProducts(req, res) {
    try {
      const q = req.query.q ? req.query.q.trim() : '';
      let query = `
        SELECT 
          id, manufacturer_id, category, category_id, product_name, sku, unit, 
          price AS b2b_price, mrp, stock_quantity, moq, image_url, active
        FROM manage_manufacturer_products
        WHERE active = true
      `;
      let values = [];

      if (q) {
        query += ` AND (product_name ILIKE $1 OR sku ILIKE $1 OR category ILIKE $1)`;
        values = [`%${q}%`];
      }

      query += ` ORDER BY product_name ASC LIMIT 50`;

      const result = await pool.query(query, values);
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error('Error fetching B2B products:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/shop/catalog/barcode/:barcode
   * Instant barcode scan lookup across Master Catalog and B2B products
   */
  async lookupBarcode(req, res) {
    try {
      const barcode = req.params.barcode ? req.params.barcode.trim() : '';
      if (!barcode) {
        return res.status(400).json({ success: false, message: 'Barcode is required' });
      }

      // 1. Check Master FMCG Catalog
      const masterRes = await pool.query(`
        SELECT id, barcode, product_name, brand_name, printed_mrp, standard_unit, default_image_url, category_id
        FROM master_catalog_items
        WHERE barcode = $1
        LIMIT 1
      `, [barcode]);

      if (masterRes.rows.length > 0) {
        const item = masterRes.rows[0];
        return res.json({
          success: true,
          found: true,
          source: 'MASTER_CATALOG',
          data: {
            master_catalog_id: item.id,
            manufacturer_product_id: null,
            title: item.product_name,
            brand_tag: item.brand_name || '',
            mrp: parseFloat(item.printed_mrp || 0),
            sell_price: parseFloat(item.printed_mrp || 0),
            unit: item.standard_unit || 'pack',
            barcode: item.barcode,
            image_url: item.default_image_url || '',
            category_id: item.category_id || null,
            product_type: 'PACKED_ITEM'
          }
        });
      }

      // 2. Check B2B Manufacturer Products (SKU match)
      const b2bRes = await pool.query(`
        SELECT id, product_name, sku, unit, mrp, price, image_url, category, category_id
        FROM manage_manufacturer_products
        WHERE sku = $1 AND active = true
        LIMIT 1
      `, [barcode]);

      if (b2bRes.rows.length > 0) {
        const b2b = b2bRes.rows[0];
        return res.json({
          success: true,
          found: true,
          source: 'B2B_MANUFACTURER',
          data: {
            master_catalog_id: null,
            manufacturer_product_id: b2b.id,
            title: b2b.product_name,
            brand_tag: '',
            mrp: parseFloat(b2b.mrp || 0),
            sell_price: parseFloat(b2b.mrp || 0),
            unit: b2b.unit || 'pack',
            barcode: barcode,
            image_url: b2b.image_url || '',
            category_id: b2b.category_id || null,
            product_type: 'PACKED_ITEM'
          }
        });
      }

      // 3. Not found - allow manual entry
      return res.json({
        success: true,
        found: false,
        message: 'Product with this barcode was not found in catalog. You can enter details manually.'
      });

    } catch (err) {
      console.error('Error looking up barcode:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new CatalogController();

