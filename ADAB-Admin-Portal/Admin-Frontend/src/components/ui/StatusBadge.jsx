export default function StatusBadge({ status }) {
  if (!status) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">N/A</span>;

  const raw = String(status).toUpperCase();
  let badgeClass = "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ";
  let label = raw.replace(/_/g, ' ');

  switch (raw) {
    case 'ACTIVE':
    case 'APPROVED':
    case 'PUBLISHED':
    case 'LIVE':
      badgeClass += "bg-emerald-50 text-emerald-700 border border-emerald-200";
      label = raw === 'APPROVED' ? 'Approved' : label;
      break;
    case 'PENDING':
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
    case 'DRAFT':
      badgeClass += "bg-amber-50 text-amber-700 border border-amber-200";
      label = raw === 'SUBMITTED' ? 'Submitted' : (raw === 'UNDER_REVIEW' ? 'Under Review' : 'Pending');
      break;
    case 'CHANGES_REQUIRED':
    case 'CHANGES_REQUESTED':
      badgeClass += "bg-orange-50 text-orange-700 border border-orange-200";
      label = 'Changes Requested';
      break;
    case 'REJECTED':
      badgeClass += "bg-rose-50 text-rose-700 border border-rose-200";
      label = 'Rejected';
      break;
    case 'SUSPENDED':
    case 'LOCKED':
    case 'BANNED':
      badgeClass += "bg-slate-100 text-slate-700 border border-slate-300";
      label = 'Suspended';
      break;
    case 'INACTIVE':
      badgeClass += "bg-gray-100 text-gray-600 border border-gray-200";
      label = 'Inactive';
      break;
    default:
      badgeClass += "bg-slate-100 text-slate-600 border border-slate-200";
  }

  return <span className={badgeClass}>{label}</span>;
}
