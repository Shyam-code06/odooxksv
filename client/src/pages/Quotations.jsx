import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import PageHeader from '../common/components/PageHeader';
import Card from '../common/components/Card';
import Badge from '../common/components/Badge';
import FilterBar from '../common/components/FilterBar';
import BaseTable from '../common/components/Table/BaseTable';
import Button from '../common/components/Button';
import Modal from '../common/components/Modal';
import Input from '../common/components/Input';
import Textarea from '../common/components/Textarea';
import ConfirmDialog from '../common/components/ConfirmDialog';
import Loader from '../common/components/Loader';
import { useAuth } from '../common/contexts/AuthContext';

const Quotations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isVendor = user?.rolename === 'Vendor';
  const isProcurementOfficer = user?.rolename === 'ProcurementOfficer' || user?.rolename === 'Admin';

  // Vendor Portal States
  const [selectedRfqForSubmit, setSelectedRfqForSubmit] = useState(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [deliveryDays, setDeliveryDays] = useState(7);
  const [notes, setNotes] = useState('');
  const [quoteItems, setQuoteItems] = useState([{ itemname: '', quantity: 1, unit: 'Units', unitprice: 0 }]);

  // Procurement Officer States
  const [selectedRfqId, setSelectedRfqId] = useState('');
  const [approvalConfirmOpen, setApprovalConfirmOpen] = useState(false);
  const [selectedQuotationForApproval, setSelectedQuotationForApproval] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');

  // 1. Fetch active RFQs (for selector or listing)
  const { data: rfqsList } = useQuery({
    queryKey: ['rfqs-for-quotes', user?.rolename],
    queryFn: async () => {
      // Vendors see RFQs assigned to them, POs see all published/evaluated RFQs
      const res = await axios.get('http://localhost:5000/api/rfq', {
        params: { limit: 100 }
      });
      return res.data.data;
    }
  });

  // 2. Fetch quotations (for general listing)
  const { data: quotesResponse, isLoading } = useQuery({
    queryKey: ['quotations-list', user?.rolename],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/quotation', {
        params: { limit: 100 }
      });
      return res.data.data;
    }
  });

  // 3. Fetch comparison data (for selected RFQ)
  const { data: comparisonData, isLoading: comparisonLoading } = useQuery({
    queryKey: ['quotation-comparison', selectedRfqId],
    queryFn: async () => {
      if (!selectedRfqId) return null;
      const res = await axios.get(`http://localhost:5000/api/quotation/compare/${selectedRfqId}`);
      return res.data.data;
    },
    enabled: !!selectedRfqId && isProcurementOfficer
  });

  // 4. Fetch managers list for approval routing
  const { data: managersList } = useQuery({
    queryKey: ['managers-list'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/user', {
        params: { limit: 100 }
      });
      // Filter by role Manager on client
      return res.data.data.filter(u => u.rolename === 'Manager');
    },
    enabled: isProcurementOfficer && approvalConfirmOpen
  });

  // Mutation: Submit Quotation (Vendor)
  const submitQuoteMutation = useMutation({
    mutationFn: (newQuote) => axios.post('http://localhost:5000/api/quotation', newQuote),
    onSuccess: () => {
      queryClient.invalidateQueries(['quotations-list']);
      setSubmitModalOpen(false);
      resetQuoteForm();
      alert('Quotation submitted successfully!');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to submit quotation');
    }
  });

  // Mutation: Submit chosen Quotation for Manager Approval (Procurement Officer)
  const submitApprovalMutation = useMutation({
    mutationFn: (approvalReq) => axios.post('http://localhost:5000/api/approval/submit', approvalReq),
    onSuccess: () => {
      queryClient.invalidateQueries(['quotations-list']);
      queryClient.invalidateQueries(['quotation-comparison', selectedRfqId]);
      queryClient.invalidateQueries(['rfqs-for-quotes']);
      setApprovalConfirmOpen(false);
      setSelectedQuotationForApproval(null);
      alert('Quotation submitted for Manager approval successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to submit for approval');
    }
  });

  const resetQuoteForm = () => {
    setDeliveryDays(7);
    setNotes('');
    setQuoteItems([{ itemname: '', quantity: 1, unit: 'Units', unitprice: 0 }]);
  };

  const handleAddQuoteItem = () => {
    setQuoteItems([...quoteItems, { itemname: '', quantity: 1, unit: 'Units', unitprice: 0 }]);
  };

  const handleRemoveQuoteItem = (idx) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== idx));
  };

  const handleUpdateQuoteItem = (idx, field, val) => {
    const updated = [...quoteItems];
    updated[idx][field] = val;
    setQuoteItems(updated);
  };

  const handleSubmitQuote = (e) => {
    e.preventDefault();
    if (!selectedRfqForSubmit) return;

    // Validate items
    const invalid = quoteItems.some(item => !item.itemname || item.unitprice <= 0 || item.quantity <= 0);
    if (invalid) {
      alert('Please fill out all item names, quantity > 0, and unit price > 0.');
      return;
    }

    const totalPrice = quoteItems.reduce((sum, item) => sum + (item.quantity * item.unitprice), 0);

    submitQuoteMutation.mutate({
      rfqid: selectedRfqForSubmit.id,
      totalprice: totalPrice,
      deliverydays: parseInt(deliveryDays, 10),
      notes,
      items: quoteItems
    });
  };

  const openApprovalConfirm = (quote) => {
    setSelectedQuotationForApproval(quote);
    setApprovalConfirmOpen(true);
  };

  const handleConfirmApproval = () => {
    if (!selectedQuotationForApproval || !selectedRfqId) return;
    submitApprovalMutation.mutate({
      rfqId: selectedRfqId,
      quotationId: selectedQuotationForApproval.id,
      approverId: selectedManagerId || undefined
    });
  };

  // Vendor columns: RFQs they can bid on
  const rfqColumns = [
    {
      key: 'rfqnumber',
      header: 'RFQ Number',
      render: (row) => <span className="fw-semibold text-primary">{row.rfqnumber}</span>
    },
    { key: 'title', header: 'Title' },
    { key: 'category', header: 'Category' },
    { key: 'quantity', header: 'Target Qty', render: (row) => `${row.quantity} ${row.unit || 'Units'}` },
    { key: 'deadline', header: 'Deadline', render: (row) => new Date(row.deadline).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const isClosed = new Date(row.deadline) < new Date();
        return (
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={() => { setSelectedRfqForSubmit(row); setSubmitModalOpen(true); }}
            disabled={isClosed}
          >
            <i className="bi bi-file-earmark-plus me-1" /> {isClosed ? 'Deadline Passed' : 'Submit Quotation'}
          </Button>
        );
      }
    }
  ];

  // Vendor columns: submitted quotations list
  const quotationColumns = [
    {
      key: 'rfqtitle',
      header: 'RFQ Target',
      render: (row) => <span className="fw-semibold text-dark">{row.rfqtitle || 'RFQ Reference'}</span>
    },
    { key: 'totalprice', header: 'Total Price', render: (row) => <span className="fw-bold text-success">${parseFloat(row.totalprice).toLocaleString()}</span> },
    { key: 'deliverydays', header: 'Delivery Timeline', render: (row) => `${row.deliverydays} days` },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        let variant = 'warning';
        if (row.status === 'Accepted') variant = 'success';
        if (row.status === 'Rejected') variant = 'danger';
        if (row.status === 'Reviewed') variant = 'info';
        return <Badge variant={variant}>{row.status}</Badge>;
      }
    },
    { key: 'createdat', header: 'Submitted On', render: (row) => new Date(row.createdat).toLocaleDateString() }
  ];

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="Quotation Management & Comparison"
        breadcrumbs={[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Quotations', link: '/quotations' }
        ]}
      />

      {isVendor && (
        <div className="row g-4">
          {/* Active Invitations List */}
          <div className="col-12">
            <Card title="Active RFQ Bidding Invitations">
              <p className="text-muted small px-3 mb-3">You have been invited to submit quotations for the following active purchase requests. Check deadlines and submit before date.</p>
              <BaseTable
                columns={rfqColumns}
                data={rfqsList || []}
                loading={isLoading}
              />
            </Card>
          </div>

          {/* Submitted Quotations List */}
          <div className="col-12 mt-4">
            <Card title="Your Submitted Quotations History">
              <BaseTable
                columns={quotationColumns}
                data={quotesResponse || []}
                loading={isLoading}
              />
            </Card>
          </div>

          {/* Submit Quotation Modal */}
          <Modal
            isOpen={submitModalOpen}
            onClose={() => { setSubmitModalOpen(false); resetQuoteForm(); }}
            title={`Submit Quotation for: ${selectedRfqForSubmit?.title || ''}`}
            size="lg"
          >
            <form onSubmit={handleSubmitQuote}>
              <div className="row g-3">
                <div className="col-md-6">
                  <Input
                    label="RFQ Deadline Reference"
                    value={selectedRfqForSubmit ? new Date(selectedRfqForSubmit.deadline).toLocaleDateString() : ''}
                    disabled
                  />
                </div>
                <div className="col-md-6">
                  <Input
                    label="Guaranteed Delivery Timeline (Days)"
                    type="number"
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(e.target.value)}
                    min="1"
                    required
                  />
                </div>

                {/* Quotation Line Items Editor */}
                <div className="col-12 mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label fw-bold text-dark mb-0">Quotation Line Items</label>
                    <Button type="button" variant="outline-primary" size="sm" onClick={handleAddQuoteItem}>
                      <i className="bi bi-plus" /> Add Item Row
                    </Button>
                  </div>
                  <div className="border rounded bg-light p-3">
                    {quoteItems.map((item, idx) => (
                      <div className="row g-2 align-items-end mb-2" key={idx}>
                        <div className="col-sm-5">
                          <label className="form-label small text-muted mb-1">Item Name / Details</label>
                          <input 
                            type="text" 
                            className="form-control form-control-sm"
                            placeholder="e.g. Intel Core i7 Laptop Model X"
                            value={item.itemname}
                            onChange={(e) => handleUpdateQuoteItem(idx, 'itemname', e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-sm-2">
                          <label className="form-label small text-muted mb-1">Quantity</label>
                          <input 
                            type="number" 
                            className="form-control form-control-sm"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuoteItem(idx, 'quantity', parseInt(e.target.value, 10))}
                            min="1"
                            required
                          />
                        </div>
                        <div className="col-sm-2">
                          <label className="form-label small text-muted mb-1">Unit</label>
                          <input 
                            type="text" 
                            className="form-control form-control-sm"
                            placeholder="e.g. Unit"
                            value={item.unit}
                            onChange={(e) => handleUpdateQuoteItem(idx, 'unit', e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-sm-2">
                          <label className="form-label small text-muted mb-1">Unit Price ($)</label>
                          <input 
                            type="number" 
                            className="form-control form-control-sm"
                            step="0.01"
                            value={item.unitprice}
                            onChange={(e) => handleUpdateQuoteItem(idx, 'unitprice', parseFloat(e.target.value))}
                            min="0.01"
                            required
                          />
                        </div>
                        <div className="col-sm-1 text-center">
                          {quoteItems.length > 1 && (
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-danger border-0 p-1"
                              onClick={() => handleRemoveQuoteItem(idx)}
                            >
                              <i className="bi bi-trash" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="text-end fw-bold text-dark mt-3">
                      Estimated Subtotal Price: $
                      {quoteItems.reduce((sum, item) => sum + (item.quantity * (item.unitprice || 0)), 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="col-12 mt-3">
                  <Textarea
                    label="Quotation Remarks / Notes"
                    placeholder="Enter warranty policies, packaging notes, shipping costs inclusion details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="col-12 text-end mt-4">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary me-2" 
                    onClick={() => { setSubmitModalOpen(false); resetQuoteForm(); }}
                  >
                    Cancel
                  </button>
                  <Button type="submit" variant="primary" loading={submitQuoteMutation.isPending}>
                    Submit Quotation
                  </Button>
                </div>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {isProcurementOfficer && (
        <div className="row g-4">
          {/* Dropdown Selector */}
          <div className="col-12">
            <Card title="Select RFQ to Compare Quotations">
              <div className="p-3 bg-light rounded-3 d-flex align-items-center gap-3">
                <label className="fw-bold mb-0 text-secondary" style={{ width: '120px' }}>Active RFQ:</label>
                <select 
                  className="form-select"
                  value={selectedRfqId}
                  onChange={(e) => setSelectedRfqId(e.target.value)}
                >
                  <option value="">-- Select RFQ Target --</option>
                  {rfqsList?.filter(r => r.status === 'Published' || r.status === 'Under Evaluation').map(r => (
                    <option key={r.id} value={r.id}>
                      [{r.rfqnumber}] {r.title} ({r.status})
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          </div>

          {/* Comparison Matrix Area */}
          {selectedRfqId && (
            <div className="col-12 mt-4">
              {comparisonLoading ? (
                <Loader text="Generating comparison report..." />
              ) : comparisonData ? (
                <div>
                  {/* RFQ overview details */}
                  <div className="mb-4 p-3 rounded bg-white shadow-sm border border-secondary border-opacity-10">
                    <div className="row">
                      <div className="col-md-8">
                        <span className="small text-muted text-uppercase fw-semibold">Target Specifications</span>
                        <h4 className="fw-bold text-dark">{comparisonData.rfq.title}</h4>
                        <p className="mb-0 text-muted small">{comparisonData.rfq.description}</p>
                      </div>
                      <div className="col-md-4 text-md-end border-start">
                        <span className="small text-muted text-uppercase fw-semibold">Requested Scope</span>
                        <h5 className="fw-bold text-primary mt-1">{comparisonData.rfq.quantity} {comparisonData.rfq.unit || 'Units'}</h5>
                        <span className="small text-danger">Deadline: {new Date(comparisonData.rfq.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Highlights cards */}
                  {comparisonData.quotations.length > 0 && (
                    <div className="row g-3 mb-4">
                      {/* Price Highlight */}
                      <div className="col-md-4">
                        <div className="card border-success bg-success bg-opacity-10 h-100 p-3 shadow-sm">
                          <span className="small text-success fw-bold text-uppercase"><i className="bi bi-tag-fill me-1" /> Lowest Price Bid</span>
                          {comparisonData.quotations.map(q => {
                            if (q.id === comparisonData.recommendations.lowestPrice) {
                              return (
                                <div key={q.id} className="mt-2">
                                  <h4 className="fw-bold text-success mb-1">${parseFloat(q.totalprice).toLocaleString()}</h4>
                                  <span className="small text-dark fw-semibold">{q.companyname}</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>

                      {/* Delivery Highlight */}
                      <div className="col-md-4">
                        <div className="card border-info bg-info bg-opacity-10 h-100 p-3 shadow-sm">
                          <span className="small text-info fw-bold text-uppercase"><i className="bi bi-lightning-fill me-1" /> Fastest Delivery</span>
                          {comparisonData.quotations.map(q => {
                            if (q.id === comparisonData.recommendations.fastestDelivery) {
                              return (
                                <div key={q.id} className="mt-2">
                                  <h4 className="fw-bold text-info mb-1">{q.deliverydays} Days</h4>
                                  <span className="small text-dark fw-semibold">{q.companyname}</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>

                      {/* Rating Highlight */}
                      <div className="col-md-4">
                        <div className="card border-warning bg-warning bg-opacity-10 h-100 p-3 shadow-sm">
                          <span className="small text-warning-emphasis fw-bold text-uppercase"><i className="bi bi-star-fill me-1" /> Best Rated Supplier</span>
                          {comparisonData.quotations.map(q => {
                            if (q.id === comparisonData.recommendations.bestRating) {
                              return (
                                <div key={q.id} className="mt-2">
                                  <h4 className="fw-bold text-warning-emphasis mb-1">{q.vendorrating} ★ Rating</h4>
                                  <span className="small text-dark fw-semibold">{q.companyname}</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quotations Comparison Matrix Table */}
                  <Card title="Submitted Quotations Comparison Matrix">
                    {comparisonData.quotations.length === 0 ? (
                      <p className="text-muted small p-3 text-center mb-0">No vendor quotations received yet for this RFQ.</p>
                    ) : (
                      <div className="table-responsive border-0">
                        <table className="table table-hover align-middle mb-0">
                          <thead>
                            <tr className="border-bottom border-light text-secondary small">
                              <th>Supplier Vendor</th>
                              <th>Total Quote Cost</th>
                              <th>Delivery Timeline</th>
                              <th>Supplier Rating</th>
                              <th>Remarks / Notes</th>
                              <th>Current Status</th>
                              <th className="text-end">Approval Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparisonData.quotations.map((q) => {
                              const isLowest = q.id === comparisonData.recommendations.lowestPrice;
                              const isFastest = q.id === comparisonData.recommendations.fastestDelivery;
                              return (
                                <tr key={q.id} className="border-bottom border-secondary border-opacity-10">
                                  <td className="py-3 px-3">
                                    <div className="fw-semibold text-dark">{q.companyname}</div>
                                    <div className="small text-muted">{q.contactperson} | {q.email}</div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`fw-bold fs-6 ${isLowest ? 'text-success' : 'text-dark'}`}>
                                      ${parseFloat(q.totalprice).toLocaleString()}
                                    </span>
                                    {isLowest && <span className="badge bg-success ms-2 small">Lowest</span>}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`fw-semibold ${isFastest ? 'text-info' : 'text-dark'}`}>{q.deliverydays} Days</span>
                                    {isFastest && <span className="badge bg-info ms-2 small">Fastest</span>}
                                  </td>
                                  <td className="py-3 px-3">
                                    <Badge variant="primary">{q.vendorrating} ★</Badge>
                                  </td>
                                  <td className="py-3 px-3 text-muted small" style={{ maxWidth: '200px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {q.notes || '-'}
                                  </td>
                                  <td className="py-3 px-3">
                                    <Badge variant={q.status === 'Accepted' ? 'success' : q.status === 'Rejected' ? 'danger' : q.status === 'Reviewed' ? 'info' : 'warning'}>
                                      {q.status}
                                    </Badge>
                                  </td>
                                  <td className="py-3 px-3 text-end">
                                    {comparisonData.rfq.status === 'Published' && (
                                      <Button 
                                        variant="outline-success" 
                                        size="sm" 
                                        onClick={() => openApprovalConfirm(q)}
                                      >
                                        <i className="bi bi-shield-check me-1" /> Select & Submit
                                      </Button>
                                    )}
                                    {comparisonData.rfq.status === 'Under Evaluation' && q.status === 'Reviewed' && (
                                      <span className="text-info small fw-semibold">Pending Approval</span>
                                    )}
                                    {comparisonData.rfq.status === 'Completed' && q.status === 'Accepted' && (
                                      <span className="text-success small fw-semibold">Accepted (PO Issued)</span>
                                    )}
                                    {q.status === 'Rejected' && (
                                      <span className="text-muted small">-</span>
                                    )}
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
              ) : (
                <p className="text-center text-danger">Failed to generate report.</p>
              )}
            </div>
          )}

          {/* Manager Approval Modal */}
          {selectedQuotationForApproval && (
            <ConfirmDialog
              isOpen={approvalConfirmOpen}
              onClose={() => { setApprovalConfirmOpen(false); setSelectedQuotationForApproval(null); }}
              onConfirm={handleConfirmApproval}
              title="Submit Selected Quote for Manager Approval?"
              message={
                <div>
                  <p>Are you sure you want to select the quotation from <strong>{selectedQuotationForApproval.companyname}</strong> for <strong>${parseFloat(selectedQuotationForApproval.totalprice).toLocaleString()}</strong>?</p>
                  <p className="small text-muted mb-3">This action will change the RFQ status to "Under Evaluation" and wait for manager review.</p>
                  
                  {/* Manager Selector dropdown */}
                  <label className="form-label small fw-semibold text-dark">Assign to Manager/Approver:</label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                  >
                    <option value="">-- Auto Assign First Manager --</option>
                    {managersList?.map(mgr => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.firstname} {mgr.lastname} ({mgr.username})
                      </option>
                    ))}
                  </select>
                </div>
              }
              confirmText="Yes, Submit for Approval"
              isLoading={submitApprovalMutation.isPending}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Quotations;
