import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Check, AlertCircle, Loader2 } from 'lucide-react';

interface RequirementCategory {
  id: string;
  name: string;
  description: string;
  requirements: Requirement[];
}

interface Requirement {
  id: string;
  question: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multi-select';
  options?: string[];
  placeholder?: string;
  required: boolean;
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  value: any;
  isValid?: boolean;
  errorMessage?: string;
}

interface GatherRequirementsProps {
  categories: RequirementCategory[];
  onSubmit: (requirements: Record<string, any>) => Promise<void>;
  isLoading?: boolean;
  submitButtonText?: string;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({
  categories: initialCategories,
  onSubmit,
  isLoading: externalLoading = false,
  submitButtonText = 'Submit Requirements',
}) => {
  const [categories, setCategories] = useState<RequirementCategory[]>(initialCategories);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  const handleChange = useCallback((categoryId: string, requirementId: string, value: any) => {
    setCategories(prev =>
      prev.map(category => {
        if (category.id !== categoryId) return category;

        return {
          ...category,
          requirements: category.requirements.map(req => {
            if (req.id !== requirementId) return req;

            let isValid = true;
            let errorMessage = '';

            if (req.required && (value === '' || value === null || value === undefined)) {
              isValid = false;
              errorMessage = 'This field is required';
            } else if (req.validation) {
              if (req.validation.pattern && typeof value === 'string' && !req.validation.pattern.test(value)) {
                isValid = false;
                errorMessage = 'Invalid format';
              } else if (req.validation.min !== undefined && Number(value) < req.validation.min) {
                isValid = false;
                errorMessage = `Minimum value is ${req.validation.min}`;
              } else if (req.validation.max !== undefined && Number(value) > req.validation.max) {
                isValid = false;
                errorMessage = `Maximum value is ${req.validation.max}`;
              } else if (req.validation.minLength !== undefined && String(value).length < req.validation.minLength) {
                isValid = false;
                errorMessage = `Minimum length is ${req.validation.minLength}`;
              } else if (req.validation.maxLength !== undefined && String(value).length > req.validation.maxLength) {
                isValid = false;
                errorMessage = `Maximum length is ${req.validation.maxLength}`;
              }
            }

            return {
              ...req,
              value,
              isValid,
              errorMessage,
            };
          }),
        };
      })
    );
  }, []);

  const validateAllRequirements = useCallback((): boolean => {
    let isValid = true;

    const updatedCategories = categories.map(category => {
      const updatedRequirements = category.requirements.map(req => {
        if (req.required && (req.value === '' || req.value === null || req.value === undefined)) {
          isValid = false;
          return {
            ...req,
            isValid: false,
            errorMessage: 'This field is required',
          };
        }

        if (req.validation) {
          if (req.validation.pattern && typeof req.value === 'string' && !req.validation.pattern.test(req.value)) {
            isValid = false;
            return {
              ...req,
              isValid: false,
              errorMessage: 'Invalid format',
            };
          } else if (req.validation.min !== undefined && Number(req.value) < req.validation.min) {
            isValid = false;
            return {
              ...req,
              isValid: false,
              errorMessage: `Minimum value is ${req.validation.min}`,
            };
          } else if (req.validation.max !== undefined && Number(req.value) > req.validation.max) {
            isValid = false;
            return {
              ...req,
              isValid: false,
              errorMessage: `Maximum value is ${req.validation.max}`,
            };
          } else if (req.validation.minLength !== undefined && String(req.value).length < req.validation.minLength) {
            isValid = false;
            return {
              ...req,
              isValid: false,
              errorMessage: `Minimum length is ${req.validation.minLength}`,
            };
          } else if (req.validation.maxLength !== undefined && String(req.value).length > req.validation.maxLength) {
            isValid = false;
            return {
              ...req,
              isValid: false,
              errorMessage: `Maximum length is ${req.validation.maxLength}`,
            };
          }
        }

        return req;
      });

      return {
        ...category,
        requirements: updatedRequirements,
      };
    });

    setCategories(updatedCategories);
    return isValid;
  }, [categories]);

  const handleSubmit = useCallback(async () => {
    if (!validateAllRequirements()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const requirementsData = categories.reduce((acc, category) => {
        category.requirements.forEach(req => {
          acc[req.id] = req.value;
        });
        return acc;
      }, {} as Record<string, any>);

      await onSubmit(requirementsData);
      setSubmitSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [categories, onSubmit, validateAllRequirements]);

  const isLoading = externalLoading || isSubmitting;

  useEffect(() => {
    // Initialize expanded state for all categories
    if (initialCategories.length > 0 && Object.keys(expandedCategories).length === 0) {
      const initialExpanded = initialCategories.reduce((acc, category) => {
        acc[category.id] = false;
        return acc;
      }, {} as Record<string, boolean>);

      // Expand first category by default
      initialExpanded[initialCategories[0].id] = true;
      setExpandedCategories(initialExpanded);
    }
  }, [initialCategories, expandedCategories]);

  const renderInput = useCallback((requirement: Requirement) => {
    switch (requirement.type) {
      case 'text':
        return (
          <input
            type="text"
            id={requirement.id}
            value={requirement.value || ''}
            onChange={(e) => handleChange(requirement.id.split('-')[0], requirement.id, e.target.value)}
            placeholder={requirement.placeholder}
            className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              requirement.isValid === false ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-invalid={requirement.isValid === false}
            aria-describedby={requirement.isValid === false ? `${requirement.id}-error` : undefined}
            disabled={isLoading}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            id={requirement.id}
            value={requirement.value || ''}
            onChange={(e) => handleChange(requirement.id.split('-')[0], requirement.id, e.target.value)}
            placeholder={requirement.placeholder}
            className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              requirement.isValid === false ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-invalid={requirement.isValid === false}
            aria-describedby={requirement.isValid === false ? `${requirement.id}-error` : undefined}
            disabled={isLoading}
            min={requirement.validation?.min}
            max={requirement.validation?.max}
          />
        );
      case 'boolean':
        return (
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => handleChange(requirement.id.split('-')[0], requirement.id, true)}
              className={`px-4 py-2 rounded-md ${
                requirement.value === true
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } transition-colors`}
              disabled={isLoading}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => handleChange(requirement.id.split('-')[0], requirement.id, false)}
              className={`px-4 py-2 rounded-md ${
                requirement.value === false
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } transition-colors`}
              disabled={isLoading}
            >
              No
            </button>
          </div>
        );
      case 'select':
        return (
          <select
            id={requirement.id}
            value={requirement.value || ''}
            onChange={(e) => handleChange(requirement.id.split('-')[0], requirement.id, e.target.value)}
            className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              requirement.isValid === false ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-invalid={requirement.isValid === false}
            aria-describedby={requirement.isValid === false ? `${requirement.id}-error` : undefined}
            disabled={isLoading}
          >
            <option value="">{requirement.placeholder || 'Select an option'}</option>
            {requirement.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case 'multi-select':
        return (
          <div className="space-y-2">
            {requirement.options?.map((option) => {
              const isSelected = requirement.value?.includes(option);
              return (
                <label
                  key={option}
                  className={`flex items-center p-3 border rounded-md cursor-pointer ${
                    isSelected ? 'bg-blue-50 border-blue-200' : 'border-gray-200 hover:bg-gray-50'
                  } transition-colors`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const newValue = e.target.checked
                        ? [...(requirement.value || []), option]
                        : (requirement.value || []).filter((v: string) => v !== option);
                      handleChange(requirement.id.split('-')[0], requirement.id, newValue);
                    }}
                    className="mr-3 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  }, [handleChange, isLoading]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Business Requirements</h1>

      {submitSuccess ? (
        <div className="p-6 mb-6 bg-green-50 border-l-4 border-green-500 rounded-md" role="alert">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-3" />
            <p className="text-green-700">Your requirements have been submitted successfully!</p>
          </div>
        </div>
      ) : null}

      {submitError ? (
        <div className="p-6 mb-6 bg-red-50 border-l-4 border-red-500 rounded-md" role="alert">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-red-700">{submitError}</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory(category.id)}
              className="w-full p-5 text-left bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center"
              aria-expanded={expandedCategories[category.id]}
              aria-controls={`category-${category.id}-content`}
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{category.name}</h2>
                <p className="text-gray-600 mt-1">{category.description}</p>
              </div>
              {expandedCategories[category.id] ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </button>

            <div
              id={`category-${category.id}-content`}
              className={`transition-all duration-300 ease-in-out ${
                expandedCategories[category.id] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
              aria-hidden={!expandedCategories[category.id]}
            >
              <div className="p-5 space-y-6">
                {category.requirements.map((requirement) => (
                  <div key={requirement.id} className="space-y-2">
                    <label
                      htmlFor={requirement.id}
                      className="block text-sm font-medium text-gray-700"
                    >
                      {requirement.question}
                      {requirement.required && (
                        <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                      )}
                    </label>
                    {renderInput(requirement)}
                    {requirement.isValid === false && (
                      <p id={`${requirement.id}-error`} className="mt-1 text-sm text-red-600">
                        {requirement.errorMessage}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className={`w-full py-3 px-6 rounded-md text-white font-medium text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isLoading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="inline-block h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            submitButtonText
          )}
        </button>
      </div>
    </div>
  );
};

export default GatherRequirements;