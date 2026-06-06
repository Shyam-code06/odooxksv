import React from 'react';
import Loader from '../Loader';
import EmptyState from '../EmptyState';

const BaseTable = ({
  columns = [],
  data = [],
  loading = false,
  pagination = null, // { page: 1, limit: 10, totalRecords: 0, totalPages: 1 }
  onPageChange,
  onLimitChange,
  sortBy = '',
  sortOrder = 'DESC',
  onSort,
  emptyTitle = 'No data available',
  emptyDescription = 'No records match your filters or search criteria.',
  emptyIcon = 'inbox',
  rowIdKey = 'id'
}) => {
  const handleSortClick = (col) => {
    if (!col.sortable || !onSort) return;
    
    const isCurrentSort = sortBy === col.key;
    const newOrder = isCurrentSort && sortOrder === 'ASC' ? 'DESC' : 'ASC';
    
    onSort(col.key, newOrder);
  };

  const renderSortIcon = (col) => {
    if (!col.sortable) return null;
    if (sortBy !== col.key) {
      return <i className="bi bi-arrow-down-up text-muted ms-1 small" />;
    }
    return sortOrder === 'ASC' 
      ? <i className="bi bi-arrow-up text-primary ms-1 small" />
      : <i className="bi bi-arrow-down text-primary ms-1 small" />;
  };

  return (
    <div className="card shadow-sm border-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
      <div className="table-responsive position-relative border-0" style={{ minHeight: loading ? '200px' : 'auto' }}>
        {loading && (
          <div className="position-absolute w-100 h-100 top-0 start-0 bg-white bg-opacity-75 d-flex align-items-center justify-content-center" style={{ zIndex: 5 }}>
            <Loader size="md" text="Refreshing records..." />
          </div>
        )}

        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr className="border-bottom border-light">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSortClick(col)}
                  className={`py-3 px-4 ${col.sortable ? 'cursor-pointer select-none text-primary-hover' : ''} ${col.headerClassName || ''}`}
                  style={{ 
                    cursor: col.sortable ? 'pointer' : 'default',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div className="d-flex align-items-center">
                    {col.header}
                    {renderSortIcon(col)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0 border-0">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    icon={emptyIcon}
                    className="border-0 rounded-0 py-5"
                  />
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr key={row[rowIdKey] || rowIdx} className="border-bottom border-secondary border-opacity-10">
                  {columns.map((col) => {
                    const cellVal = row[col.key];
                    return (
                      <td key={col.key} className={`py-3 px-4 ${col.className || ''}`}>
                        {col.render ? col.render(row, rowIdx) : cellVal !== null && cellVal !== undefined ? String(cellVal) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 0 && (
        <div className="card-footer bg-white border-top py-3 d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3">
          {/* Summary */}
          <div className="text-muted small">
            Showing <span className="fw-semibold text-dark">{Math.min(pagination.totalRecords, (pagination.page - 1) * pagination.limit + 1)}</span> to{' '}
            <span className="fw-semibold text-dark">{Math.min(pagination.totalRecords, pagination.page * pagination.limit)}</span> of{' '}
            <span className="fw-semibold text-dark">{pagination.totalRecords}</span> entries
          </div>

          <div className="d-flex align-items-center gap-3">
            {/* Page Limit Selector */}
            {onLimitChange && (
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small" style={{ whiteSpace: 'nowrap' }}>Per Page</span>
                <select
                  value={pagination.limit}
                  onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
                  className="form-select form-select-sm"
                  style={{ width: '70px', borderRadius: '6px' }}
                >
                  {[5, 10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Pagination Navigation */}
            {onPageChange && (
              <nav aria-label="Table navigation" className="mb-0">
                <ul className="pagination pagination-sm mb-0 gap-1">
                  <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link border rounded-2 p-2"
                      onClick={() => onPageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      aria-label="Previous"
                    >
                      <i className="bi bi-chevron-left" />
                    </button>
                  </li>

                  {/* Render page numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    // Center the active page around the active selection
                    let pageNum = pagination.page - 2 + i;
                    if (pagination.page <= 2) pageNum = i + 1;
                    if (pagination.page >= pagination.totalPages - 1) pageNum = pagination.totalPages - 4 + i;
                    
                    // Filter bounds
                    if (pageNum < 1 || pageNum > pagination.totalPages) return null;

                    return (
                      <li key={pageNum} className={`page-item ${pagination.page === pageNum ? 'active' : ''}`}>
                        <button
                          className={`page-link border rounded-2 px-3 py-2 ${pagination.page === pageNum ? 'bg-primary border-primary text-white' : 'text-dark bg-white'}`}
                          onClick={() => onPageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}

                  <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link border rounded-2 p-2"
                      onClick={() => onPageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      aria-label="Next"
                    >
                      <i className="bi bi-chevron-right" />
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseTable;
