import React from 'react';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { adabTheme } from '../../theme/adabTheme';

interface TimelineEvent {
  status: string;
  notes?: string;
  changed_at: string;
}

interface OrderTimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; index: number }> = {
  pending: { label: 'Pending', icon: Clock, color: adabTheme.colors.brand.secondary, index: 0 },
  accepted: { label: 'Accepted', icon: CheckCircle, color: adabTheme.colors.brand.secondary, index: 1 },
  processing: { label: 'Processing', icon: Package, color: adabTheme.colors.brand.secondary, index: 2 },
  ready_for_dispatch: { label: 'Ready', icon: Package, color: adabTheme.colors.brand.secondary, index: 3 },
  dispatched: { label: 'Dispatched', icon: Truck, color: adabTheme.colors.brand.secondary, index: 4 },
  out_for_delivery: { label: 'Out for Delivery', icon: Truck, color: adabTheme.colors.brand.secondary, index: 5 },
  delivered: { label: 'Delivered', icon: CheckCircle, color: adabTheme.colors.brand.primary, index: 6 },
  rejected: { label: 'Rejected', icon: CheckCircle, color: '#EF4444', index: -1 }
};

// Simplified main milestones for the visual track
const MILESTONES = ['pending', 'processing', 'dispatched', 'delivered'];

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ events, currentStatus }) => {
  const currentIndex = statusConfig[currentStatus?.toLowerCase()]?.index ?? 0;

  // Calculate logical progress based on milestone positions
  let milestoneProgress = 0;
  for (let i = 0; i < MILESTONES.length; i++) {
    if (currentIndex >= statusConfig[MILESTONES[i]].index) {
      milestoneProgress = i;
    }
  }

  // Add partial progress if between milestones
  if (milestoneProgress < MILESTONES.length - 1) {
    const currentMilestoneIndex = statusConfig[MILESTONES[milestoneProgress]].index;
    const nextMilestoneIndex = statusConfig[MILESTONES[milestoneProgress + 1]].index;
    if (currentIndex > currentMilestoneIndex) {
       milestoneProgress += (currentIndex - currentMilestoneIndex) / (nextMilestoneIndex - currentMilestoneIndex);
    }
  }

  const progressPercentage = Math.min(100, Math.max(0, (milestoneProgress / (MILESTONES.length - 1)) * 100));

  return (
    <div className="py-6">
      <div className="relative">
        {/* Progress Bar Background */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full"></div>

        {/* Active Progress Bar */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full transition-all duration-500 ease-in-out"
          style={{
            width: `${progressPercentage}%`,
            backgroundColor: currentStatus?.toLowerCase() === 'delivered' ? adabTheme.colors.brand.primary : adabTheme.colors.brand.secondary
          }}
        ></div>

        <div className="relative flex justify-between">
          {MILESTONES.map((milestoneKey, index) => {
            const config = statusConfig[milestoneKey];
            const isActive = currentIndex >= config.index;
            const isCurrent = currentStatus?.toLowerCase() === milestoneKey;

            // Find if there's an event for this milestone to show date
            const event = events.find(e => {
              if (milestoneKey === 'processing') return e.status?.toLowerCase() === 'processing' || e.status?.toLowerCase() === 'accepted';
              if (milestoneKey === 'dispatched') return e.status?.toLowerCase() === 'dispatched' || e.status?.toLowerCase() === 'ready_for_dispatch';
              return e.status?.toLowerCase() === milestoneKey;
            });

            return (
              <div key={milestoneKey} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 transition-colors duration-300
                    ${isActive ? 'text-white' : 'bg-gray-100 text-gray-400'}`}
                  style={{ backgroundColor: isActive ? (isCurrent && milestoneKey === 'delivered' ? adabTheme.colors.brand.primary : config.color) : undefined }}
                >
                  <config.icon className="w-5 h-5" />
                </div>
                <div className="mt-3 text-center">
                  <p className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                    {config.label}
                  </p>
                  {event && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(event.changed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed History Log */}
      <div className="mt-12">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Detailed History</h4>
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={index} className="flex gap-4">
              <div className="mt-1">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                {index !== events.length - 1 && (
                  <div className="w-px h-full bg-gray-200 mx-auto mt-2"></div>
                )}
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {event.status.replace(/_/g, ' ')}
                </p>
                {event.notes && (
                  <p className="text-sm text-gray-500 mt-1">{event.notes}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(event.changed_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
