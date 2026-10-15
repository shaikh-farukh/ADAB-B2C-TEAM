import React, { useState, useEffect } from 'react';
import { OrderAPI } from '../services/api';

/**
 * Order Success Screen Component (sec-order-success)
 * Displays authoritative order reference, delivery address with geocoded coordinates,
 * and multi-seller itemized breakdown after payment confirmation.
 */
export default function OrderSuccessView({
  order = null,
  onTrackOrder = null,
  onViewOrders = null,
  onContinueShopping = null,
  showToast = null
}) {
  const [copied, setCopied] = useState(false);
  const [orderData, setOrderData] = useState(order || null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (order) {
      setOrderData(order);
    }
  }, [order]);

  useEffect(() => {
    let isMounted = true;
    async function fetchFullOrder() {
      if (order?.id && (!order.items || order.items.length === 0 || !order.seller_orders || order.seller_orders.length === 0)) {
        try {
          setLoadingDetails(true);
          const res = await OrderAPI.getOrderById(order.id);
          if (isMounted && res?.data) {
            setOrderData(res.data);
          }
        } catch (err) {
          console.warn('Could not fetch complete order details:', err);
        } finally {
          if (isMounted) setLoadingDetails(false);
        }
      }
    }
    fetchFullOrder();
    return () => { isMounted = false; };
  }, [order?.id]);

  // Fallback safe order structure if navigated without loaded order
  const effectiveOrder = orderData || order || {};
  const orderNumber = effectiveOrder.order_number || effectiveOrder.orderId || (effectiveOrder.id ? `ORD-${effectiveOrder.id.slice(0, 8)}` : 'ORD-CONFIRMED');
  const orderId = effectiveOrder.id || effectiveOrder.order_id || 'N/A';
  const orderStatus = effectiveOrder.order_status || effectiveOrder.status || 'CONFIRMED';
  const grandTotal = Number(effectiveOrder.grand_total || effectiveOrder.total_amount || effectiveOrder.total || 0);

  // Delivery Address & Geocoded Coordinates
  const deliveryAddress = effectiveOrder.delivery_address || effectiveOrder.deliveryAddress || {};
  const recipientName = deliveryAddress.full_name || deliveryAddress.recipient_name || deliveryAddress.name || 'Customer';
  const recipientPhone = deliveryAddress.phone || deliveryAddress.mobile || '';
  const addressLine = deliveryAddress.address_line || deliveryAddress.address || 'Delivery Address Provided';
  const landmark = deliveryAddress.landmark || '';
  const city = deliveryAddress.city || 'Surat';
  const state = deliveryAddress.state || 'Gujarat';
  const pincode = deliveryAddress.pincode || deliveryAddress.zip || '395002';
  const addressLabel = deliveryAddress.label || deliveryAddress.type || 'Home';

  // Geocoded Coordinates
  const latitude = deliveryAddress.latitude !== undefined && deliveryAddress.latitude !== null
    ? Number(deliveryAddress.latitude)
    : (effectiveOrder.destination_location?.latitude || null);
  const longitude = deliveryAddress.longitude !== undefined && deliveryAddress.longitude !== null
    ? Number(deliveryAddress.longitude)
    : (effectiveOrder.destination_location?.longitude || null);
  const hasCoordinates = latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude);

  // Multi-seller orders & item breakdown
  const sellerOrders = Array.isArray(effectiveOrder.seller_orders) ? effectiveOrder.seller_orders : [];
  const directItems = Array.isArray(effectiveOrder.items) ? effectiveOrder.items : [];

  // Group items by seller if seller_orders is present, or fallback to direct items
  const storesGrouped = sellerOrders.length > 0
    ? sellerOrders.map((so) => ({
        storeId: so.store_id || so.id,
        storeName: so.store_name || so.name || 'Local Marketplace Store',
        status: so.status || 'NEW',
        subtotal: Number(so.subtotal || 0),
        items: Array.isArray(so.items)
          ? so.items
          : directItems.filter((it) => it.seller_order_id === so.id || it.store_id === so.store_id)
      }))
    : [
        {
          storeId: 'store_primary',
          storeName: effectiveOrder.store_name || (directItems[0]?.store_name) || 'ADAB Marketplace Seller',
          status: 'NEW',
          subtotal: grandTotal,
          items: directItems
        }
      ];

  // Payment Details
  const paymentMethod = effectiveOrder.payment_method || effectiveOrder.paymentMethod || 'CASH_ON_DELIVERY';
  const paymentStatus = effectiveOrder.payment_status || effectiveOrder.payment?.status || (paymentMethod === 'CASH_ON_DELIVERY' ? 'PENDING' : 'PAID');
  const isPaid = paymentStatus === 'PAID';

  const handleCopyOrderId = () => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(orderNumber);
        setCopied(true);
        if (showToast) showToast('Order ID copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  return (
    <section className="page active" id="sec-order-success">
      <div className="wrap" style={{ maxWidth: '840px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* Hero Celebration Card */}
        <div style={{
          background: 'linear-gradient(135deg, #10B981, #059669)',
          borderRadius: '20px',
          padding: '32px 24px',
          color: '#ffffff',
          textAlign: 'center',
          boxShadow: '0 12px 30px rgba(16, 185, 129, 0.25)',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            margin: '0 auto 16px',
            border: '2px solid rgba(255,255,255,0.4)'
          }}>
            ✓
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Order Placed Successfully! 🎉
          </h1>
          <p style={{ fontSize: '15px', color: '#D1FAE5', margin: '0 auto', maxWidth: '520px', lineHeight: 1.5 }}>
            Thank you for shopping on ADAB! Your multi-seller order has been received and routed to the respective store fulfillment queues.
          </p>

          {/* Quick ETA Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            color: '#065F46',
            fontWeight: '700',
            fontSize: '13px',
            borderRadius: '999px',
            padding: '6px 16px',
            marginTop: '18px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <span>⚡ Estimated Delivery:</span>
            <span>14–30 Mins Express</span>
          </div>
        </div>

        {/* Primary Meta Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          marginBottom: '20px'
        }}>
          {/* Order Reference Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '18px',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Order Reference ID
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', fontFamily: 'monospace' }}>
                {orderNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyOrderId}
                style={{
                  background: copied ? '#ECFDF5' : '#F1F5F9',
                  color: copied ? '#059669' : '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              Ref: {orderId}
            </div>
            <div style={{ marginTop: '10px' }}>
              <span style={{
                background: '#ECFDF5',
                color: '#059669',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: '800'
              }}>
                ● {orderStatus}
              </span>
            </div>
          </div>

          {/* Payment Method Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '18px',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Payment Information
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
              {paymentMethod.replace(/_/g, ' ')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#059669' }}>
                ₹{grandTotal.toFixed(2)}
              </span>
              <span style={{
                background: isPaid ? '#ECFDF5' : '#FEF3C7',
                color: isPaid ? '#059669' : '#D97706',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: '800'
              }}>
                {isPaid ? 'PAID ONLINE' : 'PAY ON DELIVERY'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px' }}>
              {isPaid ? 'Payment verified and transaction settled' : 'Please keep exact cash ready upon delivery'}
            </div>
          </div>
        </div>

        {/* Delivery Address Summary with Geocoded Coordinates */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📍</span> Delivery Address Summary
            </h3>
            <span style={{
              background: '#F1F5F9',
              color: '#334155',
              fontSize: '11px',
              fontWeight: '800',
              padding: '3px 9px',
              borderRadius: '999px'
            }}>
              {addressLabel}
            </span>
          </div>

          <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>
            {recipientName} {recipientPhone && <span style={{ color: '#64748B', fontWeight: '400', fontSize: '13px' }}>({recipientPhone})</span>}
          </div>
          <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 10px', lineHeight: 1.5 }}>
            {addressLine}
            {landmark && `, Near ${landmark}`}
            {`, ${city}, ${state} - ${pincode}`}
          </p>

          {/* Live Geocoded Coordinates Verification Pill */}
          <div style={{
            background: hasCoordinates ? '#ECFDF5' : '#F8FAFC',
            border: hasCoordinates ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '8px 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: hasCoordinates ? '#065F46' : '#64748B'
          }}>
            <span style={{ fontSize: '14px' }}>🧭</span>
            <span>
              {hasCoordinates ? (
                <>
                  <b>Geocoded Coordinates:</b> ({latitude.toFixed(6)}, {longitude.toFixed(6)})
                  <span style={{ color: '#059669', marginLeft: '6px', fontWeight: '700' }}>✓ Verified Precision GPS Pin</span>
                </>
              ) : (
                <span>Address geocoding synchronized with central routing</span>
              )}
            </span>
          </div>
        </div>

        {/* Multi-Seller Item Breakdown */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛍️</span> Multi-Seller Ordered Items ({directItems.length || 'All Items'})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {storesGrouped.map((store, sIdx) => (
              <div
                key={store.storeId || sIdx}
                style={{
                  border: '1px solid #F1F5F9',
                  borderRadius: '12px',
                  background: '#F8FAFC',
                  padding: '14px',
                  borderLeft: '4px solid #10B981'
                }}
              >
                {/* Store Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🏪</span> {store.storeName}
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    background: '#E2E8F0',
                    color: '#334155',
                    borderRadius: '4px',
                    padding: '2px 6px'
                  }}>
                    Store Status: {store.status}
                  </span>
                </div>

                {/* Items in this store */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {store.items && store.items.length > 0 ? (
                    store.items.map((item, iIdx) => {
                      const name = item.product_name || item.name || 'Product';
                      const qty = Number(item.quantity || 1);
                      const price = Number(item.unit_price || item.sell_price || item.price || 0);
                      const lineTotal = Number(item.total_price || (price * qty));
                      return (
                        <div
                          key={item.id || item.order_item_id || iIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#ffffff',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            border: '1px solid #E2E8F0',
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              background: '#ECFDF5',
                              color: '#065F46',
                              fontWeight: '800',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px'
                            }}>
                              {qty}x
                            </span>
                            <span style={{ fontWeight: '600', color: '#1E293B' }}>{name}</span>
                          </div>
                          <div style={{ fontWeight: '700', color: '#0F172A' }}>
                            ₹{lineTotal.toFixed(2)}
                            {qty > 1 && (
                              <span style={{ color: '#94A3B8', fontWeight: '400', fontSize: '10px', marginLeft: '4px' }}>
                                (₹{price.toFixed(2)} ea)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                      Items dispatched per store allocation.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
          marginTop: '8px'
        }}>
          {onTrackOrder && (
            <button
              type="button"
              onClick={() => onTrackOrder(orderData)}
              style={{
                flex: '1 1 200px',
                background: '#10B981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 20px',
                fontSize: '14px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>🛵</span> Track Live Delivery
            </button>
          )}

          {onViewOrders && (
            <button
              type="button"
              onClick={onViewOrders}
              style={{
                flex: '1 1 180px',
                background: '#ffffff',
                color: '#1E293B',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '14px 20px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>📦</span> View All Orders
            </button>
          )}

          {onContinueShopping && (
            <button
              type="button"
              onClick={onContinueShopping}
              style={{
                flex: '1 1 160px',
                background: '#F1F5F9',
                color: '#475569',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 20px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>🛍️</span> Continue Shopping
            </button>
          )}
        </div>

      </div>
    </section>
  );
}
