import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sellerApi } from '../api/sellerApi';

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sell');

  useEffect(() => {
    async function loadRecs() {
      try {
        setLoading(true);
        const res = await sellerApi.getRecommendations();
        if (res.data && res.data.success) {
          setRecommendations(res.data.data || []);
        } else {
          setRecommendations([]);
        }
      } catch (e) {
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    }
    loadRecs();
  }, []);

  return (
    <section id="sec-recommendations" className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold" data-i18n="recTitle">Product Recommendations</h1>
        <p className="text-sm text-gray-500" data-i18n="recDesc">
          AI-driven market demand — what to sell, what to restock, and buyer opportunities
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveTab('sell')} className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === 'sell' ? 'tab-on' : 'tab-off'}`}>
          Products to Sell
        </button>
        <button onClick={() => setActiveTab('buy')} className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === 'buy' ? 'tab-on' : 'tab-off'}`}>
          Restock Alerts
        </button>
      </div>

      {loading && (
        <div className="card p-6 text-center text-gray-500 text-sm">
          <i className="fa-solid fa-spinner fa-spin mr-2"></i> Generating recommendation signals...
        </div>
      )}

      {!loading && (
        <div id="recPanelSell">
          <div className="card p-4 bg-indigo-50 border-indigo-200 text-sm text-indigo-900 mb-4">
            <i className="fa-solid fa-lightbulb mr-1"></i> <strong>Market Insights:</strong> High demand products currently searched in your region.
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendations.map((item, idx) => (
              <div key={item.id || idx} className="card p-4">
                <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block mb-2">
                  {item.badge || '+180% searches'}
                </div>
                <h3 className="font-bold text-gray-900">{item.name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Buy ₹{item.price} · Sell ₹{item.mrp || (Number(item.price) * 1.3).toFixed(0)} · <span className="text-green-700 font-bold">{item.profit_margin || '25'}% profit</span>
                </p>
                <div className="flex gap-2 mt-3">
                  <Link to="/products" className="btn-primary flex-1 !text-xs text-center">
                    Add to My Store
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

