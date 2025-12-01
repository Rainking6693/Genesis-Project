import React, { useState } from 'react';

interface BusinessSpecification {
  name: string;
  description: string;
  industry: string;
  targetAudience: string;
  keyFeatures: string[];
  monetizationStrategy: string;
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
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [monetizationStrategy, setMonetizationStrategy] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddFeature = () => {
    if (newFeature.trim() !== '') {
      setKeyFeatures([...keyFeatures, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    const updatedFeatures = [...keyFeatures];
    updatedFeatures.splice(index, 1);
    setKeyFeatures(updatedFeatures);
  };

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
        keyFeatures,
        monetizationStrategy,
      };

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      onCreate(specification);
    } catch (err: any) {
      setError(err.message || 'Failed to create business specification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-md shadow-md">
      <h2 className="text-2xl font-semibold mb-4">Create Business Specification</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Name:</label>
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
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">Description:</label>
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
        <div className="mb-4">
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
        <div className="mb-4">
          <label htmlFor="keyFeatures" className="block text-gray-700 text-sm font-bold mb-2">Key Features:</label>
          <div className="flex items-center mb-2">
            <input
              type="text"
              id="newFeature"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              aria-label="New Feature"
            />
            <button
              type="button"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              onClick={handleAddFeature}
            >
              Add
            </button>
          </div>
          <ul>
            {keyFeatures.map((feature, index) => (
              <li key={index} className="flex items-center justify-between py-2 border-b border-gray-200">
                <span>{feature}</span>
                <button
                  type="button"
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                  onClick={() => handleRemoveFeature(index)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="mb-4">
          <label htmlFor="monetizationStrategy" className="block text-gray-700 text-sm font-bold mb-2">Monetization Strategy:</label>
          <input
            type="text"
            id="monetizationStrategy"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={monetizationStrategy}
            onChange={(e) => setMonetizationStrategy(e.target.value)}
            aria-label="Monetization Strategy"
            required
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
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
  name: string;
  description: string;
  industry: string;
  targetAudience: string;
  keyFeatures: string[];
  monetizationStrategy: string;
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
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [monetizationStrategy, setMonetizationStrategy] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddFeature = () => {
    if (newFeature.trim() !== '') {
      setKeyFeatures([...keyFeatures, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    const updatedFeatures = [...keyFeatures];
    updatedFeatures.splice(index, 1);
    setKeyFeatures(updatedFeatures);
  };

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
        keyFeatures,
        monetizationStrategy,
      };

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      onCreate(specification);
    } catch (err: any) {
      setError(err.message || 'Failed to create business specification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-md shadow-md">
      <h2 className="text-2xl font-semibold mb-4">Create Business Specification</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Name:</label>
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
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">Description:</label>
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
        <div className="mb-4">
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
        <div className="mb-4">
          <label htmlFor="keyFeatures" className="block text-gray-700 text-sm font-bold mb-2">Key Features:</label>
          <div className="flex items-center mb-2">
            <input
              type="text"
              id="newFeature"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              aria-label="New Feature"
            />
            <button
              type="button"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              onClick={handleAddFeature}
            >
              Add
            </button>
          </div>
          <ul>
            {keyFeatures.map((feature, index) => (
              <li key={index} className="flex items-center justify-between py-2 border-b border-gray-200">
                <span>{feature}</span>
                <button
                  type="button"
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                  onClick={() => handleRemoveFeature(index)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="mb-4">
          <label htmlFor="monetizationStrategy" className="block text-gray-700 text-sm font-bold mb-2">Monetization Strategy:</label>
          <input
            type="text"
            id="monetizationStrategy"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={monetizationStrategy}
            onChange={(e) => setMonetizationStrategy(e.target.value)}
            aria-label="Monetization Strategy"
            required
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
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