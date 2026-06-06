import React, { forwardRef } from 'react';

const Radio = forwardRef(({
  label,
  name,
  value,
  error,
  className = '',
  id,
  ...props
}, ref) => {
  const radioId = id || `radio-${name}-${value}`;

  return (
    <div className={`form-check mb-3 ${className}`}>
      <input
        type="radio"
        name={name}
        value={value}
        id={radioId}
        ref={ref}
        className={`form-check-input ${error ? 'is-invalid' : ''}`}
        {...props}
      />
      {label && (
        <label htmlFor={radioId} className="form-check-label select-none">
          {label}
        </label>
      )}
      {error && (
        <div className="invalid-feedback d-block">
          {error.message || error}
        </div>
      )}
    </div>
  );
});

Radio.displayName = 'Radio';

export default Radio;
