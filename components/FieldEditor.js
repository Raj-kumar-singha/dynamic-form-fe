import { useState, useEffect } from 'react';
import NestedFieldsManager from './NestedFieldsManager';

export default function FieldEditor({ field, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(!field.name);
  const [optionsText, setOptionsText] = useState(() => {
    return Array.isArray(field.options) && field.options.length > 0 
      ? field.options.join('\n') 
      : '';
  });
  const [formData, setFormData] = useState({
    label: field.label || '',
    name: field.name || '',
    type: field.type || 'text',
    required: field.required || false,
    options: field.options || [],
    conditionalFields: field.conditionalFields || {},
    validation: field.validation || {},
    order: field.order || 0
  });

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'date', label: 'Date' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio' },
    { value: 'select', label: 'Select' },
    { value: 'file', label: 'File Upload' }
  ];

  const generateFieldName = (label) => {
    if (!label) return '';
    let name = label.toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (name && !/^[a-z]/.test(name)) {
      name = 'field_' + name;
    }
    return name || 'field';
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: newValue
      };
      
      if (name === 'label' && newValue && (!prev.name || prev.name === generateFieldName(prev.label))) {
        updated.name = generateFieldName(newValue);
      }
      
      if (name === 'type' && (newValue === 'radio' || newValue === 'select')) {
        if (!updated.options || updated.options.length === 0) {
          updated.options = [];
        }
        if (!optionsText || optionsText.trim() === '') {
          setOptionsText('');
        }
      }
      
      return updated;
    });
  };

  useEffect(() => {
    if (isEditing && field.options) {
      const joined = Array.isArray(field.options) && field.options.length > 0
        ? field.options.join('\n')
        : '';
      if (joined && !optionsText) {
        setOptionsText(joined);
      }
    }
  }, [isEditing]);

  const handleOptionsChange = (e) => {
    const value = e.target.value;
    setOptionsText(value);
    
    const options = value.split('\n')
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
    
    setFormData(prev => ({
      ...prev,
      options: options
    }));
  };

  const handleValidationChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      validation: {
        ...prev.validation,
        [name]: value ? (name.includes('Length') || name === 'min' || name === 'max' ? parseInt(value) : value) : undefined
      }
    }));
  };

  const handleSave = () => {
    if (!formData.label || !formData.name) {
      alert('Label and Name are required');
      return;
    }
    
    if (needsOptions) {
      const options = Array.isArray(formData.options) ? formData.options.filter(opt => opt && opt.trim()) : [];
      if (options.length === 0) {
        alert(`At least one option is required for ${formData.type} fields`);
        return;
      }
      formData.options = options;
    }
    
    onUpdate(formData);
    setIsEditing(false);
  };

  const needsOptions = ['select', 'radio'].includes(formData.type);

  return (
    <div className="card p-4 sm:p-5 mb-4">
      {isEditing ? (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="label"
                value={formData.label}
                onChange={handleChange}
                className="input-field"
                placeholder="Field Label"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name <span className="text-xs text-gray-500 font-normal">(auto-generated)</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field bg-gray-50"
                placeholder="field_name"
                readOnly
                title="Field name is automatically generated from the label"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Field Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="input-field"
              >
                {fieldTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="required"
                  checked={formData.required}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Required Field</span>
              </label>
            </div>
          </div>

          {needsOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Options (one per line) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={optionsText}
                onChange={handleOptionsChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-y"
                rows="6"
                placeholder="Option 1&#10;Option 2&#10;Option 3&#10;..."
                style={{ minHeight: '120px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                  }
                }}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                💡 Press Enter to add a new option on the next line
              </p>
              {formData.options && formData.options.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="text-xs font-medium text-blue-900 mb-2">
                    Preview ({formData.options.length} option{formData.options.length !== 1 ? 's' : ''})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.options.map((opt, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-white text-blue-700 rounded border border-blue-300 text-xs font-medium">
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {formData.options && formData.options.length === 0 && optionsText.trim() === '' && (
                <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠️ At least one option is required for {formData.type} fields
                </p>
              )}

              {/* Nested/Conditional Fields Management */}
              {formData.options && formData.options.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">
                      Conditional/Nested Fields
                    </h4>
                    <p className="text-xs text-gray-500">
                      Add fields that appear when a specific option is selected
                    </p>
                  </div>
                  <div className="space-y-3">
                    {formData.options.map((option, optIdx) => {
                      const conditionalFields = formData.conditionalFields?.[option] || [];
                      return (
                        <NestedFieldsManager
                          key={optIdx}
                          option={option}
                          nestedFields={Array.isArray(conditionalFields) ? conditionalFields : []}
                          onUpdate={(updatedFields) => {
                            setFormData(prev => ({
                              ...prev,
                              conditionalFields: {
                                ...(prev.conditionalFields || {}),
                                [option]: updatedFields
                              }
                            }));
                          }}
                          parentFieldName={formData.name}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {['text', 'textarea'].includes(formData.type) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-gray-50 rounded-md">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Min Length</label>
                <input
                  type="number"
                  name="minLength"
                  value={formData.validation.minLength || ''}
                  onChange={handleValidationChange}
                  className="input-field"
                  min="0"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Max Length</label>
                <input
                  type="number"
                  name="maxLength"
                  value={formData.validation.maxLength || ''}
                  onChange={handleValidationChange}
                  className="input-field"
                  min="1"
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          {formData.type === 'number' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-gray-50 rounded-md">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Min Value</label>
                <input
                  type="number"
                  name="min"
                  value={formData.validation.min || ''}
                  onChange={handleValidationChange}
                  className="input-field"
                  step="any"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Max Value</label>
                <input
                  type="number"
                  name="max"
                  value={formData.validation.max || ''}
                  onChange={handleValidationChange}
                  className="input-field"
                  step="any"
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="btn-secondary text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary text-sm sm:text-base"
            >
              Save Field
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-medium text-gray-900 text-sm sm:text-base truncate">
                {formData.label || 'Untitled Field'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                {formData.type}
              </span>
              {formData.required && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  Required
                </span>
              )}
            </div>
            {needsOptions && Array.isArray(formData.options) && formData.options.length > 0 && (
              <div className="text-xs text-gray-600 mt-1.5">
                <span className="font-medium">{formData.options.length} option{formData.options.length !== 1 ? 's' : ''}:</span>{' '}
                <span className="text-gray-500">{formData.options.slice(0, 3).join(', ')}{formData.options.length > 3 ? '...' : ''}</span>
              </div>
            )}
            {needsOptions && (!formData.options || formData.options.length === 0) && (
              <div className="text-xs text-amber-600 mt-1.5 flex items-center">
                <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                No options defined
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:ml-4">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
