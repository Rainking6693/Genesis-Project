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
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate }) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [uniqueSellingProposition, setUniqueSellingProposition] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading state if needed
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
      const specification: BusinessSpecification = {
        name,
        description,
        industry,
        targetAudience,
        uniqueSellingProposition,
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      onCreate(specification);
      setName('');
      setDescription('');
      setIndustry('');
      setTargetAudience('');
      setUniqueSellingProposition('');

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
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
            Business Name:
          </label>
          <input
            type="text"
            id="name"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
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
            required
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
            required
            aria-label="Industry"
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
          <label htmlFor="uniqueSellingProposition" className="block text-gray-700 text-sm font-bold mb-2">
            Unique Selling Proposition:
          </label>
          <input
            type="text"
            id="uniqueSellingProposition"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={uniqueSellingProposition}
            onChange={(e) => setUniqueSellingProposition(e.target.value)}
            required
            aria-label="Unique Selling Proposition"
          />
        </div>

        <button
          type="submit"
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create'}
        </button>
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
  onCreate: (specification: BusinessSpecification) => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate }) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [uniqueSellingProposition, setUniqueSellingProposition] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading state if needed
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
      const specification: BusinessSpecification = {
        name,
        description,
        industry,
        targetAudience,
        uniqueSellingProposition,
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      onCreate(specification);
      setName('');
      setDescription('');
      setIndustry('');
      setTargetAudience('');
      setUniqueSellingProposition('');

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
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
            Business Name:
          </label>
          <input
            type="text"
            id="name"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
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
            required
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
            required
            aria-label="Industry"
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
          <label htmlFor="uniqueSellingProposition" className="block text-gray-700 text-sm font-bold mb-2">
            Unique Selling Proposition:
          </label>
          <input
            type="text"
            id="uniqueSellingProposition"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={uniqueSellingProposition}
            onChange={(e) => setUniqueSellingProposition(e.target.value)}
            required
            aria-label="Unique Selling Proposition"
          />
        </div>

        <button
          type="submit"
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create'}
        </button>
      </form>
    </div>
  );
};

export default CreateBusinessSpecification;