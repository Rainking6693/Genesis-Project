import React, { useState } from 'react';

interface BusinessSpecification {
  businessName: string;
  businessType: 'ecommerce';
  targetAudience: string;
  valueProposition: string;
  uniqueSellingPoint: string;
  websiteUrl?: string;
}

interface CreateBusinessSpecificationProps {
  onSubmit: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onSubmit, onCancel }) => {
  const [businessName, setBusinessName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [uniqueSellingPoint, setUniqueSellingPoint] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const specification: BusinessSpecification = {
        businessName,
        businessType: 'ecommerce',
        targetAudience,
        valueProposition,
        uniqueSellingPoint,
        websiteUrl,
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
    <div className="container mx-auto p-4">
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
          <textarea
            id="valueProposition"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={valueProposition}
            onChange={(e) => setValueProposition(e.target.value)}
            required
            aria-label="Value Proposition"
          />
        </div>
        <div>
          <label htmlFor="uniqueSellingPoint" className="block text-gray-700 text-sm font-bold mb-2">
            Unique Selling Point:
          </label>
          <textarea
            id="uniqueSellingPoint"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={uniqueSellingPoint}
            onChange={(e) => setUniqueSellingPoint(e.target.value)}
            required
            aria-label="Unique Selling Point"
          />
        </div>
        <div>
          <label htmlFor="websiteUrl" className="block text-gray-700 text-sm font-bold mb-2">
            Website URL (Optional):
          </label>
          <input
            type="url"
            id="websiteUrl"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            aria-label="Website URL"
          />
        </div>
        <div className="flex justify-between">
          <button
            type="submit"
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
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
  );
};

export default CreateBusinessSpecification;

import React, { useState } from 'react';

interface BusinessSpecification {
  businessName: string;
  businessType: 'ecommerce';
  targetAudience: string;
  valueProposition: string;
  uniqueSellingPoint: string;
  websiteUrl?: string;
}

interface CreateBusinessSpecificationProps {
  onSubmit: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onSubmit, onCancel }) => {
  const [businessName, setBusinessName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [uniqueSellingPoint, setUniqueSellingPoint] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const specification: BusinessSpecification = {
        businessName,
        businessType: 'ecommerce',
        targetAudience,
        valueProposition,
        uniqueSellingPoint,
        websiteUrl,
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
    <div className="container mx-auto p-4">
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
          <textarea
            id="valueProposition"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={valueProposition}
            onChange={(e) => setValueProposition(e.target.value)}
            required
            aria-label="Value Proposition"
          />
        </div>
        <div>
          <label htmlFor="uniqueSellingPoint" className="block text-gray-700 text-sm font-bold mb-2">
            Unique Selling Point:
          </label>
          <textarea
            id="uniqueSellingPoint"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={uniqueSellingPoint}
            onChange={(e) => setUniqueSellingPoint(e.target.value)}
            required
            aria-label="Unique Selling Point"
          />
        </div>
        <div>
          <label htmlFor="websiteUrl" className="block text-gray-700 text-sm font-bold mb-2">
            Website URL (Optional):
          </label>
          <input
            type="url"
            id="websiteUrl"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            aria-label="Website URL"
          />
        </div>
        <div className="flex justify-between">
          <button
            type="submit"
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
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
  );
};

export default CreateBusinessSpecification;