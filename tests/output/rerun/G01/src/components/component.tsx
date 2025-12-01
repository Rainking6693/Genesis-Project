import React, { useState } from 'react';

interface BusinessSpecification {
  businessName: string;
  industry: string;
  targetAudience: string;
  uniqueSellingProposition: string;
  keyFeatures: string[];
}

interface CreateBusinessSpecificationProps {
  onSubmit: (specification: BusinessSpecification) => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onSubmit }) => {
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [uniqueSellingProposition, setUniqueSellingProposition] = useState('');
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddFeature = () => {
    if (newFeature.trim() !== '') {
      setKeyFeatures([...keyFeatures, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setKeyFeatures(keyFeatures.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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

      onSubmit(specification);
      setBusinessName('');
      setIndustry('');
      setTargetAudience('');
      setUniqueSellingProposition('');
      setKeyFeatures([]);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
      setLoading(false);
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
            required
            aria-label="Business Name"
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
            required
            aria-label="Industry"
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
            required
            aria-label="Target Audience"
          />
        </div>
        <div>
          <label htmlFor="uniqueSellingProposition" className="block text-gray-700 text-sm font-bold mb-2">Unique Selling Proposition:</label>
          <textarea
            id="uniqueSellingProposition"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={uniqueSellingProposition}
            onChange={(e) => setUniqueSellingProposition(e.target.value)}
            required
            aria-label="Unique Selling Proposition"
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Key Features:</label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="Add a feature"
              aria-label="New Feature"
            />
            <button type="button" onClick={handleAddFeature} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Add</button>
          </div>
          <ul>
            {keyFeatures.map((feature, index) => (
              <li key={index} className="flex items-center justify-between py-2 border-b">
                <span>{feature}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(index)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                  aria-label={`Remove feature ${feature}`}
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
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit'}
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
  onSubmit: (specification: BusinessSpecification) => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onSubmit }) => {
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [uniqueSellingProposition, setUniqueSellingProposition] = useState('');
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddFeature = () => {
    if (newFeature.trim() !== '') {
      setKeyFeatures([...keyFeatures, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setKeyFeatures(keyFeatures.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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

      onSubmit(specification);
      setBusinessName('');
      setIndustry('');
      setTargetAudience('');
      setUniqueSellingProposition('');
      setKeyFeatures([]);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
      setLoading(false);
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
            required
            aria-label="Business Name"
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
            required
            aria-label="Industry"
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
            required
            aria-label="Target Audience"
          />
        </div>
        <div>
          <label htmlFor="uniqueSellingProposition" className="block text-gray-700 text-sm font-bold mb-2">Unique Selling Proposition:</label>
          <textarea
            id="uniqueSellingProposition"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={uniqueSellingProposition}
            onChange={(e) => setUniqueSellingProposition(e.target.value)}
            required
            aria-label="Unique Selling Proposition"
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Key Features:</label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="Add a feature"
              aria-label="New Feature"
            />
            <button type="button" onClick={handleAddFeature} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Add</button>
          </div>
          <ul>
            {keyFeatures.map((feature, index) => (
              <li key={index} className="flex items-center justify-between py-2 border-b">
                <span>{feature}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(index)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                  aria-label={`Remove feature ${feature}`}
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
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBusinessSpecification;