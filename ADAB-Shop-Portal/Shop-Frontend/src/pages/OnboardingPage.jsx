import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const stepTitles = [
    'Store & Owner Profile',
    'KYC & GST Compliance',
    'Bank Account Details',
    'Store Operations & Delivery',
    'B2B Wholesale & Credit',
    'Starter Products',
    'Review & Submit'
  ];
  return (
<>
    <section id="sec-onboarding" className="space-y-5">
      {/*  Header Banner  */}
      <div className="card p-6 bg-gradient-to-br from-brand-dark via-green-700 to-emerald-900 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-extrabold mb-2">
              <i className="fa-solid fa-shield-halved text-green-300"></i> ADAB Verified Merchant Onboarding
            </div>
            <h1 className="text-2xl font-extrabold">Store Registration &amp; KYC Verification</h1>
            <p className="text-green-100 text-sm mt-1 max-w-xl">Complete your 6-step business onboarding to start selling to app customers &amp; trading with other stores on credit.</p>
          </div>
          <button onClick={() => {}} className="btn-soft !text-xs !bg-white/20 !text-white hover:!bg-white/30 border border-white/20 self-start sm:self-center">
            <i className="fa-solid fa-clock-rotate-left mr-1"></i> View Existing Application
          </button>
        </div>

        {/*  Stepper Indicator  */}
        <div className="mt-6 pt-4 border-t border-white/20">
          <div className="flex justify-between text-xs font-bold text-green-100 mb-2">
            <span>Step <span id="onboardingStepNum" className="text-white font-extrabold">{currentStep}</span> of 7: <span id="onboardingStepTitle" className="text-white">{stepTitles[currentStep - 1]}</span></span>
            <span id="onboardingStepPct" className="text-white">{Math.round((currentStep / 7) * 100)}% Completed</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
            <div id="onboardingProgressBar" className="h-full bg-green-400 transition-all duration-300 rounded-full" style={{ width: `${Math.round((currentStep / 7) * 100)}%` }}></div>
          </div>
          <div className="grid grid-cols-7 gap-1 mt-3 text-[10px] sm:text-xs text-center font-bold">
            <button onClick={() => {}} id="stepTab1" className="py-1 px-1 rounded-lg bg-white text-green-900 shadow-sm truncate">1. Profile</button>
            <button onClick={() => {}} id="stepTab2" className="py-1 px-1 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 truncate">2. KYC &amp; GST</button>
            <button onClick={() => {}} id="stepTab3" className="py-1 px-1 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 truncate">3. Bank A/C</button>
            <button onClick={() => {}} id="stepTab4" className="py-1 px-1 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 truncate">4. Delivery</button>
            <button onClick={() => {}} id="stepTab5" className="py-1 px-1 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 truncate">5. Credit</button>
            <button onClick={() => {}} id="stepTab6" className="py-1 px-1 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 truncate">6. Products</button>
            <button onClick={() => {}} id="stepTab7" className="py-1 px-1 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 truncate">7. Submit</button>
          </div>
        </div>
      </div>

      {/*  Step Containers  */}
      <div className="card p-6 bg-white shadow-sm border border-gray-200">
        
        {/*  STEP 1: Basic Profile  */}
        <div id="obStep1" className={`space-y-4 ${currentStep === 1 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-bold">1</div>
            <div>
              <h2 className="font-extrabold text-base text-gray-900">Store &amp; Owner Profile</h2>
              <p className="text-xs text-gray-400">Tell us about your registered business entity and store location</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Store / Trade Display Name *</label>
              <input type="text" id="obShopName" value="Shri Balaji Superstore" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600 font-bold" placeholder="e.g. Mahadev Kirana & General" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Legal Registered Entity Name *</label>
              <input type="text" id="obLegalName" value="Shri Balaji Retail Ventures LLP" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600" placeholder="As per PAN / GSTIN" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Business Constitution *</label>
              <select id="obEntityType" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600 bg-white">
                <option value="Sole Proprietorship" selected>Sole Proprietorship</option>
                <option value="Partnership Firm">Partnership Firm</option>
                <option value="LLP">Limited Liability Partnership (LLP)</option>
                <option value="Private Limited">Private Limited Company</option>
                <option value="Individual">Individual Trader</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Primary Category *</label>
              <select id="obCategory" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600 bg-white">
                <option value="Grocery & Supermarket" selected>Grocery &amp; Supermarket</option>
                <option value="Clothing & Textiles">Clothing, Kurtis &amp; Fashion</option>
                <option value="Food & Restaurant">Food, Sweets &amp; Bakery</option>
                <option value="FMCG & Wholesale">FMCG &amp; General Goods</option>
                <option value="Pharmacy & Wellness">Pharmacy &amp; Health</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Owner / Director Name *</label>
              <input type="text" id="obOwnerName" value="Rajeshbhai Patel" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Registered Mobile Number *</label>
              <div className="flex gap-2">
                <input type="tel" id="obPhone" value="+91 98765 43210" className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600 font-mono" />
                <button type="button" onClick={() => {}} className="px-3 py-2 bg-green-100 text-green-800 text-xs font-extrabold rounded-xl shrink-0"><i className="fa-solid fa-circle-check text-green-600 mr-1"></i> Verified</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Official Business Email</label>
              <input type="email" id="obEmail" value="rajesh@balajistore.in" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Complete Physical Store Address *</label>
            <input type="text" id="obAddress" value="Shop 14-16, Ground Floor, Royal Arcade, VIP Road, Vesu" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600 mb-2" placeholder="Shop/Building No, Street, Landmark" />
            <div className="grid grid-cols-3 gap-2">
              <input type="text" id="obCity" value="Surat" className="px-3 py-2 rounded-xl border border-gray-200 text-sm" placeholder="City" />
              <input type="text" id="obState" value="Gujarat" className="px-3 py-2 rounded-xl border border-gray-200 text-sm" placeholder="State" />
              <input type="text" id="obPincode" value="395007" className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono" placeholder="PIN Code" />
            </div>
          </div>
        </div>

        {/*  STEP 2: KYC & GST Compliance  */}
        <div id="obStep2" className={`space-y-4 ${currentStep === 2 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-bold">2</div>
            <div>
              <h2 className="font-extrabold text-base text-gray-900">Business KYC &amp; Tax Compliance</h2>
              <p className="text-xs text-gray-400">Mandatory tax credentials for invoicing and customer credit eligibility</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">GSTIN (Goods &amp; Services Tax ID) *</label>
              <div className="flex gap-2">
                <input type="text" id="obGstin" value="24AAAAA0000A1Z5" className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono uppercase outline-none focus:border-green-600 bg-green-50/50 text-green-900 font-bold" />
                <button type="button" onClick={() => {}} className="px-3.5 py-2 btn-soft !text-xs font-bold shrink-0"><i className="fa-solid fa-arrows-rotate mr-1"></i> Verify</button>
              </div>
              <div id="gstinBadge" className="mt-1.5 flex items-center gap-1.5 text-xs text-green-700 font-bold">
                <i className="fa-solid fa-circle-check text-green-600"></i> Active Taxpayer • Regular GSTIN
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Proprietor / Company PAN Card *</label>
              <input type="text" id="obPan" value="AAAAA0000A" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono uppercase outline-none focus:border-green-600" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">FSSAI Food License (For Food/Kirana)</label>
              <input type="text" id="obFssai" value="10020021000492" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none focus:border-green-600" placeholder="14-digit FSSAI License Number" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Udhyam MSME Registration (Optional)</label>
              <input type="text" id="obUdhyam" value="UDYAM-GJ-01-0082910" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none focus:border-green-600" placeholder="UDYAM-XX-00-0000000" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="font-bold text-xs text-gray-800"><i className="fa-solid fa-cloud-arrow-up mr-1 text-green-700"></i> Document Upload Simulator</div>
            <div className="grid sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
                <span><i className="fa-solid fa-file-pdf text-red-500 mr-1"></i> GST_Cert.pdf</span>
                <span className="text-green-700 font-bold">Uploaded</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
                <span><i className="fa-solid fa-image text-blue-500 mr-1"></i> Shop_Front.jpg</span>
                <span className="text-green-700 font-bold">Uploaded</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
                <span><i className="fa-solid fa-file-lines text-amber-500 mr-1"></i> FSSAI_Doc.pdf</span>
                <span className="text-green-700 font-bold">Uploaded</span>
              </div>
            </div>
          </div>
        </div>

        {/*  STEP 3: Bank Account & Payouts  */}
        <div id="obStep3" className={`space-y-4 ${currentStep === 3 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-bold">3</div>
            <div>
              <h2 className="font-extrabold text-base text-gray-900">Bank Account &amp; Settlement Setup</h2>
              <p className="text-xs text-gray-400">All customer app payments and B2B orders settle automatically to this bank account</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Beneficiary Bank Name *</label>
              <select id="obBankName" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600 bg-white font-bold">
                <option value="HDFC Bank" selected>HDFC Bank</option>
                <option value="State Bank of India">State Bank of India (SBI)</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="Axis Bank">Axis Bank</option>
                <option value="Bank of Baroda">Bank of Baroda</option>
                <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Account Holder Name *</label>
              <input type="text" id="obAccHolder" value="Shri Balaji Retail Ventures LLP" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Bank Account Number *</label>
              <input type="text" id="obAccNum" value="50200049281094" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none focus:border-green-600" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Confirm Account Number *</label>
              <input type="text" id="obAccNumConfirm" value="50200049281094" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none focus:border-green-600" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">IFSC Code *</label>
              <input type="text" id="obIfsc" value="HDFC0001024" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono uppercase outline-none focus:border-green-600" />
              <span className="text-[11px] text-gray-400 mt-1 block">HDFC Bank • Vesu Branch, Surat</span>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Account Type</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-green-500 bg-green-50 text-xs font-bold cursor-pointer"><input type="radio" name="obAccType" defaultChecked /> Current A/C</label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 text-xs font-bold cursor-pointer"><input type="radio" name="obAccType" /> Savings A/C</label>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
            <i className="fa-solid fa-bolt text-emerald-600 text-lg"></i>
            <div><strong>T+1 Automated Daily Payouts:</strong> Daily sales settle automatically by 11:30 PM with zero transfer deductions.</div>
          </div>
        </div>

        {/*  STEP 4: Store Operations & Delivery Radius  */}
        <div id="obStep4" className={`space-y-4 ${currentStep === 4 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-bold">4</div>
            <div>
              <h2 className="font-extrabold text-base text-gray-900">Store Hours &amp; Delivery Logistics</h2>
              <p className="text-xs text-gray-400">Configure customer delivery zones and fulfillment options</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Operating Hours</label>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[10px] text-gray-400 block mb-0.5">Opening</span><input type="time" id="obOpenTime" value="08:00" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" /></div>
                <div><span className="text-[10px] text-gray-400 block mb-0.5">Closing</span><input type="time" id="obCloseTime" value="22:00" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" /></div>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">App Customer Delivery Radius</label>
              <select id="obZoneRadius" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600 font-bold bg-white">
                <option value="5">5 km (Immediate neighbourhood)</option>
                <option value="10" selected>10 km (Standard town radius - Recommended)</option>
                <option value="15">15 km (Wide city coverage)</option>
                <option value="25">25 km (Metropolitan zone)</option>
              </select>
              <p className="text-[11px] text-gray-400 mt-1">App customers inside this circle will see your products with live delivery times.</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">Delivery Channels Enabled</label>
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="p-3 rounded-xl border-2 border-green-500 bg-green-50 flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" id="obDelivFast" checked className="mt-0.5" />
                <div><div className="font-bold text-xs text-green-900">âš¡ Express (Under 1h)</div><div className="text-[10px] text-gray-500">Bike dispatch for immediate essentials</div></div>
              </label>
              <label className="p-3 rounded-xl border-2 border-green-500 bg-green-50 flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" id="obDelivSame" checked className="mt-0.5" />
                <div><div className="font-bold text-xs text-green-900">ðŸšš Same-Day Van</div><div className="text-[10px] text-gray-500">Standard scheduled slot delivery</div></div>
              </label>
              <label className="p-3 rounded-xl border-2 border-green-500 bg-green-50 flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" id="obDelivPickup" checked className="mt-0.5" />
                <div><div className="font-bold text-xs text-green-900">ðŸª Store Pickup</div><div className="text-[10px] text-gray-500">Customer collects from counter</div></div>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">Logistics Fleet Preference</label>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="p-3 rounded-xl border border-gray-200 flex items-center gap-2.5 cursor-pointer">
                <input type="radio" name="obFleet" checked />
                <div><div className="font-bold text-xs">Self Riders &amp; Vehicles</div><div className="text-[10px] text-gray-500">You use your own staff for deliveries</div></div>
              </label>
              <label className="p-3 rounded-xl border border-gray-200 flex items-center gap-2.5 cursor-pointer">
                <input type="radio" name="obFleet" />
                <div><div className="font-bold text-xs">ADAB Integrated Porter Fleet</div><div className="text-[10px] text-gray-500">On-demand partner delivery drivers</div></div>
              </label>
            </div>
          </div>
        </div>

        {/*  STEP 5: B2B Credit & Trade Terms  */}
        <div id="obStep5" className={`space-y-4 ${currentStep === 5 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-bold">5</div>
            <div>
              <h2 className="font-extrabold text-base text-gray-900">B2B Wholesale &amp; Store Credit Terms</h2>
              <p className="text-xs text-gray-400">Configure parameters when other verified shops order wholesale from you</p>
            </div>
          </div>

          <label className="p-3.5 rounded-xl border-2 border-orange-400 bg-orange-50 flex items-center gap-3 cursor-pointer">
            <input type="checkbox" id="obEnableCredit" checked className="w-4 h-4" />
            <div>
              <div className="font-extrabold text-sm text-orange-950">Enable B2B Store-to-Store Credit Selling</div>
              <div className="text-xs text-orange-800">Allow nearby &amp; nationwide shops to place bulk orders on credit (ADAB guaranteed)</div>
            </div>
          </label>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Credit Payment Tenure</label>
              <select id="obCreditDays" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold bg-white">
                <option value="7">7 Days</option>
                <option value="14" selected>14 Days (Standard)</option>
                <option value="21">21 Days</option>
                <option value="30">30 Days</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Max Credit per Shop (₹)</label>
              <input type="number" id="obCreditLimit" value="50000" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Minimum Order for Credit (₹)</label>
              <input type="number" id="obCreditMinOrder" value="5000" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold" />
            </div>
          </div>

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900">
            <i className="fa-solid fa-hand-holding-dollar mr-1 text-purple-700"></i>
            <strong>ADAB Buyer Credit Line:</strong> Once onboarded, your shop will also receive an initial <strong>₹2,50,000 credit line</strong> to purchase stock from national distributors at 0% interest for 14 days.
          </div>
        </div>

        {/*  STEP 6: Add Initial Products / Starter Inventory  */}
        <div id="obStep6" className={`space-y-4 ${currentStep === 6 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">6</div>
            <div className="flex-1">
              <h2 className="font-extrabold text-base text-gray-900">Add Initial Products to Your Shelf</h2>
              <p className="text-xs text-gray-400">Select standard fast-selling items from FMCG catalog or quick-type your signature items so your store goes live with ready stock.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">Fast Setup</span>
          </div>

          {/*  1-Click Starter Bundles & Checklist  */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200">
            <div className="text-xs font-extrabold text-emerald-950 mb-2 flex items-center gap-1.5">
              <i className="fa-solid fa-wand-magic-sparkles text-emerald-600"></i>
              <span>1-Click Popular FMCG Inventory (Auto-add to Store):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5" id="obStarterPackGrid">
              <label className="p-3 bg-white rounded-xl border border-emerald-200 flex items-start gap-2.5 cursor-pointer hover:shadow-sm transition">
                <input type="checkbox" checked className="mt-0.5 accent-emerald-600 rounded ob-starter-prod" data-name="Tata Salt 1kg" data-price="28" data-mrp="30" data-stock="40" data-cat="Groceries & Essentials" data-type="Packed" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-gray-900 truncate">ðŸ§‚ Tata Salt 1kg</div>
                  <div className="text-[11px] text-gray-500">Sell: <b className="text-emerald-700">₹28</b> (MRP ₹30)</div>
                </div>
              </label>

              <label className="p-3 bg-white rounded-xl border border-emerald-200 flex items-start gap-2.5 cursor-pointer hover:shadow-sm transition">
                <input type="checkbox" checked className="mt-0.5 accent-emerald-600 rounded ob-starter-prod" data-name="Amul Butter 500g" data-price="275" data-mrp="285" data-stock="25" data-cat="Dairy & Bakery" data-type="Packed" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-gray-900 truncate">ðŸ§ˆ Amul Butter 500g</div>
                  <div className="text-[11px] text-gray-500">Sell: <b className="text-emerald-700">₹275</b> (MRP ₹285)</div>
                </div>
              </label>

              <label className="p-3 bg-white rounded-xl border border-emerald-200 flex items-start gap-2.5 cursor-pointer hover:shadow-sm transition">
                <input type="checkbox" checked className="mt-0.5 accent-emerald-600 rounded ob-starter-prod" data-name="Aashirvaad Atta 5kg" data-price="295" data-mrp="310" data-stock="30" data-cat="Groceries & Essentials" data-type="Packed" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-gray-900 truncate">ðŸŒ¾ Aashirvaad Atta 5kg</div>
                  <div className="text-[11px] text-gray-500">Sell: <b className="text-emerald-700">₹295</b> (MRP ₹310)</div>
                </div>
              </label>

              <label className="p-3 bg-white rounded-xl border border-emerald-200 flex items-start gap-2.5 cursor-pointer hover:shadow-sm transition">
                <input type="checkbox" checked className="mt-0.5 accent-emerald-600 rounded ob-starter-prod" data-name="Fortune Sunflower Oil 1L" data-price="155" data-mrp="165" data-stock="35" data-cat="Groceries & Essentials" data-type="Packed" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-gray-900 truncate">ðŸŒ» Fortune Oil 1L</div>
                  <div className="text-[11px] text-gray-500">Sell: <b className="text-emerald-700">₹155</b> (MRP ₹165)</div>
                </div>
              </label>
            </div>
          </div>

          {/*  Quick Custom Product Line  */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5">
            <div className="text-xs font-bold text-gray-800 flex items-center justify-between">
              <span>Add Your Own Signature Item / Custom Product:</span>
              <span className="text-[11px] text-gray-500">Optional • You can also add later</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input type="text" id="obCustomProdName" placeholder="Product Name (e.g. Special Khakhra 500g)" className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs outline-none" />
              <input type="number" id="obCustomProdPrice" placeholder="Sell Price ₹" className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs outline-none font-bold" />
              <input type="number" id="obCustomProdStock" placeholder="Stock Qty (e.g. 50)" className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs outline-none" />
              <button type="button" onClick={() => {}} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
                <i className="fa-solid fa-plus"></i> Add Item
              </button>
            </div>
            <div id="obCustomProdList" className="flex flex-wrap gap-2 pt-1 text-xs"></div>
          </div>
        </div>

        {/*  STEP 7: Review, Agreement & Final Submission  */}
        <div id="obStep7" className={`space-y-4 ${currentStep === 7 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-bold">7</div>
            <div>
              <h2 className="font-extrabold text-base text-gray-900">Review Application &amp; Confirm Submission</h2>
              <p className="text-xs text-gray-400">Please review all submitted details before sending to Admin for verification</p>
            </div>
          </div>

          {/*  Summary Grid  */}
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="font-extrabold text-sm text-gray-900 flex justify-between">
                <span>Store Profile</span>
                <button onClick={() => {}} className="text-green-700 font-bold hover:underline">Edit</button>
              </div>
              <div><span className="text-gray-500">Store Name:</span> <b id="rvShopName">Shri Balaji Superstore</b></div>
              <div><span className="text-gray-500">Legal Entity:</span> <b id="rvLegalName">Shri Balaji Retail Ventures LLP</b></div>
              <div><span className="text-gray-500">Category:</span> <b id="rvCategory">Grocery & Supermarket</b></div>
              <div><span className="text-gray-500">Owner:</span> <b id="rvOwner">Rajeshbhai Patel</b></div>
              <div><span className="text-gray-500">Phone:</span> <b id="rvPhone">+91 98765 43210</b></div>
              <div><span className="text-gray-500">Address:</span> <span id="rvAddress" className="text-gray-700">VIP Road, Vesu, Surat</span></div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="font-extrabold text-sm text-gray-900 flex justify-between">
                <span>KYC, Banking &amp; Stock</span>
                <button onClick={() => {}} className="text-green-700 font-bold hover:underline">Edit</button>
              </div>
              <div><span className="text-gray-500">GSTIN:</span> <b id="rvGstin" className="font-mono text-green-800">24AAAAA0000A1Z5</b></div>
              <div><span className="text-gray-500">PAN:</span> <b id="rvPan" className="font-mono">AAAAA0000A</b></div>
              <div><span className="text-gray-500">Bank:</span> <b id="rvBank">HDFC Bank (A/C: ...1094)</b></div>
              <div><span className="text-gray-500">Delivery Zone:</span> <b id="rvRadius">10 km radius</b></div>
              <div><span className="text-gray-500">Initial Products:</span> <b id="rvProdCount" className="text-emerald-700">4 items selected</b></div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-xs text-green-900 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" id="obAgreeTerms" checked className="mt-0.5" />
              <span>I hereby certify that all provided GSTIN, PAN, and banking information are authentic. I agree to ADAB platform merchant terms, SLA fulfillment criteria, and settlement guidelines.</span>
            </label>
          </div>

          <button onClick={() => {}} className="btn-primary w-full py-3.5 text-base font-extrabold shadow-lg flex items-center justify-center gap-2">
            <i className="fa-solid fa-paper-plane"></i> Submit Store for Admin Verification
          </button>
        </div>

        {/*  Wizard Navigation Footer  */}
        <div className="flex justify-between items-center pt-5 mt-4 border-t border-gray-100">
          <button type="button" onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))} id="obBtnBack" className="btn-soft !text-xs !py-2 !px-4" disabled={currentStep === 1}>
            <i className="fa-solid fa-arrow-left mr-1"></i> Back
          </button>
          <div className="text-xs text-gray-400 font-bold">Step <span id="obFooterStep">{currentStep}</span> of 7</div>
          <button type="button" onClick={() => setCurrentStep(prev => Math.min(7, prev + 1))} id="obBtnNext" className="btn-primary !text-xs !py-2 !px-5 font-bold">
            Continue <i className="fa-solid fa-arrow-right ml-1"></i>
          </button>
        </div>

      </div>
    </section>


    {/*  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•  */}
    {/*  SECTION: APPLICATION STATUS & LIVE VERIFICATION TRACKER  */}
    {/*  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•  */}

</>
  );
}
