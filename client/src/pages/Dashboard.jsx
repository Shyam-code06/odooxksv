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

  // Fetch activity logs for dashboard if manager or admin
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['dashboard-logs'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/auditlog', {
        params: { page: 1, limit: 10 }
      });
      return res.data.data;
    },
    enabled: !!user && ['Manager', 'Admin'].includes(user.rolename)
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
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="RFQs Received" value={stats.rfqsReceived || 0} icon="mailbox" color="primary" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Quotations Submitted" value={stats.quotationsSubmitted || 0} icon="file-earmark-check" color="success" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Purchase Orders" value={stats.purchaseOrdersCount || 0} icon="file-earmark-pdf" color="warning" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Invoices" value={stats.invoicesCount || 0} icon="receipt-cutoff" color="info" />
          </div>
        </div>
      );
    }

    if (role === 'ProcurementOfficer') {
      return (
        <div className="row g-4 mb-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Active RFQs" value={stats.activeRfqs || 0} icon="file-earmark-play" color="primary" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Pending Quotations" value={stats.pendingQuotations || 0} icon="hourglass-split" color="info" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Purchase Orders" value={stats.purchaseOrdersCount || 0} icon="file-earmark-pdf" color="warning" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Invoices" value={stats.invoicesCount || 0} icon="receipt-cutoff" color="success" />
          </div>
        </div>
      );
    }

    if (role === 'Manager') {
      return (
        <div className="row g-4 mb-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Pending Approvals" value={stats.pendingApprovals || 0} icon="shield-fill-exclamation" color="danger" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Decided Approvals" value={stats.completedApprovals || 0} icon="shield-fill-check" color="success" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Purchase Orders" value={stats.purchaseOrdersCount || 0} icon="file-earmark-pdf" color="warning" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Invoices" value={stats.invoicesCount || 0} icon="receipt-cutoff" color="info" />
          </div>
        </div>
      );
    }

    // Default: Admin
    return (
      <div className="row g-4 mb-4">
        <div className="col-12 col-sm-6 col-lg-2">
          <StatCard title="Total Vendors" value={stats.totalVendors || 0} icon="shop" color="primary" />
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <StatCard title="Total RFQs" value={stats.totalRfqs || 0} icon="file-earmark-text" color="success" />
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <StatCard title="Pending Approvals" value={stats.pendingApprovals || 0} icon="hourglass-split" color="info" />
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <StatCard title="Total Spend" value={`$${(stats.totalSpend || 0).toLocaleString()}`} icon="currency-dollar" color="warning" />
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <StatCard title="Purchase Orders" value={stats.purchaseOrdersCount || 0} icon="file-earmark-pdf" color="danger" />
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <StatCard title="Invoices" value={stats.invoicesCount || 0} icon="receipt-cutoff" color="secondary" />
        </div>
      </div>
    );
  };

  const renderRecentPOsTable = (recentPOs, showVendor = true) => {
    return (
      <Card title="Recent Purchase Orders">
        {!recentPOs || recentPOs.length === 0 ? (
          <p className="text-muted small p-3 mb-0">No purchase orders found.</p>
        ) : (
          <div className="table-responsive border-0">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr className="border-bottom border-light">
                  <th className="py-3 px-3">PO Number</th>
                  {showVendor && <th className="py-3 px-3">Vendor</th>}
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPOs.map((row) => (
                  <tr key={row.id} className="border-bottom border-secondary border-opacity-10">
                    <td className="py-3 px-3 fw-semibold text-primary">{row.ponumber}</td>
                    {showVendor && <td className="py-3 px-3">{row.companyname || 'Supplier'}</td>}
                    <td className="py-3 px-3 fw-bold">${parseFloat(row.totalamount).toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <Badge variant={row.status === 'Completed' ? 'success' : row.status === 'Cancelled' ? 'danger' : 'warning'}>
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    );
  };

  const renderRecentInvoicesTable = (recentInvoices, showVendor = true) => {
    return (
      <Card title="Recent Invoices">
        {!recentInvoices || recentInvoices.length === 0 ? (
          <p className="text-muted small p-3 mb-0">No invoices generated.</p>
        ) : (
          <div className="table-responsive border-0">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr className="border-bottom border-light">
                  <th className="py-3 px-3">Invoice Number</th>
                  <th className="py-3 px-3">PO Ref</th>
                  {showVendor && <th className="py-3 px-3">Vendor</th>}
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((row) => (
                  <tr key={row.id} className="border-bottom border-secondary border-opacity-10">
                    <td className="py-3 px-3 fw-semibold text-primary">{row.invoicenumber}</td>
                    <td className="py-3 px-3 text-muted small">{row.ponumber}</td>
                    {showVendor && <td className="py-3 px-3">{row.companyname || 'Supplier'}</td>}
                    <td className="py-3 px-3 fw-bold">${parseFloat(row.totalamount).toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <Badge variant={row.status === 'Paid' ? 'success' : row.status === 'Cancelled' ? 'danger' : 'warning'}>
                        {row.status === 'Paid' ? 'Successful' : (row.status === 'Unpaid' ? 'Successfully Placed (Unpaid)' : row.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    );
  };

  const renderDashboardPanels = () => {
    if (role === 'Vendor') {
      const recentRfqs = dashboardResponse?.recentRfqs || [];
      const recentQuotations = dashboardResponse?.recentQuotations || [];
      const recentPOs = dashboardResponse?.recentPOs || [];
      const recentInvoices = dashboardResponse?.recentInvoices || [];

      return (
        <div className="d-flex flex-column gap-4">
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

          <div className="row g-4">
            <div className="col-12 col-lg-6">
              {renderRecentPOsTable(recentPOs, false)}
            </div>
            <div className="col-12 col-lg-6">
              {renderRecentInvoicesTable(recentInvoices, false)}
            </div>
          </div>
        </div>
      );
    }

    if (role === 'ProcurementOfficer') {
      const recentRfqs = dashboardResponse?.recentRfqs || [];
      const recentPOs = dashboardResponse?.recentPOs || [];
      const recentInvoices = dashboardResponse?.recentInvoices || [];

      return (
        <div className="d-flex flex-column gap-4">
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
              {renderRecentPOsTable(recentPOs, true)}
            </div>
          </div>

          <div className="row g-4">
            <div className="col-12">
              {renderRecentInvoicesTable(recentInvoices, true)}
            </div>
          </div>
        </div>
      );
    }

    if (role === 'Manager') {
      const recentHistorySteps = dashboardResponse?.recentHistorySteps || [];
      const recentPOs = dashboardResponse?.recentPOs || [];
      const recentInvoices = dashboardResponse?.recentInvoices || [];

      return (
        <div className="d-flex flex-column gap-4">
          <div className="row g-4">
            <div className="col-12">
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

          <div className="row g-4">
            <div className="col-12 col-lg-6">
              {renderRecentPOsTable(recentPOs, true)}
            </div>
            <div className="col-12 col-lg-6">
              {renderRecentInvoicesTable(recentInvoices, true)}
            </div>
          </div>
        </div>
      );
    }

    // Default: Admin
    const recentPOs = dashboardResponse?.recentPOs || [];
    const recentInvoices = dashboardResponse?.recentInvoices || [];

    return (
      <div className="d-flex flex-column gap-4">
        {renderActivityLogs()}
        {renderProcurementTracker()}
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            {renderRecentPOsTable(recentPOs, true)}
          </div>
          <div className="col-12 col-lg-6">
            {renderRecentInvoicesTable(recentInvoices, true)}
          </div>
        </div>
      </div>
    );
  };

  const renderActivityLogs = () => {
    const records = logsData?.records || [];

    return (
      <div className="mb-4">
        <Card title="System Activity Logs (Audit Trail)">
          {logsLoading ? (
            <div className="text-center p-4">
              <Loader text="Loading activity logs..." />
            </div>
          ) : records.length === 0 ? (
            <p className="text-muted small p-3 mb-0">No system activities recorded.</p>
          ) : (
            <div className="table-responsive border-0">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr className="border-bottom border-light">
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">User</th>
                    <th className="py-3 px-3">Module</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Payload / Details</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((row) => {
                    const payload = row.newvalue || row.oldvalue;
                    const str = payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : '-';
                    return (
                      <tr key={row.id} className="border-bottom border-secondary border-opacity-10">
                        <td className="py-3 px-3 small text-muted">{new Date(row.createdat).toLocaleString()}</td>
                        <td className="py-3 px-3 fw-medium">
                          {row.username ? `${row.firstname} ${row.lastname} (${row.username})` : 'System'}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="info">{row.module}</Badge>
                        </td>
                        <td className="py-3 px-3 fw-semibold text-dark">{row.action}</td>
                        <td className="py-3 px-3 text-muted small" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {str}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderProcurementTracker = () => {
    const records = logsData?.records || [];
    
    // Filter for procurement modules
    const procurementRecords = records.filter(r => 
      ['rfq', 'quotation', 'approval'].includes(r.module?.toLowerCase())
    );

    return (
      <div className="col-12 mt-2">
        <Card title="Track Procurement Activities (Live Feed)">
          <p className="text-muted small mb-4">
            Real-time feed of RFQs, vendor quotations, manager approvals, and procurement workflow transitions:
          </p>
          {logsLoading ? (
            <div className="text-center p-4">
              <Loader text="Loading activities..." />
            </div>
          ) : procurementRecords.length === 0 ? (
            <div className="text-center p-5 text-muted">
              <i className="bi bi-activity fs-1 mb-2 d-block text-secondary" />
              <span className="small">No recent procurement activities found.</span>
            </div>
          ) : (
            <div className="position-relative ps-4 border-start border-2 border-secondary border-opacity-10 ms-2">
              {procurementRecords.map((row) => {
                let iconClass = 'bi-activity bg-secondary';
                let actionText = '';
                let detailText = '';

                const payload = row.newvalue || row.oldvalue || {};
                const rfqNo = payload.rfqnumber || (payload.rfqId ? `RFQ ID: ${payload.rfqId.substring(0, 8)}...` : '');

                if (row.module === 'rfq') {
                  if (row.action === 'create') {
                    iconClass = 'bi-file-earmark-plus bg-primary';
                    actionText = `RFQ Created: ${rfqNo || payload.title || ''}`;
                    detailText = `Created in Draft by ${row.firstname} ${row.lastname}`;
                  } else if (row.action === 'publish') {
                    iconClass = 'bi-send bg-success';
                    actionText = `RFQ Published: ${rfqNo || ''}`;
                    detailText = `Invited vendors can now submit quotations.`;
                  } else if (row.action === 'request_approval') {
                    iconClass = 'bi-arrow-right-circle bg-warning';
                    actionText = `Publish Approval Requested: ${rfqNo || ''}`;
                    detailText = `Submitted to manager for publishing review.`;
                  } else if (row.action === 'close') {
                    iconClass = 'bi-x-circle bg-dark';
                    actionText = `Bidding Closed: ${rfqNo || ''}`;
                    detailText = `RFQ is closed for further quotations.`;
                  }
                } else if (row.module === 'quotation') {
                  if (row.action === 'submit') {
                    iconClass = 'bi-chat-square-text bg-info';
                    actionText = `Quotation Submitted`;
                    detailText = `Total Price: $${parseFloat(payload.totalprice || 0).toLocaleString()} (RFQ Reference: ${rfqNo || ''})`;
                  }
                } else if (row.module === 'approval') {
                  if (row.action === 'submit_approval') {
                    iconClass = 'bi-shield-exclamation bg-warning';
                    actionText = `Evaluation Sent for Approval`;
                    detailText = `Submitted to manager for final quotation acceptance.`;
                  } else if (row.action.startsWith('decide_')) {
                    const approved = row.action.includes('approved');
                    iconClass = approved ? 'bi-shield-check bg-success' : 'bi-shield-x bg-danger';
                    actionText = `Quotation ${approved ? 'Approved' : 'Rejected'}`;
                    detailText = `Manager remarks: "${payload.remarks || 'No remarks'}"`;
                  }
                }

                if (!actionText) {
                  actionText = `${row.module?.toUpperCase()} ${row.action}`;
                  detailText = payload ? JSON.stringify(payload) : '';
                }

                return (
                  <div key={row.id} className="position-relative mb-4">
                    {/* Timeline icon dot */}
                    <div 
                      className={`position-absolute rounded-circle text-white d-flex align-items-center justify-content-center shadow-sm ${iconClass.split(' ')[1]}`} 
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        left: '-40px', 
                        top: '0px',
                        fontSize: '0.95rem'
                      }}
                    >
                      <i className={`bi ${iconClass.split(' ')[0]}`} />
                    </div>

                    <div className="ps-2">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="fw-bold text-dark fs-6">{actionText}</span>
                        <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                          {new Date(row.createdat).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-secondary small mb-1 lh-sm">{detailText}</p>
                      <div className="d-flex gap-2 align-items-center">
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          By: <strong className="text-dark">{row.firstname} {row.lastname}</strong> ({row.username || 'System'})
                        </span>
                        <Badge variant="secondary">{row.module}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
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
