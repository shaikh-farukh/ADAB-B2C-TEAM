import React, { useState, useEffect } from 'react';
import { RewardAPI } from '../services/api';

/**
 * Reward Points & Ledger View (sec-points)
 * Features:
 * 1. Points Balance Banner:
 *    - High-contrast gradient card (from-amber-400 to-orange-500)
 *    - Big points counter (#pointsBig e.g. 2,840)
 *    - Redemption rule: "1 point = ₹1 off · Max 50% per order"
 *    - Rupee equivalent valuation & Loyalty Tier pill (BRONZE, SILVER, GOLD)
 *    - Tier progression progress bar
 * 2. Points Ledger:
 *    - Chronological transaction list
 *    - Positive points earned from orders (+56 in text-green-700)
 *    - Negative points checkout discounts (-180 in text-orange-600)
 *    - Filter by transaction type (ALL, EARN_ORDER, REDEEM_ORDER, SIGNUP_BONUS)
 * 3. Redemption & Benefits Guide:
 *    - Clear rules explaining 1 pt = ₹1, 50% max order discount, and tier multipliers
 */
export default function PointsView({
  onBack,
  onNavigate,
  showToast = () => {},
  initialSummary = null,
  initialLedger = []
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [ledger, setLedger] = useState(initialLedger);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Load live rewards data from backend API
  const refreshRewardsData = async () => {
    try {
      setLoading(true);
      const [sumRes, ledRes] = await Promise.allSettled([
        RewardAPI.getRewardsSummary(),
        RewardAPI.getLedger({
          transaction_type: activeFilter === 'ALL' ? '' : activeFilter,
          limit: 50
        })
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value?.data) {
        setSummary(sumRes.value.data);
      }
      if (ledRes.status === 'fulfilled' && ledRes.value?.data) {
        setLedger(ledRes.value.data.ledger || ledRes.value.data);
      }
    } catch (err) {
      console.warn('Failed to load rewards data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshRewardsData();
  }, [activeFilter]);

  // Points values
  const pointsBalance = summary?.points_balance ?? 2840;
  const lifetimeEarned = summary?.lifetime_earned ?? pointsBalance;
  const currentTier = summary?.tier || (lifetimeEarned >= 2000 ? 'GOLD' : lifetimeEarned >= 500 ? 'SILVER' : 'BRONZE');
  const rupeeValue = summary?.rupee_value || Number(pointsBalance).toFixed(2);
  const tierBenefits = summary?.tier_benefits || {};
  const multiplier = tierBenefits?.multiplier || (currentTier === 'GOLD' ? '1.5x' : currentTier === 'SILVER' ? '1.25x' : '1.0x');

  // Tier progress calculation
  const getNextTierDetails = () => {
    if (currentTier === 'GOLD') {
      return { next: null, needed: 0, progress: 100, label: 'Highest VIP Tier Reached' };
    }
    if (currentTier === 'SILVER') {
      const needed = Math.max(0, 2000 - lifetimeEarned);
      const progress = Math.min(100, Math.round(((lifetimeEarned - 500) / 1500) * 100));
      return { next: 'GOLD', needed, progress, label: `${needed} pts to GOLD (1.5x points & Free Delivery)` };
    }
    const needed = Math.max(0, 500 - lifetimeEarned);
    const progress = Math.min(100, Math.round((lifetimeEarned / 500) * 100));
    return { next: 'SILVER', needed, progress, label: `${needed} pts to SILVER (1.25x points)` };
  };

  const nextTier = getNextTierDetails();

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return String(dateStr);
    }
  };

  // Helper transaction label
  const getTransactionLabel = (tx) => {
    const type = (tx.transaction_type || '').toUpperCase();
    const ref = tx.reference_id;

    if (type === 'EARN_ORDER') {
      return ref ? `+ Order #${ref.slice(0, 12)}` : '+ Order purchase points';
    }
    if (type === 'REDEEM_ORDER') {
      return ref ? `- Checkout discount (#${ref.slice(0, 8)})` : '- Checkout discount';
    }
    if (type === 'SIGNUP_BONUS') {
      return '+ Welcome bonus points';
    }
    if (type === 'EARN_POS') {
      return '+ In-store POS purchase';
    }
    return tx.points_change >= 0 ? `+ Points credit` : `- Points redemption`;
  };

  return (
    <section id="sec-points" className="pt-2 pb-8 max-w-4xl mx-auto space-y-4">
      {/* 1. Header & Navigation */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack || (() => onNavigate && onNavigate('account'))}
            className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-center transition cursor-pointer border border-gray-200"
            title="Back to Account"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
          </button>
          <div>
            <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
              Reward Points &amp; Loyalty Ledger
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Earn on every order, save directly on checkout totals
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('stores')}
          className="green-btn !py-2 !px-3.5 text-xs font-bold"
        >
          <i className="fa-solid fa-bag-shopping mr-1.5"></i>
          <span>Shop &amp; Earn</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 2. POINTS BALANCE BANNER (Matching unified demo)               */}
      {/* ============================================================== */}
      <div
        className="points-hero-card bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden space-y-4 border border-amber-500/20"
        style={{
          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 45%, #EA580C 100%)',
          color: '#ffffff'
        }}
      >
        {/* Subtle background decorative shapes */}
        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="absolute right-12 top-4 w-16 h-16 bg-white/10 rounded-full blur-lg pointer-events-none"></div>

        {/* Top: Tier badge & Rupee valuation */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span className="bg-black/25 backdrop-blur-md text-amber-100 text-[11px] font-extrabold uppercase px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5 shadow-sm">
              <i className="fa-solid fa-crown text-amber-200"></i>
              <span>{`${currentTier} TIER · ${multiplier}`}</span>
            </span>
          </div>

          <span className="bg-black/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20 shadow-sm">
            {`Worth ₹${Number(rupeeValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </span>
        </div>

        {/* Center: Available Points & Big Count */}
        <div className="text-center relative z-10">
          <div className="text-sm text-amber-100/90 font-medium tracking-wide">Available points</div>
          <div className="text-4xl md:text-5xl font-black mt-1 tracking-tight text-white drop-shadow-sm" id="pointsBig">
            {Number(pointsBalance).toLocaleString('en-IN')}
          </div>
          <div className="text-sm text-white/95 mt-1 font-medium bg-black/15 py-1 px-3 rounded-full inline-block backdrop-blur-xs">
            1 point = ₹1 off · Max 50% per order
          </div>
        </div>

        {/* Bottom: Loyalty Tier Progress Bar */}
        <div className="pt-2 border-t border-white/20 relative z-10 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-white/90 font-bold flex items-center gap-1.5">
              <i className="fa-solid fa-gem text-xs text-amber-200"></i>
              <span>Tier Progress</span>
            </span>
            <span className="font-extrabold text-amber-100">{nextTier.label}</span>
          </div>

          <div className="w-full bg-black/25 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
            <div
              className="bg-white h-full rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${Math.max(5, nextTier.progress)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 3. Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-xs">
          <div className="text-xs text-gray-500 font-medium">Lifetime Earned</div>
          <div className="text-lg font-extrabold text-gray-900 mt-1">
            {Number(lifetimeEarned).toLocaleString('en-IN')} <span className="text-xs text-gray-400">pts</span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-xs">
          <div className="text-xs text-gray-500 font-medium">Points Multiplier</div>
          <div className="text-lg font-extrabold text-brand-green mt-1">
            {multiplier}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-xs">
          <div className="text-xs text-gray-500 font-medium">Direct Discount</div>
          <div className="text-lg font-extrabold text-amber-600 mt-1">
            ₹1 <span className="text-xs text-gray-400">per pt</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. POINTS LEDGER (Matching unified demo structure)             */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
        {/* Ledger Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
          <div>
            <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left text-amber-500"></i>
              <span>Points Activity Ledger</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Audited transaction log of points earned and discounts applied
            </p>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {[
              { id: 'ALL', label: 'All Transactions' },
              { id: 'EARN_ORDER', label: 'Orders Earned' },
              { id: 'REDEEM_ORDER', label: 'Discounts Used' },
              { id: 'SIGNUP_BONUS', label: 'Bonuses' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-[#18753C] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="py-8 text-center text-gray-400 space-y-2">
            <i className="fa-solid fa-spinner fa-spin text-xl text-amber-500"></i>
            <p className="text-xs">Updating points ledger...</p>
          </div>
        )}

        {/* Ledger Rows matching demo */}
        {!loading && ledger.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-lg mx-auto">
              <i className="fa-solid fa-receipt"></i>
            </div>
            <div className="font-bold text-xs text-gray-800">No ledger transactions yet</div>
            <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
              Points earned from your delivered orders and discounts applied at checkout will be documented here.
            </p>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            {ledger.map((tx, idx) => {
              const isPositive = Number(tx.points_change) >= 0;
              const formattedDate = formatDate(tx.created_at);

              return (
                <div
                  key={tx.id || idx}
                  className="flex items-center justify-between p-3.5 bg-gray-50/80 hover:bg-gray-50 rounded-xl border border-gray-100 transition"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <span>{getTransactionLabel(tx)}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-2">
                      <span>{formattedDate || 'Recent'}</span>
                      {tx.balance_after !== undefined && tx.balance_after !== null && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{`Balance: ${tx.balance_after} pts`}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`font-bold font-mono text-sm ${
                      isPositive ? 'text-green-700' : 'text-orange-600'
                    }`}
                  >
                    {isPositive ? `+${tx.points_change}` : `${tx.points_change}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. How Points Work Guide */}
      <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 text-xs space-y-2">
        <h4 className="font-extrabold text-emerald-950 flex items-center gap-1.5">
          <i className="fa-solid fa-circle-info text-emerald-700"></i>
          <span>How ADAB Loyalty Points Work</span>
        </h4>
        <ul className="space-y-1 text-emerald-900 leading-relaxed list-disc list-inside">
          <li><b>Earn on Every Purchase:</b> Earn ~1 point for every ₹100 spent on delivered neighborhood orders.</li>
          <li><b>Direct Value:</b> 1 reward point = ₹1 direct reduction on your order checkout total.</li>
          <li><b>Instant Redemption:</b> Apply up to 50% of your total order amount using available reward points.</li>
          <li><b>Tier Progression:</b> Reach 500 lifetime points for Silver (1.25x multiplier) and 2,000 points for Gold (1.5x multiplier &amp; Free Delivery).</li>
        </ul>
      </div>
    </section>
  );
}
