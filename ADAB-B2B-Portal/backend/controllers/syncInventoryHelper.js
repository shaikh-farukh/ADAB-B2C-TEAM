import pool from '../Config/database.js';

export const syncB2BOrderToShopInventory = async (orderId, shopId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get the items from the order
    const orderItemsResult = await client.query(`
      SELECT od.fk_product, od.quantity, od.unit_price, mp.category, mp.sub_category, mp.product_name, mp.description, mp.product_image
      FROM manage_b2b_purchase_order_detail od
      JOIN manage_manufacturer_products mp ON od.fk_product = mp.id
      WHERE od.fk_purchase_order = $1
    `, [orderId]);

    for (const item of orderItemsResult.rows) {
      let categoryId = null;
      let subcategoryId = null;
      let productId = null;

      // Ensure Category exists in Master
      if (item.category) {
        const catRes = await client.query('SELECT id FROM manage_category_master WHERE name ILIKE $1', [item.category]);
        if (catRes.rows.length > 0) {
          categoryId = catRes.rows[0].id;
        } else {
          const insertCat = await client.query(`
            INSERT INTO manage_category_master (name, active, create_at, create_by)
            VALUES ($1, 1, CURRENT_TIMESTAMP, 1) RETURNING id
          `, [item.category]);
          categoryId = insertCat.rows[0].id;
        }
      }

      // Ensure Subcategory exists in Master
      if (item.sub_category && categoryId) {
        const subcatRes = await client.query('SELECT id FROM manage_subcategory_master WHERE subcategory ILIKE $1 AND fk_manage_category_master = $2', [item.sub_category, categoryId]);
        if (subcatRes.rows.length > 0) {
          subcategoryId = subcatRes.rows[0].id;
        } else {
          const insertSubcat = await client.query(`
            INSERT INTO manage_subcategory_master (subcategory, fk_manage_category_master, active, create_at, create_by)
            VALUES ($1, $2, 1, CURRENT_TIMESTAMP, 1) RETURNING id
          `, [item.sub_category, categoryId]);
          subcategoryId = insertSubcat.rows[0].id;
        }
      }

      // Ensure Product exists in Master
      if (item.product_name && subcategoryId) {
        const prodRes = await client.query('SELECT id FROM manage_product_master WHERE product_name ILIKE $1 AND fk_subcategory = $2', [item.product_name, subcategoryId]);
        if (prodRes.rows.length > 0) {
          productId = prodRes.rows[0].id;
        } else {
          const insertProd = await client.query(`
            INSERT INTO manage_product_master (product_name, fk_subcategory, active, create_at, create_by, approval_status, description, productimage)
            VALUES ($1, $2, 1, CURRENT_TIMESTAMP, 1, 'approved', $3, $4::bytea) RETURNING id
          `, [item.product_name, subcategoryId, item.description, item.product_image || null]);
          productId = insertProd.rows[0].id;
        }
      }

      if (!categoryId || !subcategoryId || !productId) {
        continue; // Cannot proceed without valid master entries
      }

      // Link Subcategory to Shop
      const shopSubcatRes = await client.query('SELECT id FROM shop_subcategory_master WHERE fk_shopdetail = $1 AND fk_subcategory = $2', [shopId, subcategoryId]);
      if (shopSubcatRes.rows.length === 0) {
        await client.query(`
          INSERT INTO shop_subcategory_master (fk_shopdetail, fk_shop_category, fk_subcategory, active, create_at)
          VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP)
        `, [shopId, categoryId, subcategoryId]);
      } else {
        await client.query('UPDATE shop_subcategory_master SET active = 1 WHERE id = $1', [shopSubcatRes.rows[0].id]);
      }

      // Link Product to Shop
      let shopProductMasterId = null;
      const shopProdRes = await client.query('SELECT id FROM shop_product_master WHERE fk_shopdetail = $1 AND fk_manageproductmaster = $2', [shopId, productId]);
      if (shopProdRes.rows.length === 0) {
        const insertShopProd = await client.query(`
          INSERT INTO shop_product_master (fk_shopdetail, fk_subcategory, fk_manageproductmaster, active, create_at, create_by)
          VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP, 1) RETURNING id
        `, [shopId, subcategoryId, productId]);
        shopProductMasterId = insertShopProd.rows[0].id;
      } else {
        shopProductMasterId = shopProdRes.rows[0].id;
        await client.query('UPDATE shop_product_master SET active = 1 WHERE id = $1', [shopProductMasterId]);
      }

      // Ensure Packed Product exists
      let packedProductId = null;
      const packedProdRes = await client.query('SELECT id FROM manage_packed_product WHERE fk_product = $1', [productId]);
      if (packedProdRes.rows.length > 0) {
        packedProductId = packedProdRes.rows[0].id;
      } else {
        const insertPacked = await client.query(`
          INSERT INTO manage_packed_product (fk_product, fk_unit, active, create_at, create_by, description)
          VALUES ($1, 1, 1, CURRENT_TIMESTAMP, 1, $2) RETURNING id
        `, [productId, item.description]);
        packedProductId = insertPacked.rows[0].id;
      }

      // Ensure Dimension exists
      let dimensionId = null;
      const dimTypeRes = await client.query("SELECT id FROM managedimensionwithunit WHERE size ILIKE '1 Unit' LIMIT 1");
      let unitDimensionId = 1;
      if (dimTypeRes.rows.length > 0) {
        unitDimensionId = dimTypeRes.rows[0].id;
      } else {
        const insertDimType = await client.query(`
          INSERT INTO managedimensionwithunit (fkcatogery, size, fkunittype, active, create_at, create_by)
          VALUES ($1, '1 Unit', 1, 1, CURRENT_TIMESTAMP, 1) RETURNING id
        `, [categoryId]);
        unitDimensionId = insertDimType.rows[0].id;
      }

      const packedDimRes = await client.query(`
        SELECT id FROM manage_dimension_master_packeditem
        WHERE fk_manage_packedproduct = $1 AND "fk_Managedimensionwithunit" = $2
      `, [packedProductId, unitDimensionId]);

      if (packedDimRes.rows.length > 0) {
        dimensionId = packedDimRes.rows[0].id;
      } else {
        const insertPackedDim = await client.query(`
          INSERT INTO manage_dimension_master_packeditem ("fk_Managedimensionwithunit", fk_manage_packedproduct, price, active, create_at, create_by)
          VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP, 1) RETURNING id
        `, [unitDimensionId, packedProductId, item.unit_price]);
        dimensionId = insertPackedDim.rows[0].id;
      }

      // Link Packed Dimension to Shop
      const shopPackedDimRes = await client.query(`
        SELECT id FROM manage_shop_packed_product
        WHERE fk_shop = $1 AND fk_manage_dimension_packitem = $2 AND fkshopproductmaster = $3
      `, [shopId, dimensionId, shopProductMasterId]);

      if (shopPackedDimRes.rows.length === 0) {
        await client.query(`
          INSERT INTO manage_shop_packed_product (fk_shop, fk_manage_dimension_packitem, fkshopproductmaster, active, create_at, create_by)
          VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP, 1)
        `, [shopId, dimensionId, shopProductMasterId]);
      } else {
        await client.query('UPDATE manage_shop_packed_product SET active = 1 WHERE id = $1', [shopPackedDimRes.rows[0].id]);
      }

    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to sync inventory from order:', error);
  } finally {
    client.release();
  }
};

