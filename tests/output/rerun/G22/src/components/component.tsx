import React, { useState } from 'react';

interface BusinessSpecification {
  businessName: string;
  businessDescription: string;
  targetAudience: string;
  valueProposition: string;
  keyFeatures: string;
  monetizationStrategy: string;
}

interface CreateBusinessSpecificationProps {
  onCreate: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate, onCancel }) => {
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [keyFeatures, setKeyFeatures] = useState('');
  const [monetizationStrategy, setMonetizationStrategy] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const specification: BusinessSpecification = {
        businessName,
        businessDescription,
        targetAudience,
        valueProposition,
        keyFeatures,
        monetizationStrategy,
      };

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
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Create Ecommerce Business Specification</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="businessName" className="block text-gray-700 text-sm font-bold mb-2">
            Business Name:
          </label>
          <input
            type="text"
            id="businessName"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            aria-label="Business Name"
          />
        </div>

        <div>
          <label htmlFor="businessDescription" className="block text-gray-700 text-sm font-bold mb-2">
            Business Description:
          </label>
          <textarea
            id="businessDescription"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            required
            aria-label="Business Description"
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
            required
            aria-label="Target Audience"
          />
        </div>

        <div>
          <label htmlFor="valueProposition" className="block text-gray-700 text-sm font-bold mb-2">
            Value Proposition:
          </label>
          <input
            type="text"
            id="valueProposition"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={valueProposition}
            onChange={(e) => setValueProposition(e.target.value)}
            required
            aria-label="Value Proposition"
          />
        </div>

        <div>
          <label htmlFor="keyFeatures" className="block text-gray-700 text-sm font-bold mb-2">
            Key Features:
          </label>
          <input
            type="text"
            id="keyFeatures"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={keyFeatures}
            onChange={(e) => setKeyFeatures(e.target.value)}
            required
            aria-label="Key Features"
          />
        </div>

        <div>
          <label htmlFor="monetizationStrategy" className="block text-gray-700 text-sm font-bold mb-2">
            Monetization Strategy:
          </label>
          <input
            type="text"
            id="monetizationStrategy"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={monetizationStrategy}
            onChange={(e) => setMonetizationStrategy(e.target.value)}
            required
            aria-label="Monetization Strategy"
          />
        </div>

        <div className="flex justify-between">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
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
  businessDescription: string;
  targetAudience: string;
  valueProposition: string;
  keyFeatures: string;
  monetizationStrategy: string;
}

interface CreateBusinessSpecificationProps {
  onCreate: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate, onCancel }) => {
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [keyFeatures, setKeyFeatures] = useState('');
  const [monetizationStrategy, setMonetizationStrategy] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const specification: BusinessSpecification = {
        businessName,
        businessDescription,
        targetAudience,
        valueProposition,
        keyFeatures,
        monetizationStrategy,
      };

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
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Create Ecommerce Business Specification</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="businessName" className="block text-gray-700 text-sm font-bold mb-2">
            Business Name:
          </label>
          <input
            type="text"
            id="businessName"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            aria-label="Business Name"
          />
        </div>

        <div>
          <label htmlFor="businessDescription" className="block text-gray-700 text-sm font-bold mb-2">
            Business Description:
          </label>
          <textarea
            id="businessDescription"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            required
            aria-label="Business Description"
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
            required
            aria-label="Target Audience"
          />
        </div>

        <div>
          <label htmlFor="valueProposition" className="block text-gray-700 text-sm font-bold mb-2">
            Value Proposition:
          </label>
          <input
            type="text"
            id="valueProposition"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={valueProposition}
            onChange={(e) => setValueProposition(e.target.value)}
            required
            aria-label="Value Proposition"
          />
        </div>

        <div>
          <label htmlFor="keyFeatures" className="block text-gray-700 text-sm font-bold mb-2">
            Key Features:
          </label>
          <input
            type="text"
            id="keyFeatures"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={keyFeatures}
            onChange={(e) => setKeyFeatures(e.target.value)}
            required
            aria-label="Key Features"
          />
        </div>

        <div>
          <label htmlFor="monetizationStrategy" className="block text-gray-700 text-sm font-bold mb-2">
            Monetization Strategy:
          </label>
          <input
            type="text"
            id="monetizationStrategy"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={monetizationStrategy}
            onChange={(e) => setMonetizationStrategy(e.target.value)}
            required
            aria-label="Monetization Strategy"
          />
        </div>

        <div className="flex justify-between">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBusinessSpecification;