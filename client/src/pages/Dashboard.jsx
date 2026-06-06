import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { useAuth } from '../common/contexts/AuthContext';
import PageHeader from '../common/components/PageHeader';
import StatCard from '../common/components/StatCard';
import Card from '../common/components/Card';
import Badge from '../common/components/Badge';
import Loader from '../common/components/Loader';

const Dashboard = () => {
  const { user } = useAuth();

  // Fetch real-time dashboard data from the backend API
  const { data: dashboardResponse, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/dashboard/stats');
      return res.data.data;
    }
  });

  if (isLoading) {
    return <Loader fullPage={true} text="Loading system metrics..." />;
  }

  if (error) {
    return (
      <div className="container-fluid p-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Failed to Load Dashboard Data</h4>
          <p className="mb-0">{error.response?.data?.message || error.message || 'An error occurred while fetching metrics.'}</p>
        </div>
      </div>
    );
  }

  const stats = dashboardResponse?.stats || {};
  const recentLogs = dashboardResponse?.recentLogs || [];
  const roleStats = dashboardResponse?.roleStats || [];

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        breadcrumbs={[{ label: 'Dashboard', link: '/dashboard' }]}
        action={
          <div className="text-muted small fw-medium">
            Welcome back, <span className="text-dark fw-bold">{user?.firstname} {user?.lastname}</span> ({user?.rolename})
          </div>
        }
      />

      {/* Top statistics cards (real-time data) */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard 
            title="Total Users" 
            value={stats.totalUsers || 0} 
            icon="people" 
            color="primary" 
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard 
            title="Active Users" 
            value={stats.activeUsers || 0} 
            icon="person-check" 
            color="success" 
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard 
            title="Activity Logs" 
            value={stats.totalLogs || 0} 
            icon="journal-check" 
            color="info" 
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard 
            title="Active Sessions" 
            value={stats.activeSessions || 0} 
            icon="activity" 
            color="warning" 
          />
        </div>
      </div>

      <div className="row g-4">
        {/* Recent System Activity */}
        <div className="col-12 col-lg-7">
          <Card title="Recent System Activity">
            {recentLogs.length === 0 ? (
              <p className="text-muted small p-3 mb-0">No audit logs recorded yet.</p>
            ) : (
              <div className="table-responsive border-0">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr className="border-bottom border-light">
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3">Actor</th>
                      <th className="py-3 px-3">Module</th>
                      <th className="py-3 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.map((row) => (
                      <tr key={row.id} className="border-bottom border-secondary border-opacity-10">
                        <td className="py-3 px-3 small text-muted" style={{ whiteSpace: 'nowrap' }}>
                          {formatTimestamp(row.createdat)}
                        </td>
                        <td className="py-3 px-3 fw-medium">
                          {row.username ? `${row.firstname} ${row.lastname} (${row.username})` : 'System'}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="secondary">{row.module}</Badge>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-dark fw-semibold">{row.action}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* User Role Distribution */}
        <div className="col-12 col-lg-5">
          <Card title="User Role Distribution">
            <p className="text-muted small mb-3">Breakdown of registered accounts by system role:</p>
            <div className="d-flex flex-column gap-3">
              {roleStats.map((row, idx) => {
                const colors = ['bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger'];
                const color = colors[idx % colors.length];
                return (
                  <div key={row.rolename}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small fw-semibold text-dark">{row.rolename}</span>
                      <span className="small text-muted">
                        {row.count} {row.count === 1 ? 'user' : 'users'} ({row.percentage}%)
                      </span>
                    </div>
                    <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                      <div 
                        className={`progress-bar ${color}`} 
                        role="progressbar" 
                        style={{ width: `${row.percentage}%`, borderRadius: '4px' }} 
                        aria-valuenow={row.percentage} 
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
