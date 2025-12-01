import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'inProgress' | 'completed';
}

interface RequirementsFormValues {
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

const initialFormValues: RequirementsFormValues = {
  name: '',
  description: '',
  priority: 'medium',
};

const GatherRequirements = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [formValues, setFormValues] = useState<RequirementsFormValues>(initialFormValues);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequirements = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        const mockRequirements: Requirement[] = [
          { id: '1', name: 'Product Catalog', description: 'Display products with details.', priority: 'high', status: 'completed' },
          { id: '2', name: 'Shopping Cart', description: 'Allow users to add and manage items.', priority: 'high', status: 'completed' },
          { id: '3', name: 'Checkout Process', description: 'Secure and efficient checkout.', priority: 'high', status: 'completed' },
          { id: '4', name: 'User Accounts', description: 'User registration and login.', priority: 'medium', status: 'completed' },
          { id: '5', name: 'Order Management', description: 'Admin panel to manage orders.', priority: 'medium', status: 'completed' },
        ];
        setRequirements(mockRequirements);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch requirements.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequirements();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormValues({ ...formValues, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newRequirement: Requirement = {
        id: Math.random().toString(36).substring(7),
        ...formValues,
        status: 'open',
      };

      setRequirements([...requirements, newRequirement]);
      setFormValues(initialFormValues);
    } catch (err: any) {
      setError(err.message || 'Failed to add requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setRequirements(requirements.filter((req) => req.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">E-commerce Requirements</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
            Name:
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formValues.name}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Requirement Name"
            aria-label="Requirement Name"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
            Description:
          </label>
          <textarea
            id="description"
            name="description"
            value={formValues.description}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Requirement Description"
            aria-label="Requirement Description"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="priority" className="block text-gray-700 text-sm font-bold mb-2">
            Priority:
          </label>
          <select
            id="priority"
            name="priority"
            value={formValues.priority}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Requirement Priority"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <button
          type="submit"
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? 'Adding...' : 'Add Requirement'}
        </button>
      </form>

      {isLoading && <div className="text-center">Loading...</div>}

      <ul className="divide-y divide-gray-200">
        {requirements.map((requirement) => (
          <li key={requirement.id} className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">{requirement.name}</p>
                <p className="text-gray-600">{requirement.description}</p>
                <p className="text-sm text-gray-500">Priority: {requirement.priority}</p>
                <p className="text-sm text-gray-500">Status: {requirement.status}</p>
              </div>
              <button
                onClick={() => handleDelete(requirement.id)}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                aria-label={`Delete requirement ${requirement.name}`}
                disabled={isLoading}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GatherRequirements;

import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'inProgress' | 'completed';
}

interface RequirementsFormValues {
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

const initialFormValues: RequirementsFormValues = {
  name: '',
  description: '',
  priority: 'medium',
};

const GatherRequirements = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [formValues, setFormValues] = useState<RequirementsFormValues>(initialFormValues);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequirements = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        const mockRequirements: Requirement[] = [
          { id: '1', name: 'Product Catalog', description: 'Display products with details.', priority: 'high', status: 'completed' },
          { id: '2', name: 'Shopping Cart', description: 'Allow users to add and manage items.', priority: 'high', status: 'completed' },
          { id: '3', name: 'Checkout Process', description: 'Secure and efficient checkout.', priority: 'high', status: 'completed' },
          { id: '4', name: 'User Accounts', description: 'User registration and login.', priority: 'medium', status: 'completed' },
          { id: '5', name: 'Order Management', description: 'Admin panel to manage orders.', priority: 'medium', status: 'completed' },
        ];
        setRequirements(mockRequirements);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch requirements.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequirements();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormValues({ ...formValues, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newRequirement: Requirement = {
        id: Math.random().toString(36).substring(7),
        ...formValues,
        status: 'open',
      };

      setRequirements([...requirements, newRequirement]);
      setFormValues(initialFormValues);
    } catch (err: any) {
      setError(err.message || 'Failed to add requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setRequirements(requirements.filter((req) => req.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">E-commerce Requirements</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
            Name:
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formValues.name}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Requirement Name"
            aria-label="Requirement Name"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
            Description:
          </label>
          <textarea
            id="description"
            name="description"
            value={formValues.description}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Requirement Description"
            aria-label="Requirement Description"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="priority" className="block text-gray-700 text-sm font-bold mb-2">
            Priority:
          </label>
          <select
            id="priority"
            name="priority"
            value={formValues.priority}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Requirement Priority"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <button
          type="submit"
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? 'Adding...' : 'Add Requirement'}
        </button>
      </form>

      {isLoading && <div className="text-center">Loading...</div>}

      <ul className="divide-y divide-gray-200">
        {requirements.map((requirement) => (
          <li key={requirement.id} className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">{requirement.name}</p>
                <p className="text-gray-600">{requirement.description}</p>
                <p className="text-sm text-gray-500">Priority: {requirement.priority}</p>
                <p className="text-sm text-gray-500">Status: {requirement.status}</p>
              </div>
              <button
                onClick={() => handleDelete(requirement.id)}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                aria-label={`Delete requirement ${requirement.name}`}
                disabled={isLoading}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GatherRequirements;