import React, { useState } from 'react';

interface BusinessSpecification {
  businessName: string;
  businessType: string;
  targetAudience: string;
  valueProposition: string;
  keyFeatures: string;
  revenueModel: string;
}

interface CreateBusinessSpecificationProps {
  onCreate: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const initialSpecification: BusinessSpecification = {
  businessName: '',
  businessType: 'ecommerce',
  targetAudience: '',
  valueProposition: '',
  keyFeatures: '',
  revenueModel: '',
};

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate, onCancel }) => {
  const [specification, setSpecification] = useState<BusinessSpecification>(initialSpecification);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSpecification(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      onCreate(specification);
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the specification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-md shadow-md">
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
            placeholder="What value do you offer to your customers?"
            aria-label="Value Proposition"
            rows={3}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="keyFeatures" className="block text-gray-700 text-sm font-bold mb-2">
            Key Features:
          </label>
          <textarea
            id="keyFeatures"
            name="keyFeatures"
            value={specification.keyFeatures}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="List the key features of your ecommerce platform"
            aria-label="Key Features"
            rows={3}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="revenueModel" className="block text-gray-700 text-sm font-bold mb-2">
            Revenue Model:
          </label>
          <input
            type="text"
            id="revenueModel"
            name="revenueModel"
            value={specification.revenueModel}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="How will you generate revenue?"
            aria-label="Revenue Model"
            required
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create'}
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
  keyFeatures: string;
  revenueModel: string;
}

interface CreateBusinessSpecificationProps {
  onCreate: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const initialSpecification: BusinessSpecification = {
  businessName: '',
  businessType: 'ecommerce',
  targetAudience: '',
  valueProposition: '',
  keyFeatures: '',
  revenueModel: '',
};

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate, onCancel }) => {
  const [specification, setSpecification] = useState<BusinessSpecification>(initialSpecification);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSpecification(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      onCreate(specification);
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the specification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-md shadow-md">
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
            placeholder="What value do you offer to your customers?"
            aria-label="Value Proposition"
            rows={3}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="keyFeatures" className="block text-gray-700 text-sm font-bold mb-2">
            Key Features:
          </label>
          <textarea
            id="keyFeatures"
            name="keyFeatures"
            value={specification.keyFeatures}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="List the key features of your ecommerce platform"
            aria-label="Key Features"
            rows={3}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="revenueModel" className="block text-gray-700 text-sm font-bold mb-2">
            Revenue Model:
          </label>
          <input
            type="text"
            id="revenueModel"
            name="revenueModel"
            value={specification.revenueModel}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="How will you generate revenue?"
            aria-label="Revenue Model"
            required
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBusinessSpecification;