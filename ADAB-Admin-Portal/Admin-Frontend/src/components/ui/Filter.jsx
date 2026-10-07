
export default function Filter({ label, options, value, onChange, onReset }) {
  return (
    <div className="flex items-center gap-2">
      {label && <label className="text-sm font-bold">{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} className="px-3 py-2 rounded-xl border text-sm outline-none focus:border-indigo-400">
        <option value="">All</option>
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <button onClick={onReset} className="text-xs text-indigo-600 font-bold ml-2">Reset</button>
    </div>
  );
}
