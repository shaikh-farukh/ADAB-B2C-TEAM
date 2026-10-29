const pool = require('../../../db');

/**
 * 1. Tool: adab_get_store_info
 * Tier: TIER_1_READ
 */
const getStoreInfoTool = {
  name: 'adab_get_store_info',
  description: 'Retrieve real-time operational status of the store, including open/close status, business hours, soundbox state, and delivery radius.',
  tier: 'TIER_1_READ',
  parameters: {
    type: 'OBJECT',
    properties: {}
  },
  handler: async (args, authContext) => {
    const { storeId } = authContext;

    const query = `
      SELECT id, store_name, phone, city, is_online, soundbox_enabled,
             open_time, close_time, delivery_radius_km
      FROM stores
      WHERE id = $1::uuid
    `;
    const res = await pool.query(query, [storeId]);
    if (res.rows.length === 0) {
      throw new Error(`StoreNotFound: Store '${storeId}' was not found.`);
    }

    const s = res.rows[0];
    return {
      storeId: s.id,
      storeName: s.store_name,
      phone: s.phone,
      city: s.city,
      isOnline: Boolean(s.is_online),
      soundboxEnabled: Boolean(s.soundbox_enabled),
      businessHours: `${s.open_time || '09:00'} - ${s.close_time || '22:00'}`,
      deliveryRadiusKm: Number(s.delivery_radius_km || 5),
      statusLabel: s.is_online ? 'OPEN (Accepting Orders)' : 'CLOSED (Temporarily Offline)'
    };
  }
};

/**
 * 2. Tool: adab_update_store_status
 * Tier: TIER_2_MUTATIVE
 */
const updateStoreStatusTool = {
  name: 'adab_update_store_status',
  description: 'Open or close the store for incoming customer orders, toggle soundbox announcements, or adjust delivery radius.',
  tier: 'TIER_2_MUTATIVE',
  parameters: {
    type: 'OBJECT',
    properties: {
      isOnline: {
        type: 'BOOLEAN',
        description: 'Set to true to open store for orders, or false to close.'
      },
      soundboxEnabled: {
        type: 'BOOLEAN',
        description: 'Set to true to enable voice order announcements, or false to mute.'
      },
      deliveryRadiusKm: {
        type: 'NUMBER',
        description: 'Store delivery radius in kilometers (e.g. 5, 10).'
      }
    }
  },
  handler: async (args, authContext) => {
    const { storeId } = authContext;
    const { isOnline, soundboxEnabled, deliveryRadiusKm } = args;

    const fields = [];
    const values = [];
    let idx = 1;

    if (isOnline !== undefined) {
      fields.push(`is_online = $${idx++}`);
      values.push(Boolean(isOnline));
    }
    if (soundboxEnabled !== undefined) {
      fields.push(`soundbox_enabled = $${idx++}`);
      values.push(Boolean(soundboxEnabled));
    }
    if (deliveryRadiusKm !== undefined) {
      fields.push(`delivery_radius_km = $${idx++}`);
      values.push(Math.max(1, Number(deliveryRadiusKm)));
    }

    if (fields.length === 0) {
      throw new Error('ValidationError: Must provide at least one setting to update (isOnline, soundboxEnabled, or deliveryRadiusKm).');
    }

    values.push(storeId);
    const query = `
      UPDATE stores
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${idx}::uuid
      RETURNING id, store_name, is_online, soundbox_enabled, delivery_radius_km
    `;

    const res = await pool.query(query, values);
    const updated = res.rows[0];

    return {
      success: true,
      storeId: updated.id,
      storeName: updated.store_name,
      isOnline: Boolean(updated.is_online),
      soundboxEnabled: Boolean(updated.soundbox_enabled),
      deliveryRadiusKm: Number(updated.delivery_radius_km),
      message: `Store operational settings successfully updated.`
    };
  }
};

function registerStoreTools(registry) {
  registry.registerTool(getStoreInfoTool);
  registry.registerTool(updateStoreStatusTool);
}

module.exports = {
  registerStoreTools,
  getStoreInfoTool,
  updateStoreStatusTool
};
