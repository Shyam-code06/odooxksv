import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import PageHeader from '../common/components/PageHeader';
import Card from '../common/components/Card';
import Badge from '../common/components/Badge';
import BaseTable from '../common/components/Table/BaseTable';
import Button from '../common/components/Button';
import Modal from '../common/components/Modal';
import Textarea from '../common/components/Textarea';
import ConfirmDialog from '../common/components/ConfirmDialog';
import Loader from '../common/components/Loader';
import { useAuth } from '../common/contexts/AuthContext';

const Approvals = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.rolename === 'Manager' || user?.rolename === 'Admin';

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [validationError, setValidationError] = useState('');
  const [selectedRfqId, setSelectedRfqId] = useState(null);
  const [rfqDetailModalOpen, setRfqDetailModalOpen] = useState(false);

  // Fetch single RFQ detail for evaluation review
  const { data: rfqDetail, isLoading: rfqDetailLoading } = useQuery({
    queryKey: ['rfq-detail-approvals', selectedRfqId],
    queryFn: async () => {
      if (!selectedRfqId) return null;
      const res = await axios.get(`http://localhost:5000/api/rfq/${selectedRfqId}`);
      return res.data.data;
    },
    enabled: !!selectedRfqId
  });

  // 1. Fetch pending approvals list
  const { data: pendingList, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/approval/pending');
      return res.data.data;
    },
    enabled: isManagerOrAdmin
  });

  // 2. Fetch approval history list
  const { data: historyList, isLoading: historyLoading } = useQuery({
    queryKey: ['history-approvals'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/approval/history');
      return res.data.data;
    },
    enabled: isManagerOrAdmin
  });

  // Mutation: Process Manager Decision (Approve / Reject)
  const processDecisionMutation = useMutation({
    mutationFn: ({ stepId, status, remarks }) =>
      axios.post(`http://localhost:5000/api/approval/decide/${stepId}`, { status, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-approvals']);
      queryClient.invalidateQueries(['history-approvals']);
      setDecisionModalOpen(false);
      setSelectedApproval(null);
      setRemarks('');
      alert(`Approval request successfully ${targetStatus.toLowerCase()}!`);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to record approval decision');
    }
  });

  const triggerDecision = (approval, status) => {
    setSelectedApproval(approval);
    setTargetStatus(status);
    setRemarks('');
    setValidationError('');
    setDecisionModalOpen(true);
  };

  const confirmDecision = () => {
    if (targetStatus === 'Rejected' && !remarks.trim()) {
      setValidationError('Remarks are required when rejecting approval.');
      return;
    }
    setValidationError('');
    if (selectedApproval && targetStatus) {
      processDecisionMutation.mutate({
        stepId: selectedApproval.stepid,
        status: targetStatus,
        remarks: remarks
      });
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Pending': return 'warning';
      case 'Rejected': return 'danger';
      default: return 'secondary';
    }
  };

  // Define Table Columns for Pending
  const pendingColumns = [
    {
      key: 'rfqnumber',
      header: 'RFQ Target',
      render: (row) => (
        <div>
          <button 
            className="btn btn-link p-0 text-start fw-bold text-decoration-none"
            onClick={() => { setSelectedRfqId(row.targetid); setRfqDetailModalOpen(true); }}
            title="Click to view all quotations & details"
          >
            {row.rfqnumber}
          </button>
          <span className="small text-muted d-block">{row.rfqtitle}</span>
        </div>
      )
    },
    { key: 'workflowtype', header: 'Workflow Item Type' },
    { key: 'requester', header: 'Officer Requester', render: (row) => `${row.requesterfirst || ''} ${row.requesterlast || 'Procurement'}` },
    { key: 'stepcreatedat', header: 'Submitted Date', render: (row) => new Date(row.stepcreatedat).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="d-flex gap-2">
          <Button variant="success" size="sm" onClick={() => triggerDecision(row, 'Approved')}>
            <i className="bi bi-check-lg" /> Approve
          </Button>
          <Button variant="danger" size="sm" onClick={() => triggerDecision(row, 'Rejected')}>
            <i className="bi bi-x-lg" /> Reject
          </Button>
        </div>
      )
    }
  ];

  // Define Table Columns for History
  const historyColumns = [
    {
      key: 'rfqnumber',
      header: 'RFQ Target',
      render: (row) => (
        <div>
          <button 
            className="btn btn-link p-0 text-start fw-bold text-decoration-none"
            onClick={() => { setSelectedRfqId(row.targetid); setRfqDetailModalOpen(true); }}
            title="Click to view all quotations & details"
          >
            {row.rfqnumber}
          </button>
          <span className="small text-muted d-block">{row.rfqtitle}</span>
        </div>
      )
    },
    {
      key: 'stepstatus',
      header: 'My Decision',
      render: (row) => <Badge variant={getStatusBadgeVariant(row.stepstatus)}>{row.stepstatus}</Badge>
    },
    { key: 'remarks', header: 'Manager Remarks', render: (row) => row.remarks || <span className="text-muted small">No Remarks</span> },
    { key: 'decidedat', header: 'Decided Date', render: (row) => new Date(row.decidedat).toLocaleString() }
  ];

  if (!isManagerOrAdmin) {
    return (
      <div className="container-fluid p-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Access Denied</h4>
          <p className="mb-0">You do not have permission to view the approvals workflow dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="Procurement Approval Workflows"
        breadcrumbs={[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Approvals', link: '/approvals' }
        ]}
      />

      {/* Tabs */}
      <div className="d-flex border-bottom mb-4 bg-white rounded shadow-sm p-2 gap-2">
        <button
          className={`btn btn-sm px-4 rounded-3 fw-semibold transition-all ${activeTab === 'pending' ? 'btn-primary' : 'btn-light text-muted'}`}
          onClick={() => setActiveTab('pending')}
        >
          <i className="bi bi-hourglass-split me-1" /> Pending Actions ({pendingList?.length || 0})
        </button>
        <button
          className={`btn btn-sm px-4 rounded-3 fw-semibold transition-all ${activeTab === 'history' ? 'btn-primary' : 'btn-light text-muted'}`}
          onClick={() => setActiveTab('history')}
        >
          <i className="bi bi-clock-history me-1" /> Decision History ({historyList?.length || 0})
        </button>
      </div>

      {activeTab === 'pending' ? (
        <Card title="Pending Review Requests">
          <BaseTable
            columns={pendingColumns}
            data={pendingList || []}
            loading={pendingLoading}
          />
        </Card>
      ) : (
        <Card title="Your Workflow Decision Trails">
          <BaseTable
            columns={historyColumns}
            data={historyList || []}
            loading={historyLoading}
          />
        </Card>
      )}

      {/* Decision Remarks Dialog Modal */}
      {selectedApproval && (
        <Modal
          isOpen={decisionModalOpen}
          onClose={() => { setDecisionModalOpen(false); setSelectedApproval(null); setRemarks(''); setValidationError(''); }}
          title={`${targetStatus === 'Approved' ? 'Approve' : 'Reject'} Procurement Workflow?`}
          footer={
            <div className="d-flex justify-content-end gap-2 w-100">
              <Button 
                variant="light" 
                onClick={() => { setDecisionModalOpen(false); setSelectedApproval(null); setRemarks(''); setValidationError(''); }} 
                disabled={processDecisionMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                variant={targetStatus === 'Rejected' ? 'danger' : 'success'} 
                onClick={confirmDecision}
                isLoading={processDecisionMutation.isPending}
              >
                Confirm {targetStatus}
              </Button>
            </div>
          }
        >
          <div className="d-flex flex-column gap-3">
            {/* Top Status Alert Card */}
            <div className={`p-3 rounded-3 border d-flex gap-3 align-items-start ${
              targetStatus === 'Approved' 
                ? 'bg-success-subtle border-success-subtle text-success-emphasis' 
                : 'bg-danger-subtle border-danger-subtle text-danger-emphasis'
            }`}>
              <div className="rounded-circle p-2 d-flex align-items-center justify-content-center bg-white shadow-sm" style={{ width: '38px', height: '38px', flexShrink: 0 }}>
                <i className={`bi bi-${targetStatus === 'Approved' ? 'check-circle-fill text-success' : 'exclamation-triangle-fill text-danger'}`} style={{ fontSize: '1.2rem' }} />
              </div>
              <div>
                <p className="mb-1 fw-bold text-dark">
                  Change status to <span className={targetStatus === 'Approved' ? 'text-success' : 'text-danger'}>{targetStatus}</span>
                </p>
                <p className="text-secondary small mb-0">
                  Are you sure you want to change status to <strong>{targetStatus}</strong> for RFQ reference: <strong>{selectedApproval.rfqnumber}</strong> ({selectedApproval.rfqtitle})?
                </p>
              </div>
            </div>

            {/* Timeline Visualizer */}
            {selectedApproval.workflowtype === 'RFQ_Publish' ? (
              <div className="p-3 border rounded-3 bg-light-subtle shadow-sm">
                <label className="form-label fw-bold text-secondary small mb-3 d-block">
                  <i className="bi bi-diagram-3 me-2" />RFQ Publish Approval Timeline
                </label>
                <div className="d-flex align-items-center justify-content-between small text-center text-muted px-2 position-relative">
                  <div style={{ position: 'absolute', top: '16px', left: '10%', right: '10%', height: '3px', backgroundColor: '#e2e8f0', zIndex: 0 }} />
                  
                  {/* Step 1 */}
                  <div className="z-1 bg-white px-2 rounded border py-1 shadow-sm timeline-step">
                    <span className="badge rounded-circle bg-success mb-1" style={{ width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                    <span className="d-block small fw-bold text-dark">1. Draft</span>
                  </div>

                  {/* Step 2 */}
                  <div className="z-1 bg-white px-2 rounded border border-warning py-1 shadow-sm timeline-step">
                    <span className="badge rounded-circle bg-warning text-dark mb-1" style={{ width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><i className="bi bi-clock-fill" /></span>
                    <span className="d-block small fw-bold text-dark">2. Pending Approval</span>
                  </div>

                  {/* Step 3 */}
                  <div className="z-1 bg-white px-2 rounded border py-1 shadow-sm opacity-75 timeline-step">
                    <span className="badge rounded-circle bg-secondary mb-1" style={{ width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                    <span className="d-block small text-muted">3. Published</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 border rounded-3 bg-light-subtle shadow-sm">
                <label className="form-label fw-bold text-secondary small mb-3 d-block">
                  <i className="bi bi-diagram-3 me-2" />Quotation Evaluation Approval Timeline
                </label>
                <div className="d-flex align-items-center justify-content-between small text-center text-muted px-2 position-relative">
                  <div style={{ position: 'absolute', top: '16px', left: '10%', right: '10%', height: '3px', backgroundColor: '#e2e8f0', zIndex: 0 }} />
                  
                  {/* Step 1 */}
                  <div className="z-1 bg-white px-2 rounded border py-1 shadow-sm timeline-step">
                    <span className="badge rounded-circle bg-success mb-1" style={{ width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                    <span className="d-block small fw-bold text-dark">1. Published</span>
                  </div>

                  {/* Step 2 */}
                  <div className="z-1 bg-white px-2 rounded border py-1 shadow-sm timeline-step">
                    <span className="badge rounded-circle bg-success mb-1" style={{ width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                    <span className="d-block small fw-bold text-dark">2. Closed</span>
                  </div>

                  {/* Step 3 */}
                  <div className="z-1 bg-white px-2 rounded border border-warning py-1 shadow-sm timeline-step">
                    <span className="badge rounded-circle bg-warning text-dark mb-1" style={{ width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><i className="bi bi-gear-fill spin-slow" /></span>
                    <span className="d-block small fw-bold text-dark">3. Evaluation</span>
                  </div>

                  {/* Step 4 */}
                  <div className="z-1 bg-white px-2 rounded border py-1 shadow-sm opacity-75 timeline-step">
                    <span className="badge rounded-circle bg-secondary mb-1" style={{ width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>4</span>
                    <span className="d-block small text-muted">4. Issued PO</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-2">
              <Textarea
                label="Add remarks or justification notes"
                placeholder="Describe reason for decision..."
                value={remarks}
                onChange={(e) => {
                  setRemarks(e.target.value);
                  if (e.target.value.trim()) setValidationError('');
                }}
                rows={3}
                required={targetStatus === 'Rejected'}
                error={validationError}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* RFQ Target / Quotations Review Modal */}
      {rfqDetailModalOpen && (
        <Modal
          isOpen={rfqDetailModalOpen}
          onClose={() => { setRfqDetailModalOpen(false); setSelectedRfqId(null); }}
          title={`Quotations Review - RFQ: ${rfqDetail?.rfqnumber || ''}`}
          size="lg"
        >
          {rfqDetailLoading ? (
            <Loader text="Loading quotation details..." />
          ) : rfqDetail ? (
            <div>
              <div className="mb-4">
                <h5 className="fw-bold mb-1">{rfqDetail.title}</h5>
                <p className="text-muted small mb-0">{rfqDetail.description}</p>
              </div>

              <div className="row g-4 mb-4">
                <div className="col-md-6 border-end">
                  <h6 className="fw-bold text-secondary text-uppercase small">Procurement Details</h6>
                  <table className="table table-sm table-borderless small">
                    <tbody>
                      <tr>
                        <td className="text-muted py-1" style={{ width: '120px' }}>Quantity:</td>
                        <td className="fw-semibold py-1">{rfqDetail.quantity} {rfqDetail.unit || 'Units'}</td>
                      </tr>
                      <tr>
                        <td className="text-muted py-1">Deadline Date:</td>
                        <td className="fw-semibold text-danger py-1">{new Date(rfqDetail.deadline).toLocaleDateString()}</td>
                      </tr>
                      <tr>
                        <td className="text-muted py-1">Current Status:</td>
                        <td className="py-1">
                          <Badge variant={rfqDetail.status === 'Published' ? 'primary' : 'warning'}>
                            {rfqDetail.status}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  <h6 className="fw-bold text-secondary text-uppercase small">Invited Suppliers ({rfqDetail.assignedVendors?.length || 0})</h6>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {rfqDetail.assignedVendors?.map(v => (
                      <div key={v.id} className="border rounded py-1 px-2 bg-light d-flex align-items-center gap-1">
                        <i className="bi bi-shop text-primary small" />
                        <span className="small fw-semibold" style={{ fontSize: '0.8rem' }}>{v.companyname}</span>
                        <span className="badge bg-warning text-dark px-1 py-0" style={{ fontSize: '0.7rem' }}>{v.rating}★</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h6 className="fw-bold text-secondary text-uppercase small mb-3">Quotations Comparison Report</h6>
                {rfqDetail.quotations && rfqDetail.quotations.length > 0 ? (
                  <div className="table-responsive border rounded bg-white">
                    <table className="table table-hover align-middle mb-0 small">
                      <thead className="table-light">
                        <tr>
                          <th>Vendor Supplier</th>
                          <th>Total Price</th>
                          <th>Delivery Timeline</th>
                          <th>Quotation Status</th>
                          <th>Selection Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rfqDetail.quotations.map(q => {
                          const isSelectedByOfficer = q.status === 'Reviewed' || q.status === 'Accepted';
                          return (
                            <tr key={q.id} className={isSelectedByOfficer ? 'table-warning fw-semibold' : ''}>
                              <td>
                                <div className="fw-semibold text-dark">{q.companyname}</div>
                                <div className="text-muted small">Rating: {q.vendorrating} ★</div>
                              </td>
                              <td className="fw-bold text-success">${parseFloat(q.totalprice).toLocaleString()}</td>
                              <td>{q.deliverydays} days</td>
                              <td>
                                <Badge variant={q.status === 'Accepted' ? 'success' : q.status === 'Rejected' ? 'danger' : q.status === 'Reviewed' ? 'info' : 'warning'}>
                                  {q.status}
                                </Badge>
                              </td>
                              <td>
                                {isSelectedByOfficer ? (
                                  <span className="badge bg-warning text-dark border border-warning shadow-sm">
                                    <i className="bi bi-star-fill me-1" /> Selected by Officer
                                  </span>
                                ) : (
                                  <span className="text-muted small">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted text-center p-4 border rounded bg-light mb-0">No quotations received yet for this RFQ.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-danger">Failed to load details.</p>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Approvals;
