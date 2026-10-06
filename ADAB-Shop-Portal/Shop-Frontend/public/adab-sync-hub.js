/**
 * ADAB Unified Data & Sync Hub (adab-sync-hub.js)
 * Provides real-time synchronization between Admin Portal, Seller Portal, and Customer App
 * using HTML5 localStorage and the storage event bus.
 */

(function (global) {
  const ADAB_KEYS = {
    SELLERS: 'adab_shared_sellers',
    CUSTOMERS: 'adab_shared_customers',
    PRODUCTS: 'adab_shared_products',
    APPROVALS: 'adab_shared_approvals',
    BANKS: 'adab_shared_banks',
    CREDIT_APPS: 'adab_shared_credit_apps',
    ORDERS: 'adab_shared_orders',
    AUDIT: 'adab_shared_audit',
    CURRENT_SELLER: 'adab_current_seller_session',
    CURRENT_CUSTOMER: 'adab_current_customer_session',
    CURRENT_ADMIN: 'adab_current_admin_session',
    LAST_SYNC: 'adab_last_sync_timestamp'
  };

  const DEFAULT_BANKS = [
    { id: 'b1', name: 'HDFC Bank', code: 'HDFC', type: 'Private Sector', minScore: 650, interestRate: '10.5% p.a.', maxShopLimit: '₹15,00,000', maxCustLimit: '₹1,50,000', tenor: '12-36 mos', active: true, logo: '🏦', partnerTag: 'Official Settlement Partner' },
    { id: 'b2', name: 'ICICI Bank SmartBusiness', code: 'ICICI', type: 'Private Sector', minScore: 680, interestRate: '11.0% p.a.', maxShopLimit: '₹20,00,000', maxCustLimit: '₹2,00,000', tenor: '6-48 mos', active: true, logo: '🏢', partnerTag: 'Instant BNPL Partner' },
    { id: 'b3', name: 'State Bank of India (SBI Mudra)', code: 'SBI', type: 'Public Sector', minScore: 600, interestRate: '8.5% p.a.', maxShopLimit: '₹10,00,000', maxCustLimit: '₹50,000', tenor: '12-60 mos', active: true, logo: '🏛️', partnerTag: 'Govt. Mudra Subsidized' },
    { id: 'b4', name: 'Axis Bank Kirana Plus', code: 'AXIS', type: 'Private Sector', minScore: 640, interestRate: '11.5% p.a.', maxShopLimit: '₹12,00,000', maxCustLimit: '₹1,00,000', tenor: '3-24 mos', active: true, logo: '🏪', partnerTag: '0% Interest 30d Window' },
    { id: 'b5', name: 'Kotak Mahindra Retail Credit', code: 'KOTAK', type: 'Private Sector', minScore: 700, interestRate: '12.0% p.a.', maxShopLimit: '₹25,00,000', maxCustLimit: '₹3,00,000', tenor: '12-36 mos', active: true, logo: '💳', partnerTag: 'Digital Line of Credit' }
  ];

  const DEFAULT_CREDIT_APPS = [
    { id: 'cr_101', applicantType: 'shop', applicantName: 'Shri Balaji Store', applicantPhone: '+91 98765 00001', bankId: 'b1', bankName: 'HDFC Bank', amount: 500000, tenor: '24 mos', purpose: 'Festival Inventory Stock-up', status: 'approved', submittedAt: '28 Sep 2026' },
    { id: 'cr_102', applicantType: 'customer', applicantName: 'Pooja Sharma', applicantPhone: '+91 98765 12340', bankId: 'b2', bankName: 'ICICI Bank SmartBusiness', amount: 50000, tenor: '6 mos', purpose: 'Home Essentials BNPL', status: 'approved', submittedAt: '29 Sep 2026' },
    { id: 'cr_103', applicantType: 'shop', applicantName: 'Vesu Grocery Hub', applicantPhone: '+91 98765 00002', bankId: 'b3', bankName: 'State Bank of India (SBI Mudra)', amount: 800000, tenor: '36 mos', purpose: 'Store Expansion & Cold Storage', status: 'pending', submittedAt: '01 Oct 2026' }
  ];

  const DEFAULT_SELLERS = [
    { id: 's1', shop: 'Shri Balaji Store', owner: 'Rajesh Patel', phone: '+91 98765 00001', email: 'balaji@example.com', gstin: '24AABCU9603R1ZM', zone: 'Vesu', products: 48, status: 'active', pass: 'seller123' },
    { id: 's2', shop: 'Vesu Grocery Hub', owner: 'Meena Shah', phone: '+91 98765 00002', email: 'vesu@example.com', gstin: '24AAFCV1234K1Z5', zone: 'Vesu', products: 32, status: 'active', pass: 'seller123' },
    { id: 's3', shop: 'Dairy Collective', owner: 'Amit Desai', phone: '+91 98765 00003', email: 'dairy@example.com', gstin: '24AABCD5678L1X2', zone: 'Adajan', products: 18, status: 'active', pass: 'seller123' },
    { id: 's4', shop: 'Spice Traders Co.', owner: 'Farhan Khan', phone: '+91 98765 00004', email: 'spice@example.com', gstin: '24AABCS9012M1Y3', zone: 'City Light', products: 24, status: 'active', pass: 'seller123' }
  ];

  const DEFAULT_CUSTOMERS = [
    { id: 'c1', name: 'Pooja Sharma', phone: '+91 98765 12340', email: 'pooja.sharma@example.com', city: 'Surat', orders: 14, status: 'active', pass: 'cust123' },
    { id: 'c2', name: 'Karan Mehta', phone: '+91 91234 56789', email: 'karan.mehta@example.com', city: 'Surat', orders: 6, status: 'active', pass: 'cust123' },
    { id: 'c3', name: 'Neha Gupta', phone: '+91 99887 76655', email: 'neha.g@example.com', city: 'Surat', orders: 0, status: 'pending', pass: 'cust123' },
    { id: 'c4', name: 'Rahul Joshi', phone: '+91 90909 80808', email: 'rahul.j@example.com', city: 'Surat', orders: 0, status: 'pending', pass: 'cust123' }
  ];

  const DEFAULT_PRODUCTS = [
    { id: 'p1', name: 'Tata Salt 1kg', shop: 'Shri Balaji Store', price: 28, type: 'Grocery', submitted: '28 Sep', status: 'live', stock: 50 },
    { id: 'p2', name: 'Balaji Silk Kurti', shop: 'Shri Balaji Store', price: 899, type: 'Fashion', submitted: '25 Sep', status: 'live', stock: 25 },
    { id: 'p3', name: 'Amul Taaza 1L', shop: 'Dairy Collective', price: 56, type: 'Dairy', submitted: '27 Sep', status: 'live', stock: 40 },
    { id: 'p4', name: 'Organic Turmeric 200g', shop: 'Spice Traders Co.', price: 145, type: 'Spices', submitted: '30 Sep', status: 'pending', approvalId: 'a5', stock: 30 },
    { id: 'p5', name: 'Handmade Diya Set (12pc)', shop: 'Shri Balaji Store', price: 199, type: 'Festive', submitted: '30 Sep', status: 'pending', approvalId: 'a6', stock: 15 },
    { id: 'p6', name: 'Premium Basmati 5kg', shop: 'Vesu Grocery Hub', price: 620, type: 'Grocery', submitted: '29 Sep', status: 'pending', approvalId: 'a7', stock: 20 },
    { id: 'p7', name: 'Fortune Oil 1L', shop: 'Vesu Grocery Hub', price: 142, type: 'Grocery', submitted: '29 Sep', status: 'live', stock: 35 }
  ];

  const DEFAULT_APPROVALS = [
    { id: 'a1', type: 'seller-reg', title: 'Fresh Mart Vesu', subtitle: 'Owner: Vikram Singh · GSTIN 24AABCF3344N1Z8', submitted: '30 Sep, 11:20', meta: { shop: 'Fresh Mart Vesu', owner: 'Vikram Singh', gstin: '24AABCF3344N1Z8', zone: 'Vesu', phone: '+91 98700 11223', email: 'freshmart@example.com', fssai: '22724000001234' } },
    { id: 'a2', type: 'seller-reg', title: 'Adajan Electronics', subtitle: 'Owner: Priya Nair · GSTIN 24AABCE7788P1W9', submitted: '29 Sep, 16:45', meta: { shop: 'Adajan Electronics', owner: 'Priya Nair', gstin: '24AABCE7788P1W9', zone: 'Adajan', phone: '+91 98250 33445', email: 'adajan.elec@example.com' } },
    { id: 'a3', type: 'customer-reg', title: 'Neha Gupta', subtitle: '+91 99887 76655 · Surat · Referral: ADAB100', submitted: '30 Sep, 09:10', meta: { name: 'Neha Gupta', phone: '+91 99887 76655', city: 'Surat', email: 'neha.g@email.com' } },
    { id: 'a4', type: 'customer-reg', title: 'Rahul Joshi', subtitle: '+91 90909 80808 · Surat', submitted: '30 Sep, 08:30', meta: { name: 'Rahul Joshi', phone: '+91 90909 80808', city: 'Surat', email: 'rahul.j@email.com' } },
    { id: 'a5', type: 'product', title: 'Organic Turmeric 200g', subtitle: 'Spice Traders Co. · ₹145 · Spices', submitted: '30 Sep, 10:05', meta: { productId: 'p4', name: 'Organic Turmeric 200g', shop: 'Spice Traders Co.', price: 145, type: 'Spices', desc: 'Stone-ground, FSSAI certified' } },
    { id: 'a6', type: 'product', title: 'Handmade Diya Set (12pc)', subtitle: 'Shri Balaji Store · ₹199 · Festive', submitted: '30 Sep, 10:18', meta: { productId: 'p5', name: 'Handmade Diya Set (12pc)', shop: 'Shri Balaji Store', price: 199, type: 'Festive', desc: 'Clay diyas, eco-friendly' } },
    { id: 'a7', type: 'product', title: 'Premium Basmati 5kg', subtitle: 'Vesu Grocery Hub · ₹620 · Grocery', submitted: '29 Sep, 14:22', meta: { productId: 'p6', name: 'Premium Basmati 5kg', shop: 'Vesu Grocery Hub', price: 620, type: 'Grocery', desc: 'Aged basmati, export quality' } }
  ];

  const DEFAULT_AUDIT = [
    { t: 'Today 10:42', msg: 'System seeded demo approval queue & shared real-time engine' },
    { t: 'Today 09:15', msg: 'Shri Balaji Store — live inventory synced' }
  ];

  function getStorage(key, defaultVal) {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      return JSON.parse(data);
    } catch (e) {
      console.warn('SyncHub storage parse error:', e);
      return defaultVal;
    }
  }

  function setStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      localStorage.setItem(ADAB_KEYS.LAST_SYNC, Date.now().toString());
    } catch (e) {
      console.error('SyncHub setStorage error:', e);
    }
  }

  const AdabSync = {
    keys: ADAB_KEYS,

    // Initialize collections if empty
    init: function () {
      getStorage(ADAB_KEYS.SELLERS, DEFAULT_SELLERS);
      getStorage(ADAB_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
      getStorage(ADAB_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
      getStorage(ADAB_KEYS.APPROVALS, DEFAULT_APPROVALS);
      getStorage(ADAB_KEYS.BANKS, DEFAULT_BANKS);
      getStorage(ADAB_KEYS.CREDIT_APPS, DEFAULT_CREDIT_APPS);
      getStorage(ADAB_KEYS.AUDIT, DEFAULT_AUDIT);
    },

    // Subscriptions
    listeners: [],
    subscribe: function (fn) {
      this.listeners.push(fn);
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('adab_')) {
          fn(e.key, e.newValue);
        }
      });
    },
    notifyAll: function (key, data) {
      this.listeners.forEach(fn => {
        try { fn(key, data); } catch (e) { console.error(e); }
      });
    },

    // Sellers
    getSellers: function () { 
      const list = getStorage(ADAB_KEYS.SELLERS, DEFAULT_SELLERS);
      return list.map(s => ({
        ...s,
        shop: s.shop || s.name || 'Store',
        name: s.name || s.shop || 'Store'
      }));
    },
    saveSellers: function (sellers) { setStorage(ADAB_KEYS.SELLERS, sellers); this.notifyAll(ADAB_KEYS.SELLERS, sellers); },
    getSellerRegistrations: function () {
      const approvals = this.getApprovals();
      const sellers = this.getSellers();
      const list = [];
      // Active sellers
      sellers.forEach(s => {
        list.push({
          id: s.id || ('s_' + (s.phone || '0')),
          name: s.name || s.shop || 'Store',
          owner: s.owner || 'Merchant Partner',
          phone: s.phone || '',
          gstin: s.gstin || '24AAACT1234A1Z5',
          category: s.category || 'Grocery & FMCG',
          zone: s.zone || '10 km',
          status: 'approved',
          submittedAt: 'Approved & Live'
        });
      });
      // Pending/rejected approvals
      approvals.filter(a => a.type === 'seller-reg').forEach(a => {
        const meta = a.meta || {};
        list.push({
          id: a.id,
          name: meta.shop || meta.name || a.title,
          owner: meta.owner || 'Partner',
          phone: meta.phone || '',
          gstin: meta.gstin || 'Pending',
          category: meta.category || 'Grocery & FMCG',
          zone: meta.zone || '10 km',
          status: a.status || 'pending',
          submittedAt: a.submitted || 'Today'
        });
      });
      return list;
    },
    addSellerRegistration: function (sellerData) {
      const approvals = this.getApprovals();
      const newApId = 'a_sel_' + Date.now();
      const shopName = sellerData.shop || sellerData.name || 'New Store';
      const item = {
        id: newApId,
        type: 'seller-reg',
        title: shopName,
        subtitle: `Owner: ${sellerData.owner || 'Partner'} · GSTIN ${sellerData.gstin || 'Pending'}`,
        submitted: 'Just now',
        status: 'pending',
        meta: {
          shop: shopName,
          name: shopName,
          owner: sellerData.owner,
          gstin: sellerData.gstin || 'N/A',
          zone: sellerData.zone || 'Vesu',
          phone: sellerData.phone || '',
          email: sellerData.email || '',
          pass: sellerData.pass || 'seller123',
          fssai: sellerData.fssai || ''
        }
      };
      approvals.unshift(item);
      this.saveApprovals(approvals);
      this.addAudit(`Seller Registration submitted for review: "${shopName}"`);
      return { id: newApId, name: shopName, ...sellerData };
    },

    // Customers
    getCustomers: function () { return getStorage(ADAB_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS); },
    saveCustomers: function (customers) { setStorage(ADAB_KEYS.CUSTOMERS, customers); this.notifyAll(ADAB_KEYS.CUSTOMERS, customers); },
    addCustomerRegistration: function (custData) {
      const approvals = this.getApprovals();
      const customers = this.getCustomers();
      const newApId = 'a_cust_' + Date.now();
      const item = {
        id: newApId,
        type: 'customer-reg',
        title: custData.name,
        subtitle: `${custData.phone} · ${custData.city || 'Surat'}`,
        submitted: 'Just now',
        meta: {
          name: custData.name,
          phone: custData.phone,
          city: custData.city || 'Surat',
          email: custData.email || '',
          pass: custData.pass || 'cust123'
        }
      };
      approvals.unshift(item);
      this.saveApprovals(approvals);

      // Also track in pending customers table
      customers.unshift({
        id: 'c_' + Date.now(),
        name: custData.name,
        phone: custData.phone,
        email: custData.email || '',
        city: custData.city || 'Surat',
        orders: 0,
        status: 'pending',
        pass: custData.pass || 'cust123'
      });
      this.saveCustomers(customers);
      this.addAudit(`Customer Sign-up submitted for review: "${custData.name}"`);
      return item;
    },

    // Products
    getProducts: function () { return getStorage(ADAB_KEYS.PRODUCTS, DEFAULT_PRODUCTS); },
    saveProducts: function (products) { setStorage(ADAB_KEYS.PRODUCTS, products); this.notifyAll(ADAB_KEYS.PRODUCTS, products); },
    addProductForApproval: function (prodData, shopName) {
      const approvals = this.getApprovals();
      const products = this.getProducts();
      const newApId = 'a_prod_' + Date.now();
      const newProdId = 'p_' + Date.now();

      const apItem = {
        id: newApId,
        type: 'product',
        title: prodData.name,
        subtitle: `${shopName || 'Store'} · ₹${prodData.price} · ${prodData.type || 'General'}`,
        submitted: 'Just now',
        meta: {
          productId: newProdId,
          name: prodData.name,
          shop: shopName || 'Shri Balaji Store',
          price: prodData.price,
          type: prodData.type || 'General',
          stock: prodData.stock || 50,
          desc: prodData.desc || 'New product added by store'
        }
      };
      approvals.unshift(apItem);
      this.saveApprovals(approvals);

      // Add to store products catalog as pending
      products.unshift({
        id: newProdId,
        name: prodData.name,
        shop: shopName || 'Shri Balaji Store',
        price: parseFloat(prodData.price) || 0,
        type: prodData.type || 'General',
        submitted: 'Just now',
        status: 'pending',
        approvalId: newApId,
        stock: parseInt(prodData.stock, 10) || 50
      });
      this.saveProducts(products);
      this.addAudit(`New product submitted for approval: "${prodData.name}" by ${shopName || 'Shri Balaji Store'}`);
      return { approval: apItem, product: products[0] };
    },

    // Approvals
    getApprovals: function () { return getStorage(ADAB_KEYS.APPROVALS, DEFAULT_APPROVALS); },
    saveApprovals: function (approvals) { setStorage(ADAB_KEYS.APPROVALS, approvals); this.notifyAll(ADAB_KEYS.APPROVALS, approvals); },
    approveItem: function (approvalId) {
      const approvals = this.getApprovals();
      const idx = approvals.findIndex(a => a.id === approvalId);
      if (idx === -1) return null;
      const a = approvals[idx];

      if (a.type === 'seller-reg') {
        const sellers = this.getSellers();
        sellers.unshift({
          id: 's_' + Date.now(),
          shop: a.meta.shop,
          owner: a.meta.owner,
          phone: a.meta.phone || '',
          email: a.meta.email || '',
          gstin: a.meta.gstin,
          zone: a.meta.zone || 'Vesu',
          products: 0,
          status: 'active',
          pass: a.meta.pass || 'seller123'
        });
        this.saveSellers(sellers);
        this.addAudit(`Admin Approved seller shop: "${a.meta.shop}" (Owner: ${a.meta.owner})`);
      } else if (a.type === 'customer-reg') {
        const customers = this.getCustomers();
        const c = customers.find(x => x.name === a.meta.name || x.phone === a.meta.phone);
        if (c) {
          c.status = 'active';
        } else {
          customers.unshift({
            id: 'c_' + Date.now(),
            name: a.meta.name,
            phone: a.meta.phone,
            email: a.meta.email || '',
            city: a.meta.city || 'Surat',
            orders: 0,
            status: 'active',
            pass: a.meta.pass || 'cust123'
          });
        }
        this.saveCustomers(customers);
        this.addAudit(`Admin Approved customer account: "${a.meta.name}"`);
      } else if (a.type === 'product') {
        const products = this.getProducts();
        const p = products.find(x => x.id === a.meta.productId || x.name === a.meta.name);
        if (p) {
          p.status = 'live';
          delete p.approvalId;
        } else {
          products.unshift({
            id: a.meta.productId || ('p_' + Date.now()),
            name: a.meta.name,
            shop: a.meta.shop,
            price: a.meta.price,
            type: a.meta.type,
            submitted: 'Just now',
            status: 'live',
            stock: a.meta.stock || 50
          });
        }
        this.saveProducts(products);
        this.addAudit(`Admin Approved product: "${a.meta.name}" from ${a.meta.shop} — now Live for Customers`);
      }

      approvals.splice(idx, 1);
      this.saveApprovals(approvals);
      return a;
    },

    rejectItem: function (approvalId, reason) {
      const approvals = this.getApprovals();
      const idx = approvals.findIndex(a => a.id === approvalId);
      if (idx === -1) return null;
      const a = approvals[idx];

      if (a.type === 'customer-reg') {
        const customers = this.getCustomers();
        const c = customers.find(x => x.name === a.meta.name || x.phone === a.meta.phone);
        if (c) c.status = 'rejected';
        this.saveCustomers(customers);
      } else if (a.type === 'product') {
        const products = this.getProducts();
        const p = products.find(x => x.id === a.meta.productId || x.name === a.meta.name);
        if (p) p.status = 'rejected';
        this.saveProducts(products);
      }

      this.addAudit(`Admin Rejected ${a.type}: "${a.title}" ${reason ? `(Reason: ${reason})` : ''}`);
      approvals.splice(idx, 1);
      this.saveApprovals(approvals);
      return a;
    },

    // Banking & Financial Partners
    getBanks: function () { return getStorage(ADAB_KEYS.BANKS, DEFAULT_BANKS); },
    saveBanks: function (banks) { setStorage(ADAB_KEYS.BANKS, banks); this.notifyAll(ADAB_KEYS.BANKS, banks); },
    addBank: function (bankData) {
      const banks = this.getBanks();
      const newBank = {
        id: 'b_' + Date.now(),
        name: bankData.name,
        code: bankData.code || bankData.name.split(' ').map(w=>w[0]).join('').toUpperCase(),
        type: bankData.type || 'Private Sector',
        minScore: parseInt(bankData.minScore, 10) || 650,
        interestRate: bankData.interestRate || '10.5% p.a.',
        maxShopLimit: bankData.maxShopLimit || '₹10,00,000',
        maxCustLimit: bankData.maxCustLimit || '₹1,00,000',
        tenor: bankData.tenor || '12-36 mos',
        active: true,
        logo: bankData.logo || '🏦',
        partnerTag: bankData.partnerTag || 'Approved Partner'
      };
      banks.unshift(newBank);
      this.saveBanks(banks);
      this.addAudit(`Admin onboarded new Banking & Credit Partner: "${newBank.name}" (${newBank.partnerTag})`);
      return newBank;
    },
    toggleBankStatus: function (bankId) {
      const banks = this.getBanks();
      const b = banks.find(x => x.id === bankId);
      if (b) {
        b.active = !b.active;
        this.saveBanks(banks);
        this.addAudit(`Admin ${b.active ? 'Activated' : 'Paused'} Bank Partner: "${b.name}"`);
        return b;
      }
      return null;
    },

    // Credit Applications (from Shops and Customers)
    getCreditApps: function () { return getStorage(ADAB_KEYS.CREDIT_APPS, DEFAULT_CREDIT_APPS); },
    saveCreditApps: function (apps) { setStorage(ADAB_KEYS.CREDIT_APPS, apps); this.notifyAll(ADAB_KEYS.CREDIT_APPS, apps); },
    submitCreditApplication: function (appData) {
      const apps = this.getCreditApps();
      const newApp = {
        id: 'cr_' + Date.now(),
        applicantType: appData.applicantType || 'shop', // 'shop' or 'customer'
        applicantName: appData.applicantName || 'Applicant',
        applicantPhone: appData.applicantPhone || '',
        bankId: appData.bankId || '',
        bankName: appData.bankName || 'Partner Bank',
        amount: parseInt(appData.amount, 10) || 100000,
        tenor: appData.tenor || '12 mos',
        purpose: appData.purpose || 'Working Capital & Inventory',
        status: 'pending', // 'pending', 'approved', 'rejected'
        submittedAt: 'Today ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      apps.unshift(newApp);
      this.saveCreditApps(apps);

      // Add to audit & approvals
      this.addAudit(`Credit Application #${newApp.id.slice(-4)} submitted for ₹${newApp.amount.toLocaleString('en-IN')} via ${newApp.bankName} by ${newApp.applicantType.toUpperCase()}: "${newApp.applicantName}"`);
      return newApp;
    },
    updateCreditAppStatus: function (appId, status, note) {
      const apps = this.getCreditApps();
      const app = apps.find(x => x.id === appId);
      if (app) {
        app.status = status;
        if (note) app.adminNote = note;
        this.saveCreditApps(apps);
        this.addAudit(`Credit Application #${app.id.slice(-4)} (${app.applicantName}) updated to: ${status.toUpperCase()}`);
        return app;
      }
      return null;
    },

    // Audit logs
    getAudit: function () { return getStorage(ADAB_KEYS.AUDIT, DEFAULT_AUDIT); },
    addAudit: function (msg) {
      const entries = this.getAudit();
      const now = new Date();
      const t = 'Today ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      entries.unshift({ t, msg });
      if (entries.length > 50) entries.pop();
      setStorage(ADAB_KEYS.AUDIT, entries);
      this.notifyAll(ADAB_KEYS.AUDIT, entries);
    },

    // Session & Auth Helpers
    getSession: function (role) {
      const key = role === 'seller' ? ADAB_KEYS.CURRENT_SELLER : role === 'customer' ? ADAB_KEYS.CURRENT_CUSTOMER : ADAB_KEYS.CURRENT_ADMIN;
      return getStorage(key, null);
    },
    setSession: function (role, userObj) {
      const key = role === 'seller' ? ADAB_KEYS.CURRENT_SELLER : role === 'customer' ? ADAB_KEYS.CURRENT_CUSTOMER : ADAB_KEYS.CURRENT_ADMIN;
      setStorage(key, userObj);
      this.notifyAll(key, userObj);
    },
    clearSession: function (role) {
      const key = role === 'seller' ? ADAB_KEYS.CURRENT_SELLER : role === 'customer' ? ADAB_KEYS.CURRENT_CUSTOMER : ADAB_KEYS.CURRENT_ADMIN;
      localStorage.removeItem(key);
      this.notifyAll(key, null);
    }
  };

  AdabSync.init();
  global.AdabSync = AdabSync;
})(window);
