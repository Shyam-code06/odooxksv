import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../common/contexts/AuthContext';

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { hasPermission, user } = useAuth();

  const menuItems = [
    {
      label: 'Dashboard',
      icon: 'grid-fill',
      path: '/dashboard',
      permission: 'dashboard'
    },
    {
      label: 'Vendors',
      icon: 'shop',
      path: '/vendors',
      permission: 'viewusers'
    },
    {
      label: 'RFQs',
      icon: 'file-earmark-text',
      path: '/rfqs',
      permission: 'dashboard',
      hideForAdmin: true
    },
    {
      label: 'Quotations',
      icon: 'file-ruled',
      path: '/quotations',
      permission: 'dashboard',
      hideForAdmin: true
    },
    {
      label: 'Approvals',
      icon: 'shield-check',
      path: '/approvals',
      permission: 'dashboard',
      managerAdminOnly: true,
      hideForAdmin: true
    },
    {
      label: 'Purchase Orders',
      icon: 'file-earmark-pdf',
      path: '/purchase-orders',
      permission: 'dashboard'
    },
    {
      label: 'Invoices',
      icon: 'receipt-cutoff',
      path: '/invoices',
      permission: 'dashboard'
    },
    {
      label: 'Procurement Analytics',
      icon: 'graph-up-arrow',
      path: '/reports',
      permission: 'viewstatistics'
    },
    {
      label: 'Activity Logs',
      icon: 'clock-history',
      path: '/activity-logs',
      permission: 'viewactivitylogs'
    },
    {
      label: 'User Management',
      icon: 'people-fill',
      path: '/users',
      permission: 'viewusers',
      adminOnly: true
    }
  ];

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''} d-flex flex-column`}>
      {/* Branding Header */}
      <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-secondary border-opacity-25" style={{ height: 'var(--navbar-height)' }}>
        <Link to="/dashboard" className="d-flex align-items-center gap-2 text-decoration-none text-white flex-grow-1 overflow-hidden">
          <div className="bg-primary rounded-3 p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
            <i className="bi bi-shuffle text-white fw-bold" style={{ fontSize: '1.2rem' }} />
          </div>
          {!collapsed && (
            <span className="fw-bold fs-5 text-white tracking-wide" style={{ whiteSpace: 'nowrap' }}>
              VendorBridge
            </span>
          )}
        </Link>
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="btn btn-link text-secondary p-1 d-none d-md-block"
        >
          <i className={`bi bi-chevron-${collapsed ? 'right' : 'left'}`} style={{ fontSize: '1.2rem' }} />
        </button>
      </div>

      {/* Menu Links */}
      <div className="flex-grow-1 py-3 overflow-y-auto px-2">
        <ul className="nav nav-pills flex-column gap-1">
          {menuItems.map((item, idx) => {
            if (item.adminOnly && user?.rolename !== 'Admin') {
              return null;
            }

            if (item.hideForAdmin && user?.rolename === 'Admin') {
              return null;
            }

            if (item.managerAdminOnly && !['Manager', 'Admin'].includes(user?.rolename)) {
              return null;
            }

            // Check permission if item has a specific permission requirement
            if (item.permission && !hasPermission(item.permission)) {
              return null;
            }

            return (
              <li key={idx}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `
                    nav-link d-flex align-items-center gap-3 py-2 px-3 text-white-50 rounded-3
                    ${isActive ? 'active bg-primary text-white' : 'hover-bg-secondary'}
                  `}
                  style={{ transition: 'all 0.15s ease' }}
                >
                  <i className={`bi bi-${item.icon}`} style={{ fontSize: '1.2rem' }} />
                  {!collapsed && <span style={{ fontSize: '0.95rem' }}>{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User Footer Profile Summary */}
      {!collapsed && user && (
        <div className="p-3 border-top border-secondary border-opacity-25 bg-dark bg-opacity-25 d-flex align-items-center gap-2">
          <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '38px', height: '38px', fontSize: '0.9rem' }}>
            {user.firstname?.[0]?.toUpperCase()}{user.lastname?.[0]?.toUpperCase()}
          </div>
          <div className="d-flex flex-column overflow-hidden">
            <span className="text-white fw-semibold text-truncate" style={{ fontSize: '0.85rem' }}>
              {user.firstname} {user.lastname}
            </span>
            <span className="text-muted text-truncate" style={{ fontSize: '0.75rem' }}>
              {user.rolename}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
