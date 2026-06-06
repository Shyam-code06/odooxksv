import React, { forwardRef } from 'react';

const Textarea = forwardRef(({
  label,
  name,
  error,
  required = false,
  rows = 3,
  className = '',
  id,
  ...props
}, ref) => {
  const textareaId = id || `textarea-${name}`;

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={textareaId} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <textarea
        name={name}
        id={textareaId}
        ref={ref}
        rows={rows}
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

Textarea.displayName = 'Textarea';

export default Textarea;
