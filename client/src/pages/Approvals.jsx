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
    setDecisionModalOpen(true);
  };

  const confirmDecision = () => {
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
          <span className="fw-semibold text-primary">{row.rfqnumber}</span>
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
          <span className="fw-semibold text-dark">{row.rfqnumber}</span>
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
        <ConfirmDialog
          isOpen={decisionModalOpen}
          onClose={() => { setDecisionModalOpen(false); setSelectedApproval(null); setRemarks(''); }}
          onConfirm={confirmDecision}
          title={`${targetStatus} Procurement Workflow?`}
          message={
            <div>
              <p>Are you sure you want to change status to <strong>{targetStatus}</strong> for RFQ reference: <strong>{selectedApproval.rfqnumber}</strong> ({selectedApproval.rfqtitle})?</p>
              
              {/* Timeline Visualizer */}
              {selectedApproval.workflowtype === 'RFQ_Publish' ? (
                <div className="my-4 p-3 border rounded bg-light">
                  <label className="form-label fw-bold text-dark small mb-2 d-block">RFQ Publish Approval Timeline</label>
                  <div className="d-flex align-items-center justify-content-between small text-center text-muted px-2 position-relative">
                    <div style={{ position: 'absolute', top: '10px', left: '10%', right: '10%', height: '2px', backgroundColor: '#e2e8f0', zIndex: 0 }} />
                    <div className="z-1 bg-light px-2">
                      <span className="badge rounded-circle bg-success mb-1" style={{ width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                      <span className="d-block small fw-semibold text-dark">1. Draft</span>
                    </div>
                    <div className="z-1 bg-light px-2">
                      <span className="badge rounded-circle bg-warning text-dark mb-1" style={{ width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>⚙</span>
                      <span className="d-block small fw-semibold text-dark">2. Pending Approval</span>
                    </div>
                    <div className="z-1 bg-light px-2">
                      <span className="badge rounded-circle bg-secondary mb-1" style={{ width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                      <span className="d-block small">3. Published</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="my-4 p-3 border rounded bg-light">
                  <label className="form-label fw-bold text-dark small mb-2 d-block">Quotation Evaluation Approval Timeline</label>
                  <div className="d-flex align-items-center justify-content-between small text-center text-muted px-2 position-relative">
                    <div style={{ position: 'absolute', top: '10px', left: '10%', right: '10%', height: '2px', backgroundColor: '#e2e8f0', zIndex: 0 }} />
                    <div className="z-1 bg-light px-2">
                      <span className="badge rounded-circle bg-success mb-1" style={{ width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                      <span className="d-block small fw-semibold text-dark">1. Published</span>
                    </div>
                    <div className="z-1 bg-light px-2">
                      <span className="badge rounded-circle bg-success mb-1" style={{ width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                      <span className="d-block small fw-semibold text-dark">2. Closed</span>
                    </div>
                    <div className="z-1 bg-light px-2">
                      <span className="badge rounded-circle bg-warning text-dark mb-1" style={{ width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>⚙</span>
                      <span className="d-block small fw-semibold text-dark">3. Evaluation</span>
                    </div>
                    <div className="z-1 bg-light px-2">
                      <span className="badge rounded-circle bg-secondary mb-1" style={{ width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>4</span>
                      <span className="d-block small">4. Issued PO</span>
                    </div>
                  </div>
                </div>
              )}

              <Textarea
                label="Add remarks or justification notes (Mandatory on Reject)"
                placeholder="Describe reason for decision..."
                value={remarks}
                onChange={setRemarks}
                rows={3}
                required={targetStatus === 'Rejected'}
              />
            </div>
          }
          confirmText={`Confirm ${targetStatus}`}
          isDanger={targetStatus === 'Rejected'}
          isLoading={processDecisionMutation.isPending}
        />
      )}
    </div>
  );
};

export default Approvals;
