import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import PageHeader from '../common/components/PageHeader';
import BaseTable from '../common/components/Table/BaseTable';
import FilterBar from '../common/components/FilterBar';
import SearchBar from '../common/components/SearchBar';
import Button from '../common/components/Button';
import Modal from '../common/components/Modal';

const AuditLogs = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [sortBy, setSortBy] = useState('createdat');
  const [sortOrder, setSortOrder] = useState('DESC');

  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonTitle, setJsonTitle] = useState('');
  const [jsonData, setJsonData] = useState(null);

  const { data: logsResponse, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', page, limit, search, filterModule, sortBy, sortOrder],
    queryFn: async () => {
      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
        search
      };
      if (filterModule) params.module = filterModule;

      const res = await axios.get('http://localhost:5000/api/auditlog', { params });
      return res.data;
    }
  });

  const openJsonViewer = (title, data) => {
    setJsonTitle(title);
    setJsonData(data);
    setJsonModalOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const columns = [
    {
      key: 'createdat',
      header: 'Timestamp',
      sortable: true,
      render: (row) => formatDate(row.createdat)
    },
    {
      key: 'username',
      header: 'Actor',
      sortable: false,
      render: (row) => row.username ? `${row.firstname} ${row.lastname} (${row.username})` : 'System'
    },
    { key: 'module', header: 'Module', sortable: true },
    { key: 'action', header: 'Action', sortable: true },

    {
      key: 'values',
      header: 'Audit Payload',
      render: (row) => {
        const hasOld = row.oldvalue && Object.keys(row.oldvalue).length > 0;
        const hasNew = row.newvalue && Object.keys(row.newvalue).length > 0;

        return (
          <div className="d-flex gap-2">
            {hasOld ? (
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => openJsonViewer(`Old State - Log #${row.id.substring(0, 8)}`, row.oldvalue)}
              >
                Old State
              </Button>
            ) : (
              <span className="text-muted small align-self-center">-</span>
            )}
            {hasNew ? (
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={() => openJsonViewer(`New State - Log #${row.id.substring(0, 8)}`, row.newvalue)}
              >
                New State
              </Button>
            ) : (
              <span className="text-muted small align-self-center">-</span>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="container-fluid p-0">
      <PageHeader 
        title="Audit Logs" 
        breadcrumbs={[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Activity Logs', link: '/audit-logs' }
        ]}
      />

      <FilterBar onClear={() => {
        setSearch('');
        setFilterModule('');
        setPage(1);
      }}>
        <SearchBar 
          value={search} 
          onChange={setSearch} 
          placeholder="Search action, module, or user..." 
          style={{ maxWidth: '300px' }}
        />

        <select
          value={filterModule}
          onChange={(e) => { setFilterModule(e.target.value); setPage(1); }}
          className="form-select form-select-sm"
          style={{ width: '180px', borderRadius: '8px', padding: '0.4rem 0.75rem' }}
        >
          <option value="">All Modules</option>
          <option value="auth">auth</option>
          <option value="user">user</option>
        </select>
      </FilterBar>

      <BaseTable
        columns={columns}
        data={logsResponse?.data || []}
        loading={isLoading || isFetching}
        pagination={logsResponse?.meta || null}
        onPageChange={setPage}
        onLimitChange={setLimit}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(key, order) => {
          setSortBy(key);
          setSortOrder(order);
        }}
        emptyTitle="No audit logs recorded"
        emptyDescription="System activities will populate here as administrators perform actions."
        emptyIcon="shield-shaded"
      />

      <Modal
        isOpen={jsonModalOpen}
        onClose={() => setJsonModalOpen(false)}
        title={jsonTitle}
        size="md"
      >
        <pre className="p-3 bg-light rounded text-start overflow-x-auto border" style={{ fontSize: '0.85rem', maxHeight: '400px' }}>
          {jsonData ? JSON.stringify(jsonData, null, 2) : 'No payload recorded'}
        </pre>
        <div className="d-flex justify-content-end mt-3 border-top pt-2">
          <Button variant="light" onClick={() => setJsonModalOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AuditLogs;
