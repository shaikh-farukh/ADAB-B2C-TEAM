import pool from '../Config/database.js';

export const searchShopsByArea = async (req, res) => {
    try {
        const { city, area, category, page = 1, limit = 10, requesterRole } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT u.id, u.company_name as shop_name, u.product_category as business_category, u.city, u.state, u.pincode, 'ACTIVE' as status, t.typename as role
            FROM manage_b_to_b_userdetail u
            JOIN manage_b_to_b_user_type t ON u.business_type_id = t.id
            WHERE u.active = true
        `;
        const params = [];
        let paramIndex = 1;

        if (requesterRole) {
            let targetRoles = [];
            if (requesterRole.toLowerCase() === 'distributor') {
                targetRoles = ['Retailer', 'Manufacturer'];
            } else if (requesterRole.toLowerCase() === 'manufacturer') {
                targetRoles = ['Distributor', 'Retailer'];
            } else if (requesterRole.toLowerCase() === 'retailer') {
                targetRoles = ['Distributor', 'Manufacturer'];
            }
            if (targetRoles.length > 0) {
                query += ` AND t.typename = ANY($${paramIndex})`;
                params.push(targetRoles);
                paramIndex++;
            }
        }

        if (city) {
            query += ` AND u.city ILIKE $${paramIndex}`;
            params.push(`%${city}%`);
            paramIndex++;
        }
        if (area) {
            query += ` AND u.address ILIKE $${paramIndex}`; // Assuming area is part of address if area col doesn't exist
            params.push(`%${area}%`);
            paramIndex++;
        }
        if (category) {
            query += ` AND u.product_category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        const countQuery = `SELECT COUNT(*) FROM (${query}) AS subquery`;
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        query += ` ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.status(200).json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error searching shops by area:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const searchProductAvailability = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        // This query joins products with shops and assumes products are linked to a vendor_id or shop_id
        // In this schema, we check manage_manufacturer_products and manage_b_to_b_shop
        let query = `
            SELECT 
                p.id as product_id, p.product_name, p.price, p.currency, p.stock_quantity as warehouse_stock, p.unit, ARRAY[p.product_image] as images,
                s.id as shop_id, s.company_name as shop_name, s.city
            FROM manage_manufacturer_products p
            JOIN manage_b_to_b_userdetail s ON p.manufacturer_id = s.id
            WHERE p.status ILIKE 'ACTIVE' AND p.stock_quantity > 0 AND p.deleted_at IS NULL
        `;
        const params = [];
        let paramIndex = 1;

        if (search) {
            query += ` AND (p.product_name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR p.category ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const countQuery = `SELECT COUNT(*) FROM (${query}) AS subquery`;
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        query += ` ORDER BY p.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.status(200).json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error searching product availability:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const searchShopsNearMe = async (req, res) => {
    try {
        const { latitude, longitude, pincode, radius = 50, page = 1, limit = 10, targetType } = req.query;
        const offset = (page - 1) * limit;

        // Ensure we only query for the target supply chain tier (e.g. 'Distributor' or 'Manufacturer')
        const targetRole = targetType || 'Distributor';

        let query = `
            SELECT u.id, u.company_name as shop_name, u.product_category as business_category, 
                   u.city, u.state, u.pincode, u.latitude, u.longitude, 'ACTIVE' as status, t.typename as role
            FROM manage_b_to_b_userdetail u
            JOIN manage_b_to_b_user_type t ON u.business_type_id = t.id
            WHERE u.active = true AND t.typename = $1
        `;
        const params = [targetRole];
        let paramIndex = 2;

        if (latitude && longitude) {
            // Haversine formula for distance in km
            query += ` AND (6371 * acos(cos(radians($${paramIndex})) * cos(radians(latitude)) * cos(radians(longitude) - radians($${paramIndex+1})) + sin(radians($${paramIndex})) * sin(radians(latitude)))) <= $${paramIndex+2}`;
            params.push(latitude, longitude, radius);
            paramIndex += 3;
        } else if (pincode) {
            // Fallback to pincode match if lat/lng not provided
            query += ` AND $${paramIndex} = ANY(u.serviceable_pincodes)`;
            params.push(pincode);
            paramIndex++;
        }

        const countQuery = `SELECT COUNT(*) FROM (${query}) AS subquery`;
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        if (latitude && longitude) {
             query += ` ORDER BY (6371 * acos(cos(radians($2)) * cos(radians(latitude)) * cos(radians(longitude) - radians($3)) + sin(radians($2)) * sin(radians(latitude)))) ASC`;
        } else {
             query += ` ORDER BY u.id DESC`;
        }
        
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.status(200).json({
            success: true,
            data: result.rows,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Error searching shops near me:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getFeaturedShops = async (req, res) => {
    try {
        const { page = 1, limit = 10, requesterRole } = req.query;
        const offset = (page - 1) * limit;
        
        let targetRoles = [];
        if (requesterRole === 'distributor') {
            targetRoles = ['Retailer'];
        } else if (requesterRole === 'manufacturer') {
            targetRoles = ['Distributor'];
        } else if (requesterRole === 'retailer') {
            targetRoles = ['Distributor', 'Manufacturer'];
        } else {
            targetRoles = ['Distributor', 'Manufacturer', 'Retailer']; // Default/Admin fallback
        }
        
        const query = `
            SELECT u.id, u.company_name as shop_name, u.product_category as business_category, u.city, u.state, u.pincode, c.name as campaign_name, t.typename as role
            FROM manage_b_to_b_userdetail u
            JOIN manage_b_to_b_user_type t ON u.business_type_id = t.id
            LEFT JOIN campaigns c ON u.campaign_id = c.id
            WHERE u.active = true AND u.is_featured = true
              AND t.typename = ANY($1)
            ORDER BY u.id DESC LIMIT $2 OFFSET $3
        `;
        const countQuery = `
            SELECT COUNT(*) FROM manage_b_to_b_userdetail u
            JOIN manage_b_to_b_user_type t ON u.business_type_id = t.id
            WHERE u.active = true AND u.is_featured = true AND t.typename = ANY($1)
        `;
        
        const countResult = await pool.query(countQuery, [targetRoles]);
        const total = parseInt(countResult.rows[0].count);
        const result = await pool.query(query, [targetRoles, limit, offset]);

        res.status(200).json({
            success: true,
            data: result.rows,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Error getting featured shops:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const requestConnection = async (req, res) => {
    try {
        const requester_id = req.user.userId;
        const { target_shop_id, notes } = req.body;

        if (!target_shop_id) {
            return res.status(400).json({ success: false, message: 'Target shop ID is required' });
        }
        if (requester_id === target_shop_id) {
            return res.status(400).json({ success: false, message: 'Cannot connect to yourself' });
        }

        // Check if already exists
        const checkQuery = `SELECT id, status FROM manage_b_to_b_connections WHERE requester_id = $1 AND target_shop_id = $2`;
        const checkResult = await pool.query(checkQuery, [requester_id, target_shop_id]);

        if (checkResult.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Connection request already exists or is processed.' });
        }

        const insertQuery = `
            INSERT INTO manage_b_to_b_connections (requester_id, target_shop_id, notes) 
            VALUES ($1, $2, $3) RETURNING *
        `;
        const result = await pool.query(insertQuery, [requester_id, target_shop_id, notes || '']);

        res.status(201).json({ success: true, data: result.rows[0], message: 'Connection requested successfully' });
    } catch (error) {
        console.error('Error requesting connection:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
