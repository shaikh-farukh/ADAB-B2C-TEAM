import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const generatedId = id || Math.random().toString(36).substr(2, 9);

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={generatedId} 
            className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={generatedId}
            ref={ref}
            className={`
              block w-full rounded-md border shadow-sm transition-colors
              px-4 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-900
              disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
              ${error 
                ? 'border-red-300 dark:border-red-600 text-red-900 dark:text-red-300 placeholder-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-surface-card text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:border-adab-green focus:ring-adab-green'
              }
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400" id={`${generatedId}-error`}>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-muted" id={`${generatedId}-description`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
