import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  name,
  type = 'text',
  error,
  required = false,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${name}`;
  
  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        id={inputId}
        ref={ref}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        {...props}
      />
      {error && (
        <div className="invalid-feedback">
          {error.message || error}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
