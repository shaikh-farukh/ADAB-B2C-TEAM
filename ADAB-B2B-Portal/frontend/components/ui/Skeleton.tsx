import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`bg-gray-200 dark:bg-white/10 rounded-md animate-pulse ${className}`}
    />
  );
};
