import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Responsibility: Reusable status indicator with standardized brand colors.
 * Order Workflow Mapping:
 * - PENDING: Yellow
 * - ACCEPTED: Blue
 * - PROCESSING: Purple
 * - READY_FOR_DISPATCH: Orange
 * - DISPATCHED: Cyan
 * - DELIVERED: ADAB Green
 * - REJECTED: Red
 *
 * Legacy/Other Mappings:
 * - Approved/Active: ADAB Green
 * - In Progress: Blue
 * - Shipped: ADAB Orange
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  if (!status) return null;

  const normalized = status.trim().toLowerCase();

  const getStyles = (s: string) => {
    // Pending: Yellow / Warning tone
    if (s === 'pending') {
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
    // Accepted: Blue
    if (s === 'accepted') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    // Processing: Purple
    if (['processing', 'in progress'].includes(s)) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    // Ready for Dispatch: Orange
    if (s === 'ready_for_dispatch' || s === 'ready for dispatch') {
      return 'bg-orange-50 text-adab-orange border-orange-200';
    }
    // Dispatched: Cyan
    if (s === 'dispatched') {
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    }
    // Delivered: ADAB Green (Primary)
    if (['delivered', 'approved', 'active'].includes(s)) {
      return 'bg-green-50 text-adab-green border-green-200';
    }
    // Rejected/Cancelled: Red / Danger tone
    if (['rejected', 'inactive', 'cancelled'].includes(s)) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    // Shipped: ADAB Orange
    if (s === 'shipped') {
      return 'bg-orange-50 text-adab-orange border-orange-200';
    }
    // Default Fallback
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap transition-colors",
        getStyles(normalized),
        className
      )}
    >
      {status}
    </span>
  );
};

export default StatusBadge;