import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { useSeller } from '../context/SellerContext';
import { useTranslation } from '../context/LanguageContext';
import L from 'leaflet';

function OrderItemsModal({ order, store: propStore, onClose, onUpdateStatus, onDecline, isUpdating = false }) {
  if (!order) return null;
  const { t } = useTranslation();
  const sellerCtx = useSeller();
  const store = propStore || sellerCtx?.store;
  const [submitting, setSubmitting] = useState(false);
  const busy = isUpdating || submitting;
  const mapContainerRef = useRef(null);

  const items = Array.isArray(order.items) ? order.items : [];
  const displayId = order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : '—';
  const displayCustomer = order.customer || order.customer_name || t('colCustomer', 'Customer');
  const displayAmount = order.amount !== undefined ? order.amount : (order.total_amount || 0);
  const addr = order.delivery_address || {};
  const addressString = [addr.address_line, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || t('orderModalNoAddress', 'No delivery address recorded');
  const s = (order.status || 'new').toLowerCase();
  const distance = order.distance != null ? parseFloat(order.distance) : null;

  // Active Store Location and Details from database
  const storeName = store?.store_name || 'Store';
  const hasStoreCoords = store?.latitude != null && store?.longitude != null;
  const storeLat = hasStoreCoords ? Number(store.latitude) : null;
  const storeLng = hasStoreCoords ? Number(store.longitude) : null;
  const radiusKm = Number(store?.delivery_radius_km ?? 0);

  // Exact Customer Coordinates from delivery_address in orders table
  const rawCustLat = addr.latitude ?? addr.lat ?? order.delivery_latitude ?? order.latitude ?? null;
  const rawCustLng = addr.longitude ?? addr.lng ?? order.delivery_longitude ?? order.longitude ?? null;
  const hasCustomerCoords = rawCustLat != null && rawCustLng != null && !isNaN(Number(rawCustLat)) && !isNaN(Number(rawCustLng));
  const custLat = hasCustomerCoords ? Number(rawCustLat) : null;
  const custLng = hasCustomerCoords ? Number(rawCustLng) : null;

  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleCopyAddress = async (e) => {
    if (e) e.stopPropagation();
    const coordsText = hasCustomerCoords ? `\nCoordinates: ${custLat.toFixed(6)}, ${custLng.toFixed(6)}` : '';
    const textToCopy = `${addressString}${coordsText}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.warn('Failed to copy address:', err);
    }
  };

  const deliveryFee = Number(order.delivery_fee ?? 0);
  const discount = Number(order.total_discount ?? 0);
  const itemsSubtotal = Number(order.amount !== undefined ? order.amount : (order.subtotal || 0));
  const totalAmount = order.grand_total != null ? Number(order.grand_total) : (itemsSubtotal + deliveryFee - discount);
  const recordedTax = order.tax_amount != null && !isNaN(Number(order.tax_amount)) ? Number(order.tax_amount) : null;
  const computedTax = Math.round((itemsSubtotal * 5 / 105) * 100) / 100;
  const taxAmount = recordedTax != null ? recordedTax : computedTax;
  const taxableAmount = Math.max(0, Math.round((itemsSubtotal - taxAmount) * 100) / 100);
  const cgst = (taxAmount / 2).toFixed(2);
  const sgst = (taxAmount / 2).toFixed(2);
  const invoiceNumber = order.invoice_number || null;
  const invoicePdfUrl = order.invoice_pdf_url || null;
  const invoiceDate = order.invoice_date 
    ? new Date(order.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
    : (order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null);

  const handleDownloadInvoice = () => {
    const invNum = invoiceNumber || `INV-${(order.order_number || order.id || 'ORD').toString().replace('#', '')}`;
    const invDt = invoiceDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const custName = addr.full_name || displayCustomer;
    const sName = store?.store_name || store?.name || 'Mahadev Supermart';
    const sGst = store?.gstin || store?.gst_number || '24AAACH7409R1ZZ';
    const sAddr = [store?.address_line, store?.city, store?.state, store?.pincode].filter(Boolean).join(', ') || 'Gujarat, India';
    const sPhone = store?.phone || store?.contact_phone || '';

    const itemsRows = items.map((it, idx) => {
      const q = Number(it.quantity) || 1;
      const up = Number(it.unit_price) || 0;
      const tp = Number(it.total_price) || (q * up);
      const itTaxable = Math.round((tp * 100 / 105) * 100) / 100;
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${it.name || 'Item'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${q}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${up.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${itTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">₹${tp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join('');

    const invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${invNum}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 20px; background: #f3f4f6; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .top-actions { max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: flex-end; gap: 10px; }
    .btn { padding: 9px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; border: 1px solid transparent; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn-print { background: #059669; color: white; }
    .btn-print:hover { background: #047857; }
    .btn-close { background: white; color: #374151; border-color: #d1d5db; }
    .btn-close:hover { background: #f9fafb; }
    .header-table { width: 100%; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 20px; }
    .tax-badge { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 12px; }
    .info-box { background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 12px 14px; }
    .info-box h4 { margin: 0 0 6px 0; color: #4b5563; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    table.items-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
    table.items-table th { background: #f3f4f6; color: #4b5563; text-transform: uppercase; font-size: 10px; font-weight: 700; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
    .totals-area { display: flex; justify-content: flex-end; margin-bottom: 24px; font-size: 12px; }
    .totals-table { width: 320px; border-collapse: collapse; }
    .totals-table td { padding: 6px 8px; }
    .totals-table tr.grand-total { border-top: 2px solid #10b981; font-weight: 800; font-size: 14px; color: #065f46; background: #ecfdf5; }
    .footer-note { border-top: 1px dashed #d1d5db; padding-top: 16px; font-size: 11px; color: #6b7280; display: flex; justify-content: space-between; align-items: flex-end; }
    @media print {
      body { background: white; padding: 0; }
      .invoice-card { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="top-actions no-print">
    <button class="btn btn-print" onclick="window.print()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Print / Save as PDF
    </button>
    <button class="btn btn-close" onclick="window.close()">Close</button>
  </div>

  <div class="invoice-card">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <h2 style="margin: 0; color: #065f46; font-size: 22px; font-weight: 800;">${sName}</h2>
          <div style="font-size: 12px; color: #4b5563; margin-top: 4px;">${sAddr}</div>
          ${sPhone ? `<div style="font-size: 12px; color: #4b5563;">Phone: ${sPhone}</div>` : ''}
          <div style="font-size: 12px; font-weight: 700; color: #1f2937; margin-top: 4px;">GSTIN: <span style="font-family: monospace;">${sGst}</span></div>
        </td>
        <td style="text-align: right; vertical-align: top;">
          <div class="tax-badge">Tax Invoice • GST Compliant</div>
          <div style="font-size: 18px; font-weight: 800; font-family: monospace; color: #111827; margin-top: 6px;">${invNum}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Date: <b>${invDt}</b></div>
          <div style="font-size: 12px; color: #6b7280;">Order: <b>${displayId}</b></div>
        </td>
      </tr>
    </table>

    <div class="grid-2">
      <div class="info-box">
        <h4>Billed / Shipped To:</h4>
        <div style="font-weight: 700; color: #111827; font-size: 13px;">${custName}</div>
        <div style="color: #4b5563; margin-top: 3px;">${addressString}</div>
        ${order.customer_phone ? `<div style="color: #4b5563; margin-top: 3px; font-family: monospace;">Phone: ${order.customer_phone}</div>` : ''}
      </div>
      <div class="info-box">
        <h4>Order & Delivery Details:</h4>
        <div style="color: #4b5563;">Delivery Mode: <b style="text-transform: capitalize; color: #111827;">${order.delivery_mode || 'Normal'}</b></div>
        <div style="color: #4b5563; margin-top: 3px;">Payment Method: <b>${(order.payment_method || 'PREPAID').toUpperCase()}</b></div>
        <div style="color: #4b5563; margin-top: 3px;">Payment Status: <b style="color: #059669;">${(order.payment_status || 'PAID').toUpperCase()}</b></div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>Item Description</th>
          <th style="width: 60px; text-align: center;">Qty</th>
          <th style="width: 100px; text-align: right;">Unit Price</th>
          <th style="width: 110px; text-align: right;">Taxable Value</th>
          <th style="width: 110px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows || '<tr><td colspan="6" style="padding: 12px; text-align: center; color: #9ca3af;">No itemized breakdown recorded</td></tr>'}
      </tbody>
    </table>

    <div class="totals-area">
      <table class="totals-table">
        <tr>
          <td style="color: #6b7280;">Taxable Amount:</td>
          <td style="text-align: right; font-weight: 600;">₹${taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="color: #6b7280;">CGST (2.5%):</td>
          <td style="text-align: right; font-weight: 600;">₹${cgst}</td>
        </tr>
        <tr>
          <td style="color: #6b7280;">SGST (2.5%):</td>
          <td style="text-align: right; font-weight: 600;">₹${sgst}</td>
        </tr>
        <tr style="border-top: 1px dashed #e5e7eb;">
          <td style="color: #6b7280; font-weight: 700;">Total GST (5%):</td>
          <td style="text-align: right; font-weight: 700; color: #047857;">₹${taxAmount.toFixed(2)}</td>
        </tr>
        <tr style="border-top: 1px solid #e5e7eb;">
          <td style="color: #6b7280; font-weight: 600;">Items Subtotal:</td>
          <td style="text-align: right; font-weight: 700; color: #111827;">₹${itemsSubtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color: #6b7280;">Delivery Fee:</td>
          <td style="text-align: right; font-weight: 600;">₹${deliveryFee.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color: #6b7280;">Discounts:</td>
          <td style="text-align: right; font-weight: 600; color: ${discount > 0 ? '#059669' : '#6b7280'};">${discount > 0 ? `-₹${discount.toFixed(2)}` : '₹0.00'}</td>
        </tr>
        <tr class="grand-total">
          <td style="padding: 10px 8px;">Total Payable:</td>
          <td style="padding: 10px 8px; text-align: right;">₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>
    </div>

    <div class="footer-note">
      <div>
        <p style="margin: 0; font-weight: 600; color: #374151;">Terms & Conditions:</p>
        <p style="margin: 2px 0 0 0;">1. Goods once sold are covered under ADAB return & refund policies.<br>2. This is a computer-generated tax invoice verified electronically.</p>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 700; color: #111827; margin-bottom: 24px;">For ${sName}</div>
        <div style="font-size: 10px; color: #6b7280; border-top: 1px solid #9ca3af; padding-top: 4px; display: inline-block;">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    if (typeof window !== 'undefined') {
      try {
        const printWin = window.open('', '_blank');
        if (printWin && printWin.document) {
          printWin.document.open();
          printWin.document.write(invoiceHtml);
          printWin.document.close();
          if (printWin.focus) printWin.focus();
          return;
        }
      } catch (err) {
        console.warn('Direct window.open blocked, trying Blob URL:', err);
      }

      // Fallback if popup blocker intercepted empty window.open: open via Blob URL
      try {
        const blob = new Blob([invoiceHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 1000);
      } catch (blobErr) {
        console.warn('Fallback Blob open error:', blobErr);
      }
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || (!hasStoreCoords && !hasCustomerCoords)) return;
    let map = null;
    let timer = null;
    try {
      const leaflet = typeof window !== 'undefined' ? (window.L || L) : null;
      if (!leaflet || !leaflet.map) return;

      const centerLat = hasStoreCoords ? storeLat : custLat;
      const centerLng = hasStoreCoords ? storeLng : custLng;

      map = leaflet.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([centerLat, centerLng], 12);

      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(map);

      if (hasStoreCoords && radiusKm > 0) {
        leaflet.circle([storeLat, storeLng], {
          radius: radiusKm * 1000,
          color: '#22C55E',
          fillColor: '#22C55E',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '6 4'
        }).addTo(map);
      }

      if (hasStoreCoords) {
        const storeIcon = leaflet.divIcon({
          className: 'border-0 bg-transparent',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
          html: '<div style="width:32px;height:32px;background:#15803D;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2.5px solid white;cursor:pointer;"><i class="fa-solid fa-store"></i></div>'
        });
        leaflet.marker([storeLat, storeLng], { icon: storeIcon })
          .addTo(map)
          .bindPopup(`<b>${storeName}</b><br>${radiusKm} km delivery radius`);
      }

      if (hasCustomerCoords) {
        const customerIcon = leaflet.divIcon({
          className: 'border-0 bg-transparent',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
          html: '<div style="width:32px;height:32px;background:#2563EB;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2.5px solid white;cursor:pointer;"><i class="fa-solid fa-location-dot"></i></div>'
        });
        leaflet.marker([custLat, custLng], { icon: customerIcon })
          .addTo(map)
          .bindPopup(`<b>${displayCustomer}</b><br>${addressString}${distance != null ? `<br><b>Distance:</b> ${distance} km` : ''}${hasCustomerCoords ? `<br><span style="font-family:monospace;font-size:10px;color:#2563eb;font-weight:bold;">📍 ${custLat.toFixed(6)}, ${custLng.toFixed(6)}</span>` : ''}`)
          .openPopup();
      }

      if (hasStoreCoords && hasCustomerCoords) {
        leaflet.polyline([[storeLat, storeLng], [custLat, custLng]], {
          color: '#3B82F6',
          weight: 2.5,
          dashArray: '6 6',
          opacity: 0.85
        }).addTo(map);

        map.fitBounds([
          [storeLat, storeLng],
          [custLat, custLng]
        ], { padding: [40, 40] });
      }

      timer = setTimeout(() => {
        try {
          if (map) {
            map.invalidateSize();
            if (hasStoreCoords && hasCustomerCoords) {
              map.fitBounds([
                [storeLat, storeLng],
                [custLat, custLng]
              ], { padding: [40, 40] });
            }
          }
        } catch (e) {}
      }, 150);
    } catch (e) {
      console.warn('Map initialization skipped:', e);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (map) {
        try { map.remove(); } catch (e) {}
      }
    };
  }, [hasStoreCoords, hasCustomerCoords, storeLat, storeLng, custLat, custLng, radiusKm, distance, displayCustomer, addressString, storeName]);

  const runAction = async (nextStatus) => {
    if (busy || !onUpdateStatus) return;
    setSubmitting(true);
    try {
      await onUpdateStatus(order.id, nextStatus);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl lg:max-w-5xl w-full max-h-[92vh] flex flex-col md:flex-row overflow-hidden border border-gray-200">
        
        {/* LEFT SIDE: Interactive Map & Delivery Route */}
        <div className="w-full md:w-5/12 lg:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50 shrink-0">
          {/* Map Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs shadow-2xs">
                <i className="fa-solid fa-map-location-dot"></i>
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-gray-900">{t('mapModalTitle', 'Customer Location • {id}', { id: displayId })}</h4>
                <p className="text-[11px] text-gray-500">
                  {distance != null ? (
                    <span className="text-emerald-700 font-bold">{t('orderModalDistanceAway', '{distance} km away', { distance })}</span>
                  ) : t('ordersNearbyOnly', 'Nearby Delivery')}
                  {radiusKm > 0 && ` • Zone: ${radiusKm} km`}
                </p>
              </div>
            </div>
            {radiusKm > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                {radiusKm} km zone
              </span>
            )}
          </div>

          {/* Interactive Map Container */}
          <div className="relative flex-1 min-h-[220px] sm:min-h-[280px] md:min-h-[380px] w-full bg-gray-100 overflow-hidden flex items-center justify-center">
            {hasStoreCoords || hasCustomerCoords ? (
              <>
                <div ref={mapContainerRef} className="w-full h-full z-1"></div>
                <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-xs px-2 py-1 rounded-md border border-gray-200 text-[10px] font-bold text-gray-800 shadow-2xs flex items-center gap-1.5 z-10 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span>{storeName} • {radiusKm} km zone</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-400 p-4 text-center">
                <i className="fa-solid fa-location-slash text-2xl mb-1 text-gray-300 block"></i>
                {t('mapModalNoGps', 'GPS coordinates not recorded for this delivery address.')}
              </div>
            )}
          </div>

          {/* Address & Navigation Footer */}
          <div className="p-3 bg-white border-t border-gray-100 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <i className="fa-solid fa-location-dot text-blue-600 mt-0.5 text-xs shrink-0"></i>
                <div className="min-w-0">
                  <span className="font-bold text-gray-700 block text-[11px]">{t('orderModalShippingAddress', 'Shipping Address')}</span>
                  <span className="font-bold text-gray-900 block truncate">{addr.full_name || displayCustomer}</span>
                  <span className="text-gray-500 text-[11px] line-clamp-2">{addressString}</span>
                  {order.customer_phone && (
                    <span className="text-gray-400 font-mono text-[10px] mt-0.5 block">
                      <i className="fa-solid fa-phone text-[9px] mr-1"></i>{order.customer_phone}
                    </span>
                  )}
                  {hasCustomerCoords ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 mt-1.5 w-fit">
                      <i className="fa-solid fa-location-crosshairs text-[10px] text-blue-600"></i>
                      <span>{custLat.toFixed(6)}, {custLng.toFixed(6)}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <i className="fa-solid fa-location-slash text-[9px]"></i>
                      <span>{t('mapModalNoCoords', 'No GPS Coordinates')}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyAddress}
                className={`!py-1.5 !px-2.5 !text-[11px] font-bold shrink-0 flex items-center gap-1.5 rounded-xl border transition cursor-pointer shadow-2xs active:scale-95 ${
                  copiedAddress 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                }`}
                title={t('mapModalCopyAddress', 'Copy Address')}
              >
                <i className={`fa-solid ${copiedAddress ? 'fa-check text-emerald-600' : 'fa-copy text-blue-600'}`}></i>
                <span>{copiedAddress ? t('mapModalCopied', 'Copied!') : t('mapModalCopyAddress', 'Copy Address')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Order Details, Items, GST, Actions */}
        <div className="w-full md:w-7/12 lg:w-1/2 flex flex-col flex-1 overflow-hidden bg-white">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between bg-emerald-50 gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-base sm:text-lg text-gray-900 flex items-center gap-2 whitespace-nowrap">
                <i className="fa-solid fa-basket-shopping text-emerald-600"></i>
                <span>{t('orderModalTitleOnly', 'Order Detail')}</span>
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs whitespace-nowrap">
                <span className="text-gray-500 font-semibold">{t('orderModalOrderIdLabel', 'Order ID:')}</span>
                <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-2xs whitespace-nowrap">
                  {displayId}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-3 whitespace-nowrap overflow-hidden text-ellipsis">
                <span className="truncate">
                  {t('orderModalCustomer', 'Customer: ')}<span className="font-semibold text-gray-700">{displayCustomer}</span>
                </span>
                {invoiceDate && (
                  <span className="text-[11px] text-gray-400 shrink-0">
                    <i className="fa-regular fa-clock mr-1"></i>{invoiceDate}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadInvoice}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border-2 border-emerald-300 text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0 hover:border-emerald-400 active:scale-95"
                title={t('orderModalDownloadInvoice', 'Download Tax Invoice')}
              >
                <i className="fa-solid fa-file-pdf text-rose-500 text-sm sm:text-base"></i>
                <span className="whitespace-nowrap">{t('orderModalInvoicePdf', 'Invoice PDF')}</span>
              </button>
              <button 
                type="button"
                disabled={busy}
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors text-lg font-bold shadow-xs cursor-pointer shrink-0 disabled:opacity-50 ml-1"
                title={t('orderModalClose', 'Close')}
              >
                &times;
              </button>
            </div>
          </div>

          {/* Delivery & Payment Badges Banner */}
          <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">{t('orderModalDeliveryMode', 'Delivery Mode:')}</span>
              <span className="font-bold text-gray-800 capitalize">{order.delivery_mode || 'Normal'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {((order.payment_method || '').toUpperCase() === 'CASH_ON_DELIVERY' || (order.payment_method || '').toUpperCase() === 'COD') ? (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                  <i className="fa-solid fa-hand-holding-dollar text-amber-600"></i>
                  <span>COD • {(order.payment_status || '').toUpperCase() === 'PAID' ? 'COLLECTED' : 'PAY ON DELIVERY'}</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                  <i className="fa-solid fa-credit-card text-emerald-600"></i>
                  <span>{order.payment_method ? order.payment_method.toUpperCase() : 'PREPAID'} • {order.payment_status ? order.payment_status.toUpperCase() : 'PAID'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Items List (scrollable) */}
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto max-h-[240px]">
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">{t('orderModalNoItems', 'No itemized records found for this order.')}</p>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px]">
                    <th className="pb-2">{t('orderModalColItem', 'Item')}</th>
                    <th className="pb-2 text-center">{t('orderModalColQty', 'Qty')}</th>
                    <th className="pb-2 text-right">{t('orderModalColUnitPrice', 'Unit Price')}</th>
                    <th className="pb-2 text-right">{t('orderModalColTotal', 'Total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => {
                    const qty = Number(item.quantity) || 1;
                    const unitPrice = Number(item.unit_price) || 0;
                    const itemTotal = Number(item.total_price) || (qty * unitPrice);
                    return (
                      <tr key={idx} className="hover:bg-gray-50/70">
                        <td className="py-2.5 font-semibold text-gray-800">{item.name || t('orderModalColItem', 'Item')}</td>
                        <td className="py-2.5 text-center font-bold text-gray-600">{qty}</td>
                        <td className="py-2.5 text-right text-gray-500">₹{unitPrice.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 text-right font-extrabold text-gray-900">₹{itemTotal.toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* GST & Financial Summary */}
          <div className="px-5 py-3 bg-emerald-50/40 border-t border-b border-emerald-100/70 text-xs shrink-0">
            {/* GST Breakdown (above subtotal) */}
            <div className="flex items-center justify-between font-semibold text-gray-700 py-0.5">
              <span className="flex items-center gap-1.5 text-gray-600">
                <i className="fa-solid fa-calculator text-[10px] text-emerald-600"></i>
                <span>{t('orderModalTaxableSubtotal', 'Taxable Amount (Excl. Tax)')}</span>
              </span>
              <span>₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-gray-600 py-0.5">
              <span className="flex items-center gap-1 pl-4 text-[11px]">
                <span>{t('orderModalCGST', 'CGST (2.5%)')}</span>
              </span>
              <span className="font-mono text-[11px]">₹{cgst}</span>
            </div>
            <div className="flex items-center justify-between text-gray-600 py-0.5">
              <span className="flex items-center gap-1 pl-4 text-[11px]">
                <span>{t('orderModalSGST', 'SGST (2.5%)')}</span>
              </span>
              <span className="font-mono text-[11px]">₹{sgst}</span>
            </div>
            <div className="flex items-center justify-between font-bold text-emerald-800 pt-1 border-t border-dashed border-emerald-200 mt-1">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-receipt text-[10px] text-emerald-600"></i>
                <span>{t('orderModalTotalTax', 'Total GST (5% Inclusive)')}</span>
                {recordedTax != null ? (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 font-bold uppercase">{t('orderModalVerifiedTax', 'Invoice Verified')}</span>
                ) : null}
              </span>
              <span>₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {/* Separator before Items Subtotal, Delivery and Discounts */}
            <div className="border-t border-dashed border-emerald-200/80 my-2"></div>

            {/* Items Subtotal, Delivery Fee and Discounts */}
            <div className="flex items-center justify-between text-gray-700 font-semibold py-0.5">
              <span className="flex items-center gap-1.5 text-gray-600">
                <i className="fa-solid fa-basket-shopping text-[10px] text-emerald-600"></i>
                <span>{t('orderModalItemsSubtotal', 'Items Subtotal')}</span>
              </span>
              <span className="font-bold text-gray-900">₹{itemsSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-600 py-0.5">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-truck-fast text-[10px] text-emerald-600"></i>
                <span>{t('orderModalDeliveryFee', 'Delivery Fee / Rate')}</span>
              </span>
              <span className="font-semibold text-gray-800">₹{deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-600 py-0.5">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-tags text-[10px] text-emerald-600"></i>
                <span>{t('orderModalDiscounts', 'Discounts')}</span>
              </span>
              <span className={`font-semibold ${discount > 0 ? 'text-emerald-700' : 'text-gray-600'}`}>
                {discount > 0 ? `-₹${discount.toFixed(2)}` : '₹0.00'}
              </span>
            </div>
          </div>

          {/* Footer with Action Buttons */}
          <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3 shrink-0">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block leading-tight">{t('orderModalGrandTotal', 'Grand Total ({count} items)', { count: items.length })}</span>
              <span className="text-base font-extrabold text-emerald-700">₹{Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center gap-2">
              {s === 'new' && onUpdateStatus && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runAction('packing')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy ? t('orderUpdating', 'Updating...') : t('orderModalAcceptOrder', 'Accept Order')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => { if (!busy) { onClose(); if (onDecline) onDecline(order); } }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('orderModalDecline', 'Decline')}
                  </button>
                </>
              )}
              {(s === 'packing' || s === 'processing') && onUpdateStatus && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runAction('packed')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy ? t('orderUpdating', 'Updating...') : t('orderModalPackOrder', 'Pack Order')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => { if (!busy) { onClose(); if (onDecline) onDecline(order); } }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('orderModalDecline', 'Decline')}
                  </button>
                </>
              )}
              {s === 'packed' && onUpdateStatus && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runAction('dispatched')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy ? t('orderUpdating', 'Updating...') : t('orderModalSendPackage', 'Send Package')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => { if (!busy) { onClose(); if (onDecline) onDecline(order); } }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('orderModalDecline', 'Decline')}
                  </button>
                </>
              )}
              {(s === 'dispatched' || s === 'shipped') && onUpdateStatus && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAction('delivered')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? t('orderUpdating', 'Updating...') : t('orderModalMarkDelivered', 'Mark Delivered')}
                </button>
              )}
              <button 
                type="button"
                disabled={busy}
                onClick={onClose}
                className="btn-soft !py-1.5 !px-3 !text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {t('orderModalClose', 'Close')}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function DeclineOrderModal({ order, onClose, onConfirm }) {
  if (!order) return null;
  const { t } = useTranslation();
  const reasons = [
    { id: 'stock', label: t('reasonOutOfStock', 'Item(s) Out of Stock'), icon: 'fa-box-open' },
    { id: 'busy', label: t('reasonStoreBusy', 'Store is Closing / Too Busy'), icon: 'fa-clock' },
    { id: 'distance', label: t('reasonOutsideReach', 'Delivery Address Outside Reach'), icon: 'fa-route' },
    { id: 'customer', label: t('reasonCustomerRequested', 'Customer Requested Cancellation'), icon: 'fa-user-xmark' },
    { id: 'pricing', label: t('reasonPriceMismatch', 'Price / Catalog Mismatch'), icon: 'fa-tag' }
  ];

  const [selectedReason, setSelectedReason] = useState(reasons[0].label);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const displayId = order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : '—';
  const displayCustomer = order.customer || order.customer_name || t('colCustomer', 'Customer');

  const handleDecline = async () => {
    setSubmitting(true);
    await onConfirm(order.id, selectedReason, note);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-orange-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold shadow-2xs">
              <i className="fa-solid fa-ban"></i>
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">{t('declineModalTitle', 'Decline Order • {id}', { id: displayId })}</h3>
              <p className="text-[11px] text-gray-500">{t('orderModalCustomer', 'Customer: ')}<span className="font-semibold text-gray-700">{displayCustomer}</span></p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center text-sm font-bold shadow-2xs cursor-pointer"
            title={t('orderModalClose', 'Close')}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5">
          <p className="text-xs font-semibold text-gray-700">{t('declineModalPrompt', 'Please choose a reason for declining this order:')}</p>
          <div className="space-y-2">
            {reasons.map((r) => (
              <label 
                key={r.id} 
                onClick={() => setSelectedReason(r.label)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${selectedReason === r.label ? 'border-rose-300 bg-rose-50/60 text-rose-900 font-bold' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
              >
                <span className="flex items-center gap-2">
                  <i className={`fa-solid ${r.icon} text-gray-400 w-4 text-center ${selectedReason === r.label ? 'text-rose-600' : ''}`}></i>
                  <span>{r.label}</span>
                </span>
                <input 
                  type="radio" 
                  name="decline_reason" 
                  checked={selectedReason === r.label} 
                  onChange={() => setSelectedReason(r.label)}
                  className="accent-rose-600 cursor-pointer"
                />
              </label>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">{t('declineInternalNote', 'Internal Note (Optional):')}</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('declineNotePlaceholder', 'e.g., ran out of inventory')}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-rose-400 outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-soft !py-1.5 !px-3 !text-xs font-bold cursor-pointer"
          >
            {t('declineBtnKeepOrder', 'Keep Order')}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={submitting}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <i className="fa-solid fa-ban text-xs"></i>
            {submitting ? t('declineBtnDeclining', 'Declining...') : t('declineBtnConfirm', 'Confirm Decline')}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderMapModal({ order, store, onClose, onUpdateStatus, onDecline }) {
  if (!order) return null;
  const { t } = useTranslation();
  const mapContainerRef = useRef(null);
  const displayId = order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : '—';
  const displayCustomer = order.customer || order.customer_name || t('colCustomer', 'Customer');
  const addr = order.delivery_address || {};
  const addrText = [addr.address_line, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || t('orderModalNoAddress', 'No delivery address recorded');
  const addressString = addrText;
  const distance = order.distance != null ? parseFloat(order.distance) : null;

  // Active Store Location and Details from database
  const storeName = store?.store_name || 'Store';
  const hasStoreCoords = store?.latitude != null && store?.longitude != null;
  const storeLat = hasStoreCoords ? Number(store.latitude) : null;
  const storeLng = hasStoreCoords ? Number(store.longitude) : null;
  const radiusKm = Number(store?.delivery_radius_km ?? 0);

  // Exact Customer Coordinates from delivery_address in orders table
  const rawCustLat = addr.latitude ?? addr.lat ?? order.delivery_latitude ?? order.latitude ?? null;
  const rawCustLng = addr.longitude ?? addr.lng ?? order.delivery_longitude ?? order.longitude ?? null;
  const hasCustomerCoords = rawCustLat != null && rawCustLng != null && !isNaN(Number(rawCustLat)) && !isNaN(Number(rawCustLng));
  const custLat = hasCustomerCoords ? Number(rawCustLat) : null;
  const custLng = hasCustomerCoords ? Number(rawCustLng) : null;

  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleCopyAddress = async (e) => {
    if (e) e.stopPropagation();
    const coordsText = hasCustomerCoords ? `\nCoordinates: ${custLat.toFixed(6)}, ${custLng.toFixed(6)}` : '';
    const textToCopy = `${addressString}${coordsText}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.warn('Failed to copy address:', err);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || (!hasStoreCoords && !hasCustomerCoords)) return;
    try {
      const leaflet = typeof window !== 'undefined' ? (window.L || L) : null;
      if (!leaflet || !leaflet.map) return;

      const centerLat = hasStoreCoords ? storeLat : custLat;
      const centerLng = hasStoreCoords ? storeLng : custLng;

      const map = leaflet.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([centerLat, centerLng], 12);

      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(map);

      if (hasStoreCoords && radiusKm > 0) {
        leaflet.circle([storeLat, storeLng], {
          radius: radiusKm * 1000,
          color: '#22C55E',
          fillColor: '#22C55E',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '6 4'
        }).addTo(map);
      }

      if (hasStoreCoords) {
        const storeIcon = leaflet.divIcon({
          className: 'border-0 bg-transparent',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
          html: '<div style="width:32px;height:32px;background:#15803D;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2.5px solid white;cursor:pointer;"><i class="fa-solid fa-store"></i></div>'
        });
        leaflet.marker([storeLat, storeLng], { icon: storeIcon })
          .addTo(map)
          .bindPopup(`<b>${storeName}</b><br>${radiusKm} km delivery radius`);
      }

      if (hasCustomerCoords) {
        const customerIcon = leaflet.divIcon({
          className: 'border-0 bg-transparent',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
          html: '<div style="width:32px;height:32px;background:#2563EB;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2.5px solid white;cursor:pointer;"><i class="fa-solid fa-location-dot"></i></div>'
        });
        leaflet.marker([custLat, custLng], { icon: customerIcon })
          .addTo(map)
          .bindPopup(`<b>${displayCustomer}</b><br>${addrText}${distance != null ? `<br><b>Distance:</b> ${distance} km` : ''}${hasCustomerCoords ? `<br><span style="font-family:monospace;font-size:10px;color:#2563eb;font-weight:bold;">📍 ${custLat.toFixed(6)}, ${custLng.toFixed(6)}</span>` : ''}`)
          .openPopup();
      }

      if (hasStoreCoords && hasCustomerCoords) {
        leaflet.polyline([[storeLat, storeLng], [custLat, custLng]], {
          color: '#3B82F6',
          weight: 2.5,
          dashArray: '6 6',
          opacity: 0.85
        }).addTo(map);

        map.fitBounds([
          [storeLat, storeLng],
          [custLat, custLng]
        ], { padding: [50, 50] });
      }

      return () => {
        map.remove();
      };
    } catch (e) {
      console.warn('Map initialization skipped:', e);
    }
  }, [hasStoreCoords, hasCustomerCoords, storeLat, storeLng, custLat, custLng, radiusKm, distance, displayCustomer, addrText, storeName]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-map-location-dot text-blue-600"></i>
              <span>{t('mapModalTitle', 'Customer Location • {id}', { id: displayId })}</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('orderModalCustomer', 'Customer: ')}<span className="font-semibold text-gray-700">{displayCustomer}</span>
              {distance != null && (
                <> • <span className="text-green-700 font-bold">{t('orderModalDistanceAway', '{distance} km away', { distance })}</span></>
              )}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors text-base font-bold shadow-xs cursor-pointer"
            title={t('orderModalClose', 'Close')}
          >
            &times;
          </button>
        </div>

        {/* Delivery Details */}
        <div className="p-4 bg-blue-50/40 border-b border-blue-100/60 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
            <i className="fa-solid fa-location-dot"></i>
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <div className="font-bold text-gray-900">{addr.full_name || displayCustomer}</div>
            <div className="text-gray-600 truncate">{addrText}</div>
            {order.customer_phone && (
              <div className="text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                <i className="fa-solid fa-phone text-[10px] text-gray-400"></i> {order.customer_phone}
              </div>
            )}
            {hasCustomerCoords ? (
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md border border-blue-200 mt-1.5 w-fit">
                <i className="fa-solid fa-location-crosshairs text-[10px] text-blue-600"></i>
                <span>{custLat.toFixed(6)}, {custLng.toFixed(6)}</span>
              </div>
            ) : (
              <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                <i className="fa-solid fa-location-slash text-[9px]"></i>
                <span>{t('mapModalNoCoords', 'No GPS Coordinates')}</span>
              </div>
            )}
          </div>
          {radiusKm > 0 && (
            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 shrink-0">
              {t('ordersZoneBadge', 'Zone: {radius} km', { radius: radiusKm })}
            </span>
          )}
        </div>

        {/* Real Leaflet Map View */}
        <div className="relative h-72 w-full bg-gray-100 overflow-hidden flex items-center justify-center">
          {hasStoreCoords || hasCustomerCoords ? (
            <>
              <div ref={mapContainerRef} className="w-full h-full z-1"></div>
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-800 shadow-sm flex items-center gap-1.5 z-10 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span>{t('mapModalStoreZone', '{storeName} Zone: {radius} km', { storeName, radius: radiusKm })}</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-500 p-4 text-center">
              {t('mapModalNoGps', 'GPS coordinates not recorded for this delivery address.')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <i className="fa-solid fa-motorcycle text-green-600"></i>
            <span>{t('mapModalDeliveryMode', 'Delivery Mode: {mode}', { mode: order.delivery_mode || t('deliveryBadgeNormal', 'Normal') })}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={handleCopyAddress}
              className={`!py-1.5 !px-3 !text-xs font-bold flex items-center gap-1.5 rounded-xl border transition cursor-pointer shadow-2xs active:scale-95 ${
                copiedAddress 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
              }`}
              title={t('mapModalCopyAddress', 'Copy Address')}
            >
              <i className={`fa-solid ${copiedAddress ? 'fa-check text-emerald-600' : 'fa-copy text-blue-600'}`}></i>
              <span>{copiedAddress ? t('mapModalCopied', 'Copied!') : t('mapModalCopyAddress', 'Copy Address')}</span>
            </button>
            {((order.status || '').toLowerCase() === 'new') && (
              <>
                <button 
                  type="button"
                  onClick={async () => {
                    await onUpdateStatus(order.id, 'packing');
                    onClose();
                  }}
                  className="btn-primary !py-1.5 !px-3 !text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <i className="fa-solid fa-check text-xs"></i>
                  {t('orderModalAcceptOrder', 'Accept Order')}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onDecline) onDecline(order);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <i className="fa-solid fa-ban text-xs"></i>
                  {t('orderModalDecline', 'Decline')}
                </button>
              </>
            )}
            {((order.status || '').toLowerCase() === 'packing' || (order.status || '').toLowerCase() === 'processing') && (
              <>
                <button 
                  type="button"
                  onClick={async () => {
                    await onUpdateStatus(order.id, 'packed');
                    onClose();
                  }}
                  className="btn-primary !py-1.5 !px-3 !text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  <i className="fa-solid fa-box text-xs"></i>
                  {t('orderActionPack', 'Pack')}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onDecline) onDecline(order);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <i className="fa-solid fa-ban text-xs"></i>
                  {t('orderModalDecline', 'Decline')}
                </button>
              </>
            )}
            {((order.status || '').toLowerCase() === 'packed') && (
              <>
                <button 
                  type="button"
                  onClick={async () => {
                    await onUpdateStatus(order.id, 'dispatched');
                    onClose();
                  }}
                  className="btn-primary !py-1.5 !px-3 !text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  <i className="fa-solid fa-paper-plane text-xs"></i>
                  {t('orderActionSend', 'Send')}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onDecline) onDecline(order);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <i className="fa-solid fa-ban text-xs"></i>
                  {t('orderModalDecline', 'Decline')}
                </button>
              </>
            )}
            {((order.status || '').toLowerCase() === 'dispatched' || (order.status || '').toLowerCase() === 'shipped') && (
              <button 
                type="button"
                onClick={async () => {
                  await onUpdateStatus(order.id, 'delivered');
                  onClose();
                }}
                className="btn-primary !py-1.5 !px-3 !text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
              >
                <i className="fa-solid fa-check-double text-xs"></i>
                {t('orderActionDelivered', 'Delivered')}
              </button>
            )}
            <button 
              type="button"
              onClick={onClose}
              className="btn-soft !py-1.5 !px-3 !text-xs font-bold cursor-pointer"
            >
              {t('orderModalClose', 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order, onUpdateStatus, onViewItems, onOpenMap, onDecline, isUpdating = false }) {
  const { t } = useTranslation();

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'new': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">{t('statusBadgeNew', 'New')}</span>;
      case 'packing':
      case 'processing': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">{t('statusBadgePacking', 'Packing')}</span>;
      case 'packed': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">{t('statusBadgePacked', 'Packed')}</span>;
      case 'dispatched':
      case 'shipped': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">{t('statusBadgeDispatched', 'Dispatched')}</span>;
      case 'ready': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">{t('statusBadgeReady', 'Ready')}</span>;
      case 'delivered': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">{t('statusBadgeDelivered', 'Delivered')}</span>;
      case 'cancelled':
      case 'declined': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">{t('statusBadgeDeclined', 'Declined')}</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800">{status || t('statusBadgePending', 'Pending')}</span>;
    }
  };

  const getDeliveryBadge = (type) => {
    const dType = (type || '').toLowerCase();
    if (dType.includes('fast') || dType.includes('express')) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">{t('deliveryBadgeFast', 'Fast 45m')}</span>;
    if (dType.includes('same')) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">{t('deliveryBadgeSame', 'Same-day')}</span>;
    if (dType.includes('pickup')) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">{t('deliveryBadgePickup', 'Pickup')}</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">{t('deliveryBadgeNormal', 'Normal')}</span>;
  };

  const getActionBtn = (status) => {
    if (isUpdating) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-500 bg-gray-100 border border-gray-200 whitespace-nowrap select-none">
          <i className="fa-solid fa-spinner fa-spin text-[10px]"></i> {t('orderUpdating', 'Updating...')}
        </span>
      );
    }

    const s = (status || '').toLowerCase();
    if (s === 'new') {
      return (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button 
            type="button"
            disabled={isUpdating}
            onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'packing'); }} 
            className="btn-primary !text-xs !py-1 !px-2.5 font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltipAcceptOrder', 'Accept Order')}
          >
            {t('orderActionAccept', 'Accept')}
          </button>
          <button 
            type="button"
            disabled={isUpdating}
            onClick={(e) => { e.stopPropagation(); onDecline(order); }} 
            className="px-2 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltipDeclineOrder', 'Decline Order')}
          >
            {t('orderActionDecline', 'Decline')}
          </button>
        </div>
      );
    }
    if (s === 'packing' || s === 'processing') {
      return (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button 
            type="button"
            disabled={isUpdating}
            onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'packed'); }} 
            className="btn-primary !text-xs !py-1 !px-2.5 font-bold cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltipPackOrder', 'Mark Order Packed')}
          >
            {t('orderActionPack', 'Pack')}
          </button>
          <button 
            type="button"
            disabled={isUpdating}
            onClick={(e) => { e.stopPropagation(); onDecline(order); }} 
            className="px-2 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltipDeclineOrder', 'Decline Order')}
          >
            {t('orderActionDecline', 'Decline')}
          </button>
        </div>
      );
    }
    if (s === 'packed') {
      return (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button 
            type="button"
            disabled={isUpdating}
            onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'dispatched'); }} 
            className="btn-primary !text-xs !py-1 !px-2.5 font-bold cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltipSendPackage', 'Dispatch / Send Package')}
          >
            {t('orderActionSend', 'Send')}
          </button>
          <button 
            type="button"
            disabled={isUpdating}
            onClick={(e) => { e.stopPropagation(); onDecline(order); }} 
            className="px-2 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltipDeclineOrder', 'Decline Order')}
          >
            {t('orderActionDecline', 'Decline')}
          </button>
        </div>
      );
    }
    if (s === 'dispatched' || s === 'shipped') {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <button 
            type="button"
            disabled={isUpdating}
            onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'delivered'); }}
            className="btn-primary !text-xs !py-1 !px-2.5 font-bold cursor-pointer bg-teal-600 hover:bg-teal-700 text-white shadow-2xs flex items-center gap-1 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltipMarkDelivered', 'Mark Delivered')}
          >
            <i className="fa-solid fa-check-double text-[10px]"></i>
            {t('orderActionDelivered', 'Delivered')}
          </button>
        </div>
      );
    }
    if (s === 'delivered') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 whitespace-nowrap">
          <i className="fa-solid fa-circle-check text-[10px]"></i> {t('statusBadgeDone', 'Done')}
        </span>
      );
    }
    if (s === 'cancelled' || s === 'declined') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 whitespace-nowrap">
          <i className="fa-solid fa-ban text-[10px]"></i> {t('statusBadgeDeclined', 'Declined')}
        </span>
      );
    }
    return <button disabled className="btn-soft !text-xs !py-1 !px-2 opacity-50 cursor-not-allowed whitespace-nowrap">{t('statusBadgeDone', 'Done')}</button>;
  };

  const itemsList = Array.isArray(order.items) ? order.items : [];
  const itemCount = itemsList.length;

  const displayId = order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : '—';
  const displayCustomer = order.customer || order.customer_name || t('colCustomer', 'Customer');
  const displayAmount = order.amount !== undefined ? order.amount : (order.total_amount || 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const discount = Number(order.total_discount || 0);
  const rawGrandTotal = order.grand_total != null ? Number(order.grand_total) : (Number(displayAmount) + deliveryFee - discount);
  const displayGrandTotal = Number.isInteger(rawGrandTotal) ? rawGrandTotal : rawGrandTotal.toFixed(2);
  const displayDistance = order.distance != null ? `${order.distance} km` : '—';
  const deliveryType = order.delivery_mode || order.delivery_type || 'normal';

  return (
    <tr 
      onClick={() => onViewItems(order)}
      className="border-b border-gray-100 hover:bg-emerald-50/50 cursor-pointer transition select-none group"
      title={t('orderRowClickToView', 'Click to view order details & invoice')}
    >
      <td className="px-4 py-3.5 font-bold text-gray-900">
        <div className="flex flex-col">
          <span className="group-hover:text-emerald-700 transition-colors">{displayId}</span>
          {order.invoice_number ? (
            <span className="text-[10px] font-mono font-medium text-emerald-700 mt-0.5 inline-flex items-center gap-1">
              <i className="fa-solid fa-file-invoice text-[9px]"></i>
              {order.invoice_number}
            </span>
          ) : (
            order.created_at ? (
              <span className="text-[10px] font-medium text-gray-400 mt-0.5">
                {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
            ) : null
          )}
        </div>
      </td>
      <td className="px-4 py-3.5 font-medium text-gray-700">
        <div>{displayCustomer}</div>
        {order.customer_phone && <div className="text-[11px] font-mono text-gray-400">{order.customer_phone}</div>}
      </td>
      <td className="px-4 py-3.5">
        <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded whitespace-nowrap inline-flex items-center gap-1">
          <i className="fa-solid fa-route text-[9px] text-green-700"></i>
          {displayDistance}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span 
          title={t('viewItemsTooltip', 'Click to view all items ordered')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
        >
          <i className="fa-solid fa-basket-shopping text-[11px] text-emerald-600"></i>
          <span>{itemCount > 0 ? t('itemsCount', '{count} items', { count: itemCount }) : (order.item_summary || t('itemsCount', '0 items', { count: 0 }))}</span>
        </span>
      </td>
      <td className="px-4 py-3.5">
        {getDeliveryBadge(deliveryType)}
      </td>
      <td className="px-4 py-3.5 font-bold text-gray-900">
        <div className="text-sm font-extrabold text-emerald-700">₹{displayGrandTotal}</div>
        <div className="text-[10px] font-normal text-gray-500 mt-0.5 flex flex-col leading-tight">
          <span className="whitespace-nowrap">
            Subtotal: <span className="font-semibold text-gray-700">₹{Number(displayAmount || 0).toFixed(2)}</span>
          </span>
          <span className="whitespace-nowrap">
            Delivery: <span className="font-semibold text-gray-700">₹{deliveryFee.toFixed(2)}</span>
          </span>
          <span className="whitespace-nowrap">
            Discount: <span className={`font-semibold ${discount > 0 ? 'text-emerald-700' : 'text-gray-700'}`}>
              {discount > 0 ? `-₹${discount.toFixed(2)}` : '₹0.00'}
            </span>
          </span>
        </div>
        {((order.payment_method || '').toUpperCase() === 'CASH_ON_DELIVERY' || (order.payment_method || '').toUpperCase() === 'COD') ? (
          <span className="text-[10px] font-bold text-amber-700 block whitespace-nowrap">
            <i className="fa-solid fa-hand-holding-dollar mr-0.5 text-[9px]"></i> COD
          </span>
        ) : (
          order.tax_amount != null && order.tax_amount > 0 ? (
            <span className="text-[10px] font-medium text-emerald-700 block whitespace-nowrap">
              {t('orderRowTaxIncluded', 'Incl. ₹{tax} GST', { tax: Number(order.tax_amount).toFixed(2) })}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-gray-400 block whitespace-nowrap">
              {t('orderRowGstInclusive', 'Incl. 5% GST')}
            </span>
          )
        )}
      </td>
      <td className="px-4 py-3.5 text-center">
        {getStatusBadge(order.status)}
      </td>
      <td className="px-4 py-3.5">
        {getActionBtn(order.status)}
      </td>
    </tr>
  );
}

export default function OrdersPage() {
  const { store } = useSeller();
  const { t } = useTranslation();
  const { orders, loading, error, updatingIds, updateStatus } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [mapOrder, setMapOrder] = useState(null);
  const [declineOrder, setDeclineOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const isOrderUpdating = (order) => {
    if (!order || !updatingIds) return false;
    const clean = order.id ? order.id.toString().replace(/^#/, '') : '';
    return Boolean(updatingIds[order.id] || updatingIds[clean]);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    const prevOrder = orders.find(o => o.id === orderId);
    const prevStatus = (prevOrder?.status || '').toLowerCase();
    const success = await updateStatus(orderId, newStatus);
    if (success) {
      const clean = orderId ? orderId.toString().replace(/^#/, '') : '';
      let msg = `Order #${clean} status updated`;
      if (newStatus === 'packing') {
        msg = t('toastOrderAccepted', 'Order #{id} accepted (ORDER_ACCEPTED) • Moved to Packing', { id: clean });
      } else if (newStatus === 'packed') {
        msg = t('toastOrderPacked', 'Order #{id} packed (ORDER_PACKED)', { id: clean });
      } else if (newStatus === 'dispatched') {
        msg = t('toastOrderShipped', 'Order #{id} shipped (ORDER_SHIPPED)', { id: clean });
      } else if (newStatus === 'delivered') {
        msg = t('toastOrderDelivered', 'Order #{id} marked Delivered', { id: clean });
      } else if (newStatus === 'cancelled') {
        msg = prevStatus === 'new'
          ? t('toastOrderDeclinedStockRestored', 'Order #{id} declined (ORDER_CANCELLED) • Listing stock restored', { id: clean })
          : t('toastOrderCancelledStockRestored', 'Order #{id} cancelled (ORDER_CANCELLED) • Listing stock restored', { id: clean });
      }
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
    }
    return success;
  };

  const filteredOrders = orders.filter(o => {
    const s = (o.status || '').toLowerCase();
    const d = (o.delivery_mode || o.delivery_type || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesStatus = statusFilter === 'all' ? true : (
      statusFilter === 'new' ? s === 'new' :
      statusFilter === 'packing' ? (s === 'packing' || s === 'processing' || s === 'packed') :
      statusFilter === 'dispatched' ? (s === 'dispatched' || s === 'shipped') :
      statusFilter === 'delivered' ? s === 'delivered' :
      statusFilter === 'ready' ? s === 'ready' :
      statusFilter === 'declined' ? (s === 'cancelled' || s === 'declined') : true
    );
    const matchesDelivery = deliveryFilter === 'all' ? true : (
      deliveryFilter === 'fast' ? (d.includes('fast') || d.includes('express')) :
      deliveryFilter === 'same' ? d.includes('same') :
      deliveryFilter === 'pickup' ? d.includes('pickup') :
      (!d.includes('fast') && !d.includes('express') && !d.includes('same') && !d.includes('pickup'))
    );
    const matchesSearch = !q ? true : (
      (o.id && o.id.toString().toLowerCase().includes(q)) ||
      (o.customer && o.customer.toLowerCase().includes(q)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (Array.isArray(o.items) && o.items.some(it => (it.name || '').toLowerCase().includes(q))) ||
      (typeof o.items === 'string' && o.items.toLowerCase().includes(q)) ||
      (o.item_summary && o.item_summary.toLowerCase().includes(q))
    );
    return matchesStatus && matchesDelivery && matchesSearch;
  });

  const handleExportCSV = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      setToastMessage(t('toastExportNoOrders', 'No orders available to export'));
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const headers = [
      'Order ID',
      'Invoice Number',
      'Order Date',
      'Customer Name',
      'Customer Phone',
      'Delivery Address',
      'Customer Coordinates',
      'Distance (km)',
      'Delivery Mode',
      'Delivery Fee (INR)',
      'Discount (INR)',
      'Items Summary',
      'Payment Method',
      'Payment Status',
      'Taxable Amount (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'Total GST (INR)',
      'Grand Total (INR)',
      'Order Status'
    ];

    const escapeCsvCell = (val) => {
      if (val == null) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = filteredOrders.map(o => {
      const displayId = o.id ? (o.id.toString().startsWith('#') ? o.id : `#${o.id}`) : '';
      const invNum = o.invoice_number || '';

      let dateStr = '';
      if (o.created_at) {
        try {
          const d = new Date(o.created_at);
          dateStr = isNaN(d.getTime()) ? String(o.created_at) : d.toLocaleString('en-IN');
        } catch (e) {
          dateStr = String(o.created_at);
        }
      } else if (o.invoice_date) {
        try {
          const d = new Date(o.invoice_date);
          dateStr = isNaN(d.getTime()) ? String(o.invoice_date) : d.toLocaleString('en-IN');
        } catch (e) {
          dateStr = String(o.invoice_date);
        }
      }

      const customerName = o.customer || o.customer_name || '';
      const phone = o.customer_phone || '';

      let addressStr = '';
      if (typeof o.delivery_address === 'string') {
        addressStr = o.delivery_address;
      } else if (o.delivery_address && typeof o.delivery_address === 'object') {
        const a = o.delivery_address;
        addressStr = [a.address_line, a.city, a.state, a.pincode].filter(Boolean).join(', ');
      } else if (typeof o.address === 'string') {
        addressStr = o.address;
      }

      const addrObj = (o.delivery_address && typeof o.delivery_address === 'object') ? o.delivery_address : {};
      const rawLat = addrObj.latitude ?? addrObj.lat ?? o.delivery_latitude ?? o.latitude ?? null;
      const rawLng = addrObj.longitude ?? addrObj.lng ?? o.delivery_longitude ?? o.longitude ?? null;
      const hasCoords = rawLat != null && rawLng != null && !isNaN(Number(rawLat)) && !isNaN(Number(rawLng));
      const coords = hasCoords ? `${Number(rawLat).toFixed(6)}, ${Number(rawLng).toFixed(6)}` : '';

      const distance = o.distance != null ? o.distance : '';
      const deliveryMode = o.delivery_mode || o.delivery_type || 'normal';

      let itemsStr = '';
      if (Array.isArray(o.items)) {
        itemsStr = o.items.map(it => {
          const name = it.name || 'Item';
          const qty = it.quantity != null ? it.quantity : 1;
          const price = it.total_price != null ? it.total_price : (it.unit_price != null ? it.unit_price * qty : null);
          return price != null ? `${name} (x${qty} - ₹${price})` : `${name} (x${qty})`;
        }).join('; ');
      } else if (typeof o.items === 'string') {
        itemsStr = o.items;
      } else if (o.item_summary) {
        itemsStr = o.item_summary;
      }

      const payMethod = o.payment_method ? o.payment_method.toUpperCase() : 'PREPAID';
      const payStatus = o.payment_status ? o.payment_status.toUpperCase() : 'PAID';

      const total = o.amount !== undefined ? Number(o.amount) : (Number(o.total_amount) || 0);
      const recordedTax = o.tax_amount != null && !isNaN(Number(o.tax_amount)) ? Number(o.tax_amount) : null;
      const computedTax = Math.round((total * 5 / 105) * 100) / 100;
      const taxAmount = recordedTax != null ? recordedTax : computedTax;
      const taxableAmount = Math.max(0, Math.round((total - taxAmount) * 100) / 100);
      const cgst = (taxAmount / 2).toFixed(2);
      const sgst = (taxAmount / 2).toFixed(2);

      const status = o.status || 'new';

      return [
        displayId,
        invNum,
        dateStr,
        customerName,
        phone,
        addressStr,
        coords,
        distance,
        deliveryMode,
        Number(o.delivery_fee || 0).toFixed(2),
        Number(o.total_discount || 0).toFixed(2),
        itemsStr,
        payMethod,
        payStatus,
        taxableAmount.toFixed(2),
        cgst,
        sgst,
        taxAmount.toFixed(2),
        total.toFixed(2),
        status
      ].map(escapeCsvCell).join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
    const today = new Date().toISOString().split('T')[0];
    const filename = `orders_export_${today}.csv`;

    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      if (typeof window !== 'undefined') {
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveOrOpenBlob(blob, filename);
        } else {
          const url = (window.URL && typeof window.URL.createObjectURL === 'function')
            ? window.URL.createObjectURL(blob)
            : (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : null);

          if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
              if (window.URL && typeof window.URL.revokeObjectURL === 'function') {
                window.URL.revokeObjectURL(url);
              }
            }, 100);
          }
        }
      }
      setToastMessage(t('toastExportOrders', 'Exported {count} orders to CSV', { count: filteredOrders.length }));
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const fastCount = orders.filter(o => {
    const d = (o.delivery_mode || o.delivery_type || '').toLowerCase();
    return d.includes('fast') || d.includes('express');
  }).length;
  const sameCount = orders.filter(o => (o.delivery_mode || o.delivery_type || '').toLowerCase().includes('same')).length;
  const normalCount = orders.filter(o => {
    const d = (o.delivery_mode || o.delivery_type || '').toLowerCase();
    return !d.includes('fast') && !d.includes('express') && !d.includes('same') && !d.includes('pickup');
  }).length;
  const pickupCount = orders.filter(o => (o.delivery_mode || o.delivery_type || '').toLowerCase().includes('pickup')).length;

  const statusTabs = [
    { key: 'all', label: t('tabAll', 'All'), count: orders.length },
    { key: 'new', label: t('tabNew', 'New'), count: orders.filter(o => (o.status || '').toLowerCase() === 'new').length },
    { key: 'packing', label: t('tabProcessing', 'Processing'), count: orders.filter(o => ['packing', 'processing', 'packed'].includes((o.status || '').toLowerCase())).length },
    { key: 'dispatched', label: t('tabDispatched', 'Shipped'), count: orders.filter(o => ['dispatched', 'shipped'].includes((o.status || '').toLowerCase())).length },
    { key: 'delivered', label: t('tabDelivered', 'Delivered'), count: orders.filter(o => (o.status || '').toLowerCase() === 'delivered').length },
    { key: 'declined', label: t('tabCancelled', 'Cancelled'), count: orders.filter(o => ['cancelled', 'declined'].includes((o.status || '').toLowerCase())).length }
  ];

  return (
    <section id="sec-orders" className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">{t('ordersHeaderTitle', 'App Orders')} <span className="text-sm font-normal text-green-700">{t('ordersHeaderNearbyOnly', '(Nearby Only)')}</span></h1>
          <p className="text-sm text-gray-500">{t('ordersHeaderSubtitle', 'Customers within your delivery zone — bike/van • not for far locations')}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-xs font-bold border border-green-200">
            <i className="fa-solid fa-circle-dot mr-1"></i> {t('ordersZoneBadge', 'Zone: {radius} km', { radius: store?.delivery_radius_km ?? 0 })}
          </span>
          <Link to="/zones" className="btn-soft !text-xs">{t('ordersEditZone', 'Edit Zone')}</Link>
        </div>
      </div>

      {/* Status Tabs: All, New, Processing, Shipped, Delivered, Cancelled */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {statusTabs.map(tab => {
          const active = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                active
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                active ? 'bg-emerald-800 text-emerald-100' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Delivery Mode Pills */}
      <div className="flex gap-1.5 text-xs font-bold flex-wrap">
        <span className="px-2 py-1 rounded-lg bg-orange-100 text-orange-800">{t('ordersPillFast', '{count} Fast', { count: fastCount })}</span>
        <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800">{t('ordersPillSameDay', '{count} Same-day', { count: sameCount })}</span>
        <span className="px-2 py-1 rounded-lg bg-green-100 text-green-800">{t('ordersPillNormal', '{count} Normal', { count: normalCount })}</span>
        <span className="px-2 py-1 rounded-lg bg-purple-100 text-purple-800">{t('ordersPillPickup', '{count} Pickup', { count: pickupCount })}</span>
      </div>

      {/* Filter Bar */}
      <div className="card p-3 flex flex-col sm:flex-row gap-2 flex-wrap">
        <input 
          type="search" 
          id="ordersSearch" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('ordersSearchPlaceholder', 'Search order, customer, items...')} 
          className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
        />
        <select 
          id="ordersStatus" 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
        >
          <option value="all">{t('ordersFilterAllStatus', 'All status')}</option>
          <option value="new">{t('ordersFilterNew', 'New / Action needed')}</option>
          <option value="packing">{t('ordersFilterPacking', 'Processing / Packing')}</option>
          <option value="dispatched">{t('ordersFilterDispatched', 'Shipped / Out for delivery')}</option>
          <option value="delivered">{t('ordersFilterDelivered', 'Delivered')}</option>
          <option value="declined">{t('ordersFilterDeclined', 'Declined / Cancelled')}</option>
        </select>
        <select 
          id="ordersDelivery" 
          value={deliveryFilter} 
          onChange={(e) => setDeliveryFilter(e.target.value)} 
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
        >
          <option value="all">{t('ordersFilterAllDeliveryTypes', 'All delivery types')}</option>
          <option value="fast">{t('ordersFilterFast', 'Fast')}</option>
          <option value="same">{t('ordersFilterSame', 'Same-day')}</option>
          <option value="normal">{t('ordersFilterNormal', 'Normal / scheduled')}</option>
          <option value="pickup">{t('ordersFilterPickup', 'Pickup')}</option>
        </select>
        <button 
          type="button"
          onClick={handleExportCSV} 
          className="btn-soft !text-xs cursor-pointer flex items-center gap-1.5"
          title={t('ordersExportTitle', 'Export filtered orders to CSV')}
        >
          <i className="fa-solid fa-download mr-1"></i> {t('ordersBtnExport', 'Export')}
        </button>
      </div>
      
      {/* Full-Width Orders Table Card */}
      <div className="card overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
            <tr>
              <th className="px-4 py-3.5">{t('colOrder', 'Order')}</th>
              <th className="px-4 py-3.5">{t('colCustomer', 'Customer')}</th>
              <th className="px-4 py-3.5">{t('colDistance', 'Distance')}</th>
              <th className="px-4 py-3.5">{t('colItems', 'Items')}</th>
              <th className="px-4 py-3.5">{t('colDelivery', 'Delivery')}</th>
              <th className="px-4 py-3.5">{t('colGrandTotal', 'Grand Total')}</th>
              <th className="px-4 py-3.5 text-center">{t('colStatus', 'Status')}</th>
              <th className="px-4 py-3.5">{t('colAction', 'Action')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && orders.length === 0 && (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i> {t('ordersLoadingFromServer', 'Loading orders from server...')}
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs inline-flex flex-col sm:flex-row items-center gap-2 max-w-lg mx-auto">
                    <div className="flex items-center gap-1.5 font-bold">
                      <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                      <span>{error}</span>
                    </div>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded font-bold text-[10px] shrink-0"
                    >
                      {t('ordersRetry', 'Retry')}
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {!(loading && orders.length === 0) && !error && filteredOrders.length === 0 && (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">{t('ordersNoOrdersFound', 'No orders found.')}</td>
              </tr>
            )}
            {!(loading && orders.length === 0) && !error && filteredOrders.map(order => (
              <OrderRow 
                key={order.id} 
                order={order} 
                onUpdateStatus={handleStatusUpdate} 
                onViewItems={setSelectedOrder}
                onOpenMap={setMapOrder}
                onDecline={setDeclineOrder}
                isUpdating={isOrderUpdating(order)}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="card p-4 bg-green-50 border-green-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <p className="text-sm text-green-800"><i className="fa-solid fa-motorcycle mr-1"></i> <b>{t('ordersBottomBannerText', 'App orders are always nearby. Customers outside your zone cannot order from the app.')}</b></p>
        <button className="btn-primary !text-xs whitespace-nowrap">{t('ordersManageDeliveryZone', 'Manage Delivery Zone')}</button>
      </div>

      {/* Itemized Order Detail Modal with Integrated Map */}
      {selectedOrder && (
        <OrderItemsModal 
          order={selectedOrder} 
          store={store}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleStatusUpdate}
          onDecline={setDeclineOrder}
          isUpdating={isOrderUpdating(selectedOrder)}
        />
      )}

      {/* Delivery Map Popup Modal */}
      {mapOrder && (
        <OrderMapModal 
          order={mapOrder} 
          store={store}
          onClose={() => setMapOrder(null)} 
          onUpdateStatus={handleStatusUpdate}
          onDecline={setDeclineOrder}
        />
      )}

      {/* Decline Order Reason Modal */}
      {declineOrder && (
        <DeclineOrderModal 
          order={declineOrder}
          onClose={() => setDeclineOrder(null)}
          onConfirm={async (orderId, reason, note) => {
            await handleStatusUpdate(orderId, 'cancelled');
          }}
        />
      )}

      {/* Real-time Status Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2.5 transition-all border border-gray-700">
          <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
          <span>{toastMessage}</span>
          <button 
            type="button"
            onClick={() => setToastMessage(null)} 
            className="ml-2 text-gray-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}
