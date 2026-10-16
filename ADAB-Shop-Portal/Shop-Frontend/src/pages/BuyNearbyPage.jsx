import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { sellerApi } from '../api/sellerApi';
import { useSeller } from '../context/SellerContext';

export default function BuyNearbyPage() {
  const navigate = useNavigate();
  const { store } = useSeller();

  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'orders'
  const [viewMode, setViewMode] = useState('products'); // 'products' | 'stores' | 'map'
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [orders, setOrders] = useState([]);
  const [creditInfo, setCreditInfo] = useState({ available_amount: 0, total_limit: 0, utilized_amount: 0 });
  const [loading, setLoading] = useState(true);

  // Leaflet Map Refs & Selection
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const storeMarkersRef = useRef({});
  const [selectedMapStore, setSelectedMapStore] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistance, setSelectedDistance] = useState('all');
  const [selectedCat, setSelectedCat] = useState('all');
  const [storeFilter, setStoreFilter] = useState(null); // Filter products by specific store

  // Amazon-style Product Detail Modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailQty, setDetailQty] = useState(1);

  // Cart count & feedback
  const [toastMessage, setToastMessage] = useState('');
  const [cartCount, setCartCount] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('adab_buy_cart') || '[]');
      return Array.isArray(saved) ? saved.length : 0;
    } catch (e) {
      return 0;
    }
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, storeRes, creditRes, orderRes] = await Promise.allSettled([
        sellerApi.getNearbyCatalog(),
        sellerApi.getNearbyStores(),
        sellerApi.getBuyerCreditBalance(),
        sellerApi.getPurchaseOrders({ type: 'restock' })
      ]);

      let loadedProducts = [];
      if (catRes.status === 'fulfilled') {
        const raw = catRes.value?.data !== undefined ? catRes.value.data : catRes.value;
        loadedProducts = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setProducts(loadedProducts);
      } else {
        setProducts([]);
      }

      let loadedStores = [];
      if (storeRes.status === 'fulfilled') {
        const raw = storeRes.value?.data !== undefined ? storeRes.value.data : storeRes.value;
        loadedStores = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setStores(loadedStores);
      } else {
        setStores([]);
      }

      // If no products have been listed yet, but partner stores exist in the database,
      // default the view to 'stores' so user immediately sees registered partner shops
      if (loadedProducts.length === 0 && loadedStores.length > 0) {
        setViewMode('stores');
      }

      if (creditRes.status === 'fulfilled') {
        const raw = creditRes.value?.data !== undefined ? creditRes.value.data : creditRes.value;
        const info = raw?.data || raw || {};
        setCreditInfo({
          available_amount: Number(info.available_amount || 0),
          total_limit: Number(info.total_limit || 0),
          utilized_amount: Number(info.utilized_amount || 0)
        });
      }

      if (orderRes.status === 'fulfilled') {
        const raw = orderRes.value?.data !== undefined ? orderRes.value.data : orderRes.value;
        const allOrders = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        // Strictly filter to wholesale grocery restock purchase orders (PO-B2B-...), never Own Brand resale requests (REQ-B2B-...)
        setOrders(allOrders.filter((po) => !po.po_number || po.po_number.startsWith('PO-B2B-') || !po.po_number.startsWith('REQ-B2B-')));
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Failed to load nearby data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleCartSync = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('adab_buy_cart') || '[]');
        setCartCount(Array.isArray(saved) ? saved.length : 0);
      } catch (e) {
        setCartCount(0);
      }
    };
    window.addEventListener('adab-cart-updated', handleCartSync);
    return () => window.removeEventListener('adab-cart-updated', handleCartSync);
  }, []);

  // When opening product detail modal, reset quantity to MOQ
  const openProductDetail = (product) => {
    setSelectedProduct(product);
    setDetailQty(Number(product.min_order || 1));
  };

  const handleAddToCart = (item, customQty = null) => {
    try {
      const currentCart = JSON.parse(localStorage.getItem('adab_buy_cart') || '[]');
      const existingIndex = currentCart.findIndex((c) => c.id === item.id);
      const addQty = customQty !== null ? Number(customQty) : Number(item.min_order || 1);

      if (existingIndex >= 0) {
        currentCart[existingIndex].quantity = (Number(currentCart[existingIndex].quantity) || 1) + addQty;
      } else {
        currentCart.push({
          id: item.id,
          name: item.name,
          image_url: item.image_url || null,
          price: Number(item.price || item.mrp || 0),
          mrp: Number(item.mrp || 0),
          store_id: item.store_id,
          store_name: item.store_name,
          distance_km: item.distance_km,
          unit: item.unit || 'unit',
          min_order: Number(item.min_order || 1),
          quantity: addQty,
          credit_allowed: item.credit_allowed,
          credit_days: item.credit_days,
          delivery_options: item.delivery_options || []
        });
      }

      localStorage.setItem('adab_buy_cart', JSON.stringify(currentCart));
      window.dispatchEvent(new Event('adab-cart-updated'));
      showToast(`Added ${addQty}x ${item.name} to Purchase Cart`);
    } catch (e) {
      console.error('Cart add error:', e);
    }
  };

  const handleBuyNow = (item, customQty = null) => {
    handleAddToCart(item, customQty);
    navigate('/buycart');
  };

  const handleReorder = (order) => {
    if (!order.items || order.items.length === 0) return;
    try {
      const currentCart = JSON.parse(localStorage.getItem('adab_buy_cart') || '[]');
      for (const it of order.items) {
        const existingIdx = currentCart.findIndex((c) => c.id === it.listing_id);
        const qty = Number(it.quantity || 1);
        if (existingIdx >= 0) {
          currentCart[existingIdx].quantity += qty;
        } else {
          currentCart.push({
            id: it.listing_id,
            name: it.item_name,
            price: Number(it.price || 0),
            mrp: Number(it.price || 0),
            store_id: order.supplier_store_id,
            store_name: order.supplier_name,
            unit: it.unit || 'unit',
            min_order: 1,
            quantity: qty
          });
        }
      }
      localStorage.setItem('adab_buy_cart', JSON.stringify(currentCart));
      window.dispatchEvent(new Event('adab-cart-updated'));
      navigate('/buycart');
    } catch (e) {
      console.error('Re-order error:', e);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.store_name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.brand_tag || '').toLowerCase().includes(q);

    const matchCat = selectedCat === 'all' || (p.category || '').toLowerCase().includes(selectedCat.toLowerCase());

    const dist = Number(p.distance_km || 0);
    const matchDist = selectedDistance === 'all' || dist <= Number(selectedDistance);

    const matchStore = !storeFilter || p.store_id === storeFilter;

    return matchSearch && matchCat && matchDist && matchStore;
  });

  // Filtered Stores
  const filteredStores = stores.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (s.store_name || '').toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q);

    const matchCat = selectedCat === 'all' || (s.category || '').toLowerCase().includes(selectedCat.toLowerCase());

    const dist = Number(s.distance_km || 0);
    const matchDist = selectedDistance === 'all' || dist <= Number(selectedDistance);

    return matchSearch && matchCat && matchDist;
  });

  // Extract distinct categories
  const categoriesList = Array.from(
    new Set(
      products
        .map((p) => p.category)
        .filter(Boolean)
        .concat(['Grocery', 'FMCG', 'Dairy', 'Spices', 'Snacks', 'Clothing'])
    )
  );

  // Initialize and sync Leaflet Map in Map View
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;

    const leaflet = typeof window !== 'undefined' ? window.L || L : null;
    if (!leaflet || !leaflet.map) return;

    const rawLat = store?.latitude ? Number(store.latitude) : null;
    const rawLng = store?.longitude ? Number(store.longitude) : null;
    const buyerLat = Number.isFinite(rawLat) && rawLat !== 0 ? rawLat : 23.0181;
    const buyerLng = Number.isFinite(rawLng) && rawLng !== 0 ? rawLng : 72.5901;

    // Reset container if previous instance exists
    if (mapContainerRef.current._leaflet_id) {
      delete mapContainerRef.current._leaflet_id;
    }
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (_) {}
      mapInstanceRef.current = null;
    }

    const map = leaflet
      .map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      })
      .setView([buyerLat, buyerLng], 12);

    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      })
      .addTo(map);

    // Delivery radius circle around buyer store
    const radiusKm = selectedDistance === 'all' ? 15 : Number(selectedDistance);
    leaflet
      .circle([buyerLat, buyerLng], {
        radius: radiusKm * 1000,
        color: '#059669',
        fillColor: '#10B981',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6 6'
      })
      .addTo(map);

    // Marker for Buyer's own store
    const buyerIcon = leaflet.divIcon({
      className: 'border-0 bg-transparent',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -19],
      html: `
        <div style="position:relative;width:38px;height:38px;">
          <div style="position:absolute;inset:0;background:#10B981;opacity:0.3;border-radius:50%;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="width:38px;height:38px;background:#059669;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(5,150,105,0.45);border:2.5px solid white;">
            <i class="fa-solid fa-house-chimney"></i>
          </div>
        </div>
      `
    });

    leaflet
      .marker([buyerLat, buyerLng], { icon: buyerIcon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:inherit;padding:2px 4px;">
          <span style="display:inline-block;padding:2px 8px;background:#D1FAE5;color:#065F46;border-radius:6px;font-size:10px;font-weight:800;text-transform:uppercase;margin-bottom:4px;">
            Your Kirana Store (Base)
          </span>
          <div style="font-size:14px;font-weight:800;color:#111827;">${store?.store_name || 'My Kirana Store'}</div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px;">${store?.city || 'Local Location'} • Coverage: <b>${radiusKm} km</b> radius</div>
        </div>`
      );

    const bounds = [[buyerLat, buyerLng]];
    storeMarkersRef.current = {};

    filteredStores.forEach((s, idx) => {
      let lat = Number(s.latitude);
      let lng = Number(s.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0) {
        lat = buyerLat + (idx % 2 === 0 ? 0.02 * (idx + 1) : -0.02 * (idx + 1));
        lng = buyerLng + (idx % 3 === 0 ? 0.02 * (idx + 1) : -0.02 * (idx + 1));
      }

      bounds.push([lat, lng]);

      const isStoreOnline = s.is_online === true || s.is_online === 'true';
      const storePinIcon = leaflet.divIcon({
        className: 'border-0 bg-transparent',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -19],
        html: `
          <div style="position:relative;width:38px;height:38px;cursor:pointer;">
            <div style="width:38px;height:38px;background:#4338CA;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 14px rgba(67,56,202,0.45);border:2.5px solid white;">
              <i class="fa-solid fa-store"></i>
            </div>
            <span style="position:absolute;top:-2px;right:-2px;width:12px;height:12px;border-radius:50%;background:${
              isStoreOnline ? '#10B981' : '#9CA3AF'
            };border:2.5px solid white;"></span>
          </div>
        `
      });

      const popupHtml = `
        <div style="font-family:inherit;min-width:220px;padding:4px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:800;padding:2px 7px;border-radius:6px;background:${
              isStoreOnline ? '#ECFDF5' : '#F3F4F6'
            };color:${isStoreOnline ? '#065F46' : '#4B5563'};">
              ${isStoreOnline ? '● Online Now' : '○ Offline'}
            </span>
            <span style="font-size:11px;font-weight:700;color:#4338CA;">
              ${s.distance_km || 3} km away
            </span>
          </div>
          <div style="font-size:15px;font-weight:900;color:#111827;line-height:1.2;">${s.store_name}</div>
          <div style="font-size:11px;color:#6B7280;margin:4px 0 8px;">
            <i class="fa-solid fa-location-dot" style="margin-right:4px;color:#9CA3AF;"></i>
            ${s.address_line ? s.address_line + ', ' : ''}${s.city || ''}
          </div>
          <div style="background:#F9FAFB;border-radius:10px;padding:8px;margin-bottom:10px;font-size:11px;border:1px solid #E5E7EB;display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            <div>
              <div style="color:#6B7280;font-size:10px;">Wholesale Catalog</div>
              <strong style="color:#059669;font-size:12px;">${s.active_listings_count || 0} Products</strong>
            </div>
            <div>
              <div style="color:#6B7280;font-size:10px;">Credit Terms</div>
              <strong style="color:#6B21A8;font-size:12px;">${
                s.credit_allowed ? (s.credit_days || 14) + ' Days Net' : 'Instant'
              }</strong>
            </div>
          </div>
          <button
            type="button"
            id="btn-map-browse-${s.id}"
            style="width:100%;padding:9px 12px;background:#059669;color:white;border:none;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 2px 6px rgba(5,150,105,0.3);"
          >
            <i class="fa-solid fa-boxes-stacked"></i>
            <span>Browse Products (${s.active_listings_count || 0})</span>
            <span>→</span>
          </button>
        </div>
      `;

      const marker = leaflet
        .marker([lat, lng], { icon: storePinIcon })
        .addTo(map)
        .bindPopup(popupHtml);

      marker.on('click', () => {
        setSelectedMapStore(s);
      });

      marker.on('popupopen', () => {
        setSelectedMapStore(s);
        const btn = document.getElementById(`btn-map-browse-${s.id}`);
        if (btn) {
          btn.onclick = () => {
            setStoreFilter(s.id);
            setViewMode('products');
            window.scrollTo({ top: 300, behavior: 'smooth' });
          };
        }
      });

      storeMarkersRef.current[s.id] = { marker, lat, lng };
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }

    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, [viewMode, filteredStores, store, selectedDistance]);

  const focusStoreOnMap = (s) => {
    setSelectedMapStore(s);
    if (!mapInstanceRef.current) return;
    const item = storeMarkersRef.current[s.id];
    if (item) {
      mapInstanceRef.current.flyTo([item.lat, item.lng], 14, { duration: 0.8 });
      item.marker.openPopup();
    }
  };

  return (
    <section id="sec-buy" className="space-y-5 fade-in max-w-7xl mx-auto pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-gray-950 text-white px-4 py-2.5 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2 animate-bounce border border-gray-700">
          <i className="fa-solid fa-circle-check text-emerald-400"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* AMAZON-STYLE PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-scale-up relative border border-gray-200 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition flex items-center justify-center text-base"
              title="Close (Esc)"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            {/* Breadcrumb Header */}
            <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
              <span>Catalog</span>
              <span>/</span>
              <span className="text-emerald-700 font-bold">{selectedProduct.category || 'General FMCG'}</span>
              <span>/</span>
              <span className="truncate max-w-[200px] text-gray-600">{selectedProduct.name}</span>
            </div>

            {/* Amazon-style 2-Column Split */}
            <div className="grid md:grid-cols-2 gap-6 items-start">
              {/* Left Column: Image & Badges */}
              <div className="space-y-4">
                <div className="w-full aspect-square bg-gradient-to-br from-gray-50 to-emerald-50/30 rounded-2xl border border-gray-200 flex flex-col items-center justify-center p-4 text-center shadow-inner relative overflow-hidden group">
                  {selectedProduct.image_url ? (
                    <img
                      src={selectedProduct.image_url}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain p-2 hover:scale-105 transition duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`flex flex-col items-center justify-center text-gray-400 ${
                      selectedProduct.image_url ? 'hidden' : 'flex'
                    }`}
                  >
                    <div className="w-24 h-24 rounded-2xl bg-white shadow-md flex items-center justify-center text-emerald-600 text-5xl mb-2">
                      <i className="fa-solid fa-box-open"></i>
                    </div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
                      In-Stock Item
                    </div>
                  </div>

                  {selectedProduct.brand_tag && (
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-sm">
                      {selectedProduct.brand_tag}
                    </span>
                  )}
                  <span className="absolute bottom-3 right-3 text-[10px] font-mono text-gray-400 bg-white/80 px-2 py-0.5 rounded border border-gray-200">
                    ID: {selectedProduct.id.slice(0, 8)}
                  </span>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                    <i className="fa-solid fa-shield-halved text-emerald-600 text-sm"></i>
                    <span>Verified Merchant Stock</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                    <i className="fa-solid fa-truck-fast text-blue-600 text-sm"></i>
                    <span>Porter Logistics Delivery</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Details, Pricing, Supplier & Purchase */}
              <div className="space-y-4">
                <div>
                  {selectedProduct.brand_tag && (
                    <div className="text-xs font-black text-emerald-700 uppercase tracking-wide">
                      Brand: {selectedProduct.brand_tag}
                    </div>
                  )}
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                    {selectedProduct.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-xs text-amber-500 font-bold">
                    <span>★★★★★</span>
                    <span className="text-gray-700">4.9</span>
                    <span className="text-gray-400">· 38 Kirana Restock Reviews</span>
                  </div>
                </div>

                {/* Price Box */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5">
                  <div className="text-xs text-emerald-900 font-bold uppercase tracking-wider">
                    Price
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-emerald-800">
                      ₹{Number(selectedProduct.price || 0).toLocaleString('en-IN')}
                    </span>
                    {selectedProduct.mrp && Number(selectedProduct.mrp) > Number(selectedProduct.price) && (
                      <span className="text-sm text-gray-400 line-through">
                        MRP ₹{Number(selectedProduct.mrp).toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 font-medium">/ {selectedProduct.unit || 'unit'}</span>
                  </div>

                  {selectedProduct.mrp && Number(selectedProduct.mrp) > Number(selectedProduct.price) && (
                    <div className="inline-block px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-black">
                      Save ₹{(Number(selectedProduct.mrp) - Number(selectedProduct.price)).toFixed(0)} per unit (
                      {Math.round(
                        ((Number(selectedProduct.mrp) - Number(selectedProduct.price)) /
                          Number(selectedProduct.mrp)) *
                          100
                      )}
                      % Retail Margin)
                    </div>
                  )}
                </div>

                {/* Specs Table */}
                <div className="text-xs space-y-1.5 border-y border-gray-100 py-3 text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Minimum Order Quantity (MOQ):</span>
                    <span className="font-bold text-gray-900">
                      {selectedProduct.min_order || 1} {selectedProduct.unit || 'units'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Inventory Status:</span>
                    <span className="font-bold text-emerald-700">
                      ● In Stock ({selectedProduct.stock_qty || 99} units at supplier hub)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fulfillment Zone:</span>
                    <span className="font-bold text-gray-900">
                      {selectedProduct.delivery_options?.[0]?.zone_name || 'Porter / Express Van (<15 km)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Credit Policy:</span>
                    <span className="font-bold text-purple-800">
                      {selectedProduct.credit_allowed
                        ? `${selectedProduct.credit_days || 14} Days Zero-Interest Net Credit`
                        : 'Cash / Instant UPI'}
                    </span>
                  </div>
                </div>

                {/* Supplier Store Info Card */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
                      <i className="fa-solid fa-store"></i>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-xs sm:text-sm">
                        {selectedProduct.store_name}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {selectedProduct.store_city || 'Local Area'} · {selectedProduct.distance_km || 3} km away
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                    ● Online
                  </span>
                </div>

                {/* Quantity Selector & Dynamic Total */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center border border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setDetailQty((prev) =>
                          Math.max(Number(selectedProduct.min_order || 1), prev - 1)
                        )
                      }
                      className="px-3.5 py-2 text-gray-700 hover:bg-gray-200 font-bold transition"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 font-black text-sm text-gray-900 min-w-[36px] text-center bg-white">
                      {detailQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailQty((prev) => prev + 1)}
                      className="px-3.5 py-2 text-gray-700 hover:bg-gray-200 font-bold transition"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-gray-400 font-semibold">Total Order Value:</div>
                    <div className="text-lg font-black text-gray-900">
                      ₹{(detailQty * Number(selectedProduct.price || 0)).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleAddToCart(selectedProduct, detailQty);
                      setSelectedProduct(null);
                    }}
                    className="btn-soft flex-1 !py-3 !text-xs sm:!text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-cart-plus text-emerald-700"></i>
                    <span>Add to Purchase Cart</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleBuyNow(selectedProduct, detailQty);
                      setSelectedProduct(null);
                    }}
                    className="btn-primary flex-1 !py-3 !text-xs sm:!text-sm font-black flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-bolt"></i>
                    <span>Buy Now →</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header & Live Balances */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">Nearby Kiranas &amp; Restock</h1>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wide">
              B2B Wholesale
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Restock directly from partner kiranas within your local delivery radius · or use{' '}
            <Link to="/mastersearch" className="text-blue-700 font-bold hover:underline">
              Search &amp; Buy
            </Link>{' '}
            nationwide.
          </p>
        </div>

        {/* Real Live Database Credit Balance */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-950 font-black border border-purple-200 flex items-center gap-2 shadow-sm">
            <i className="fa-solid fa-building-columns text-purple-700 text-sm"></i>
            <div>
              <div className="text-[10px] text-purple-700 font-bold uppercase leading-none">Restock Credit Line</div>
              <div className="text-sm">
                ₹{creditInfo.available_amount.toLocaleString('en-IN')}{' '}
                <span className="text-[10px] font-normal text-purple-600">
                  / ₹{creditInfo.total_limit.toLocaleString('en-IN')} limit
                </span>
              </div>
            </div>
          </div>
          <Link
            to="/credit-apply"
            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i> Increase Limit
          </Link>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto hide-scroll">
        <button
          type="button"
          onClick={() => {
            setActiveTab('browse');
            setStoreFilter(null);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 ${
            activeTab === 'browse'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <i className="fa-solid fa-store"></i>
          <span>Nearby Kiranas</span>
        </button>

        <Link
          to="/buycart"
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 transition flex items-center gap-2"
        >
          <i className="fa-solid fa-cart-shopping text-blue-600"></i>
          <span>Purchase Cart</span>
          {cartCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {cartCount}
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <i className="fa-solid fa-receipt"></i>
          <span>My Purchase Orders</span>
          {orders.length > 0 && (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {orders.length}
            </span>
          )}
        </button>
      </div>

      {/* BROWSE TAB CONTENT */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Filter Toolbar & View Mode Switcher */}
          <div className="card p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-2 flex-1">
              <div className="relative w-full sm:w-64">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products or stores..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm outline-none focus:border-emerald-500 transition"
                />
              </div>

              <select
                value={selectedDistance}
                onChange={(e) => setSelectedDistance(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold outline-none focus:border-emerald-500 bg-white"
              >
                <option value="all">Any Distance</option>
                <option value="5">Within 5 km (Express)</option>
                <option value="15">Within 15 km (Van)</option>
                <option value="50">Within 50 km (Porter)</option>
              </select>

              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold outline-none focus:border-emerald-500 bg-white"
              >
                <option value="all">All Categories</option>
                {categoriesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {storeFilter && (
                <button
                  type="button"
                  onClick={() => setStoreFilter(null)}
                  className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 shrink-0"
                >
                  <i className="fa-solid fa-xmark"></i> Clear Store Filter
                </button>
              )}
            </div>

            {/* View Mode Toggle: Products vs Shops vs Map View */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl shrink-0 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('products')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                  viewMode === 'products' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <i className="fa-solid fa-boxes-stacked"></i> Products ({filteredProducts.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('stores')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                  viewMode === 'stores' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <i className="fa-solid fa-store"></i> Shops ({filteredStores.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                  viewMode === 'map' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <i className="fa-solid fa-map-location-dot text-emerald-600"></i> Map View
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="card p-12 text-center text-gray-500 text-sm space-y-3">
              <i className="fa-solid fa-circle-notch fa-spin text-3xl text-emerald-600"></i>
              <div className="font-bold text-gray-700">Connecting to PostgreSQL database...</div>
              <p className="text-xs text-gray-400">Loading nearby seller catalogs, credit terms, and delivery zones.</p>
            </div>
          )}

          {/* VIEW MODE: PRODUCTS GRID */}
          {!loading && viewMode === 'products' && (
            <>
              {filteredProducts.length === 0 ? (
                /* Empty State */
                <div className="card p-10 sm:p-14 text-center border-dashed border-2 border-gray-200 space-y-4 max-w-2xl mx-auto my-6">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto text-2xl shadow-inner">
                    <i className="fa-solid fa-boxes-stacked"></i>
                  </div>
                  <div>
                    {storeFilter ? (
                      <>
                        <h3 className="text-lg font-black text-gray-900">
                          {stores.find((st) => st.id === storeFilter)?.store_name || 'Selected Store'} Has No Products Yet
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                          This partner store is registered in the directory, but has not published any items in their wholesale catalog yet.
                        </p>
                      </>
                    ) : stores.length > 0 ? (
                      <>
                        <h3 className="text-lg font-black text-gray-900">No Products Listed in this Filter</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                          There are <span className="font-bold text-gray-800">{stores.length} partner stores</span> in your directory. Switch to the Shops view or clear filters to see their profiles.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-black text-gray-900">No Other Stores in Your Local Radius Yet</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                          You are currently logged in as <span className="font-bold text-gray-700">{store?.store_name || 'your store'}</span>. In B2B restocking, your own store is excluded from the supplier list.
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2 justify-center pt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setStoreFilter(null);
                        setViewMode('stores');
                      }}
                      className="btn-primary !text-xs !py-2.5 !px-4 flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-store"></i> View Partner Shops ({stores.length})
                    </button>
                    <Link
                      to="/mastersearch"
                      className="btn-soft !text-xs !py-2.5 !px-4 flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-magnifying-glass"></i> National FMCG Catalog
                    </Link>
                  </div>
                </div>
              ) : (
                /* Live Real Products Grid with Amazon-Style Cards */
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => openProductDetail(p)}
                      className="card p-4 space-y-3 hover:shadow-lg hover:border-emerald-300 transition-all flex flex-col justify-between cursor-pointer group bg-white border border-gray-200"
                    >
                      <div className="space-y-2.5">
                        {/* Product Image Card Preview */}
                        <div className="w-full h-40 bg-gradient-to-br from-gray-50 to-emerald-50/20 rounded-xl overflow-hidden relative flex items-center justify-center border border-gray-100 group-hover:border-emerald-200 transition">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="w-full h-full object-contain p-2 group-hover:scale-105 transition duration-300"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-full h-full flex flex-col items-center justify-center text-gray-400 ${
                              p.image_url ? 'hidden' : 'flex'
                            }`}
                          >
                            <div className="w-12 h-12 rounded-xl bg-emerald-100/60 text-emerald-700 flex items-center justify-center text-xl mb-1 shadow-inner">
                              <i className="fa-solid fa-box-open"></i>
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              {p.category || 'Product'}
                            </span>
                          </div>

                          {p.brand_tag && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black shadow-sm">
                              {p.brand_tag}
                            </span>
                          )}
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-white/90 text-gray-700 font-black text-[10px] shadow-sm border border-gray-200">
                            {p.distance_km || 3} km
                          </span>
                        </div>

                        {/* Store name and distance */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewMode('products');
                              setStoreFilter(p.store_id);
                            }}
                            className="font-bold text-gray-700 hover:text-emerald-700 hover:underline truncate max-w-[180px] flex items-center gap-1"
                          >
                            <i className="fa-solid fa-store text-emerald-600"></i>
                            <span>{p.store_name}</span>
                          </button>
                          <span className="text-[10px] text-gray-400 font-semibold">{p.category}</span>
                        </div>

                        {/* Product Title & Brand Badge */}
                        <div>
                          {p.brand_tag && (
                            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wide bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mb-1">
                              {p.brand_tag}
                            </span>
                          )}
                          <h3 className="font-black text-gray-900 text-base leading-snug group-hover:text-emerald-700 transition">
                            {p.name}
                          </h3>
                        </div>

                        {/* Wholesale Pricing vs MRP */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-emerald-700 font-black text-xl">
                            ₹{Number(p.price || 0).toLocaleString('en-IN')}
                          </span>
                          {p.mrp && Number(p.mrp) > Number(p.price) && (
                            <span className="text-xs text-gray-400 line-through">
                              ₹{Number(p.mrp).toLocaleString('en-IN')}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 font-medium">
                            / {p.unit || 'unit'} {p.min_order > 1 ? `· MOQ ${p.min_order}` : ''}
                          </span>
                        </div>

                        {/* Credit & Logistics Badges */}
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <i className="fa-solid fa-clock-rotate-left text-amber-600"></i>
                            <span>
                              {p.credit_allowed
                                ? `${p.credit_days || 14} days shop credit eligible`
                                : 'Cash on delivery / UPI'}
                            </span>
                          </div>

                          <div className="text-[11px] text-gray-500 flex items-center justify-between px-1">
                            <span className="flex items-center gap-1">
                              <i className="fa-solid fa-truck-fast text-emerald-600"></i>
                              <span>
                                {Array.isArray(p.delivery_options) && p.delivery_options.length > 0
                                  ? p.delivery_options[0].zone_name
                                  : 'Porter / Express Van'}
                              </span>
                            </span>
                            <span className="text-emerald-700 font-bold group-hover:underline text-[11px]">
                              View Info →
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(p);
                          }}
                          className="btn-soft flex-1 !text-xs !py-2.5 flex items-center justify-center gap-1.5 font-bold"
                        >
                          <i className="fa-solid fa-cart-plus text-emerald-700"></i>
                          <span>Add to Cart</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyNow(p);
                          }}
                          className="btn-primary flex-1 !text-xs !py-2.5 flex items-center justify-center gap-1.5 font-black"
                        >
                          <span>Buy Now</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* VIEW MODE: STORES DIRECTORY */}
          {!loading && viewMode === 'stores' && (
            <>
              {filteredStores.length === 0 ? (
                /* Empty State for Stores */
                <div className="card p-10 sm:p-14 text-center border-dashed border-2 border-gray-200 space-y-4 max-w-2xl mx-auto my-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto text-2xl shadow-inner">
                    <i className="fa-solid fa-map-location-dot"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">No Nearby Partner Stores Found</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                      There are currently no other merchants registered in your delivery radius.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('products')}
                      className="btn-primary !text-xs !py-2.5 !px-4"
                    >
                      Return to Product View
                    </button>
                  </div>
                </div>
              ) : (
                /* Live Real Stores Cards */
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStores.map((s) => (
                    <div
                      key={s.id}
                      className="card p-5 space-y-3 hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between bg-white border border-gray-200"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-black text-gray-900 text-base">{s.store_name}</h3>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <i className="fa-solid fa-location-dot text-gray-400"></i>
                              <span>
                                {s.city || 'Local Area'} · {s.distance_km || 3} km away
                              </span>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              s.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {s.is_online ? '● Open' : '○ Closed'}
                          </span>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs text-gray-600 border border-gray-100">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Category:</span>
                            <span className="font-bold text-gray-800">{s.category || 'General Store'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Live Catalog:</span>
                            <span className="font-bold text-emerald-700">
                              {s.active_listings_count || 0} items available
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Credit Terms:</span>
                            <span className="font-bold text-purple-800">
                              {s.credit_allowed ? `${s.credit_days || 14} Days Net` : 'Instant Pay'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStoreFilter(s.id);
                            setViewMode('products');
                          }}
                          className="btn-primary flex-1 !text-xs !py-2.5 flex items-center justify-center gap-1 font-bold"
                        >
                          <i className="fa-solid fa-boxes-stacked"></i> View Products
                        </button>
                        <Link
                          to="/messages"
                          className="btn-soft !text-xs !py-2.5 !px-3 flex items-center justify-center gap-1 text-gray-700 hover:text-emerald-700 font-bold"
                          title="Message Shopkeeper"
                        >
                          <i className="fa-solid fa-comment-dots"></i>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* VIEW MODE: INTERACTIVE LEAFLET MAP */}
          {!loading && viewMode === 'map' && (
            <div className="space-y-4">
              {/* Map Container Card */}
              <div className="card p-4 bg-white border border-gray-200 space-y-3 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-gray-900 text-base flex items-center gap-1.5">
                        <i className="fa-solid fa-map-location-dot text-emerald-600"></i>
                        <span>Live Kirana Proximity Map</span>
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {filteredStores.length} Partner Stores in Area
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Geographic visual of nearby wholesale kiranas and active delivery zones. Click any pin to inspect stock.
                    </p>
                  </div>

                  {/* Map Legend */}
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-600 flex-wrap bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white shadow-sm inline-block"></span>
                      <span>Your Store (Base)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-indigo-700 border border-white shadow-sm inline-block"></span>
                      <span>Partner Kirana</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full border border-dashed border-emerald-500 bg-emerald-100/50 inline-block"></span>
                      <span>Delivery Zone</span>
                    </span>
                  </div>
                </div>

                {/* Leaflet Map Div */}
                <div
                  ref={mapContainerRef}
                  className="w-full h-[520px] rounded-xl border border-gray-200 overflow-hidden relative shadow-inner bg-gray-50 z-0"
                />
              </div>

              {/* Partner Kiranas Quick Drawer under Map */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                    Stores Plotted on Map ({filteredStores.length})
                  </h4>
                  <span className="text-[11px] text-gray-400">Click a store to focus location</span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredStores.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => focusStoreOnMap(s)}
                      className={`card p-3.5 border transition cursor-pointer flex flex-col justify-between gap-2.5 ${
                        selectedMapStore?.id === s.id
                          ? 'border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50/20'
                          : 'border-gray-200 hover:border-indigo-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-black text-gray-900 text-sm">{s.store_name}</div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <i className="fa-solid fa-location-dot text-indigo-500"></i>
                            <span>{s.city || 'Local Area'} · <b>{s.distance_km || 3} km</b> away</span>
                          </div>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            s.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {s.is_online ? '● Open' : '○ Closed'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                        <span className="text-gray-500">
                          Catalog: <strong className="text-emerald-700">{s.active_listings_count || 0} items</strong>
                        </span>
                        <span className="text-gray-500">
                          Credit: <strong className="text-purple-700">{s.credit_allowed ? `${s.credit_days || 14}d Net` : 'COD'}</strong>
                        </span>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            focusStoreOnMap(s);
                          }}
                          className="btn-soft !text-[11px] !py-1.5 flex-1 flex items-center justify-center gap-1 font-bold"
                        >
                          <i className="fa-solid fa-crosshairs text-indigo-600"></i>
                          <span>Locate Pin</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStoreFilter(s.id);
                            setViewMode('products');
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                          className="btn-primary !text-[11px] !py-1.5 flex-1 flex items-center justify-center gap-1 font-black"
                        >
                          <i className="fa-solid fa-boxes-stacked"></i>
                          <span>Products ({s.active_listings_count || 0})</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Credit Limit Banner Callout */}
          <Link
            to="/credit-apply"
            className="card p-4 hover:border-purple-300 border-dashed border-2 border-purple-200 flex items-center gap-3 bg-gradient-to-r from-purple-50/50 to-white transition block"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 text-base">
              <i className="fa-solid fa-hand-holding-dollar"></i>
            </div>
            <div>
              <div className="font-black text-sm text-purple-950">Need higher credit limit to restock inventory?</div>
              <div className="text-xs text-purple-700">Apply for pre-approved ADAB B2B store credit lines (up to ₹5,00,000)</div>
            </div>
            <i className="fa-solid fa-arrow-right ml-auto text-purple-600 pr-1"></i>
          </Link>
        </div>
      )}

      {/* MY PURCHASE ORDERS TAB CONTENT */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">Purchase Orders Placed with Partner Kiranas</h2>
            <button
              type="button"
              onClick={loadData}
              className="btn-soft !text-xs !py-1.5 !px-3 font-bold flex items-center gap-1"
            >
              <i className="fa-solid fa-rotate-right"></i> Refresh Orders
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="card p-12 text-center text-gray-500 space-y-3 border-dashed border-2 border-gray-200">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto text-2xl">
                <i className="fa-solid fa-receipt"></i>
              </div>
              <h3 className="font-black text-gray-900 text-base">No Purchase Orders Placed Yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Orders you place with nearby kiranas will show live tracking, GST invoices, items breakdown, and delivery statuses here.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className="btn-primary !text-xs !py-2.5 !px-4 mt-2 font-bold"
              >
                Browse Restock Catalog
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((po) => (
                <div
                  key={po.id || po.po_number}
                  className="card p-5 space-y-4 hover:shadow-md transition border border-gray-200 bg-white"
                >
                  {/* PO Top Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-base">#{po.po_number}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                            po.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : po.status === 'IN_TRANSIT'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {po.status || 'PLACED'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-gray-500">
                        <span>Supplier: <strong className="text-gray-800">{po.supplier_name || 'Partner Kirana'}</strong></span>
                        <span className="text-gray-300">·</span>
                        <span>{new Date(po.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="text-gray-300">·</span>
                        {/* Payment Status & Method Badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          po.payment_method === 'CARD'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : po.payment_method === 'UPI' || po.payment_terms === 'ADVANCE_UPI'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-purple-50 text-purple-800 border border-purple-200'
                        }`}>
                          <i className={`fa-solid ${
                            po.payment_method === 'CARD' ? 'fa-credit-card' :
                            po.payment_method === 'UPI' || po.payment_terms === 'ADVANCE_UPI' ? 'fa-qrcode' :
                            'fa-receipt'
                          }`}></i>
                          <span>
                            {po.payment_method === 'CARD' 
                              ? 'Paid via Card' 
                              : po.payment_method === 'UPI' || po.payment_terms === 'ADVANCE_UPI'
                              ? 'Paid via UPI' 
                              : '14 Days Net Credit'}
                          </span>
                        </span>

                        {/* Delivery Method Badge */}
                        {po.delivery_method && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-semibold border border-gray-200">
                            <i className="fa-solid fa-truck text-emerald-600"></i>
                            <span className="capitalize">{po.delivery_method}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="text-right">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Total Order Cost</div>
                        <div className="font-black text-gray-900 text-lg">
                          ₹{Number(po.total_amount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReorder(po)}
                        className="btn-soft !text-xs !py-2 !px-3 font-bold flex items-center gap-1 text-emerald-700"
                        title="Re-order these items into cart"
                      >
                        <i className="fa-solid fa-rotate-left"></i> Re-order
                      </button>
                    </div>
                  </div>

                  {/* Items list in PO */}
                  {Array.isArray(po.items) && po.items.length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-xl space-y-2 text-xs border border-gray-100">
                      <div className="font-black text-gray-700 text-[11px] uppercase tracking-wider">
                        Ordered Items ({po.items.length}):
                      </div>
                      <div className="divide-y divide-gray-200">
                        {po.items.map((it, idx) => (
                          <div key={it.id || idx} className="py-2 flex justify-between items-center text-gray-700 gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {it.image_url ? (
                                <img
                                  src={it.image_url}
                                  alt={it.item_name}
                                  className="w-8 h-8 rounded-lg object-contain bg-white border border-gray-200 p-0.5 shrink-0"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-400 flex items-center justify-center shrink-0 text-xs">
                                  <i className="fa-solid fa-box"></i>
                                </div>
                              )}
                              <div className="truncate">
                                <span className="font-bold text-gray-900 truncate block">{it.item_name}</span>
                                <span className="text-gray-400 text-[11px]">Qty: {it.quantity} {it.unit || 'unit'} · ₹{Number(it.price || 0).toLocaleString('en-IN')}/ea</span>
                              </div>
                            </div>
                            <div className="font-black text-gray-900 text-sm shrink-0">
                              ₹{Number(it.total || (it.quantity * it.price) || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
