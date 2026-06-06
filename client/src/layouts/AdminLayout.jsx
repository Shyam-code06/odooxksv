import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../common/contexts/AuthContext';
import Loader from '../common/components/Loader';

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if user session is not found
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Adjust sidebar state for responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    handleResize(); // run on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading || !user) {
    return <Loader fullPage={true} text="Initializing session..." />;
  }

  return (
    <div className="admin-shell">
      {/* Sidebar navigation */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main viewport */}
      <div className="main-content d-flex flex-column flex-grow-1 bg-light">
        <Navbar collapsed={collapsed} setCollapsed={setCollapsed} />
        
        {/* Scrollable sub-view body */}
        <main className="p-4 flex-grow-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
