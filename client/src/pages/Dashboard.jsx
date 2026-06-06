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
  const role = user?.rolename || 'Admin';

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

  const renderStatsCards = () => {
    if (role === 'Vendor') {
      return (
        <div className="row g-4 mb-4">
          <div className="col-12 col-sm-6 col-lg-4">
            <StatCard title="RFQs Received" value={stats.rfqsReceived || 0} icon="mailbox" color="primary" />
          </div>
          <div className="col-12 col-sm-6 col-lg-4">
            <StatCard title="Quotations Submitted" value={stats.quotationsSubmitted || 0} icon="file-earmark-check" color="success" />
          </div>
          <div className="col-12 col-sm-6 col-lg-4">
            <StatCard title="Purchase Orders" value={stats.purchaseOrdersCount || 0} icon="file-earmark-pdf" color="warning" />
          </div>
        </div>
      );
    }

    if (role === 'ProcurementOfficer') {
      return (
        <div className="row g-4 mb-4">
          <div className="col-12 col-sm-6 col-lg-4">
            <StatCard title="Active RFQs" value={stats.activeRfqs || 0} icon="file-earmark-play" color="primary" />
          </div>
          <div className="col-12 col-sm-6 col-lg-4">
            <StatCard title="Pending Quotations" value={stats.pendingQuotations || 0} icon="hourglass-split" color="info" />
          </div>
          <div className="col-12 col-sm-6 col-lg-4">
            <StatCard title="Purchase Orders" value={stats.purchaseOrdersCount || 0} icon="file-earmark-pdf" color="warning" />
          </div>
        </div>
      );
    }

    if (role === 'Manager') {
      return (
        <div className="row g-4 mb-4">
          <div className="col-12 col-sm-6">
            <StatCard title="Pending Approvals" value={stats.pendingApprovals || 0} icon="shield-fill-exclamation" color="danger" />
          </div>
          <div className="col-12 col-sm-6">
            <StatCard title="Decided Approvals" value={stats.completedApprovals || 0} icon="shield-fill-check" color="success" />
          </div>
        </div>
      );
    }

    // Default: Admin
    return (
      <div className="row g-4 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard title="Total Vendors" value={stats.totalVendors || 0} icon="shop" color="primary" />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard title="Total RFQs" value={stats.totalRfqs || 0} icon="file-earmark-text" color="success" />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard title="Pending Approvals" value={stats.pendingApprovals || 0} icon="hourglass-split" color="info" />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard title="Total Spend" value={`$${(stats.totalSpend || 0).toLocaleString()}`} icon="currency-dollar" color="warning" />
        </div>
      </div>
    );
  };

  const renderDashboardPanels = () => {
    if (role === 'Vendor') {
      const recentRfqs = dashboardResponse?.recentRfqs || [];
      const recentQuotations = dashboardResponse?.recentQuotations || [];

      return (
        <div className="row g-4">
          <div className="col-12 col-lg-7">
            <Card title="Recent RFQ Invitations">
              {recentRfqs.length === 0 ? (
                <p className="text-muted small p-3 mb-0">No active RFQs received.</p>
              ) : (
                <div className="table-responsive border-0">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr className="border-bottom border-light">
                        <th className="py-3 px-3">RFQ Number</th>
                        <th className="py-3 px-3">Title</th>
                        <th className="py-3 px-3">Deadline</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRfqs.map((row) => (
                        <tr key={row.id} className="border-bottom border-secondary border-opacity-10">
                          <td className="py-3 px-3 fw-semibold text-primary">{row.rfqnumber}</td>
                          <td className="py-3 px-3">{row.title}</td>
                          <td className="py-3 px-3 text-muted small">{new Date(row.deadline).toLocaleDateString()}</td>
                          <td className="py-3 px-3"><Badge variant="primary">{row.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="col-12 col-lg-5">
            <Card title="Your Recent Quotations">
              {recentQuotations.length === 0 ? (
                <p className="text-muted small p-3 mb-0">No quotations submitted yet.</p>
              ) : (
                <div className="d-flex flex-column gap-3 p-3">
                  {recentQuotations.map((row) => (
                    <div key={row.id} className="border rounded p-3 bg-white shadow-sm">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small text-muted fw-semibold">RFQ: {row.rfqtitle}</span>
                        <Badge variant={row.status === 'Accepted' ? 'success' : row.status === 'Rejected' ? 'danger' : 'warning'}>
                          {row.status}
                        </Badge>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold text-dark">${parseFloat(row.totalprice).toLocaleString()}</span>
                        <span className="small text-muted">{row.deliverydays} days delivery</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      );
    }

    if (role === 'ProcurementOfficer') {
      const recentRfqs = dashboardResponse?.recentRfqs || [];
      const recentPOs = dashboardResponse?.recentPOs || [];

      return (
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <Card title="Recent RFQs Managed">
              {recentRfqs.length === 0 ? (
                <p className="text-muted small p-3 mb-0">No RFQs created yet.</p>
              ) : (
                <div className="table-responsive border-0">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr className="border-bottom border-light">
                        <th className="py-3 px-3">RFQ Number</th>
                        <th className="py-3 px-3">Title</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRfqs.map((row) => (
                        <tr key={row.id} className="border-bottom border-secondary border-opacity-10">
                          <td className="py-3 px-3 fw-semibold text-primary">{row.rfqnumber}</td>
                          <td className="py-3 px-3">{row.title}</td>
                          <td className="py-3 px-3"><Badge variant="info">{row.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="col-12 col-lg-6">
            <Card title="Recent Purchase Orders">
              {recentPOs.length === 0 ? (
                <p className="text-muted small p-3 mb-0">No purchase orders issued.</p>
              ) : (
                <div className="table-responsive border-0">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr className="border-bottom border-light">
                        <th className="py-3 px-3">PO Number</th>
                        <th className="py-3 px-3">Vendor</th>
                        <th className="py-3 px-3">Total</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPOs.map((row) => (
                        <tr key={row.id} className="border-bottom border-secondary border-opacity-10">
                          <td className="py-3 px-3 fw-semibold text-primary">{row.ponumber}</td>
                          <td className="py-3 px-3">{row.companyname}</td>
                          <td className="py-3 px-3 fw-bold">${parseFloat(row.totalamount).toLocaleString()}</td>
                          <td className="py-3 px-3"><Badge variant="warning">{row.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      );
    }

    if (role === 'Manager') {
      const recentPendingSteps = dashboardResponse?.recentPendingSteps || [];
      const recentHistorySteps = dashboardResponse?.recentHistorySteps || [];

      return (
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <Card title="Pending Workflow Actions">
              {recentPendingSteps.length === 0 ? (
                <p className="text-muted small p-3 mb-0">No pending decisions.</p>
              ) : (
                <div className="d-flex flex-column gap-2 p-3">
                  {recentPendingSteps.map((row) => (
                    <div key={row.id} className="d-flex justify-content-between align-items-center p-3 border rounded bg-white">
                      <div>
                        <span className="fw-semibold text-dark d-block">Approve {row.workflowtype}</span>
                        <span className="small text-muted">Step #{row.stepnumber}</span>
                      </div>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => alert('Review workflow item')}>
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="col-12 col-lg-6">
            <Card title="Your Approval History">
              {recentHistorySteps.length === 0 ? (
                <p className="text-muted small p-3 mb-0">No action history.</p>
              ) : (
                <div className="table-responsive border-0">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr className="border-bottom border-light">
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Decision</th>
                        <th className="py-3 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentHistorySteps.map((row) => (
                        <tr key={row.id} className="border-bottom border-secondary border-opacity-10">
                          <td className="py-3 px-3 fw-semibold">{row.workflowtype}</td>
                          <td className="py-3 px-3">
                            <Badge variant={row.status === 'Approved' ? 'success' : 'danger'}>
                              {row.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-muted small">{formatTimestamp(row.decidedat)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      );
    }

    // Default: Admin
    const recentLogs = dashboardResponse?.recentLogs || [];
    const roleStats = dashboardResponse?.roleStats || [];

    return (
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
    );
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

      {/* Dynamic top statistics cards */}
      {renderStatsCards()}

      {/* Dynamic dashboard panels */}
      {renderDashboardPanels()}
    </div>
  );
};

export default Dashboard;
