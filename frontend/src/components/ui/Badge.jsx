import React from 'react';

const variants = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...rest
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {dot && (
        <span
          className={[
            'w-1.5 h-1.5 rounded-full',
            variant === 'success'
              ? 'bg-green-500'
              : variant === 'danger'
                ? 'bg-red-500'
                : variant === 'warning'
                  ? 'bg-yellow-500'
                  : variant === 'primary'
                    ? 'bg-blue-500'
                    : 'bg-gray-500',
          ].join(' ')}
        />
      )}
      {children}
    </span>
  );
}
