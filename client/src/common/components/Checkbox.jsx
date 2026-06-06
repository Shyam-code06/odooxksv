import React, { forwardRef } from 'react';

const Checkbox = forwardRef(({
  label,
  name,
  error,
  className = '',
  id,
  ...props
}, ref) => {
  const checkboxId = id || `checkbox-${name}`;

  return (
    <div className={`form-check mb-3 ${className}`}>
      <input
        type="checkbox"
        name={name}
        id={checkboxId}
        ref={ref}
        className={`form-check-input ${error ? 'is-invalid' : ''}`}
        {...props}
      />
      {label && (
        <label htmlFor={checkboxId} className="form-check-label select-none">
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

Checkbox.displayName = 'Checkbox';

export default Checkbox;
