
export default function StatusBadge({ status }) {
  let badgeClass = "px-2 py-1 rounded-full text-[10px] font-bold ";
  switch(status?.toLowerCase()) {
    case 'active':
    case 'approved':
      badgeClass += "bg-green-100 text-green-800";
      break;
    case 'pending':
      badgeClass += "bg-amber-100 text-amber-800";
      break;
    case 'inactive':
    case 'rejected':
    case 'suspended':
    case 'locked':
      badgeClass += "bg-red-100 text-red-800";
      break;
    default:
      badgeClass += "bg-gray-100 text-gray-800";
  }
  return <span className={badgeClass}>{status}</span>;
}
