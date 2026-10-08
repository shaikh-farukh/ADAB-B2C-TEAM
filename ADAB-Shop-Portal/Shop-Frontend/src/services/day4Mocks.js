// PHASE 2A: Canonical API Mocks for Day 4 Development
// These shapes strictly follow the verified database schema and canonical API contracts.

export const mockDashboardMetrics = {
  success: true,
  data: {
    id: "00000000-0000-0000-0000-111111111111",
    store_id: "00000000-0000-0000-0000-000000000001",
    metric_date: new Date().toISOString().split('T')[0],
    total_orders: 42,
    fulfilled_orders: 38,
    cancelled_orders: 4,
    avg_fulfillment_time_minutes: 12.5,
    sla_adherence_pct: 98.5,
    customer_rating_avg: 4.8,
    on_time_delivery_pct: 99.2,
    total_gross_revenue: 14500.50,
  }
};

export const mockListingIssues = {
  success: true,
  data: [
    {
      issue_type: 'INVENTORY',
      severity: 'high',
      message: 'Product is out of stock',
      details: {
        available_quantity: 0,
        low_stock_threshold: 5
      }
    },
    {
      issue_type: 'PRICE',
      severity: 'medium',
      message: 'Selling price is equal to or greater than MRP',
      details: {
        mrp: 500,
        sell_price: 550
      }
    },
    {
      issue_type: 'LISTING',
      severity: 'high',
      message: 'Product was rejected during approval',
      details: {
        approval_status: 'REJECTED',
        rejection_reason: 'Image is blurry and missing FSSAI details.'
      }
    }
  ]
};

export const mockUnreadCount = {
  success: true,
  data: {
    unread_count: 3
  }
};

export const mockNotifications = {
  success: true,
  data: [
    {
      id: "notif-1",
      title: "New Order Received",
      message: "You have received a new order #1001",
      type: "ORDER",
      is_read: false,
      created_at: new Date().toISOString()
    },
    {
      id: "notif-2",
      title: "Product Rejected",
      message: "Your listing 'Organic Honey' was rejected.",
      type: "ALERT",
      is_read: false,
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ]
};

export const mockSettings = {
  success: true,
  data: {
    ui_mode: 'light',
    soundbox_enabled: true,
    is_online: true,
    open_time: '09:00:00',
    close_time: '21:00:00',
    delivery_radius_km: 5.0
  }
};
