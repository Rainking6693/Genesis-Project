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

const initialSpecification: BusinessSpecification = {
  businessName: '',
  industry: '',
  targetAudience: '',
  uniqueSellingProposition: '',
  keyFeatures: [],
};

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onSubmit }) => {
  const [specification, setSpecification] = useState<BusinessSpecification>(initialSpecification);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSpecification(prev => ({ ...prev, [name]: value }));
  };

  const handleFeatureChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { value } = e.target;
    const updatedFeatures = [...specification.keyFeatures];
    updatedFeatures[index] = value;
    setSpecification(prev => ({ ...prev, keyFeatures: updatedFeatures }));
  };

  const addFeature = () => {
    setSpecification(prev => ({ ...prev, keyFeatures: [...prev.keyFeatures, ''] }));
  };

  const removeFeature = (index: number) => {
    const updatedFeatures = [...specification.keyFeatures];
    updatedFeatures.splice(index, 1);
    setSpecification(prev => ({ ...prev, keyFeatures: updatedFeatures }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      onSubmit(specification);
      setSpecification(initialSpecification); // Reset form
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
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
            name="businessName"
            value={specification.businessName}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Business Name"
            required
          />
        </div>
        <div>
          <label htmlFor="industry" className="block text-gray-700 text-sm font-bold mb-2">Industry:</label>
          <input
            type="text"
            id="industry"
            name="industry"
            value={specification.industry}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Industry"
            required
          />
        </div>
        <div>
          <label htmlFor="targetAudience" className="block text-gray-700 text-sm font-bold mb-2">Target Audience:</label>
          <textarea
            id="targetAudience"
            name="targetAudience"
            value={specification.targetAudience}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Target Audience"
            required
          />
        </div>
        <div>
          <label htmlFor="uniqueSellingProposition" className="block text-gray-700 text-sm font-bold mb-2">Unique Selling Proposition:</label>
          <textarea
            id="uniqueSellingProposition"
            name="uniqueSellingProposition"
            value={specification.uniqueSellingProposition}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Unique Selling Proposition"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Key Features:</label>
          {specification.keyFeatures.map((feature, index) => (
            <div key={index} className="flex items-center mb-2">
              <input
                type="text"
                value={feature}
                onChange={(e) => handleFeatureChange(e, index)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
                aria-label={`Key Feature ${index + 1}`}
                required
              />
              <button
                type="button"
                onClick={() => removeFeature(index)}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addFeature}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Add Feature
          </button>
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
  uniqueSellingProposition: string;
  keyFeatures: string[];
}

interface CreateBusinessSpecificationProps {
  onSubmit: (specification: BusinessSpecification) => void;
}

const initialSpecification: BusinessSpecification = {
  businessName: '',
  industry: '',
  targetAudience: '',
  uniqueSellingProposition: '',
  keyFeatures: [],
};

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onSubmit }) => {
  const [specification, setSpecification] = useState<BusinessSpecification>(initialSpecification);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSpecification(prev => ({ ...prev, [name]: value }));
  };

  const handleFeatureChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { value } = e.target;
    const updatedFeatures = [...specification.keyFeatures];
    updatedFeatures[index] = value;
    setSpecification(prev => ({ ...prev, keyFeatures: updatedFeatures }));
  };

  const addFeature = () => {
    setSpecification(prev => ({ ...prev, keyFeatures: [...prev.keyFeatures, ''] }));
  };

  const removeFeature = (index: number) => {
    const updatedFeatures = [...specification.keyFeatures];
    updatedFeatures.splice(index, 1);
    setSpecification(prev => ({ ...prev, keyFeatures: updatedFeatures }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      onSubmit(specification);
      setSpecification(initialSpecification); // Reset form
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
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
            name="businessName"
            value={specification.businessName}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Business Name"
            required
          />
        </div>
        <div>
          <label htmlFor="industry" className="block text-gray-700 text-sm font-bold mb-2">Industry:</label>
          <input
            type="text"
            id="industry"
            name="industry"
            value={specification.industry}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Industry"
            required
          />
        </div>
        <div>
          <label htmlFor="targetAudience" className="block text-gray-700 text-sm font-bold mb-2">Target Audience:</label>
          <textarea
            id="targetAudience"
            name="targetAudience"
            value={specification.targetAudience}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Target Audience"
            required
          />
        </div>
        <div>
          <label htmlFor="uniqueSellingProposition" className="block text-gray-700 text-sm font-bold mb-2">Unique Selling Proposition:</label>
          <textarea
            id="uniqueSellingProposition"
            name="uniqueSellingProposition"
            value={specification.uniqueSellingProposition}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Unique Selling Proposition"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Key Features:</label>
          {specification.keyFeatures.map((feature, index) => (
            <div key={index} className="flex items-center mb-2">
              <input
                type="text"
                value={feature}
                onChange={(e) => handleFeatureChange(e, index)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
                aria-label={`Key Feature ${index + 1}`}
                required
              />
              <button
                type="button"
                onClick={() => removeFeature(index)}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addFeature}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Add Feature
          </button>
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