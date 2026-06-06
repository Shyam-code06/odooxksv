import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import PageHeader from '../common/components/PageHeader';
import Card from '../common/components/Card';
import BaseTable from '../common/components/Table/BaseTable';
import Badge from '../common/components/Badge';
import Loader from '../common/components/Loader';

const Reports = () => {
  const { data: spendData, isLoading: spendLoading } = useQuery({
    queryKey: ['report-spending'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/report/spending');
      return res.data.data;
    }
  });

  const { data: vendorData, isLoading: vendorLoading } = useQuery({
    queryKey: ['report-vendor-performance'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/report/vendor-performance');
      return res.data.data;
    }
  });

  const spendColumns = [
    {
      key: 'month',
      header: 'Month',
      render: (row) => <span className="fw-bold">{row.month}</span>
    },
    {
      key: 'total_spend',
      header: 'Total Spend',
      render: (row) => <span className="text-success fw-semibold">${parseFloat(row.total_spend).toLocaleString()}</span>
    }
  ];

  const vendorColumns = [
    {
      key: 'companyname',
      header: 'Vendor',
      render: (row) => <span className="fw-semibold text-dark">{row.companyname}</span>
    },
    {
      key: 'rating',
      header: 'Average Rating',
      render: (row) => (
        <div className="d-flex align-items-center gap-2">
          <Badge variant={row.rating >= 4 ? 'success' : row.rating >= 3 ? 'warning' : 'danger'}>
            {parseFloat(row.rating).toFixed(1)} ★
          </Badge>
          <div className="progress flex-grow-1" style={{ height: '6px', maxWidth: '100px' }}>
            <div 
              className={`progress-bar ${row.rating >= 4 ? 'bg-success' : row.rating >= 3 ? 'bg-warning' : 'bg-danger'}`} 
              style={{ width: `${(parseFloat(row.rating) / 5) * 100}%` }}
            />
          </div>
        </div>
      )
    },
    {
      key: 'total_pos',
      header: 'Total POs Awarded',
      render: (row) => row.total_pos
    },
    {
      key: 'total_spend',
      header: 'Total Spend on Vendor',
      render: (row) => <span className="fw-semibold">${parseFloat(row.total_spend).toLocaleString()}</span>
    }
  ];

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="Analytics & Reports"
        breadcrumbs={[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Reports', link: '/reports' }
        ]}
        action={
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <i className="bi bi-printer me-2" /> Print Reports
          </button>
        }
      />

      <div className="row g-4">
        {/* Spending Summary */}
        <div className="col-12 col-lg-5">
          <Card title="Monthly Spending Summary">
            <BaseTable 
              columns={spendColumns}
              data={spendData || []}
              loading={spendLoading}
            />
          </Card>
        </div>

        {/* Vendor Performance */}
        <div className="col-12 col-lg-7">
          <Card title="Vendor Performance Matrix">
            <BaseTable 
              columns={vendorColumns}
              data={vendorData || []}
              loading={vendorLoading}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;
