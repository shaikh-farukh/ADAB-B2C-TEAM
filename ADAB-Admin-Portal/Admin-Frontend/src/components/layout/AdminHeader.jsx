
export default function AdminHeader() {
  return (
    <header className="admin-header text-white sticky top-0 z-40 border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500 flex items-center justify-center font-extrabold shadow-lg">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <div className="font-extrabold leading-tight text-sm sm:text-base">ADAB Admin</div>
            <div className="text-[11px] text-indigo-200 hidden xs:block">Platform control</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold border border-white/15">
            <div className="w-6 h-6 rounded-full bg-indigo-400 flex items-center justify-center text-[10px] font-bold">SA</div>
            <span className="hidden sm:inline">Super Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
}
