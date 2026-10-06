import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import Authrouter from './Routes/auth.js';
import manufacturerDistributorRoutes from './Routes/manufacturer/distributors.js';
import manufacturerRequestRoutes from './Routes/manufacturer/requests.js';
import manufacturerProductRoutes from './Routes/manufacturer/products.js';
import manufacturerOrderRoutes from './Routes/manufacturer/orders.js';
import manufacturerDashboardRoutes from './Routes/manufacturer/dashboard.js';
import manufacturerAuditLogsRoutes from './Routes/manufacturer/auditLogs.js';
import distributorManufacturersRoutes from './Routes/distributor/manufacturers.js';
import distributorRequestRoutes from './Routes/distributor/requests.js';
import distributorCatalogRoutes from './Routes/distributor/catalog.js';
import distributorCartRoutes from './Routes/distributor/cart.js';
import distributorOrdersRoutes from './Routes/distributor/orders.js';
import distributorDashboardRoutes from './Routes/distributor/dashboard.js';
import distributorShopOrdersRoutes from './Routes/distributor/shopOrders.js';
import distributorShopsRoutes from './Routes/distributor/shops.js';
import distributorTerritoryRoutes from './Routes/distributor/territory.js';
import distributorAuditLogsRoutes from './Routes/distributor/auditLogs.js';
import supportRoutes from './Routes/common/support.js';
import contactRoutes from './Routes/common/contact.js';
import locationRoutes from './Routes/common/locations.js';
import manufacturerCategoryRoutes from './Routes/manufacturer/categories.js';
import payoutSettlementRoutes from './Routes/payoutsettlement.js';
import creditRoutes from './Routes/credits.js';
import shopRoutes from './Routes/shop.js';
import distributorInventoryRoutes from './Routes/distributorInventory.js';
import campaignRoutes from './Routes/campaigns.js';
import marketCoverageRoutes from './Routes/marketCoverage.js';
import logisticsProviderRoutes from './Routes/logisticsProvider.js';
import driverRoutes from './Routes/driverRoutes.js';
import vehicleRoutes from './Routes/vehicleRoutes.js';
import vehicleRouteRoutes from './Routes/vehicleRouteRoutes.js';
import sharedOrderRoutes from './Routes/sharedOrders.js';
import uploadRoutes from './Routes/uploads.js';
import adminRoutes from './Routes/adminRoutes.js';
import deliveryRoutes from './Routes/deliveryRoutes.js';
import discoveryRoutes from './Routes/discoveryRoutes.js';
import webhookRoutes from './Routes/webhookRoutes.js';
import paymentRoutes from './Routes/payments.js';

import path from 'path';
import { fileURLToPath } from 'url';
import { globalAuditMiddleware } from './Middleware/auditMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));

// Parse raw webhook bodies BEFORE global JSON middleware
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(globalAuditMiddleware);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//Authentication & Admin Routes
import AdminRouter from './Routes/admin.js';
app.use('/api/auth', Authrouter);
app.use('/api/admin', AdminRouter);

// ===== MANUFACTURER ROUTES =====
app.use('/api/manufacturers/dashboard', manufacturerDashboardRoutes);
app.use('/api/manufacturer/dashboard', manufacturerDashboardRoutes);
app.use('/api/manufacturers/distributors', manufacturerDistributorRoutes);
app.use('/api/manufacturer/distributors', manufacturerDistributorRoutes);
app.use('/api/manufacturers/requests', manufacturerRequestRoutes);
app.use('/api/manufacturer/requests', manufacturerRequestRoutes);
app.use('/api/manufacturers/products', manufacturerProductRoutes);
app.use('/api/manufacturer/products', manufacturerProductRoutes);
app.use('/api/manufacturers/orders', manufacturerOrderRoutes);
app.use('/api/manufacturer/orders', manufacturerOrderRoutes);
app.use('/api/manufacturers/categories', manufacturerCategoryRoutes);
app.use('/api/manufacturer/categories', manufacturerCategoryRoutes);
app.use('/api/categories', manufacturerCategoryRoutes);
app.use('/api/manufacturers/audit-logs', manufacturerAuditLogsRoutes);
app.use('/api/manufacturer/audit-logs', manufacturerAuditLogsRoutes);
app.use('/api/audit-logs', manufacturerAuditLogsRoutes);
app.use('/api/manufacturers', manufacturerCategoryRoutes);

// ===== DISTRIBUTOR ROUTES =====
app.use('/api/distributors/dashboard', distributorDashboardRoutes);
app.use('/api/distributor/dashboard', distributorDashboardRoutes);
app.use('/api/distributors/manufacturers', distributorManufacturersRoutes);
app.use('/api/distributor/manufacturers', distributorManufacturersRoutes);
app.use('/api/distributors/requests', distributorRequestRoutes);
app.use('/api/distributor/requests', distributorRequestRoutes);
app.use('/api/distributors/catalog', distributorCatalogRoutes);
app.use('/api/distributor/catalog', distributorCatalogRoutes);
app.use('/api/distributors/cart', distributorCartRoutes);
app.use('/api/distributor/cart', distributorCartRoutes);
app.use('/api/distributors/orders', distributorOrdersRoutes);
app.use('/api/distributor/orders', distributorOrdersRoutes);
app.use('/api/distributors/shop-orders', distributorShopOrdersRoutes);
app.use('/api/distributor/shop-orders', distributorShopOrdersRoutes);
app.use('/api/distributors/territory', distributorTerritoryRoutes);
app.use('/api/distributor/territory', distributorTerritoryRoutes);
app.use('/api/distributor/shop-orders', distributorShopOrdersRoutes);
app.use('/api/distributors/shops', distributorShopsRoutes);
app.use('/api/distributor/shops', distributorShopsRoutes);
app.use('/api/distributors/audit-logs', distributorAuditLogsRoutes);
app.use('/api/distributor/audit-logs', distributorAuditLogsRoutes);

// ===== PAYOUT & SETTLEMENT ROUTES =====
app.use('/api', payoutSettlementRoutes);
app.use('/api/payouts', payoutSettlementRoutes);
app.use('/api/manufacturer/settlements', payoutSettlementRoutes);

// ===== NEW B2B COMMERCE ROUTES =====
app.use('/api/credits', creditRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/distributors/inventory', distributorInventoryRoutes);
app.use('/api/distributor/inventory', distributorInventoryRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/market-coverage', marketCoverageRoutes);
app.use('/api/logistics-providers', logisticsProviderRoutes);
app.use('/api/logistics', logisticsProviderRoutes);
app.use('/api/manufacturer/logistics', logisticsProviderRoutes);
app.use('/api/distributor/logistics', logisticsProviderRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/manufacturer/drivers', driverRoutes);
app.use('/api/distributor/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/manufacturer/vehicles', vehicleRoutes);
app.use('/api/distributor/vehicles', vehicleRoutes);
app.use('/api/vehicle-routes', vehicleRouteRoutes);
app.use('/api/orders', sharedOrderRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/discovery', discoveryRoutes);

// ===== ADMIN ROUTES =====
// Admin routes are registered above at line 62

import pool from './Config/database.js';

app.get('/api/check', async (req, res) => {
    try {
        const user = await pool.query('SELECT * FROM manage_b_to_b_userdetail WHERE email = $1', ['distributor@adab.com']);
        res.json({ success: true, user: user.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== COMMON ROUTES (Support & Contact Only) =====
app.use('/api/support', supportRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/locations', locationRoutes);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
});

export default app;
