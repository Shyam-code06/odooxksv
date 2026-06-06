import React from 'react';
import { Link } from 'react-router-dom';

const PageHeader = ({
  title,
  breadcrumbs = [], // e.g. [{ label: 'Dashboard', link: '/dashboard' }]
  action = null,
  className = ''
}) => {
  return (
    <div className={`d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 gap-3 ${className}`}>
      <div>
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav aria-label="breadcrumb" className="mb-1">
            <ol className="breadcrumb mb-0" style={{ fontSize: '0.85rem' }}>
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return isLast ? (
                  <li key={idx} className="breadcrumb-item active" aria-current="page">
                    {crumb.label}
                  </li>
                ) : (
                  <li key={idx} className="breadcrumb-item">
                    <Link to={crumb.link} className="text-decoration-none text-muted">
                      {crumb.label}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        <h3 className="fw-bold text-dark mb-0">{title}</h3>
      </div>
      {action && <div className="d-flex align-items-center gap-2">{action}</div>}
    </div>
  );
};

export default PageHeader;
