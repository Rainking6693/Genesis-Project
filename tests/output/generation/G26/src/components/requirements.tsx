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

interface GatheredRequirements {
  [categoryId: string]: {
    [requirementId: string]: any;
  };
}

interface GatherRequirementsProps {
  categories: RequirementCategory[];
  onSubmit: (requirements: GatheredRequirements) => Promise<void>;
  isLoading?: boolean;
  submitButtonText?: string;
}

const GatherRequirements = ({
  categories,
  onSubmit,
  isLoading: externalLoading,
  submitButtonText = 'Submit Requirements'
}: GatherRequirementsProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [requirementsData, setRequirementsData] = useState<GatheredRequirements>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  const handleInputChange = useCallback(
    (categoryId: string, requirementId: string, value: any) => {
      setRequirementsData(prev => ({
        ...prev,
        [categoryId]: {
          ...prev[categoryId],
          [requirementId]: value
        }
      }));

      // Clear error when user starts typing
      if (errors[`${categoryId}-${requirementId}`]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`${categoryId}-${requirementId}`];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const validateRequirements = useCallback((): boolean => {
    let isValid = true;
    const newErrors: Record<string, string> = {};

    categories.forEach(category => {
      category.requirements.forEach(requirement => {
        const value = requirementsData[category.id]?.[requirement.id];
        const key = `${category.id}-${requirement.id}`;

        if (requirement.required && (value === undefined || value === null || value === '')) {
          newErrors[key] = 'This field is required';
          isValid = false;
        } else if (value !== undefined && requirement.validation && !requirement.validation(value)) {
          newErrors[key] = requirement.errorMessage || 'Invalid input';
          isValid = false;
        }
      });
    });

    setErrors(newErrors);
    return isValid;
  }, [categories, requirementsData]);

  const handleSubmit = useCallback(async () => {
    if (!validateRequirements()) return;

    setIsLoading(true);
    try {
      await onSubmit(requirementsData);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [requirementsData, onSubmit, validateRequirements]);

  const resetForm = useCallback(() => {
    setRequirementsData({});
    setErrors({});
    setIsSubmitted(false);
    setExpandedCategories(new Set());
  }, []);

  useEffect(() => {
    // Initialize with first category expanded if none are expanded
    if (categories.length > 0 && expandedCategories.size === 0) {
      setExpandedCategories(new Set([categories[0].id]));
    }
  }, [categories, expandedCategories.size]);

  if (isSubmitted) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center p-8">
          <Check className="mx-auto h-12 w-12 text-green-500 mb-4" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Requirements Submitted Successfully</h2>
          <p className="text-gray-600 mb-6">Thank you for providing your business requirements.</p>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Submit New Requirements
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Gather Business Requirements</h1>
      <p className="text-gray-600 mb-8">
        Please provide the following information about your ecommerce business to help us tailor the perfect solution.
      </p>

      <div className="space-y-6 mb-8">
        {categories.map(category => (
          <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory(category.id)}
              className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-expanded={expandedCategories.has(category.id)}
              aria-controls={`category-${category.id}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{category.name}</h2>
                {expandedCategories.has(category.id) ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" aria-hidden="true" />
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">{category.description}</p>
            </button>

            {expandedCategories.has(category.id) && (
              <div id={`category-${category.id}`} className="p-4 space-y-4">
                {category.requirements.map(requirement => (
                  <div key={requirement.id} className="space-y-2">
                    <label htmlFor={`${category.id}-${requirement.id}`} className="block text-sm font-medium text-gray-700">
                      {requirement.question}
                      {requirement.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {requirement.type === 'boolean' && (
                      <div className="flex items-center space-x-4">
                        <button
                          type="button"
                          onClick={() => handleInputChange(category.id, requirement.id, true)}
                          className={`flex items-center px-4 py-2 border rounded-md ${requirementsData[category.id]?.[requirement.id] === true ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}
                        >
                          <Check className={`h-4 w-4 mr-2 ${requirementsData[category.id]?.[requirement.id] === true ? 'text-indigo-600' : 'text-gray-300'}`} />
                          <span>Yes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange(category.id, requirement.id, false)}
                          className={`flex items-center px-4 py-2 border rounded-md ${requirementsData[category.id]?.[requirement.id] === false ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}
                        >
                          <Check className={`h-4 w-4 mr-2 ${requirementsData[category.id]?.[requirement.id] === false ? 'text-indigo-600' : 'text-gray-300'}`} />
                          <span>No</span>
                        </button>
                      </div>
                    )}

                    {requirement.type === 'multiple-choice' && requirement.options && (
                      <div className="space-y-2">
                        {requirement.options.map(option => (
                          <div key={option} className="flex items-center">
                            <input
                              id={`${category.id}-${requirement.id}-${option}`}
                              name={`${category.id}-${requirement.id}`}
                              type="radio"
                              checked={requirementsData[category.id]?.[requirement.id] === option}
                              onChange={() => handleInputChange(category.id, requirement.id, option)}
                              className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                            />
                            <label
                              htmlFor={`${category.id}-${requirement.id}-${option}`}
                              className="ml-3 block text-sm text-gray-700"
                            >
                              {option}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    {(requirement.type === 'text' || requirement.type === 'number') && (
                      <input
                        type={requirement.type}
                        id={`${category.id}-${requirement.id}`}
                        value={requirementsData[category.id]?.[requirement.id] || ''}
                        onChange={(e) => handleInputChange(category.id, requirement.id, requirement.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                        placeholder={requirement.placeholder}
                        className={`block w-full shadow-sm sm:text-sm rounded-md ${errors[`${category.id}-${requirement.id}`] ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'} px-3 py-2`}
                        aria-invalid={!!errors[`${category.id}-${requirement.id}`]}
                        aria-describedby={errors[`${category.id}-${requirement.id}`] ? `${category.id}-${requirement.id}-error` : undefined}
                      />
                    )}

                    {errors[`${category.id}-${requirement.id}`] && (
                      <p className="mt-1 text-sm text-red-600" id={`${category.id}-${requirement.id}-error`}>
                        <AlertCircle className="inline h-4 w-4 mr-1" aria-hidden="true" />
                        {errors[`${category.id}-${requirement.id}`]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || externalLoading}
          className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${isLoading || externalLoading ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200`}
          aria-busy={isLoading || externalLoading}
        >
          {(isLoading || externalLoading) && (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
          )}
          {submitButtonText}
        </button>
      </div>
    </div>
  );
};

export default GatherRequirements;