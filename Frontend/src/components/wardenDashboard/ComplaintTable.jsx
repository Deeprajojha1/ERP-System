import React, { useState, useMemo } from 'react';
import { Eye, Filter, Calendar } from 'lucide-react';
import ModernDatePicker from '../common/ModernDatePicker';

const formatDateForInput = (date = new Date()) => date.toISOString().slice(0, 10);
import StatusBadge from './StatusBadge';

const ComplaintTable = ({ complaints, onViewDetails }) => {
  const [statusFilter, setStatusFilter] = useState('All');
  const [issueTypeFilter, setIssueTypeFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filter complaints based on selected filters
  const filteredComplaints = useMemo(() => {
    let filtered = [...complaints];

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Issue type filter
    if (issueTypeFilter !== 'All') {
      filtered = filtered.filter((c) => c.issueType === issueTypeFilter);
    }

    // Date from filter
    if (dateFrom) {
      filtered = filtered.filter((c) => new Date(c.createdAt) >= new Date(dateFrom));
    }

    // Date to filter
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((c) => new Date(c.createdAt) <= endDate);
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [complaints, statusFilter, issueTypeFilter, dateFrom, dateTo]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setStatusFilter('All');
    setIssueTypeFilter('All');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-900">Complaint History</h3>
        </div>
        <span className="text-sm text-gray-600">{filteredComplaints.length} records</span>
      </div>

      {/* Filters Section */}
      <div className="mb-5 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="mb-1 block text-xs font-medium text-gray-600">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Issue Type Filter */}
          <div>
            <label htmlFor="issue-filter" className="mb-1 block text-xs font-medium text-gray-600">
              Issue Type
            </label>
            <select
              id="issue-filter"
              value={issueTypeFilter}
              onChange={(e) => setIssueTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Types</option>
              <option value="Electricity">Electricity</option>
              <option value="Water">Water</option>
              <option value="Furniture">Furniture</option>
              <option value="Cleanliness">Cleanliness</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label htmlFor="date-from" className="mb-1 block text-xs font-medium text-gray-600">
              From Date
            </label>
            <ModernDatePicker
              id="date-from"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={formatDateForInput()}
            />
          </div>

          {/* Date To */}
          <div>
            <label htmlFor="date-to" className="mb-1 block text-xs font-medium text-gray-600">
              To Date
            </label>
            <ModernDatePicker
              id="date-to"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              max={formatDateForInput()}
            />
          </div>
        </div>

        {/* Reset Filter Button */}
        {(statusFilter !== 'All' || issueTypeFilter !== 'All' || dateFrom || dateTo) && (
          <button
            onClick={handleResetFilters}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {filteredComplaints.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No complaints found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Complaint ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Issue Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Date Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredComplaints.map((complaint) => (
                <tr key={complaint.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <span className="font-medium text-gray-900">{complaint.id}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-gray-700">{complaint.issueType}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-gray-600">{formatDate(complaint.createdAt)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={complaint.status} />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => onViewDetails(complaint)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                      aria-label={`View details for complaint ${complaint.id}`}
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ComplaintTable;
