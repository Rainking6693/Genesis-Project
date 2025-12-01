import React, { useState } from 'react';

interface BusinessSpecification {
  businessName: string;
  industry: string;
  targetAudience: string;
  uniqueSellingProposition: string;
  keyFeatures: string[];
}

interface CreateBusinessSpecificationProps {
  onCreate: (specification: BusinessSpecification) => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate }) => {
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [uniqueSellingProposition, setUniqueSellingProposition] = useState('');
  const [keyFeaturesInput, setKeyFeaturesInput] = useState('');
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddKeyFeature = () => {
    if (keyFeaturesInput.trim() !== '') {
      setKeyFeatures([...keyFeatures, keyFeaturesInput.trim()]);
      setKeyFeaturesInput('');
    }
  };

  const handleRemoveKeyFeature = (index: number) => {
    setKeyFeatures(keyFeatures.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const specification: BusinessSpecification = {
        businessName,
        industry,
        targetAudience,
        uniqueSellingProposition,
        keyFeatures,
      };

      // Simulate API call (replace with actual API call)
      await new Promise((resolve) => setTimeout(resolve, 500));

      onCreate(specification);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the specification.');
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
            required
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
          />
        </div>
        <div>
          <label htmlFor="uniqueSellingProposition" className="block text-gray-700 text-sm font-bold mb-2">
            Unique Selling Proposition:
          </label>
          <textarea
            id="uniqueSellingProposition"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={uniqueSellingProposition}
            onChange={(e) => setUniqueSellingProposition(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="keyFeatures" className="block text-gray-700 text-sm font-bold mb-2">
            Key Features:
          </label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              id="keyFeatures"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={keyFeaturesInput}
              onChange={(e) => setKeyFeaturesInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyFeature(); } }}
            />
            <button type="button" onClick={handleAddKeyFeature} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              Add
            </button>
          </div>
          <ul>
            {keyFeatures.map((feature, index) => (
              <li key={index} className="flex items-center justify-between py-2 border-b border-gray-200">
                <span>{feature}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveKeyFeature(index)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <button
            type="submit"
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Specification'}
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
  industry: string;
  targetAudience: string;
  uniqueSellingProposition: string;
  keyFeatures: string[];
}

interface CreateBusinessSpecificationProps {
  onCreate: (specification: BusinessSpecification) => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate }) => {
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [uniqueSellingProposition, setUniqueSellingProposition] = useState('');
  const [keyFeaturesInput, setKeyFeaturesInput] = useState('');
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddKeyFeature = () => {
    if (keyFeaturesInput.trim() !== '') {
      setKeyFeatures([...keyFeatures, keyFeaturesInput.trim()]);
      setKeyFeaturesInput('');
    }
  };

  const handleRemoveKeyFeature = (index: number) => {
    setKeyFeatures(keyFeatures.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const specification: BusinessSpecification = {
        businessName,
        industry,
        targetAudience,
        uniqueSellingProposition,
        keyFeatures,
      };

      // Simulate API call (replace with actual API call)
      await new Promise((resolve) => setTimeout(resolve, 500));

      onCreate(specification);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the specification.');
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
            required
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
          />
        </div>
        <div>
          <label htmlFor="uniqueSellingProposition" className="block text-gray-700 text-sm font-bold mb-2">
            Unique Selling Proposition:
          </label>
          <textarea
            id="uniqueSellingProposition"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={uniqueSellingProposition}
            onChange={(e) => setUniqueSellingProposition(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="keyFeatures" className="block text-gray-700 text-sm font-bold mb-2">
            Key Features:
          </label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              id="keyFeatures"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={keyFeaturesInput}
              onChange={(e) => setKeyFeaturesInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyFeature(); } }}
            />
            <button type="button" onClick={handleAddKeyFeature} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              Add
            </button>
          </div>
          <ul>
            {keyFeatures.map((feature, index) => (
              <li key={index} className="flex items-center justify-between py-2 border-b border-gray-200">
                <span>{feature}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveKeyFeature(index)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <button
            type="submit"
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Specification'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBusinessSpecification;