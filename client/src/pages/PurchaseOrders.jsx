import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import PageHeader from '../common/components/PageHeader';
import Card from '../common/components/Card';
import Badge from '../common/components/Badge';
import BaseTable from '../common/components/Table/BaseTable';
import Button from '../common/components/Button';
import Modal from '../common/components/Modal';
import Loader from '../common/components/Loader';
import { useAuth } from '../common/contexts/AuthContext';
import FilterBar from '../common/components/FilterBar';
import SearchBar from '../common/components/SearchBar';

const PurchaseOrders = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isVendor = user?.rolename === 'Vendor';
  const isProcurementOfficer = user?.rolename === 'ProcurementOfficer' || user?.rolename === 'Admin';

  const [selectedPoId, setSelectedPoId] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdat');
  const [sortOrder, setSortOrder] = useState('DESC');

  // 1. Fetch Purchase Orders
  const { data: poResponse, isLoading, isFetching } = useQuery({
    queryKey: ['purchase-orders', page, limit, search, sortBy, sortOrder],
    queryFn: async () => {
      const params = {
        page,
        limit,
        search,
        sortBy,
        sortOrder
      };
      const res = await axios.get('http://localhost:5000/api/purchaseorder', { params });
      return res.data;
    }
  });

  // 2. Fetch single PO detail
  const { data: poDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['po-detail', selectedPoId],
    queryFn: async () => {
      if (!selectedPoId) return null;
      const res = await axios.get(`http://localhost:5000/api/purchaseorder/${selectedPoId}`);
      return res.data.data;
    },
    enabled: !!selectedPoId
  });

  // Mutation: Generate Invoice from PO
  const createInvoiceMutation = useMutation({
    mutationFn: (poId) => axios.post('http://localhost:5000/api/invoice', { purchaseorderid: poId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['purchase-orders']);
      const emailText = poDetail?.vendoremail ? ` to ${poDetail.vendoremail}` : '';
      setDetailModalOpen(false);
      setSelectedPoId(null);
      alert(`Invoice generated successfully and sent${emailText} successfully!`);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to generate invoice');
    }
  });

  // Mutation: Update PO Status (Accept, Reject, Deliver)
  const updatePoStatusMutation = useMutation({
    mutationFn: ({ poId, status }) => axios.put(`http://localhost:5000/api/purchaseorder/${poId}`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['purchase-orders']);
      queryClient.invalidateQueries(['po-detail', selectedPoId]);
      alert(`Purchase Order status updated to ${variables.status} successfully!`);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to update Purchase Order status');
    }
  });

  const viewDetail = (id) => {
    setSelectedPoId(id);
    setDetailModalOpen(true);
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Issued': return 'primary';
      case 'Pending Approval': return 'warning';
      case 'Draft': return 'secondary';
      case 'Acknowledged': return 'info';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const columns = [
    {
      key: 'ponumber',
      header: 'PO Number',
      sortable: true,
      render: (row) => <span className="fw-semibold text-primary">{row.ponumber}</span>
    },
    { key: 'companyname', header: 'Vendor Supplier', sortable: false },
    { key: 'subtotal', header: 'Subtotal', sortable: true, render: (row) => `$${parseFloat(row.subtotal).toLocaleString()}` },
    { key: 'totalamount', header: 'Total (inc. GST)', sortable: true, render: (row) => <span className="fw-bold text-dark">${parseFloat(row.totalamount).toLocaleString()}</span> },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <Badge variant={getStatusBadgeVariant(row.status)}>{row.status}</Badge>
    },
    { key: 'createdat', header: 'Issued Date', sortable: true, render: (row) => new Date(row.createdat).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Button variant="outline-primary" size="sm" onClick={() => viewDetail(row.id)}>
          <i className="bi bi-eye" /> View PO
        </Button>
      )
    }
  ];

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="Purchase Orders"
        breadcrumbs={[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Purchase Orders', link: '/purchase-orders' }
        ]}
      />

      <FilterBar onClear={() => {
        setSearch('');
        setPage(1);
      }}>
        <SearchBar
          value={search}
          onChange={(val) => { setSearch(val); setPage(1); }}
          placeholder="Search PO Number, Vendor..."
          style={{ maxWidth: '280px' }}
        />
      </FilterBar>

      <Card title="Issued Purchase Orders">
        <BaseTable
          columns={columns}
          data={poResponse?.data || []}
          loading={isLoading || isFetching}
          pagination={poResponse?.meta || null}
          onPageChange={setPage}
          onLimitChange={setLimit}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(key, order) => {
            setSortBy(key);
            setSortOrder(order);
          }}
        />
      </Card>

      {/* PO Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); setSelectedPoId(null); }}
        title={`Purchase Order: ${poDetail?.ponumber || ''}`}
        size="lg"
      >
        {detailLoading ? (
          <Loader text="Loading PO details..." />
        ) : poDetail ? (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <span className="small text-muted text-uppercase fw-semibold">Status</span>
                <div>
                  <Badge variant={getStatusBadgeVariant(poDetail.status)}>{poDetail.status}</Badge>
                </div>
              </div>
              
              <div className="d-flex gap-2">
                {/* Vendor Actions: Accept / Reject */}
                {isVendor && poDetail.status === 'Issued' && (
                  <>
                    <Button 
                      variant="success" 
                      onClick={() => updatePoStatusMutation.mutate({ poId: poDetail.id, status: 'Acknowledged' })}
                      loading={updatePoStatusMutation.isPending}
                    >
                      <i className="bi bi-check-circle me-1" /> Accept Order
                    </Button>
                    <Button 
                      variant="danger" 
                      onClick={() => updatePoStatusMutation.mutate({ poId: poDetail.id, status: 'Cancelled' })}
                      loading={updatePoStatusMutation.isPending}
                    >
                      <i className="bi bi-x-circle me-1" /> Reject Order
                    </Button>
                  </>
                )}

                {/* Procurement Officer Actions: Delivery Verification */}
                {isProcurementOfficer && poDetail.status === 'Acknowledged' && (
                  <Button 
                    variant="primary" 
                    onClick={() => updatePoStatusMutation.mutate({ poId: poDetail.id, status: 'Completed' })}
                    loading={updatePoStatusMutation.isPending}
                  >
                    <i className="bi bi-truck me-1" /> Verify & Mark Delivered
                  </Button>
                )}

                {/* Procurement Officer Actions: Generate Invoice */}
                {isProcurementOfficer && poDetail.status === 'Completed' && (
                  poDetail.invoiceid ? (
                    <Badge variant="success">
                      <i className="bi bi-file-earmark-check me-1" /> Invoice Issued
                    </Badge>
                  ) : (
                    <Button 
                      variant="primary" 
                      onClick={() => createInvoiceMutation.mutate(poDetail.id)}
                      loading={createInvoiceMutation.isPending}
                    >
                      <i className="bi bi-file-earmark-plus me-1" /> Generate Invoice
                    </Button>
                  )
                )}


              </div>
            </div>

            {/* Vendor & Client info */}
            <div className="row g-3 mb-4 p-3 bg-light rounded">
              <div className="col-sm-6">
                <span className="text-secondary small fw-bold text-uppercase">Supplier Vendor</span>
                <div className="fw-bold text-dark">{poDetail.companyname}</div>
                <div className="small text-muted">{poDetail.vendoraddress}</div>
                <div className="small text-muted">{poDetail.vendoremail} | {poDetail.vendorphone}</div>
              </div>
              <div className="col-sm-6 text-sm-end">
                <span className="text-secondary small fw-bold text-uppercase">Delivery Target</span>
                <div>Issued On: <strong>{new Date(poDetail.createdat).toLocaleDateString()}</strong></div>
                <div>Payment Terms: <strong>NET 30 Days</strong></div>
              </div>
            </div>

            {/* Line Items Table */}
            <h6 className="fw-bold mb-2">PO Line Items</h6>
            <div className="table-responsive border rounded mb-4">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Item Name</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {poDetail.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="fw-semibold">{item.itemname}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit || 'Units'}</td>
                      <td className="text-end">${parseFloat(item.unitprice).toLocaleString()}</td>
                      <td className="text-end fw-bold">${parseFloat(item.totalprice).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial summary */}
            <div className="row justify-content-end">
              <div className="col-md-5">
                <table className="table table-sm table-borderless small mb-0">
                  <tbody>
                    <tr className="border-bottom">
                      <td className="text-muted py-2">Subtotal:</td>
                      <td className="text-end py-2">${parseFloat(poDetail.subtotal).toLocaleString()}</td>
                    </tr>
                    <tr className="border-bottom">
                      <td className="text-muted py-2">GST (18%):</td>
                      <td className="text-end py-2">${parseFloat(poDetail.taxamount).toLocaleString()}</td>
                    </tr>
                    <tr className="fw-bold fs-6">
                      <td className="py-2 text-dark">Total Amount:</td>
                      <td className="text-end py-2 text-primary">${parseFloat(poDetail.totalamount).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-danger">Failed to load details.</p>
        )}
      </Modal>
    </div>
  );
};

export default PurchaseOrders;
