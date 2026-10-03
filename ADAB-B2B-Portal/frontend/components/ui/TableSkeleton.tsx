import React from 'react';
import { Skeleton } from './Skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 dark:border-dark-border-secondary bg-white dark:bg-dark-app-secondary">
      <div className="flex border-b border-gray-200 dark:border-dark-border-secondary bg-gray-50 dark:bg-dark-surface-hover p-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`header-${i}`} className="flex-1 px-4">
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="flex flex-col">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="flex items-center p-4 border-b border-gray-100 dark:border-dark-border-primary last:border-0"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={`cell-${rowIndex}-${colIndex}`} className="flex-1 px-4">
                <Skeleton className={`h-4 ${colIndex === 0 ? 'w-3/4' : 'w-1/2'}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
