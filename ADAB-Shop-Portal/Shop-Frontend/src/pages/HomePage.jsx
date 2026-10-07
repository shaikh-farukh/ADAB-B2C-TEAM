import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();
  const [proMode, setProMode] = useState(false);

  return (
    <section id="sec-home" className="space-y-5">
      {/* Simple / Pro Mode Selector Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shadow-sm">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </div>
          <div>
            <div className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
              <span>Shopkeeper Mode</span>
              <span id="shopModeBadge" className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${proMode ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}>
                {proMode ? 'ADVANCED PRO' : 'SIMPLE & EASY'}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {proMode ? 'Full analytics, margin calculators, and enterprise inventory controls.' : 'Designed for fast counter billing, quick product addition, and daily money tracking without technical complexity.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          <button 
            onClick={() => setProMode(false)} 
            id="btnModeSimple" 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${!proMode ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <i className="fa-solid fa-face-smile mr-1"></i> Easy Mode
          </button>
          <button 
            onClick={() => setProMode(true)} 
            id="btnModePro" 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${proMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <i className="fa-solid fa-sliders mr-1"></i> Advanced (Pro)
          </button>
        </div>
      </div>

      {/* Easy 4-Card Shopkeeper Hub (Big, Clear & Visual) */}
      <div id="easySellerHub" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Billing Counter */}
        <Link to="/pos" className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-left shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-all relative overflow-hidden group block">
          <div className="flex items-center justify-between mb-3">
            <span className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold"><i className="fa-solid fa-cash-register"></i></span>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-white/25">1-CLICK BILL</span>
          </div>
          <div className="font-extrabold text-xl">Quick Bill Counter</div>
          <p className="text-xs text-indigo-100 mt-1">Scan barcode or tap items to bill walk-in customers instantly.</p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-white bg-white/15 px-3 py-1.5 rounded-lg w-fit">
            <span>Open POS Counter</span> <i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
          </div>
        </Link>

        {/* 2. Customer App Orders */}
        <Link to="/orders" className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white text-left shadow-lg shadow-emerald-600/20 hover:scale-[1.02] transition-all relative overflow-hidden group block">
          <div className="flex items-center justify-between mb-3">
            <span className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold"><i className="fa-solid fa-bag-shopping"></i></span>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 animate-pulse">4 PENDING</span>
          </div>
          <div className="font-extrabold text-xl">Customer Orders</div>
          <p className="text-xs text-emerald-100 mt-1">Accept &amp; pack orders from nearby customers (Surat 10 km zone).</p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-white bg-white/15 px-3 py-1.5 rounded-lg w-fit">
            <span>View 14 Orders</span> <i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
          </div>
        </Link>

        {/* 3. Add Item / Products */}
        <Link to="/products" className="p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white text-left shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all relative overflow-hidden group block">
          <div className="flex items-center justify-between mb-3">
            <span className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold"><i className="fa-solid fa-plus"></i></span>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-white/25">CATALOG</span>
          </div>
          <div className="font-extrabold text-xl">My Products &amp; Stock</div>
          <p className="text-xs text-amber-100 mt-1">Manage listings, edit prices, live stock, and add items quickly.</p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-white bg-white/15 px-3 py-1.5 rounded-lg w-fit">
            <span>Manage Products</span> <i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
          </div>
        </Link>

        {/* 4. Today's Bank Money & Payouts */}
        <Link to="/finance" className="p-5 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-800 text-white text-left shadow-lg shadow-purple-600/20 hover:scale-[1.02] transition-all relative overflow-hidden group block">
          <div className="flex items-center justify-between mb-3">
            <span className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold"><i className="fa-solid fa-building-columns"></i></span>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-400 text-emerald-950 font-mono">₹18,420 TODAY</span>
          </div>
          <div className="font-extrabold text-xl">My Bank Money</div>
          <p className="text-xs text-purple-100 mt-1">₹38,420 total settled to HDFC Bank daily with zero deductions.</p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-white bg-white/15 px-3 py-1.5 rounded-lg w-fit">
            <span>Money Summary</span> <i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
          </div>
        </Link>
      </div>

      {/* Main Overview Banner */}
      <div className="p-6 rounded-2xl text-white shadow-md border border-green-700/30 bg-gradient-to-br from-green-700 to-emerald-600">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-green-100 text-sm">Welcome back</p>
            <h1 className="text-2xl font-extrabold mt-0.5">Rajesh Kumar • Shri Balaji Store</h1>
            <p className="text-green-100 text-xs sm:text-sm mt-1 max-w-lg">Everything you need to sell to customers, restock goods, and manage daily payouts.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/onboarding" className="px-3.5 py-2 rounded-xl bg-white/20 backdrop-blur text-white text-xs font-bold border border-white/30 hover:bg-white/30 transition flex items-center gap-1.5">
              <i className="fa-solid fa-id-card"></i> KYC &amp; Verification
            </Link>
            <Link to="/pos" className="px-4 py-2 rounded-xl bg-white text-green-800 text-xs font-extrabold shadow-sm hover:bg-green-50 transition flex items-center gap-1.5">
              <i className="fa-solid fa-bolt text-amber-500"></i> Open Counter
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" id="proStatsBar">
        <div className="card p-4"><div className="text-xs text-gray-500">Today's Sales</div><div className="text-2xl font-extrabold mt-1">₹18,420</div><div className="text-[10px] text-green-600 font-bold mt-1">+12% vs yesterday</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">New Orders</div><div className="text-2xl font-extrabold mt-1 text-green-700">14</div><div className="text-[10px] text-orange-600 font-bold mt-1">4 need action</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Money Coming</div><div className="text-2xl font-extrabold mt-1">₹38,420</div><div className="text-[10px] text-gray-400 mt-0.5">Paid to bank tomorrow night</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Credit Available</div><div className="text-2xl font-extrabold mt-1 text-purple-700">₹2.5L</div><div className="text-[10px] text-gray-400 mt-0.5">Pay in 14 days, 0% interest</div></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4"><div className="text-xs text-gray-500">Products Live</div><div className="text-2xl font-extrabold mt-1">382</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Reward Points</div><div className="text-2xl font-extrabold mt-1 text-amber-600">12,480</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Partner Orders</div><div className="text-2xl font-extrabold mt-1 text-orange-600">8</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Low Stock Items</div><div className="text-2xl font-extrabold mt-1 text-red-600">7</div></div>
      </div>

      <div>
        <h2 className="font-bold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Link to="/products" className="card p-4 text-left hover:border-green-300 hover:shadow-md transition-all block"><i className="fa-solid fa-plus text-green-600 text-lg mb-2"></i><div className="font-bold text-sm">Manage Products</div><div className="text-xs text-gray-500">Own brand, stock, or listings</div></Link>
          <Link to="/mastersearch" className="card p-4 text-left hover:border-blue-300 hover:shadow-md transition-all border-blue-100 bg-blue-50/30 block"><i className="fa-solid fa-magnifying-glass text-blue-600 text-lg mb-2"></i><div className="font-bold text-sm">Search &amp; Buy</div><div className="text-xs text-gray-500">Find anything from any store</div></Link>
          <Link to="/recommendations" className="card p-4 text-left hover:border-indigo-300 hover:shadow-md transition-all block"><i className="fa-solid fa-wand-magic-sparkles text-indigo-600 text-lg mb-2"></i><div className="font-bold text-sm">Product Ideas</div><div className="text-xs text-gray-500">What to sell &amp; what to buy</div></Link>
          <Link to="/pos" className="card p-4 text-left hover:border-indigo-300 hover:shadow-md transition-all border-indigo-100 bg-indigo-50/30 block"><i className="fa-solid fa-cash-register text-indigo-600 text-lg mb-2"></i><div className="font-bold text-sm">Bill Counter</div><div className="text-xs text-gray-500">POS • customer or store</div></Link>
          <Link to="/orders" className="card p-4 text-left hover:border-green-300 hover:shadow-md transition-all block"><i className="fa-solid fa-bell text-orange-500 text-lg mb-2"></i><div className="font-bold text-sm">Check Orders</div><div className="text-xs text-gray-500">14 total • 4 need action</div></Link>
          <Link to="/buy" className="card p-4 text-left hover:border-green-300 hover:shadow-md transition-all block"><i className="fa-solid fa-cart-shopping text-blue-600 text-lg mb-2"></i><div className="font-bold text-sm">Restock Nearby</div><div className="text-xs text-gray-500">Buy from nearby stores</div></Link>
          <Link to="/credit-apply" className="card p-4 text-left hover:border-purple-300 hover:shadow-md transition-all border-purple-100 block"><i className="fa-solid fa-hand-holding-dollar text-purple-600 text-lg mb-2"></i><div className="font-bold text-sm">Apply for Credit</div><div className="text-xs text-gray-500">ADAB line or shop credit</div></Link>
          <Link to="/finance" className="card p-4 text-left hover:border-green-300 hover:shadow-md transition-all block"><i className="fa-solid fa-money-bill-transfer text-green-600 text-lg mb-2"></i><div className="font-bold text-sm">Withdraw Money</div><div className="text-xs text-gray-500">₹38,420 ready</div></Link>
          <Link to="/returns" className="card p-4 text-left hover:border-rose-300 hover:shadow-md transition-all block"><i className="fa-solid fa-rotate-left text-rose-600 text-lg mb-2"></i><div className="font-bold text-sm">Returns &amp; Refunds</div><div className="text-xs text-gray-500">3 customer return requests</div></Link>
          <Link to="/zones" className="card p-4 text-left hover:border-emerald-300 hover:shadow-md transition-all block"><i className="fa-solid fa-map-location-dot text-emerald-600 text-lg mb-2"></i><div className="font-bold text-sm">Delivery Zones</div><div className="text-xs text-gray-500">Configure radius &amp; logistics</div></Link>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold mb-3">3 Simple Steps</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm mb-4">
          <div className="p-4 rounded-xl bg-green-50 border border-green-200"><div className="font-bold text-green-800 mb-1"><i className="fa-solid fa-mobile-screen mr-1"></i> App Orders = Nearby Only</div><p className="text-gray-600 text-xs">Customers within your <strong id="homeZoneRadius">10 km</strong> zone • bike/van delivery • fast &amp; same-day</p></div>
          <div className="p-4 rounded-xl bg-orange-50 border border-orange-200"><div className="font-bold text-orange-800 mb-1"><i className="fa-solid fa-store mr-1"></i> Store Orders = Any Distance</div><p className="text-gray-600 text-xs">Other shops can order from anywhere • truck, freight, export • no radius limit</p></div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-green-50 text-center"><div className="w-10 h-10 rounded-full bg-green-600 text-white font-extrabold flex items-center justify-center mx-auto mb-2">1</div><div className="font-bold text-green-800 mb-1">Sell</div><p className="text-gray-600 text-xs">Nearby customers + far-away stores</p></div>
          <div className="p-4 rounded-xl bg-blue-50 text-center"><div className="w-10 h-10 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center mx-auto mb-2">2</div><div className="font-bold text-blue-800 mb-1">Buy</div><p className="text-gray-600 text-xs">Search any store nationwide</p></div>
          <div className="p-4 rounded-xl bg-purple-50 text-center"><div className="w-10 h-10 rounded-full bg-purple-600 text-white font-extrabold flex items-center justify-center mx-auto mb-2">3</div><div className="font-bold text-purple-800 mb-1">Get Paid</div><p className="text-gray-600 text-xs">Bank next day • points on sell &amp; buy</p></div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold mb-3">Recent Activity</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between p-2 rounded-lg bg-gray-50"><span><i className="fa-solid fa-bag-shopping text-green-600 mr-2"></i> New customer order #9021 — Fast delivery</span><span className="text-xs text-gray-400">2 min ago</span></div>
          <div className="flex justify-between p-2 rounded-lg bg-gray-50"><span><i className="fa-solid fa-store text-orange-600 mr-2"></i> Partner order #P-8822 — You sold kurtis</span><span className="text-xs text-gray-400">18 min ago</span></div>
          <div className="flex justify-between p-2 rounded-lg bg-gray-50"><span><i className="fa-solid fa-money-bill-transfer text-green-600 mr-2"></i> ₹18,420 settled to HDFC Bank</span><span className="text-xs text-gray-400">1 hr ago</span></div>
          <div className="flex justify-between p-2 rounded-lg bg-gray-50"><span><i className="fa-solid fa-star text-amber-500 mr-2"></i> +490 pts from store sale • +142 pts from oil purchase</span><span className="text-xs text-gray-400">3 hr ago</span></div>
          <div className="flex justify-between p-2 rounded-lg bg-gray-50"><span><i className="fa-solid fa-truck text-blue-600 mr-2"></i> Porter truck dispatched for #P-8820</span><span className="text-xs text-gray-400">5 hr ago</span></div>
          <div className="flex justify-between p-2 rounded-lg bg-gray-50"><span><i className="fa-solid fa-globe text-indigo-600 mr-2"></i> Export inquiry from NY Foods Inc</span><span className="text-xs text-gray-400">Yesterday</span></div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-bold mb-2">Today's Delivery Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-orange-700 font-bold flex items-center gap-1.5"><i className="fa-solid fa-bolt text-amber-500"></i> Fast</span><span>4 orders • 2 out for delivery</span></div>
            <div className="flex justify-between"><span className="text-blue-700 font-bold flex items-center gap-1.5"><i className="fa-solid fa-truck-fast text-blue-600"></i> Same-day</span><span>6 orders • 3 packed</span></div>
            <div className="flex justify-between"><span className="text-green-700 font-bold flex items-center gap-1.5"><i className="fa-solid fa-calendar-days text-green-600"></i> Normal</span><span>3 orders • scheduled tomorrow</span></div>
            <div className="flex justify-between"><span className="text-purple-700 font-bold flex items-center gap-1.5"><i className="fa-solid fa-shop text-purple-600"></i> Pickup</span><span>1 order • ready at 6 PM</span></div>
          </div>
        </div>
        <Link to="/regstatus" className="card p-5 cursor-pointer hover:border-green-300 transition-all block">
          <h3 className="font-bold mb-2 text-gray-900">Store Health Check <i className="fa-solid fa-chevron-right text-xs text-gray-400 ml-1"></i></h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>GSTIN verified</span><span className="text-green-700 font-bold flex items-center gap-1"><i className="fa-solid fa-circle-check text-green-600"></i> Active</span></div>
            <div className="flex justify-between"><span>FSSAI valid</span><span className="text-green-700 font-bold flex items-center gap-1"><i className="fa-solid fa-circle-check text-green-600"></i> Active</span></div>
            <div className="flex justify-between"><span>Bank linked</span><span className="text-green-700 font-bold flex items-center gap-1"><i className="fa-solid fa-circle-check text-green-600"></i> Active</span></div>
            <div className="flex justify-between"><span>IEC for export</span><span className="text-amber-600 font-bold">Pending</span></div>
            <div className="flex justify-between"><span>Account rating</span><span className="text-green-700 font-bold">A — Healthy</span></div>
          </div>
        </Link>
      </div>
    </section>
  );
}
