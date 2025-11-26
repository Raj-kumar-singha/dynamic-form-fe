import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { formsAPI } from '../../../lib/api';

export default function FormsList() {
  const router = useRouter();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchForms();
  }, [router]);

  const fetchForms = async () => {
    try {
      setError('');
      const response = await formsAPI.getAll();
      setForms(response.data);
    } catch (error) {
      console.error('Error fetching forms:', error);
      if (error.response?.status === 401) {
        router.push('/admin/login');
      } else {
        setError('Failed to load forms. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to delete "${title}"?\n\nThe form will be marked as deleted and hidden from the list. It can be restored later if needed.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await formsAPI.delete(id);
      await fetchForms();
    } catch (error) {
      alert('Error deleting form. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (form) => {
    setTogglingId(form._id);
    try {
      await formsAPI.update(form._id, { isActive: !form.isActive });
      await fetchForms();
    } catch (error) {
      alert('Error updating form. Please try again.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <Layout isAdmin={true}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Forms</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your dynamic forms</p>
          </div>
          <button
            onClick={() => router.push('/admin/forms/new')}
            className="btn-primary w-full sm:w-auto whitespace-nowrap"
          >
            <svg className="inline-block h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Form
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 sm:py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">Loading forms...</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="card p-8 sm:p-12 text-center">
            <svg className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">No forms created yet</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-6 max-w-md mx-auto">
              Get started by creating your first dynamic form.
            </p>
            <button
              onClick={() => router.push('/admin/forms/new')}
              className="btn-primary"
            >
              Create Your First Form
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
              {forms.map((form) => (
                <div key={form._id} className="card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate">{form.title}</h3>
                      {form.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{form.description}</p>
                      )}
                    </div>
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                      form.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {form.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>{form.fields.length} field{form.fields.length !== 1 ? 's' : ''}</span>
                    <span>{new Date(form.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => toggleActive(form)}
                      disabled={togglingId === form._id}
                      className="flex-1 px-3 py-2 text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50"
                    >
                      {togglingId === form._id ? 'Updating...' : (form.isActive ? 'Deactivate' : 'Activate')}
                    </button>
                    <button
                      onClick={() => router.push(`/admin/forms/${form._id}`)}
                      className="flex-1 px-3 py-2 text-xs sm:text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(form._id, form.title)}
                      disabled={deletingId === form._id}
                      className="flex-1 px-3 py-2 text-xs sm:text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingId === form._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fields</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {forms.map((form) => (
                      <tr key={form._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 lg:px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{form.title}</div>
                          {form.description && (
                            <div className="text-sm text-gray-500 mt-1 line-clamp-1">{form.description}</div>
                          )}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {form.fields.length} field{form.fields.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                            form.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {form.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(form.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => toggleActive(form)}
                              disabled={togglingId === form._id}
                              className="px-3 py-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                              title={form.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {togglingId === form._id ? '...' : (form.isActive ? 'Deactivate' : 'Activate')}
                            </button>
                            <button
                              onClick={() => router.push(`/admin/forms/${form._id}`)}
                              className="px-3 py-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(form._id, form.title)}
                              disabled={deletingId === form._id}
                              className="px-3 py-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingId === form._id ? '...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
