import { useState } from 'react';

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

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
];

export default function NestedFieldsManager({ option, nestedFields = [], onUpdate, parentFieldName }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [newField, setNewField] = useState({
    label: '',
    name: '',
    type: 'text',
    required: false,
    validation: {},
    order: nestedFields.length
  });

  const handleAddField = () => {
    if (!newField.label || !newField.name) {
      alert('Label and Name are required');
      return;
    }

    const updatedFields = [...nestedFields, { ...newField, order: nestedFields.length }];
    onUpdate(updatedFields);
    setNewField({
      label: '',
      name: '',
      type: 'text',
      required: false,
      validation: {},
      order: nestedFields.length + 1
    });
  };

  const handleUpdateField = (index, updatedField) => {
    const updatedFields = [...nestedFields];
    updatedFields[index] = { ...updatedField, order: index };
    onUpdate(updatedFields);
    setEditingIndex(null);
  };

  const handleDeleteField = (index) => {
    if (!confirm('Are you sure you want to remove this nested field?')) return;
    const updatedFields = nestedFields.filter((_, i) => i !== index)
      .map((f, i) => ({ ...f, order: i }));
    onUpdate(updatedFields);
  };

  const handleNewFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setNewField(prev => {
      const updated = { ...prev, [name]: newValue };
      if (name === 'label' && newValue) {
        updated.name = generateFieldName(newValue);
      }
      return updated;
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1.5"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Nested Fields for "{option}"
            <span className="ml-1 text-xs text-gray-500">
              ({nestedFields.length} field{nestedFields.length !== 1 ? 's' : ''})
            </span>
          </button>
        </div>
        {isExpanded && (
          <button
            type="button"
            onClick={handleAddField}
            disabled={!newField.label || !newField.name}
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Field
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-3 mt-3">
          {nestedFields.map((nf, idx) => (
            <div key={idx} className="bg-white p-3 rounded border border-gray-200">
              {editingIndex === idx ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Field Label"
                      value={nf.label}
                      onChange={(e) => {
                        const updated = { ...nf, label: e.target.value };
                        if (!nf.name || nf.name === generateFieldName(nf.label)) {
                          updated.name = generateFieldName(e.target.value);
                        }
                        handleUpdateField(idx, updated);
                      }}
                      className="text-xs px-2 py-1 border rounded"
                    />
                    <input
                      type="text"
                      placeholder="Field Name"
                      value={nf.name}
                      readOnly
                      className="text-xs px-2 py-1 border rounded bg-gray-50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={nf.type}
                      onChange={(e) => handleUpdateField(idx, { ...nf, type: e.target.value })}
                      className="text-xs px-2 py-1 border rounded"
                    >
                      {fieldTypes.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <label className="flex items-center text-xs">
                      <input
                        type="checkbox"
                        checked={nf.required || false}
                        onChange={(e) => handleUpdateField(idx, { ...nf, required: e.target.checked })}
                        className="mr-1"
                      />
                      Required
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingIndex(null)}
                      className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteField(idx)}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{nf.label}</span>
                    <span className="ml-2 text-xs text-gray-500">({nf.type})</span>
                    {nf.required && <span className="ml-2 text-xs text-red-600">Required</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingIndex(idx)}
                    className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add new nested field */}
          <div className="bg-white p-3 rounded border-2 border-dashed border-gray-300">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  name="label"
                  placeholder="Field Label"
                  value={newField.label}
                  onChange={handleNewFieldChange}
                  className="text-xs px-2 py-1 border rounded"
                />
                <input
                  type="text"
                  name="name"
                  placeholder="Field Name (auto)"
                  value={newField.name}
                  readOnly
                  className="text-xs px-2 py-1 border rounded bg-gray-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  name="type"
                  value={newField.type}
                  onChange={handleNewFieldChange}
                  className="text-xs px-2 py-1 border rounded"
                >
                  {fieldTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <label className="flex items-center text-xs">
                  <input
                    type="checkbox"
                    name="required"
                    checked={newField.required}
                    onChange={handleNewFieldChange}
                    className="mr-1"
                  />
                  Required
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

