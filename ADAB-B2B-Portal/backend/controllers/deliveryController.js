import pool from '../Config/database.js';

export const getDeliveryConfigs = async (req, res) => {
    try {
        const { shop_id } = req.query;
        let query = 'SELECT * FROM manage_b_to_b_delivery_configs';
        const params = [];
        if (shop_id) {
            query += ' WHERE shop_id = $1';
            params.push(shop_id);
        }
        const result = await pool.query(query, params);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching delivery configs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const updateDeliveryConfig = async (req, res) => {
    const { shop_id, mode, base_charge, per_km_charge, min_free_delivery_order_value, max_delivery_radius_km, status } = req.body;
    try {
        // Upsert logic based on shop_id and mode
        const existing = await pool.query('SELECT * FROM manage_b_to_b_delivery_configs WHERE shop_id = $1 AND mode = $2', [shop_id, mode]);
        if (existing.rows.length > 0) {
            const query = `
                UPDATE manage_b_to_b_delivery_configs
                SET base_charge = COALESCE($1, base_charge),
                    per_km_charge = COALESCE($2, per_km_charge),
                    min_free_delivery_order_value = COALESCE($3, min_free_delivery_order_value),
                    max_delivery_radius_km = COALESCE($4, max_delivery_radius_km),
                    status = COALESCE($5, status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE shop_id = $6 AND mode = $7
                RETURNING *;
            `;
            const values = [base_charge, per_km_charge, min_free_delivery_order_value, max_delivery_radius_km, status, shop_id, mode];
            const result = await pool.query(query, values);
            return res.status(200).json({ success: true, data: result.rows[0] });
        } else {
            const query = `
                INSERT INTO manage_b_to_b_delivery_configs (shop_id, mode, base_charge, per_km_charge, min_free_delivery_order_value, max_delivery_radius_km, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *;
            `;
            const values = [shop_id, mode, base_charge || 0, per_km_charge || 0, min_free_delivery_order_value || 0, max_delivery_radius_km || 0, status || 'ACTIVE'];
            const result = await pool.query(query, values);
            return res.status(201).json({ success: true, data: result.rows[0] });
        }
    } catch (error) {
        console.error('Error updating delivery config:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const calculateCharge = async (req, res) => {
    const { mode, subtotal, shop_id, distance_km } = req.body;
    try {
        if (!mode) {
            return res.status(400).json({ success: false, message: 'Delivery mode is required' });
        }

        let charge = 0;

        if (mode === 'IN_HOUSE') {
            const configResult = await pool.query("SELECT * FROM manage_b_to_b_delivery_configs WHERE shop_id = $1 AND mode = 'IN_HOUSE'", [shop_id]);
            if (configResult.rows.length > 0) {
                const config = configResult.rows[0];
                if (config.max_delivery_radius_km && distance_km > config.max_delivery_radius_km) {
                    return res.status(400).json({ success: false, message: 'Out of delivery radius for In-House delivery' });
                }
                if (config.min_free_delivery_order_value && subtotal >= config.min_free_delivery_order_value) {
                    charge = 0;
                } else {
                    charge = Number(config.base_charge) + (Number(config.per_km_charge) * (distance_km || 0));
                }
            } else {
                 // Default fallback if no config
                 charge = 50 + (10 * (distance_km || 0));
            }
        } else if (mode === 'THIRD_PARTY') {
            // Mock standard third-party rate logic, maybe flat 100 base + 5 per km
            charge = 100 + (5 * (distance_km || 0));
        } else if (mode === 'DISTRIBUTOR') {
            // Bulk wholesale logic
            charge = subtotal > 10000 ? 0 : 500;
        }

        res.status(200).json({ success: true, delivery_charge: charge, mode });
    } catch (error) {
        console.error('Error calculating delivery charge:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
