import React from 'react';

const Loader = ({
  fullPage = false,
  size = 'md', // 'sm', 'md', 'lg'
  text = 'Loading...',
  className = '',
}) => {
  const spinnerSizeClass = 
    size === 'sm' ? 'spinner-border-sm' : 
    size === 'lg' ? 'spinner-border-lg' : '';

  const spinnerStyle = size === 'lg' ? { width: '3rem', height: '3rem' } : {};

  if (fullPage) {
    return (
      <div 
        className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white bg-opacity-75"
        style={{ zIndex: 9999 }}
      >
        <div 
          className="spinner-border text-primary" 
          role="status" 
          style={{ width: '3.5rem', height: '3.5rem' }}
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        {text && <p className="mt-3 fw-semibold text-primary">{text}</p>}
      </div>
    );
  }

  return (
    <div className={`d-flex flex-column align-items-center justify-content-center p-5 ${className}`}>
      <div 
        className={`spinner-border text-primary ${spinnerSizeClass}`} 
        role="status"
        style={spinnerStyle}
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      {text && <p className="mt-2 text-muted small">{text}</p>}
    </div>
  );
};

export default Loader;
