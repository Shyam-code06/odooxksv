import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import PageHeader from '../common/components/PageHeader';
import Card from '../common/components/Card';
import Badge from '../common/components/Badge';
import BaseTable from '../common/components/Table/BaseTable';
import Button from '../common/components/Button';
import Modal from '../common/components/Modal';
import Loader from '../common/components/Loader';
import { useAuth } from '../common/contexts/AuthContext';

const Invoices = () => {
  const { user } = useAuth();

  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // 1. Fetch Invoices list
  const { data: invoiceResponse, isLoading, isFetching } = useQuery({
    queryKey: ['invoices-list', user?.rolename],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/invoice');
      return res.data;
    }
  });

  // 2. Fetch single invoice details
  const { data: invoiceDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['invoice-detail', selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) return null;
      const res = await axios.get(`http://localhost:5000/api/invoice/${selectedInvoiceId}`);
      return res.data.data;
    },
    enabled: !!selectedInvoiceId
  });

  const viewDetail = (id) => {
    setSelectedInvoiceId(id);
    setDetailModalOpen(true);
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Paid': return 'success';
      case 'Unpaid': return 'warning';
      case 'Partially Paid': return 'info';
      case 'Overdue': return 'danger';
      case 'Cancelled': return 'dark';
      default: return 'secondary';
    }
  };

  const columns = [
    {
      key: 'invoicenumber',
      header: 'Invoice Number',
      render: (row) => <span className="fw-semibold text-primary">{row.invoicenumber}</span>
    },
    { key: 'ponumber', header: 'PO Reference', render: (row) => row.ponumber || 'N/A' },
    { key: 'companyname', header: 'Supplier Vendor' },
    { key: 'subtotal', header: 'Subtotal', render: (row) => `$${parseFloat(row.subtotal).toLocaleString()}` },
    { key: 'totalamount', header: 'Total (inc. GST)', render: (row) => <span className="fw-bold text-dark">${parseFloat(row.totalamount).toLocaleString()}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={getStatusBadgeVariant(row.status)}>{row.status}</Badge>
    },
    { key: 'duedate', header: 'Due Date', render: (row) => new Date(row.duedate).toLocaleDateString() },
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
        title="Invoices & Payments"
        breadcrumbs={[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Invoices', link: '/invoices' }
        ]}
      />

      <Card title="Supplier Invoices">
        <BaseTable
          columns={columns}
          data={invoiceResponse?.data || []}
          loading={isLoading || isFetching}
        />
      </Card>

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); setSelectedInvoiceId(null); }}
        title={`Invoice Receipt: ${invoiceDetail?.invoicenumber || ''}`}
        size="lg"
      >
        {detailLoading ? (
          <Loader text="Loading invoice details..." />
        ) : invoiceDetail ? (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <span className="small text-muted text-uppercase fw-semibold">Billing Status</span>
                <div>
                  <Badge variant={getStatusBadgeVariant(invoiceDetail.status)}>{invoiceDetail.status}</Badge>
                </div>
              </div>
              <div className="text-end">
                <span className="small text-muted text-uppercase fw-semibold d-block">PO Reference</span>
                <span className="fw-bold text-dark">{invoiceDetail.ponumber}</span>
              </div>
            </div>

            {/* Vendor billing details */}
            <div className="row g-3 mb-4 p-3 bg-light rounded">
              <div className="col-sm-6">
                <span className="text-secondary small fw-bold text-uppercase">Billed By (Vendor)</span>
                <div className="fw-bold text-dark">{invoiceDetail.companyname}</div>
                <div className="small text-muted">{invoiceDetail.vendoraddress}</div>
                <div className="small text-muted">{invoiceDetail.vendoremail} | {invoiceDetail.vendorphone}</div>
              </div>
              <div className="col-sm-6 text-sm-end">
                <span className="text-secondary small fw-bold text-uppercase">Payment Terms</span>
                <div>Issued On: <strong>{new Date(invoiceDetail.createdat).toLocaleDateString()}</strong></div>
                <div>Due Date: <strong className="text-danger">{new Date(invoiceDetail.duedate).toLocaleDateString()}</strong></div>
              </div>
            </div>

            {/* Invoice Line items */}
            <h6 className="fw-bold mb-2">Invoice Line Items</h6>
            <div className="table-responsive border rounded mb-4">
              <table className="table table-sm table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Item Name</th>
                    <th>Qty</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">GST Rate</th>
                    <th className="text-end">GST Amount</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceDetail.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="fw-semibold">{item.itemname}</td>
                      <td>{item.quantity || 1}</td>
                      <td className="text-end">${parseFloat(item.unitprice).toLocaleString()}</td>
                      <td className="text-end">{item.taxrate}%</td>
                      <td className="text-end">${parseFloat(item.taxamount).toLocaleString()}</td>
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
                      <td className="text-end py-2">${parseFloat(invoiceDetail.subtotal).toLocaleString()}</td>
                    </tr>
                    <tr className="border-bottom">
                      <td className="text-muted py-2">Total GST Tax:</td>
                      <td className="text-end py-2">${parseFloat(invoiceDetail.taxamount).toLocaleString()}</td>
                    </tr>
                    <tr className="fw-bold fs-6">
                      <td className="py-2 text-dark">Invoice Total:</td>
                      <td className="text-end py-2 text-primary">${parseFloat(invoiceDetail.totalamount).toLocaleString()}</td>
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

export default Invoices;
