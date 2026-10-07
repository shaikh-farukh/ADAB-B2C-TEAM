
export default function Modal({ isOpen, title, onClose, onPrimary, primaryLabel, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="card max-w-lg w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-extrabold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark text-xl"></i></button>
        </div>
        <div className="text-sm space-y-3">{children}</div>
        <div className="flex gap-2 mt-6">
          {onPrimary && <button onClick={onPrimary} className="btn-primary">{primaryLabel || 'Confirm'}</button>}
          <button onClick={onClose} className="btn-soft">Cancel</button>
        </div>
      </div>
    </div>
  );
}
