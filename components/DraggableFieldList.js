import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import FieldEditor from "./FieldEditor";
import { useMemo, useCallback } from "react";

// Helper to generate stable unique IDs
const generateStableId = (field, index) => {
  // Prefer existing drag ID or field ID
  if (field._dragId) return field._dragId;
  if (field._id) return String(field._id);
  if (field.name) return `field-${field.name}`;
  // Fallback to index-based ID (will be replaced when field gets a name)
  return `field-temp-${index}`;
};

export default function DraggableFieldList({ fields, onFieldsChange }) {
  // Create stable drag IDs for all fields - memoized to prevent re-calculation
  const fieldsWithStableIds = useMemo(() => {
    return fields.map((field, index) => ({
      ...field,
      _dragId: generateStableId(field, index),
    }));
  }, [fields.map((f, i) => `${f._id || f._dragId || i}-${f.name || ''}`).join(',')]);

  const handleDragEnd = useCallback(
    (result) => {
      if (!result.destination) return;
      if (result.source.index === result.destination.index) return;

      const items = Array.from(fieldsWithStableIds);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      // Update order values while preserving all field properties including _dragId
      const updatedFields = items.map((field, index) => ({
        ...field,
        order: index,
        // Preserve the drag ID
        _dragId: field._dragId || generateStableId(field, index),
      }));

      onFieldsChange(updatedFields);
    },
    [fieldsWithStableIds, onFieldsChange]
  );

  const handleFieldUpdate = useCallback(
    (index, updatedField) => {
      const currentField = fieldsWithStableIds[index];
      const updatedFields = [...fieldsWithStableIds];
      updatedFields[index] = {
        ...updatedField,
        order: index,
        // Preserve drag ID from current field
        _dragId: currentField._dragId || generateStableId(updatedField, index),
        // Preserve _id if it exists
        _id: currentField._id || updatedField._id,
      };
      onFieldsChange(updatedFields);
    },
    [fieldsWithStableIds, onFieldsChange]
  );

  const handleFieldDelete = useCallback(
    (index) => {
      if (!confirm("Are you sure you want to remove this field?")) {
        return;
      }
      const updatedFields = fieldsWithStableIds
        .filter((_, i) => i !== index)
        .map((field, index) => ({
          ...field,
          order: index,
        }));
      onFieldsChange(updatedFields);
    },
    [fieldsWithStableIds, onFieldsChange]
  );

  const handleAddField = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const newId = `field_${timestamp}_${random}`;
    
    const newField = {
      label: "",
      name: "",
      type: "text",
      required: false,
      options: [],
      validation: {},
      order: fieldsWithStableIds.length,
      _id: newId,
      _dragId: newId, // Stable ID from creation
    };

    onFieldsChange([...fieldsWithStableIds, newField]);
  }, [fieldsWithStableIds, onFieldsChange]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
            Form Fields
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {fields.length} field{fields.length !== 1 ? "s" : ""} • Drag to
            reorder
          </p>
        </div>
        <button
          onClick={handleAddField}
          className="btn-primary text-sm sm:text-base w-full sm:w-auto whitespace-nowrap"
          type="button"
        >
          <svg
            className="inline-block h-4 w-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Field
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <p className="text-sm sm:text-base text-gray-500 mb-4">
            No fields added yet
          </p>
          <button onClick={handleAddField} className="btn-primary text-sm" type="button">
            Add Your First Field
          </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="fields-list" type="FIELD">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`min-h-[100px] ${
                  snapshot.isDraggingOver
                    ? "bg-blue-50 rounded-lg p-2 transition-colors duration-200"
                    : ""
                }`}
              >
                {fieldsWithStableIds.map((field, index) => {
                  const dragId = String(field._dragId || generateStableId(field, index));
                  const canDrag = field.name && field.label;

                  return (
                    <Draggable
                      key={dragId}
                      draggableId={dragId}
                      index={index}
                      isDragDisabled={!canDrag}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`mb-3 sm:mb-4 ${
                            snapshot.isDragging
                              ? "opacity-90 shadow-2xl z-50 scale-105"
                              : "hover:shadow-md"
                          } transition-all duration-200 ease-in-out`}
                          style={{
                            ...provided.draggableProps.style,
                          }}
                        >
                          <div className="flex items-start gap-2 sm:gap-3 bg-white rounded-lg border border-gray-200 p-4 shadow-sm transition-shadow">
                            <div
                              {...provided.dragHandleProps}
                              className={`mt-1 flex-shrink-0 ${
                                !canDrag
                                  ? "opacity-30 cursor-not-allowed"
                                  : "cursor-grab active:cursor-grabbing hover:opacity-70"
                              } transition-opacity`}
                              title={
                                canDrag
                                  ? "Drag to reorder"
                                  : "Complete field (label & name) to enable drag"
                              }
                            >
                              <svg
                                className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                                />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <FieldEditor
                                field={field}
                                onUpdate={(updatedField) =>
                                  handleFieldUpdate(index, updatedField)
                                }
                                onDelete={() => handleFieldDelete(index)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
