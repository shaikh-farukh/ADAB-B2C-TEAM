const pool = require('../../../db');

/**
 * Parses a time string (12-hour or 24-hour) into minutes since midnight.
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const clean = String(timeStr).trim();
  const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3].toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const match24 = clean.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }
  return null;
}

/**
 * Formats minutes since midnight into 12-hour AM/PM format.
 */
function formatMinutesTo12Hour(minutes) {
  if (minutes == null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const meridiem = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m.toString().padStart(2, '0');
  return `${displayH}:${displayM} ${meridiem}`;
}

/**
 * Gets the current time in minutes since midnight for IST (Asia/Kolkata).
 */
function getISTCurrentMinutes(date = new Date()) {
  try {
    const istFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const parts = istFormatter.formatToParts(date);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || date.getHours(), 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || date.getMinutes(), 10);
    return hour * 60 + minute;
  } catch {
    return date.getHours() * 60 + date.getMinutes();
  }
}

/**
 * Checks whether current time in IST is within operating hours.
 */
function isWithinOperatingHours(openTimeStr, closeTimeStr, date = new Date()) {
  const openMin = parseTimeToMinutes(openTimeStr) ?? (8 * 60);
  const closeMin = parseTimeToMinutes(closeTimeStr) ?? (22 * 60);
  const currentMin = getISTCurrentMinutes(date);

  if (openMin === closeMin) return true;
  if (openMin < closeMin) {
    return currentMin >= openMin && currentMin < closeMin;
  }
  return currentMin >= openMin || currentMin < closeMin;
}

/**
 * 1. Tool: adab_get_store_info
 * Tier: TIER_1_READ
 */
const getStoreInfoTool = {
  name: 'adab_get_store_info',
  description: 'Retrieve real-time operational status of the store, including whether it is currently open or closed (taking into account both manual online toggle and operating business hours), operating hours, soundbox state, and delivery radius.',
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
    const isOnline = Boolean(s.is_online);
    const withinHours = isWithinOperatingHours(s.open_time, s.close_time);
    const isOpen = isOnline && withinHours;

    const openMin = parseTimeToMinutes(s.open_time) ?? (8 * 60);
    const closeMin = parseTimeToMinutes(s.close_time) ?? (22 * 60);
    const currentMin = getISTCurrentMinutes();
    const currentTimeFormatted = formatMinutesTo12Hour(currentMin);
    const hoursFormatted = `${formatMinutesTo12Hour(openMin)} - ${formatMinutesTo12Hour(closeMin)}`;

    let statusLabel = '';
    let reason = '';
    if (!isOnline) {
      statusLabel = `CLOSED (Manually paused by seller; business hours are ${hoursFormatted})`;
      reason = 'manual_closed';
    } else if (!withinHours) {
      statusLabel = `CLOSED (Outside operating hours: ${hoursFormatted}; current local time is ${currentTimeFormatted})`;
      reason = 'outside_hours';
    } else {
      statusLabel = `OPEN (Accepting customer orders; business hours: ${hoursFormatted})`;
      reason = 'open_scheduled';
    }

    return {
      storeId: s.id,
      storeName: s.store_name,
      phone: s.phone,
      city: s.city,
      isOpen,
      isOnline,
      isWithinHours: withinHours,
      soundboxEnabled: Boolean(s.soundbox_enabled),
      businessHours: hoursFormatted,
      currentLocalTime: currentTimeFormatted,
      deliveryRadiusKm: Number(s.delivery_radius_km || 5),
      statusLabel,
      reason
    };
  }
};

/**
 * 2. Tool: adab_update_store_status
 * Tier: TIER_2_MUTATIVE
 */
const updateStoreStatusTool = {
  name: 'adab_update_store_status',
  description: 'Open or close the store for incoming customer orders, toggle soundbox announcements, adjust delivery radius, or update opening/closing operating hours.',
  tier: 'TIER_2_MUTATIVE',
  parameters: {
    type: 'OBJECT',
    properties: {
      isOnline: {
        type: 'BOOLEAN',
        description: 'Set to true to open store for orders, or false to close.'
      },
      closeTime: {
        type: 'STRING',
        description: 'Store closing time in HH:mm or HH:mm:ss format (e.g. 23:59:00).'
      },
      openTime: {
        type: 'STRING',
        description: 'Store opening time in HH:mm or HH:mm:ss format (e.g. 08:00:00).'
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
    const { isOnline, soundboxEnabled, deliveryRadiusKm, closeTime, openTime } = args;

    // Check existing store times if isOnline is being enabled outside hours
    let autoExtendedClose = false;
    let effectiveCloseTime = closeTime;

    if (isOnline === true && !closeTime) {
      const curStore = await pool.query('SELECT open_time, close_time FROM stores WHERE id = $1::uuid', [storeId]);
      if (curStore.rows.length > 0) {
        const { open_time, close_time } = curStore.rows[0];
        const within = isWithinOperatingHours(open_time, close_time);
        if (!within) {
          // Current time is outside operating hours (e.g. late night).
          // If seller explicitly asks to open store now, extend close_time to 23:59:00 so the store is actually open!
          effectiveCloseTime = '23:59:00';
          autoExtendedClose = true;
        }
      }
    }

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
    if (effectiveCloseTime !== undefined) {
      fields.push(`close_time = $${idx++}`);
      values.push(effectiveCloseTime);
    }
    if (openTime !== undefined) {
      fields.push(`open_time = $${idx++}`);
      values.push(openTime);
    }

    if (fields.length === 0) {
      throw new Error('ValidationError: Must provide at least one setting to update (isOnline, soundboxEnabled, deliveryRadiusKm, closeTime, or openTime).');
    }

    values.push(storeId);
    const query = `
      UPDATE stores
      SET ${fields.join(', ')}
      WHERE id = $${idx}::uuid
      RETURNING id, store_name, is_online, soundbox_enabled, delivery_radius_km, open_time, close_time
    `;

    const res = await pool.query(query, values);
    const updated = res.rows[0];

    const isOnlineBool = Boolean(updated.is_online);
    const withinHours = isWithinOperatingHours(updated.open_time, updated.close_time);
    const isOpen = isOnlineBool && withinHours;

    let msg = `Store operational settings successfully updated.`;
    if (autoExtendedClose) {
      msg = `Store opened and closing time extended to 11:59 PM to allow incoming orders tonight.`;
    } else if (isOnline !== undefined) {
      msg = isOnlineBool ? `Store is now open for incoming orders.` : `Store is now closed and set to offline.`;
    }

    return {
      success: true,
      storeId: updated.id,
      storeName: updated.store_name,
      isOpen,
      isOnline: isOnlineBool,
      isWithinHours: withinHours,
      soundboxEnabled: Boolean(updated.soundbox_enabled),
      businessHours: `${updated.open_time} - ${updated.close_time}`,
      deliveryRadiusKm: Number(updated.delivery_radius_km),
      message: msg
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
  updateStoreStatusTool,
  isWithinOperatingHours,
  parseTimeToMinutes,
  formatMinutesTo12Hour
};
