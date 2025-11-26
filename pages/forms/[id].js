import { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Layout from "../../components/Layout";
import { formsAPI, submissionsAPI } from "../../lib/api";
import { useState } from "react";

// Helper function to get all fields including conditional ones
const getAllFields = (fields, selectedValues = {}) => {
  const allFields = [...fields];

  fields.forEach((field) => {
    if (
      (field.type === "radio" || field.type === "select") &&
      field.conditionalFields
    ) {
      const selectedValue = selectedValues[field.name];
      if (selectedValue && field.conditionalFields[selectedValue]) {
        const conditionalFields = Array.isArray(
          field.conditionalFields[selectedValue]
        )
          ? field.conditionalFields[selectedValue]
          : [];
        conditionalFields.forEach((nestedField) => {
          // Create a copy to avoid mutating the original
          const nestedFieldCopy = { ...nestedField };
          // Ensure unique name by prefixing with parent field name
          nestedFieldCopy.name = `${field.name}_${nestedField.name}`;
          allFields.push(nestedFieldCopy);
        });
      }
    }
  });

  return allFields;
};

// Helper function to generate Yup validation schema from form fields
const generateValidationSchema = (fields, selectedValues = {}) => {
  const schema = {};
  const allFields = getAllFields(fields, selectedValues);

  allFields.forEach((field) => {
    let fieldSchema;

    switch (field.type) {
      case "email":
        fieldSchema = Yup.string().email(
          `${field.label} must be a valid email address`
        );
        if (field.validation?.minLength) {
          fieldSchema = fieldSchema.min(
            field.validation.minLength,
            `${field.label} must be at least ${field.validation.minLength} characters`
          );
        }
        if (field.validation?.maxLength) {
          fieldSchema = fieldSchema.max(
            field.validation.maxLength,
            `${field.label} must be at most ${field.validation.maxLength} characters`
          );
        }
        break;

      case "number":
        fieldSchema = Yup.number()
          .transform((value, originalValue) => {
            // Convert empty string to undefined
            if (originalValue === "" || originalValue === null) {
              return undefined;
            }
            const num = Number(originalValue);
            return isNaN(num) ? originalValue : num;
          })
          .typeError(`${field.label} must be a valid number`)
          .nullable();
        if (field.validation?.min !== undefined) {
          fieldSchema = fieldSchema.min(
            field.validation.min,
            `${field.label} must be at least ${field.validation.min}`
          );
        }
        if (field.validation?.max !== undefined) {
          fieldSchema = fieldSchema.max(
            field.validation.max,
            `${field.label} must be at most ${field.validation.max}`
          );
        }
        break;

      case "text":
      case "textarea":
        fieldSchema = Yup.string();
        if (field.validation?.minLength) {
          fieldSchema = fieldSchema.min(
            field.validation.minLength,
            `${field.label} must be at least ${field.validation.minLength} characters`
          );
        }
        if (field.validation?.maxLength) {
          fieldSchema = fieldSchema.max(
            field.validation.maxLength,
            `${field.label} must be at most ${field.validation.maxLength} characters`
          );
        }
        if (field.validation?.regex) {
          try {
            const regex = new RegExp(field.validation.regex);
            fieldSchema = fieldSchema.matches(
              regex,
              `${field.label} format is invalid`
            );
          } catch (e) {
            console.error("Invalid regex pattern:", field.validation.regex);
          }
        }
        break;

      case "date":
        fieldSchema = Yup.date()
          .transform((value, originalValue) =>
            String(originalValue).trim() === "" ? undefined : value
          )
          .typeError(`${field.label} must be a valid date`)
          .nullable();
        if (field.required) {
          fieldSchema = fieldSchema
            .required(`${field.label} is required`)
            .nullable(false);
        }
        break;

      case "select":
      case "radio":
        fieldSchema = Yup.string();
        if (field.options && field.options.length > 0) {
          fieldSchema = fieldSchema.oneOf(
            field.options,
            `${field.label} must be one of the provided options`
          );
        }
        break;

      case "checkbox":
        fieldSchema = Yup.boolean();
        break;

      case "file":
        if (field.required) {
          fieldSchema = Yup.mixed().test(
            "file-required",
            `${field.label} is required`,
            function (value) {
              // Must be a File object or non-empty string
              if (!value) {
                return false;
              }
              return (
                value instanceof File ||
                (typeof value === "string" && value.trim() !== "")
              );
            }
          );
        } else {
          fieldSchema = Yup.mixed().nullable().notRequired();
        }
        break;

      default:
        fieldSchema = Yup.string();
    }

    // Add required validation (skip for file as it's handled in the case above)
    if (field.required && field.type !== "file") {
      if (field.type === "checkbox") {
        fieldSchema = fieldSchema.oneOf([true], `${field.label} is required`);
      } else if (field.type === "number") {
        fieldSchema = fieldSchema
          .required(`${field.label} is required`)
          .nullable(false);
      } else if (field.type === "date") {
        fieldSchema = fieldSchema
          .required(`${field.label} is required`)
          .nullable(false);
      } else {
        fieldSchema = fieldSchema.required(`${field.label} is required`);
      }
    } else if (!field.required) {
      // Allow empty values for optional fields
      if (field.type === "number" || field.type === "date") {
        fieldSchema = fieldSchema.nullable().notRequired();
      } else if (field.type !== "checkbox" && field.type !== "file") {
        fieldSchema = fieldSchema.nullable().notRequired();
      }
    }

    schema[field.name] = fieldSchema;
  });

  return Yup.object().shape(schema);
};

// Helper function to get initial values (including conditional fields)
const getInitialValues = (fields, selectedValues = {}) => {
  const initialValues = {};
  const allFields = getAllFields(fields, selectedValues);

  allFields.forEach((field) => {
    if (field.type === "checkbox") {
      initialValues[field.name] = false;
    } else if (field.type === "number") {
      initialValues[field.name] = undefined;
    } else if (field.type === "file") {
      initialValues[field.name] = null;
    } else {
      initialValues[field.name] = "";
    }
  });
  return initialValues;
};

export default function FormPage() {
  const router = useRouter();
  const { id } = router.query;
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState("");
  const [selectedValues, setSelectedValues] = useState({}); // Track selected values for conditional fields

  useEffect(() => {
    if (id) {
      fetchForm();
    }
  }, [id]);

  const fetchForm = async () => {
    try {
      setError("");
      const response = await formsAPI.getById(id);
      if (!response.data.isActive) {
        setError("This form is not active");
        return;
      }
      setForm(response.data);
    } catch (error) {
      console.error("Error fetching form:", error);
      if (error.response?.status === 404) {
        setError("Form not found");
      } else {
        setError("Failed to load form. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate validation schema and initial values (dynamic based on selected values)
  const validationSchema = useMemo(() => {
    if (!form || !form.fields) return null;
    // Get current form values to determine selected options
    return generateValidationSchema(form.fields, selectedValues);
  }, [form, selectedValues]);

  const initialValues = useMemo(() => {
    if (!form || !form.fields) return {};
    return getInitialValues(form.fields, selectedValues);
  }, [form, selectedValues]);

  // Sync selectedValues with formik values when formik initializes
  useEffect(() => {
    if (form?.fields) {
      const newSelectedValues = {};
      form.fields.forEach((field) => {
        if (
          (field.type === "radio" || field.type === "select") &&
          field.conditionalFields
        ) {
          // Will be set when user selects an option
        }
      });
      // Only update if different to prevent infinite loops
      if (
        JSON.stringify(newSelectedValues) !== JSON.stringify(selectedValues)
      ) {
        // Don't reset - let user selections drive this
      }
    }
  }, [form]);

  const handleSubmit = async (values, { setFieldError, setSubmitting }) => {
    try {
      setError("");

      // Get all fields including conditional ones
      const allFields = getAllFields(form.fields, selectedValues);

      // Check if there are any file fields
      const hasFileFields = allFields.some((f) => f.type === "file");

      // Prepare answers array and file inputs
      const answers = [];
      const formData = hasFileFields ? new FormData() : null;

      Object.entries(values).forEach(([name, value]) => {
        // Check if this field exists
        const fieldExists = allFields.some((f) => {
          if (name.startsWith(`${f.name}_`)) {
            const parentField = form.fields.find((pf) =>
              name.startsWith(`${pf.name}_`)
            );
            if (parentField) {
              const nestedFieldName = name.replace(`${parentField.name}_`, "");
              const selectedValue =
                selectedValues[parentField.name] || values[parentField.name];
              const conditionalFields =
                parentField.conditionalFields?.[selectedValue] || [];
              return conditionalFields.some(
                (nf) => nf.name === nestedFieldName
              );
            }
          }
          return f.name === name;
        });

        if (fieldExists) {
          const field = allFields.find(
            (f) => f.name === name || name.startsWith(`${f.name}_`)
          );

          // Handle file fields
          if (field?.type === "file") {
            if (value instanceof File) {
              // Add file to FormData for upload
              if (formData) {
                formData.append(name, value);
              }
              // Also add to answers array so backend knows the field exists
              answers.push({ name, value: value.name }); // Send filename as placeholder
            } else if (field.required) {
              // Required file field but no file selected - validation will catch this
              answers.push({ name, value: "" });
            }
            // Optional file fields with no file don't need to be in answers
          } else {
            // Handle other field types
            let stringValue = "";
            if (value === null || value === undefined) {
              stringValue = "";
            } else if (typeof value === "boolean") {
              stringValue = value ? "true" : "false";
            } else if (value instanceof Date) {
              stringValue = value.toISOString().split("T")[0];
            } else {
              stringValue = String(value);
            }
            answers.push({ name, value: stringValue });
          }
        }
      });

      // Submit with FormData if files are present, otherwise use JSON
      if (hasFileFields && formData) {
        formData.append("formId", id);
        formData.append("answers", JSON.stringify(answers));

        await submissionsAPI.submit(formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        await submissionsAPI.submit({
          formId: id,
          answers,
        });
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (error) {
      if (error.response?.data?.errors) {
        // Map server errors to form fields
        if (Array.isArray(error.response.data.errors)) {
          error.response.data.errors.forEach((err) => {
            const errorStr =
              typeof err === "string" ? err : err.msg || err.message || "";
            const matchingField = form.fields.find(
              (f) =>
                errorStr.toLowerCase().includes(f.label.toLowerCase()) ||
                errorStr.toLowerCase().includes(f.name.toLowerCase())
            );
            if (matchingField) {
              setFieldError(matchingField.name, errorStr);
            }
          });
        }
      } else {
        setError(
          error.response?.data?.error ||
            "Error submitting form. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field, formik) => {
    const hasError = formik.touched[field.name] && formik.errors[field.name];

    switch (field.type) {
      case "textarea":
        return (
          <Field
            as="textarea"
            name={field.name}
            rows="4"
            className={`input-field ${hasError ? "input-error" : ""}`}
            placeholder={
              field.placeholder || `Enter ${field.label.toLowerCase()}`
            }
          />
        );

      case "select":
        return (
          <Field
            as="select"
            name={field.name}
            className={`input-field ${hasError ? "input-error" : ""}`}
            onChange={(e) => {
              formik.handleChange(e);
              // Update selected values for conditional fields
              const newSelectedValues = {
                ...selectedValues,
                [field.name]: e.target.value,
              };
              setSelectedValues(newSelectedValues);
              // Clear nested field values when parent changes
              if (
                field.conditionalFields &&
                field.conditionalFields[e.target.value]
              ) {
                const nestedFields = field.conditionalFields[e.target.value];
                nestedFields.forEach((nf) => {
                  const nestedName = `${field.name}_${nf.name}`;
                  if (nf.type === "checkbox") {
                    formik.setFieldValue(nestedName, false);
                  } else if (nf.type === "number") {
                    formik.setFieldValue(nestedName, undefined);
                  } else {
                    formik.setFieldValue(nestedName, "");
                  }
                });
              }
              // Clear nested field values for previously selected option
              Object.keys(field.conditionalFields || {}).forEach((opt) => {
                if (opt !== e.target.value && field.conditionalFields[opt]) {
                  field.conditionalFields[opt].forEach((nf) => {
                    const nestedName = `${field.name}_${nf.name}`;
                    formik.setFieldValue(
                      nestedName,
                      nf.type === "checkbox"
                        ? false
                        : nf.type === "number"
                        ? undefined
                        : ""
                    );
                  });
                }
              });
            }}
          >
            <option value="">-- Select {field.label} --</option>
            {field.options &&
              field.options.map((option, idx) => (
                <option key={idx} value={option}>
                  {option}
                </option>
              ))}
          </Field>
        );

      case "radio":
        return (
          <div className="space-y-2 sm:space-y-3" role="radiogroup">
            {field.options &&
              field.options.map((option, idx) => (
                <label
                  key={idx}
                  className="flex items-center p-2 sm:p-3 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Field
                    type="radio"
                    name={field.name}
                    value={option}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    onChange={(e) => {
                      formik.handleChange(e);
                      // Update selected values for conditional fields
                      const newSelectedValues = {
                        ...selectedValues,
                        [field.name]: e.target.value,
                      };
                      setSelectedValues(newSelectedValues);
                      // Clear nested field values when parent changes
                      if (
                        field.conditionalFields &&
                        field.conditionalFields[e.target.value]
                      ) {
                        const nestedFields =
                          field.conditionalFields[e.target.value];
                        nestedFields.forEach((nf) => {
                          const nestedName = `${field.name}_${nf.name}`;
                          if (nf.type === "checkbox") {
                            formik.setFieldValue(nestedName, false);
                          } else if (nf.type === "number") {
                            formik.setFieldValue(nestedName, undefined);
                          } else {
                            formik.setFieldValue(nestedName, "");
                          }
                        });
                      }
                      // Clear nested field values for previously selected option
                      Object.keys(field.conditionalFields || {}).forEach(
                        (opt) => {
                          if (
                            opt !== e.target.value &&
                            field.conditionalFields[opt]
                          ) {
                            field.conditionalFields[opt].forEach((nf) => {
                              const nestedName = `${field.name}_${nf.name}`;
                              formik.setFieldValue(
                                nestedName,
                                nf.type === "checkbox"
                                  ? false
                                  : nf.type === "number"
                                  ? undefined
                                  : ""
                              );
                            });
                          }
                        }
                      );
                    }}
                  />
                  <span className="ml-2 sm:ml-3 text-sm sm:text-base text-gray-700">
                    {option}
                  </span>
                </label>
              ))}
          </div>
        );

      case "checkbox":
        return (
          <label className="flex items-start p-3 rounded-md hover:bg-gray-50 cursor-pointer transition-colors">
            <Field
              type="checkbox"
              name={field.name}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm sm:text-base text-gray-700">
              {field.label}
            </span>
          </label>
        );

      case "number":
        return (
          <Field
            type="number"
            name={field.name}
            min={field.validation?.min}
            max={field.validation?.max}
            step="any"
            className={`input-field ${hasError ? "input-error" : ""}`}
            placeholder={
              field.placeholder || `Enter ${field.label.toLowerCase()}`
            }
            value={formik.values[field.name] ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              formik.setFieldValue(
                field.name,
                value === "" ? undefined : value
              );
            }}
          />
        );

      case "date":
        return (
          <Field
            type="date"
            name={field.name}
            className={`input-field ${hasError ? "input-error" : ""}`}
            value={formik.values[field.name] || ""}
          />
        );

      case "email":
        return (
          <Field
            type="email"
            name={field.name}
            className={`input-field ${hasError ? "input-error" : ""}`}
            placeholder={field.placeholder || `Enter your email address`}
          />
        );

      case "file":
        return (
          <div>
            <input
              type="file"
              name={field.name}
              onChange={(e) => {
                const file = e.target.files?.[0];
                // Mark field as touched when user interacts
                formik.setFieldTouched(field.name, true, false);

                if (file) {
                  // Store the File object itself for FormData submission
                  formik.setFieldValue(field.name, file, false).then(() => {
                    // Validate after state is updated
                    setTimeout(() => {
                      formik.validateField(field.name);
                    }, 100);
                  });
                } else {
                  // Clear field if no file selected
                  formik
                    .setFieldValue(field.name, undefined, false)
                    .then(() => {
                      setTimeout(() => {
                        formik.validateField(field.name);
                      }, 100);
                    });
                }
              }}
              onBlur={() => {
                formik.setFieldTouched(field.name, true, true);
                formik.validateField(field.name);
              }}
              className={`input-field ${hasError ? "input-error" : ""}`}
              accept={field.validation?.accept || "*"}
            />
            {formik.values[field.name] instanceof File && (
              <p className="mt-1 text-xs text-gray-500">
                Selected: {formik.values[field.name].name}
              </p>
            )}
            {formik.values[field.name] &&
              typeof formik.values[field.name] === "string" &&
              formik.values[field.name].trim() !== "" && (
                <p className="mt-1 text-xs text-gray-500">
                  Selected: {formik.values[field.name]}
                </p>
              )}
            <ErrorMessage name={field.name}>
              {(msg) => (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <svg
                    className="h-4 w-4 mr-1 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {msg}
                </p>
              )}
            </ErrorMessage>
          </div>
        );

      default:
        return (
          <Field
            type={field.type || "text"}
            name={field.name}
            className={`input-field ${hasError ? "input-error" : ""}`}
            placeholder={
              field.placeholder || `Enter ${field.label.toLowerCase()}`
            }
          />
        );
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">Loading form...</p>
        </div>
      </Layout>
    );
  }

  if (error || !form) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 sm:p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl sm:text-2xl font-bold text-red-800 mb-2">
              Error
            </h2>
            <p className="text-red-700 mb-4">{error || "Form not found"}</p>
            <button onClick={() => router.push("/")} className="btn-primary">
              Go Back to Forms
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (submitSuccess) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 sm:p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-green-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl sm:text-2xl font-bold text-green-800 mb-2">
              Form Submitted Successfully!
            </h2>
            <p className="text-green-700 mb-4">
              Thank you for your submission. You will be redirected shortly.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!validationSchema) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="card p-6 sm:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
              {form.title}
            </h1>
            {form.description && (
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {form.description}
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Formik
            key={`form-${JSON.stringify(selectedValues)}`}
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {(formik) => (
              <Form className="space-y-5 sm:space-y-6" noValidate>
                {form.fields.map((field, index) => {
                  const selectedValue =
                    selectedValues[field.name] || formik.values[field.name];
                  const conditionalFields =
                    (field.type === "radio" || field.type === "select") &&
                    field.conditionalFields &&
                    selectedValue &&
                    field.conditionalFields[selectedValue]
                      ? Array.isArray(field.conditionalFields[selectedValue])
                        ? field.conditionalFields[selectedValue]
                        : []
                      : [];

                  return (
                    <div key={field.name || index}>
                      <div className="space-y-1.5 sm:space-y-2">
                        {field.type !== "checkbox" && (
                          <label
                            htmlFor={field.name}
                            className="block text-sm sm:text-base font-medium text-gray-700"
                          >
                            {field.label}
                            {field.required && (
                              <span
                                className="text-red-500 ml-1"
                                aria-label="required"
                              >
                                *
                              </span>
                            )}
                          </label>
                        )}
                        <div>
                          {renderField(field, formik)}
                          {/* Don't render ErrorMessage for file fields - it's already in renderField */}
                          {field.type !== "file" && (
                            <ErrorMessage name={field.name}>
                              {(msg) => (
                                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                                  <svg
                                    className="h-4 w-4 mr-1 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  {msg}
                                </p>
                              )}
                            </ErrorMessage>
                          )}
                        </div>
                      </div>

                      {/* Render conditional/nested fields */}
                      {conditionalFields.length > 0 && (
                        <div className="mt-4 ml-4 sm:ml-6 pl-4 sm:pl-6 border-l-2 border-blue-200 space-y-4 bg-blue-50/30 rounded-r-lg p-4">
                          {conditionalFields.map((nestedField, nestedIdx) => {
                            const nestedFieldName = `${field.name}_${nestedField.name}`;
                            const hasNestedError =
                              formik.touched[nestedFieldName] &&
                              formik.errors[nestedFieldName];

                            return (
                              <div
                                key={nestedIdx}
                                className="space-y-1.5 sm:space-y-2"
                              >
                                <label
                                  htmlFor={nestedFieldName}
                                  className="block text-sm sm:text-base font-medium text-gray-700"
                                >
                                  {nestedField.label}
                                  {nestedField.required && (
                                    <span
                                      className="text-red-500 ml-1"
                                      aria-label="required"
                                    >
                                      *
                                    </span>
                                  )}
                                </label>
                                <div>
                                  {renderField(
                                    { ...nestedField, name: nestedFieldName },
                                    formik
                                  )}
                                  <ErrorMessage name={nestedFieldName}>
                                    {(msg) => (
                                      <p className="mt-1.5 text-sm text-red-600 flex items-center">
                                        <svg
                                          className="h-4 w-4 mr-1 flex-shrink-0"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                        {msg}
                                      </p>
                                    )}
                                  </ErrorMessage>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formik.isSubmitting}
                    className="btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formik.isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Submitting...
                      </span>
                    ) : (
                      "Submit Form"
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </Layout>
  );
}
