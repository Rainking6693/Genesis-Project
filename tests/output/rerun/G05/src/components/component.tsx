import React, { useState } from 'react';

interface BusinessSpecification {
  businessName: string;
  industry: string;
  targetAudience: string;
  valueProposition: string;
  keyFeatures: string;
}

interface CreateBusinessSpecificationProps {
  onSubmit: (specification: BusinessSpecification) => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onSubmit }) => {
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [keyFeatures, setKeyFeatures] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const specification: BusinessSpecification = {
        businessName,
        industry,
        targetAudience,
        valueProposition,
        keyFeatures,
      };

      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      onSubmit(specification);
      setBusinessName('');
      setIndustry('');
      setTargetAudience('');
      setValueProposition('');
      setKeyFeatures('');
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the specification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Create Business Specification</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="businessName" className="block text-gray-700 text-sm font-bold mb-2">Business Name:</label>
          <input
            type="text"
            id="businessName"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            aria-label="Business Name"
            required
          />
        </div>
        <div>
          <label htmlFor="industry" className="block text-gray-700 text-sm font-bold mb-2">Industry:</label>
          <input
            type="text"
            id="industry"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            aria-label="Industry"
            required
          />
        </div>
        <div>
          <label htmlFor="targetAudience" className="block text-gray-700 text-sm font-bold mb-2">Target Audience:</label>
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
        <div>
          <label htmlFor="valueProposition" className="block text-gray-700 text-sm font-bold mb-2">Value Proposition:</label>
          <textarea
            id="valueProposition"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={valueProposition}
            onChange={(e) => setValueProposition(e.target.value)}
            aria-label="Value Proposition"
            required
          />
        </div>
        <div>
          <label htmlFor="keyFeatures" className="block text-gray-700 text-sm font-bold mb-2">Key Features:</label>
          <textarea
            id="keyFeatures"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={keyFeatures}
            onChange={(e) => setKeyFeatures(e.target.value)}
            aria-label="Key Features"
            required
          />
        </div>
        <button
          type="submit"
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
};

export default CreateBusinessSpecification;

import React, { useState } from 'react';

interface BusinessSpecification {
  businessName: string;
  industry: string;
  targetAudience: string;
  valueProposition: string;
  keyFeatures: string;
}

interface CreateBusinessSpecificationProps {
  onSubmit: (specification: BusinessSpecification) => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onSubmit }) => {
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [keyFeatures, setKeyFeatures] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const specification: BusinessSpecification = {
        businessName,
        industry,
        targetAudience,
        valueProposition,
        keyFeatures,
      };

      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      onSubmit(specification);
      setBusinessName('');
      setIndustry('');
      setTargetAudience('');
      setValueProposition('');
      setKeyFeatures('');
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the specification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Create Business Specification</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="businessName" className="block text-gray-700 text-sm font-bold mb-2">Business Name:</label>
          <input
            type="text"
            id="businessName"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            aria-label="Business Name"
            required
          />
        </div>
        <div>
          <label htmlFor="industry" className="block text-gray-700 text-sm font-bold mb-2">Industry:</label>
          <input
            type="text"
            id="industry"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            aria-label="Industry"
            required
          />
        </div>
        <div>
          <label htmlFor="targetAudience" className="block text-gray-700 text-sm font-bold mb-2">Target Audience:</label>
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
        <div>
          <label htmlFor="valueProposition" className="block text-gray-700 text-sm font-bold mb-2">Value Proposition:</label>
          <textarea
            id="valueProposition"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={valueProposition}
            onChange={(e) => setValueProposition(e.target.value)}
            aria-label="Value Proposition"
            required
          />
        </div>
        <div>
          <label htmlFor="keyFeatures" className="block text-gray-700 text-sm font-bold mb-2">Key Features:</label>
          <textarea
            id="keyFeatures"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={keyFeatures}
            onChange={(e) => setKeyFeatures(e.target.value)}
            aria-label="Key Features"
            required
          />
        </div>
        <button
          type="submit"
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
};

export default CreateBusinessSpecification;