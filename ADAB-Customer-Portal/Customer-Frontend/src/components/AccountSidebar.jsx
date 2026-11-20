export default function AccountSidebar({
  currentUser = null,
  profile = null,
  avatarUrl = null,
  addresses = [],
  ordersCount = 0,
  points = 0,
  walletBalance = 0,
  unreadNotifications = 0,
  activeTab = 'account',
  activeView = 'dashboard',
  placeholderTitle = '',
  onNavigate,
  onSelectView,
  showPlaceholder,
  onLogout,
  onOpenLogin,
  onCloseSidebar,
  selectedAddress = null,
  showToast
}) {
  const effectiveUser = currentUser || profile || (() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('adab_user') : null;
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const displayName = effectiveUser?.name || effectiveUser?.full_name || 'Customer';
  const displayEmail = effectiveUser?.email || '';
  const displayPhone = effectiveUser?.phone || '';
  const displayInitial = displayName ? displayName.charAt(0).toUpperCase() : 'C';

  const savedSelectedAddress = selectedAddress || (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('adab_selected_address') : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const activeAddress = (addresses && addresses.find(a => a.isDefault || a.is_default)) || (addresses && addresses[0]) || savedSelectedAddress;

  const displayRegion = (() => {
    if (activeAddress?.city && activeAddress?.state) {
      return `${activeAddress.city}, ${activeAddress.state}`;
    }
    if (activeAddress?.city) {
      return activeAddress.city;
    }
    if (profile?.city && profile?.state) {
      return `${profile.city}, ${profile.state}`;
    }
    if (profile?.city) {
      return profile.city;
    }
    if (effectiveUser?.city && effectiveUser?.state) {
      return `${effectiveUser.city}, ${effectiveUser.state}`;
    }
    if (effectiveUser?.city) {
      return effectiveUser.city;
    }
    if (activeAddress?.pincode || activeAddress?.zip) {
      return `PIN ${activeAddress.pincode || activeAddress.zip}`;
    }
    return '';
  })();

  const activeAvatarUrl = avatarUrl || profile?.profile_picture_url || effectiveUser?.profile_picture_url || effectiveUser?.avatar_url || null;
  const isLoggedIn = Boolean(effectiveUser);

  const displayOrders = ordersCount ?? 0;
  const displayPoints = points ?? profile?.points ?? 0;
  const displayWallet = walletBalance ?? profile?.wallet_balance ?? 0;
  const displayUnreadNotifications = unreadNotifications ?? 0;

  const handleSelectView = (viewName) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (onCloseSidebar) onCloseSidebar();
    if (onSelectView) {
      onSelectView(viewName);
    } else if (onNavigate) {
      onNavigate('account', { state: { view: viewName, fromAccount: true } });
    }
  };

  const handleNavigate = (tabName) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (onCloseSidebar) onCloseSidebar();
    if (onNavigate) {
      onNavigate(tabName, { state: { fromAccount: true } });
    }
  };

  const handlePlaceholder = (text, title) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (onCloseSidebar) onCloseSidebar();
    if (showPlaceholder) {
      showPlaceholder(text, title);
    } else if (onNavigate) {
      onNavigate('account', {
        state: {
          view: 'placeholder',
          placeholderText: text,
          placeholderTitle: title,
          fromAccount: true
        }
      });
    }
  };

  const SidebarNavItem = ({ icon, label, badge, badgeColor = 'bg-red-100 text-red-600', active, onClick }) => (
    <button
      type="button"
      onClick={() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (onClick) onClick();
      }}
      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none group ${
        active
          ? 'bg-[#E8F5E9] text-[#18753C] shadow-2xs font-extrabold'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'
      }`}
    >
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 transition-colors ${
          active ? 'bg-[#18753C] text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
        }`}
      >
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${badgeColor}`}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-3.5 w-full max-h-[calc(100vh-6.5rem)] overflow-y-auto pr-0.5">
      {/* 1. Profile Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-100/90 p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-[#18753C] text-white flex items-center justify-center text-lg font-black overflow-hidden shadow-2xs shrink-0">
              {activeAvatarUrl ? (
                <img
                  src={activeAvatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                displayInitial
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-gray-900 text-sm sm:text-base truncate">{displayName}</span>
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {displayPhone || displayEmail || 'ADAB Customer'}
            </p>
            {effectiveUser?.loyalty_tier && (
              <span className="inline-block mt-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                <i className="fa-solid fa-crown text-[8px] mr-0.5 text-amber-500"></i>
                {effectiveUser.loyalty_tier}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => handleSelectView('profile')}
            className="text-[#18753C] hover:text-[#156030] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <i className="fa-solid fa-pen-to-square text-[10px]"></i>
            <span>Edit Profile</span>
          </button>
          {displayRegion ? (
            <span
              className="text-xs text-gray-500 font-medium truncate max-w-[130px] flex items-center gap-1"
              title={displayRegion}
            >
              <i className="fa-solid fa-location-dot text-[10px] text-[#18753C]"></i>
              <span className="truncate">{displayRegion}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => handleSelectView('addresses')}
              className="text-xs text-gray-400 hover:text-[#18753C] font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              <i className="fa-solid fa-plus text-[9px]"></i>
              <span>Add Location</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Structured Navigation Menus */}
      <div className="bg-white rounded-2xl border border-gray-100/90 p-3 shadow-2xs space-y-3">
        {/* OVERVIEW */}
        <div>
          <div className="px-3 pb-1.5 text-[11px] font-black uppercase tracking-wider text-gray-400">Overview</div>
          <SidebarNavItem
            icon="fa-gauge-high"
            label="Dashboard Overview"
            active={activeTab === 'account' && activeView === 'dashboard'}
            onClick={() => handleSelectView('dashboard')}
          />
        </div>

        {/* ORDERS & PURCHASES */}
        <div>
          <div className="px-3 pb-1.5 text-[11px] font-black uppercase tracking-wider text-gray-400">Orders &amp; Shopping</div>
          <div className="space-y-1">
            <SidebarNavItem
              icon="fa-box"
              label="My Orders"
              badge={displayOrders > 0 ? displayOrders : null}
              badgeColor="bg-blue-100 text-blue-700"
              active={activeTab === 'orders' || activeTab === 'orderhistory'}
              onClick={() => handleNavigate('orders')}
            />
            <SidebarNavItem
              icon="fa-heart"
              label="Wishlist"
              active={activeTab === 'wishlist'}
              onClick={() => handleNavigate('wishlist')}
            />
            <SidebarNavItem
              icon="fa-rotate-left"
              label="Returns &amp; Refunds"
              active={activeTab === 'returns'}
              onClick={() => handleNavigate('returns')}
            />
          </div>
        </div>

        {/* WALLET & REWARDS */}
        <div>
          <div className="px-3 pb-1.5 text-[11px] font-black uppercase tracking-wider text-gray-400">Wallet &amp; Rewards</div>
          <div className="space-y-1">
            <SidebarNavItem
              icon="fa-star"
              label="ADAB Rewards"
              badge={`${Number(displayPoints).toLocaleString('en-IN')} pts`}
              badgeColor="bg-amber-100 text-amber-800"
              active={activeTab === 'points' || activeTab === 'rewards'}
              onClick={() => handleNavigate('points')}
            />
            <SidebarNavItem
              icon="fa-wallet"
              label="ADAB Wallet"
              badge={`₹${Number(displayWallet).toLocaleString('en-IN')}`}
              badgeColor="bg-emerald-100 text-emerald-800"
              active={activeTab === 'account' && activeView === 'placeholder' && placeholderTitle === 'ADAB Wallet'}
              onClick={() =>
                handlePlaceholder('ADAB Wallet: Instant checkout balance & transaction history.', 'ADAB Wallet')
              }
            />
            <SidebarNavItem
              icon="fa-tag"
              label="Coupons &amp; Offers"
              active={activeTab === 'account' && activeView === 'placeholder' && placeholderTitle === 'Coupons & Discounts'}
              onClick={() =>
                handlePlaceholder('Coupons: View available store discount codes and seasonal promos.', 'Coupons & Discounts')
              }
            />
            <SidebarNavItem
              icon="fa-hand-holding-dollar"
              label="Pay Later (0% EMI)"
              badge="0% Int"
              badgeColor="bg-green-100 text-green-800"
              active={activeTab === 'account' && activeView === 'placeholder' && placeholderTitle === 'Pay Later & Credit'}
              onClick={() =>
                handlePlaceholder('Pay Later & Credit Line: Instant credit limit via partner banks.', 'Pay Later & Credit')
              }
            />
            <SidebarNavItem
              icon="fa-credit-card"
              label="Payment Methods"
              active={activeTab === 'account' && activeView === 'placeholder' && placeholderTitle === 'Payment Methods'}
              onClick={() =>
                handlePlaceholder('Payment Methods: Saved cards & UPI management.', 'Payment Methods')
              }
            />
          </div>
        </div>

        {/* ACCOUNT SETTINGS */}
        <div>
          <div className="px-3 pb-1.5 text-[11px] font-black uppercase tracking-wider text-gray-400">Account Settings</div>
          <div className="space-y-1">
            <SidebarNavItem
              icon="fa-location-dot"
              label="Delivery Addresses"
              badge={addresses && addresses.length > 0 ? addresses.length : null}
              badgeColor="bg-gray-100 text-gray-700"
              active={activeTab === 'account' && activeView === 'addresses'}
              onClick={() => handleSelectView('addresses')}
            />
            <SidebarNavItem
              icon="fa-user-gear"
              label="Profile &amp; Security"
              active={activeTab === 'account' && activeView === 'profile'}
              onClick={() => handleSelectView('profile')}
            />
            <SidebarNavItem
              icon="fa-bell"
              label="Notifications"
              badge={displayUnreadNotifications > 0 ? displayUnreadNotifications : null}
              badgeColor="bg-red-100 text-red-600"
              active={activeTab === 'notifications'}
              onClick={() => handleNavigate('notifications')}
            />
          </div>
        </div>

        {/* SUPPORT & ECOSYSTEM */}
        <div>
          <div className="px-3 pb-1.5 text-[11px] font-black uppercase tracking-wider text-gray-400">Support &amp; Partners</div>
          <div className="space-y-1">
            <SidebarNavItem
              icon="fa-headset"
              label="Help &amp; Support"
              active={activeTab === 'help' || activeTab === 'messages' || activeTab === 'support'}
              onClick={() => handleNavigate('help')}
            />
            <SidebarNavItem
              icon="fa-star-half-stroke"
              label="My Reviews"
              active={activeTab === 'reviews'}
              onClick={() => handleNavigate('reviews')}
            />
            <SidebarNavItem
              icon="fa-store"
              label="Sell on ADAB"
              badge="Partner"
              badgeColor="bg-emerald-100 text-emerald-800"
              active={false}
              onClick={() => {
                if (onCloseSidebar) onCloseSidebar();
                if (showToast) showToast('Redirecting to ADAB Seller Portal...');
              }}
            />
          </div>
        </div>

        {/* SIGN IN / SIGN OUT */}
        <div className="pt-2 border-t border-gray-100">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => {
                if (onCloseSidebar) onCloseSidebar();
                if (onLogout) onLogout();
              }}
              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </div>
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onCloseSidebar) onCloseSidebar();
                if (onOpenLogin) onOpenLogin();
                else if (onNavigate) onNavigate('login');
              }}
              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#18753C] hover:bg-emerald-50 transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#18753C] flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-arrow-right-to-bracket"></i>
              </div>
              <span>Login / Register</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
