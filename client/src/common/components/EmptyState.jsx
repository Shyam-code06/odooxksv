import React from 'react';
import Button from './Button';

const EmptyState = ({
  title = 'No records found',
  description = 'There are no items to display at the moment.',
  icon = 'database-exclamation',
  actionText = '',
  onActionClick = null,
  className = ''
}) => {
  return (
    <div className={`text-center py-5 px-4 border rounded-3 bg-white ${className}`}>
      <div className="mb-3">
        <i className={`bi bi-${icon} text-muted`} style={{ fontSize: '3rem' }} />
      </div>
      <h5 className="fw-semibold text-dark mb-1">{title}</h5>
      <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '380px' }}>
        {description}
      </p>
      {actionText && onActionClick && (
        <Button onClick={onActionClick} variant="primary">
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
