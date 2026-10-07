
export default function Pagination({ currentPage, totalPages, onPageChange }) {
  return (
    <div className="flex items-center justify-between px-2 py-3 text-xs text-gray-500">
      <span>Page {currentPage} of {totalPages}</span>
      <div className="flex gap-2">
        <button disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50">Prev</button>
        <button disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
