/**
 * GuestAuthGate Component - ADAB Customer Portal
 * 
 * Reusable, clean, and customer-friendly authentication gate for guest users.
 * Follows UI patterns from Amazon, Blinkit, and Flipkart:
 * Allows free browsing and discovery, but provides clear, inviting sign-in gates
 * when guests attempt to access authenticated customer features (Orders, Wishlist, Checkout).
 */
export default function GuestAuthGate({
  title = 'Sign in to continue',
  subtitle = 'Please log in or create a free account to access this feature.',
  icon = 'fa-lock',
  onLogin,
  onSignUp,
  onContinueBrowsing,
  features = [
    { icon: 'fa-bolt', text: '14–45 min local express delivery in Surat' },
    { icon: 'fa-location-dot', text: 'Live order tracking & instant reordering' },
    { icon: 'fa-coins', text: 'Earn ADAB reward coins on every order' }
  ]
}) {
  return (
    <div className="w-full max-w-lg mx-auto py-10 px-4 sm:px-6">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] p-6 sm:p-8 text-center flex flex-col items-center">
        {/* Visual Badge Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#18753C] flex items-center justify-center text-2xl mb-4 shadow-xs">
          <i className={`fa-solid ${icon}`}></i>
        </div>

        {/* Heading & Subtitle */}
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-2">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-normal max-w-sm mb-6 leading-relaxed">
          {subtitle}
        </p>

        {/* Benefits Preview */}
        {features && features.length > 0 && (
          <div className="w-full bg-slate-50/80 rounded-2xl p-4 mb-6 border border-slate-100 text-left space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              ADAB Customer Benefits
            </span>
            {features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-700">
                <div className="w-5 h-5 rounded-full bg-emerald-100/70 text-[#18753C] flex items-center justify-center text-[10px] shrink-0 font-bold">
                  <i className={`fa-solid ${feat.icon}`}></i>
                </div>
                <span>{feat.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          <button
            type="button"
            onClick={onLogin}
            className="w-full py-3 px-4 bg-[#18753C] hover:bg-[#156030] text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-arrow-right-to-bracket text-xs"></i>
            <span>Log in to your account</span>
          </button>

          <button
            type="button"
            onClick={onSignUp}
            className="w-full py-3 px-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <i className="fa-solid fa-user-plus text-xs text-slate-500"></i>
            <span>Create new account</span>
          </button>

          {onContinueBrowsing && (
            <button
              type="button"
              onClick={onContinueBrowsing}
              className="pt-2 text-xs font-semibold text-slate-500 hover:text-[#18753C] transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <span>Continue browsing as guest</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
