import React, { forwardRef } from 'react';

const Select = forwardRef(({
  label,
  name,
  options = [],
  error,
  required = false,
  placeholder = 'Select an option',
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || `select-${name}`;

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <select
        name={name}
        id={selectId}
        ref={ref}
        className={`form-select ${error ? 'is-invalid' : ''}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt, index) => {
          const isObj = typeof opt === 'object' && opt !== null;
          const value = isObj ? opt.value : opt;
          const text = isObj ? opt.label : opt;
          return (
            <option key={index} value={value}>
              {text}
            </option>
          );
        })}
      </select>
      {error && (
        <div className="invalid-feedback">
          {error.message || error}
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
