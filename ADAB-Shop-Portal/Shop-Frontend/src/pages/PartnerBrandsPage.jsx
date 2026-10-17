import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { sellerApi } from '../api/sellerApi';
import { useSeller } from '../context/SellerContext';
import { useTranslation } from '../context/LanguageContext';

export default function PartnerBrandsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { store } = useSeller();

  // View Modes: 'products' | 'stores' | 'map' | 'resale' | 'requests' | 'ready'
  const [viewMode, setViewMode] = useState('products');
  const [products, setProducts] = useState([]);
  const [myAdded, setMyAdded] = useState([]);
  const [readyToPublish, setReadyToPublish] = useState([]);
  const [myPurchaseOrders, setMyPurchaseOrders] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedDistance, setSelectedDistance] = useState('all');
  const [storeFilter, setStoreFilter] = useState(null); // specific store filter

  // Modal State - Request Resale Stock Authorization
  const [addModalProduct, setAddModalProduct] = useState(null);
  const [customPrice, setCustomPrice] = useState('');
  const [customStock, setCustomStock] = useState('20');
  const [paymentTerms, setPaymentTerms] = useState('CREDIT_14D');
  const [requestNotes, setRequestNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [confirmingOrder, setConfirmingOrder] = useState(null);

  // Modal State - Product Detail & Quick Purchase (Amazon-Style Rich Modal)
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailQty, setDetailQty] = useState(1);
  const [selectedModalImage, setSelectedModalImage] = useState(null);

  // Leaflet Map Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const storeMarkersRef = useRef({});
  const [selectedMapStore, setSelectedMapStore] = useState(null);

  // Cart & Toast
  const [cartCount, setCartCount] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('adab_buy_cart') || '[]');
      return Array.isArray(saved) ? saved.length : 0;
    } catch (e) {
      return 0;
    }
  });

  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [brandsRes, myAddedRes, readyRes, analyticsRes, incomingRes, poRes] = await Promise.allSettled([
        sellerApi.getOtherStoreBrands(),
        sellerApi.getMyAddedOtherStoreBrands(),
        sellerApi.getPurchasedBrandsReadyToPublish(),
        sellerApi.getBrandDistributionAnalytics(),
        sellerApi.getIncomingResaleRequests(),
        sellerApi.getPurchaseOrders({ type: 'resale' })
      ]);

      if (brandsRes.status === 'fulfilled') {
        const raw = brandsRes.value?.data !== undefined ? brandsRes.value.data : brandsRes.value;
        const loaded = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setProducts(loaded);
      } else {
        setProducts([]);
      }

      if (myAddedRes.status === 'fulfilled') {
        const raw = myAddedRes.value?.data !== undefined ? myAddedRes.value.data : myAddedRes.value;
        setMyAdded(Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []));
      } else {
        setMyAdded([]);
      }

      if (readyRes.status === 'fulfilled') {
        const raw = readyRes.value?.data !== undefined ? readyRes.value.data : readyRes.value;
        setReadyToPublish(Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []));
      } else {
        setReadyToPublish([]);
      }

      if (incomingRes.status === 'fulfilled') {
        const raw = incomingRes.value?.data !== undefined ? incomingRes.value.data : incomingRes.value;
        setIncomingRequests(Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []));
      } else {
        setIncomingRequests([]);
      }

      if (poRes.status === 'fulfilled') {
        const raw = poRes.value?.data !== undefined ? poRes.value.data : poRes.value;
        const allOrders = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        // Strictly filter to Own Brand resale authorization & stock requests (REQ-B2B-...)
        setMyPurchaseOrders(allOrders.filter((po) => po.po_number && po.po_number.startsWith('REQ-B2B-')));
      } else {
        setMyPurchaseOrders([]);
      }

      if (analyticsRes.status === 'fulfilled') {
        const raw = analyticsRes.value?.data !== undefined ? analyticsRes.value.data : analyticsRes.value;
        setAnalyticsData(raw || null);
      }
    } catch (err) {
      console.error('Failed to load other store brands:', err);
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

  // Compute distinct partner stores from the own-brand products
  const partnerStores = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      if (!p.store_id) return;
      if (!map.has(p.store_id)) {
        map.set(p.store_id, {
          id: p.store_id,
          store_name: p.store_name || 'Partner Kirana',
          city: p.store_city || 'Local Area',
          phone: p.store_phone || '',
          latitude: p.store_latitude,
          longitude: p.store_longitude,
          address_line: p.store_address || '',
          category: p.store_category || 'Own Brand Creator',
          rating: p.store_rating || 5.0,
          is_online: p.store_is_online !== false,
          distance_km: Number(p.distance_km || 3),
          credit_allowed: p.credit_allowed !== false,
          credit_days: p.credit_days || '14',
          delivery_options: p.delivery_options || [],
          own_brand_count: 1,
          products: [p]
        });
      } else {
        const existing = map.get(p.store_id);
        existing.own_brand_count += 1;
        existing.products.push(p);
      }
    });
    return Array.from(map.values());
  }, [products]);

  // Extract distinct categories from products
  const categoriesList = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((p) => p.category)
          .filter(Boolean)
          .concat(['Food & Snacks', 'Clothing', 'Beauty', 'Home Care', 'Grocery', 'Dairy'])
      )
    );
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.title || p.name || '').toLowerCase().includes(q) ||
        (p.brand_tag || '').toLowerCase().includes(q) ||
        (p.store_name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q);

      const matchCat =
        selectedCat === 'all' || (p.category || '').toLowerCase().includes(selectedCat.toLowerCase());

      const dist = Number(p.distance_km || 0);
      const matchDist = selectedDistance === 'all' || dist <= Number(selectedDistance);

      const matchStore = !storeFilter || String(p.store_id) === String(storeFilter);

      return matchSearch && matchCat && matchDist && matchStore;
    });
  }, [products, searchQuery, selectedCat, selectedDistance, storeFilter]);

  // Filtered Stores
  const filteredStores = useMemo(() => {
    return partnerStores.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (s.store_name || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q);

      const matchCat =
        selectedCat === 'all' || (s.category || '').toLowerCase().includes(selectedCat.toLowerCase());

      const dist = Number(s.distance_km || 0);
      const matchDist = selectedDistance === 'all' || dist <= Number(selectedDistance);

      return matchSearch && matchCat && matchDist;
    });
  }, [partnerStores, searchQuery, selectedCat, selectedDistance]);

  // Leaflet Map Initialization and Pin Plotting for Map View (ADAB Authentic Multi-Color Theme)
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

    // Delivery radius circle around buyer store in ADAB emerald
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

    // Marker for Buyer's own store (Emerald Green with ping ring)
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
          <div style="font-size:11px;color:#6B7280;margin-top:2px;">${store?.city || 'Local Location'} • Network Radius: <b>${radiusKm} km</b></div>
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
      // Partner Kirana Maker Pin: ADAB Indigo/Blue (#4338CA) exactly matching BuyNearbyPage
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
        <div style="font-family:inherit;min-width:230px;padding:4px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:800;padding:2px 7px;border-radius:6px;background:${
              isStoreOnline ? '#ECFDF5' : '#F3F4F6'
            };color:${isStoreOnline ? '#065F46' : '#4B5563'};">
              ${isStoreOnline ? '● Online Producer' : '○ Offline'}
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
              <div style="color:#6B7280;font-size:10px;">Own Brands</div>
              <strong style="color:#4338CA;font-size:12px;">${s.own_brand_count} Products</strong>
            </div>
            <div>
              <div style="color:#6B7280;font-size:10px;">Credit Terms</div>
              <strong style="color:#7E22CE;font-size:12px;">${
                s.credit_allowed ? (s.credit_days || 14) + ' Days Net' : 'Instant Pay'
              }</strong>
            </div>
          </div>
          <button
            type="button"
            id="btn-brand-map-browse-${s.id}"
            style="width:100%;padding:9px 12px;background:#059669;color:white;border:none;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 2px 6px rgba(5,150,105,0.3);"
          >
            <i class="fa-solid fa-boxes-stacked"></i>
            <span>Browse Own Brands (${s.own_brand_count})</span>
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
        const btn = document.getElementById(`btn-brand-map-browse-${s.id}`);
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

  // Cart Operations
  const handleAddToCart = (item, customQty = null) => {
    try {
      const currentCart = JSON.parse(localStorage.getItem('adab_buy_cart') || '[]');
      const existingIndex = currentCart.findIndex((c) => c.id === item.id);
      const minQty = Number(item.min_order || item.min_order_qty || 1);
      const addQty = customQty !== null ? Number(customQty) : minQty;

      if (existingIndex >= 0) {
        currentCart[existingIndex].quantity = (Number(currentCart[existingIndex].quantity) || 1) + addQty;
      } else {
        currentCart.push({
          id: item.id,
          name: item.title || item.name,
          image_url: item.image_url || (Array.isArray(item.images) && item.images[0]) || null,
          price: Number(item.wholesale_price || item.price || item.mrp || 0),
          mrp: Number(item.mrp || 0),
          store_id: item.store_id,
          store_name: item.store_name,
          distance_km: item.distance_km || 3,
          unit: item.unit || 'unit',
          min_order: minQty,
          quantity: addQty,
          credit_allowed: item.credit_allowed !== false,
          credit_days: item.credit_days || '14',
          delivery_options: item.delivery_options || []
        });
      }

      localStorage.setItem('adab_buy_cart', JSON.stringify(currentCart));
      window.dispatchEvent(new Event('adab-cart-updated'));
      showToast(`Added ${addQty}x ${item.title || item.name} to Purchase Cart`);
    } catch (e) {
      console.error('Cart add error:', e);
    }
  };

  const handleBuyNow = (item, customQty = null) => {
    handleAddToCart(item, customQty);
    navigate('/buycart');
  };

  const openProductDetail = (product) => {
    setDetailProduct(product);
    setDetailQty(Number(product.min_order || product.min_order_qty || 1));
    const initialImg = product.image_url || (Array.isArray(product.images) && product.images[0]) || null;
    setSelectedModalImage(initialImg);
  };

  const openAddModal = (product, initialQty = null) => {
    setAddModalProduct(product);
    const wholesale = Number(product.wholesale_price || product.price || 0);
    const mrp = Number(product.mrp || 0);
    // Smart preset: default to 25% markup over wholesale cost, capped at MRP if MRP is set
    let defaultPrice = wholesale > 0 ? Math.round(wholesale * 1.25) : (mrp || 100);
    if (mrp > 0 && defaultPrice > mrp) defaultPrice = mrp;
    setCustomPrice(defaultPrice.toString());
    const minQty = Number(product.min_order_qty || product.min_order || product.total_purchased_qty || 20);
    const qtyToSet = initialQty && Number(initialQty) > 0 ? Number(initialQty) : minQty;
    setCustomStock(qtyToSet.toString());
    setPaymentTerms('CREDIT_14D');
    setRequestNotes('');
  };

  const closeAddModal = () => {
    setAddModalProduct(null);
    setIsSubmitting(false);
  };

  const handleConfirmRequest = async (e) => {
    e.preventDefault();
    if (!addModalProduct) return;

    const priceNum = Number(customPrice);
    const wholesaleCost = Number(addModalProduct.wholesale_price || addModalProduct.price || 0);
    const mrp = Number(addModalProduct.mrp || 0);
    const stockQtyNum = Number(customStock) || 20;

    if (mrp > 0 && priceNum > mrp) {
      alert(`Selling price (₹${priceNum}) cannot exceed printed MRP of ₹${mrp}`);
      return;
    }
    if (wholesaleCost > 0 && priceNum < wholesaleCost) {
      const proceed = window.confirm(
        `Selling price (₹${priceNum}) is below wholesale acquisition cost (₹${wholesaleCost}). Do you wish to continue selling at a loss?`
      );
      if (!proceed) return;
    }

    try {
      setIsSubmitting(true);
      const prodName = addModalProduct.title || addModalProduct.name;
      await sellerApi.requestResaleStock({
        originalListingId: addModalProduct.original_listing_id || addModalProduct.id,
        quantity: stockQtyNum,
        resaleSellPrice: priceNum || (mrp || wholesaleCost * 1.25),
        paymentTerms: paymentTerms || 'CREDIT_14D',
        notes: requestNotes || 'Resale stock authorization request'
      });

      showToast(`Resale request for "${prodName}" submitted to ${addModalProduct.store_name}! No money charged until approved.`);
      closeAddModal();
      await loadData();
      setViewMode('requests');
    } catch (err) {
      console.error('Failed to request resale stock:', err);
      const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to submit request';
      alert(`Request Failed: ${errMsg}`);
      showToast(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveRequest = async (orderId) => {
    try {
      setProcessingOrderId(orderId);
      await sellerApi.approveResaleRequest(orderId);
      showToast('Resale request approved! Retailer has been notified to confirm payment.');
      await loadData();
    } catch (err) {
      console.error('Approval error:', err);
      const msg = err?.response?.data?.error || err?.message || 'Failed to approve request';
      alert(`Approval error: ${msg}`);
      showToast(msg);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleDeclineRequest = async (orderId) => {
    const reason = window.prompt('Enter reason for declining this resale request (optional):', 'Currently at capacity for this product');
    if (reason === null) return;

    try {
      setProcessingOrderId(orderId);
      await sellerApi.declineResaleRequest(orderId, reason);
      showToast('Resale request declined.');
      await loadData();
    } catch (err) {
      console.error('Decline error:', err);
      const msg = err?.response?.data?.error || err?.message || 'Failed to decline request';
      alert(`Decline error: ${msg}`);
      showToast(msg);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handlePayAndActivate = (order) => {
    // Open in-app confirmation modal instead of browser native alert
    setConfirmingOrder(order);
  };

  const executeConfirmAndPay = async () => {
    if (!confirmingOrder) return;
    const order = confirmingOrder;
    try {
      setProcessingOrderId(order.id);
      await sellerApi.confirmAndPayResaleOrder(order.id, {
        payment_method: order.payment_terms || 'CREDIT_14D'
      });
      showToast('Order confirmed! Product is now live in your store catalog with real stock.');
      setConfirmingOrder(null);
      await loadData();
      setViewMode('resale');
    } catch (err) {
      console.error('Pay and activate error:', err);
      const msg = err?.response?.data?.error || err?.message || 'Failed to confirm order';
      showToast(`Activation Error: ${msg}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleToggleBlockStore = async (buyerStoreId, block) => {
    const promptMsg = block
      ? 'Are you sure you want to block this store? They will no longer be able to see or request your Own Brand products.'
      : 'Unblock this store so they can view and request your Own Brand products?';

    if (!window.confirm(promptMsg)) return;

    try {
      await sellerApi.toggleBlockResellerStore(buyerStoreId, block);
      showToast(block ? 'Partner store blocked from future requests.' : 'Partner store unblocked.');
      await loadData();
    } catch (err) {
      console.error('Block toggle error:', err);
      const msg = err?.response?.data?.error || err?.message || 'Failed to update store access';
      alert(`Action error: ${msg}`);
    }
  };

  return (
    <section id="sec-partnerbrands" className="space-y-5 fade-in max-w-7xl mx-auto pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-gray-950 text-white px-4 py-2.5 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2 animate-bounce border border-gray-700">
          <i className="fa-solid fa-circle-check text-emerald-400"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Prominent Purchase Cart Navigation (ADAB Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-crown text-amber-500"></i>
              <span>{t('navPartnerPack', 'Other Store Brands')}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 border border-amber-300 text-[11px] font-black tracking-wide uppercase">
              {t('ownBrandNetwork', 'Own Brand Network')}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
            {t('ownBrandSubtitle', 'Discover authentic Own Brand private labels manufactured by verified partner stores. Buy wholesale stock on 14-day credit, or clone them into your store for retail markup.')}
          </p>
        </div>

        {/* Prominent Purchase Cart Button with ADAB Blue accent badge */}
        <div className="flex items-center gap-3">
          <Link
            to="/buycart"
            id="btn-header-purchase-cart"
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2.5 group"
            title={t('navPurchaseCart', 'Purchase Cart')}
          >
            <i className="fa-solid fa-cart-shopping text-blue-200 group-hover:scale-110 transition duration-200"></i>
            <span>{t('navPurchaseCart', 'Purchase Cart')}</span>
            {cartCount > 0 ? (
              <span className="bg-white text-emerald-800 text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                {cartCount} items
              </span>
            ) : (
              <span className="bg-emerald-700 text-emerald-100 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                0
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* 5 Dedicated Tabs Row (Placed PROPERLY ABOVE the Filter Bar with ADAB Multi-Color Accents) */}
      <div className="flex items-center gap-2.5 border-b border-gray-200 pb-3 overflow-x-auto hide-scroll">
        {/* Tab 1: Products */}
        <button
          type="button"
          onClick={() => {
            setViewMode('products');
            setStoreFilter(null);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 shrink-0 ${
            viewMode === 'products'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <i className={`fa-solid fa-boxes-stacked ${viewMode === 'products' ? 'text-white' : 'text-emerald-600'}`}></i>
          <span>{t('myProductsStock', 'Products')} ({filteredProducts.length})</span>
        </button>

        {/* Tab 2: Stores Directory */}
        <button
          type="button"
          onClick={() => setViewMode('stores')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 shrink-0 ${
            viewMode === 'stores'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <i className={`fa-solid fa-store ${viewMode === 'stores' ? 'text-white' : 'text-indigo-600'}`}></i>
          <span>{t('storesDirectory', 'Stores Directory')} ({filteredStores.length})</span>
        </button>

        {/* Tab 3: Partner Map */}
        <button
          type="button"
          onClick={() => setViewMode('map')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 shrink-0 ${
            viewMode === 'map'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <i className={`fa-solid fa-map-location-dot ${viewMode === 'map' ? 'text-white' : 'text-blue-600'}`}></i>
          <span>{t('partnerMap', 'Partner Map')}</span>
        </button>

        {/* Tab 4: Resale Catalog */}
        <button
          type="button"
          onClick={() => setViewMode('resale')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 shrink-0 ${
            viewMode === 'resale'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <i className={`fa-solid fa-tag ${viewMode === 'resale' ? 'text-white' : 'text-amber-600'}`}></i>
          <span>{t('resaleCatalog', 'Resale Catalog')} ({myAdded.length})</span>
        </button>

        {/* Tab 5: My Stock Requests */}
        <button
          type="button"
          onClick={() => setViewMode('requests')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 shrink-0 ${
            viewMode === 'requests'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <i className={`fa-solid fa-clipboard-check ${viewMode === 'requests' ? 'text-white' : 'text-teal-600'}`}></i>
          <span>{t('myStockRequests', 'Stock Requests')} ({myPurchaseOrders.length})</span>
          {myPurchaseOrders.some((po) => po.status === 'APPROVED') && (
            <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
              Ready!
            </span>
          )}
        </button>


        {/* Brand Creator Analytics Button with Incoming Requests Alert */}
        <button
          type="button"
          onClick={() => setShowAnalyticsModal(true)}
          className="ml-auto text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 font-extrabold px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 transition shadow-sm"
          title="View your Own Brand B2B distribution analytics & incoming requests"
        >
          <i className="fa-solid fa-chart-line text-purple-600"></i>
          <span>Brand Analytics</span>
          {incomingRequests.filter((r) => r.status === 'REQUESTED').length > 0 && (
            <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
              {incomingRequests.filter((r) => r.status === 'REQUESTED').length} new
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={loadData}
          className="text-xs text-gray-400 hover:text-emerald-700 font-bold px-2.5 py-2 flex items-center gap-1.5 shrink-0"
          title="Refresh Data"
        >
          <i className="fa-solid fa-rotate-right"></i>
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar (Rendered cleanly below the 4 tabs) */}
      {(viewMode === 'products' || viewMode === 'stores' || viewMode === 'map') && (
        <div className="card p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row items-center gap-2 flex-1">
            {/* Search Bar */}
            <div className="relative w-full sm:w-80">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search brand, product title, or maker store..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm outline-none focus:border-emerald-600 transition"
              />
            </div>

            {/* Distance Filter */}
            <select
              value={selectedDistance}
              onChange={(e) => setSelectedDistance(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold outline-none focus:border-emerald-600 bg-white"
            >
              <option value="all">Any Distance</option>
              <option value="5">Within 5 km (Express)</option>
              <option value="15">Within 15 km (Van)</option>
              <option value="50">Within 50 km (Regional)</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold outline-none focus:border-emerald-600 bg-white"
            >
              <option value="all">All Categories</option>
              {categoriesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Store Filter Reset Pill */}
            {storeFilter && (
              <button
                type="button"
                onClick={() => setStoreFilter(null)}
                className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 shrink-0 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200"
              >
                <i className="fa-solid fa-xmark"></i>
                <span>Filtered by: {partnerStores.find((s) => String(s.id) === String(storeFilter))?.store_name || 'Store'} (Clear)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="card p-12 text-center text-gray-500 text-sm space-y-3">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-emerald-600"></i>
          <div className="font-bold text-gray-700">Connecting to Partner Own Brand Network...</div>
          <p className="text-xs text-gray-400">Loading verified manufacturer products, images, and credit terms.</p>
        </div>
      )}

      {/* VIEW 1: PRODUCTS GRID */}
      {!loading && viewMode === 'products' && (
        <div className="space-y-4">
          {/* Notice Banner (ADAB Multi-Tone Gradient: Emerald, Teal, and Indigo) */}
          <div className="card p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 text-sm shadow-sm">
                <i className="fa-solid fa-crown"></i>
              </span>
              <div>
                <strong className="font-black text-gray-900">Original Own Brand Network Only</strong>
                <p className="text-gray-600 text-[11px]">
                  All items shown are original private labels manufactured by other verified partner stores. Your own store's items are excluded.
                </p>
              </div>
            </div>
            {storeFilter && (
              <button
                type="button"
                onClick={() => setStoreFilter(null)}
                className="btn-soft !text-xs !py-1 !px-2.5 font-bold text-emerald-800 shrink-0"
              >
                Show All Stores
              </button>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            /* Empty State */
            <div className="card p-10 sm:p-14 text-center border-dashed border-2 border-gray-200 space-y-4 max-w-2xl mx-auto my-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
                <i className="fa-solid fa-boxes-packing"></i>
              </div>
              <div>
                {storeFilter ? (
                  <>
                    <h3 className="text-lg font-black text-gray-900">No Own Brands from this Store</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                      This store does not currently have active own-brand products matching your filters.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-black text-gray-900">No Partner Own Brands Found</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                      When other merchant stores create products with type <strong>'Own Brand'</strong>, they appear here for bulk restock and retail resale!
                    </p>
                  </>
                )}
              </div>

              <div className="flex gap-2 justify-center pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setStoreFilter(null);
                    setSearchQuery('');
                    setSelectedCat('all');
                    setSelectedDistance('all');
                  }}
                  className="btn-primary !text-xs !py-2.5 !px-4"
                >
                  Clear All Filters
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('stores')}
                  className="btn-soft !text-xs !py-2.5 !px-4"
                >
                  <i className="fa-solid fa-store mr-1 text-indigo-600"></i> View Stores Directory ({partnerStores.length})
                </button>
              </div>
            </div>
          ) : (
            /* Products Cards Grid */
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((p) => {
                const isAlreadyAdded = myAdded.some((m) => m.original_listing_id === p.id || m.title === (p.title || p.name));
                const wholesalePrice = Number(p.wholesale_price || p.price || p.mrp || 0);
                const mrp = Number(p.mrp || wholesalePrice);
                const marginAmt = mrp - wholesalePrice;
                const marginPct = mrp > 0 ? Math.round((marginAmt / mrp) * 100) : 0;
                const minOrder = Number(p.min_order || p.min_order_qty || 1);
                const productImage = p.image_url || (Array.isArray(p.images) && p.images[0]) || null;

                return (
                  <div
                    key={p.id}
                    onClick={() => openProductDetail(p)}
                    className="card p-4 space-y-3 hover:shadow-lg hover:border-emerald-300 transition-all flex flex-col justify-between bg-white border border-gray-200 cursor-pointer group"
                  >
                    <div className="space-y-2.5">
                      {/* Product Image Card Preview (Outside) */}
                      <div className="w-full h-44 bg-gradient-to-br from-gray-50 via-white to-slate-50 rounded-xl overflow-hidden relative flex items-center justify-center border border-gray-100 group-hover:border-emerald-200 transition">
                        {productImage ? (
                          <img
                            src={productImage}
                            alt={p.title || p.name}
                            className="w-full h-full object-contain p-2 group-hover:scale-105 transition duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-full h-full flex flex-col items-center justify-center text-gray-400 ${
                            productImage ? 'hidden' : 'flex'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center text-xl mb-1 shadow-inner">
                            <i className="fa-solid fa-crown"></i>
                          </div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            {p.brand_tag || p.category || 'Own Brand'}
                          </span>
                        </div>

                        {/* Gold / Amber Brand Tag Pill */}
                        {p.brand_tag && (
                          <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black shadow-sm flex items-center gap-1">
                            <i className="fa-solid fa-crown text-[9px] text-amber-100"></i>
                            <span>{p.brand_tag}</span>
                          </span>
                        )}

                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-white/95 text-gray-700 font-black text-[10px] shadow-sm border border-gray-200">
                          {p.distance_km || 3} km
                        </span>
                      </div>

                      {/* Store name and category */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStoreFilter(p.store_id);
                          }}
                          className="font-extrabold text-indigo-950 hover:text-indigo-600 flex items-center gap-1.5 truncate max-w-[190px]"
                          title="Filter products from this maker"
                        >
                          <i className="fa-solid fa-store text-indigo-600 text-[11px]"></i>
                          <span className="truncate">{p.store_name}</span>
                        </button>
                        <span className="text-[10px] text-gray-500 font-semibold">{p.category || 'General'}</span>
                      </div>

                      {/* Title & Unit */}
                      <div>
                        <h3 className="font-black text-gray-900 text-sm leading-snug group-hover:text-emerald-700 transition line-clamp-2">
                          {p.title || p.name}
                        </h3>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Unit: <span className="font-bold text-gray-700">{p.unit || 'unit'}</span> · MOQ: <strong>{minOrder}</strong>
                        </div>
                      </div>

                      {/* Pricing & Profit Matrix (ADAB Green Wholesale + Amber Retail Margin) */}
                      <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs border border-gray-100">
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-500 font-semibold">Wholesale Price:</span>
                          <span className="font-black text-emerald-700 text-base">
                            ₹{wholesalePrice.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {mrp > wholesalePrice && (
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-400">Suggested MRP:</span>
                            <span className="line-through text-gray-400">₹{mrp.toLocaleString('en-IN')}</span>
                          </div>
                        )}

                        {marginPct > 0 && (
                          <div className="flex justify-between text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <span>Retail Margin:</span>
                            <span>Save ₹{marginAmt.toLocaleString('en-IN')} ({marginPct}%)</span>
                          </div>
                        )}
                      </div>

                      {/* Credit Policy Badge (ADAB Royal Purple Credit Identity) */}
                      <div className="text-[11px] text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 font-bold flex items-center gap-1.5">
                        <i className="fa-solid fa-building-columns text-purple-700"></i>
                        <span>{p.credit_allowed !== false ? '14 Days Net Credit Available' : 'Cash / Instant UPI'}</span>
                      </div>
                    </div>

                    {/* Unified Single Action: Request Authorization & Stock to Sell */}
                    <div className="pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openAddModal(p)}
                        disabled={isAlreadyAdded}
                        className={`w-full py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 shadow-sm border ${
                          isAlreadyAdded
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white border-transparent hover:shadow-md'
                        }`}
                        title={isAlreadyAdded ? 'Already active in your store catalog' : 'Request stock authorization and set your consumer retail price'}
                      >
                        <i className={`fa-solid ${isAlreadyAdded ? 'fa-circle-check text-emerald-600' : 'fa-bolt text-amber-300'}`}></i>
                        <span>{isAlreadyAdded ? 'Active in My Store' : 'Request to Stock & Sell'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: STORES DIRECTORY (SHOWS ALL STORES & HOW MANY OWN BRANDS THEY HAVE) */}
      {!loading && viewMode === 'stores' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-store text-indigo-600"></i>
                <span>Partner Stores Manufacturing Own Brands ({filteredStores.length})</span>
              </h2>
              <p className="text-xs text-gray-500">
                Direct producer directory of verified merchant shops creating proprietary own-brand products.
              </p>
            </div>
          </div>

          {filteredStores.length === 0 ? (
            <div className="card p-10 text-center border-dashed border-2 border-gray-200 space-y-3">
              <i className="fa-solid fa-shop text-gray-300 text-3xl"></i>
              <p className="text-xs text-gray-500">No partner stores found matching your filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCat('all');
                  setSelectedDistance('all');
                }}
                className="btn-primary !text-xs !py-2 !px-4"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStores.map((s) => (
                <div
                  key={s.id}
                  className="card p-4 space-y-3 hover:shadow-md hover:border-indigo-300 transition border border-gray-200 bg-white flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Store Title & Online Badge */}
                    <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-gray-900 text-base">{s.store_name}</h3>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <i className="fa-solid fa-location-dot text-indigo-600"></i>
                          <span>{s.city || 'Local Area'} · <b>{s.distance_km || 3} km</b> away</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          s.is_online ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {s.is_online ? '● Online' : '○ Offline'}
                      </span>
                    </div>

                    {/* Own Brand Count Box (ADAB Indigo/Teal Store Highlight) */}
                    <div className="p-3 bg-gradient-to-r from-indigo-50/70 to-blue-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm shadow-sm">
                          <i className="fa-solid fa-crown text-amber-300"></i>
                        </div>
                        <div>
                          <div className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                            Own Brand Products
                          </div>
                          <div className="font-black text-indigo-950 text-sm">
                            {s.own_brand_count} Original Products
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                        <span>★</span> <span className="text-gray-700">{s.rating || 5.0}</span>
                      </span>
                    </div>

                    {/* Store Info Specs */}
                    <div className="text-xs space-y-1.5 text-gray-600">
                      {s.address_line && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Address:</span>
                          <span className="font-semibold text-gray-800 truncate max-w-[200px]">{s.address_line}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Category:</span>
                        <span className="font-semibold text-gray-800">{s.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Credit Terms:</span>
                        <span className="font-bold text-purple-800">
                          {s.credit_allowed ? `${s.credit_days || 14} Days Net Credit` : 'Instant Pay'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Store */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setStoreFilter(s.id);
                        setViewMode('products');
                        window.scrollTo({ top: 200, behavior: 'smooth' });
                      }}
                      className="btn-primary flex-1 !text-xs !py-2.5 flex items-center justify-center gap-1.5 font-black shadow-sm"
                    >
                      <i className="fa-solid fa-boxes-stacked"></i>
                      <span>View Products ({s.own_brand_count})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('map');
                        setTimeout(() => focusStoreOnMap(s), 300);
                      }}
                      className="btn-soft !text-xs !py-2.5 !px-3 font-bold text-indigo-700 hover:bg-indigo-50 border border-indigo-200"
                      title="View on Map"
                    >
                      <i className="fa-solid fa-map-location-dot"></i>
                    </button>
                    <Link
                      to="/messages"
                      className="btn-soft !text-xs !py-2.5 !px-3 flex items-center justify-center text-gray-600 hover:text-indigo-700"
                      title="Message Store Owner"
                    >
                      <i className="fa-solid fa-comment-dots"></i>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: INTERACTIVE LEAFLET MAP */}
      {!loading && viewMode === 'map' && (
        <div className="space-y-4">
          <div className="card p-4 bg-white border border-gray-200 space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-gray-900 text-base flex items-center gap-1.5">
                    <i className="fa-solid fa-map-location-dot text-indigo-600"></i>
                    <span>Own Brand Manufacturer Map</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
                    {filteredStores.length} Partner Creators Plotted
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Interactive map showing locations of verified partner stores manufacturing own-brand products. Click pins to inspect catalogs.
                </p>
              </div>

              {/* Map Legend (ADAB Brand Colors: Green base, Indigo kirana, Dashed zone) */}
              <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-600 flex-wrap bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white shadow-sm inline-block"></span>
                  <span>Your Store</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-indigo-700 border border-white shadow-sm inline-block"></span>
                  <span>Partner Kirana</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border border-dashed border-emerald-500 bg-emerald-100/50 inline-block"></span>
                  <span>Network Radius</span>
                </span>
              </div>
            </div>

            {/* Leaflet Map Div */}
            <div
              ref={mapContainerRef}
              className="w-full h-[520px] rounded-xl border border-gray-200 overflow-hidden relative shadow-inner bg-gray-50 z-0"
            />
          </div>

          {/* Drawer of Plotted Stores under Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                Stores on Map ({filteredStores.length})
              </h4>
              <span className="text-[11px] text-gray-400">Click a store card to focus pin</span>
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
                        <i className="fa-solid fa-location-dot text-indigo-600"></i>
                        <span>{s.city || 'Local Area'} · <b>{s.distance_km || 3} km</b> away</span>
                      </div>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                        s.is_online ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {s.is_online ? '● Open' : '○ Closed'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                    <span className="text-gray-700">
                      Own Brands: <strong className="text-indigo-700">{s.own_brand_count} products</strong>
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
                      className="btn-soft !text-[11px] !py-1.5 flex-1 flex items-center justify-center gap-1 font-bold text-indigo-700"
                    >
                      <i className="fa-solid fa-crosshairs"></i>
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
                      <span>Products ({s.own_brand_count})</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: MY RESALE CATALOG (ALREADY ADDED ITEMS) */}
      {!loading && viewMode === 'resale' && (
        <div className="card p-5 space-y-4 bg-white shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-tag text-amber-600"></i>
                <span>Partner Store Brands in Your Active Store Catalog</span>
              </h3>
              <p className="text-xs text-gray-500">
                These are other sellers' own-brand items that you have cloned into your retail shop with your custom selling markup.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold self-start sm:self-auto">
              {myAdded.length} items active for resale
            </span>
          </div>

          {myAdded.length === 0 ? (
            <div className="p-10 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-3">
              <i className="fa-solid fa-shop text-gray-300 text-3xl"></i>
              <p>You haven't added any partner store brands to your catalog yet.</p>
              <button
                type="button"
                onClick={() => setViewMode('products')}
                className="btn-primary !text-xs !py-2 !px-4 font-bold"
              >
                Browse Brands to Resell
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5 font-bold">Product</th>
                    <th className="px-3 py-2.5 font-bold">Maker Store</th>
                    <th className="px-3 py-2.5 font-bold">Wholesale Cost</th>
                    <th className="px-3 py-2.5 font-bold">Your Retail Price</th>
                    <th className="px-3 py-2.5 font-bold">Your Profit Margin</th>
                    <th className="px-3 py-2.5 font-bold">Catalog Stock</th>
                    <th className="px-3 py-2.5 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myAdded.map((item) => {
                    const wholesale = Number(item.wholesale_price || 0);
                    const sell = Number(item.sell_price || 0);
                    const profit = sell - wholesale;
                    const marginPct = sell > 0 ? Math.round((profit / sell) * 100) : 0;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition">
                        <td className="px-3 py-3 font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="w-9 h-9 rounded-lg object-contain bg-white border border-gray-200 p-0.5 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 font-black text-xs">
                                {item.brand_tag ? item.brand_tag.charAt(0) : 'B'}
                              </div>
                            )}
                            <div>
                              <span>{item.title}</span>
                              {item.brand_tag && (
                                <span className="ml-1 text-[10px] text-amber-700 font-semibold">({item.brand_tag})</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          <span className="font-semibold text-gray-800">{item.original_store_name || 'Partner Store'}</span>
                          <span className="text-gray-400 block text-[11px]">{item.original_store_city}</span>
                        </td>
                        <td className="px-3 py-3 text-gray-500 font-medium">₹{wholesale}</td>
                        <td className="px-3 py-3 font-black text-emerald-700">₹{sell}</td>
                        <td className="px-3 py-3">
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                            +₹{profit} ({marginPct}%)
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-700">{item.stock_qty} {item.unit || 'pcs'}</td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => handleAddToCart({
                              id: item.id,
                              title: item.title,
                              price: wholesale,
                              mrp: item.mrp || sell,
                              store_name: item.original_store_name,
                              unit: item.unit
                            })}
                            className="btn-soft !text-xs !py-1.5 !px-3 font-bold flex items-center gap-1 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 shadow-sm"
                            title="Restock more units into Purchase Cart"
                          >
                            <i className="fa-solid fa-cart-plus"></i> Restock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW: MY STOCK REQUESTS (B2B RESALE AUTHORIZATION & PURCHASE REQUESTS) */}
      {!loading && viewMode === 'requests' && (
        <div className="card p-5 space-y-4 bg-white shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-clipboard-check text-teal-600"></i>
                <span>My Resale Authorization & Stock Requests</span>
              </h3>
              <p className="text-xs text-gray-500">
                Track requests sent to Own Brand makers. Zero money is deducted until approved. Once approved, click "Pay & Activate" to instantly stock in your store catalog!
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Link
                to="/partner?source=OTHER_STORE_BRANDS"
                className="btn-primary !text-xs !py-1.5 !px-3 font-bold flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white shadow-xs"
              >
                <i className="fa-solid fa-store"></i>
                <span>Open in B2B Store Orders</span>
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              </Link>
              <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-900 border border-teal-200 text-xs font-bold">
                {myPurchaseOrders.length} orders
              </span>
            </div>
          </div>

          {myPurchaseOrders.length === 0 ? (
            <div className="p-10 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-3">
              <i className="fa-solid fa-file-signature text-gray-300 text-3xl"></i>
              <p className="text-sm font-bold text-gray-700">No resale authorization requests submitted yet.</p>
              <p className="text-gray-400 max-w-md mx-auto">
                Explore authentic Own Brands from partner stores in the "Products" tab and click "Request to Stock & Sell".
              </p>
              <button
                type="button"
                onClick={() => setViewMode('products')}
                className="btn-primary !text-xs !py-2 !px-4 font-bold"
              >
                Browse Brands to Request Stock
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myPurchaseOrders.map((po) => {
                const isRequested = po.status === 'REQUESTED' || po.status === 'PENDING_APPROVAL';
                const isApproved = po.status === 'APPROVED';
                const isDeclined = po.status === 'DECLINED';
                const isConfirmed = po.status === 'CONFIRMED' || po.status === 'COMPLETED' || po.status === 'PLACED';
                const items = Array.isArray(po.items) ? po.items : [];
                const isProcessing = processingOrderId === po.id;

                return (
                  <div
                    key={po.id}
                    className={`p-4 rounded-2xl border transition space-y-3 ${
                      isApproved
                        ? 'border-emerald-300 bg-emerald-50/20 shadow-sm'
                        : isDeclined
                        ? 'border-rose-200 bg-rose-50/10'
                        : isRequested
                        ? 'border-amber-200 bg-amber-50/15'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                          #{po.po_number}
                        </span>
                        <span className="text-xs text-gray-500 font-semibold">
                          Maker: <strong className="text-gray-800">{po.supplier_name || 'Brand Partner'}</strong> ({po.supplier_city || 'Local Hub'})
                        </span>
                        <span className="text-xs text-gray-400">
                          · {new Date(po.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Status Badges */}
                      <div>
                        {isRequested && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black flex items-center gap-1.5 shadow-sm">
                            <i className="fa-solid fa-hourglass-half text-amber-600 animate-spin text-[10px]"></i>
                            <span>Awaiting Maker Approval</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-black flex items-center gap-1.5 shadow-sm animate-pulse">
                            <i className="fa-solid fa-circle-check text-emerald-600"></i>
                            <span>Approved by Maker! Ready to Activate</span>
                          </span>
                        )}
                        {isDeclined && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-xs font-black flex items-center gap-1.5">
                            <i className="fa-solid fa-circle-xmark text-rose-600"></i>
                            <span>Request Declined</span>
                          </span>
                        )}
                        {isConfirmed && (
                          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300 text-xs font-black flex items-center gap-1.5">
                            <i className="fa-solid fa-box text-blue-600"></i>
                            <span>Stocked & Active in Catalog</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                      {items.map((it, idx) => (
                        <div key={it.id || idx} className="flex items-center justify-between gap-3 p-2.5 bg-gray-50/80 rounded-xl border border-gray-100 text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            {it.image_url ? (
                              <img src={it.image_url} alt={it.item_name} className="w-12 h-12 rounded-lg object-contain bg-white border border-gray-200 p-0.5 shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-black text-sm shrink-0">
                                {it.brand ? it.brand.charAt(0) : 'B'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h5 className="font-bold text-gray-900 truncate">{it.item_name}</h5>
                              <div className="text-[11px] text-gray-500">
                                Requested Qty: <strong>{it.quantity} {it.unit || 'pcs'}</strong> · Wholesale: ₹{Number(it.price || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-black text-gray-900 text-sm">₹{Number(it.total || (it.quantity * it.price) || 0).toFixed(2)}</div>
                            {it.resale_sell_price && (
                              <div className="text-[11px] text-emerald-700 font-extrabold">
                                Planned Resale: ₹{Number(it.resale_sell_price).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Notes & Terms info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500 pt-1">
                      <div>
                        <span>Payment Terms: </span>
                        <strong className="text-purple-800">
                          {po.payment_terms === 'CREDIT_14D' ? '14-Day Free Kirana Credit' : (po.payment_terms === 'ADVANCE_UPI' ? 'Instant UPI / Bank' : (po.payment_terms || 'Credit'))}
                        </strong>
                        {po.notes && (
                          <span className="block text-[11px] text-gray-400 italic mt-0.5">
                            Note: "{po.notes}"
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-gray-400 font-semibold mr-1">Total Wholesale Value:</span>
                        <span className="font-black text-base text-gray-900">₹{Number(po.total_amount).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Callouts & Action Buttons based on status */}
                    {isApproved && (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-xs text-emerald-900 space-y-0.5">
                          <div className="font-bold flex items-center gap-1.5">
                            <i className="fa-solid fa-sparkles text-emerald-600"></i>
                            <span>Manufacturer authorized your resale!</span>
                          </div>
                          <p className="text-[11px] text-emerald-700">
                            Confirm your {po.payment_terms === 'CREDIT_14D' ? '14-Day Free Credit' : 'Payment'} now to automatically stock real inventory in your catalog for customers.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handlePayAndActivate(po)}
                          className="px-4 py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
                        >
                          {isProcessing ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fa-solid fa-bolt"></i>
                          )}
                          <span>
                            {po.payment_terms === 'CREDIT_14D' ? 'Activate on 14-Day Credit' : `Pay & Activate (₹${po.total_amount})`}
                          </span>
                        </button>
                      </div>
                    )}

                    {isDeclined && (
                      <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900">
                        <div className="font-bold flex items-center gap-1.5">
                          <i className="fa-solid fa-triangle-exclamation text-rose-600"></i>
                          <span>Manufacturer Feedback:</span>
                        </div>
                        <p className="text-[11px] text-rose-700 mt-0.5">
                          "{po.rejection_reason || 'Manufacturer declined this resale request at this time.'}"
                        </p>
                      </div>
                    )}

                    {isConfirmed && (
                      <div className="flex justify-end pt-1">
                        <Link
                          to="/products"
                          className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                        >
                          <span>Manage Stock in Catalog</span>
                          <i className="fa-solid fa-arrow-right"></i>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}



      {/* PRODUCT DETAIL & QUICK BUY MODAL (Amazon-Style Rich Modal in ADAB Harmonized Theme) */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl fade-in max-h-[92vh] overflow-y-auto border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-black uppercase tracking-wide">
                    Verified Own Brand Private Label
                  </span>
                  {detailProduct.brand_tag && (
                    <span className="text-xs font-black text-amber-600">
                      Brand: {detailProduct.brand_tag}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 leading-tight">
                  {detailProduct.title || detailProduct.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl p-1 transition"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* 2-Column Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column: Image Preview + Gallery */}
              <div className="space-y-3">
                <div className="w-full h-64 bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl border border-gray-200 overflow-hidden relative flex items-center justify-center p-3">
                  {selectedModalImage ? (
                    <img
                      src={selectedModalImage}
                      alt={detailProduct.title || detailProduct.name}
                      className="w-full h-full object-contain hover:scale-105 transition duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`flex flex-col items-center justify-center text-gray-400 ${
                      selectedModalImage ? 'hidden' : 'flex'
                    }`}
                  >
                    <div className="w-20 h-20 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-4xl mb-2 shadow-inner">
                      <i className="fa-solid fa-crown"></i>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {detailProduct.brand_tag || 'Own Brand'}
                    </span>
                  </div>

                  {detailProduct.brand_tag && (
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black shadow-sm">
                      {detailProduct.brand_tag}
                    </span>
                  )}
                  <span className="absolute bottom-3 right-3 text-[10px] font-mono text-gray-400 bg-white/90 px-2 py-0.5 rounded border border-gray-200">
                    ID: {detailProduct.id ? detailProduct.id.slice(0, 8) : 'PROD'}
                  </span>
                </div>

                {/* Multiple Images Gallery Thumbnails (if any) */}
                {Array.isArray(detailProduct.images) && detailProduct.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {detailProduct.images.map((imgUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedModalImage(imgUrl)}
                        className={`w-14 h-14 rounded-xl border p-1 bg-white shrink-0 overflow-hidden transition ${
                          selectedModalImage === imgUrl ? 'border-emerald-600 ring-2 ring-emerald-100' : 'border-gray-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Trust Badges */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                    <i className="fa-solid fa-shield-halved text-emerald-600 text-sm"></i>
                    <span>Verified Manufacturer</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                    <i className="fa-solid fa-truck-fast text-blue-600 text-sm"></i>
                    <span>Doorstep Logistics</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Pricing, Specs, Maker & Actions */}
              <div className="space-y-4">
                {/* Price Box */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5">
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                    Wholesale Restock Rate
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-emerald-800">
                      ₹{Number(detailProduct.wholesale_price || detailProduct.price || 0).toLocaleString('en-IN')}
                    </span>
                    {detailProduct.mrp && Number(detailProduct.mrp) > Number(detailProduct.wholesale_price || detailProduct.price) && (
                      <span className="text-sm text-gray-400 line-through">
                        MRP ₹{Number(detailProduct.mrp).toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 font-medium">/ {detailProduct.unit || 'unit'}</span>
                  </div>

                  {detailProduct.mrp && Number(detailProduct.mrp) > Number(detailProduct.wholesale_price || detailProduct.price) && (
                    <div className="inline-block px-2.5 py-0.5 rounded-md bg-amber-500 text-white text-[11px] font-black">
                      Save ₹{(Number(detailProduct.mrp) - Number(detailProduct.wholesale_price || detailProduct.price)).toFixed(0)} per unit (
                      {Math.round(
                        ((Number(detailProduct.mrp) - Number(detailProduct.wholesale_price || detailProduct.price)) /
                          Number(detailProduct.mrp)) *
                          100
                      )}
                      % Retail Margin)
                    </div>
                  )}
                </div>

                {/* Specs Table */}
                <div className="text-xs space-y-2 border-y border-gray-100 py-3 text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Minimum Order Quantity (MOQ):</span>
                    <span className="font-bold text-gray-900">
                      {detailProduct.min_order || detailProduct.min_order_qty || 1} {detailProduct.unit || 'units'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Producer Hub Stock:</span>
                    <span className="font-bold text-emerald-700">
                      ● In Stock ({detailProduct.stock_qty || 50} units ready for dispatch)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category:</span>
                    <span className="font-bold text-gray-900">{detailProduct.category || 'General'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Credit Policy:</span>
                    <span className="font-bold text-purple-700">
                      {detailProduct.credit_allowed !== false
                        ? `${detailProduct.credit_days || 14} Days Zero-Interest Net Credit`
                        : 'Cash / Instant UPI'}
                    </span>
                  </div>
                </div>

                {/* Maker Store Info Card */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                      <i className="fa-solid fa-store"></i>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-xs sm:text-sm">
                        {detailProduct.store_name}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {detailProduct.store_city || 'Nearby Store'} · {detailProduct.distance_km || 3} km away
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                    ● Online Producer
                  </span>
                </div>

                {/* Quantity Selector & Dynamic Total */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center border border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setDetailQty((prev) =>
                          Math.max(Number(detailProduct.min_order || detailProduct.min_order_qty || 1), prev - 1)
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
                      ₹{(detailQty * Number(detailProduct.wholesale_price || detailProduct.price || 0)).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Unified Single Action in Modal */}
                <div className="pt-2">
                  {(() => {
                    const isAdded = myAdded.some(
                      (m) => m.original_listing_id === detailProduct.id || m.title === (detailProduct.title || detailProduct.name)
                    );
                    return (
                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => {
                          if (isAdded) return;
                          const p = detailProduct;
                          const q = detailQty;
                          setDetailProduct(null);
                          openAddModal(p, q);
                        }}
                        className={`w-full py-3.5 rounded-2xl font-black text-sm transition flex items-center justify-center gap-2 shadow-md border ${
                          isAdded
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white border-transparent hover:shadow-lg'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <i className="fa-solid fa-circle-check text-emerald-600 text-base"></i>
                            <span>Already Active in Your Store Catalog</span>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-bolt text-amber-300 text-base"></i>
                            <span>Request Authorization & Stock ({detailQty} {detailProduct.unit || 'units'})</span>
                          </>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD TO MY STORE (RESALE) MODAL (ADAB Amber Catalog Theme with Smart Margin Presets & Loss Prevention) */}
      {addModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl fade-in border border-amber-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-wide bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                    B2B Resale Authorization
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    Wholesale Restock & Retail
                  </span>
                </div>
                <h3 className="font-black text-lg text-gray-900 leading-tight mt-1.5">
                  Request Authorization & Stock
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Request <strong>{addModalProduct.store_name}</strong> to authorize stocking <strong>{addModalProduct.title || addModalProduct.name}</strong> in your store.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                className="text-gray-400 hover:text-gray-600 text-xl p-1"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Manufacturer Product Specs Snapshot */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                🔒 Manufacturer Product Snapshot
              </div>
              <div className="grid grid-cols-2 gap-2 text-gray-700">
                <div>
                  <span className="text-gray-500 block text-[11px]">Brand Label:</span>
                  <strong className="text-purple-900">{addModalProduct.brand_tag || 'Own Brand'}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Category:</span>
                  <strong>{addModalProduct.category || 'General'}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Wholesale Restock Rate:</span>
                  <strong className="text-emerald-800 font-black text-sm">
                    ₹{addModalProduct.wholesale_price || addModalProduct.price || 0} / {addModalProduct.unit || 'unit'}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Printed Maximum MRP:</span>
                  <strong className="text-gray-900 font-bold">
                    {addModalProduct.mrp ? `₹${addModalProduct.mrp}` : 'Not Specified'}
                  </strong>
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmRequest} className="space-y-4">
              {/* Requested Quantity */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-800">
                    Stock Quantity to Request *
                  </label>
                  <span className="text-[11px] text-gray-400">
                    MOQ: {addModalProduct.min_order_qty || addModalProduct.min_order || 1} {addModalProduct.unit || 'units'}
                  </span>
                </div>
                <input
                  type="number"
                  min={addModalProduct.min_order_qty || addModalProduct.min_order || 1}
                  required
                  value={customStock}
                  onChange={(e) => setCustomStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 outline-none focus:border-amber-500 bg-white"
                />
                <div className="flex justify-between items-center text-[11px] text-gray-500 mt-1">
                  <span>Total Wholesale Value:</span>
                  <strong className="text-emerald-800 font-black">
                    ₹{(
                      (Number(customStock) || 0) *
                      Number(addModalProduct.wholesale_price || addModalProduct.price || 0)
                    ).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {/* Selling Price Input with Margin Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-800">
                    Your Planned Consumer Retail Price (₹) *
                  </label>
                  {/* Smart Margin Presets */}
                  {Number(addModalProduct.wholesale_price || addModalProduct.price || 0) > 0 && (
                    <div className="flex items-center gap-1">
                      {[15, 25, 35].map((pct) => {
                        const baseCost = Number(addModalProduct.wholesale_price || addModalProduct.price || 0);
                        const calcPrice = Math.round(baseCost * (1 + pct / 100));
                        const maxMrp = Number(addModalProduct.mrp || 0);
                        const effectivePreset = maxMrp > 0 && calcPrice > maxMrp ? maxMrp : calcPrice;
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setCustomPrice(effectivePreset.toString())}
                            className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
                            title={`Set price with ${pct}% retail margin`}
                          >
                            +{pct}%
                          </button>
                        );
                      })}
                      {addModalProduct.mrp && (
                        <button
                          type="button"
                          onClick={() => setCustomPrice(String(addModalProduct.mrp))}
                          className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition"
                          title="Match Printed MRP"
                        >
                          MRP
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm font-black text-emerald-900 outline-none focus:border-amber-500 bg-white"
                    placeholder="e.g. 750"
                  />
                </div>

                {/* Validation and Margin Live Preview */}
                {(() => {
                  const pNum = Number(customPrice);
                  const wNum = Number(addModalProduct.wholesale_price || addModalProduct.price || 0);
                  const mrpNum = Number(addModalProduct.mrp || 0);

                  if (mrpNum > 0 && pNum > mrpNum) {
                    return (
                      <div className="p-2 bg-red-50 text-red-700 text-[11px] font-bold rounded-lg border border-red-200 flex items-center gap-1.5">
                        <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                        <span>Cannot exceed printed MRP (₹{mrpNum}) per Indian retail regulations!</span>
                      </div>
                    );
                  }

                  if (wNum > 0 && pNum > 0 && pNum < wNum) {
                    return (
                      <div className="p-2 bg-amber-50 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200 flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-exclamation text-amber-600"></i>
                        <span>Warning: Selling price is below wholesale cost (₹{wNum}). You will incur a loss.</span>
                      </div>
                    );
                  }

                  if (wNum > 0 && pNum >= wNum) {
                    const profit = pNum - wNum;
                    const margin = pNum > 0 ? Math.round((profit / pNum) * 100) : 0;
                    return (
                      <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold">
                        <span>Your Unit Profit: <strong>₹{profit.toFixed(2)}</strong></span>
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                          {margin}% Margin
                        </span>
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>

              {/* Payment Terms Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  Preferred Payment Terms *
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition ${
                    paymentTerms === 'CREDIT_14D'
                      ? 'border-purple-500 bg-purple-50/50 text-purple-950 font-bold'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="payment_terms"
                      value="CREDIT_14D"
                      checked={paymentTerms === 'CREDIT_14D'}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="text-purple-600"
                    />
                    <div>
                      <div className="font-bold">14-Day Free Credit</div>
                      <div className="text-[10px] text-gray-400">Zero upfront cost</div>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition ${
                    paymentTerms === 'ADVANCE_UPI' || paymentTerms === 'UPI'
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="payment_terms"
                      value="ADVANCE_UPI"
                      checked={paymentTerms === 'ADVANCE_UPI' || paymentTerms === 'UPI'}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="text-emerald-600"
                    />
                    <div>
                      <div className="font-bold">Instant UPI / Bank</div>
                      <div className="text-[10px] text-gray-400">Pay upon approval</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes to Producer */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Note to Brand Producer (Optional)
                </label>
                <textarea
                  rows="2"
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="e.g. Requesting initial stock for our kirana store customers in Ahmedabad..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:border-amber-500"
                />
              </div>

              {/* Zero-Upfront Transparency Banner */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5 text-emerald-800">
                  <i className="fa-solid fa-shield-check text-emerald-600"></i>
                  <span>Zero Upfront Charge Guarantee</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  No payment is processed now. Your request is sent directly to <strong>{addModalProduct.store_name}</strong>. Only after they review and click "Approve", you will be prompted to activate and pay.
                </p>
                <p className="text-[10px] text-gray-500 pt-0.5 border-t border-emerald-200/50">
                  🔒 In compliance with platform rules, your listing will be published exclusively to retail consumers (<code className="text-emerald-800">wholesale_price = NULL</code>).
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="btn-soft flex-1 !text-xs !py-2.5 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (addModalProduct.mrp && Number(customPrice) > Number(addModalProduct.mrp))}
                  className="btn-primary flex-1 !text-xs !py-2.5 flex items-center justify-center gap-1.5 font-black shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-paper-plane"></i>
                  )}
                  <span>Submit Resale & Stock Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BRAND DISTRIBUTION ANALYTICS & RESELLER ACCESS MODAL (For Brand Creators) */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl fade-in max-h-[92vh] overflow-y-auto border border-purple-100">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
                  Creator Analytics & Access
                </span>
                <h3 className="font-black text-xl text-gray-900 mt-1 flex items-center gap-2">
                  <i className="fa-solid fa-chart-line text-purple-600"></i>
                  <span>Your Brand Distribution Network</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Approve incoming stock requests from partner stores and control which stores are authorized to resell your private label.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAnalyticsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl p-1"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-1">
                <span className="text-[11px] font-bold text-indigo-700">Partner Stores</span>
                <div className="text-2xl font-black text-indigo-950">
                  {analyticsData?.total_buyer_stores || 0}
                </div>
                <span className="text-[10px] text-indigo-600">Stocking your brands</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-1">
                <span className="text-[11px] font-bold text-emerald-700">Wholesale Orders</span>
                <div className="text-2xl font-black text-emerald-950">
                  {analyticsData?.total_b2b_orders || 0}
                </div>
                <span className="text-[10px] text-emerald-600">B2B Purchase Orders</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 space-y-1">
                <span className="text-[11px] font-bold text-amber-700">Units Supplied</span>
                <div className="text-2xl font-black text-amber-950">
                  {analyticsData?.total_b2b_units_sold || 0}
                </div>
                <span className="text-[10px] text-amber-600">Units dispatched</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100 space-y-1">
                <span className="text-[11px] font-bold text-purple-700">B2B Revenue</span>
                <div className="text-2xl font-black text-purple-950">
                  ₹{Number(analyticsData?.total_b2b_revenue || 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-purple-600">Gross wholesale sales</span>
              </div>
            </div>

            {/* SECTION 1: INCOMING RESALE REQUESTS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-gray-800 tracking-wide flex items-center gap-1.5">
                  <i className="fa-solid fa-inbox text-purple-600"></i>
                  <span>Incoming Resale Requests from Stores ({incomingRequests.length})</span>
                </h4>
                <span className="text-[11px] text-gray-400">
                  {incomingRequests.filter((r) => r.status === 'REQUESTED').length} awaiting your action
                </span>
              </div>

              {incomingRequests.length === 0 ? (
                <div className="p-5 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  No incoming resale requests at this time. When other kiranas request to stock your brand, they will appear here for your approval.
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {incomingRequests.map((req) => {
                    const isPending = req.status === 'REQUESTED' || req.status === 'PENDING_APPROVAL';
                    const isApproved = req.status === 'APPROVED';
                    const isDeclined = req.status === 'DECLINED';
                    const items = Array.isArray(req.items) ? req.items : [];
                    const isProcessing = processingOrderId === req.id;

                    return (
                      <div
                        key={req.id}
                        className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                          isPending
                            ? 'border-amber-200 bg-amber-50/30'
                            : isApproved
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : 'border-gray-200 bg-gray-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-gray-900">{req.buyer_store_name}</span>
                              <span className="text-xs text-gray-400">({req.buyer_store_city || 'City'})</span>
                              <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                ★ {req.buyer_rating || 5.0}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              Phone: {req.buyer_store_phone || 'N/A'} · Order #{req.po_number}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-black text-gray-900 block">
                              ₹{Number(req.total_amount).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-purple-700 font-bold">
                              {req.payment_terms === 'CREDIT_14D' ? '14-Day Credit' : (req.payment_terms || 'Credit')}
                            </span>
                          </div>
                        </div>

                        {/* Items in request */}
                        <div className="space-y-1">
                          {items.map((it, idx) => (
                            <div key={it.id || idx} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-gray-100">
                              <span className="font-bold text-gray-800 truncate max-w-[280px]">
                                {it.item_name} × {it.quantity} {it.unit || 'pcs'}
                              </span>
                              <div className="text-right text-[11px]">
                                <span className="text-gray-500 mr-2">Wholesale: ₹{Number(it.wholesale_price).toFixed(2)}</span>
                                {it.resale_sell_price && (
                                  <span className="text-emerald-700 font-bold">
                                    Planned Retail: ₹{Number(it.resale_sell_price).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {req.notes && (
                          <div className="text-[11px] text-gray-500 italic bg-white/70 px-2.5 py-1 rounded-lg border border-gray-100">
                            Note from store: "{req.notes}"
                          </div>
                        )}

                        {/* Actions for this incoming request */}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-200/50">
                          <div>
                            {isPending && (
                              <span className="text-[11px] font-black text-amber-700 flex items-center gap-1">
                                <i className="fa-solid fa-clock text-amber-500"></i>
                                <span>Awaiting Your Approval</span>
                              </span>
                            )}
                            {isApproved && (
                              <span className="text-[11px] font-black text-emerald-700 flex items-center gap-1">
                                <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                <span>Approved (Waiting for store payment/dispatch)</span>
                              </span>
                            )}
                            {isDeclined && (
                              <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                                <i className="fa-solid fa-circle-xmark"></i>
                                <span>Declined: {req.rejection_reason}</span>
                              </span>
                            )}
                          </div>

                          {isPending && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleDeclineRequest(req.id)}
                                className="px-3 py-1.5 rounded-xl font-bold text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-50"
                              >
                                Decline
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleApproveRequest(req.id)}
                                className="px-3.5 py-1.5 rounded-xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {isProcessing ? (
                                  <i className="fa-solid fa-spinner fa-spin"></i>
                                ) : (
                                  <i className="fa-solid fa-check"></i>
                                )}
                                <span>Approve Request</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 2: TOP PARTNER STORES & ACCESS CONTROLS (BLOCK / UNBLOCK) */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-gray-700 tracking-wide flex items-center gap-1.5">
                  <i className="fa-solid fa-store text-indigo-600"></i>
                  <span>Partner Stores & Reseller Access</span>
                </h4>
                <span className="text-[11px] text-gray-400">
                  Control which stores can buy and sell your Own Brands
                </span>
              </div>

              {analyticsData?.partner_stores && analyticsData.partner_stores.length > 0 ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2">Partner Store</th>
                        <th className="px-3 py-2">Location</th>
                        <th className="px-3 py-2 text-center">Active Listings</th>
                        <th className="px-3 py-2 text-right">Access Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {analyticsData.partner_stores.map((ps) => {
                        const isBlocked = ps.is_blocked === true;
                        return (
                          <tr key={ps.store_id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-bold text-gray-900">
                              <div className="flex items-center gap-2">
                                <span>{ps.store_name}</span>
                                {isBlocked && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-200">
                                    BLOCKED
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-gray-500">{ps.city}</td>
                            <td className="px-3 py-2 text-center font-black text-indigo-700">
                              {ps.active_resale_listings}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {isBlocked ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBlockStore(ps.store_id, false)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                                  title="Unblock this store so they can purchase your brand"
                                >
                                  Unblock Store
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBlockStore(ps.store_id, true)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                                  title="Block this store from ordering or requesting your brand"
                                >
                                  Block Reseller
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No partner stores have resold your own brand products yet. Ensure your Own Brand products have "B2B Open" enabled in your catalog!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IN-APPLICATION CONFIRMATION MODAL FOR PAY & ACTIVATE */}
      {confirmingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl fade-in border border-emerald-100">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-black shadow-inner">
                  <i className="fa-solid fa-bolt text-emerald-600"></i>
                </div>
                <div>
                  <h3 className="font-black text-lg text-gray-900 leading-snug">
                    Confirm Resale Stock & Activation
                  </h3>
                  <p className="text-xs text-gray-500">
                    Order #{confirmingOrder.po_number} · Authorized by Maker
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingOrder(null)}
                className="text-gray-400 hover:text-gray-600 text-xl p-1"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Summary details card */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-2.5">
              <div className="flex justify-between items-center text-gray-600">
                <span className="font-semibold">Supplier Store:</span>
                <span className="font-bold text-gray-900">{confirmingOrder.supplier_store_name || 'Brand Manufacturer'}</span>
              </div>

              {Array.isArray(confirmingOrder.items) && confirmingOrder.items.length > 0 && (
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-semibold">Product & Qty:</span>
                  <span className="font-bold text-gray-900">
                    {confirmingOrder.items[0].item_name} ({confirmingOrder.items[0].quantity} {confirmingOrder.items[0].unit || 'units'})
                  </span>
                </div>
              )}

              {Array.isArray(confirmingOrder.items) && confirmingOrder.items[0]?.resale_sell_price && (
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-semibold">Your Planned Resale Price:</span>
                  <span className="font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    ₹{confirmingOrder.items[0].resale_sell_price} / unit
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-gray-600 pt-1 border-t border-gray-200">
                <span className="font-semibold">Payment Terms:</span>
                <span className="font-black text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {confirmingOrder.payment_terms === 'CREDIT_14D' ? '14-Day Free Kirana Credit' : 'Instant UPI / Bank'}
                </span>
              </div>

              <div className="flex justify-between items-baseline pt-1 border-t border-gray-200">
                <span className="font-bold text-gray-700 text-sm">Total Wholesale Value:</span>
                <span className="font-black text-emerald-800 text-xl">
                  ₹{Number(confirmingOrder.total_amount).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Auto-Publish Guarantee Banner */}
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <i className="fa-solid fa-circle-check text-emerald-600"></i>
                <span>Instant Auto-Publish to Store Catalog</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Upon confirmation, this product will be <strong>automatically published</strong> in your catalog with real stock. In accordance with platform policy, it is locked to retail consumers only (<code className="text-emerald-800 font-bold">wholesale_price = NULL</code>).
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingOrder(null)}
                className="btn-soft flex-1 !py-2.5 !text-xs font-bold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingOrderId === confirmingOrder.id}
                onClick={executeConfirmAndPay}
                className="btn-primary flex-1 !py-2.5 !text-xs font-black flex items-center justify-center gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {processingOrderId === confirmingOrder.id ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Activating...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-bolt"></i>
                    <span>Confirm & Activate in Store</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
