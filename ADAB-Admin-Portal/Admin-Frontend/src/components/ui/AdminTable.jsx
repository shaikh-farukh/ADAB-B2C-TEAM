
export default function AdminTable({ columns, data, loading, emptyMessage }) {
  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (!data || data.length === 0) return <div className="p-4 text-center text-gray-500">{emptyMessage || 'No data found'}</div>;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-xs text-gray-500">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-4 py-3">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col, colIndex) => (
                <td key={colIndex} className="px-4 py-3">{col.render ? col.render(row) : row[col.accessor]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
