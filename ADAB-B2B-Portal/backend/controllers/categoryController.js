import pool from '../Config/database.js';
import logger from '../utils/logger.js';

// ===== CATEGORY MANAGEMENT =====

// Get all categories with pagination
export const getCategories = async (req, res) => {
  const manufacturerId = req.user.userId;
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    logger.info(`Fetching categories for manufacturer: ${manufacturerId}`, { page, limit });

    const countQuery = `
      SELECT COUNT(*)
      FROM manage_b_to_b_categories
      WHERE manufacturer_id = $1 AND deleted_at IS NULL
    `;
    const countResult = await pool.query(countQuery, [manufacturerId]);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    const query = `
      SELECT
        c.id,
        c.category_name,
        c.description,
        c.active,
        c.created_at,
        COUNT(DISTINCT s.id) as subcategory_count,
        COUNT(DISTINCT p.id) as product_count
      FROM manage_b_to_b_categories c
      LEFT JOIN manage_b_to_b_subcategories s ON c.id = s.category_id AND s.deleted_at IS NULL
      LEFT JOIN manage_manufacturer_products p ON c.category_name = p.category AND p.manufacturer_id = $1 AND p.deleted_at IS NULL
      WHERE c.manufacturer_id = $1 AND c.deleted_at IS NULL
      GROUP BY c.id, c.category_name, c.description, c.active, c.created_at
      ORDER BY c.category_name ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [manufacturerId, limit, offset]);

    res.status(200).json({
      success: true,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      },
      data: result.rows.map(row => ({
        id: row.id,
        category_name: row.category_name,
        description: row.description,
        active: row.active,
        subcategory_count: parseInt(row.subcategory_count),
        product_count: parseInt(row.product_count),
        created_at: row.created_at
      }))
    });

  } catch (error) {
    logger.error('Get categories error', error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

// Get single category with subcategories
export const getCategory = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Fetching category. ID: ${id}, Manufacturer: ${manufacturerId}`);

    // Get category
    const categoryQuery = `
      SELECT * FROM manage_b_to_b_categories
      WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL
    `;

    const categoryResult = await pool.query(categoryQuery, [id, manufacturerId]);

    if (categoryResult.rows.length === 0) {
      logger.warn(`Category not found. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get subcategories
    const subcategoriesQuery = `
      SELECT * FROM manage_b_to_b_subcategories
      WHERE category_id = $1 AND deleted_at IS NULL
      ORDER BY subcategory_name ASC
    `;

    const subcategoriesResult = await pool.query(subcategoriesQuery, [id]);

    res.status(200).json({
      success: true,
      data: {
        category: categoryResult.rows[0],
        subcategories: subcategoriesResult.rows
      }
    });

  } catch (error) {
    logger.error(`Get category error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category'
    });
  }
};

