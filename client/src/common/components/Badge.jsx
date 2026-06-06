import React from 'react';

const Badge = ({
  variant = 'secondary',
  pill = true,
  className = '',
  children,
  ...props
}) => {
  const badgeClass = `badge bg-${variant} ${pill ? 'rounded-pill' : ''} ${className}`;

  return (
    <span className={badgeClass} {...props}>
      {children}
    </span>
  );
};

export default Badge;
