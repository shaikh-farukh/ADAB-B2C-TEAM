import React from 'react';

export default function RegStatusPage() {
  return (
    <section id="sec-regstatus" className="space-y-5">
      {/*  Status Card Header  */}
      <div className="card p-6 bg-white border border-gray-200 shadow-sm" id="regStatusHeroCard">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div id="regStatusIconBox" className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0">
              <i className="fa-solid fa-clock"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-gray-900" id="regStatusStoreTitle">Shri Balaji Superstore</h1>
                <span id="regStatusBadge" className="badge-pending text-xs px-2.5 py-0.5 rounded-full font-bold">Under Admin Review</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Application ID: <strong id="regStatusReqId" className="font-mono text-gray-800">#REQ-8941</strong> • Submitted on <span id="regStatusSubmitTime">Today</span></p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => {}} className="btn-approve !text-xs !py-2 !px-3 font-extrabold shadow-sm">
              <i className="fa-solid fa-bolt mr-1"></i> Instant Approve Simulator
            </button>
            <button onClick={() => {}} className="btn-soft !text-xs !py-2">
              <i className="fa-solid fa-pen-to-square mr-1"></i> Edit KYC
            </button>
          </div>
        </div>

        {/*  4-Stage Verification Stepper  */}
        <div className="py-6">
          <div className="text-xs font-bold text-gray-700 mb-4">Verification Progress Pipeline</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
            
            {/*  Stage 1  */}
            <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex flex-col justify-between" id="stageStep1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center"><i className="fa-solid fa-check"></i></span>
                  <span className="text-[10px] font-extrabold text-green-800">Completed</span>
                </div>
                <div className="font-bold text-xs text-green-950">1. Application Filed</div>
                <p className="text-[10px] text-gray-600 mt-1">Profile &amp; KYC documentation received by ADAB onboarding engine.</p>
              </div>
            </div>

            {/*  Stage 2  */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col justify-between" id="stageStep2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span id="stage2Icon" className="w-6 h-6 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse"><i className="fa-solid fa-clock"></i></span>
                  <span id="stage2StatusTxt" className="text-[10px] font-extrabold text-amber-800">In Progress</span>
                </div>
                <div className="font-bold text-xs text-amber-950">2. Admin Review</div>
                <p className="text-[10px] text-gray-600 mt-1" id="stage2Desc">GSTIN verification and document audit in Admin Portal Queue.</p>
              </div>
            </div>

            {/*  Stage 3  */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col justify-between opacity-80" id="stageStep3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span id="stage3Icon" className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 text-[10px] font-bold flex items-center justify-center">3</span>
                  <span id="stage3StatusTxt" className="text-[10px] font-extrabold text-gray-500">Pending</span>
                </div>
                <div className="font-bold text-xs text-gray-800">3. Zone &amp; Bank Mandate</div>
                <p className="text-[10px] text-gray-500 mt-1">Radius alignment &amp; daily payout gateway configuration.</p>
              </div>
            </div>

            {/*  Stage 4  */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col justify-between opacity-80" id="stageStep4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span id="stage4Icon" className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 text-[10px] font-bold flex items-center justify-center">4</span>
                  <span id="stage4StatusTxt" className="text-[10px] font-extrabold text-gray-500">Pending</span>
                </div>
                <div className="font-bold text-xs text-gray-800">4. Live on ADAB App</div>
                <p className="text-[10px] text-gray-500 mt-1">Store catalogue visible to nearby customers &amp; wholesale buyers.</p>
              </div>
            </div>

          </div>
        </div>

        {/*  Success Notification Box (Appears when approved)  */}
        <div id="regApprovedBanner" className="hidden p-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold"><i className="fa-solid fa-circle-check"></i></div>
            <div>
              <div className="font-extrabold text-sm">ðŸŽ‰ Congratulations! Your store has been Approved &amp; Activated</div>
              <div className="text-xs text-green-100">Your store is now live on the Customer App and B2B Trade Directory.</div>
            </div>
          </div>
          <button onClick={() => {}} className="px-4 py-2 rounded-xl bg-white text-green-800 font-extrabold text-xs shadow-sm hover:bg-green-50 shrink-0">
            Go to Seller Dashboard â†’
          </button>
        </div>

        {/*  Details Recap Card  */}
        <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-400 block mb-0.5 font-bold uppercase tracking-wider text-[10px]">Registered Entity</span>
            <div className="font-bold text-gray-800" id="statusRecapShop">Shri Balaji Superstore</div>
            <div className="text-gray-500 font-mono text-[11px]" id="statusRecapGstin">24AAAAA0000A1Z5</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-400 block mb-0.5 font-bold uppercase tracking-wider text-[10px]">Delivery Coverage</span>
            <div className="font-bold text-gray-800" id="statusRecapZone">10 km radius • Vesu, Surat</div>
            <div className="text-gray-500 text-[11px]">Express + Same-Day Van</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-400 block mb-0.5 font-bold uppercase tracking-wider text-[10px]">Settlement Account</span>
            <div className="font-bold text-gray-800" id="statusRecapBank">HDFC Bank • A/C 5020...1094</div>
            <div className="text-green-700 font-bold text-[11px]">T+1 Daily Auto-Settlement</div>
          </div>
        </div>

        {/*  Cross-Portal Sync Notice  */}
        <div className="mt-4 p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-indigo-600 text-base shrink-0"></i>
            <span><strong>Multi-Portal Synchronizer:</strong> You can open the <strong>Admin Portal</strong> in another tab to click Approve, and this page will instantly update in real-time!</span>
          </div>
          <a href="unified-admin-portal-demo.html" target="_blank" className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 whitespace-nowrap self-start sm:self-auto">
            Open Admin Portal <i className="fa-solid fa-arrow-up-right-from-square ml-1"></i>
          </a>
        </div>
      </div>
    </section>


  );
}