export const syncManufacturerOrderToShopInventory = async (orderId, shopId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get the items from the order
    const orderItemsResult = await client.query(`
      SELECT od.product_id as fk_product, od.quantity, od.unit_price, mp.category, mp.sub_category, mp.product_name, mp.description, mp.product_image
      FROM manage_b_to_b_order_items od
      JOIN manage_manufacturer_products mp ON od.product_id = mp.id
      WHERE od.order_id = $1
    `, [orderId]);

    for (const item of orderItemsResult.rows) {
      let categoryId = null;
      let subcategoryId = null;
      let productId = null;

      // Ensure Category exists in Master
      if (item.category) {
        const catRes = await client.query('SELECT id FROM manage_category_master WHERE name ILIKE $1', [item.category]);
        if (catRes.rows.length > 0) {
          categoryId = catRes.rows[0].id;
        } else {
          const insertCat = await client.query(`
            INSERT INTO manage_category_master (name, active, create_at, create_by)
            VALUES ($1, 1, CURRENT_TIMESTAMP, 1) RETURNING id
          `, [item.category]);
          categoryId = insertCat.rows[0].id;
        }
      }

      // Ensure Subcategory exists in Master
      if (item.sub_category && categoryId) {
        const subcatRes = await client.query('SELECT id FROM manage_subcategory_master WHERE subcategory ILIKE $1 AND fk_manage_category_master = $2', [item.sub_category, categoryId]);
        if (subcatRes.rows.length > 0) {
          subcategoryId = subcatRes.rows[0].id;
        } else {
          const insertSubcat = await client.query(`
            INSERT INTO manage_subcategory_master (subcategory, fk_manage_category_master, active, create_at, create_by)
            VALUES ($1, $2, 1, CURRENT_TIMESTAMP, 1) RETURNING id
          `, [item.sub_category, categoryId]);
          subcategoryId = insertSubcat.rows[0].id;
        }
      }

      // Ensure Product exists in Master
      if (item.product_name && subcategoryId) {
        const prodRes = await client.query('SELECT id FROM manage_product_master WHERE product_name ILIKE $1 AND fk_subcategory = $2', [item.product_name, subcategoryId]);
        if (prodRes.rows.length > 0) {
          productId = prodRes.rows[0].id;
        } else {
          const insertProd = await client.query(`
            INSERT INTO manage_product_master (product_name, fk_subcategory, active, create_at, create_by, approval_status, description, productimage)
            VALUES ($1, $2, 1, CURRENT_TIMESTAMP, 1, 'approved', $3, $4::bytea) RETURNING id
          `, [item.product_name, subcategoryId, item.description, item.product_image || null]);
          productId = insertProd.rows[0].id;
        }
      }

      if (!categoryId || !subcategoryId || !productId) {
        continue; // Cannot proceed without valid master entries
      }

      // Link Subcategory to Shop
      const shopSubcatRes = await client.query('SELECT id FROM shop_subcategory_master WHERE fk_shopdetail = $1 AND fk_subcategory = $2', [shopId, subcategoryId]);
      if (shopSubcatRes.rows.length === 0) {
        await client.query(`
          INSERT INTO shop_subcategory_master (fk_shopdetail, fk_shop_category, fk_subcategory, active, create_at)
          VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP)
        `, [shopId, categoryId, subcategoryId]);
      } else {
        await client.query('UPDATE shop_subcategory_master SET active = 1 WHERE id = $1', [shopSubcatRes.rows[0].id]);
      }

      // Link Product to Shop
      let shopProductMasterId = null;
      const shopProdRes = await client.query('SELECT id FROM shop_product_master WHERE fk_shopdetail = $1 AND fk_manageproductmaster = $2', [shopId, productId]);
      if (shopProdRes.rows.length === 0) {
        const insertShopProd = await client.query(`
          INSERT INTO shop_product_master (fk_shopdetail, fk_subcategory, fk_manageproductmaster, active, create_at, create_by)
          VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP, 1) RETURNING id
        `, [shopId, subcategoryId, productId]);
        shopProductMasterId = insertShopProd.rows[0].id;
      } else {
        shopProductMasterId = shopProdRes.rows[0].id;
        await client.query('UPDATE shop_product_master SET active = 1 WHERE id = $1', [shopProductMasterId]);
      }

      // Ensure Packed Product exists
      let packedProductId = null;
      const packedProdRes = await client.query('SELECT id FROM manage_packed_product WHERE fk_product = $1', [productId]);
      if (packedProdRes.rows.length > 0) {
        packedProductId = packedProdRes.rows[0].id;
      } else {
        const insertPacked = await client.query(`
          INSERT INTO manage_packed_product (fk_product, fk_unit, active, create_at, create_by, description)
          VALUES ($1, 1, 1, CURRENT_TIMESTAMP, 1, $2) RETURNING id
        `, [productId, item.description]);
        packedProductId = insertPacked.rows[0].id;
      }

      // Ensure Dimension exists
      let dimensionId = null;
      const dimTypeRes = await client.query("SELECT id FROM managedimensionwithunit WHERE size ILIKE '1 Unit' LIMIT 1");
      let unitDimensionId = 1;
      if (dimTypeRes.rows.length > 0) {
        unitDimensionId = dimTypeRes.rows[0].id;
      } else {
        const insertDimType = await client.query(`
          INSERT INTO managedimensionwithunit (fkcatogery, size, fkunittype, active, create_at, create_by)
          VALUES ($1, '1 Unit', 1, 1, CURRENT_TIMESTAMP, 1) RETURNING id
        `, [categoryId]);
        unitDimensionId = insertDimType.rows[0].id;
      }

      const packedDimRes = await client.query(`
        SELECT id FROM manage_dimension_master_packeditem
        WHERE fk_manage_packedproduct = $1 AND "fk_Managedimensionwithunit" = $2
      `, [packedProductId, unitDimensionId]);

      if (packedDimRes.rows.length > 0) {
        dimensionId = packedDimRes.rows[0].id;
      } else {
        const insertPackedDim = await client.query(`
          INSERT INTO manage_dimension_master_packeditem ("fk_Managedimensionwithunit", fk_manage_packedproduct, price, active, create_at, create_by)
          VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP, 1) RETURNING id
        `, [unitDimensionId, packedProductId, item.unit_price]);
        dimensionId = insertPackedDim.rows[0].id;
      }

      // Link Packed Dimension to Shop
      const shopPackedDimRes = await client.query(`
        SELECT id FROM manage_shop_packed_product
        WHERE fk_shop = $1 AND fk_manage_dimension_packitem = $2 AND fkshopproductmaster = $3
      `, [shopId, dimensionId, shopProductMasterId]);

      if (shopPackedDimRes.rows.length === 0) {
        await client.query(`
          INSERT INTO manage_shop_packed_product (fk_shop, fk_manage_dimension_packitem, fkshopproductmaster, active, create_at, create_by)
          VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP, 1)
        `, [shopId, dimensionId, shopProductMasterId]);
      } else {
        await client.query('UPDATE manage_shop_packed_product SET active = 1 WHERE id = $1', [shopPackedDimRes.rows[0].id]);
      }

    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to sync inventory from manufacturer order:', error);
  } finally {
    client.release();
  }
};
