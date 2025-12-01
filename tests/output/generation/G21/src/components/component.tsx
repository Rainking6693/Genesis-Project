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
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSpecification((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise((resolve) => setTimeout(resolve, 500));

      onCreate(specification);
    } catch (err: any) {
      setError(err.message || 'Failed to create specification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-800">Create Ecommerce Business Specification</h3>
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="mb-4">
            <label htmlFor="businessName" className="block text-gray-700 text-sm font-bold mb-2">
              Business Name
            </label>
            <input
              type="text"
              id="businessName"
              name="businessName"
              value={specification.businessName}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Business Name"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="targetAudience" className="block text-gray-700 text-sm font-bold mb-2">
              Target Audience
            </label>
            <textarea
              id="targetAudience"
              name="targetAudience"
              value={specification.targetAudience}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Target Audience"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="valueProposition" className="block text-gray-700 text-sm font-bold mb-2">
              Value Proposition
            </label>
            <textarea
              id="valueProposition"
              name="valueProposition"
              value={specification.valueProposition}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Value Proposition"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="keyFeatures" className="block text-gray-700 text-sm font-bold mb-2">
              Key Features
            </label>
            <textarea
              id="keyFeatures"
              name="keyFeatures"
              value={specification.keyFeatures}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Key Features"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="revenueModel" className="block text-gray-700 text-sm font-bold mb-2">
              Revenue Model
            </label>
            <input
              type="text"
              id="revenueModel"
              name="revenueModel"
              value={specification.revenueModel}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Revenue Model"
              required
            />
          </div>

          {error && <div className="text-red-500 mb-4">{error}</div>}

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
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
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSpecification((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise((resolve) => setTimeout(resolve, 500));

      onCreate(specification);
    } catch (err: any) {
      setError(err.message || 'Failed to create specification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-800">Create Ecommerce Business Specification</h3>
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="mb-4">
            <label htmlFor="businessName" className="block text-gray-700 text-sm font-bold mb-2">
              Business Name
            </label>
            <input
              type="text"
              id="businessName"
              name="businessName"
              value={specification.businessName}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Business Name"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="targetAudience" className="block text-gray-700 text-sm font-bold mb-2">
              Target Audience
            </label>
            <textarea
              id="targetAudience"
              name="targetAudience"
              value={specification.targetAudience}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Target Audience"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="valueProposition" className="block text-gray-700 text-sm font-bold mb-2">
              Value Proposition
            </label>
            <textarea
              id="valueProposition"
              name="valueProposition"
              value={specification.valueProposition}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Value Proposition"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="keyFeatures" className="block text-gray-700 text-sm font-bold mb-2">
              Key Features
            </label>
            <textarea
              id="keyFeatures"
              name="keyFeatures"
              value={specification.keyFeatures}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Key Features"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="revenueModel" className="block text-gray-700 text-sm font-bold mb-2">
              Revenue Model
            </label>
            <input
              type="text"
              id="revenueModel"
              name="revenueModel"
              value={specification.revenueModel}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Revenue Model"
              required
            />
          </div>

          {error && <div className="text-red-500 mb-4">{error}</div>}

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBusinessSpecification;