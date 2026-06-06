import React from 'react';

const Card = ({
  title,
  headerActions = null,
  bodyClassName = '',
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`card ${className}`} {...props}>
      {(title || headerActions) && (
        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
          {title && <h6 className="card-title mb-0 fw-semibold fs-5 text-dark">{title}</h6>}
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div className={`card-body ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default Card;
