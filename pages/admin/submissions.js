import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { submissionsAPI, formsAPI } from '../../lib/api';

export default function Submissions() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchForms();
    fetchSubmissions();
  }, [router]);

  useEffect(() => {
    if (selectedFormId || selectedFormId === '') {
      fetchSubmissions();
    }
  }, [selectedFormId, pagination.page, search, dateFrom, dateTo, sortBy, sortOrder]);

  const fetchForms = async () => {
    try {
      const response = await formsAPI.getAll();
      setForms(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        router.push('/admin/login');
      }
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (selectedFormId) {
        params.formId = selectedFormId;
      }
      if (search) {
        params.search = search;
      }
      if (dateFrom) {
        params.dateFrom = dateFrom;
      }
      if (dateTo) {
        params.dateTo = dateTo;
      }
      if (sortBy) {
        params.sortBy = sortBy;
      }
      if (sortOrder) {
        params.sortOrder = sortOrder;
      }
      const response = await submissionsAPI.getAll(params);
      setSubmissions(response.data.submissions);
      setPagination(response.data.pagination);
    } catch (error) {
      if (error.response?.status === 401) {
        router.push('/admin/login');
      } else {
        setError('Failed to load submissions. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    // fetchSubmissions will be triggered by useEffect
  };

  const handleExportCSV = async () => {
    if (!selectedFormId) {
      alert('Please select a form to export');
      return;
    }

    setExporting(true);
    try {
      const response = await submissionsAPI.exportCSV(selectedFormId);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const form = forms.find(f => f._id === selectedFormId);
      const formName = form ? form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'form';
      a.download = `submissions_${formName}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Error exporting CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const formatAnswerValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <Layout isAdmin={true}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Submissions</h1>
            <p className="mt-1 text-sm text-gray-500">View and manage form submissions</p>
          </div>
          {selectedFormId && (
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="btn-primary whitespace-nowrap w-full sm:w-auto"
            >
              {exporting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </span>
              ) : (
                <>
                  <svg className="inline-block h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </>
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="card p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Form</label>
              <select
                value={selectedFormId}
                onChange={(e) => {
                  setSelectedFormId(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="input-field w-full"
              >
                <option value="">All Forms</option>
                {forms.map(form => (
                  <option key={form._id} value={form._id}>{form.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  handleFilterChange();
                }}
                placeholder="Search in answers..."
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  handleFilterChange();
                }}
                className="input-field w-full"
              >
                <option value="submittedAt">Submitted Date</option>
                <option value="createdAt">Created Date</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value);
                  handleFilterChange();
                }}
                className="input-field w-full"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  handleFilterChange();
                }}
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  handleFilterChange();
                }}
                className="input-field w-full"
              />
            </div>
          </div>

          {(search || dateFrom || dateTo || selectedFormId) && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => {
                  setSearch('');
                  setDateFrom('');
                  setDateTo('');
                  setSelectedFormId('');
                  setSortBy('submittedAt');
                  setSortOrder('desc');
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 sm:py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="card p-8 sm:p-12 text-center">
            <svg className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">No submissions found</h3>
            <p className="text-sm sm:text-base text-gray-500">
              {selectedFormId ? 'No submissions for this form yet.' : 'No submissions have been made yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
              {submissions.map((submission) => (
                <div key={submission._id} className="card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {submission.formId?.title || 'N/A'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(submission.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 pt-3 border-t border-gray-100">
                    {submission.answers.map((answer, idx) => (
                      <div key={idx} className="text-xs sm:text-sm">
                        <span className="font-medium text-gray-700">{answer.name}:</span>{' '}
                        <span className="text-gray-600">{formatAnswerValue(answer.value)}</span>
                      </div>
                    ))}
                  </div>
                  {submission.ip && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                      IP: {submission.ip}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answers</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {submissions.map((submission) => (
                      <tr key={submission._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {submission.formId?.title || 'N/A'}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(submission.submittedAt).toLocaleString()}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {submission.ip || '-'}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-500">
                          <div className="space-y-1 max-w-md">
                            {submission.answers.map((answer, idx) => (
                              <div key={idx}>
                                <span className="font-medium text-gray-700">{answer.name}:</span>{' '}
                                <span className="text-gray-600">{formatAnswerValue(answer.value)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {pagination.pages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
                <div className="text-sm text-gray-700">
                  Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700 px-2">
                    {pagination.page} / {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
