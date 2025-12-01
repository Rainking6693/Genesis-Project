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

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate, onCancel }) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const newSpecification: BusinessSpecification = {
        name,
        description,
        industry,
        targetAudience,
      };

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      onCreate(newSpecification);
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the specification.');
    } finally {
      setLoading(false);
    }
  }, [name, description, industry, targetAudience, onCreate]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Create Business Specification
          </h3>
          <div className="mt-2 px-7 py-3">
            {error && <div className="text-red-500 mb-2">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
                  Name:
                </label>
                <input
                  type="text"
                  id="name"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-label="Business Name"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
                  Description:
                </label>
                <textarea
                  id="description"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  aria-label="Business Description"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="industry" className="block text-gray-700 text-sm font-bold mb-2">
                  Industry:
                </label>
                <input
                  type="text"
                  id="industry"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  aria-label="Business Industry"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="targetAudience" className="block text-gray-700 text-sm font-bold mb-2">
                  Target Audience:
                </label>
                <input
                  type="text"
                  id="targetAudience"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  aria-label="Target Audience"
                  required
                />
              </div>
              <div className="items-center px-4 py-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ml-4 px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
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

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate, onCancel }) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const newSpecification: BusinessSpecification = {
        name,
        description,
        industry,
        targetAudience,
      };

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      onCreate(newSpecification);
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the specification.');
    } finally {
      setLoading(false);
    }
  }, [name, description, industry, targetAudience, onCreate]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Create Business Specification
          </h3>
          <div className="mt-2 px-7 py-3">
            {error && <div className="text-red-500 mb-2">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
                  Name:
                </label>
                <input
                  type="text"
                  id="name"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-label="Business Name"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
                  Description:
                </label>
                <textarea
                  id="description"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  aria-label="Business Description"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="industry" className="block text-gray-700 text-sm font-bold mb-2">
                  Industry:
                </label>
                <input
                  type="text"
                  id="industry"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  aria-label="Business Industry"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="targetAudience" className="block text-gray-700 text-sm font-bold mb-2">
                  Target Audience:
                </label>
                <input
                  type="text"
                  id="targetAudience"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  aria-label="Target Audience"
                  required
                />
              </div>
              <div className="items-center px-4 py-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ml-4 px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBusinessSpecification;