import React from 'react';

const padding = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  children,
  title,
  subtitle,
  footer,
  padded = 'md',
  hoverable = false,
  className = '',
  onClick,
  ...rest
}) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-white rounded-xl border border-gray-200 shadow-sm',
        hoverable ? 'hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {(title || subtitle) && (
        <div className={`border-b border-gray-100 ${padding[padded] || padding.md}`}>
          {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className={padding[padded] || padding.md}>{children}</div>
      {footer && (
        <div className={`border-t border-gray-100 bg-gray-50 rounded-b-xl ${padding[padded] || padding.md}`}>
          {footer}
        </div>
      )}
    </div>
  );
}
