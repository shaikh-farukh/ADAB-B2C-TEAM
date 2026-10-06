import React, { useState, useEffect } from 'react';
import { sellerApi } from './services/sellerApi';

const DEFAULT_PRODUCTS = [
  { id: 1, name: 'Tata Salt 1kg', sku: '8901001100123', category: 'Grocery', price: 28, mrp: 28, stock: 50, unit: 'pcs', status: 'active' },
  { id: 2, name: 'Loose Basmati Rice', sku: '—', category: 'Grocery', price: 90, mrp: 110, stock: 480, unit: 'kg', status: 'active' },
  { id: 3, name: 'Balaji Silk Kurti', sku: 'BAL-KRT-001', category: 'Fashion', price: 899, mrp: 1299, stock: 84, unit: 'pcs', status: 'active' },
  { id: 4, name: 'Shahi Paneer', sku: '—', category: 'Dairy', price: 240, mrp: 240, stock: 12, unit: 'pcs', status: 'active' },
  { id: 5, name: 'Fortune Sunflower Oil 1L', sku: '8906001123456', category: 'Grocery', price: 165, mrp: 185, stock: 120, unit: 'pcs', status: 'active' },
  { id: 6, name: 'Amul Taaza Milk 500ml', sku: '8901030865123', category: 'Dairy', price: 28, mrp: 28, stock: 200, unit: 'pcs', status: 'active' },
  { id: 7, name: 'A2 Gir Cow Ghee 1L', sku: '8909876543210', category: 'Grocery', price: 1250, mrp: 1499, stock: 18, unit: 'pcs', status: 'active' },
  { id: 8, name: 'Maggi Noodles 70g', sku: '8900000000000', category: 'Grocery', price: 20, mrp: 20, stock: 10, unit: 'pcs', status: 'active' },
  { id: 9, name: 'Organic Quinoa 500g', sku: '8901234567890', category: 'Grocery', price: 220, mrp: 280, stock: 45, unit: 'pcs', status: 'active' },
  { id: 10, name: 'Turmeric Powder 200g', sku: '—', category: 'Spices', price: 45, mrp: 60, stock: 85, unit: 'kg', status: 'active' },
  { id: 11, name: 'Organic Turmeric 200g', sku: 'ORG-TUR-200', category: 'Spices', price: 145, mrp: 199, stock: 30, unit: 'pcs', status: 'pending' },
  { id: 12, name: 'Handmade Diya Set', sku: 'BAL-DIY-001', category: 'Grocery', price: 199, mrp: 299, stock: 60, unit: 'pcs', status: 'pending' },
  { id: 13, name: 'Premium Basmati 5kg', sku: 'BAL-BAS-5KG', category: 'Grocery', price: 620, mrp: 750, stock: 0, unit: 'pcs', status: 'draft' },
  { id: 14, name: 'Cotton Kurti Set', sku: 'BAL-KRT-SET', category: 'Fashion', price: 1499, mrp: 2199, stock: 0, unit: 'pcs', status: 'draft' },
  { id: 15, name: 'Rayon Print Kurti M', sku: 'BAL-KRT-M', category: 'Fashion', price: 749, mrp: 999, stock: 36, unit: 'pcs', status: 'active' },
  { id: 16, name: 'Colgate 200g', sku: '8900000000002', category: 'Personal Care', price: 34, mrp: 34, stock: 16, unit: 'pcs', status: 'active' },
  { id: 17, name: 'Red Label Tea 500g', sku: '8900000000008', category: 'Grocery', price: 76, mrp: 85, stock: 34, unit: 'pcs', status: 'active' },
  { id: 18, name: 'Amul Butter 500g', sku: '8901030865100', category: 'Dairy', price: 285, mrp: 295, stock: 0, unit: 'pcs', status: 'active' },
  { id: 19, name: 'Sample Rejected Item', sku: 'REJ-001', category: 'Grocery', price: 99, mrp: 99, stock: 0, unit: 'pcs', status: 'rejected' },
  { id: 20, name: 'Paneer 200g', sku: '8900000000019', category: 'Dairy', price: 80, mrp: 80, stock: 8, unit: 'pcs', status: 'active' },
  { id: 21, name: 'Draft Spice Mix', sku: 'DRF-SPM-001', category: 'Spices', price: 150, mrp: 200, stock: 0, unit: 'pcs', status: 'draft' },
  { id: 22, name: 'Draft Gift Box', sku: 'DRF-GFT-001', category: 'Grocery', price: 500, mrp: 750, stock: 0, unit: 'pcs', status: 'draft' },
  { id: 23, name: 'Surf Excel 1kg', sku: '8900000000003', category: 'Personal Care', price: 41, mrp: 41, stock: 19, unit: 'pcs', status: 'inactive' },
  { id: 24, name: 'Old Masala Pack', sku: 'OLD-MSP-001', category: 'Spices', price: 35, mrp: 45, stock: 5, unit: 'pcs', status: 'inactive' },
];

const DEFAULT_ORDERS = [
  { id: '#9021', customer: 'Pooja Sharma', items: 'Rice, Oil, Salt', amount: 840, payment: 'UPI', status: 'new', date: 'Today 10:42' },
  { id: '#9020', customer: 'Karan Mehta', items: 'Kurti L', amount: 899, payment: 'COD', status: 'shipped', date: 'Today 09:15' },
  { id: '#9019', customer: 'Anita Desai', items: 'Ghee, Paneer', amount: 1240, payment: 'UPI', status: 'new', date: 'Today 08:30' },
  { id: '#9018', customer: 'Rahul Jain', items: 'Vegetables', amount: 560, payment: 'Wallet', status: 'ready', date: 'Yesterday' },
  { id: '#9017', customer: 'Sneha Patel', items: 'Milk, Bread', amount: 320, payment: 'UPI', status: 'shipped', date: 'Yesterday' },
  { id: '#9016', customer: 'Divya Nair', items: 'Kurti x3', amount: 2100, payment: 'COD', status: 'new', date: 'Yesterday' },
  { id: '#9015', customer: 'Amit Shah', items: 'Oil 5L, Rice 10kg', amount: 1850, payment: 'UPI', status: 'processing', date: 'Sep 29' },
  { id: '#9014', customer: 'Neha Gupta', items: 'Tea, Sugar, Salt', amount: 210, payment: 'UPI', status: 'processing', date: 'Sep 29' },
  { id: '#9013', customer: 'Vikram Singh', items: 'Ghee 1L', amount: 1250, payment: 'COD', status: 'ready', date: 'Sep 29' },
  { id: '#9012', customer: 'Priya Nair', items: 'Kurti, Dupatta', amount: 1599, payment: 'UPI', status: 'shipped', date: 'Sep 28' },
  { id: '#9011', customer: 'Rohit Sharma', items: 'Maggi x10', amount: 200, payment: 'Wallet', status: 'delivered', date: 'Sep 28' },
  { id: '#9010', customer: 'Pooja Sharma', items: 'Kurti, Rice', amount: 1520, payment: 'UPI', status: 'delivered', date: 'Sep 27' },
  { id: '#9009', customer: 'Meena Shah', items: 'Quinoa, Ghee', amount: 800, payment: 'UPI', status: 'processing', date: 'Sep 27' },
  { id: '#9008', customer: 'Farhan Khan', items: 'Spice set', amount: 450, payment: 'COD', status: 'cancelled', date: 'Sep 26' },
  { id: '#9007', customer: 'Anita Desai', items: 'Oil 1L', amount: 165, payment: 'UPI', status: 'new', date: 'Today 07:00' },
];