// Create new category
export const createCategory = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { category_name, description } = req.body;
  try {
    logger.info(`Creating category. Manufacturer: ${manufacturerId}, Name: ${category_name}`);

    // Check if category already exists
    const existingCategory = await pool.query(
      'SELECT id FROM manage_b_to_b_categories WHERE manufacturer_id = $1 AND category_name = $2 AND deleted_at IS NULL',
      [manufacturerId, category_name]
    );

    if (existingCategory.rows.length > 0) {
      logger.warn(`Conflict: Category already exists. Name: ${category_name}, Manufacturer: ${manufacturerId}`);
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const query = `
      INSERT INTO manage_b_to_b_categories (
        manufacturer_id,
        category_name,
        description,
        active,
        created_at,
        created_by
      ) VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, $1)
      RETURNING *
    `;

    const result = await pool.query(query, [manufacturerId, category_name, description || null]);
    logger.info(`Category created successfully. ID: ${result.rows[0].id}`, { manufacturerId });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Create category error', error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  const { category_name, description, active } = req.body;
  try {
    logger.info(`Updating category. ID: ${id}, Manufacturer: ${manufacturerId}`, { category_name, description, active });

    // Check if new name conflicts with existing category
    if (category_name) {
      const existingCategory = await pool.query(
        'SELECT id FROM manage_b_to_b_categories WHERE manufacturer_id = $1 AND category_name = $2 AND id != $3 AND deleted_at IS NULL',
        [manufacturerId, category_name, id]
      );

      if (existingCategory.rows.length > 0) {
        logger.warn(`Conflict: Category name already exists. Name: ${category_name}, Manufacturer: ${manufacturerId}`);
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    const updates = {};
    if (category_name !== undefined) updates.category_name = category_name;
    if (description !== undefined) updates.description = description;
    if (active !== undefined) updates.active = active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const paramCount = Object.keys(updates).length;
    const values = [...Object.values(updates), manufacturerId, id];

    const query = `
      UPDATE manage_b_to_b_categories
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP, modified_by = $${paramCount + 1}
      WHERE id = $${paramCount + 2} AND manufacturer_id = $${paramCount + 1} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      logger.warn(`Category not found for update. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    logger.info(`Category updated successfully. ID: ${id}`, { manufacturerId });

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error(`Update category error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
};

// Delete category (soft delete, wrapped in database transaction to prevent race conditions)
export const deleteCategory = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;

  logger.info(`Deleting category. ID: ${id}, Manufacturer: ${manufacturerId}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get and lock the category to prevent race condition
    const categoryQuery = await client.query(
      `SELECT category_name FROM manage_b_to_b_categories
       WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL
       FOR UPDATE`,
      [id, manufacturerId]
    );

    if (categoryQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn(`Category not found for deletion. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const categoryName = categoryQuery.rows[0].category_name;

    // Check if category has products
    const productsCheck = await client.query(
      `SELECT COUNT(*) as count FROM manage_manufacturer_products
       WHERE category = $1 AND manufacturer_id = $2 AND deleted_at IS NULL`,
      [categoryName, manufacturerId]
    );

    if (parseInt(productsCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      logger.warn(`Failed delete: Category has active products. ID: ${id}, Products: ${productsCheck.rows[0].count}`);
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with existing products. Please reassign or delete products first.'
      });
    }

    // Delete category
    const deleteCategoryQuery = `
      UPDATE manage_b_to_b_categories
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
      WHERE id = $2 AND manufacturer_id = $1 AND deleted_at IS NULL
      RETURNING id
    `;
    await client.query(deleteCategoryQuery, [manufacturerId, id]);

    // Soft delete all active subcategories
    await client.query(
      `UPDATE manage_b_to_b_subcategories
       SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
       WHERE category_id = $2 AND deleted_at IS NULL`,
      [manufacturerId, id]
    );

    await client.query('COMMIT');
    logger.info(`Category and subcategories deleted successfully. ID: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Category and its subcategories deleted successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Delete category error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  } finally {
    client.release();
  }
};

// ===== SUBCATEGORY MANAGEMENT =====

// Get subcategories by category
export const getSubcategories = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { category_id } = req.params;
  try {
    logger.info(`Fetching subcategories. Category ID: ${category_id}, Manufacturer: ${manufacturerId}`);

    // Verify category belongs to manufacturer
    const categoryCheck = await pool.query(
      'SELECT id FROM manage_b_to_b_categories WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL',
      [category_id, manufacturerId]
    );

    if (categoryCheck.rows.length === 0) {
      logger.warn(`Category not found. ID: ${category_id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const query = `
      SELECT
        s.id,
        s.subcategory_name,
        s.description,
        s.active,
        s.created_at,
        COUNT(DISTINCT p.id) as product_count
      FROM manage_b_to_b_subcategories s
      LEFT JOIN manage_manufacturer_products p ON s.subcategory_name = p.sub_category
        AND p.manufacturer_id = $1 AND p.deleted_at IS NULL
      WHERE s.category_id = $2 AND s.deleted_at IS NULL
      GROUP BY s.id, s.subcategory_name, s.description, s.active, s.created_at
      ORDER BY s.subcategory_name ASC
    `;

    const result = await pool.query(query, [manufacturerId, category_id]);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(row => ({
        id: row.id,
        subcategory_name: row.subcategory_name,
        description: row.description,
        active: row.active,
        product_count: parseInt(row.product_count),
        created_at: row.created_at
      }))
    });

  } catch (error) {
    logger.error(`Get subcategories error. Category ID: ${category_id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcategories'
    });
  }
};

// Create subcategory
export const createSubcategory = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { category_id } = req.params;
  const { subcategory_name, description } = req.body;
  try {
    logger.info(`Creating subcategory. Category ID: ${category_id}, Subcategory Name: ${subcategory_name}, Manufacturer: ${manufacturerId}`);

    // Verify category belongs to manufacturer
    const categoryCheck = await pool.query(
      'SELECT id FROM manage_b_to_b_categories WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL',
      [category_id, manufacturerId]
    );

    if (categoryCheck.rows.length === 0) {
      logger.warn(`Category not found. ID: ${category_id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if subcategory already exists
    const existingSubcategory = await pool.query(
      'SELECT id FROM manage_b_to_b_subcategories WHERE category_id = $1 AND subcategory_name = $2 AND deleted_at IS NULL',
      [category_id, subcategory_name]
    );

    if (existingSubcategory.rows.length > 0) {
      logger.warn(`Conflict: Subcategory name exists. Name: ${subcategory_name}, Category: ${category_id}`);
      return res.status(400).json({
        success: false,
        message: 'Subcategory with this name already exists in this category'
      });
    }

    const query = `
      INSERT INTO manage_b_to_b_subcategories (
        category_id,
        subcategory_name,
        description,
        active,
        created_at,
        created_by
      ) VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [category_id, subcategory_name, description || null, manufacturerId]);
    logger.info(`Subcategory created successfully. ID: ${result.rows[0].id}`);

    res.status(201).json({
      success: true,
      message: 'Subcategory created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error(`Create subcategory error. Category ID: ${category_id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to create subcategory'
    });
  }
};

// Update subcategory (verifying manufacturer ownership directly in the database update query)
export const updateSubcategory = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  const { subcategory_name, description, active } = req.body;
  try {
    logger.info(`Updating subcategory. ID: ${id}, Manufacturer: ${manufacturerId}`, { subcategory_name, description, active });

    // Verify subcategory belongs to manufacturer's category
    const subcategoryCheck = await pool.query(
      `SELECT s.id, s.category_id FROM manage_b_to_b_subcategories s
       INNER JOIN manage_b_to_b_categories c ON s.category_id = c.id
       WHERE s.id = $1 AND c.manufacturer_id = $2 AND s.deleted_at IS NULL`,
      [id, manufacturerId]
    );

    if (subcategoryCheck.rows.length === 0) {
      logger.warn(`Subcategory not found. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    const categoryId = subcategoryCheck.rows[0].category_id;

    // Check if new name conflicts
    if (subcategory_name) {
      const existingSubcategory = await pool.query(
        'SELECT id FROM manage_b_to_b_subcategories WHERE category_id = $1 AND subcategory_name = $2 AND id != $3 AND deleted_at IS NULL',
        [categoryId, subcategory_name, id]
      );

      if (existingSubcategory.rows.length > 0) {
        logger.warn(`Conflict: Subcategory name exists. Name: ${subcategory_name}, Category: ${categoryId}`);
        return res.status(400).json({
          success: false,
          message: 'Subcategory with this name already exists in this category'
        });
      }
    }

    const updates = {};
    if (subcategory_name !== undefined) updates.subcategory_name = subcategory_name;
    if (description !== undefined) updates.description = description;
    if (active !== undefined) updates.active = active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const paramCount = Object.keys(updates).length;
    const values = [...Object.values(updates), id, manufacturerId];

    const query = `
      UPDATE manage_b_to_b_subcategories
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP, modified_by = $${paramCount + 2}
      WHERE id = $${paramCount + 1} AND category_id IN (
        SELECT id FROM manage_b_to_b_categories WHERE manufacturer_id = $${paramCount + 2} AND deleted_at IS NULL
      ) AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      logger.warn(`Subcategory not found or unauthorized for update. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found or unauthorized'
      });
    }

    logger.info(`Subcategory updated successfully. ID: ${id}`, { manufacturerId });

    res.status(200).json({
      success: true,
      message: 'Subcategory updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error(`Update subcategory error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to update subcategory'
    });
  }
};

// Delete subcategory (verifying manufacturer ownership in the database query)
export const deleteSubcategory = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Deleting subcategory. ID: ${id}, Manufacturer: ${manufacturerId}`);

    // Verify and get subcategory
    const subcategoryCheck = await pool.query(
      `SELECT s.id, s.subcategory_name FROM manage_b_to_b_subcategories s
       INNER JOIN manage_b_to_b_categories c ON s.category_id = c.id
       WHERE s.id = $1 AND c.manufacturer_id = $2 AND s.deleted_at IS NULL`,
      [id, manufacturerId]
    );

    if (subcategoryCheck.rows.length === 0) {
      logger.warn(`Subcategory not found for deletion. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    // Check if subcategory has products
    const productsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM manage_manufacturer_products WHERE sub_category = $1 AND manufacturer_id = $2 AND deleted_at IS NULL',
      [subcategoryCheck.rows[0].subcategory_name, manufacturerId]
    );

    if (parseInt(productsCheck.rows[0].count) > 0) {
      logger.warn(`Failed delete: Subcategory has active products. ID: ${id}, Products: ${productsCheck.rows[0].count}`);
      return res.status(400).json({
        success: false,
        message: 'Cannot delete subcategory with existing products. Please reassign or delete products first.'
      });
    }

    const query = `
      UPDATE manage_b_to_b_subcategories
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
      WHERE id = $2 AND category_id IN (
        SELECT id FROM manage_b_to_b_categories WHERE manufacturer_id = $1 AND deleted_at IS NULL
      ) AND deleted_at IS NULL
      RETURNING id
    `;

    const result = await pool.query(query, [manufacturerId, id]);

    if (result.rows.length === 0) {
      logger.warn(`Subcategory not found or unauthorized for deletion. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found or unauthorized'
      });
    }

    logger.info(`Subcategory deleted successfully. ID: ${id}`, { manufacturerId });

    res.status(200).json({
      success: true,
      message: 'Subcategory deleted successfully'
    });

  } catch (error) {
    logger.error(`Delete subcategory error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to delete subcategory'
    });
  }
};