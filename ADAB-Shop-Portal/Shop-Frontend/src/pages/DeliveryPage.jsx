import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useSeller } from '../context/SellerContext';
import { useOrders } from '../hooks/useOrders';

export default function DeliveryPage() {
  const { store, onboardingData, saveOnboardingStep } = useSeller();
  const { orders } = useOrders();

  const dCfg = onboardingData?.deliveryConfig || {};
  const rawInitialRadius = store?.delivery_radius_km ?? dCfg.delivery_radius_km ?? 10;
  const initialRadius = String(
    Number.isFinite(Number(rawInitialRadius))
      ? Math.min(20, Math.max(0, Math.round(Number(rawInitialRadius))))
      : 10
  );

  const [radius, setRadius] = useState(initialRadius);
  const [fastDelivery, setFastDelivery] = useState(
    dCfg.delivFast !== undefined ? Boolean(dCfg.delivFast) : true
  );
  const [sameDay, setSameDay] = useState(
    dCfg.delivSame !== undefined ? Boolean(dCfg.delivSame) : true
  );
  const [scheduledDelivery, setScheduledDelivery] = useState(
    dCfg.delivScheduled !== undefined ? Boolean(dCfg.delivScheduled) : true
  );
  const [pickup, setPickup] = useState(
    dCfg.delivPickup !== undefined ? Boolean(dCfg.delivPickup) : true
  );

  const [porter, setPorter] = useState(
    dCfg.porter !== undefined ? Boolean(dCfg.porter) : true
  );
  const [delhivery, setDelhivery] = useState(
    dCfg.delhivery !== undefined ? Boolean(dCfg.delhivery) : true
  );
  const [exportFreight, setExportFreight] = useState(
    dCfg.exportFreight !== undefined ? Boolean(dCfg.exportFreight) : false
  );

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Keep synced whenever store or onboardingData.deliveryConfig updates (e.g. from KYC Step 4)
  useEffect(() => {
    const cfg = onboardingData?.deliveryConfig || {};
    const r = store?.delivery_radius_km ?? cfg.delivery_radius_km;
    if (r !== undefined && r !== null && Number.isFinite(Number(r))) {
      setRadius(String(Math.min(20, Math.max(0, Math.round(Number(r))))));
    }
    if (cfg.delivFast !== undefined) setFastDelivery(Boolean(cfg.delivFast));
    if (cfg.delivSame !== undefined) setSameDay(Boolean(cfg.delivSame));
    if (cfg.delivScheduled !== undefined) setScheduledDelivery(Boolean(cfg.delivScheduled));
    if (cfg.delivPickup !== undefined) setPickup(Boolean(cfg.delivPickup));
    if (cfg.porter !== undefined) setPorter(Boolean(cfg.porter));
    if (cfg.delhivery !== undefined) setDelhivery(Boolean(cfg.delhivery));
    if (cfg.exportFreight !== undefined) setExportFreight(Boolean(cfg.exportFreight));
  }, [store, onboardingData]);

  const parsedRadius = Number(radius);
  const radiusVal = Number.isFinite(parsedRadius)
    ? Math.min(20, Math.max(0, Math.round(parsedRadius)))
    : 10;

  const storeName = store?.store_name || 'Your Store';
  const storeCity = store?.city || 'Surat';
  const storeLat = Number(store?.latitude) || 21.1702;
  const storeLng = Number(store?.longitude) || 72.8311;
  const activeOrdersCount = Array.isArray(orders) ? orders.length : 0;

  // Interactive Leaflet Map Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const circleInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  // Initialize Leaflet Map once on mount / store coordinates change
  useEffect(() => {
    if (!mapContainerRef.current) return;
    try {
      const leaflet = typeof window !== 'undefined' ? window.L || L : null;
      if (!leaflet || !leaflet.map) return;

      const map = leaflet
        .map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: false
        })
        .setView([storeLat, storeLng], 12);

      leaflet
        .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18
        })
        .addTo(map);

      // Delivery Zone Radius Circle
      const circle = leaflet
        .circle([storeLat, storeLng], {
          radius: radiusVal * 1000,
          color: '#F97316',
          fillColor: '#22C55E',
          fillOpacity: 0.12,
          weight: 2.5,
          dashArray: '6 4'
        })
        .addTo(map);

      // Store Marker Pin
      const storeIcon = leaflet.divIcon({
        className: 'border-0 bg-transparent',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
        html: '<div style="width:32px;height:32px;background:#15803D;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2.5px solid white;cursor:pointer;"><i class="fa-solid fa-store"></i></div>'
      });

      const marker = leaflet
        .marker([storeLat, storeLng], { icon: storeIcon })
        .addTo(map)
        .bindPopup(
          `<b>${storeName}</b><br>${storeCity} • <b>${radiusVal} km</b> delivery zone`
        );

      mapInstanceRef.current = map;
      circleInstanceRef.current = circle;
      markerInstanceRef.current = marker;

      if (radiusVal > 0 && circle.getBounds) {
        map.fitBounds(circle.getBounds(), { padding: [20, 20], maxZoom: 14 });
      } else {
        map.setView([storeLat, storeLng], 14);
      }

      return () => {
        map.remove();
        mapInstanceRef.current = null;
        circleInstanceRef.current = null;
        markerInstanceRef.current = null;
      };
    } catch (e) {
      console.warn('Map initialization skipped:', e);
    }
  }, [storeLat, storeLng, storeName, storeCity]);

  // Smoothly update Leaflet circle radius & zoom whenever radiusVal changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const circle = circleInstanceRef.current;
    const marker = markerInstanceRef.current;
    if (!map || !circle) return;

    try {
      circle.setRadius(radiusVal * 1000);
      if (marker) {
        marker.setPopupContent(
          `<b>${storeName}</b><br>${storeCity} • <b>${radiusVal} km</b> delivery zone`
        );
      }
      if (radiusVal > 0 && circle.getBounds) {
        map.fitBounds(circle.getBounds(), { padding: [20, 20], maxZoom: 14 });
      } else {
        map.setView([storeLat, storeLng], 15);
      }
    } catch (e) {
      // Ignore fitBounds errors in non-DOM test environments
    }
  }, [radiusVal, storeLat, storeLng, storeName, storeCity]);

  const handleSave = async (customMessage) => {
    setErrorMsg('');
    if (!fastDelivery && !sameDay && !scheduledDelivery && !pickup) {
      setErrorMsg('Please select at least one Hyperlocal Delivery Channel before saving.');
      return;
    }

    try {
      setSaving(true);
      const openTime = store?.open_time
        ? String(store.open_time).slice(0, 5)
        : dCfg.open_time || '08:00';
      const closeTime = store?.close_time
        ? String(store.close_time).slice(0, 5)
        : dCfg.close_time || '22:00';

      if (saveOnboardingStep) {
        await saveOnboardingStep(4, {
          open_time: openTime,
          close_time: closeTime,
          delivery_radius_km: radiusVal,
          delivFast: fastDelivery,
          delivSame: sameDay,
          delivScheduled: scheduledDelivery,
          delivPickup: pickup,
          fleet: dCfg.fleet || 'SELF',
          porter,
          delhivery,
          exportFreight
        });
      }

      setSavedMsg(
        customMessage ||
          `Delivery zone (${radiusVal}km) & channels saved and synced with Store KYC!`
      );
      setTimeout(() => setSavedMsg(''), 3500);
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Failed to save delivery configuration');
    } finally {
      setSaving(false);
    }
  };

  const noChannelSelected = !fastDelivery && !sameDay && !scheduledDelivery && !pickup;

  return (
    <section id="sec-delivery" className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Delivery Zones &amp; Fleet Settings</h1>
          <p className="text-sm text-gray-500">
            Hyperlocal customer radius &amp; map • Delivery channels &amp; B2B logistics (Synced with Store KYC)
          </p>
        </div>
        <button
          type="button"
          disabled={saving || noChannelSelected}
          onClick={() => handleSave()}
          className="btn-primary !text-xs !py-2.5 !px-4 font-extrabold self-start sm:self-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fa-solid fa-floppy-disk mr-1.5"></i>
          {saving ? 'Saving...' : 'Save All Delivery Settings'}
        </button>
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

      {/* 1. TOP SECTION: DELIVERY ZONES & COVERAGE (Above Delivery Fleet Cards) */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 border-2 border-green-200">
          <h2 className="font-bold text-green-800 mb-1 flex items-center gap-1.5">
            <i className="fa-solid fa-mobile-screen"></i>
            <span>Customer App Zone (Hyperlocal)</span>
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
                  className={`h-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-extrabold text-xs rounded-xl flex items-center transition-all duration-150 shadow-sm ${
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

            {/* Live Leaflet Map Service */}
            <div className="relative h-52 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
              <div ref={mapContainerRef} className="w-full h-full z-0"></div>
            </div>
          </div>

          <button
            type="button"
            disabled={saving || noChannelSelected}
            onClick={() => handleSave(`Delivery radius updated to ${radiusVal} km and synced with Store KYC!`)}
            className="btn-primary !text-xs w-full mt-3.5 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Zone Radius'}
          </button>
        </div>

        <div className="card p-5 border-2 border-green-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-green-800 flex items-center gap-1.5">
                <i className="fa-solid fa-users text-green-700"></i>
                <span>For App Customers (Hyperlocal)</span>
              </h2>
              {noChannelSelected && (
                <span className="text-[10px] font-extrabold text-rose-600">
                  Select at least 1 channel
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Only visible to customers inside your <b>{radiusVal} km</b> operating zone
            </p>
            <div className="space-y-3">
              <label className="p-4 rounded-xl border-2 border-orange-200 bg-orange-50 flex justify-between items-center cursor-pointer">
                <div>
                  <div className="font-bold text-orange-900">⚡ Express (Under 1h)</div>
                  <div className="text-xs text-gray-600 mt-1">Bike dispatch for immediate essentials</div>
                </div>
                <input
                  type="checkbox"
                  checked={fastDelivery}
                  onChange={(e) => setFastDelivery(e.target.checked)}
                  className="w-5 h-5 text-orange-600 rounded"
                />
              </label>
              <label className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50 flex justify-between items-center cursor-pointer">
                <div>
                  <div className="font-bold text-blue-900">🚚 Same-Day</div>
                  <div className="text-xs text-gray-600 mt-1">Same-day city delivery</div>
                </div>
                <input
                  type="checkbox"
                  checked={sameDay}
                  onChange={(e) => setSameDay(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>
              <label className="p-4 rounded-xl border-2 border-green-200 bg-green-50 flex justify-between items-center cursor-pointer">
                <div>
                  <div className="font-bold text-green-900">📅 Scheduled Hours</div>
                  <div className="text-xs text-gray-600 mt-1">Morning / Evening slot delivery</div>
                </div>
                <input
                  type="checkbox"
                  checked={scheduledDelivery}
                  onChange={(e) => setScheduledDelivery(e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded"
                />
              </label>
              <label className="p-4 rounded-xl border border-purple-200 bg-purple-50 flex justify-between items-center cursor-pointer">
                <div>
                  <div className="font-bold text-purple-900">🏪 Store Pickup</div>
                  <div className="text-xs text-gray-600 mt-1">Customer collects directly from counter</div>
                </div>
                <input
                  type="checkbox"
                  checked={pickup}
                  onChange={(e) => setPickup(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded"
                />
              </label>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Riders dispatch directly from your shop counter.</p>
        </div>
      </div>

      {/* 2. BOTTOM SECTION: B2B STORE-TO-STORE & FLEET CARDS */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 border-2 border-orange-200 flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-orange-800 mb-1 flex items-center gap-1.5">
              <i className="fa-solid fa-store"></i>
              <span>B2B Store-to-Store (Nationwide / Export)</span>
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

        <div className="card p-5 flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-orange-800 mb-1 flex items-center gap-1.5">
              <i className="fa-solid fa-store text-orange-600"></i>
              <span>For B2B Store Orders (Intercity &amp; Bulk)</span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">Utilizes commercial truck &amp; freight carriers</p>
            <div className="space-y-3">
              <label className="p-4 rounded-xl border border-gray-200 flex justify-between items-center cursor-pointer">
                <div>
                  <div className="font-bold text-gray-900">Porter (Intra-city LCV)</div>
                  <div className="text-xs text-gray-500 mt-1">Same city wholesale • 2–6 hours</div>
                </div>
                <input
                  type="checkbox"
                  checked={porter}
                  onChange={(e) => setPorter(e.target.checked)}
                  className="w-5 h-5 text-green-700 rounded"
                />
              </label>
              <label className="p-4 rounded-xl border border-gray-200 flex justify-between items-center cursor-pointer">
                <div>
                  <div className="font-bold text-gray-900">Delhivery &amp; Express Cargo</div>
                  <div className="text-xs text-gray-500 mt-1">Nationwide surface express • 1–3 days</div>
                </div>
                <input
                  type="checkbox"
                  checked={delhivery}
                  onChange={(e) => setDelhivery(e.target.checked)}
                  className="w-5 h-5 text-green-700 rounded"
                />
              </label>
              <label className="p-4 rounded-xl border border-gray-200 flex justify-between items-center cursor-pointer">
                <div>
                  <div className="font-bold text-gray-900">Export Freight (Air / Sea)</div>
                  <div className="text-xs text-gray-500 mt-1">International shipments (requires IEC)</div>
                </div>
                <input
                  type="checkbox"
                  checked={exportFreight}
                  onChange={(e) => setExportFreight(e.target.checked)}
                  className="w-5 h-5 text-green-700 rounded"
                />
              </label>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-blue-50 text-xs text-blue-800">
            <i className="fa-solid fa-circle-info mr-1"></i>
            <b>Automatic Fallback:</b> When your riders are busy, ADAB automatically dispatches fleet partners.
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={saving || noChannelSelected}
        onClick={() => handleSave()}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save Delivery Configuration'}
      </button>
    </section>
  );
}
