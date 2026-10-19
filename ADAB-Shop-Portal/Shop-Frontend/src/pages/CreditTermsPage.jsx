import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { sellerApi } from '../api/sellerApi';

export default function CreditTermsPage() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [savingGive, setSavingGive] = useState(false);
  const [savingBuy, setSavingBuy] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Live DB Credit Data
  const [creditData, setCreditData] = useState(null);

  // Form State for "Credit You GIVE"
  const [giveForm, setGiveForm] = useState({
    credit_days: 14,
    min_order_amount: 5000,
    max_limit_per_store: 50000,
    max_stores_count: 10,
    total_exposure_cap: 300000,
    enable_credit: true
  });

  // Form State for "Credit from OTHER Shops"
  const [buyForm, setBuyForm] = useState({
    buy_max_shops: 5,
    buy_max_per_shop: 25000
  });

  const loadCreditData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await sellerApi.getCreditTerms();
      const data = res?.data?.data || res?.data || res;
      setCreditData(data);

      if (data?.rules) {
        setGiveForm({
          credit_days: Number(data.rules.credit_days) || 14,
          min_order_amount: Number(data.rules.min_order_amount) || 5000,
          max_limit_per_store: Number(data.rules.max_limit_per_store) || 50000,
          max_stores_count: Number(data.rules.max_stores_count) || 10,
          total_exposure_cap: Number(data.rules.total_exposure_cap) || 300000,
          enable_credit: data.rules.enable_credit !== undefined ? Boolean(data.rules.enable_credit) : true
        });
        setBuyForm({
          buy_max_shops: Number(data.rules.buy_max_shops) || 5,
          buy_max_per_shop: Number(data.rules.buy_max_per_shop) || 25000
        });
      }
    } catch (err) {
      console.error('Failed to load store credit terms:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to load credit rules from server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCreditData();
  }, [loadCreditData]);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSaveGiveTerms = async (e) => {
    if (e) e.preventDefault();
    try {
      setSavingGive(true);
      const res = await sellerApi.updateCreditGiveTerms({
        credit_days: Number(giveForm.credit_days),
        min_order_amount: Number(giveForm.min_order_amount),
        max_limit_per_store: Number(giveForm.max_limit_per_store),
        max_stores_count: Number(giveForm.max_stores_count),
        total_exposure_cap: Number(giveForm.total_exposure_cap),
        enable_credit: Boolean(giveForm.enable_credit)
      });
      const data = res?.data?.data || res?.data;
      if (data) {
        setCreditData(data);
      }
      showToast(t('creditTermsSavedSuccess', 'Store credit rules saved and synced successfully!'));
    } catch (err) {
      console.error('Failed to save credit give terms:', err);
      showToast(err?.response?.data?.error || 'Failed to save store credit terms', 'error');
    } finally {
      setSavingGive(false);
    }
  };

  const handleSaveBuyLimits = async (e) => {
    if (e) e.preventDefault();
    try {
      setSavingBuy(true);
      const res = await sellerApi.updateCreditBuyLimits({
        buy_max_shops: Number(buyForm.buy_max_shops),
        buy_max_per_shop: Number(buyForm.buy_max_per_shop)
      });
      const data = res?.data?.data || res?.data;
      if (data) {
        setCreditData(data);
      }
      showToast(t('creditTermsSavedSuccess', 'Buying limits saved and synced successfully!'));
    } catch (err) {
      console.error('Failed to save credit buy limits:', err);
      showToast(err?.response?.data?.error || 'Failed to save buying limits', 'error');
    } finally {
      setSavingBuy(false);
    }
  };

  const rules = creditData?.rules || giveForm;
  const giveMetrics = creditData?.give_metrics || {
    stores_count: 0,
    max_stores: rules.max_stores_count || 10,
    exposure_used: 0,
    total_cap: rules.total_exposure_cap || 300000,
    stores_on_credit: []
  };
  const receiveMetrics = creditData?.receive_metrics || {
    active_shops_count: 0,
    max_shops: buyForm.buy_max_shops || 5,
    total_owed: 0,
    seller_credits: []
  };
  const adabLine = creditData?.adab_line || {
    total_limit: 250000,
    utilized_amount: 0,
    available_amount: 250000,
    interest: '0% for 14 days',
    gstin_verified: true,
    status: 'Active'
  };

  // Percent calculations
  const giveStorePct = Math.min(100, Math.round(((giveMetrics.stores_count || 0) / (giveMetrics.max_stores || 10)) * 100));
  const giveExposurePct = Math.min(100, Math.round(((giveMetrics.exposure_used || 0) / (giveMetrics.total_cap || 1)) * 100));
  const receiveShopPct = Math.min(100, Math.round(((receiveMetrics.active_shops_count || 0) / (receiveMetrics.max_shops || 5)) * 100));

  return (
    <>
      <section id="sec-creditterms" className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">{t('creditTermsTitle', 'Store Credit Terms')}</h1>
            <p className="text-sm text-gray-500">{t('creditTermsSubtitle', 'Credit you give · credit from other shops · ADAB buying line — with per-shop and max-shop limits')}</p>
          </div>
          <Link to="/credit-apply" className="btn-primary !text-xs inline-flex items-center justify-center gap-1.5 self-start sm:self-auto">
            <i className="fa-solid fa-credit-card"></i> <span>{t('creditApplyTitle', 'Apply for Credit')}</span>
          </Link>
        </div>

        {/* Toast / Feedback Banner */}
        {toastMessage && (
          <div className={`p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2 shadow-xs transition-all ${
            toastMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
          }`}>
            <div className="flex items-center gap-2">
              <i className={`fa-solid ${toastMessage.type === 'error' ? 'fa-triangle-exclamation text-red-600' : 'fa-circle-check text-emerald-600'}`}></i>
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-gray-600 text-xs px-1">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {error && !loading && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-red-600"></i>
              <span>{error}</span>
            </div>
            <button onClick={loadCreditData} className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700">
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 border border-gray-100 animate-pulse space-y-4">
                <div className="h-5 bg-gray-200 rounded-md w-3/4"></div>
                <div className="h-3 bg-gray-100 rounded-md w-1/2"></div>
                <div className="space-y-2 py-3">
                  <div className="h-8 bg-gray-100 rounded-xl"></div>
                  <div className="h-8 bg-gray-100 rounded-xl"></div>
                  <div className="h-8 bg-gray-100 rounded-xl"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        {!loading && (
          <div className="grid lg:grid-cols-3 gap-4">
            {/* COLUMN 1: Credit You GIVE */}
            <div className="card p-5 border-2 border-orange-200 bg-white flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-orange-900 mb-1 flex items-center gap-1.5">
                  <i className="fa-solid fa-store text-orange-600"></i>
                  <span>{t('creditYouGiveTitle', 'Credit You GIVE')}</span>
                </h3>
                <p className="text-xs text-gray-500 mb-3">{t('creditYouGiveSubtitle', 'When other stores buy from you on khata')}</p>

                {/* Display Current Terms */}
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between p-2 rounded-xl bg-orange-50">
                    <span className="text-gray-700">Credit days</span>
                    <span className="font-extrabold text-orange-900" id="dispCreditDays">{rules.credit_days || 14} days</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-gray-50">
                    <span className="text-gray-600">Min order for credit</span>
                    <span className="font-bold text-gray-900" id="dispCreditMin">₹{Number(rules.min_order_amount || 5000).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-gray-50">
                    <span className="text-gray-600">Max per store</span>
                    <span className="font-bold text-gray-900" id="dispCreditPerShop">₹{Number(rules.max_limit_per_store || 50000).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-gray-50">
                    <span className="text-gray-600">Max stores on credit</span>
                    <span className="font-bold text-gray-900" id="dispCreditMaxShops">{rules.max_stores_count || 10} shops</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-xl bg-gray-50">
                    <span className="text-gray-600">Total exposure cap</span>
                    <span className="font-bold text-gray-900" id="dispCreditTotalCap">₹{Number(rules.total_exposure_cap || 300000).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Live Utilization Progress Bars */}
                <div className="mb-4 p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Stores using your credit</span>
                    <span className="font-bold text-gray-900" id="creditGiveShopCount">
                      {giveMetrics.stores_count || 0} / {giveMetrics.max_stores || 10}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-orange-500 rounded-full transition-all duration-500"
                      id="creditGiveShopBar"
                      style={{ width: `${giveStorePct}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-xs mt-2.5 mb-1">
                    <span className="text-gray-600">Exposure used</span>
                    <span className="font-bold text-gray-900" id="creditGiveExposure">
                      ₹{Number(giveMetrics.exposure_used || 0).toLocaleString('en-IN')} / ₹{(Number(giveMetrics.total_cap || 300000) / 100000).toFixed(0)}L
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-amber-500 rounded-full transition-all duration-500"
                      id="creditGiveExposureBar"
                      style={{ width: `${giveExposurePct}%` }}
                    ></div>
                  </div>
                </div>

                {/* Editable Inputs */}
                <div className="space-y-2.5 mb-4">
                  <label className="text-xs font-bold text-gray-600 block">Edit Terms Configuration</label>
                  <select
                    id="inpCreditDaysGive"
                    value={giveForm.credit_days}
                    onChange={(e) => setGiveForm(prev => ({ ...prev, credit_days: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-sm bg-white"
                  >
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="21">21 days</option>
                    <option value="30">30 days</option>
                    <option value="45">45 days</option>
                    <option value="60">60 days</option>
                  </select>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      id="inpCreditMinGive"
                      value={giveForm.min_order_amount}
                      onChange={(e) => setGiveForm(prev => ({ ...prev, min_order_amount: e.target.value }))}
                      placeholder="Min order ₹"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold"
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      id="inpCreditPerShopGive"
                      value={giveForm.max_limit_per_store}
                      onChange={(e) => setGiveForm(prev => ({ ...prev, max_limit_per_store: e.target.value }))}
                      placeholder="Max ₹ per store"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold"
                    />
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      id="inpCreditMaxShopsGive"
                      value={giveForm.max_stores_count}
                      onChange={(e) => setGiveForm(prev => ({ ...prev, max_stores_count: e.target.value }))}
                      placeholder="Max number of shops"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold"
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      id="inpCreditTotalCapGive"
                      value={giveForm.total_exposure_cap}
                      onChange={(e) => setGiveForm(prev => ({ ...prev, total_exposure_cap: e.target.value }))}
                      placeholder="Total exposure cap ₹"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold"
                    />
                  </div>

                  <button
                    onClick={handleSaveGiveTerms}
                    disabled={savingGive}
                    className="btn-primary !text-xs w-full flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {savingGive ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>Saving Terms...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-floppy-disk"></i>
                        <span>{t('creditSaveTermsBtn', 'Save Terms')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dynamic Stores on your credit */}
              <div className="pt-2 border-t border-orange-100">
                <h4 className="font-bold mb-2 text-xs text-gray-800 uppercase tracking-wider">Stores on your credit</h4>
                <div className="space-y-1 text-xs max-h-36 overflow-y-auto pr-1">
                  {giveMetrics.stores_on_credit && giveMetrics.stores_on_credit.length > 0 ? (
                    giveMetrics.stores_on_credit.map((s, idx) => (
                      <div key={s.store_id || idx} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 hover:bg-orange-50/60 transition">
                        <span className="font-semibold text-gray-800 truncate mr-2">{s.store_name}</span>
                        <span className="font-bold text-amber-800 shrink-0">
                          ₹{Number(s.amount_owed).toLocaleString('en-IN')} · {s.days_left}d left
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-gray-400 bg-gray-50 rounded-xl">
                      No stores currently owe credit to you
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 2: Credit from OTHER Shops */}
            <div className="card p-5 border-2 border-blue-200 bg-white flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-blue-900 mb-1 flex items-center gap-1.5">
                  <i className="fa-solid fa-shop text-blue-600"></i>
                  <span>{t('creditFromOthersTitle', 'Credit from OTHER Shops')}</span>
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  When you buy — each seller sets their own terms. You can owe max <b id="dispBuyMaxShops">{rules.buy_max_shops || 5}</b> shops at once, up to <b id="dispBuyPerShop">₹{Number(rules.buy_max_per_shop || 25000).toLocaleString('en-IN')}</b> each.
                </p>

                {/* Live Utilization Progress */}
                <div className="mb-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Active shop credits</span>
                    <span className="font-bold text-gray-900" id="creditGetShopCount">
                      {receiveMetrics.active_shops_count || 0} / {receiveMetrics.max_shops || 5}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${receiveShopPct}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-xs mt-2.5 mb-1">
                    <span className="text-gray-600">Total you owe sellers</span>
                    <span className="font-bold text-red-700">₹{Number(receiveMetrics.total_owed || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Table of active credits you owe */}
                <div className="overflow-x-auto mb-3 max-h-40 overflow-y-auto pr-1">
                  <table className="w-full text-xs text-left">
                    <thead className="text-gray-500 sticky top-0 bg-white">
                      <tr className="border-b border-gray-100">
                        <th className="pb-1">Store</th>
                        <th className="pb-1">Days</th>
                        <th className="pb-1">Limit</th>
                        <th className="pb-1 text-right">Owe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100" id="sellerCreditTable">
                      {receiveMetrics.seller_credits && receiveMetrics.seller_credits.length > 0 ? (
                        receiveMetrics.seller_credits.map((sc, idx) => (
                          <tr key={sc.store_id || idx} className="hover:bg-blue-50/40">
                            <td className="py-1.5 font-bold text-gray-800">{sc.store_name}</td>
                            <td className="py-1.5 text-gray-600">{sc.credit_days}d</td>
                            <td className="py-1.5 text-gray-600">₹{(Number(sc.limit) / 1000).toFixed(0)}k</td>
                            <td className="py-1.5 text-red-700 font-bold text-right">₹{Number(sc.amount_owed).toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-3 text-center text-gray-400">
                            No active supplier credits owed
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-3 flex items-start gap-1.5">
                  <i className="fa-solid fa-info-circle text-amber-700 mt-0.5 shrink-0"></i>
                  <span>At checkout: if you already owe {rules.buy_max_shops || 5} shops, you must settle one before buying on credit from a new store.</span>
                </div>
              </div>

              {/* Buying Limits Form */}
              <div className="space-y-2 pt-2 border-t border-blue-100">
                <label className="text-xs font-bold text-gray-600 block">Max shops you can owe (your setting)</label>
                <input
                  type="number"
                  id="inpBuyMaxShops"
                  value={buyForm.buy_max_shops}
                  onChange={(e) => setBuyForm(prev => ({ ...prev, buy_max_shops: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold"
                />

                <label className="text-xs font-bold text-gray-600 block">Max ₹ per seller (your cap)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    id="inpBuyPerShop"
                    value={buyForm.buy_max_per_shop}
                    onChange={(e) => setBuyForm(prev => ({ ...prev, buy_max_per_shop: e.target.value }))}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold"
                  />
                </div>

                <button
                  onClick={handleSaveBuyLimits}
                  disabled={savingBuy}
                  className="btn-soft !text-xs w-full flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  {savingBuy ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Saving Limits...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i>
                      <span>{t('creditSaveBuyingLimitsBtn', 'Save Buying Limits')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* COLUMN 3: ADAB Credit Line */}
            <div className="card p-5 border-2 border-purple-200 bg-white flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-purple-900 mb-1 flex items-center gap-1.5">
                  <i className="fa-solid fa-building-columns text-purple-600"></i>
                  <span>{t('creditAdabLineTitle', 'ADAB Credit Line')}</span>
                </h3>
                <p className="text-xs text-gray-500 mb-3">Platform credit to buy stock — separate from shop-to-shop khata</p>

                {/* Limit Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-center text-sm">
                  <div className="p-2.5 rounded-xl bg-purple-50">
                    <div className="text-[10px] text-gray-500 font-semibold">Limit</div>
                    <div className="font-extrabold text-purple-900">
                      ₹{(Number(adabLine.total_limit || 250000) / 100000).toFixed(1)}L
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50">
                    <div className="text-[10px] text-gray-500 font-semibold">Used</div>
                    <div className="font-extrabold text-gray-900">
                      ₹{Number(adabLine.utilized_amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-green-50">
                    <div className="text-[10px] text-gray-500 font-semibold">Left</div>
                    <div className="font-extrabold text-green-800">
                      ₹{Number(adabLine.available_amount || 250000).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  ADAB pays sellers on time; you repay ADAB in 14 days. Good for festival stock-up when sellers want instant payment.
                </p>

                {/* Details list */}
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between p-2 rounded-lg bg-gray-50">
                    <span className="text-gray-600">Interest</span>
                    <span className="font-bold text-green-700">{adabLine.interest || '0% for 14 days'}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-gray-50">
                    <span className="text-gray-600">Eligibility</span>
                    <span className="font-bold text-gray-900">
                      {adabLine.gstin_verified ? 'GSTIN verified ✓' : 'GSTIN Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-gray-50">
                    <span className="text-gray-600">Status</span>
                    <span className="font-bold text-green-700">{adabLine.status || 'Active'}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 border-t border-purple-100 space-y-2">
                <Link
                  to="/credit-apply"
                  className="btn-primary !text-xs w-full block text-center py-2.5 rounded-xl font-bold"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square mr-1"></i> Apply / Increase Limit
                </Link>
                <Link
                  to="/finance"
                  className="btn-soft !text-xs w-full block text-center py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  <i className="fa-solid fa-wallet mr-1"></i> View in Money & Credit
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
