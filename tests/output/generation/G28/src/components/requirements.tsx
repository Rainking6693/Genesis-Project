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
        if (!gathered) return false;
        return gathered.isValid;
      })
    );

    if (!allRequirementsValid) {
      setSubmissionError('Please complete all required fields correctly before submitting.');
      setIsSubmitting(false);
      return;
    }

    try {
      const submissionData = gatheredRequirements.reduce((acc, req) => {
        acc[req.requirementId] = req.value;
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

  useEffect(() => {
    // Initialize with default values for non-required fields
    const initialRequirements = categories.flatMap(category =>
      category.requirements
        .filter(req => !req.required)
        .map(req => ({
          requirementId: req.id,
          value: req.type === 'boolean' ? false : req.type === 'number' ? 0 : '',
          isValid: true,
        }))
    );

    setGatheredRequirements(initialRequirements);
  }, [categories]);

  const getRequirementValue = useCallback((requirementId: string) => {
    const requirement = gatheredRequirements.find(r => r.requirementId === requirementId);
    return requirement ? requirement.value : null;
  }, [gatheredRequirements]);

  const isCategoryComplete = useCallback((category: RequirementCategory): boolean => {
    return category.requirements.every(requirement => {
      const gathered = gatheredRequirements.find(r => r.requirementId === requirement.id);
      if (!requirement.required && !gathered) return true;
      if (!gathered) return false;
      return gathered.isValid;
    });
  }, [gatheredRequirements]);

  const renderRequirementInput = useCallback((requirement: Requirement) => {
    const currentValue = getRequirementValue(requirement.id);
    const isValid = validateRequirement(requirement, currentValue);

    const handleChange = (value: any) => {
      handleRequirementChange(requirement.id, value, validateRequirement(requirement, value));
    };

    switch (requirement.type) {
      case 'boolean':
        return (
          <button
            type="button"
            className={`flex items-center justify-between w-full p-3 border rounded-lg ${
              !isValid ? 'border-red-500' : 'border-gray-300'
            }`}
            onClick={() => handleChange(!currentValue)}
            aria-pressed={currentValue}
            role="switch"
            aria-labelledby={`req-${requirement.id}-label`}
          >
            <span id={`req-${requirement.id}-label`} className="text-sm font-medium">
              {requirement.question}
              {requirement.required && <span className="text-red-500 ml-1">*</span>}
            </span>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              currentValue ? 'bg-blue-600' : 'bg-gray-200'
            }`}>
              {currentValue && <Check className="w-4 h-4 text-white" />}
            </div>
          </button>
        );

      case 'multiple-choice':
        return (
          <div className="space-y-2">
            <label htmlFor={`req-${requirement.id}`} className="block text-sm font-medium mb-1">
              {requirement.question}
              {requirement.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-1">
              {(requirement.options || []).map((option, index) => (
                <button
                  key={index}
                  type="button"
                  className={`w-full text-left p-3 border rounded-lg ${
                    currentValue === option
                      ? 'border-blue-500 bg-blue-50'
                      : !isValid
                      ? 'border-red-500'
                      : 'border-gray-300'
                  }`}
                  onClick={() => handleChange(option)}
                  aria-checked={currentValue === option}
                  role="radio"
                  aria-labelledby={`req-${requirement.id}-label`}
                >
                  {option}
                </button>
              ))}
            </div>
            {!isValid && requirement.errorMessage && (
              <p className="mt-1 text-xs text-red-600">{requirement.errorMessage}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div>
            <label htmlFor={`req-${requirement.id}`} className="block text-sm font-medium mb-1">
              {requirement.question}
              {requirement.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              id={`req-${requirement.id}`}
              className={`w-full p-3 border rounded-lg ${
                !isValid ? 'border-red-500' : 'border-gray-300'
              }`}
              value={currentValue || ''}
              onChange={(e) => handleChange(e.target.value ? Number(e.target.value) : '')}
              placeholder={requirement.placeholder}
              aria-invalid={!isValid}
              aria-describedby={!isValid ? `req-${requirement.id}-error` : undefined}
            />
            {!isValid && requirement.errorMessage && (
              <p id={`req-${requirement.id}-error`} className="mt-1 text-xs text-red-600">
                {requirement.errorMessage}
              </p>
            )}
          </div>
        );

      case 'text':
      default:
        return (
          <div>
            <label htmlFor={`req-${requirement.id}`} className="block text-sm font-medium mb-1">
              {requirement.question}
              {requirement.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {requirement.options ? (
              <select
                id={`req-${requirement.id}`}
                className={`w-full p-3 border rounded-lg ${
                  !isValid ? 'border-red-500' : 'border-gray-300'
                }`}
                value={currentValue || ''}
                onChange={(e) => handleChange(e.target.value)}
                aria-invalid={!isValid}
                aria-describedby={!isValid ? `req-${requirement.id}-error` : undefined}
              >
                <option value="">{requirement.placeholder || 'Select an option'}</option>
                {requirement.options.map((option, index) => (
                  <option key={index} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id={`req-${requirement.id}`}
                className={`w-full p-3 border rounded-lg ${
                  !isValid ? 'border-red-500' : 'border-gray-300'
                }`}
                value={currentValue || ''}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={requirement.placeholder}
                aria-invalid={!isValid}
                aria-describedby={!isValid ? `req-${requirement.id}-error` : undefined}
              />
            )}
            {!isValid && requirement.errorMessage && (
              <p id={`req-${requirement.id}-error`} className="mt-1 text-xs text-red-600">
                {requirement.errorMessage}
              </p>
            )}
          </div>
        );
    }
  }, [getRequirementValue, validateRequirement, handleRequirementChange]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gather Business Requirements</h1>

      {submissionError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md" role="alert">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-sm text-red-700">{submissionError}</p>
          </div>
        </div>
      )}

      <div className="space-y-6 mb-8">
        {categories.map((category) => {
          const isComplete = isCategoryComplete(category);
          const isExpanded = expandedCategories.includes(category.id);

          return (
            <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full p-5 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => toggleCategory(category.id)}
                aria-expanded={isExpanded}
                aria-controls={`category-${category.id}-content`}
              >
                <div className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-3 ${
                    isComplete ? 'bg-green-500' : 'bg-gray-300'
                  }`} aria-hidden="true" />
                  <h2 className="text-lg font-semibold text-gray-900">{category.name}</h2>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                )}
              </button>

              <div
                id={`category-${category.id}-content`}
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-5 pt-0 space-y-5">
                  <p className="text-sm text-gray-600 mb-4">{category.description}</p>

                  <div className="space-y-4">
                    {category.requirements.map((requirement) => (
                      <div key={requirement.id} className="space-y-1">
                        {renderRequirementInput(requirement)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || isLoading}
          className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center ${
            isSubmitting || isLoading
              ? 'bg-blue-300 text-white cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {(isSubmitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitButtonText}
        </button>
      </div>
    </div>
  );
};

export default GatherRequirements;