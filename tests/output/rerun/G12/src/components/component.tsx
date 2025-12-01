import React, { useState } from 'react';

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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const newSpecification: BusinessSpecification = {
        name,
        description,
        industry,
        targetAudience,
      };

      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500)); 

      onCreate(newSpecification);
    } catch (err: any) {
      setError(err.message || 'Failed to create business specification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Create Business Specification</h2>
        {error && <div className="text-red-500 mb-4">{error}</div>}
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
          <div className="flex items-center justify-between">
            <button
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
            <button
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="button"
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const newSpecification: BusinessSpecification = {
        name,
        description,
        industry,
        targetAudience,
      };

      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500)); 

      onCreate(newSpecification);
    } catch (err: any) {
      setError(err.message || 'Failed to create business specification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Create Business Specification</h2>
        {error && <div className="text-red-500 mb-4">{error}</div>}
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
          <div className="flex items-center justify-between">
            <button
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
            <button
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="button"
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