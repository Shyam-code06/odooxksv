import React from 'react';

const Button = ({
  type = 'button',
  variant = 'primary',
  size = '', // 'sm', 'lg', or empty for normal
  isLoading = false,
  disabled = false,
  onClick,
  className = '',
  children,
  ...props
}) => {
  const sizeClass = size ? `btn-${size}` : '';
  const btnClass = `btn btn-${variant} ${sizeClass} d-inline-flex align-items-center justify-content-center ${className}`;

  return (
    <button
      type={type}
      className={btnClass}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading && (
        <span
          className="spinner-border spinner-border-sm me-2"
          role="status"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
};

export default Button;
