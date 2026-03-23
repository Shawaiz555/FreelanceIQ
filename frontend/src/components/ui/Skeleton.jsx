import React from 'react';

export default function Skeleton({ className = '', ...rest }) {
  return (
    <div
      className={['animate-pulse bg-gray-200 rounded', className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={['space-y-2', className].filter(Boolean).join(' ')}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={['bg-white rounded-xl border border-gray-200 p-6 space-y-4', className].join(' ')}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}
