import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSeller } from '../context/SellerContext';
import { useOrders } from '../hooks/useOrders';

const DEFAULT_RATES = {
  fast: 49,
  sameDay: 29,
  scheduled: 19,
  pickup: 0,
  porter: 250,
  delhivery: 450,
  exportFreight: 2500
};

const toCleanRate = (val, fallback) => {
  if (val === '' || val === null || val === undefined) return fallback;
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? Number(n.toFixed(2)) : fallback;
};

const extractBaseline = (storeObj, obData) => {
  const cfg = obData?.deliveryConfig || {};
  const rawR = storeObj?.delivery_radius_km ?? cfg.delivery_radius_km ?? 10;
  const r = Number.isFinite(Number(rawR))
    ? Math.min(20, Math.max(0, Math.round(Number(rawR))))
    : 10;

  const rawLat = storeObj?.latitude != null ? Number(storeObj.latitude) : (cfg.latitude != null ? Number(cfg.latitude) : null);
  const rawLng = storeObj?.longitude != null ? Number(storeObj.longitude) : (cfg.longitude != null ? Number(cfg.longitude) : null);
  const lat = Number.isFinite(rawLat) ? Number(rawLat.toFixed(7)) : 21.1702;
  const lng = Number.isFinite(rawLng) ? Number(rawLng.toFixed(7)) : 72.8311;

  return {
    lat,
    lng,
    radius: r,
    fastDelivery: cfg.delivFast !== undefined ? Boolean(cfg.delivFast) : true,
    sameDay: cfg.delivSame !== undefined ? Boolean(cfg.delivSame) : true,
    scheduledDelivery: cfg.delivScheduled !== undefined ? Boolean(cfg.delivScheduled) : true,
    pickup: cfg.delivPickup !== undefined ? Boolean(cfg.delivPickup) : true,
    porter: cfg.porter !== undefined ? Boolean(cfg.porter) : true,
    delhivery: cfg.delhivery !== undefined ? Boolean(cfg.delhivery) : true,
    exportFreight: cfg.exportFreight !== undefined ? Boolean(cfg.exportFreight) : false,
    fastRate: toCleanRate(cfg.delivFastRate, DEFAULT_RATES.fast),
    sameDayRate: toCleanRate(cfg.delivSameRate, DEFAULT_RATES.sameDay),
    scheduledRate: toCleanRate(cfg.delivScheduledRate, DEFAULT_RATES.scheduled),
    pickupRate: toCleanRate(cfg.delivPickupRate, DEFAULT_RATES.pickup),
    porterRate: toCleanRate(cfg.porterRate, DEFAULT_RATES.porter),
    delhiveryRate: toCleanRate(cfg.delhiveryRate, DEFAULT_RATES.delhivery),
    exportFreightRate: toCleanRate(cfg.exportFreightRate, DEFAULT_RATES.exportFreight)
  };
};

