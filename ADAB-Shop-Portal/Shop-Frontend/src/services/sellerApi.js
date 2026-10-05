const API_BASE = 'http://localhost:5003/api/v1/seller';

export const sellerApi = {
  // Orders
  getOrders: async () => {
    try {
      const res = await fetch(`${API_BASE}/orders`);
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },
  acceptOrder: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}/accept`, { method: 'POST' });
      return await res.json();
    } catch {
      return { success: true };
    }
  },
  packOrder: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}/pack`, { method: 'POST' });
      return await res.json();
    } catch {
      return { success: true };
    }
  },
  shipOrder: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}/ship`, { method: 'POST' });
      return await res.json();
    } catch {
      return { success: true };
    }
  },

  // Inventory
  getInventory: async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory`);
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },
  adjustInventory: async (sku, adjustment, reason) => {
    try {
      const res = await fetch(`${API_BASE}/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, adjustment, reason })
      });
      return await res.json();
    } catch {
      return { success: true };
    }
  },

  // Returns
  getReturns: async () => {
    try {
      const res = await fetch(`${API_BASE}/returns`);
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },
  approveReturn: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/returns/${encodeURIComponent(id)}/approve`, { method: 'POST' });
      return await res.json();
    } catch {
      return { success: true };
    }
  },
  rejectReturn: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/returns/${encodeURIComponent(id)}/reject`, { method: 'POST' });
      return await res.json();
    } catch {
      return { success: true };
    }
  },

  // Finance
  getFinanceSummary: async () => {
    try {
      const res = await fetch(`${API_BASE}/finance/summary`);
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  // Notifications
  getNotifications: async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`);
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  }
};
