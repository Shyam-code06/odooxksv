import React, { useState } from 'react';
import { useAuth } from '../common/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav 
      className="navbar navbar-expand-lg navbar-light bg-white border-bottom px-3 d-flex align-items-center justify-content-between"
      style={{ height: 'var(--navbar-height)', zIndex: 90 }}
    >
      <div className="d-flex align-items-center gap-3">
        {/* Toggle Button */}
        <button 
          className="btn btn-light p-2 border-0 rounded-3" 
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle Sidebar"
        >
          <i className="bi bi-list fs-5" />
        </button>
        
        {/* Breadcrumb / Search bar placeholder */}
        <span className="text-muted d-none d-sm-inline fw-medium" style={{ fontSize: '0.9rem' }}>
          Procurement & Vendor Bridge ERP
        </span>
      </div>

      <div className="d-flex align-items-center gap-3">
        {/* Notification Icon */}
        <button className="btn btn-light position-relative p-2 border-0 rounded-3">
          <i className="bi bi-bell fs-5" />
          <span className="position-absolute top-1 start-75 translate-middle p-1 bg-danger border border-light rounded-circle">
            <span className="visually-hidden">New alerts</span>
          </span>
        </button>

        {/* User Dropdown */}
        {user && (
          <div className="position-relative">
            <button 
              className="btn btn-light d-flex align-items-center gap-2 border-0 rounded-3 p-2"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
                {user.firstname?.[0]?.toUpperCase()}{user.lastname?.[0]?.toUpperCase()}
              </div>
              <div className="text-start d-none d-md-block">
                <p className="mb-0 fw-semibold leading-none text-dark" style={{ fontSize: '0.85rem' }}>
                  {user.firstname} {user.lastname}
                </p>
                <p className="mb-0 text-muted leading-none" style={{ fontSize: '0.75rem' }}>
                  {user.rolename}
                </p>
              </div>
              <i className="bi bi-chevron-down text-muted small ms-1" />
            </button>

            {dropdownOpen && (
              <>
                {/* Backdrop overlay to close dropdown */}
                <div 
                  className="position-fixed top-0 start-0 w-100 h-100" 
                  style={{ zIndex: 999 }} 
                  onClick={() => setDropdownOpen(false)}
                />
                
                {/* Dropdown Menu */}
                <div 
                  className="position-absolute end-0 mt-2 bg-white rounded-3 shadow-lg border p-2 text-start" 
                  style={{ zIndex: 1000, width: '200px' }}
                >
                  <Link 
                    to="/profile" 
                    className="dropdown-item py-2 px-3 rounded-2 text-dark text-decoration-none d-block hover-bg-light"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <i className="bi bi-person me-2 text-muted" /> My Profile
                  </Link>
                  <Link 
                    to="/change-password" 
                    className="dropdown-item py-2 px-3 rounded-2 text-dark text-decoration-none d-block hover-bg-light"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <i className="bi bi-key me-2 text-muted" /> Change Password
                  </Link>
                  <hr className="my-1 border-secondary border-opacity-10" />
                  <button 
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                    className="dropdown-item py-2 px-3 rounded-2 text-danger border-0 bg-transparent text-start w-100 hover-bg-light"
                  >
                    <i className="bi bi-box-arrow-right me-2" /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
