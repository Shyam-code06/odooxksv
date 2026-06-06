import React from 'react';

const StatCard = ({
  title,
  value,
  icon,
  trend = null, // e.g. { value: '12%', label: 'from last week', positive: true }
  color = 'primary', // 'primary', 'success', 'warning', 'danger', 'info'
  className = '',
  ...props
}) => {
  const iconBgMap = {
    primary: 'bg-primary-subtle text-primary',
    success: 'bg-success-subtle text-success',
    warning: 'bg-warning-subtle text-warning',
    danger: 'bg-danger-subtle text-danger',
    info: 'bg-info-subtle text-info',
  };

  const bgClass = iconBgMap[color] || 'bg-light text-secondary';

  return (
    <div className={`card card-hover h-100 ${className}`} {...props}>
      <div className="card-body p-4 d-flex justify-content-between align-items-start">
        <div className="d-flex flex-column">
          <span className="text-muted text-uppercase fw-semibold mb-2" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>
            {title}
          </span>
          <h3 className="fw-bold text-dark mb-2">{value}</h3>
          
          {trend && (
            <div className="d-flex align-items-center gap-1 mt-1">
              <span className={`fw-medium d-inline-flex align-items-center gap-1 ${trend.positive ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.85rem' }}>
                <i className={`bi bi-graph-${trend.positive ? 'up' : 'down'}`} />
                {trend.value}
              </span>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                {trend.label}
              </span>
            </div>
          )}
        </div>
        
        {icon && (
          <div className={`rounded-3 p-3 d-flex align-items-center justify-content-center ${bgClass}`} style={{ width: '50px', height: '50px' }}>
            <i className={`bi bi-${icon}`} style={{ fontSize: '1.4rem' }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