export default function App() {
  const [currentSection, setCurrentSection] = useState('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Products State
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [productTab, setProductTab] = useState('all');
  const [prodSearch, setProdSearch] = useState('');
  const [prodCategory, setProdCategory] = useState('all');
  const [prodStock, setProdStock] = useState('all');
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);

  // Orders State
  const [orders, setOrders] = useState(DEFAULT_ORDERS);
  const [orderTab, setOrderTab] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');

  // Chart Period
  const [chartPeriod, setChartPeriod] = useState('7d');

  // Load from Live Backend on mount
  useEffect(() => {
    async function loadData() {
      const liveOrders = await sellerApi.getOrders();
      if (liveOrders && liveOrders.length > 0) {
        setOrders(liveOrders);
      }
    }
    loadData();
  }, []);

  const toast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 2800);
  };

  const go = (id) => {
    setCurrentSection(id);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleOnline = () => {
    const next = !isOnline;
    setIsOnline(next);
    toast(next ? 'Store is now OPEN' : 'Store is now CLOSED');
  };

  // Orders Actions
  const handleAcceptOrder = async (orderId) => {
    await sellerApi.acceptOrder(orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'processing' } : o));
    toast(`Order ${orderId} accepted`);
  };

  const handlePackOrder = async (orderId) => {
    await sellerApi.packOrder(orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ready' } : o));
    toast(`Order ${orderId} packed`);
  };

  const handleShipOrder = async (orderId) => {
    await sellerApi.shipOrder(orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'shipped' } : o));
    toast(`Shipment created for ${orderId}`);
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    if (productTab !== 'all' && p.status !== productTab) return false;
    if (prodSearch) {
      const q = prodSearch.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
    }
    if (prodCategory !== 'all' && p.category !== prodCategory) return false;
    if (prodStock === 'low') return p.stock > 0 && p.stock <= 20;
    if (prodStock === 'out') return p.stock === 0;
    if (prodStock === 'ok') return p.stock > 20;
    return true;
  });

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    if (orderTab !== 'all' && o.status !== orderTab) return false;
    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      if (!o.id.toLowerCase().includes(q) && !o.customer.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const chartHeights = {
    '7d': [45, 62, 55, 78, 68, 92, 85],
    '30d': [40, 55, 62, 48, 72, 80, 65],
    '90d': [35, 45, 55, 65, 70, 60, 75]
  }[chartPeriod] || [45, 62, 55, 78, 68, 92, 85];

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen">
      {/* Toast Notification */}
      <div id="toast" className={toastVisible ? 'show' : ''}>
        {toastMessage}
      </div>

      {/* Drawer Overlay */}
      <div
        id="drawerOverlay"
        className={`mobile-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      ></div>

      {/* ═══════════════════════════════════════════ HEADER ═══════════════════════════════════════════ */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700"
            >
              <i className="fa-solid fa-bars"></i>
            </button>
            <div className="w-9 h-9 rounded-xl bg-green-700 text-white flex items-center justify-center font-extrabold text-lg">
              A
            </div>
            <div>
              <div className="font-extrabold text-gray-900 leading-tight text-sm">ADAB Seller</div>
              <div className="text-[11px] text-gray-400 truncate max-w-[140px]">Shri Balaji Store</div>
            </div>
          </div>
          <div className="flex-1 min-w-[140px] max-w-lg mx-2">
            <div className="relative">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="search"
                placeholder="Search products, orders, settings..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-gray-50/50 transition"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => go('notifications')}
              className="relative w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition"
            >
              <i className="fa-solid fa-bell text-sm"></i>
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                5
              </span>
            </button>
            <button
              onClick={toggleOnline}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                isOnline
                  ? 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'
                  : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span>{isOnline ? 'Open' : 'Closed'}</span>
            </button>
            <button
              onClick={() => go('settings')}
              className="w-9 h-9 rounded-full bg-green-700 text-white flex items-center justify-center text-sm font-bold"
            >
              R
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════ LAYOUT ═══════════════════════════════════════════ */}
      <div className="max-w-[1440px] mx-auto px-4 py-5 flex flex-col lg:flex-row gap-5">
        {/* ─── SIDEBAR ─── */}
        <aside
          id="sideDrawer"
          className={`mobile-drawer lg:static lg:transform-none lg:w-[220px] lg:p-0 lg:bg-transparent lg:shadow-none shrink-0 ${
            drawerOpen ? 'open' : ''
          }`}
        >
          <div className="lg:hidden flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
            <div className="font-extrabold text-base flex items-center gap-2 text-green-900">
              <div className="w-7 h-7 rounded-lg bg-green-700 text-white flex items-center justify-center text-sm">A</div>{' '}
              ADAB Seller
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <nav className="card p-2 text-sm sticky top-20 sidebar-scroll" id="sideNav">
            <button
              onClick={() => go('home')}
              className={`nav-btn ${currentSection === 'home' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-gauge-high w-4 text-green-600"></i> Dashboard
            </button>

            <div className="nav-label">Catalog</div>
            <button
              onClick={() => go('products')}
              className={`nav-btn ${currentSection === 'products' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-box w-4 text-emerald-600"></i> Products
            </button>
            <button
              onClick={() => go('inventory')}
              className={`nav-btn ${currentSection === 'inventory' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-warehouse w-4 text-teal-600"></i> Inventory
            </button>

            <div className="nav-label">Sales</div>
            <button
              onClick={() => go('orders')}
              className={`nav-btn ${currentSection === 'orders' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-bag-shopping w-4 text-blue-600"></i> Orders{' '}
              <span className="badge bg-green-100 text-green-800">14</span>
            </button>
            <button
              onClick={() => go('fulfillment')}
              className={`nav-btn ${currentSection === 'fulfillment' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-truck-fast w-4 text-indigo-600"></i> Fulfillment
            </button>
            <button
              onClick={() => go('returns')}
              className={`nav-btn ${currentSection === 'returns' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-rotate-left w-4 text-orange-600"></i> Returns{' '}
              <span className="badge bg-red-100 text-red-800">3</span>
            </button>

            <div className="nav-label">Growth</div>
            <button
              onClick={() => go('pricing')}
              className={`nav-btn ${currentSection === 'pricing' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-tags w-4 text-violet-600"></i> Pricing
            </button>
            <button
              onClick={() => go('marketing')}
              className={`nav-btn ${currentSection === 'marketing' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-bullhorn w-4 text-pink-600"></i> Marketing
            </button>

            <div className="nav-label">Money</div>
            <button
              onClick={() => go('finance')}
              className={`nav-btn ${currentSection === 'finance' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-wallet w-4 text-amber-600"></i> Finance
            </button>
            <button
              onClick={() => go('analytics')}
              className={`nav-btn ${currentSection === 'analytics' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-chart-line w-4 text-cyan-600"></i> Analytics
            </button>

            <div className="nav-label">Insights</div>
            <button
              onClick={() => go('customers')}
              className={`nav-btn ${currentSection === 'customers' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-star w-4 text-yellow-600"></i> Reviews
            </button>
            <button
              onClick={() => go('health')}
              className={`nav-btn ${currentSection === 'health' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-shield-check w-4 text-green-600"></i> Account Health
            </button>

            <div className="nav-label">Operations</div>
            <button
              onClick={() => go('buystock')}
              className={`nav-btn ${currentSection === 'buystock' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-cart-shopping w-4 text-blue-600"></i> Buy Stock
            </button>
            <button
              onClick={() => go('pos')}
              className={`nav-btn ${currentSection === 'pos' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-cash-register w-4 text-indigo-600"></i> POS
            </button>
            <button
              onClick={() => go('messages')}
              className={`nav-btn ${currentSection === 'messages' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-envelope w-4 text-gray-500"></i> Messages{' '}
              <span className="badge bg-blue-100 text-blue-800">5</span>
            </button>
            <button
              onClick={() => go('settings')}
              className={`nav-btn ${currentSection === 'settings' ? 'nav-on' : ''}`}
            >
              <i className="fa-solid fa-gear w-4 text-gray-500"></i> Settings
            </button>
          </nav>
        </aside>

        {/* ─── MAIN CONTENT ─── */}
        <main className="flex-1 min-w-0 space-y-5 fade-in" id="mainArea">
          {/* ══════════════════ SECTION: DASHBOARD ══════════════════ */}
          {currentSection === 'home' && (
            <section className="space-y-5">
              {/* Action Center */}
              <div className="card p-5 border-l-4 border-l-amber-400">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-extrabold text-base flex items-center gap-2">
                    <i className="fa-solid fa-bell text-amber-500"></i> Action Center
                  </h2>
                  <span className="text-xs text-gray-400">5 items need attention</span>
                </div>
                <div className="space-y-2">
                  <div
                    className="action-item flex items-center gap-3 p-3 rounded-xl border border-gray-100"
                    onClick={() => go('orders')}
                  >
                    <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-bag-shopping text-orange-600"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">4 orders need action</div>
                      <div className="text-xs text-gray-500">New orders awaiting acceptance</div>
                    </div>
                    <span className="status-badge s-pending">Urgent</span>
                  </div>
                  <div
                    className="action-item flex items-center gap-3 p-3 rounded-xl border border-gray-100"
                    onClick={() => go('inventory')}
                  >
                    <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-triangle-exclamation text-red-600"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">7 products low on stock</div>
                      <div className="text-xs text-gray-500">Below minimum threshold</div>
                    </div>
                    <span className="status-badge s-low">Low Stock</span>
                  </div>
                  <div
                    className="action-item flex items-center gap-3 p-3 rounded-xl border border-gray-100"
                    onClick={() => go('returns')}
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-rotate-left text-purple-600"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">3 return requests pending</div>
                      <div className="text-xs text-gray-500">Review within 48 hours</div>
                    </div>
                    <span className="status-badge s-pending">Review</span>
                  </div>
                  <div
                    className="action-item flex items-center gap-3 p-3 rounded-xl border border-gray-100"
                    onClick={() => go('products')}
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-clipboard-check text-blue-600"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">2 products pending approval</div>
                      <div className="text-xs text-gray-500">Submitted to admin for review</div>
                    </div>
                    <span className="status-badge s-processing">Pending</span>
                  </div>
                  <div
                    className="action-item flex items-center gap-3 p-3 rounded-xl border border-gray-100"
                    onClick={() => go('health')}
                  >
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-shield-check text-green-600"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">IEC certificate pending</div>
                      <div className="text-xs text-gray-500">Required for export orders</div>
                    </div>
                    <span className="status-badge s-draft">Optional</span>
                  </div>
                </div>
              </div>

              {/* KPI Cards Row 1 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card p-5 kpi-card">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 font-semibold">Today's Sales</span>
                    <i className="fa-solid fa-indian-rupee-sign text-green-200"></i>
                  </div>
                  <div className="text-2xl font-extrabold">₹18,420</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[11px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                      ↑ 12%
                    </span>
                    <span className="text-[10px] text-gray-400">vs yesterday</span>
                  </div>
                </div>
                <div className="card p-5 kpi-card">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 font-semibold">New Orders</span>
                    <i className="fa-solid fa-bag-shopping text-blue-200"></i>
                  </div>
                  <div className="text-2xl font-extrabold text-blue-700">14</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                      4 need action
                    </span>
                  </div>
                </div>
                <div className="card p-5 kpi-card">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 font-semibold">Next Payout</span>
                    <i className="fa-solid fa-building-columns text-emerald-200"></i>
                  </div>
                  <div className="text-2xl font-extrabold">₹38,420</div>
                  <div className="text-[10px] text-gray-400 mt-1">Tomorrow · HDFC Bank</div>
                </div>
                <div className="card p-5 kpi-card">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 font-semibold">Seller Score</span>
                    <i className="fa-solid fa-shield-check text-green-200"></i>
                  </div>
                  <div className="text-2xl font-extrabold text-green-700">A</div>
                  <div className="text-[10px] text-green-600 font-bold mt-1">Healthy · 4.6 ★</div>
                </div>
              </div>

              {/* KPI Cards Row 2 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Active Products</div>
                  <div className="text-xl font-extrabold mt-1">382</div>
                  <div className="text-[10px] text-gray-400">2 pending approval</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Conversion Rate</div>
                  <div className="text-xl font-extrabold mt-1 text-blue-700">4.2%</div>
                  <div className="text-[10px] text-green-600 font-bold">↑ 0.3% this week</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Low Stock Items</div>
                  <div className="text-xl font-extrabold mt-1 text-red-600">7</div>
                  <div className="text-[10px] text-red-500 font-bold">3 out of stock</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Return Rate</div>
                  <div className="text-xl font-extrabold mt-1">2.1%</div>
                  <div className="text-[10px] text-green-600 font-bold">Below benchmark</div>
                </div>
              </div>

              {/* Sales Chart + Order Pipeline */}
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="card p-5 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold">Sales Trend (7 days)</h3>
                    <div className="flex gap-1">
                      <button
                        className={`tab-btn text-xs ${chartPeriod === '7d' ? 'tab-on' : 'tab-off'}`}
                        onClick={() => setChartPeriod('7d')}
                      >
                        7D
                      </button>
                      <button
                        className={`tab-btn text-xs ${chartPeriod === '30d' ? 'tab-on' : 'tab-off'}`}
                        onClick={() => setChartPeriod('30d')}
                      >
                        30D
                      </button>
                      <button
                        className={`tab-btn text-xs ${chartPeriod === '90d' ? 'tab-on' : 'tab-off'}`}
                        onClick={() => setChartPeriod('90d')}
                      >
                        90D
                      </button>
                    </div>
                  </div>
                  <div className="flex items-end gap-2 h-40">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'].map((day, idx) => (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-t-lg chart-bar ${
                            idx === 6 ? 'bg-green-700' : 'bg-green-400'
                          }`}
                          style={{ height: `${chartHeights[idx]}%` }}
                        ></div>
                        <span className={`text-[10px] ${idx === 6 ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                          {day}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 text-xs text-gray-500">
                    <span>
                      Total: <b className="text-gray-900">₹1,28,940</b>
                    </span>
                    <span>
                      Avg/day: <b className="text-gray-900">₹18,420</b>
                    </span>
                    <span>
                      Orders: <b className="text-gray-900">96</b>
                    </span>
                  </div>
                </div>
                <div className="card p-5">
                  <h3 className="font-extrabold mb-4">Order Pipeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                        <span className="text-sm">New</span>
                      </div>
                      <span className="font-extrabold">4</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        <span className="text-sm">Processing</span>
                      </div>
                      <span className="font-extrabold">3</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                        <span className="text-sm">Ready to Ship</span>
                      </div>
                      <span className="font-extrabold">2</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
                        <span className="text-sm">Shipped</span>
                      </div>
                      <span className="font-extrabold">3</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                        <span className="text-sm">Delivered (today)</span>
                      </div>
                      <span className="font-extrabold">2</span>
                    </div>
                  </div>
                  <button onClick={() => go('orders')} className="w-full btn-soft !text-xs mt-4">
                    View All Orders →
                  </button>
                </div>
              </div>

              {/* Top Products + Revenue Summary */}
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="font-extrabold mb-3">Top Products This Week</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <span className="text-sm font-bold text-gray-400 w-5">1</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm">Basmati Rice 5kg</div>
                        <div className="text-xs text-gray-500">42 units · ₹26,040</div>
                      </div>
                      <span className="text-xs font-bold text-green-600">↑ 18%</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <span className="text-sm font-bold text-gray-400 w-5">2</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm">Balaji Silk Kurti</div>
                        <div className="text-xs text-gray-500">28 units · ₹25,172</div>
                      </div>
                      <span className="text-xs font-bold text-green-600">↑ 12%</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <span className="text-sm font-bold text-gray-400 w-5">3</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm">A2 Gir Cow Ghee 1L</div>
                        <div className="text-xs text-gray-500">16 units · ₹20,000</div>
                      </div>
                      <span className="text-xs font-bold text-red-500">↓ 3%</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <span className="text-sm font-bold text-gray-400 w-5">4</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm">Fortune Sunflower Oil 1L</div>
                        <div className="text-xs text-gray-500">68 units · ₹11,220</div>
                      </div>
                      <span className="text-xs font-bold text-green-600">↑ 8%</span>
                    </div>
                  </div>
                </div>
                <div className="card p-5">
                  <h3 className="font-extrabold mb-3">Revenue Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Gross Sales</span>
                      <span className="font-bold">₹1,28,940</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Platform Commission (5%)</span>
                      <span className="font-bold text-red-600">-₹6,447</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping Costs</span>
                      <span className="font-bold text-red-600">-₹2,180</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Refunds</span>
                      <span className="font-bold text-red-600">-₹1,240</span>
                    </div>
                    <div className="border-t border-dashed pt-2 flex justify-between">
                      <span className="font-extrabold">Net Earnings</span>
                      <span className="font-extrabold text-green-700">₹1,19,073</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Next Payout</span>
                      <span className="font-bold text-green-700">
                        ₹38,420 <span className="text-gray-400 font-normal">· Tomorrow</span>
                      </span>
                    </div>
                  </div>
                  <button onClick={() => go('finance')} className="w-full btn-soft !text-xs mt-3">
                    View Finance →
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card p-5">
                <h3 className="font-extrabold mb-3">Recent Activity</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50">
                    <span>
                      <i className="fa-solid fa-bag-shopping text-green-600 mr-2"></i>New order #9021 — Pooja Sharma ·
                      ₹840
                    </span>
                    <span className="text-xs text-gray-400">2 min ago</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50">
                    <span>
                      <i className="fa-solid fa-check-circle text-blue-600 mr-2"></i>Order #9018 packed — Ready to ship
                    </span>
                    <span className="text-xs text-gray-400">18 min ago</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50">
                    <span>
                      <i className="fa-solid fa-money-bill-transfer text-green-600 mr-2"></i>₹18,420 settled to HDFC Bank
                    </span>
                    <span className="text-xs text-gray-400">1 hr ago</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50">
                    <span>
                      <i className="fa-solid fa-clipboard-check text-indigo-600 mr-2"></i>Product "Organic Turmeric" approved
                      by admin
                    </span>
                    <span className="text-xs text-gray-400">3 hr ago</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50">
                    <span>
                      <i className="fa-solid fa-star text-amber-500 mr-2"></i>New 5★ review on "Balaji Silk Kurti"
                    </span>
                    <span className="text-xs text-gray-400">5 hr ago</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: PRODUCTS ══════════════════ */}
          {currentSection === 'products' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-xl font-extrabold">Products</h1>
                  <p className="text-sm text-gray-500">Manage your product catalog · 382 items</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => toast('CSV exported')} className="btn-soft text-xs">
                    <i className="fa-solid fa-download mr-1"></i>Export
                  </button>
                  <button onClick={() => toast('Bulk upload dialog')} className="btn-soft text-xs">
                    <i className="fa-solid fa-upload mr-1"></i>Bulk Upload
                  </button>
                  <button onClick={() => setAddProductModalOpen(true)} className="btn-primary text-sm">
                    <i className="fa-solid fa-plus mr-1"></i>Add Product
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div
                  className="card p-3 cursor-pointer hover:border-green-300 transition"
                  onClick={() => setProductTab('all')}
                >
                  <div className="text-xs text-gray-500">All Products</div>
                  <div className="text-xl font-extrabold">382</div>
                </div>
                <div
                  className="card p-3 cursor-pointer hover:border-green-300 transition"
                  onClick={() => setProductTab('active')}
                >
                  <div className="text-xs text-gray-500">Active</div>
                  <div className="text-xl font-extrabold text-green-700">374</div>
                </div>
                <div
                  className="card p-3 cursor-pointer hover:border-amber-300 transition"
                  onClick={() => setProductTab('pending')}
                >
                  <div className="text-xs text-gray-500">Pending Approval</div>
                  <div className="text-xl font-extrabold text-amber-600">2</div>
                </div>
                <div
                  className="card p-3 cursor-pointer hover:border-gray-300 transition"
                  onClick={() => setProductTab('draft')}
                >
                  <div className="text-xs text-gray-500">Drafts</div>
                  <div className="text-xl font-extrabold text-gray-400">4</div>
                </div>
                <div
                  className="card p-3 cursor-pointer hover:border-red-300 transition"
                  onClick={() => setProductTab('inactive')}
                >
                  <div className="text-xs text-gray-500">Inactive</div>
                  <div className="text-xl font-extrabold text-gray-400">2</div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap text-xs font-bold">
                {['all', 'active', 'pending', 'draft', 'inactive', 'rejected'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setProductTab(tab)}
                    className={`tab-btn ${productTab === tab ? 'tab-on' : 'tab-off'}`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              <div className="card p-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="search"
                  value={prodSearch}
                  onChange={e => setProdSearch(e.target.value)}
                  placeholder="Search by name, SKU, barcode..."
                  className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                />
                <select
                  value={prodCategory}
                  onChange={e => setProdCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="Grocery">Grocery</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Spices">Spices</option>
                  <option value="Personal Care">Personal Care</option>
                </select>
                <select
                  value={prodStock}
                  onChange={e => setProdStock(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
                >
                  <option value="all">All Stock</option>
                  <option value="ok">In Stock</option>
                  <option value="low">Low Stock</option>
                  <option value="out">Out of Stock</option>
                </select>
              </div>
              <div className="card overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[800px]">
                  <thead className="bg-gray-50 text-gray-500 text-xs">
                    <tr>
                      <th className="px-4 py-3 w-8">
                        <input type="checkbox" />
                      </th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map(p => {
                      const statusClass =
                        { active: 's-active', pending: 's-pending', draft: 's-draft', rejected: 's-rejected', inactive: 's-cancelled' }[
                          p.status
                        ] || 's-draft';
                      const statusLabel =
                        { active: 'Active', pending: 'Pending Approval', draft: 'Draft', rejected: 'Rejected', inactive: 'Inactive' }[
                          p.status
                        ] || p.status;
                      const stockClass = p.stock === 0 ? 's-out' : p.stock <= 20 ? 's-low' : 's-ok';
                      const stockLabel =
                        p.stock === 0 ? 'Out of Stock' : p.stock <= 20 ? `${p.stock} ${p.unit}` : `${p.stock} ${p.unit}`;
                      const discount = p.mrp > p.price ? `${Math.round((1 - p.price / p.mrp) * 100)}% OFF` : '';
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <input type="checkbox" className="rounded" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-sm">{p.name}</div>
                            {discount && (
                              <span className="text-[10px] font-bold text-orange-600">{discount}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.sku}</td>
                          <td className="px-4 py-3 text-xs">{p.category}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-green-700">₹{p.price}</div>
                            {p.mrp > p.price && (
                              <div className="text-[10px] text-gray-400 line-through">₹{p.mrp}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`status-badge ${stockClass}`}>{stockLabel}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toast(`Editing ${p.name}`)}
                              className="text-green-700 text-xs font-bold mr-2"
                            >
                              Edit
                            </button>
                            {p.status === 'draft' && (
                              <button
                                onClick={() => toast('Submitted for approval')}
                                className="text-blue-600 text-xs font-bold"
                              >
                                Submit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>
                  Showing <b>{filteredProducts.length}</b> of <b>{products.length}</b> products
                </span>
                <div className="flex gap-1">
                  <button className="btn-soft !text-xs !py-1.5 !px-3">← Prev</button>
                  <button className="btn-soft !text-xs !py-1.5 !px-3 tab-on">1</button>
                  <button className="btn-soft !text-xs !py-1.5 !px-3">2</button>
                  <button className="btn-soft !text-xs !py-1.5 !px-3">Next →</button>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: INVENTORY ══════════════════ */}
          {currentSection === 'inventory' && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">Inventory Management</h1>
                <p className="text-sm text-gray-500">Monitor stock levels, health, and replenishment</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card p-4 border-l-4 border-l-green-500">
                  <div className="text-xs text-gray-500">In Stock</div>
                  <div className="text-2xl font-extrabold text-green-700">372</div>
                  <div className="text-[10px] text-gray-400">Healthy items</div>
                </div>
                <div className="card p-4 border-l-4 border-l-amber-500">
                  <div className="text-xs text-gray-500">Low Stock</div>
                  <div className="text-2xl font-extrabold text-amber-600">7</div>
                  <div className="text-[10px] text-amber-600 font-bold">Below threshold</div>
                </div>
                <div className="card p-4 border-l-4 border-l-red-500">
                  <div className="text-xs text-gray-500">Out of Stock</div>
                  <div className="text-2xl font-extrabold text-red-600">3</div>
                  <div className="text-[10px] text-red-500 font-bold">Action needed</div>
                </div>
                <div className="card p-4 border-l-4 border-l-blue-500">
                  <div className="text-xs text-gray-500">Total Value</div>
                  <div className="text-2xl font-extrabold">₹4.8L</div>
                  <div className="text-[10px] text-gray-400">At cost price</div>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-extrabold mb-3">
                  <i className="fa-solid fa-triangle-exclamation text-amber-500 mr-1"></i> Low Stock Alerts
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50">
                    <div>
                      <div className="font-bold text-sm">Maggi Noodles 70g</div>
                      <div className="text-xs text-gray-500">SKU: 8900000000000 · Threshold: 20</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-amber-700">10 left</div>
                      <button
                        onClick={() => toast('Restock order created')}
                        className="text-xs text-blue-600 font-bold mt-1"
                      >
                        Reorder →
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50">
                    <div>
                      <div className="font-bold text-sm">Paneer 200g</div>
                      <div className="text-xs text-gray-500">SKU: 8900000000019 · Threshold: 15</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-amber-700">8 left</div>
                      <button
                        onClick={() => toast('Restock order created')}
                        className="text-xs text-blue-600 font-bold mt-1"
                      >
                        Reorder →
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50">
                    <div>
                      <div className="font-bold text-sm">Amul Butter 500g</div>
                      <div className="text-xs text-gray-500">SKU: 8901030865100 · Threshold: 10</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-red-700">0 left</div>
                      <button
                        onClick={() => toast('Restock order created')}
                        className="text-xs text-blue-600 font-bold mt-1"
                      >
                        Reorder →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold">Inventory Health</h3>
                  <button
                    onClick={() => toast('Inventory report downloaded')}
                    className="btn-soft !text-xs"
                  >
                    <i className="fa-solid fa-download mr-1"></i>Export Report
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                    <div className="text-2xl font-extrabold text-green-700">97.3%</div>
                    <div className="text-xs text-gray-600 font-bold">Fill Rate</div>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="text-2xl font-extrabold text-blue-700">18 days</div>
                    <div className="text-xs text-gray-600 font-bold">Avg Days of Supply</div>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="text-2xl font-extrabold text-amber-700">₹12,400</div>
                    <div className="text-xs text-gray-600 font-bold">Aging Stock Value</div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: ORDERS ══════════════════ */}
          {currentSection === 'orders' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-xl font-extrabold">Orders</h1>
                  <p className="text-sm text-gray-500">Manage all customer orders</p>
                </div>
                <button onClick={() => toast('Orders exported')} className="btn-soft text-xs">
                  <i className="fa-solid fa-download mr-1"></i>Export
                </button>
              </div>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                <div
                  className="card p-3 text-center cursor-pointer hover:border-orange-300 transition"
                  onClick={() => setOrderTab('new')}
                >
                  <div className="text-lg font-extrabold text-orange-600">4</div>
                  <div className="text-[10px] text-gray-500 font-bold">New</div>
                </div>
                <div
                  className="card p-3 text-center cursor-pointer hover:border-blue-300 transition"
                  onClick={() => setOrderTab('processing')}
                >
                  <div className="text-lg font-extrabold text-blue-600">3</div>
                  <div className="text-[10px] text-gray-500 font-bold">Processing</div>
                </div>
                <div
                  className="card p-3 text-center cursor-pointer hover:border-indigo-300 transition"
                  onClick={() => setOrderTab('ready')}
                >
                  <div className="text-lg font-extrabold text-indigo-600">2</div>
                  <div className="text-[10px] text-gray-500 font-bold">Ready to Ship</div>
                </div>
                <div
                  className="card p-3 text-center cursor-pointer hover:border-violet-300 transition"
                  onClick={() => setOrderTab('shipped')}
                >
                  <div className="text-lg font-extrabold text-violet-600">3</div>
                  <div className="text-[10px] text-gray-500 font-bold">Shipped</div>
                </div>
                <div
                  className="card p-3 text-center cursor-pointer hover:border-green-300 transition"
                  onClick={() => setOrderTab('delivered')}
                >
                  <div className="text-lg font-extrabold text-green-600">2</div>
                  <div className="text-[10px] text-gray-500 font-bold">Delivered</div>
                </div>
                <div
                  className="card p-3 text-center cursor-pointer hover:border-gray-300 transition"
                  onClick={() => setOrderTab('cancelled')}
                >
                  <div className="text-lg font-extrabold text-gray-400">1</div>
                  <div className="text-[10px] text-gray-500 font-bold">Cancelled</div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {['all', 'new', 'processing', 'ready', 'shipped', 'delivered', 'cancelled'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setOrderTab(tab)}
                    className={`tab-btn text-xs ${orderTab === tab ? 'tab-on' : 'tab-off'}`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              <div className="card p-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="search"
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  placeholder="Search order ID, customer..."
                  className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none focus:border-green-500"
                />
                <select className="px-3 py-2 rounded-xl border text-sm">
                  <option>Today</option>
                  <option>This Week</option>
                  <option>This Month</option>
                  <option>Last 30 days</option>
                </select>
              </div>
              <div className="card overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[800px]">
                  <thead className="bg-gray-50 text-gray-500 text-xs">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map(o => {
                      const sc =
                        {
                          new: 's-pending',
                          processing: 's-processing',
                          ready: 's-processing',
                          shipped: 's-shipped',
                          delivered: 's-delivered',
                          cancelled: 's-cancelled'
                        }[o.status] || 's-draft';
                      const sl =
                        {
                          new: 'New',
                          processing: 'Processing',
                          ready: 'Ready to Ship',
                          shipped: 'Shipped',
                          delivered: 'Delivered',
                          cancelled: 'Cancelled'
                        }[o.status] || o.status;

                      return (
                        <tr key={o.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-bold">{o.id}</td>
                          <td className="px-4 py-3">{o.customer}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{o.items}</td>
                          <td className="px-4 py-3 font-bold">₹{Number(o.amount).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-xs">{o.payment}</td>
                          <td className="px-4 py-3">
                            <span className={`status-badge ${sc}`}>{sl}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{o.date}</td>
                          <td className="px-4 py-3">
                            {o.status === 'new' && (
                              <button
                                onClick={() => handleAcceptOrder(o.id)}
                                className="btn-primary !text-xs !py-1 !px-2"
                              >
                                Accept
                              </button>
                            )}
                            {o.status === 'processing' && (
                              <button
                                onClick={() => handlePackOrder(o.id)}
                                className="btn-primary !text-xs !py-1 !px-2"
                              >
                                Pack
                              </button>
                            )}
                            {o.status === 'ready' && (
                              <button
                                onClick={() => handleShipOrder(o.id)}
                                className="btn-primary !text-xs !py-1 !px-2"
                              >
                                Ship
                              </button>
                            )}
                            {(o.status === 'shipped' || o.status === 'delivered' || o.status === 'cancelled') && (
                              <button
                                onClick={() => toast(`Order ${o.id} details`)}
                                className="text-green-700 text-xs font-bold"
                              >
                                View
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: FULFILLMENT ══════════════════ */}
          {currentSection === 'fulfillment' && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">Fulfillment & Shipping</h1>
                <p className="text-sm text-gray-500">Manage shipments, delivery performance, and zones</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Ready to Ship</div>
                  <div className="text-xl font-extrabold text-indigo-700">2</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">In Transit</div>
                  <div className="text-xl font-extrabold text-violet-700">3</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">On-time Rate</div>
                  <div className="text-xl font-extrabold text-green-700">96.8%</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Avg Delivery Time</div>
                  <div className="text-xl font-extrabold">32 min</div>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-extrabold mb-3">Active Shipments</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <i className="fa-solid fa-truck text-indigo-600 text-sm"></i>
                      </div>
                      <div>
                        <div className="font-bold text-sm">#9020 · Karan Mehta</div>
                        <div className="text-xs text-gray-500">Kurti L · 4.8 km · Rider: Sanjay</div>
                      </div>
                    </div>
                    <span className="status-badge s-shipped">In Transit</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                        <i className="fa-solid fa-box text-orange-600 text-sm"></i>
                      </div>
                      <div>
                        <div className="font-bold text-sm">#9018 · Rahul Jain</div>
                        <div className="text-xs text-gray-500">Vegetables · 0.8 km · Ready for pickup</div>
                      </div>
                    </div>
                    <span className="status-badge s-processing">Ready</span>
                  </div>
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="font-extrabold mb-3">Delivery Performance</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>On-time delivery rate</span>
                      <span className="font-bold text-green-700">96.8%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '96.8%' }}></div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Late shipment rate</span>
                      <span className="font-bold text-green-700">1.2%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: '1.2%' }}></div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Return-to-origin (RTO)</span>
                      <span className="font-bold text-green-700">0.8%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-green-400 h-2 rounded-full" style={{ width: '0.8%' }}></div>
                    </div>
                  </div>
                </div>
                <div className="card p-5">
                  <h3 className="font-extrabold mb-3">Delivery Zones</h3>
                  <div className="p-4 rounded-xl bg-green-50 border border-green-200 mb-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-green-800">Active Zone</span>
                        <div className="text-xs text-gray-600 mt-1">10 km radius from store · Surat</div>
                      </div>
                      <button
                        onClick={() => toast('Zone editor opened')}
                        className="btn-primary !text-xs !py-1.5"
                      >
                        Edit Zone
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Customers within this zone can order via the app. Orders outside this zone are served through B2B store
                    orders.
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: RETURNS ══════════════════ */}
          {currentSection === 'returns' && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">Returns & Refunds</h1>
                <p className="text-sm text-gray-500">Manage customer return requests</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Pending Review</div>
                  <div className="text-xl font-extrabold text-amber-600">3</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Approved</div>
                  <div className="text-xl font-extrabold text-green-700">12</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Refunded (this month)</div>
                  <div className="text-xl font-extrabold">₹4,820</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Return Rate</div>
                  <div className="text-xl font-extrabold text-green-700">2.1%</div>
                </div>
              </div>
              <div className="card overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[700px]">
                  <thead className="bg-gray-50 text-gray-500 text-xs">
                    <tr>
                      <th className="px-4 py-3">Return ID</th>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 font-bold">#R-441</td>
                      <td className="px-4 py-3">#9010</td>
                      <td className="px-4 py-3">Balaji Silk Kurti</td>
                      <td className="px-4 py-3">Pooja Sharma</td>
                      <td className="px-4 py-3 text-xs">Wrong size</td>
                      <td className="px-4 py-3 font-bold">₹899</td>
                      <td className="px-4 py-3">
                        <span className="status-badge s-pending">Pending</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toast('Return approved · Refund initiated')}
                          className="btn-primary !text-xs !py-1 !px-2 mr-1"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => toast('Return rejected')}
                          className="btn-danger !text-xs !py-1 !px-2"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold">#R-440</td>
                      <td className="px-4 py-3">#9005</td>
                      <td className="px-4 py-3">A2 Cow Ghee 1L</td>
                      <td className="px-4 py-3">Karan Mehta</td>
                      <td className="px-4 py-3 text-xs">Damaged in transit</td>
                      <td className="px-4 py-3 font-bold">₹1,250</td>
                      <td className="px-4 py-3">
                        <span className="status-badge s-pending">Pending</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toast('Return approved')}
                          className="btn-primary !text-xs !py-1 !px-2 mr-1"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => toast('Return rejected')}
                          className="btn-danger !text-xs !py-1 !px-2"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold">#R-439</td>
                      <td className="px-4 py-3">#9002</td>
                      <td className="px-4 py-3">Fortune Oil 1L</td>
                      <td className="px-4 py-3">Anita Desai</td>
                      <td className="px-4 py-3 text-xs">Wrong item</td>
                      <td className="px-4 py-3 font-bold">₹165</td>
                      <td className="px-4 py-3">
                        <span className="status-badge s-pending">Pending</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toast('Return approved')}
                          className="btn-primary !text-xs !py-1 !px-2 mr-1"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => toast('Return rejected')}
                          className="btn-danger !text-xs !py-1 !px-2"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="px-4 py-3 font-bold">#R-430</td>
                      <td className="px-4 py-3">#8998</td>
                      <td className="px-4 py-3">Tata Salt 1kg</td>
                      <td className="px-4 py-3">Sneha Patel</td>
                      <td className="px-4 py-3 text-xs">Expired</td>
                      <td className="px-4 py-3 font-bold">₹28</td>
                      <td className="px-4 py-3">
                        <span className="status-badge s-approved">Refunded</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">Completed</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: PRICING ══════════════════ */}
          {currentSection === 'pricing' && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">Pricing</h1>
                <p className="text-sm text-gray-500">Manage product prices, discounts, and margins</p>
              </div>
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="card p-5">
                  <h3 className="font-extrabold mb-3">Quick Price Update</h3>
                  <p className="text-sm text-gray-500 mb-3">Update prices for individual products or in bulk.</p>
                  <button onClick={() => toast('Price editor opened')} className="btn-primary !text-sm w-full">
                    <i className="fa-solid fa-tags mr-1"></i>Mass Price Update
                  </button>
                </div>
                <div className="card p-5">
                  <h3 className="font-extrabold mb-3">Discount Management</h3>
                  <p className="text-sm text-gray-500 mb-3">Set sale prices and percentage discounts.</p>
                  <button onClick={() => toast('Discount manager opened')} className="btn-soft !text-sm w-full">
                    <i className="fa-solid fa-percent mr-1"></i>Manage Discounts
                  </button>
                </div>
                <div className="card p-5">
                  <h3 className="font-extrabold mb-3">Margin Analysis</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg. Margin</span>
                      <span className="font-bold text-green-700">24.6%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Products below 10%</span>
                      <span className="font-bold text-red-600">8</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Products above 30%</span>
                      <span className="font-bold text-green-700">142</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-extrabold mb-3">Price History — Top Products</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[600px]">
                    <thead className="bg-gray-50 text-gray-500 text-xs">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Current Price</th>
                        <th className="px-4 py-3">MRP</th>
                        <th className="px-4 py-3">Discount</th>
                        <th className="px-4 py-3">Margin</th>
                        <th className="px-4 py-3">Last Changed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="px-4 py-3 font-bold">Basmati Rice 5kg</td>
                        <td className="px-4 py-3 font-bold text-green-700">₹620</td>
                        <td className="px-4 py-3 text-gray-400 line-through">₹750</td>
                        <td className="px-4 py-3">
                          <span className="status-badge s-approved">17% OFF</span>
                        </td>
                        <td className="px-4 py-3 font-bold">28%</td>
                        <td className="px-4 py-3 text-xs text-gray-400">2 days ago</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-bold">Balaji Silk Kurti</td>
                        <td className="px-4 py-3 font-bold text-green-700">₹899</td>
                        <td className="px-4 py-3 text-gray-400 line-through">₹1,299</td>
                        <td className="px-4 py-3">
                          <span className="status-badge s-approved">31% OFF</span>
                        </td>
                        <td className="px-4 py-3 font-bold">42%</td>
                        <td className="px-4 py-3 text-xs text-gray-400">5 days ago</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-bold">A2 Gir Cow Ghee 1L</td>
                        <td className="px-4 py-3 font-bold text-green-700">₹1,250</td>
                        <td className="px-4 py-3 text-gray-400 line-through">₹1,499</td>
                        <td className="px-4 py-3">
                          <span className="status-badge s-approved">17% OFF</span>
                        </td>
                        <td className="px-4 py-3 font-bold">35%</td>
                        <td className="px-4 py-3 text-xs text-gray-400">1 week ago</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: MARKETING ══════════════════ */}
          {currentSection === 'marketing' && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">Marketing & Promotions</h1>
                <p className="text-sm text-gray-500">Create coupons, deals, and campaigns to boost sales</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Active Coupons</div>
                  <div className="text-xl font-extrabold text-green-700">3</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Sales from Promos</div>
                  <div className="text-xl font-extrabold">₹12,480</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Coupon Redemptions</div>
                  <div className="text-xl font-extrabold text-blue-700">84</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Campaign ROI</div>
                  <div className="text-xl font-extrabold text-green-700">3.2x</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toast('Create coupon dialog opened')}
                  className="btn-primary text-sm"
                >
                  <i className="fa-solid fa-plus mr-1"></i>Create Coupon
                </button>
                <button onClick={() => toast('Create deal dialog')} className="btn-soft text-sm">
                  Create Deal
                </button>
              </div>
              <div className="card p-5">
                <h3 className="font-extrabold mb-3">Active Promotions</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-green-300 bg-green-50">
                    <div>
                      <div className="font-extrabold text-green-800">BALAJI15</div>
                      <div className="text-sm text-gray-600">15% off on all products · Min ₹199</div>
                      <div className="text-xs text-gray-400 mt-1">Valid till Oct 15 · 42 uses</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toast('Coupon edited')} className="btn-soft !text-xs">
                        Edit
                      </button>
                      <button onClick={() => toast('Coupon paused')} className="btn-danger !text-xs">
                        Pause
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                    <div>
                      <div className="font-extrabold">FIRST50</div>
                      <div className="text-sm text-gray-600">₹50 off for new customers · Min ₹299</div>
                      <div className="text-xs text-gray-400 mt-1">Valid till Oct 31 · 28 uses</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toast('Coupon edited')} className="btn-soft !text-xs">
                        Edit
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                    <div>
                      <div className="font-extrabold">FESTIVE10</div>
                      <div className="text-sm text-gray-600">10% off fashion category · Min ₹499</div>
                      <div className="text-xs text-gray-400 mt-1">Valid till Oct 20 · 14 uses</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toast('Coupon edited')} className="btn-soft !text-xs">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: FINANCE ══════════════════ */}
          {currentSection === 'finance' && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">Finance</h1>
                <p className="text-sm text-gray-500">Track revenue, settlements, payouts, and fees</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card p-4 border-l-4 border-l-green-500">
                  <div className="text-xs text-gray-500">Gross Revenue (30d)</div>
                  <div className="text-2xl font-extrabold">₹4,28,400</div>
                </div>
                <div className="card p-4 border-l-4 border-l-red-400">
                  <div className="text-xs text-gray-500">Total Fees</div>
                  <div className="text-2xl font-extrabold text-red-600">₹21,420</div>
                </div>
                <div className="card p-4 border-l-4 border-l-emerald-500">
                  <div className="text-xs text-gray-500">Net Earnings</div>
                  <div className="text-2xl font-extrabold text-green-700">₹4,06,980</div>
                </div>
                <div className="card p-4 border-l-4 border-l-blue-500">
                  <div className="text-xs text-gray-500">Pending Payout</div>
                  <div className="text-2xl font-extrabold text-blue-700">₹38,420</div>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-extrabold mb-3">Fee Breakdown (This Month)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 rounded-lg bg-gray-50">
                    <span>Gross Sales</span>
                    <span className="font-bold">₹4,28,400</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-red-50">
                    <span>Platform Commission (5%)</span>
                    <span className="font-bold text-red-600">-₹21,420</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-red-50">
                    <span>Payment Processing (2%)</span>
                    <span className="font-bold text-red-600">-₹8,568</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-red-50">
                    <span>Shipping Deductions</span>
                    <span className="font-bold text-red-600">-₹6,840</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-red-50">
                    <span>Refunds</span>
                    <span className="font-bold text-red-600">-₹4,820</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-green-50 border border-green-200">
                    <span className="font-extrabold">Net Earnings</span>
                    <span className="font-extrabold text-green-700">₹3,86,752</span>
                  </div>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-extrabold mb-3">Recent Settlements</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[600px]">
                    <thead className="bg-gray-50 text-gray-500 text-xs">
                      <tr>
                        <th className="px-4 py-3">Settlement</th>
                        <th className="px-4 py-3">Period</th>
                        <th className="px-4 py-3">Gross</th>
                        <th className="px-4 py-3">Fees</th>
                        <th className="px-4 py-3">Net</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="px-4 py-3 font-bold">#SET-2024</td>
                        <td className="px-4 py-3 text-xs">Sep 16–30</td>
                        <td className="px-4 py-3">₹2,14,200</td>
                        <td className="px-4 py-3 text-red-600">-₹10,710</td>
                        <td className="px-4 py-3 font-bold text-green-700">₹2,03,490</td>
                        <td className="px-4 py-3">
                          <span className="status-badge s-approved">Paid</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-bold">#SET-2025</td>
                        <td className="px-4 py-3 text-xs">Oct 1–15</td>
                        <td className="px-4 py-3">₹1,28,940</td>
                        <td className="px-4 py-3 text-red-600">-₹6,447</td>
                        <td className="px-4 py-3 font-bold text-green-700">₹1,22,493</td>
                        <td className="px-4 py-3">
                          <span className="status-badge s-pending">Processing</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: ANALYTICS ══════════════════ */}
          {currentSection === 'analytics' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-xl font-extrabold">Analytics & Reports</h1>
                  <p className="text-sm text-gray-500">Business intelligence and downloadable reports</p>
                </div>
                <select className="px-3 py-2 rounded-xl border text-sm">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>This year</option>
                </select>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Total Revenue</div>
                  <div className="text-xl font-extrabold">₹4.28L</div>
                  <div className="text-[10px] text-green-600 font-bold">↑ 18% vs last month</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Orders</div>
                  <div className="text-xl font-extrabold">412</div>
                  <div className="text-[10px] text-green-600 font-bold">↑ 12%</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Avg Order Value</div>
                  <div className="text-xl font-extrabold">₹1,040</div>
                  <div className="text-[10px] text-green-600 font-bold">↑ 5%</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Unique Customers</div>
                  <div className="text-xl font-extrabold">286</div>
                  <div className="text-[10px] text-green-600 font-bold">↑ 22%</div>
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="font-extrabold mb-4">Category Split</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Grocery</span>
                        <span className="font-bold">62%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div className="bg-green-500 h-3 rounded-full" style={{ width: '62%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Fashion</span>
                        <span className="font-bold">22%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div className="bg-indigo-500 h-3 rounded-full" style={{ width: '22%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Dairy</span>
                        <span className="font-bold">10%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div className="bg-blue-500 h-3 rounded-full" style={{ width: '10%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Other</span>
                        <span className="font-bold">6%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div className="bg-gray-400 h-3 rounded-full" style={{ width: '6%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card p-5">
                  <h3 className="font-extrabold mb-4">Downloadable Reports</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => toast('Sales report downloaded')}
                      className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition flex items-center gap-3"
                    >
                      <i className="fa-solid fa-file-csv text-green-600"></i>
                      <div>
                        <div className="font-bold text-sm">Sales Report</div>
                        <div className="text-xs text-gray-500">Revenue, orders, products</div>
                      </div>
                      <i className="fa-solid fa-download text-gray-400 ml-auto"></i>
                    </button>
                    <button
                      onClick={() => toast('Inventory report downloaded')}
                      className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-green-300 transition flex items-center gap-3"
                    >
                      <i className="fa-solid fa-file-csv text-blue-600"></i>
                      <div>
                        <div className="font-bold text-sm">Inventory Report</div>
                        <div className="text-xs text-gray-500">Stock levels, health, aging</div>
                      </div>
                      <i className="fa-solid fa-download text-gray-400 ml-auto"></i>
                    </button>
                    <button
                      onClick={() => toast('Financial report downloaded')}
                      className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-green-300 transition flex items-center gap-3"
                    >
                      <i className="fa-solid fa-file-csv text-amber-600"></i>
                      <div>
                        <div className="font-bold text-sm">Financial Report</div>
                        <div className="text-xs text-gray-500">Fees, settlements, payouts</div>
                      </div>
                      <i className="fa-solid fa-download text-gray-400 ml-auto"></i>
                    </button>
                    <button
                      onClick={() => toast('Order report downloaded')}
                      className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-green-300 transition flex items-center gap-3"
                    >
                      <i className="fa-solid fa-file-csv text-violet-600"></i>
                      <div>
                        <div className="font-bold text-sm">Order Report</div>
                        <div className="text-xs text-gray-500">All orders with details</div>
                      </div>
                      <i className="fa-solid fa-download text-gray-400 ml-auto"></i>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: REVIEWS ══════════════════ */}
          {currentSection === 'customers' && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">Reviews & Customer Insights</h1>
                <p className="text-sm text-gray-500">Customer feedback, ratings, and product insights</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Store Rating</div>
                  <div className="text-xl font-extrabold text-amber-600">4.6 ★</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Total Reviews</div>
                  <div className="text-xl font-extrabold">248</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Avg Product Rating</div>
                  <div className="text-xl font-extrabold text-green-700">4.3 ★</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Unanswered Questions</div>
                  <div className="text-xl font-extrabold text-amber-600">4</div>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-extrabold mb-3">Recent Reviews</h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm">Pooja Sharma</div>
                      <div className="text-amber-500 text-sm">★★★★★</div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Beautiful Balaji Silk Kurti! Fabric is amazing and delivery was super fast.
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">2 days ago · Order #9010</span>
                      <button onClick={() => toast('Reply sent')} className="text-xs text-green-700 font-bold">
                        Reply →
                      </button>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm">Karan Mehta</div>
                      <div className="text-amber-500 text-sm">★★★★☆</div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Good quality rice. Packaging could be better.</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">5 days ago · Order #9005</span>
                      <button onClick={() => toast('Reply sent')} className="text-xs text-green-700 font-bold">
                        Reply →
                      </button>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm">Anita Desai</div>
                      <div className="text-amber-500 text-sm">★★☆☆☆</div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Received wrong item. Expected Fortune Oil but got different brand.
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-amber-600 font-bold">Needs response</span>
                      <button onClick={() => toast('Reply sent')} className="text-xs text-green-700 font-bold">
                        Reply →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: ACCOUNT HEALTH ══════════════════ */}
          {currentSection === 'health' && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">Account Health</h1>
                <p className="text-sm text-gray-500">Performance metrics, compliance, and seller score</p>
              </div>
              <div className="card p-6 bg-gradient-to-br from-green-600 to-emerald-700 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-extrabold">
                    A
                  </div>
                  <div>
                    <div className="text-xl font-extrabold">Your Account is Healthy</div>
                    <div className="text-green-100 mt-1">All performance metrics are within acceptable ranges.</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Order Defect Rate</div>
                  <div className="text-xl font-extrabold text-green-700">0.8%</div>
                  <div className="text-[10px] text-green-600 font-bold">Target: &lt; 1%</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Cancellation Rate</div>
                  <div className="text-xl font-extrabold text-green-700">1.2%</div>
                  <div className="text-[10px] text-green-600 font-bold">Target: &lt; 2.5%</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Late Shipment Rate</div>
                  <div className="text-xl font-extrabold text-green-700">1.5%</div>
                  <div className="text-[10px] text-green-600 font-bold">Target: &lt; 4%</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-gray-500">Return Rate</div>
                  <div className="text-xl font-extrabold text-green-700">2.1%</div>
                  <div className="text-[10px] text-green-600 font-bold">Target: &lt; 5%</div>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-extrabold mb-3">Compliance & Certificates</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                    <span>
                      <i className="fa-solid fa-check-circle text-green-600 mr-2"></i>GSTIN Verified
                    </span>
                    <span className="font-bold text-green-700">24AABCU9603R1ZM</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                    <span>
                      <i className="fa-solid fa-check-circle text-green-600 mr-2"></i>FSSAI License Valid
                    </span>
                    <span className="font-bold text-green-700">Expires Mar 2027</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                    <span>
                      <i className="fa-solid fa-check-circle text-green-600 mr-2"></i>Bank Account Linked
                    </span>
                    <span className="font-bold text-green-700">HDFC ****4521</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <span>
                      <i className="fa-solid fa-clock text-amber-600 mr-2"></i>IEC for Export
                    </span>
                    <span className="font-bold text-amber-600">Pending</span>
                  </div>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-extrabold mb-3">Policy Status</h3>
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">
                  <i className="fa-solid fa-shield-check mr-2"></i>
                  <b>No policy violations.</b> Your account is in good standing.
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: BUY STOCK ══════════════════ */}
          {currentSection === 'buystock' && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">Buy Stock (B2B)</h1>
                <p className="text-sm text-gray-500">Purchase inventory from other stores and suppliers</p>
              </div>
              <div className="card p-5">
                <div className="relative">
                  <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-blue-600"></i>
                  <input
                    type="search"
                    placeholder="Search products from any store nationwide..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-blue-200 bg-blue-50/50 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div
                  className="card p-4 hover:border-blue-300 transition cursor-pointer"
                  onClick={() => toast('Store catalog opened')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                      GA
                    </div>
                    <div>
                      <div className="font-bold text-sm">Gujarat Agro Mill</div>
                      <div className="text-xs text-gray-500">3 km · Oil, Grains · ⭐ 4.7</div>
                    </div>
                  </div>
                </div>
                <div
                  className="card p-4 hover:border-blue-300 transition cursor-pointer"
                  onClick={() => toast('Store catalog opened')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
                      PG
                    </div>
                    <div>
                      <div className="font-bold text-sm">Punjab Grain Co</div>
                      <div className="text-xs text-gray-500">1,240 km · Basmati, Wheat · ⭐ 4.5</div>
                    </div>
                  </div>
                </div>
                <div
                  className="card p-4 hover:border-blue-300 transition cursor-pointer"
                  onClick={() => toast('Store catalog opened')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-600 text-white flex items-center justify-center font-bold">
                      JT
                    </div>
                    <div>
                      <div className="font-bold text-sm">Jaipur Textile Hub</div>
                      <div className="text-xs text-gray-500">890 km · Fabric, Fashion · ⭐ 4.4</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-extrabold mb-3">Recent Purchase Orders</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[600px]">
                    <thead className="bg-gray-50 text-gray-500 text-xs">
                      <tr>
                        <th className="px-4 py-3">PO#</th>
                        <th className="px-4 py-3">Supplier</th>
                        <th className="px-4 py-3">Items</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="px-4 py-3 font-bold">#PO-821</td>
                        <td className="px-4 py-3">Gujarat Agro Mill</td>
                        <td className="px-4 py-3 text-xs">Oil 50L</td>
                        <td className="px-4 py-3 font-bold">₹5,600</td>
                        <td className="px-4 py-3">
                          <span className="status-badge s-delivered">Delivered</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-bold">#PO-819</td>
                        <td className="px-4 py-3">Punjab Grain Co</td>
                        <td className="px-4 py-3 text-xs">Basmati 500kg</td>
                        <td className="px-4 py-3 font-bold">₹31,000</td>
                        <td className="px-4 py-3">
                          <span className="status-badge s-shipped">In Transit</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-bold">#PO-816</td>
                        <td className="px-4 py-3">Jaipur Textile Hub</td>
                        <td className="px-4 py-3 text-xs">Fabric Roll</td>
                        <td className="px-4 py-3 font-bold">₹42,000</td>
                        <td className="px-4 py-3">
                          <span className="status-badge s-shipped">In Transit</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: POS ══════════════════ */}
          {currentSection === 'pos' && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">POS / Bill Counter</h1>
                <p className="text-sm text-gray-500">Create bills for walk-in customers</p>
              </div>
              <div className="card p-5">
                <div className="grid lg:grid-cols-2 gap-6">
                  <div>
                    <div className="relative mb-4">
                      <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      <input
                        type="search"
                        placeholder="Scan barcode or search product..."
                        className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                        <div>
                          <div className="font-bold text-sm">Tata Salt 1kg</div>
                          <div className="text-xs text-gray-500">₹28 × 2</div>
                        </div>
                        <div className="font-bold text-green-700">₹56</div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                        <div>
                          <div className="font-bold text-sm">Fortune Oil 1L</div>
                          <div className="text-xs text-gray-500">₹165 × 1</div>
                        </div>
                        <div className="font-bold text-green-700">₹165</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 rounded-xl bg-gray-50 border border-gray-200">
                    <h3 className="font-extrabold mb-4">Bill Summary</h3>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-bold">₹221</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax (GST 5%)</span>
                        <span className="font-bold">₹11</span>
                      </div>
                      <div className="flex justify-between text-lg border-t pt-2">
                        <span className="font-extrabold">Total</span>
                        <span className="font-extrabold text-green-700">₹232</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => toast('Cash payment recorded')}
                        className="btn-primary w-full !text-sm"
                      >
                        Cash
                      </button>
                      <button
                        onClick={() => toast('UPI payment recorded')}
                        className="btn-soft w-full !text-sm"
                      >
                        UPI
                      </button>
                    </div>
                    <button
                      onClick={() => toast('Bill printed')}
                      className="w-full mt-2 btn-soft !text-sm"
                    >
                      <i className="fa-solid fa-print mr-1"></i>Print Bill
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: MESSAGES ══════════════════ */}
          {currentSection === 'messages' && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">Messages</h1>
                <p className="text-sm text-gray-500">Customer and platform communications</p>
              </div>
              <div className="card overflow-hidden">
                <div className="p-4 bg-gray-50 border-b font-bold text-sm flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                    PS
                  </div>
                  Pooja Sharma · Order #9021
                </div>
                <div className="p-4 space-y-3 text-sm min-h-[200px]">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-none p-3 max-w-[80%]">
                    Is the blue kurti available in size L?
                  </div>
                  <div className="bg-green-100 rounded-2xl rounded-br-none p-3 max-w-[80%] ml-auto">
                    Yes! Added to your order ✓
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-bl-none p-3 max-w-[80%]">
                    Thank you! When will it be delivered?
                  </div>
                  <div className="bg-green-100 rounded-2xl rounded-br-none p-3 max-w-[80%] ml-auto">
                    Rider Ramesh is on the way. ETA 18 minutes!
                  </div>
                </div>
                <div className="p-3 border-t flex gap-2">
                  <input
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none focus:border-green-500"
                  />
                  <button
                    onClick={() => toast('Message sent')}
                    className="btn-primary !text-sm !py-2 !px-4"
                  >
                    Send
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: NOTIFICATIONS ══════════════════ */}
          {currentSection === 'notifications' && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">Notifications</h1>
                <p className="text-sm text-gray-500">All alerts and updates</p>
              </div>
              <div className="space-y-2">
                <div className="card p-4 border-l-4 border-l-green-500">
                  <div className="font-bold text-sm">New order #9021 received</div>
                  <div className="text-xs text-gray-500 mt-1">Pooja Sharma · ₹840 · Fast delivery</div>
                  <div className="text-[10px] text-gray-400 mt-1">2 minutes ago</div>
                </div>
                <div className="card p-4 border-l-4 border-l-blue-500">
                  <div className="font-bold text-sm">Product approved by admin</div>
                  <div className="text-xs text-gray-500 mt-1">
                    "Organic Turmeric 200g" is now live on customer app
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">3 hours ago</div>
                </div>
                <div className="card p-4 border-l-4 border-l-amber-500">
                  <div className="font-bold text-sm">Low stock alert</div>
                  <div className="text-xs text-gray-500 mt-1">Maggi Noodles 70g — only 10 left</div>
                  <div className="text-[10px] text-gray-400 mt-1">5 hours ago</div>
                </div>
                <div className="card p-4 border-l-4 border-l-green-500">
                  <div className="font-bold text-sm">Settlement processed</div>
                  <div className="text-xs text-gray-500 mt-1">₹18,420 transferred to HDFC Bank ****4521</div>
                  <div className="text-[10px] text-gray-400 mt-1">Yesterday</div>
                </div>
                <div className="card p-4 border-l-4 border-l-purple-500">
                  <div className="font-bold text-sm">New review received</div>
                  <div className="text-xs text-gray-500 mt-1">5★ review on "Balaji Silk Kurti" from Pooja Sharma</div>
                  <div className="text-[10px] text-gray-400 mt-1">Yesterday</div>
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ SECTION: SETTINGS ══════════════════ */}
          {currentSection === 'settings' && (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">Settings</h1>
                <p className="text-sm text-gray-500">Manage your store profile, payments, and preferences</p>
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="card p-5 space-y-4">
                  <h3 className="font-extrabold">Store Profile</h3>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Store Name</label>
                    <input
                      defaultValue="Shri Balaji Store"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Owner Name</label>
                    <input
                      defaultValue="Rajesh Patel"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Phone</label>
                    <input
                      defaultValue="+91 98765 43210"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Address</label>
                    <input
                      defaultValue="Ring Road, Vesu, Surat 395007"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Categories</label>
                    <input
                      defaultValue="Grocery, Fashion, Dairy"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-green-500"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="card p-5 space-y-3">
                    <h3 className="font-extrabold">Bank & Payments</h3>
                    <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm">
                      <div className="font-bold text-green-800">HDFC Bank ****4521</div>
                      <div className="text-xs text-gray-600 mt-1">Settlements every 14 days · Verified</div>
                    </div>
                    <button
                      onClick={() => toast('Bank details editor opened')}
                      className="btn-soft !text-xs w-full"
                    >
                      Update Bank Details
                    </button>
                  </div>
                  <div className="card p-5 space-y-3">
                    <h3 className="font-extrabold">Tax Information</h3>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">GSTIN</span>
                        <span className="font-mono font-bold">24AABCU9603R1ZM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">PAN</span>
                        <span className="font-mono font-bold">AABCU9603R</span>
                      </div>
                    </div>
                  </div>
                  <div className="card p-5 space-y-3">
                    <h3 className="font-extrabold">Team & Permissions</h3>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                      <div className="w-9 h-9 rounded-full bg-green-700 text-white flex items-center justify-center text-sm font-bold">
                        R
                      </div>
                      <div>
                        <div className="font-bold text-sm">Rajesh Patel</div>
                        <div className="text-xs text-gray-500">Owner · Full access</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                        V
                      </div>
                      <div>
                        <div className="font-bold text-sm">Vikram (Staff)</div>
                        <div className="text-xs text-gray-500">Orders & Inventory</div>
                      </div>
                    </div>
                    <button
                      onClick={() => toast('Invite team member')}
                      className="btn-soft !text-xs w-full"
                    >
                      <i className="fa-solid fa-plus mr-1"></i>Add Team Member
                    </button>
                  </div>
                </div>
              </div>
              <div className="card p-5 space-y-3">
                <h3 className="font-extrabold">Preferences</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked /> Email notifications for new orders
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked /> SMS alerts for low stock
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked /> Push notifications
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" /> Auto-accept orders under ₹500
                  </label>
                </div>
              </div>
              <button onClick={() => toast('Settings saved!')} className="btn-primary">
                Save All Settings
              </button>
            </section>
          )}
        </main>
      </div>

      {/* ═══════════════════════════════════════════ ADD PRODUCT MODAL ═══════════════════════════════════════════ */}
      {addProductModalOpen && (
        <div
          id="addProductModal"
          className="modal-backdrop"
          onClick={e => {
            if (e.target.id === 'addProductModal') setAddProductModalOpen(false);
          }}
        >
          <div className="modal-card">
            <div className="flex justify-between items-start mb-5">
              <h3 className="font-extrabold text-lg">Add New Product</h3>
              <button
                onClick={() => setAddProductModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500">Product Name *</label>
                <input
                  placeholder="e.g., Organic Turmeric 200g"
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500">Category *</label>
                  <select className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm">
                    <option>Select</option>
                    <option>Grocery</option>
                    <option>Fashion</option>
                    <option>Dairy</option>
                    <option>Spices</option>
                    <option>Personal Care</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">SKU / Barcode</label>
                  <input
                    placeholder="e.g., 8901001100123"
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500">Selling Price *</label>
                  <input
                    type="number"
                    placeholder="₹"
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">MRP</label>
                  <input
                    type="number"
                    placeholder="₹"
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">Cost Price</label>
                  <input
                    type="number"
                    placeholder="₹"
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500">Stock Quantity *</label>
                  <input
                    type="number"
                    placeholder="e.g., 100"
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">Unit</label>
                  <select className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm">
                    <option>pcs</option>
                    <option>kg</option>
                    <option>g</option>
                    <option>L</option>
                    <option>ml</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Description</label>
                <textarea
                  rows="3"
                  placeholder="Product details, ingredients, care instructions..."
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-green-500 resize-none"
                ></textarea>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Product Images</label>
                <div className="mt-1 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 transition">
                  <i className="fa-solid fa-cloud-arrow-up text-2xl text-gray-400 mb-2"></i>
                  <div className="text-sm text-gray-500">Click to upload images</div>
                  <div className="text-xs text-gray-400">PNG, JPG up to 5MB</div>
                </div>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800">
                <i className="fa-solid fa-info-circle mr-1"></i>
                Products will be submitted for admin approval before appearing on the customer app.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    toast('Product saved as draft');
                    setAddProductModalOpen(false);
                  }}
                  className="btn-soft flex-1"
                >
                  Save as Draft
                </button>
                <button
                  onClick={() => {
                    toast('Product submitted for approval');
                    setAddProductModalOpen(false);
                  }}
                  className="btn-primary flex-1"
                >
                  Submit for Approval
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
