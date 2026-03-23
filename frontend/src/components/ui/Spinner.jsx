import React from 'react';

const sizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const colors = {
  blue: 'text-blue-600',
  white: 'text-white',
  gray: 'text-gray-400',
  green: 'text-green-600',
};

export default function Spinner({ size = 'md', color = 'blue', label = 'Loading...', className = '' }) {
  return (
    <div
      className={['inline-flex items-center justify-center', className].filter(Boolean).join(' ')}
      role="status"
      aria-label={label}
    >
      <svg
        className={['animate-spin', sizes[size] || sizes.md, colors[color] || colors.blue].join(' ')}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function FullPageSpinner({ label = 'Loading...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="xl" />
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}
