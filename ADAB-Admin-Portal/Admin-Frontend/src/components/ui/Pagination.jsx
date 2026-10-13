export default function Pagination({ 
  currentPage, 
  totalPages, 
  page, 
  total, 
  pageSize = 10, 
  limit,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100]
}) {
  const current = Math.max(1, currentPage || page || 1);
  const size = pageSize || limit || 10;
  const countPages = Math.max(1, totalPages || (total !== undefined ? Math.ceil(total / size) : 1));

  // Determine item range display
  const hasTotal = total !== undefined && total !== null;
  const startItem = hasTotal ? (total === 0 ? 0 : (current - 1) * size + 1) : null;
  const endItem = hasTotal ? Math.min(current * size, total) : null;

  // Build pagination window numbers
  const getPageNumbers = () => {
    if (countPages <= 7) {
      return Array.from({ length: countPages }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', countPages];
    }
    if (current >= countPages - 3) {
      return [1, '...', countPages - 4, countPages - 3, countPages - 2, countPages - 1, countPages];
    }
    return [1, '...', current - 1, current, current + 1, '...', countPages];
  };

  const pages = getPageNumbers();

  const handlePageClick = (p) => {
    if (typeof p !== 'number') return;
    if (p < 1 || p > countPages || p === current) return;
    if (onPageChange) onPageChange(p);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-3.5 bg-white border-t border-slate-100 text-xs text-slate-500 font-medium select-none">
      {/* Left side: Information & Page Size */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        {hasTotal ? (
          <span>
            Showing <span className="font-bold text-slate-900">{startItem}</span> to{' '}
            <span className="font-bold text-slate-900">{endItem}</span> of{' '}
            <span className="font-bold text-slate-900">{total}</span> records
          </span>
        ) : (
          <span>
            Page <span className="font-bold text-slate-900">{current}</span> of{' '}
            <span className="font-bold text-slate-900">{countPages}</span>
          </span>
        )}

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-[11px] text-slate-400">Rows:</span>
            <select
              value={size}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="py-1 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-bold text-xs outline-none focus:border-indigo-600 focus:bg-white transition-colors cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Navigation buttons & page pills */}
      <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end flex-wrap">
        {/* First page button */}
        <button
          type="button"
          title="First page"
          disabled={current <= 1}
          onClick={() => handlePageClick(1)}
          className="p-1.5 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
        >
          <i className="fa-solid fa-angles-left text-[10px]"></i>
        </button>

        {/* Prev page button */}
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => handlePageClick(current - 1)}
          className="px-2.5 py-1.5 h-8 flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs text-xs"
        >
          <i className="fa-solid fa-chevron-left text-[10px]"></i>
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Numbered Pills */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 font-bold text-xs select-none"
                >
                  ...
                </span>
              );
            }
            const isActive = p === current;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePageClick(p)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next page button */}
        <button
          type="button"
          disabled={current >= countPages}
          onClick={() => handlePageClick(current + 1)}
          className="px-2.5 py-1.5 h-8 flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs text-xs"
        >
          <span className="hidden sm:inline">Next</span>
          <i className="fa-solid fa-chevron-right text-[10px]"></i>
        </button>

        {/* Last page button */}
        <button
          type="button"
          title="Last page"
          disabled={current >= countPages}
          onClick={() => handlePageClick(countPages)}
          className="p-1.5 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
        >
          <i className="fa-solid fa-angles-right text-[10px]"></i>
        </button>
      </div>
    </div>
  );
}
