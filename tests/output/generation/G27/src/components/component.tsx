import React, { useState } from 'react';

interface BusinessSpecification {
  businessName: string;
  businessDescription: string;
  targetAudience: string;
  productsOrServices: string;
  uniqueSellingProposition: string;
  websiteUrl?: string;
  contactEmail: string;
}

interface CreateBusinessSpecificationProps {
  onCreate: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate, onCancel }) => {
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [productsOrServices, setProductsOrServices] = useState('');
  const [uniqueSellingProposition, setUniqueSellingProposition] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const specification: BusinessSpecification = {
      businessName,
      businessDescription,
      targetAudience,
      productsOrServices,
      uniqueSellingProposition,
      websiteUrl,
      contactEmail,
    };

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      onCreate(specification);
    } catch (err: any) {
      setError(err.message || 'Failed to create business specification.');
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
          <label htmlFor="productsOrServices" className="block text-gray-700 text-sm font-bold mb-2">
            Products or Services:
          </label>
          <input
            type="text"
            id="productsOrServices"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={productsOrServices}
            onChange={(e) => setProductsOrServices(e.target.value)}
            required
            aria-label="Products or Services"
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

        <div>
          <label htmlFor="contactEmail" className="block text-gray-700 text-sm font-bold mb-2">
            Contact Email:
          </label>
          <input
            type="email"
            id="contactEmail"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
            aria-label="Contact Email"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create'}
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
  productsOrServices: string;
  uniqueSellingProposition: string;
  websiteUrl?: string;
  contactEmail: string;
}

interface CreateBusinessSpecificationProps {
  onCreate: (specification: BusinessSpecification) => void;
  onCancel: () => void;
}

const CreateBusinessSpecification: React.FC<CreateBusinessSpecificationProps> = ({ onCreate, onCancel }) => {
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [productsOrServices, setProductsOrServices] = useState('');
  const [uniqueSellingProposition, setUniqueSellingProposition] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const specification: BusinessSpecification = {
      businessName,
      businessDescription,
      targetAudience,
      productsOrServices,
      uniqueSellingProposition,
      websiteUrl,
      contactEmail,
    };

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      onCreate(specification);
    } catch (err: any) {
      setError(err.message || 'Failed to create business specification.');
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
          <label htmlFor="productsOrServices" className="block text-gray-700 text-sm font-bold mb-2">
            Products or Services:
          </label>
          <input
            type="text"
            id="productsOrServices"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={productsOrServices}
            onChange={(e) => setProductsOrServices(e.target.value)}
            required
            aria-label="Products or Services"
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

        <div>
          <label htmlFor="contactEmail" className="block text-gray-700 text-sm font-bold mb-2">
            Contact Email:
          </label>
          <input
            type="email"
            id="contactEmail"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
            aria-label="Contact Email"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBusinessSpecification;