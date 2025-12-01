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
  type: 'boolean' | 'text' | 'multiple-choice' | 'number';
  options?: string[];
  placeholder?: string;
  required: boolean;
  validation?: (value: any) => boolean;
  errorMessage?: string;
}

interface GatheredRequirement {
  requirementId: string;
  value: any;
  isValid: boolean;
}

interface GatherRequirementsProps {
  categories: RequirementCategory[];
  onSubmit: (requirements: Record<string, any>) => Promise<void>;
  isLoading?: boolean;
  submitButtonText?: string;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({
  categories,
  onSubmit,
  isLoading = false,
  submitButtonText = 'Submit Requirements',
}) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [gatheredRequirements, setGatheredRequirements] = useState<GatheredRequirement[]>([]);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const handleRequirementChange = useCallback((requirementId: string, value: any, isValid: boolean) => {
    setGatheredRequirements(prev => {
      const existingIndex = prev.findIndex(r => r.requirementId === requirementId);

      if (existingIndex >= 0) {
        return prev.map((req, index) =>
          index === existingIndex ? { requirementId, value, isValid } : req
        );
      }

      return [...prev, { requirementId, value, isValid }];
    });
  }, []);

  const validateRequirement = useCallback((requirement: Requirement, value: any): boolean => {
    if (requirement.required && (value === undefined || value === null || value === '')) {
      return false;
    }

    if (requirement.validation) {
      return requirement.validation(value);
    }

    return true;
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmissionError(null);
    setIsSubmitting(true);

    // Validate all requirements before submission
    const allRequirementsValid = categories.every(category =>
      category.requirements.every(requirement => {
        const gathered = gatheredRequirements.find(r => r.requirementId === requirement.id);
        if (!gathered && !requirement.required) return true;
        return gathered?.isValid ?? false;
      })
    );

    if (!allRequirementsValid) {
      setSubmissionError('Please complete all required fields correctly before submitting.');
      setIsSubmitting(false);
      return;
    }

    try {
      const submissionData = gatheredRequirements.reduce((acc, { requirementId, value }) => {
        acc[requirementId] = value;
        return acc;
      }, {} as Record<string, any>);

      await onSubmit(submissionData);
    } catch (error) {
      setSubmissionError('Failed to submit requirements. Please try again.');
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [categories, gatheredRequirements, onSubmit]);

  const getRequirementValue = useCallback((requirementId: string) => {
    return gatheredRequirements.find(r => r.requirementId === requirementId)?.value;
  }, [gatheredRequirements]);

  const isRequirementValid = useCallback((requirementId: string) => {
    return gatheredRequirements.find(r => r.requirementId === requirementId)?.isValid ?? false;
  }, [gatheredRequirements]);

  useEffect(() => {
    // Initialize with default values for required fields if not present
    categories.forEach(category => {
      category.requirements.forEach(requirement => {
        if (requirement.required && !gatheredRequirements.some(r => r.requirementId === requirement.id)) {
          const defaultValue = requirement.type === 'boolean' ? false : '';
          handleRequirementChange(
            requirement.id,
            defaultValue,
            validateRequirement(requirement, defaultValue)
          );
        }
      });
    });
  }, [categories, gatheredRequirements, handleRequirementChange, validateRequirement]);

  const renderRequirementInput = useCallback((requirement: Requirement) => {
    const value = getRequirementValue(requirement.id);
    const isValid = isRequirementValid(requirement.id);
    const errorId = `error-${requirement.id}`;

    const handleChange = (newValue: any) => {
      const newIsValid = validateRequirement(requirement, newValue);
      handleRequirementChange(requirement.id, newValue, newIsValid);
    };

    switch (requirement.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-3">
            <button
              type="button"
              className={`w-6 h-6 flex items-center justify-center rounded border-2 transition-colors ${
                value ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
              }`}
              onClick={() => handleChange(!value)}
              aria-checked={value}
              aria-labelledby={errorId}
            >
              {value && <Check className="w-4 h-4 text-white" />}
            </button>
            <span className="text-sm">{requirement.question}</span>
          </div>
        );

      case 'multiple-choice':
        return (
          <div className="space-y-2">
            <label htmlFor={requirement.id} className="block text-sm font-medium text-gray-700 mb-1">
              {requirement.question}
              {requirement.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-1">
              {requirement.options?.map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="radio"
                    id={`${requirement.id}-${index}`}
                    name={requirement.id}
                    value={option}
                    checked={value === option}
                    onChange={() => handleChange(option)}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    aria-labelledby={errorId}
                  />
                  <label
                    htmlFor={`${requirement.id}-${index}`}
                    className="ml-2 block text-sm text-gray-700"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </div>
            {!isValid && (
              <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
                {requirement.errorMessage || 'This field is required'}
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <div>
            <label htmlFor={requirement.id} className="block text-sm font-medium text-gray-700">
              {requirement.question}
              {requirement.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                id={requirement.id}
                value={value || ''}
                onChange={(e) => handleChange(e.target.value ? Number(e.target.value) : '')}
                className={`block w-full pr-10 sm:text-sm rounded-md ${
                  isValid
                    ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                }`}
                placeholder={requirement.placeholder}
                aria-invalid={!isValid}
                aria-describedby={!isValid ? errorId : undefined}
              />
              {!isValid && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
                </div>
              )}
            </div>
            {!isValid && (
              <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
                {requirement.errorMessage || 'Please enter a valid number'}
              </p>
            )}
          </div>
        );

      case 'text':
      default:
        return (
          <div>
            <label htmlFor={requirement.id} className="block text-sm font-medium text-gray-700">
              {requirement.question}
              {requirement.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              {requirement.options ? (
                <select
                  id={requirement.id}
                  value={value || ''}
                  onChange={(e) => handleChange(e.target.value)}
                  className={`block w-full pl-3 pr-10 py-2 sm:text-sm rounded-md ${
                    isValid
                      ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  }`}
                  aria-invalid={!isValid}
                  aria-describedby={!isValid ? errorId : undefined}
                >
                  <option value="">{requirement.placeholder || 'Select an option'}</option>
                  {requirement.options.map((option, index) => (
                    <option key={index} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    id={requirement.id}
                    value={value || ''}
                    onChange={(e) => handleChange(e.target.value)}
                    className={`block w-full pr-10 sm:text-sm rounded-md ${
                      isValid
                        ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    }`}
                    placeholder={requirement.placeholder}
                    aria-invalid={!isValid}
                    aria-describedby={!isValid ? errorId : undefined}
                  />
                  {!isValid && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
                    </div>
                  )}
                </>
              )}
            </div>
            {!isValid && (
              <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
                {requirement.errorMessage || 'This field is required'}
              </p>
            )}
          </div>
        );
    }
  }, [getRequirementValue, isRequirementValid, validateRequirement, handleRequirementChange]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory(category.id)}
              className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center"
              aria-expanded={expandedCategories.includes(category.id)}
              aria-controls={`category-${category.id}`}
            >
              <div>
                <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{category.description}</p>
              </div>
              {expandedCategories.includes(category.id) ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>

            <div
              id={`category-${category.id}`}
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                expandedCategories.includes(category.id) ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
              aria-labelledby={`category-${category.id}-heading`}
            >
              <div className="p-4 space-y-6 bg-white">
                {category.requirements.map((requirement) => (
                  <div key={requirement.id} className="space-y-1">
                    {renderRequirementInput(requirement)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {submissionError && (
          <div className="rounded-md bg-red-50 p-4" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{submissionError}</h3>
              </div>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className={`w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isSubmitting || isLoading
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {(isSubmitting || isLoading) && (
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
            )}
            {submitButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GatherRequirements;