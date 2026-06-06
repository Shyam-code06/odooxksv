import React from 'react';

const SearchBar = ({
  value = '',
  onChange,
  onSearch,
  placeholder = 'Search...',
  className = '',
  ...props
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value);
    }
  };

  return (
    <div className={`input-group ${className}`} {...props}>
      <span className="input-group-text bg-white border-end-0 text-muted">
        <i className="bi bi-search" />
      </span>
      <input
        type="text"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="form-control border-start-0 ps-0"
        aria-label="Search"
      />
      {onSearch && (
        <button 
          className="btn btn-outline-secondary" 
          type="button"
          onClick={() => onSearch(value)}
        >
          Search
        </button>
      )}
    </div>
  );
};

export default SearchBar;
