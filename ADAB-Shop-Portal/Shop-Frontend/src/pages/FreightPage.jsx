import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sellerApi } from '../api/sellerApi';
import { useTranslation } from '../context/LanguageContext';

export default function FreightPage() {
  const { t } = useTranslation();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFreight() {
      try {
        setLoading(true);
        const res = await sellerApi.getB2BOrders();
        const raw = res?.data !== undefined ? res.data : res;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setShipments(list);
      } catch (e) {
        setShipments([]);
      } finally {
        setLoading(false);
      }
    }
    loadFreight();
  }, []);

  return (
    <section id="sec-freight" className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">{t('freightTitle', 'Freight & Logistics Tracking')}</h1>
        <p className="text-sm text-gray-500">{t('freightSubtitle', 'Live truck & carrier shipments for store-to-store orders (nearby, freight, and export)')}</p>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="card p-6 text-center text-gray-500 text-sm">
            <i className="fa-solid fa-spinner fa-spin mr-2"></i> {t('freightLoading', 'Loading freight & logistics shipments...')}
          </div>
        )}

        {!loading && shipments.length === 0 && (
          <div className="card p-6 text-center text-gray-500 text-sm">
            {t('freightEmpty', 'No freight shipments in transit. All logistics are clear.')}
          </div>
        )}

        {!loading && shipments.map((s, idx) => {
          const poNumber = s.po_number || (s.id ? `#P-${s.id.toString().slice(0, 8)}` : `#P-${idx + 1}`);
          const supplier = s.supplier_name || s.buyer_store_name || s.store_name || 'B2B Wholesale Partner';
          const totalAmt = s.total_amount != null ? `₹${Number(s.total_amount).toLocaleString('en-IN')}` : '—';
          const status = s.status || 'In Transit';

          return (
            <div key={s.id || idx} className="card p-4 border-l-4 border-blue-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-gray-900">{poNumber} · Logistics Dispatch</div>
                  <div className="text-xs text-gray-500">To/From: {supplier} · Value: {totalAmt}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                  {status}
                </span>
              </div>
              <div className="mt-3 flex gap-2 text-[10px] font-bold flex-wrap">
                <span className="px-2 py-1 rounded bg-green-100 text-green-800">{t('freightPickedUp', '✓ Picked Up')}</span>
                <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">{t('freightInTransit', '→ In Transit')}</span>
                <span className="px-2 py-1 rounded bg-gray-100 text-gray-400">{t('freightHubDelivery', 'Hub Delivery')}</span>
              </div>
            </div>
          );
        })}
      </div>

      <Link to="/partner" className="btn-soft !text-xs inline-flex items-center gap-1">
        <i className="fa-solid fa-store mr-1"></i> {t('freightViewAllOrders', 'View All Store Orders')}
      </Link>
    </section>
  );
}
