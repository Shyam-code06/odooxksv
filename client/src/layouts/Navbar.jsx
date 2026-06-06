import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../common/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
const Navbar = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Fetch notifications
  const { data: notifData, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/notification');
      return res.data.data;
    },
    enabled: !!user,
    refetchInterval: 30000 // poll every 30s
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => axios.put(`http://localhost:5000/api/notification/${id}/read`),
    onSuccess: () => refetchNotifications()
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

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
        <div className="position-relative">
          <button 
            className="btn btn-light position-relative p-2 border-0 rounded-3"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <i className="bi bi-bell fs-5" />
            {unreadCount > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
                <span className="visually-hidden">unread messages</span>
              </span>
            )}
          </button>

          {notificationsOpen && (
            <>
              <div 
                className="position-fixed top-0 start-0 w-100 h-100" 
                style={{ zIndex: 999 }} 
                onClick={() => setNotificationsOpen(false)}
              />
              <div 
                className="position-absolute end-0 mt-2 bg-white rounded-3 shadow-lg border p-0 text-start" 
                style={{ zIndex: 1000, width: '320px', maxHeight: '400px', overflowY: 'auto' }}
              >
                <div className="p-3 border-bottom bg-light d-flex justify-content-between align-items-center rounded-top-3">
                  <span className="fw-bold text-dark">Notifications</span>
                  {unreadCount > 0 && <span className="badge bg-primary rounded-pill">{unreadCount} New</span>}
                </div>
                <div className="list-group list-group-flush rounded-bottom-3">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted small">No notifications yet</div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={`list-group-item list-group-item-action p-3 border-bottom-0 border-top ${n.isread ? 'bg-white' : 'bg-primary bg-opacity-10'}`}
                      >
                        <div className="d-flex w-100 justify-content-between align-items-start mb-1">
                          <strong className="mb-1 small text-dark">{n.type}</strong>
                          <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {new Date(n.createdat).toLocaleDateString()}
                          </small>
                        </div>
                        <p className="mb-1 small text-muted lh-sm">{n.message}</p>
                        {!n.isread && (
                          <button 
                            className="btn btn-link btn-sm p-0 text-decoration-none small mt-1" 
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => markReadMutation.mutate(n.id)}
                            disabled={markReadMutation.isPending}
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

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