export default function DeliveryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { store, onboardingData, saveOnboardingStep } = useSeller();
  const { orders } = useOrders();

  const initialBaseline = extractBaseline(store, onboardingData);
  const [savedBaseline, setSavedBaseline] = useState(initialBaseline);

  // Dynamic store location state (movable on map)
  const [currentLat, setCurrentLat] = useState(initialBaseline.lat);
  const [currentLng, setCurrentLng] = useState(initialBaseline.lng);

  const [radius, setRadius] = useState(String(initialBaseline.radius));
  const [fastDelivery, setFastDelivery] = useState(initialBaseline.fastDelivery);
  const [sameDay, setSameDay] = useState(initialBaseline.sameDay);
  const [scheduledDelivery, setScheduledDelivery] = useState(initialBaseline.scheduledDelivery);
  const [pickup, setPickup] = useState(initialBaseline.pickup);

  const [porter, setPorter] = useState(initialBaseline.porter);
  const [delhivery, setDelhivery] = useState(initialBaseline.delhivery);
  const [exportFreight, setExportFreight] = useState(initialBaseline.exportFreight);

  // Seller-defined rates (₹) for all Customer & B2B delivery modes
  const [fastRate, setFastRate] = useState(String(initialBaseline.fastRate));
  const [sameDayRate, setSameDayRate] = useState(String(initialBaseline.sameDayRate));
  const [scheduledRate, setScheduledRate] = useState(String(initialBaseline.scheduledRate));
  const [pickupRate, setPickupRate] = useState(String(initialBaseline.pickupRate));
  const [porterRate, setPorterRate] = useState(String(initialBaseline.porterRate));
  const [delhiveryRate, setDelhiveryRate] = useState(String(initialBaseline.delhiveryRate));
  const [exportFreightRate, setExportFreightRate] = useState(String(initialBaseline.exportFreightRate));

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Navigation guard modal state when buffered changes exist
  const [pendingNavPath, setPendingNavPath] = useState(null);
  const [pendingNavLabel, setPendingNavLabel] = useState('');

  const parsedRadius = Number(radius);
  const radiusVal = Number.isFinite(parsedRadius)
    ? Math.min(20, Math.max(0, Math.round(parsedRadius)))
    : 10;

  const isLocationChanged =
    Math.abs(currentLat - savedBaseline.lat) > 0.00001 ||
    Math.abs(currentLng - savedBaseline.lng) > 0.00001;

  // Compute dirty state against saved baseline
  const hasUnsavedChanges =
    isLocationChanged ||
    radiusVal !== savedBaseline.radius ||
    fastDelivery !== savedBaseline.fastDelivery ||
    sameDay !== savedBaseline.sameDay ||
    scheduledDelivery !== savedBaseline.scheduledDelivery ||
    pickup !== savedBaseline.pickup ||
    porter !== savedBaseline.porter ||
    delhivery !== savedBaseline.delhivery ||
    exportFreight !== savedBaseline.exportFreight ||
    toCleanRate(fastRate, 49) !== savedBaseline.fastRate ||
    toCleanRate(sameDayRate, 29) !== savedBaseline.sameDayRate ||
    toCleanRate(scheduledRate, 19) !== savedBaseline.scheduledRate ||
    toCleanRate(pickupRate, 0) !== savedBaseline.pickupRate ||
    toCleanRate(porterRate, 250) !== savedBaseline.porterRate ||
    toCleanRate(delhiveryRate, 450) !== savedBaseline.delhiveryRate ||
    toCleanRate(exportFreightRate, 2500) !== savedBaseline.exportFreightRate;

  const hasUnsavedRef = useRef(hasUnsavedChanges);
  hasUnsavedRef.current = hasUnsavedChanges;

  // Keep synced whenever store or onboardingData.deliveryConfig updates from DB (only when buffer is clean)
  useEffect(() => {
    if (hasUnsavedRef.current) return;
    const nextBase = extractBaseline(store, onboardingData);
    setSavedBaseline(nextBase);
    setCurrentLat(nextBase.lat);
    setCurrentLng(nextBase.lng);
    setRadius(String(nextBase.radius));
    setFastDelivery(nextBase.fastDelivery);
    setSameDay(nextBase.sameDay);
    setScheduledDelivery(nextBase.scheduledDelivery);
    setPickup(nextBase.pickup);
    setPorter(nextBase.porter);
    setDelhivery(nextBase.delhivery);
    setExportFreight(nextBase.exportFreight);
    setFastRate(String(nextBase.fastRate));
    setSameDayRate(String(nextBase.sameDayRate));
    setScheduledRate(String(nextBase.scheduledRate));
    setPickupRate(String(nextBase.pickupRate));
    setPorterRate(String(nextBase.porterRate));
    setDelhiveryRate(String(nextBase.delhiveryRate));
    setExportFreightRate(String(nextBase.exportFreightRate));
  }, [store, onboardingData]);

  // Intercept internal link navigation & browser tab close when there are unsaved buffer changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handleDocumentClick = (e) => {
      if (!hasUnsavedRef.current) return;
      const anchor = e.target?.closest?.('a[href]');
      if (!anchor) return;
      if (anchor.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        const targetDest = `${url.pathname}${url.search}${url.hash}`;
        const currentDest = `${location.pathname}${location.search}${location.hash}`;
        if (url.pathname === location.pathname && targetDest === currentDest) return;

        e.preventDefault();
        e.stopPropagation();
        const labelText = (anchor.textContent || '').trim().replace(/\s+/g, ' ');
        setPendingNavLabel(labelText || url.pathname);
        setPendingNavPath(targetDest);
      } catch (err) {
        // Ignore malformed URLs
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [hasUnsavedChanges, location.pathname, location.search, location.hash]);

  const handleResetPinLocation = () => {
    setCurrentLat(savedBaseline.lat);
    setCurrentLng(savedBaseline.lng);
    if (markerInstanceRef.current && circleInstanceRef.current && mapInstanceRef.current) {
      markerInstanceRef.current.setLatLng([savedBaseline.lat, savedBaseline.lng]);
      circleInstanceRef.current.setLatLng([savedBaseline.lat, savedBaseline.lng]);
      mapInstanceRef.current.panTo([savedBaseline.lat, savedBaseline.lng]);
      markerInstanceRef.current.bindPopup(
        `<b>${storeName}</b><br>${storeCity} • <b>${radiusVal} km</b> delivery zone<br><span style="color:#15803D;font-weight:bold;font-size:11px;">🖐️ Drag pin to adjust location</span>`
      ).openPopup();
    }
  };

  const handleResetChanges = () => {
    setCurrentLat(savedBaseline.lat);
    setCurrentLng(savedBaseline.lng);
    if (markerInstanceRef.current && circleInstanceRef.current && mapInstanceRef.current) {
      markerInstanceRef.current.setLatLng([savedBaseline.lat, savedBaseline.lng]);
      circleInstanceRef.current.setLatLng([savedBaseline.lat, savedBaseline.lng]);
      mapInstanceRef.current.setView([savedBaseline.lat, savedBaseline.lng], 13);
    }
    setRadius(String(savedBaseline.radius));
    setFastDelivery(savedBaseline.fastDelivery);
    setSameDay(savedBaseline.sameDay);
    setScheduledDelivery(savedBaseline.scheduledDelivery);
    setPickup(savedBaseline.pickup);
    setPorter(savedBaseline.porter);
    setDelhivery(savedBaseline.delhivery);
    setExportFreight(savedBaseline.exportFreight);
    setFastRate(String(savedBaseline.fastRate));
    setSameDayRate(String(savedBaseline.sameDayRate));
    setScheduledRate(String(savedBaseline.scheduledRate));
    setPickupRate(String(savedBaseline.pickupRate));
    setPorterRate(String(savedBaseline.porterRate));
    setDelhiveryRate(String(savedBaseline.delhiveryRate));
    setExportFreightRate(String(savedBaseline.exportFreightRate));
    setErrorMsg('');
  };

  const storeName = store?.store_name || 'Your Store';
  const storeCity = store?.city || 'Surat';
  const activeOrdersCount = Array.isArray(orders) ? orders.length : 0;

  // Interactive Leaflet Map & Section Refs
  const sectionRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const circleInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  // Native non-passive wheel listener so scrolling over rate boxes or radius slider never scrolls the page
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const handleNativeWheel = (e) => {
      const target = e.target;
      if (target && typeof target.closest === 'function' && target.closest('[data-no-page-scroll="true"]')) {
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  // Initialize Leaflet Map once on mount / when store loads
  useEffect(() => {
    if (!mapContainerRef.current) return;
    try {
      const leaflet = typeof window !== 'undefined' ? window.L || L : null;
      if (!leaflet || !leaflet.map) return;

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
        .setView([currentLat, currentLng], 12);

      leaflet
        .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18
        })
        .addTo(map);

      // Delivery Zone Radius Circle
      const circle = leaflet
        .circle([currentLat, currentLng], {
          radius: radiusVal * 1000,
          color: '#F97316',
          fillColor: '#22C55E',
          fillOpacity: 0.12,
          weight: 2.5,
          dashArray: '6 4'
        })
        .addTo(map);

      // Store Marker Pin (draggable only)
      const storeIcon = leaflet.divIcon({
        className: 'border-0 bg-transparent',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
        html: '<div style="width:32px;height:32px;background:#15803D;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2.5px solid white;cursor:grab;"><i class="fa-solid fa-store"></i></div>'
      });

      const marker = leaflet
        .marker([currentLat, currentLng], { icon: storeIcon, draggable: true })
        .addTo(map)
        .bindPopup(
          `<b>${storeName}</b><br>${storeCity} • <b>${radiusVal} km</b> delivery zone<br><span style="color:#15803D;font-weight:bold;font-size:11px;">🖐️ Drag pin to adjust location</span>`
        );

      marker.on('drag', (e) => {
        const pos = e.target.getLatLng();
        if (circleInstanceRef.current) {
          circleInstanceRef.current.setLatLng(pos);
        }
      });

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        const newLat = Number(pos.lat.toFixed(7));
        const newLng = Number(pos.lng.toFixed(7));
        setCurrentLat(newLat);
        setCurrentLng(newLng);
        if (circleInstanceRef.current) {
          circleInstanceRef.current.setLatLng([newLat, newLng]);
        }
        marker.bindPopup(
          `<b>${storeName}</b><br>📍 Location: ${newLat.toFixed(5)}, ${newLng.toFixed(5)}<br><span style="color:#15803D;font-weight:bold;font-size:11px;">Click "Save Delivery Settings" to apply</span>`
        ).openPopup();
      });

      mapInstanceRef.current = map;
      circleInstanceRef.current = circle;
      markerInstanceRef.current = marker;

      if (radiusVal > 0 && circle.getBounds) {
        try {
          map.fitBounds(circle.getBounds(), { padding: [20, 20], maxZoom: 14 });
        } catch (_) {}
      } else {
        map.setView([currentLat, currentLng], 14);
      }

      // Invalidate map size so Leaflet tiles render reliably after mount
      const invalidateTimer = setTimeout(() => {
        try {
          map.invalidateSize();
        } catch (_) {}
      }, 150);

      return () => {
        clearTimeout(invalidateTimer);
        try {
          map.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
        circleInstanceRef.current = null;
        markerInstanceRef.current = null;
        if (mapContainerRef.current && mapContainerRef.current._leaflet_id) {
          delete mapContainerRef.current._leaflet_id;
        }
      };
    } catch (e) {
      console.warn('Map initialization skipped:', e);
    }
  }, [store?.id]);

  // Sync map center, marker & circle if coordinates change externally when buffer is clean
  useEffect(() => {
    if (hasUnsavedRef.current) return;
    if (markerInstanceRef.current && circleInstanceRef.current && mapInstanceRef.current) {
      markerInstanceRef.current.setLatLng([savedBaseline.lat, savedBaseline.lng]);
      circleInstanceRef.current.setLatLng([savedBaseline.lat, savedBaseline.lng]);
      mapInstanceRef.current.panTo([savedBaseline.lat, savedBaseline.lng]);
    }
  }, [savedBaseline.lat, savedBaseline.lng]);

  // Smoothly update Leaflet circle radius & bounds whenever radiusVal changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const circle = circleInstanceRef.current;
    const marker = markerInstanceRef.current;
    if (!map || !circle) return;

    try {
      circle.setRadius(radiusVal * 1000);
      if (marker) {
        marker.setPopupContent(
          `<b>${storeName}</b><br>${storeCity} • <b>${radiusVal} km</b> delivery zone<br><span style="color:#15803D;font-weight:bold;font-size:11px;">🖐️ Drag pin to adjust location</span>`
        );
      }
      if (radiusVal > 0 && circle.getBounds) {
        map.fitBounds(circle.getBounds(), { padding: [20, 20], maxZoom: 14 });
      }
    } catch (e) {
      // Ignore fitBounds errors in non-DOM test environments
    }
  }, [radiusVal, storeName, storeCity]);

  const handleRateWheel = (e, currentVal, setter, stepAmount, enabled) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof document !== 'undefined' && document.activeElement?.type === 'number') {
      document.activeElement.blur();
    }
    const delta = e.deltaY < 0 ? stepAmount : -stepAmount;
    const base = Number.isFinite(Number(currentVal)) ? Number(currentVal) : 0;
    const next = Math.max(0, Math.round(base + delta));
    setter(String(next));
  };

  const handleSave = async (customMessage) => {
    setErrorMsg('');
    if (!fastDelivery && !sameDay && !scheduledDelivery && !pickup) {
      setErrorMsg('Please select at least one Customer Delivery Channel before saving.');
      return false;
    }

    const nextSnapshot = {
      lat: currentLat,
      lng: currentLng,
      radius: radiusVal,
      fastDelivery,
      sameDay,
      scheduledDelivery,
      pickup,
      porter,
      delhivery,
      exportFreight,
      fastRate: toCleanRate(fastRate, 49),
      sameDayRate: toCleanRate(sameDayRate, 29),
      scheduledRate: toCleanRate(scheduledRate, 19),
      pickupRate: toCleanRate(pickupRate, 0),
      porterRate: toCleanRate(porterRate, 250),
      delhiveryRate: toCleanRate(delhiveryRate, 450),
      exportFreightRate: toCleanRate(exportFreightRate, 2500)
    };

    try {
      setSaving(true);
      const openTime = store?.open_time
        ? String(store.open_time).slice(0, 5)
        : onboardingData?.deliveryConfig?.open_time || '08:00';
      const closeTime = store?.close_time
        ? String(store.close_time).slice(0, 5)
        : onboardingData?.deliveryConfig?.close_time || '22:00';

      // Optimistically mark baseline clean so incoming SellerContext update doesn't conflict
      hasUnsavedRef.current = false;
      setSavedBaseline(nextSnapshot);

      if (saveOnboardingStep) {
        await saveOnboardingStep(4, {
          latitude: currentLat,
          longitude: currentLng,
          open_time: openTime,
          close_time: closeTime,
          delivery_radius_km: nextSnapshot.radius,
          delivFast: nextSnapshot.fastDelivery,
          delivSame: nextSnapshot.sameDay,
          delivScheduled: nextSnapshot.scheduledDelivery,
          delivPickup: nextSnapshot.pickup,
          delivFastRate: nextSnapshot.fastRate,
          delivSameRate: nextSnapshot.sameDayRate,
          delivScheduledRate: nextSnapshot.scheduledRate,
          delivPickupRate: nextSnapshot.pickupRate,
          fleet: onboardingData?.deliveryConfig?.fleet || 'SELF',
          porter: nextSnapshot.porter,
          delhivery: nextSnapshot.delhivery,
          exportFreight: nextSnapshot.exportFreight,
          porterRate: nextSnapshot.porterRate,
          delhiveryRate: nextSnapshot.delhiveryRate,
          exportFreightRate: nextSnapshot.exportFreightRate
        });
      }

      setSavedMsg(
        customMessage ||
          `Delivery location (${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}), zone (${radiusVal}km) & mode rates saved and synced!`
      );
      setTimeout(() => setSavedMsg(''), 3500);
      return true;
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Failed to save delivery configuration');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleModalSaveAndLeave = async () => {
    const target = pendingNavPath;
    const ok = await handleSave();
    if (ok && target) {
      setPendingNavPath(null);
      setPendingNavLabel('');
      navigate(target);
    }
  };

  const handleModalDiscardAndLeave = () => {
    const target = pendingNavPath;
    hasUnsavedRef.current = false;
    handleResetChanges();
    setPendingNavPath(null);
    setPendingNavLabel('');
    if (target) {
      navigate(target);
    }
  };

  const noChannelSelected = !fastDelivery && !sameDay && !scheduledDelivery && !pickup;

  return (
    <section id="sec-delivery" ref={sectionRef} className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-gray-900">Delivery Zones &amp; Fleet Settings</h1>
          <p className="text-sm text-gray-500 truncate">
            Customer delivery radius, mode rates &amp; B2B logistics (Synced with Store KYC)
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasUnsavedChanges && (
            <button
              type="button"
              disabled={saving}
              onClick={handleResetChanges}
              className="h-10 px-3.5 rounded-xl text-xs font-extrabold border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-rotate-left"></i>
              <span>Discard</span>
            </button>
          )}
          <button
            type="button"
            disabled={!hasUnsavedChanges || saving || noChannelSelected}
            onClick={() => handleSave()}
            className={`h-10 px-4 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-2 transition-colors ${
              hasUnsavedChanges && !noChannelSelected
                ? 'bg-green-700 hover:bg-green-800 border-green-700 text-white shadow-sm ring-2 ring-green-200 cursor-pointer'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Saving...</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                <i className="fa-solid fa-floppy-disk"></i>
                <span>Save Delivery Settings</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-check text-emerald-600"></i>
                <span>All Changes Saved</span>
              </>
            )}
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-emerald-600"></i>
          <span>{savedMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation text-rose-600"></i>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. TOP SECTION: COVERAGE MAP & CUSTOMER DELIVERY MODES + RATES */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Card 1: Store Coverage & Radius Map */}
        <div className="card p-5 border-2 border-green-200">
          <h2 className="font-bold text-green-800 mb-1 flex items-center gap-1.5">
            <i className="fa-solid fa-map-location-dot"></i>
            <span>Store Coverage &amp; Radius Map</span>
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Only customers inside this radius can browse and order from your store catalog
          </p>

          <div className="space-y-3.5">
            {/* Orange Bar / Scroll Selector (0km to 20km) — Synced with Store KYC Step 4 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">App Customer Delivery Radius</label>
                <span className="text-[10px] font-bold text-orange-600">
                  {radiusVal === 0
                    ? 'Pickup Only (0km)'
                    : radiusVal <= 5
                    ? 'Immediate Neighbourhood'
                    : radiusVal <= 12
                    ? 'Standard Town Radius'
                    : 'Wide City Coverage'}
                </span>
              </div>

              <div
                data-no-page-scroll="true"
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY < 0 ? 1 : -1;
                  const next = Math.min(20, Math.max(0, radiusVal + delta));
                  setRadius(String(next));
                }}
                title="Drag or scroll to adjust delivery radius (0km – 20km)"
                className="relative w-full h-10 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden select-none shadow-inner"
              >
                {/* Orange Fill Bar with White Text */}
                <div
                  className={`h-full bg-orange-500 text-white font-extrabold text-xs rounded-xl flex items-center transition-all duration-150 shadow-sm ${
                    radiusVal === 0 ? 'justify-center' : 'justify-end pr-3'
                  }`}
                  style={{
                    width: `calc(3.25rem + ${(radiusVal / 20).toFixed(4)} * (100% - 3.25rem))`
                  }}
                >
                  <span className="drop-shadow-sm whitespace-nowrap">{radiusVal}km</span>
                </div>

                {/* Interactive Range Slider Overlay */}
                <input
                  id="inpZoneRadius"
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={radiusVal}
                  onChange={(e) => setRadius(e.target.value)}
                  aria-label="App Customer Delivery Radius in kilometers"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10 m-0"
                />
              </div>

              {/* Quick-select scale ticks (0km to 20km) */}
              <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-1 px-0.5 select-none">
                {[0, 5, 10, 15, 20].map((mark) => (
                  <button
                    key={mark}
                    type="button"
                    onClick={() => setRadius(String(mark))}
                    className={`hover:text-orange-600 transition ${
                      radiusVal === mark ? 'text-orange-600 font-extrabold' : ''
                    }`}
                  >
                    {mark}km
                  </button>
                ))}
              </div>
            </div>

            {/* Live Leaflet Map Service with Dynamic Relocation */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-gray-700 flex items-center gap-1">
                    <i className="fa-solid fa-location-dot text-emerald-600"></i> Pin:
                  </span>
                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded border border-gray-200 text-gray-800 font-bold text-[11px]">
                    {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
                  </span>
                  {isLocationChanged && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-200">
                      Moved (Unsaved)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {isLocationChanged && (
                    <button
                      type="button"
                      onClick={handleResetPinLocation}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Reset pin to saved store position"
                    >
                      <i className="fa-solid fa-rotate-left"></i>
                      <span>Reset Pin</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative h-72 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 group">
                <div ref={mapContainerRef} className="w-full h-full z-0"></div>
                <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700 pointer-events-none flex items-center gap-1.5 z-10 shadow-xs">
                  <i className="fa-solid fa-hand-pointer text-emerald-600"></i>
                  <span>Drag store pin to adjust location</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Customer Delivery Modes & Rates */}
        <div className="card p-5 border-2 border-green-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="font-bold text-green-800 flex items-center gap-1.5">
                <i className="fa-solid fa-bolt text-green-700"></i>
                <span>Customer Delivery Modes &amp; Rates</span>
              </h2>
              {noChannelSelected ? (
                <span className="text-xs font-extrabold text-rose-600">
                  Select at least 1 channel
                </span>
              ) : toCleanRate(fastRate, DEFAULT_RATES.fast) === DEFAULT_RATES.fast &&
                toCleanRate(sameDayRate, DEFAULT_RATES.sameDay) === DEFAULT_RATES.sameDay &&
                toCleanRate(scheduledRate, DEFAULT_RATES.scheduled) === DEFAULT_RATES.scheduled &&
                toCleanRate(pickupRate, DEFAULT_RATES.pickup) === DEFAULT_RATES.pickup ? (
                <span className="text-xs font-extrabold text-green-800 bg-green-100 border border-green-300 px-3 py-1 rounded-full shadow-xs">
                  Default Rates (₹) / Order
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    Custom Rates (₹) / Order
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFastRate(String(DEFAULT_RATES.fast));
                      setSameDayRate(String(DEFAULT_RATES.sameDay));
                      setScheduledRate(String(DEFAULT_RATES.scheduled));
                      setPickupRate(String(DEFAULT_RATES.pickup));
                    }}
                    className="text-xs font-extrabold text-green-700 hover:text-green-900 underline cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Toggle delivery options for customers inside your <b>{radiusVal} km</b> zone and scroll or type your fee
            </p>
            <div className="space-y-3">
              {/* Express (Under 1h) */}
              <div
                className={`p-3.5 rounded-xl border-2 border-orange-200 bg-orange-50 flex justify-between items-center gap-3 transition ${
                  !fastDelivery ? 'opacity-60' : ''
                }`}
              >
                <label htmlFor="chk-mode-express" className="cursor-pointer flex-1 min-w-0">
                  <div className="font-bold text-orange-900">⚡ Express (Under 1h)</div>
                  <div className="text-xs text-gray-600 mt-0.5">Bike dispatch for immediate essentials</div>
                </label>
                <div
                  data-no-page-scroll="true"
                  onWheel={(e) => handleRateWheel(e, fastRate, setFastRate, 1, fastDelivery)}
                  className="flex items-center gap-2.5 shrink-0"
                >
                  {Number(fastRate) === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 border border-green-200 text-green-800 text-[10px] font-extrabold">
                      FREE
                    </span>
                  )}
                  <div
                    title="Scroll or type to adjust Express rate (₹)"
                    className="w-24 flex items-center bg-white border border-orange-300 rounded-lg px-2.5 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-orange-400 select-none"
                  >
                    <span className="text-xs font-extrabold text-orange-700 mr-1">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={!fastDelivery}
                      value={fastRate}
                      onChange={(e) => setFastRate(e.target.value)}
                      aria-label="Express (Under 1h) delivery rate"
                      className="w-full text-right text-sm font-extrabold text-gray-900 outline-none bg-transparent disabled:text-gray-400"
                      placeholder="0"
                    />
                  </div>
                  <input
                    id="chk-mode-express"
                    type="checkbox"
                    checked={fastDelivery}
                    onChange={(e) => setFastDelivery(e.target.checked)}
                    className="w-5 h-5 text-orange-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Same-Day */}
              <div
                className={`p-3.5 rounded-xl border-2 border-blue-200 bg-blue-50 flex justify-between items-center gap-3 transition ${
                  !sameDay ? 'opacity-60' : ''
                }`}
              >
                <label htmlFor="chk-mode-sameday" className="cursor-pointer flex-1 min-w-0">
                  <div className="font-bold text-blue-900">🚚 Same-Day</div>
                  <div className="text-xs text-gray-600 mt-0.5">Same-day city delivery</div>
                </label>
                <div
                  data-no-page-scroll="true"
                  onWheel={(e) => handleRateWheel(e, sameDayRate, setSameDayRate, 1, sameDay)}
                  className="flex items-center gap-2.5 shrink-0"
                >
                  {Number(sameDayRate) === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 border border-green-200 text-green-800 text-[10px] font-extrabold">
                      FREE
                    </span>
                  )}
                  <div
                    title="Scroll or type to adjust Same-Day rate (₹)"
                    className="w-24 flex items-center bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-400 select-none"
                  >
                    <span className="text-xs font-extrabold text-blue-700 mr-1">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={!sameDay}
                      value={sameDayRate}
                      onChange={(e) => setSameDayRate(e.target.value)}
                      aria-label="Same-Day delivery rate"
                      className="w-full text-right text-sm font-extrabold text-gray-900 outline-none bg-transparent disabled:text-gray-400"
                      placeholder="0"
                    />
                  </div>
                  <input
                    id="chk-mode-sameday"
                    type="checkbox"
                    checked={sameDay}
                    onChange={(e) => setSameDay(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Scheduled Hours */}
              <div
                className={`p-3.5 rounded-xl border-2 border-green-200 bg-green-50 flex justify-between items-center gap-3 transition ${
                  !scheduledDelivery ? 'opacity-60' : ''
                }`}
              >
                <label htmlFor="chk-mode-scheduled" className="cursor-pointer flex-1 min-w-0">
                  <div className="font-bold text-green-900">📅 Scheduled Hours</div>
                  <div className="text-xs text-gray-600 mt-0.5">Morning / Evening slot delivery</div>
                </label>
                <div
                  data-no-page-scroll="true"
                  onWheel={(e) => handleRateWheel(e, scheduledRate, setScheduledRate, 1, scheduledDelivery)}
                  className="flex items-center gap-2.5 shrink-0"
                >
                  {Number(scheduledRate) === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 border border-green-200 text-green-800 text-[10px] font-extrabold">
                      FREE
                    </span>
                  )}
                  <div
                    title="Scroll or type to adjust Scheduled Hours rate (₹)"
                    className="w-24 flex items-center bg-white border border-green-300 rounded-lg px-2.5 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-green-400 select-none"
                  >
                    <span className="text-xs font-extrabold text-green-700 mr-1">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={!scheduledDelivery}
                      value={scheduledRate}
                      onChange={(e) => setScheduledRate(e.target.value)}
                      aria-label="Scheduled Hours delivery rate"
                      className="w-full text-right text-sm font-extrabold text-gray-900 outline-none bg-transparent disabled:text-gray-400"
                      placeholder="0"
                    />
                  </div>
                  <input
                    id="chk-mode-scheduled"
                    type="checkbox"
                    checked={scheduledDelivery}
                    onChange={(e) => setScheduledDelivery(e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Store Pickup */}
              <div
                className={`p-3.5 rounded-xl border border-purple-200 bg-purple-50 flex justify-between items-center gap-3 transition ${
                  !pickup ? 'opacity-60' : ''
                }`}
              >
                <label htmlFor="chk-mode-pickup" className="cursor-pointer flex-1 min-w-0">
                  <div className="font-bold text-purple-900">🏪 Store Pickup</div>
                  <div className="text-xs text-gray-600 mt-0.5">Customer collects directly from counter</div>
                </label>
                <div
                  data-no-page-scroll="true"
                  onWheel={(e) => handleRateWheel(e, pickupRate, setPickupRate, 1, pickup)}
                  className="flex items-center gap-2.5 shrink-0"
                >
                  {Number(pickupRate) === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 border border-green-200 text-green-800 text-[10px] font-extrabold">
                      FREE
                    </span>
                  )}
                  <div
                    title="Scroll or type to adjust Store Pickup rate (₹)"
                    className="w-24 flex items-center bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-purple-400 select-none"
                  >
                    <span className="text-xs font-extrabold text-purple-700 mr-1">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={!pickup}
                      value={pickupRate}
                      onChange={(e) => setPickupRate(e.target.value)}
                      aria-label="Store Pickup rate"
                      className="w-full text-right text-sm font-extrabold text-gray-900 outline-none bg-transparent disabled:text-gray-400"
                      placeholder="0"
                    />
                  </div>
                  <input
                    id="chk-mode-pickup"
                    type="checkbox"
                    checked={pickup}
                    onChange={(e) => setPickup(e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Riders dispatch directly from your shop counter.</p>
        </div>
      </div>

      {/* 2. BOTTOM SECTION: B2B NETWORK COVERAGE & FREIGHT CARRIER RATES */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Card 3: Nationwide B2B & Export Network */}
        <div className="card p-5 border-2 border-orange-200 flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-orange-800 mb-1 flex items-center gap-1.5">
              <i className="fa-solid fa-earth-asia"></i>
              <span>Nationwide B2B &amp; Export Network</span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Other registered merchants and shops can order wholesale with no radius restriction
            </p>

            <ul className="text-sm space-y-2.5 text-gray-600">
              <li className="flex gap-2">
                <i className="fa-solid fa-check text-green-600 mt-0.5"></i>
                <span>
                  <b>Intracity (&lt;50 km):</b> Porter mini-trucks with same-day delivery
                </span>
              </li>
              <li className="flex gap-2">
                <i className="fa-solid fa-check text-green-600 mt-0.5"></i>
                <span>
                  <b>Interstate:</b> Delhivery freight cargo (2–4 business days)
                </span>
              </li>
              <li className="flex gap-2">
                <i className="fa-solid fa-check text-green-600 mt-0.5"></i>
                <span>
                  <b>Export Trade:</b> Customs cleared air/sea freight logistics
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-6 p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-900">
            <i className="fa-solid fa-shield-halved mr-1"></i>
            <b>Wholesale Protection:</b> B2B pricing and bulk packaging are applied automatically.
          </div>
        </div>

        {/* Card 4: B2B Freight Carriers & Shipping Rates */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="font-bold text-orange-800 flex items-center gap-1.5">
                <i className="fa-solid fa-truck-fast text-orange-600"></i>
                <span>B2B Freight Carriers &amp; Shipping Rates</span>
              </h2>
              {toCleanRate(porterRate, DEFAULT_RATES.porter) === DEFAULT_RATES.porter &&
              toCleanRate(delhiveryRate, DEFAULT_RATES.delhivery) === DEFAULT_RATES.delhivery &&
              toCleanRate(exportFreightRate, DEFAULT_RATES.exportFreight) === DEFAULT_RATES.exportFreight ? (
                <span className="text-xs font-extrabold text-orange-800 bg-orange-100 border border-orange-300 px-3 py-1 rounded-full shadow-xs">
                  Default Base Rates (₹)
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    Custom Base Rates (₹)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPorterRate(String(DEFAULT_RATES.porter));
                      setDelhiveryRate(String(DEFAULT_RATES.delhivery));
                      setExportFreightRate(String(DEFAULT_RATES.exportFreight));
                    }}
                    className="text-xs font-extrabold text-orange-700 hover:text-orange-900 underline cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Enable commercial truck &amp; freight carriers and scroll or type your base shipping charge
            </p>
            <div className="space-y-3">
              {/* Porter (Intra-city LCV) */}
              <div
                className={`p-3.5 rounded-xl border border-gray-200 flex justify-between items-center gap-3 transition ${
                  !porter ? 'opacity-60' : ''
                }`}
              >
                <label htmlFor="chk-mode-porter" className="cursor-pointer flex-1 min-w-0">
                  <div className="font-bold text-gray-900">Porter (Intra-city LCV)</div>
                  <div className="text-xs text-gray-500 mt-0.5">Same city wholesale • 2–6 hours</div>
                </label>
                <div
                  data-no-page-scroll="true"
                  onWheel={(e) => handleRateWheel(e, porterRate, setPorterRate, 10, porter)}
                  className="flex items-center gap-2.5 shrink-0"
                >
                  {Number(porterRate) === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 border border-green-200 text-green-800 text-[10px] font-extrabold">
                      FREE
                    </span>
                  )}
                  <div
                    title="Scroll or type to adjust Porter base shipping rate (₹)"
                    className="w-24 flex items-center bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-orange-400 focus-within:bg-white select-none"
                  >
                    <span className="text-xs font-extrabold text-gray-600 mr-1">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      disabled={!porter}
                      value={porterRate}
                      onChange={(e) => setPorterRate(e.target.value)}
                      aria-label="Porter (Intra-city LCV) base shipping rate"
                      className="w-full text-right text-sm font-extrabold text-gray-900 outline-none bg-transparent disabled:text-gray-400"
                      placeholder="0"
                    />
                  </div>
                  <input
                    id="chk-mode-porter"
                    type="checkbox"
                    checked={porter}
                    onChange={(e) => setPorter(e.target.checked)}
                    className="w-5 h-5 text-green-700 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Delhivery & Express Cargo */}
              <div
                className={`p-3.5 rounded-xl border border-gray-200 flex justify-between items-center gap-3 transition ${
                  !delhivery ? 'opacity-60' : ''
                }`}
              >
                <label htmlFor="chk-mode-delhivery" className="cursor-pointer flex-1 min-w-0">
                  <div className="font-bold text-gray-900">Delhivery &amp; Express Cargo</div>
                  <div className="text-xs text-gray-500 mt-0.5">Nationwide surface express • 1–3 days</div>
                </label>
                <div
                  data-no-page-scroll="true"
                  onWheel={(e) => handleRateWheel(e, delhiveryRate, setDelhiveryRate, 10, delhivery)}
                  className="flex items-center gap-2.5 shrink-0"
                >
                  {Number(delhiveryRate) === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 border border-green-200 text-green-800 text-[10px] font-extrabold">
                      FREE
                    </span>
                  )}
                  <div
                    title="Scroll or type to adjust Delhivery base shipping rate (₹)"
                    className="w-24 flex items-center bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-orange-400 focus-within:bg-white select-none"
                  >
                    <span className="text-xs font-extrabold text-gray-600 mr-1">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      disabled={!delhivery}
                      value={delhiveryRate}
                      onChange={(e) => setDelhiveryRate(e.target.value)}
                      aria-label="Delhivery & Express Cargo base shipping rate"
                      className="w-full text-right text-sm font-extrabold text-gray-900 outline-none bg-transparent disabled:text-gray-400"
                      placeholder="0"
                    />
                  </div>
                  <input
                    id="chk-mode-delhivery"
                    type="checkbox"
                    checked={delhivery}
                    onChange={(e) => setDelhivery(e.target.checked)}
                    className="w-5 h-5 text-green-700 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Export Freight (Air / Sea) */}
              <div
                className={`p-3.5 rounded-xl border border-gray-200 flex justify-between items-center gap-3 transition ${
                  !exportFreight ? 'opacity-60' : ''
                }`}
              >
                <label htmlFor="chk-mode-export" className="cursor-pointer flex-1 min-w-0">
                  <div className="font-bold text-gray-900">Export Freight (Air / Sea)</div>
                  <div className="text-xs text-gray-500 mt-0.5">International shipments (requires IEC)</div>
                </label>
                <div
                  data-no-page-scroll="true"
                  onWheel={(e) => handleRateWheel(e, exportFreightRate, setExportFreightRate, 50, exportFreight)}
                  className="flex items-center gap-2.5 shrink-0"
                >
                  {Number(exportFreightRate) === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 border border-green-200 text-green-800 text-[10px] font-extrabold">
                      FREE
                    </span>
                  )}
                  <div
                    title="Scroll or type to adjust Export Freight base shipping rate (₹)"
                    className="w-24 flex items-center bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-orange-400 focus-within:bg-white select-none"
                  >
                    <span className="text-xs font-extrabold text-gray-600 mr-1">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      disabled={!exportFreight}
                      value={exportFreightRate}
                      onChange={(e) => setExportFreightRate(e.target.value)}
                      aria-label="Export Freight (Air / Sea) base shipping rate"
                      className="w-full text-right text-sm font-extrabold text-gray-900 outline-none bg-transparent disabled:text-gray-400"
                      placeholder="0"
                    />
                  </div>
                  <input
                    id="chk-mode-export"
                    type="checkbox"
                    checked={exportFreight}
                    onChange={(e) => setExportFreight(e.target.checked)}
                    className="w-5 h-5 text-green-700 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-blue-50 text-xs text-blue-800">
            <i className="fa-solid fa-circle-info mr-1"></i>
            <b>Automatic Fallback:</b> When your riders are busy, ADAB automatically dispatches fleet partners.
          </div>
        </div>
      </div>

      {/* UNSAVED CHANGES CONFIRMATION POPUP MODAL */}
      {pendingNavPath && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!saving) {
              setPendingNavPath(null);
              setPendingNavLabel('');
            }
          }}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-lg">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-gray-900">
                  Unsaved Delivery Changes
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  You have unsaved changes to your delivery zone, modes, or rates. Would you like to save them before leaving
                  {pendingNavLabel ? (
                    <>
                      {' '}for <b className="text-gray-800">{pendingNavLabel}</b>
                    </>
                  ) : null}
                  ?
                </p>
              </div>
            </div>

            {noChannelSelected && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                Please enable at least one Customer Delivery Mode before saving, or discard changes to leave.
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setPendingNavPath(null);
                  setPendingNavLabel('');
                }}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Stay on Page
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleModalDiscardAndLeave}
                className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              >
                Discard &amp; Leave
              </button>
              <button
                type="button"
                disabled={saving || noChannelSelected}
                onClick={handleModalSaveAndLeave}
                className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-green-700 hover:bg-green-800 text-white shadow-md disabled:opacity-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                <span>{saving ? 'Saving...' : 'Save & Continue'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
