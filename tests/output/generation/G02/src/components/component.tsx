import React, { useState, useEffect } from 'react';

interface BusinessSpecification {
  name: string;
  description: string;
  industry: string;
  targetAudience: string;
  uniqueSellingProposition: string;
}

interface CreateBusinessSpecificationProps {
  onSubmit: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [uniqueSellingProposition, setUniqueSellingProposition] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset error on component mount/unmount
    return () => setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const specification: BusinessSpecification = {
        name,
        description,
        industry,
        targetAudience,
        uniqueSellingProposition,
      };

      // Simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 500));

      onSubmit(specification);
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the specification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="block text-gray-700 text-xl font-bold mb-2">Create Business Specification</h2>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Business Name:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="name"
            type="text"
            placeholder="Enter business name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            placeholder="Enter business description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Business Description"
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
            placeholder="Enter industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            aria-label="Industry"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="targetAudience">
            Target Audience:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="targetAudience"
            type="text"
            placeholder="Enter target audience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            aria-label="Target Audience"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="uniqueSellingProposition">
            Unique Selling Proposition:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="uniqueSellingProposition"
            type="text"
            placeholder="Enter unique selling proposition"
            value={uniqueSellingProposition}
            onChange={(e) => setUniqueSellingProposition(e.target.value)}
            aria-label="Unique Selling Proposition"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
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

import React, { useState, useEffect } from 'react';

interface BusinessSpecification {
  name: string;
  description: string;
  industry: string;
  targetAudience: string;
  uniqueSellingProposition: string;
}

interface CreateBusinessSpecificationProps {
  onSubmit: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [uniqueSellingProposition, setUniqueSellingProposition] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset error on component mount/unmount
    return () => setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const specification: BusinessSpecification = {
        name,
        description,
        industry,
        targetAudience,
        uniqueSellingProposition,
      };

      // Simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 500));

      onSubmit(specification);
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the specification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="block text-gray-700 text-xl font-bold mb-2">Create Business Specification</h2>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Business Name:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="name"
            type="text"
            placeholder="Enter business name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            placeholder="Enter business description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Business Description"
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
            placeholder="Enter industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            aria-label="Industry"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="targetAudience">
            Target Audience:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="targetAudience"
            type="text"
            placeholder="Enter target audience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            aria-label="Target Audience"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="uniqueSellingProposition">
            Unique Selling Proposition:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="uniqueSellingProposition"
            type="text"
            placeholder="Enter unique selling proposition"
            value={uniqueSellingProposition}
            onChange={(e) => setUniqueSellingProposition(e.target.value)}
            aria-label="Unique Selling Proposition"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
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