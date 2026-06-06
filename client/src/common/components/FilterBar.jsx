import React from 'react';

const FilterBar = ({ 
  children, 
  onClear, 
  className = '' 
}) => {
  return (
    <div className={`card p-3 mb-3 border bg-white ${className}`}>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
          {children}
        </div>
        {onClear && (
          <button 
            type="button" 
            className="btn btn-outline-secondary btn-sm"
            onClick={onClear}
          >
            <i className="bi bi-x-circle me-1" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
