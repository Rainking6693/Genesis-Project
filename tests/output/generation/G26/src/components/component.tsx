import React, { useState } from 'react';

interface BusinessSpecification {
  businessName: string;
  businessType: string;
  targetAudience: string;
  valueProposition: string;
  uniqueSellingPoint: string;
  missionStatement: string;
}

interface CreateBusinessSpecificationProps {
  onSubmit: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const initialSpecification: BusinessSpecification = {
  businessName: '',
  businessType: 'ecommerce',
  targetAudience: '',
  valueProposition: '',
  uniqueSellingPoint: '',
  missionStatement: '',
};

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onSubmit, onCancel }) => {
  const [specification, setSpecification] = useState<BusinessSpecification>(initialSpecification);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSpecification({ ...specification, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500)); 

      onSubmit(specification);
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-semibold mb-4">Create Ecommerce Business Specification</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="businessName" className="block text-gray-700 text-sm font-bold mb-2">
            Business Name:
          </label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            value={specification.businessName}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter business name"
            aria-label="Business Name"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="targetAudience" className="block text-gray-700 text-sm font-bold mb-2">
            Target Audience:
          </label>
          <textarea
            id="targetAudience"
            name="targetAudience"
            value={specification.targetAudience}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Describe your target audience"
            aria-label="Target Audience"
            rows={3}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="valueProposition" className="block text-gray-700 text-sm font-bold mb-2">
            Value Proposition:
          </label>
          <textarea
            id="valueProposition"
            name="valueProposition"
            value={specification.valueProposition}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="What value do you provide to customers?"
            aria-label="Value Proposition"
            rows={3}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="uniqueSellingPoint" className="block text-gray-700 text-sm font-bold mb-2">
            Unique Selling Point:
          </label>
          <textarea
            id="uniqueSellingPoint"
            name="uniqueSellingPoint"
            value={specification.uniqueSellingPoint}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="What makes you different from competitors?"
            aria-label="Unique Selling Point"
            rows={3}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="missionStatement" className="block text-gray-700 text-sm font-bold mb-2">
            Mission Statement:
          </label>
          <textarea
            id="missionStatement"
            name="missionStatement"
            value={specification.missionStatement}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="What is your company's mission?"
            aria-label="Mission Statement"
            rows={3}
            required
          />
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBusinessSpecification;

import React, { useState } from 'react';

interface BusinessSpecification {
  businessName: string;
  businessType: string;
  targetAudience: string;
  valueProposition: string;
  uniqueSellingPoint: string;
  missionStatement: string;
}

interface CreateBusinessSpecificationProps {
  onSubmit: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const initialSpecification: BusinessSpecification = {
  businessName: '',
  businessType: 'ecommerce',
  targetAudience: '',
  valueProposition: '',
  uniqueSellingPoint: '',
  missionStatement: '',
};

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onSubmit, onCancel }) => {
  const [specification, setSpecification] = useState<BusinessSpecification>(initialSpecification);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSpecification({ ...specification, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500)); 

      onSubmit(specification);
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-semibold mb-4">Create Ecommerce Business Specification</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="businessName" className="block text-gray-700 text-sm font-bold mb-2">
            Business Name:
          </label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            value={specification.businessName}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter business name"
            aria-label="Business Name"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="targetAudience" className="block text-gray-700 text-sm font-bold mb-2">
            Target Audience:
          </label>
          <textarea
            id="targetAudience"
            name="targetAudience"
            value={specification.targetAudience}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Describe your target audience"
            aria-label="Target Audience"
            rows={3}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="valueProposition" className="block text-gray-700 text-sm font-bold mb-2">
            Value Proposition:
          </label>
          <textarea
            id="valueProposition"
            name="valueProposition"
            value={specification.valueProposition}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="What value do you provide to customers?"
            aria-label="Value Proposition"
            rows={3}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="uniqueSellingPoint" className="block text-gray-700 text-sm font-bold mb-2">
            Unique Selling Point:
          </label>
          <textarea
            id="uniqueSellingPoint"
            name="uniqueSellingPoint"
            value={specification.uniqueSellingPoint}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="What makes you different from competitors?"
            aria-label="Unique Selling Point"
            rows={3}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="missionStatement" className="block text-gray-700 text-sm font-bold mb-2">
            Mission Statement:
          </label>
          <textarea
            id="missionStatement"
            name="missionStatement"
            value={specification.missionStatement}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="What is your company's mission?"
            aria-label="Mission Statement"
            rows={3}
            required
          />
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBusinessSpecification;