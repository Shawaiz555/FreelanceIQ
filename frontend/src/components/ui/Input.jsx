import React, { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    id,
    error,
    hint,
    leftAddon,
    rightAddon,
    type = 'text',
    required = false,
    disabled = false,
    className = '',
    ...rest
  },
  ref,
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative flex rounded-lg shadow-sm">
        {leftAddon && (
          <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
            {leftAddon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          disabled={disabled}
          className={[
            'block w-full text-sm text-gray-900 placeholder-gray-400',
            'border border-gray-300 bg-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            'transition-colors duration-150',
            error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '',
            leftAddon ? 'rounded-r-lg rounded-l-none' : rightAddon ? 'rounded-l-lg rounded-r-none' : 'rounded-lg',
            'px-3.5 py-2.5',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />
        {rightAddon && (
          <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
            {rightAddon}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
});

export default Input;
