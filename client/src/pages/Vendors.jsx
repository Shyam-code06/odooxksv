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
import ConfirmDialog from '../common/components/ConfirmDialog';
import { useAuth } from '../common/contexts/AuthContext';

const Vendors = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdminOrManager = user?.rolename === 'Admin' || user?.rolename === 'Manager';

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdat');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Confirmation dialog state
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [targetStatus, setTargetStatus] = useState('');
  const [actionConfirmOpen, setActionConfirmOpen] = useState(false);

  // Query: Fetch vendors list from backend
  const { data: vendorsResponse, isLoading, isFetching } = useQuery({
    queryKey: ['vendors', page, limit, search, filterStatus, sortBy, sortOrder],
    queryFn: async () => {
      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
        search
      };
      if (filterStatus) params.status = filterStatus;

      const res = await axios.get('http://localhost:5000/api/vendor', { params });
      return res.data;
    }
  });

  // Mutation: Update vendor status (Approve / Reject)
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => axios.put(`http://localhost:5000/api/vendor/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['vendors']);
      setActionConfirmOpen(false);
      setSelectedVendor(null);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  });

  const triggerAction = (vendor, status) => {
    setSelectedVendor(vendor);
    setTargetStatus(status);
    setActionConfirmOpen(true);
  };

  const confirmStatusChange = () => {
    if (selectedVendor && targetStatus) {
      updateStatusMutation.mutate({ id: selectedVendor.id, status: targetStatus });
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Pending': return 'warning';
      case 'Rejected': return 'danger';
      case 'Suspended': return 'dark';
      default: return 'secondary';
    }
  };

  // Define Table Columns
  const tableColumns = [
    {
      key: 'companyname',
      header: 'Company Name',
      sortable: true,
      render: (row) => <span className="fw-semibold text-dark">{row.companyname}</span>
    },
    { key: 'contactperson', header: 'Contact Person', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'phone', header: 'Phone', sortable: false },
    {
      key: 'taxdetails',
      header: 'GSTIN / PAN',
      render: (row) => (
        <div className="small text-muted">
          <div>GST: <span className="text-dark">{row.gstnumber || 'N/A'}</span></div>
          <div>PAN: <span className="text-dark">{row.pannumber || 'N/A'}</span></div>
        </div>
      )
    },
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
      render: (row) => {
        if (!isAdminOrManager) return <span className="text-muted small">No Permissions</span>;
        
        if (row.status === 'Pending') {
          return (
            <div className="d-flex align-items-center gap-2">
              <Button 
                variant="outline-success" 
                size="sm" 
                onClick={() => triggerAction(row, 'Approved')}
              >
                <i className="bi bi-check-lg" /> Approve
              </Button>
              <Button 
                variant="outline-danger" 
                size="sm" 
                onClick={() => triggerAction(row, 'Rejected')}
              >
                <i className="bi bi-x-lg" /> Reject
              </Button>
            </div>
          );
        }
        
        if (row.status === 'Approved') {
          return (
            <Button 
              variant="outline-dark" 
              size="sm" 
              onClick={() => triggerAction(row, 'Suspended')}
            >
              <i className="bi bi-slash-circle" /> Suspend
            </Button>
          );
        }

        if (row.status === 'Suspended') {
          return (
            <Button 
              variant="outline-success" 
              size="sm" 
              onClick={() => triggerAction(row, 'Approved')}
            >
              <i className="bi bi-arrow-counterclockwise" /> Reactivate
            </Button>
          );
        }

        return <span className="text-muted small">-</span>;
      }
    }
  ];

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="Vendor Management"
        breadcrumbs={[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Vendors', link: '/vendors' }
        ]}
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
          placeholder="Search company, contact, email..."
          style={{ maxWidth: '280px' }}
        />
        
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="form-select form-select-sm"
          style={{ width: '160px', borderRadius: '8px', padding: '0.4rem 0.75rem' }}
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Suspended">Suspended</option>
        </select>
      </FilterBar>

      {/* Data Table */}
      <BaseTable
        columns={tableColumns}
        data={vendorsResponse?.data || []}
        loading={isLoading || isFetching}
        pagination={vendorsResponse?.meta || null}
        onPageChange={setPage}
        onLimitChange={setLimit}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(key, order) => {
          setSortBy(key);
          setSortOrder(order);
        }}
      />

      {/* Action Decision dialog */}
      {selectedVendor && (
        <ConfirmDialog
          isOpen={actionConfirmOpen}
          onClose={() => { setActionConfirmOpen(false); setSelectedVendor(null); }}
          onConfirm={confirmStatusChange}
          title={`${targetStatus === 'Approved' ? 'Approve' : targetStatus === 'Rejected' ? 'Reject' : 'Suspend'} Vendor?`}
          message={`Are you sure you want to change the profile status of "${selectedVendor.companyname}" to "${targetStatus}"?`}
          confirmText={`Yes, ${targetStatus}`}
          isDanger={targetStatus === 'Rejected' || targetStatus === 'Suspended'}
          isLoading={updateStatusMutation.isPending}
        />
      )}
    </div>
  );
};

export default Vendors;
