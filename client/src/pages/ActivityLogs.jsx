import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import PageHeader from '../common/components/PageHeader';
import Card from '../common/components/Card';
import BaseTable from '../common/components/Table/BaseTable';
import Badge from '../common/components/Badge';
import Input from '../common/components/Input';

const ActivityLogs = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Optional: Add debounce for search if preferred
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', page, debouncedSearch],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/auditlog', {
        params: { page, limit: 15, search: debouncedSearch }
      });
      return res.data.data;
    }
  });

  const columns = [
    {
      key: 'createdat',
      header: 'Timestamp',
      render: (row) => new Date(row.createdat).toLocaleString()
    },
    {
      key: 'user',
      header: 'User',
      render: (row) => row.username ? `${row.firstname} ${row.lastname} (${row.username})` : 'System'
    },
    {
      key: 'module',
      header: 'Module',
      render: (row) => <Badge variant="info">{row.module}</Badge>
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => <span className="fw-semibold text-dark">{row.action}</span>
    },
    {
      key: 'details',
      header: 'Payload / Details',
      render: (row) => {
        const payload = row.newvalue || row.oldvalue;
        if (!payload) return <span className="text-muted small">-</span>;
        
        // Show truncated payload
        const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
        return (
          <div className="small text-muted" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {str}
          </div>
        );
      }
    }
  ];

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="System Activity Logs"
        breadcrumbs={[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Activity Logs', link: '/activity-logs' }
        ]}
      />

      <Card title="Audit Trail">
        <div className="px-3 pb-3">
          <Input 
            placeholder="Search by action, module, or username..." 
            value={search}
            onChange={setSearch}
          />
        </div>
        
        <BaseTable
          columns={columns}
          data={data?.records || []}
          loading={isLoading}
          pagination={{
            page: data?.pagination?.page || 1,
            limit: data?.pagination?.limit || 15,
            total: data?.pagination?.totalRecords || 0,
            totalPages: data?.pagination?.totalPages || 1
          }}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
};

export default ActivityLogs;
