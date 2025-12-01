import React, { useState, useCallback } from 'react';

interface BusinessSpecification {
  name: string;
  description: string;
  industry: string;
  targetAudience: string;
}

interface CreateBusinessSpecificationProps {
  onCreate: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const initialSpecification: BusinessSpecification = {
  name: '',
  description: '',
  industry: '',
  targetAudience: '',
};

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate, onCancel }) => {
  const [specification, setSpecification] = useState<BusinessSpecification>(initialSpecification);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSpecification((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Simulate API call with a promise
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network latency

      onCreate(specification);
      setSpecification(initialSpecification); // Reset form
    } catch (err: any) {
      setError(err.message || 'Failed to create business specification.');
    } finally {
      setLoading(false);
    }
  }, [onCreate, specification]);

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="block text-gray-700 text-xl font-bold mb-2">Create Business Specification</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Business Name:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="name"
            type="text"
            name="name"
            placeholder="Enter business name"
            value={specification.name}
            onChange={handleChange}
            aria-label="Business Name"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Description:
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="description"
            name="description"
            placeholder="Enter business description"
            value={specification.description}
            onChange={handleChange}
            aria-label="Business Description"
            rows={3}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="industry">
            Industry:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="industry"
            type="text"
            name="industry"
            placeholder="Enter industry"
            value={specification.industry}
            onChange={handleChange}
            aria-label="Industry"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="targetAudience">
            Target Audience:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="targetAudience"
            type="text"
            name="targetAudience"
            placeholder="Enter target audience"
            value={specification.targetAudience}
            onChange={handleChange}
            aria-label="Target Audience"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
          <button
            className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBusinessSpecification;

import React, { useState, useCallback } from 'react';

interface BusinessSpecification {
  name: string;
  description: string;
  industry: string;
  targetAudience: string;
}

interface CreateBusinessSpecificationProps {
  onCreate: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const initialSpecification: BusinessSpecification = {
  name: '',
  description: '',
  industry: '',
  targetAudience: '',
};

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate, onCancel }) => {
  const [specification, setSpecification] = useState<BusinessSpecification>(initialSpecification);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSpecification((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Simulate API call with a promise
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network latency

      onCreate(specification);
      setSpecification(initialSpecification); // Reset form
    } catch (err: any) {
      setError(err.message || 'Failed to create business specification.');
    } finally {
      setLoading(false);
    }
  }, [onCreate, specification]);

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="block text-gray-700 text-xl font-bold mb-2">Create Business Specification</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Business Name:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="name"
            type="text"
            name="name"
            placeholder="Enter business name"
            value={specification.name}
            onChange={handleChange}
            aria-label="Business Name"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Description:
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="description"
            name="description"
            placeholder="Enter business description"
            value={specification.description}
            onChange={handleChange}
            aria-label="Business Description"
            rows={3}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="industry">
            Industry:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="industry"
            type="text"
            name="industry"
            placeholder="Enter industry"
            value={specification.industry}
            onChange={handleChange}
            aria-label="Industry"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="targetAudience">
            Target Audience:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="targetAudience"
            type="text"
            name="targetAudience"
            placeholder="Enter target audience"
            value={specification.targetAudience}
            onChange={handleChange}
            aria-label="Target Audience"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
          <button
            className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBusinessSpecification;