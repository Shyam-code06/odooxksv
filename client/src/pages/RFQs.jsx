import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import PageHeader from '../common/components/PageHeader';
import Card from '../common/components/Card';
import Badge from '../common/components/Badge';
import FilterBar from '../common/components/FilterBar';
import SearchBar from '../common/components/SearchBar';
import BaseTable from '../common/components/Table/BaseTable';
import Button from '../common/components/Button';
import Modal from '../common/components/Modal';
import Input from '../common/components/Input';
import Textarea from '../common/components/Textarea';
import Checkbox from '../common/components/Checkbox';
import ConfirmDialog from '../common/components/ConfirmDialog';
import Loader from '../common/components/Loader';
import { useAuth } from '../common/contexts/AuthContext';

const RFQs = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isProcurementOfficer = user?.rolename === 'ProcurementOfficer' || user?.rolename === 'Admin';

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdat');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Modal & Detail States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState(null);

  // New RFQ Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('Units');
  const [deadline, setDeadline] = useState('');
  const [selectedVendors, setSelectedVendors] = useState([]);

  // Fetch RFQs list
  const { data: rfqsResponse, isLoading, isFetching } = useQuery({
    queryKey: ['rfqs', page, limit, search, filterStatus, sortBy, sortOrder, user?.rolename],
    queryFn: async () => {
      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
        search
      };
      if (filterStatus) params.status = filterStatus;

      const res = await axios.get('http://localhost:5000/api/rfq', { params });
      return res.data;
    }
  });

  // Fetch single RFQ detail (if open)
  const { data: rfqDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['rfq-detail', selectedRfqId],
    queryFn: async () => {
      if (!selectedRfqId) return null;
      const res = await axios.get(`http://localhost:5000/api/rfq/${selectedRfqId}`);
      return res.data.data;
    },
    enabled: !!selectedRfqId
  });

  // Fetch approved vendors list for assigning
  const { data: vendorsResponse } = useQuery({
    queryKey: ['approved-vendors'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/vendor', {
        params: { limit: 100, status: 'Approved' }
      });
      return res.data.data;
    },
    enabled: isProcurementOfficer && createModalOpen
  });

  // Mutation: Create RFQ
  const createRfqMutation = useMutation({
    mutationFn: (newRfq) => axios.post('http://localhost:5000/api/rfq', newRfq),
    onSuccess: () => {
      queryClient.invalidateQueries(['rfqs']);
      setCreateModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to create RFQ');
    }
  });

  // Mutation: Request RFQ Publish Approval
  const requestApprovalMutation = useMutation({
    mutationFn: (id) => axios.post(`http://localhost:5000/api/rfq/${id}/request-approval`),
    onSuccess: () => {
      queryClient.invalidateQueries(['rfqs']);
      queryClient.invalidateQueries(['rfq-detail', selectedRfqId]);
      alert('RFQ publish approval requested successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to request RFQ approval');
    }
  });

  // Mutation: Approve Quotation Offer (Procurement Officer)
  const officerApproveMutation = useMutation({
    mutationFn: (quotationId) => axios.post(`http://localhost:5000/api/quotation/${quotationId}/officer-approve`),
    onSuccess: () => {
      queryClient.invalidateQueries(['rfqs']);
      queryClient.invalidateQueries(['rfq-detail', selectedRfqId]);
      alert('Offer approved and sent to vendor successfully!');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to approve offer');
    }
  });

  // Mutation: Generate PO (Procurement Officer)
  const generatePoMutation = useMutation({
    mutationFn: (quotationId) => axios.post('http://localhost:5000/api/purchaseorder/generate', { quotationId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['rfqs']);
      queryClient.invalidateQueries(['rfq-detail', selectedRfqId]);
      alert('Purchase Order generated successfully!');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to generate Purchase Order');
    }
  });

  // Mutation: Close RFQ
  const closeRfqMutation = useMutation({
    mutationFn: (id) => axios.post(`http://localhost:5000/api/rfq/${id}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries(['rfqs']);
      queryClient.invalidateQueries(['rfq-detail', selectedRfqId]);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to close RFQ');
    }
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setQuantity(1);
    setUnit('Units');
    setDeadline('');
    setSelectedVendors([]);
  };

  const handleCreateRfq = (e) => {
    e.preventDefault();
    if (!title || !description || !deadline) {
      alert('Title, Description, and Deadline are required.');
      return;
    }
    createRfqMutation.mutate({
      title,
      description,
      category,
      quantity: parseInt(quantity, 10),
      unit,
      deadline,
      assignedVendors: selectedVendors
    });
  };

  const toggleVendorSelection = (vendorId) => {
    setSelectedVendors(prev =>
      prev.includes(vendorId) ? prev.filter(id => id !== vendorId) : [...prev, vendorId]
    );
  };

  const viewDetail = (id) => {
    setSelectedRfqId(id);
    setDetailModalOpen(true);
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Draft': return 'secondary';
      case 'Pending Approval': return 'warning';
      case 'Rejected': return 'danger';
      case 'Published': return 'primary';
      case 'Under Evaluation': return 'info';
      case 'Closed': return 'dark';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  // Columns definition
  const columns = [
    {
      key: 'rfqnumber',
      header: 'RFQ Number',
      sortable: true,
      render: (row) => <span className="fw-semibold text-primary">{row.rfqnumber}</span>
    },
    { key: 'title', header: 'Title', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'quantity', header: 'Qty/Unit', render: (row) => `${row.quantity} ${row.unit || 'Units'}` },
    { key: 'deadline', header: 'Deadline', render: (row) => new Date(row.deadline).toLocaleDateString() },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={getStatusBadgeVariant(row.status)}>
          {row.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Button variant="outline-primary" size="sm" onClick={() => viewDetail(row.id)}>
          <i className="bi bi-eye" /> View Details
        </Button>
      )
    }
  ];

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="Request for Quotations (RFQs)"
        breadcrumbs={[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'RFQs', link: '/rfqs' }
        ]}
        action={
          isProcurementOfficer && (
            <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
              <i className="bi bi-plus-lg me-1" /> Create RFQ
            </Button>
          )
        }
      />

      {/* Filter panel */}
      <FilterBar onClear={() => {
        setSearch('');
        setFilterStatus('');
        setPage(1);
      }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search RFQs, categories, descriptions..."
          style={{ maxWidth: '300px' }}
        />

        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="form-select form-select-sm"
          style={{ width: '180px', borderRadius: '8px', padding: '0.4rem 0.75rem' }}
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Published">Published</option>
          <option value="Under Evaluation">Under Evaluation</option>
          <option value="Closed">Closed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </FilterBar>

      {/* Data Table */}
      <BaseTable
        columns={columns}
        data={rfqsResponse?.data || []}
        loading={isLoading || isFetching}
        pagination={rfqsResponse?.meta || null}
        onPageChange={setPage}
        onLimitChange={setLimit}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(key, order) => {
          setSortBy(key);
          setSortOrder(order);
        }}
      />

      {/* Create RFQ Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New RFQ"
        size="lg"
      >
        <form onSubmit={handleCreateRfq}>
          <div className="row g-3">
            <div className="col-12">
              <Input
                label="RFQ Title"
                placeholder="e.g. Procurement of Laptop Batches"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <Input
                label="Category"
                placeholder="e.g. IT Equipment"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <Input
                label="Quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
              />
            </div>
            <div className="col-md-3">
              <Input
                label="Unit of Measure"
                placeholder="e.g. Box, Units, Pcs"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <Input
                label="Deadline Date"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>
            
            {/* Invite Suppliers Checkbox list */}
            <div className="col-12">
              <label className="form-label fw-semibold mb-2">Invite Vendor Suppliers</label>
              <div className="border rounded p-3" style={{ maxHeight: '180px', overflowY: 'auto', backgroundColor: '#fafafa' }}>
                {!vendorsResponse || vendorsResponse.length === 0 ? (
                  <p className="text-muted small mb-0">No approved vendors found. Register/Approve vendors first.</p>
                ) : (
                  <div className="row g-2">
                    {vendorsResponse.map((v) => (
                      <div className="col-sm-6" key={v.id}>
                        <Checkbox
                          id={`vendor-${v.id}`}
                          label={`${v.companyname} (${v.contactperson})`}
                          checked={selectedVendors.includes(v.id)}
                          onChange={() => toggleVendorSelection(v.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="col-12">
              <Textarea
                label="RFQ Description & Specifications"
                placeholder="Provide details about delivery instructions, quality, specifications..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="col-12 text-end mt-4">
              <button 
                type="button" 
                className="btn btn-outline-secondary me-2" 
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </button>
              <Button type="submit" variant="primary" loading={createRfqMutation.isPending}>
                Create RFQ
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* View RFQ Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); setSelectedRfqId(null); }}
        title={`RFQ Details: ${rfqDetail?.rfqnumber || ''}`}
        size="lg"
      >
        {detailLoading ? (
          <Loader text="Loading details..." />
        ) : rfqDetail ? (
          <div>
            <div className="d-flex justify-content-between align-items-start mb-4">
              <div>
                <h4 className="fw-bold mb-1">{rfqDetail.title}</h4>
                <div className="d-flex gap-2 align-items-center">
                  <Badge variant={getStatusBadgeVariant(rfqDetail.status)}>
                    {rfqDetail.status}
                  </Badge>
                  <span className="text-muted small">| Category: <strong>{rfqDetail.category || 'N/A'}</strong></span>
                </div>
              </div>
              
              {/* Actions based on RFQ status */}
              {isProcurementOfficer && (
                <div className="d-flex gap-2">
                  {rfqDetail.status === 'Draft' && (
                    <Button 
                      variant="primary" 
                      onClick={() => requestApprovalMutation.mutate(rfqDetail.id)}
                      loading={requestApprovalMutation.isPending}
                    >
                      <i className="bi bi-send-check me-1" /> Request Publish Approval
                    </Button>
                  )}
                  {rfqDetail.status === 'Published' && (
                    <Button 
                      variant="dark" 
                      onClick={() => closeRfqMutation.mutate(rfqDetail.id)}
                      loading={closeRfqMutation.isPending}
                    >
                      <i className="bi bi-x-circle-fill me-1" /> Close Bidding
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="row g-4 mb-4">
              <div className="col-md-6 border-end">
                <h6 className="fw-bold text-secondary text-uppercase small">Specifications</h6>
                <p className="mb-3 text-dark" style={{ whiteSpace: 'pre-wrap' }}>{rfqDetail.description}</p>
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold text-secondary text-uppercase small">Procurement Target</h6>
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
                  </tbody>
                </table>
              </div>
            </div>

            {/* Assigned Suppliers Panel */}
            <div className="mb-4">
              <h6 className="fw-bold text-secondary text-uppercase small mb-2">Invited Suppliers ({rfqDetail.assignedVendors?.length || 0})</h6>
              <div className="d-flex flex-wrap gap-2">
                {rfqDetail.assignedVendors?.map(v => (
                  <div key={v.id} className="border rounded py-2 px-3 bg-light d-flex align-items-center gap-2">
                    <i className="bi bi-shop text-primary" />
                    <span className="small fw-semibold">{v.companyname}</span>
                    <Badge variant={v.status === 'Approved' ? 'success' : 'warning'}>{v.rating} ★</Badge>
                  </div>
                ))}
                {(!rfqDetail.assignedVendors || rfqDetail.assignedVendors.length === 0) && (
                  <p className="text-muted small mb-0">No suppliers invited to this RFQ.</p>
                )}
              </div>
            </div>

            {/* Submitted Quotations list */}
            {isProcurementOfficer && (
              <div>
                <h6 className="fw-bold text-secondary text-uppercase small mb-2">Received Vendor Quotations ({rfqDetail.quotations?.length || 0})</h6>
                {rfqDetail.quotations && rfqDetail.quotations.length > 0 ? (
                  <div className="table-responsive border rounded bg-white">
                    <table className="table table-hover align-middle mb-0 small">
                      <thead className="table-light">
                        <tr>
                          <th>Vendor Supplier</th>
                          <th>Total Cost</th>
                          <th>Delivery (Days)</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rfqDetail.quotations.map(q => (
                          <tr key={q.id}>
                            <td className="fw-semibold">{q.companyname} (Rating: {q.vendorrating} ★)</td>
                            <td className="fw-bold text-success">${parseFloat(q.totalprice).toLocaleString()}</td>
                            <td>{q.deliverydays} days</td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <Badge variant={q.status === 'Accepted' ? 'success' : q.status === 'Rejected' ? 'danger' : 'warning'}>
                                  {q.status}
                                </Badge>
                              </div>
                            </td>
                            <td>
                              {q.status === 'Accepted' && (
                                q.purchaseorderid ? (
                                  <Badge variant="primary">
                                    PO Issued: {q.ponumber}
                                  </Badge>
                                ) : q.officerapproved ? (
                                  q.vendoraccepted ? (
                                    <Button 
                                      variant="primary" 
                                      size="sm"
                                      onClick={() => generatePoMutation.mutate(q.id)}
                                      loading={generatePoMutation.isPending}
                                    >
                                      <i className="bi bi-file-earmark-plus me-1" /> Generate PO
                                    </Button>
                                  ) : (
                                    <Badge variant="warning">
                                      Pending Vendor Acceptance
                                    </Badge>
                                  )
                                ) : (
                                  <Button 
                                    variant="success" 
                                    size="sm"
                                    onClick={() => officerApproveMutation.mutate(q.id)}
                                    loading={officerApproveMutation.isPending}
                                  >
                                    <i className="bi bi-check-circle me-1" /> Approve & Send Offer
                                  </Button>
                                )
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No quotations submitted by invited vendors yet.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-danger">Failed to load details.</p>
        )}
      </Modal>
    </div>
  );
};

export default RFQs;
