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
    setSpecification({ ...specification, [name]: value });
  };

  const handleAddFeature = () => {
    setSpecification({ ...specification, keyFeatures: [...specification.keyFeatures, ''] });
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...specification.keyFeatures];
    newFeatures[index] = value;
    setSpecification({ ...specification, keyFeatures: newFeatures });
  };

  const handleRemoveFeature = (index: number) => {
    const newFeatures = [...specification.keyFeatures];
    newFeatures.splice(index, 1);
    setSpecification({ ...specification, keyFeatures: newFeatures });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      onSubmit(specification);
      setSpecification(initialSpecification); // Reset form
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting.');
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
          <label htmlFor="businessName" className="block text-gray-700 text-sm font-bold mb-2">
            Business Name:
          </label>
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
          <label htmlFor="industry" className="block text-gray-700 text-sm font-bold mb-2">
            Industry:
          </label>
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
          <label htmlFor="targetAudience" className="block text-gray-700 text-sm font-bold mb-2">
            Target Audience:
          </label>
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
          <label htmlFor="uniqueSellingProposition" className="block text-gray-700 text-sm font-bold mb-2">
            Unique Selling Proposition:
          </label>
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
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Key Features:
          </label>
          {specification.keyFeatures.map((feature, index) => (
            <div key={index} className="mb-2 flex items-center">
              <input
                type="text"
                value={feature}
                onChange={(e) => handleFeatureChange(index, e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
                aria-label={`Key Feature ${index + 1}`}
                required
              />
              <button
                type="button"
                onClick={() => handleRemoveFeature(index)}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddFeature}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Add Feature
          </button>
        </div>
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
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
    setSpecification({ ...specification, [name]: value });
  };

  const handleAddFeature = () => {
    setSpecification({ ...specification, keyFeatures: [...specification.keyFeatures, ''] });
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...specification.keyFeatures];
    newFeatures[index] = value;
    setSpecification({ ...specification, keyFeatures: newFeatures });
  };

  const handleRemoveFeature = (index: number) => {
    const newFeatures = [...specification.keyFeatures];
    newFeatures.splice(index, 1);
    setSpecification({ ...specification, keyFeatures: newFeatures });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      onSubmit(specification);
      setSpecification(initialSpecification); // Reset form
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting.');
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
          <label htmlFor="businessName" className="block text-gray-700 text-sm font-bold mb-2">
            Business Name:
          </label>
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
          <label htmlFor="industry" className="block text-gray-700 text-sm font-bold mb-2">
            Industry:
          </label>
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
          <label htmlFor="targetAudience" className="block text-gray-700 text-sm font-bold mb-2">
            Target Audience:
          </label>
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
          <label htmlFor="uniqueSellingProposition" className="block text-gray-700 text-sm font-bold mb-2">
            Unique Selling Proposition:
          </label>
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
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Key Features:
          </label>
          {specification.keyFeatures.map((feature, index) => (
            <div key={index} className="mb-2 flex items-center">
              <input
                type="text"
                value={feature}
                onChange={(e) => handleFeatureChange(index, e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
                aria-label={`Key Feature ${index + 1}`}
                required
              />
              <button
                type="button"
                onClick={() => handleRemoveFeature(index)}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddFeature}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Add Feature
          </button>
        </div>
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBusinessSpecification;