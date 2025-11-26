import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import DraggableFieldList from '../../../components/DraggableFieldList';
import { formsAPI } from '../../../lib/api';

export default function NewForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (fields.length === 0) {
      setError('At least one field is required. Please add at least one field to your form.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate all fields have name and label (trim to check for empty strings)
    // Filter out incomplete fields (those without proper label/name)
    const invalidFields = fields.filter(f => {
      const hasName = f.name && typeof f.name === 'string' && f.name.trim().length > 0;
      const hasLabel = f.label && typeof f.label === 'string' && f.label.trim().length > 0;
      return !hasName || !hasLabel;
    });
    
    if (invalidFields.length > 0) {
      const incompleteCount = invalidFields.length;
      setError(
        `Please complete all field configurations. ${incompleteCount} field${incompleteCount > 1 ? 's' : ''} ${incompleteCount > 1 ? 'are' : 'is'} missing label or name. Please save all fields before submitting.`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate fields with options (only check complete fields)
    const fieldsNeedingOptions = fields.filter(f => {
      // Only validate if field is complete (has name and label)
      const isComplete = f.name && f.name.trim() && f.label && f.label.trim();
      return isComplete && (f.type === 'select' || f.type === 'radio') && 
             (!f.options || !Array.isArray(f.options) || f.options.length === 0);
    });
    if (fieldsNeedingOptions.length > 0) {
      const fieldLabels = fieldsNeedingOptions.map(f => f.label || f.name || 'Unnamed field').join(', ');
      setError(`Radio and Select fields must have at least one option. Please add options to: ${fieldLabels}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    try {
      await formsAPI.create({
        title,
        description,
        fields
      });
      router.push('/admin/forms');
    } catch (err) {
      // Handle validation errors from backend
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessages = err.response.data.errors.map(e => 
          `${e.path}: ${e.msg}`
        ).join('\n');
        setError(`Validation errors:\n${errorMessages}`);
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Error creating form. Please try again.');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout isAdmin={true}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create New Form</h1>
            <p className="mt-1 text-sm text-gray-500">Build a custom form with dynamic fields</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/admin/forms')}
            className="btn-secondary hidden sm:inline-flex"
          >
            Cancel
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-1">Error</h3>
                <pre className="text-sm text-red-700 whitespace-pre-wrap">{error}</pre>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="card p-4 sm:p-6 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
                Form Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="e.g., Contact Form, Survey, Registration"
                required
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-500">{title.length}/200 characters</p>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
                rows="3"
                placeholder="Brief description of the form purpose"
                maxLength={1000}
              />
              <p className="mt-1 text-xs text-gray-500">{description.length}/1000 characters</p>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <DraggableFieldList fields={fields} onFieldsChange={setFields} />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/admin/forms')}
              className="btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full sm:w-auto"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Form'
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
