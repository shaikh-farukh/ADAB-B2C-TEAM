import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSeller } from '../../context/SellerContext';

export default function Sidebar() {
  const {
    store,
    profile,
    kycSteps,
    isCriticalSetupDone,
    isApplicationSubmitted = false,
    isKycApproved = false,
    isKycRejected = false,
    logout
  } = useSeller();
  const navigate = useNavigate();
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const storeName = store?.store_name || 'My Store';
  const initial = (storeName || 'S').substring(0, 2).toUpperCase();

  const completedCount = [1, 2, 3, 4, 5].filter((s) => Boolean(kycSteps?.[`step${s}`])).length;
  const rawKycStatus = String(profile?.kyc_status || 'DRAFT').trim().toUpperCase();
  const kycStatus = isKycApproved ? 'APPROVED' : isKycRejected ? 'REJECTED' : rawKycStatus;
  const canAccessTracker = Boolean(isCriticalSetupDone || isApplicationSubmitted || isKycApproved || isKycRejected);

  // Dynamic Verification Badge Config
  let statusMeta = {
    label: 'Unverified • KYC Required',
    cardClass: 'from-rose-50 to-amber-50 border-rose-200',
    avatarClass: 'bg-rose-600',
    titleClass: 'text-rose-950',
    subClass: 'text-rose-700',
    dotClass: 'bg-rose-500 animate-pulse'
  };

  if (isKycApproved) {
    statusMeta = {
      label: 'Verified Merchant',
      cardClass: 'from-emerald-50 to-teal-50 border-emerald-100',
      avatarClass: 'bg-emerald-600',
      titleClass: 'text-emerald-950',
      subClass: 'text-emerald-700',
      dotClass: 'bg-emerald-500 animate-pulse'
    };
  } else if (isKycRejected || kycStatus === 'REJECTED') {
    statusMeta = {
      label: 'KYC Rejected',
      cardClass: 'from-rose-50 to-orange-50 border-rose-200',
      avatarClass: 'bg-rose-600',
      titleClass: 'text-rose-950',
      subClass: 'text-rose-700',
      dotClass: 'bg-rose-600 animate-pulse'
    };
  } else if (isCriticalSetupDone && profile?.submitted_at && !kycSteps?.step7) {
    statusMeta = {
      label: `Resubmit Needed (${completedCount}/5)`,
      cardClass: 'from-amber-50 to-orange-50 border-amber-300',
      avatarClass: 'bg-amber-600',
      titleClass: 'text-amber-950',
      subClass: 'text-amber-800',
      dotClass: 'bg-amber-500 animate-pulse'
    };
  } else if (isApplicationSubmitted) {
    statusMeta = {
      label: 'Pending Verification',
      cardClass: 'from-blue-50 to-indigo-50 border-blue-200',
      avatarClass: 'bg-blue-600',
      titleClass: 'text-blue-950',
      subClass: 'text-blue-700',
      dotClass: 'bg-blue-500 animate-pulse'
    };
  } else if (isCriticalSetupDone) {
    statusMeta = {
      label: `Draft KYC (${completedCount}/5)`,
      cardClass: 'from-amber-50 to-emerald-50 border-amber-200',
      avatarClass: 'bg-amber-600',
      titleClass: 'text-amber-950',
      subClass: 'text-amber-800',
      dotClass: 'bg-amber-500'
    };
  }

  const lockedClass = !isKycApproved
    ? 'opacity-40 pointer-events-none cursor-not-allowed select-none '
    : '';

  const trackerLockedClass = !canAccessTracker
    ? 'opacity-40 pointer-events-none cursor-not-allowed select-none '
    : '';

  const navClass = ({ isActive }) =>
    `${lockedClass}${isActive && isKycApproved ? 'nav-on ' : 'text-gray-700 hover:bg-gray-100 '}w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition`;

  const onboardingNavClass = ({ isActive }) =>
    `${isActive ? 'nav-on ' : 'text-gray-700 hover:bg-gray-100 '}w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition`;

  const trackerNavClass = ({ isActive }) =>
    `${trackerLockedClass}${isActive && canAccessTracker ? 'nav-on ' : 'text-gray-700 hover:bg-gray-100 '}w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition`;

  const posClass = ({ isActive }) =>
    `${lockedClass}${isActive && isKycApproved ? 'nav-on font-bold ' : 'text-gray-700 hover:bg-indigo-50/70 hover:text-indigo-900 '}w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition`;

  const closeDrawer = () => {
    const drawer = document.getElementById('sellerDrawer');
    if (drawer) drawer.classList.remove('open');
    const overlay = document.getElementById('drawerOverlaySeller');
    if (overlay) overlay.classList.remove('open');
  };

  return (
    <aside id="sellerDrawer" className="mobile-seller-drawer lg:static lg:transform-none lg:w-60 lg:p-0 lg:bg-transparent lg:shadow-none shrink-0">
      <div className="lg:hidden flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
        <div className="font-extrabold text-base flex items-center gap-2 text-green-900">
          <div className="w-7 h-7 rounded-lg bg-green-700 text-white flex items-center justify-center text-sm">A</div> 
          ADAB Seller
        </div>
        <button 
          onClick={closeDrawer}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
          aria-label="Close navigation"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <nav 
        onClick={(e) => {
          const anchor = e.target.closest('a');
          if (anchor) {
            const href = anchor.getAttribute('href') || '';
            const isOnboardingLink = href.startsWith('/onboarding');
            const isTrackerLink = href.startsWith('/regstatus');
            if (!isKycApproved) {
              if (isTrackerLink && !canAccessTracker) {
                e.preventDefault();
                return;
              }
              if (!isOnboardingLink && !isTrackerLink) {
                e.preventDefault();
                return;
              }
            }
            closeDrawer();
          }
        }}
        className="card p-2.5 text-sm sticky top-20 sidebar-scroll shadow-sm border border-gray-200/80 space-y-1"
      >
        {/* Dynamic Store Quick Profile Badge in Sidebar */}
        <div className={`p-2.5 mb-2 rounded-xl bg-gradient-to-r ${statusMeta.cardClass} border flex items-center gap-2.5`}>
          <div className={`w-8 h-8 rounded-lg ${statusMeta.avatarClass} text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-sm`}>
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className={`font-extrabold text-xs ${statusMeta.titleClass} truncate`} id="sidebarStoreName">
              {storeName}
            </div>
            <div className={`text-[10px] ${statusMeta.subClass} font-semibold flex items-center gap-1`} id="sidebarVerifyBadge">
              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`}></span> {statusMeta.label}
            </div>
          </div>
        </div>

        {!isKycApproved && !canAccessTracker && (
          <div className="p-2 mb-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-900 flex items-start gap-2">
            <i className="fa-solid fa-lock text-amber-600 mt-0.5"></i>
            <span>Complete Critical Steps 1 &amp; 2 to unlock Application Tracker.</span>
          </div>
        )}

        {!isKycApproved && isKycRejected && (
          <div className="p-2 mb-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-900 flex items-start gap-2">
            <i className="fa-solid fa-circle-xmark text-rose-600 mt-0.5"></i>
            <span>KYC Rejected by Admin. Update &amp; resubmit Store KYC to unlock portal.</span>
          </div>
        )}

        {!isKycApproved && !isKycRejected && canAccessTracker && (
          <div className="p-2 mb-2 rounded-xl bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-900 flex items-start gap-2">
            <i className="fa-solid fa-shield-halved text-blue-600 mt-0.5"></i>
            <span>
              {isApplicationSubmitted
                ? 'Awaiting Admin KYC approval to unlock full store sidebar.'
                : 'Critical KYC saved! Submit in Application Tracker for Admin approval.'}
            </span>
          </div>
        )}

        {/* 1. MAIN */}
        <div className="nav-label" data-i18n="navHome">Main</div>
        <NavLink to="/" className={navClass}>
          <i className="fa-solid fa-house w-4 text-emerald-600"></i> <span data-i18n="navDashboard">Dashboard</span>
          {!isKycApproved && <i className="fa-solid fa-lock ml-auto text-[10px] text-gray-400"></i>}
        </NavLink>
        <NavLink to="/pos" className={posClass}>
          <i className="fa-solid fa-cash-register w-4 text-indigo-600"></i> <span data-i18n="navPOS">Bill Counter (POS)</span>
          <span className="ml-auto text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">Fast</span>
        </NavLink>
        <NavLink to="/onboarding" className={onboardingNavClass}>
          <i className="fa-solid fa-clipboard-check w-4 text-emerald-600"></i> <span>Store KYC</span>
          <span className="ml-auto bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
            {completedCount}/5
          </span>
        </NavLink>
        <NavLink to="/regstatus" className={trackerNavClass}>
          <i className="fa-solid fa-clock-rotate-left w-4 text-blue-600"></i> <span>Application Tracker</span>
          {canAccessTracker ? (
            <span id="navRegStatusDot" className={`ml-auto w-2 h-2 rounded-full ${statusMeta.dotClass}`}></span>
          ) : (
            <i className="fa-solid fa-lock ml-auto text-[10px] text-gray-400"></i>
          )}
        </NavLink>

        {/* 2. SELL & DISPATCH */}
        <div className="nav-label pt-2" data-i18n="navSell">Sell &amp; Orders</div>
        <NavLink to="/orders" className={navClass}>
          <i className="fa-solid fa-bag-shopping w-4 text-emerald-600"></i> <span data-i18n="navAppOrders">App Orders</span>
          <span className="ml-auto bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">14</span>
        </NavLink>
        <NavLink to="/partner" className={navClass}>
          <i className="fa-solid fa-store w-4 text-orange-600"></i> <span data-i18n="navStoreOrders">B2B Store Orders</span>
          <span className="ml-auto bg-orange-100 text-orange-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">8</span>
        </NavLink>
        <NavLink to="/products" className={navClass}>
          <i className="fa-solid fa-boxes-stacked w-4 text-purple-600"></i> <span data-i18n="navMyProducts">My Products Catalog</span>
        </NavLink>
        <NavLink to="/create" className={navClass}>
          <i className="fa-solid fa-circle-plus w-4 text-emerald-600"></i> <span data-i18n="navCreate">Add New Product</span>
        </NavLink>
        <NavLink to="/returns" className={navClass}>
          <i className="fa-solid fa-rotate-left w-4 text-rose-500"></i> <span data-i18n="navReturns">Returns &amp; Refunds</span>
          <span className="ml-auto bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">3</span>
        </NavLink>

        {/* 3. BUY STOCK & CATALOG */}
        <div className="nav-label pt-2" data-i18n="navBuy">Buy &amp; Restock</div>
        <NavLink to="/mastersearch" className={navClass}>
          <i className="fa-solid fa-magnifying-glass w-4 text-blue-600"></i> <span data-i18n="navMasterSearch">Search &amp; Buy</span>
        </NavLink>
        <NavLink to="/buy" className={navClass}>
          <i className="fa-solid fa-map-pin w-4 text-teal-600"></i> <span data-i18n="navBuyNearby">Nearby Kiranas</span>
        </NavLink>
        <NavLink to="/catalog" className={navClass}>
          <i className="fa-solid fa-book-open w-4 text-indigo-600"></i> <span data-i18n="navMasterCat">National FMCG Catalog</span>
        </NavLink>
        <NavLink to="/partnerbrands" className={navClass}>
          <i className="fa-solid fa-handshake w-4 text-amber-600"></i> <span data-i18n="navPartnerPack">Partner Brands</span>
        </NavLink>
        <NavLink to="/buycart" className={navClass}>
          <i className="fa-solid fa-cart-shopping w-4 text-blue-600"></i> <span>Purchase Cart</span>
          <span id="navBuyCartBadge" className="ml-auto bg-blue-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">0</span>
        </NavLink>

        {/* 4. FINANCIALS & PAYMENTS */}
        <div className="nav-label pt-2" data-i18n="navMoney">Finance &amp; Credit</div>
        <NavLink to="/finance" className={navClass}>
          <i className="fa-solid fa-wallet w-4 text-emerald-600"></i> <span data-i18n="navMoneyCredit">Bank Payouts &amp; Money</span>
        </NavLink>
        <NavLink to="/credit-apply" className={navClass}>
          <i className="fa-solid fa-building-columns w-4 text-purple-600"></i> <span>Bank Credit Lines</span>
          <span className="ml-auto text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800">0% Int</span>
        </NavLink>
        <NavLink to="/creditterms" className={navClass}>
          <i className="fa-solid fa-handshake-angle w-4 text-teal-600"></i> <span>Store Credit Rules</span>
        </NavLink>
        <NavLink to="/points" className={navClass}>
          <i className="fa-solid fa-star w-4 text-amber-500"></i> <span data-i18n="navPoints">Reward Points</span>
        </NavLink>
        <NavLink to="/marketing" className={navClass}>
          <i className="fa-solid fa-ticket w-4 text-rose-500"></i> <span>Coupons &amp; Promos</span>
        </NavLink>
        <NavLink to="/pricing" className={navClass}>
          <i className="fa-solid fa-tags w-4 text-purple-600"></i> <span>Pricing Schedules</span>
        </NavLink>

        {/* 5. LOGISTICS & OPERATIONS */}
        <div className="nav-label pt-2" data-i18n="navMore">Operations</div>
        <NavLink to="/delivery" className={navClass}>
          <i className="fa-solid fa-motorcycle w-4 text-emerald-600"></i> <span data-i18n="navDelivery">Delivery</span>
        </NavLink>
        <NavLink to="/freight" className={navClass}>
          <i className="fa-solid fa-truck-ramp-box w-4 text-amber-600"></i> <span>Freight &amp; Logistics</span>
        </NavLink>
        <NavLink to="/messages" className={navClass}>
          <i className="fa-solid fa-comments w-4 text-indigo-600"></i> <span data-i18n="navMessages">Store Messages</span>
          <span className="ml-auto bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">5</span>
        </NavLink>
        <NavLink to="/recommendations" className={navClass}>
          <i className="fa-solid fa-wand-magic-sparkles w-4 text-purple-600"></i> <span data-i18n="navRecommend">AI Insights</span>
        </NavLink>
        <NavLink to="/reports" className={navClass}>
          <i className="fa-solid fa-chart-line w-4 text-teal-600"></i> <span data-i18n="navReports">Sales Reports</span>
        </NavLink>
        <NavLink to="/settings" className={navClass}>
          <i className="fa-solid fa-gear w-4 text-gray-500"></i> <span data-i18n="navSettings">Store Settings</span>
        </NavLink>
        <button
          type="button"
          onClick={() => {
            closeDrawer();
            setShowSignOutModal(true);
          }}
          className="text-rose-600 hover:bg-rose-50 w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition font-bold cursor-pointer"
        >
          <i className="fa-solid fa-right-from-bracket w-4 text-rose-500"></i> <span>Sign Out</span>
        </button>

        {/* 6. EXPANDABLE MORE UTILITIES */}
        <details className={`mt-2 px-1 border-t border-gray-100 pt-1.5 ${lockedClass}`}>
          <summary className="text-xs font-extrabold text-gray-400 hover:text-gray-700 cursor-pointer py-1 flex items-center justify-between" data-i18n="navShowMore">
            <span>More Utilities</span> <i className="fa-solid fa-chevron-down text-[10px]"></i>
          </summary>
          <div className="space-y-0.5 mt-1">
            <NavLink to="/" className={({ isActive }) => `${isActive && isKycApproved ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Order History Archive</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive && isKycApproved ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Customer Ratings &amp; Reviews</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive && isKycApproved ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Help &amp; Support</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive && isKycApproved ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Merchant FAQ</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive && isKycApproved ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Driver Management</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive && isKycApproved ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Export &amp; IEC Trade</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive && isKycApproved ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Certificates &amp; FSSAI</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive && isKycApproved ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Store Health &amp; Audits</NavLink>
            <NavLink to="/" className={({ isActive }) => `${isActive && isKycApproved ? 'nav-on font-bold ' : 'text-gray-600 hover:bg-gray-100 '}w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center`}>Notifications Log</NavLink>
          </div>
        </details>
      </nav>

      {/* SIGN OUT CONFIRMATION MODAL */}
      {showSignOutModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowSignOutModal(false)}
          >
            <div
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 text-lg">
                  <i className="fa-solid fa-right-from-bracket"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold text-gray-900">
                    Sign Out of Store Portal?
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Are you sure you want to sign out of <b className="text-gray-800">{storeName}</b>? You can sign back in anytime with your mobile number and PIN.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowSignOutModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-extrabold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSignOutModal(false);
                    if (logout) logout();
                    navigate('/login', { replace: true });
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                  <span>Yes, Sign Out</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </aside>
  );
}
