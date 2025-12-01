import React, { useState, useEffect } from 'react';

interface BusinessSpecification {
  name: string;
  description: string;
  industry: string;
  targetAudience: string;
  uniqueSellingProposition: string;
}

interface CreateBusinessSpecificationProps {
  onCreate: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [uniqueSellingProposition, setUniqueSellingProposition] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading some initial data if needed
    // setIsLoading(true);
    // setTimeout(() => {
    //   setIsLoading(false);
    // }, 500);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Basic validation
      if (!name || !description || !industry || !targetAudience || !uniqueSellingProposition) {
        throw new Error('All fields are required.');
      }

      const newSpecification: BusinessSpecification = {
        name,
        description,
        industry,
        targetAudience,
        uniqueSellingProposition,
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      onCreate(newSpecification);
    } catch (err: any) {
      setError(err.message || 'Failed to create business specification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4">Create Business Specification</h2>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
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
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
              Description:
            </label>
            <textarea
              id="description"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label="Business Description"
            />
          </div>

          <div>
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
            />
          </div>

          <div>
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
            />
          </div>

          <div>
            <label htmlFor="uniqueSellingProposition" className="block text-gray-700 text-sm font-bold mb-2">
              Unique Selling Proposition:
            </label>
            <input
              type="text"
              id="uniqueSellingProposition"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={uniqueSellingProposition}
              onChange={(e) => setUniqueSellingProposition(e.target.value)}
              aria-label="Unique Selling Proposition"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
              onClick={onCancel}
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
    </div>
  );
};

export default CreateBusinessSpecification;

import React, { useState, useEffect } from 'react';

interface BusinessSpecification {
  name: string;
  description: string;
  industry: string;
  targetAudience: string;
  uniqueSellingProposition: string;
}

interface CreateBusinessSpecificationProps {
  onCreate: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [uniqueSellingProposition, setUniqueSellingProposition] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading some initial data if needed
    // setIsLoading(true);
    // setTimeout(() => {
    //   setIsLoading(false);
    // }, 500);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Basic validation
      if (!name || !description || !industry || !targetAudience || !uniqueSellingProposition) {
        throw new Error('All fields are required.');
      }

      const newSpecification: BusinessSpecification = {
        name,
        description,
        industry,
        targetAudience,
        uniqueSellingProposition,
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      onCreate(newSpecification);
    } catch (err: any) {
      setError(err.message || 'Failed to create business specification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4">Create Business Specification</h2>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
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
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
              Description:
            </label>
            <textarea
              id="description"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label="Business Description"
            />
          </div>

          <div>
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
            />
          </div>

          <div>
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
            />
          </div>

          <div>
            <label htmlFor="uniqueSellingProposition" className="block text-gray-700 text-sm font-bold mb-2">
              Unique Selling Proposition:
            </label>
            <input
              type="text"
              id="uniqueSellingProposition"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={uniqueSellingProposition}
              onChange={(e) => setUniqueSellingProposition(e.target.value)}
              aria-label="Unique Selling Proposition"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
              onClick={onCancel}
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
    </div>
  );
};

export default CreateBusinessSpecification;