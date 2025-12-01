import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in progress' | 'completed';
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<RequirementsFormValues>(initialFormValues);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        const mockRequirements: Requirement[] = [
          { id: '1', name: 'Product Catalog', description: 'Display products with details.', priority: 'high', status: 'completed' },
          { id: '2', name: 'Shopping Cart', description: 'Allow users to add/remove items.', priority: 'high', status: 'completed' },
          { id: '3', name: 'Checkout Process', description: 'Secure and easy checkout.', priority: 'high', status: 'completed' },
          { id: '4', name: 'User Accounts', description: 'User registration and login.', priority: 'medium', status: 'completed' },
          { id: '5', name: 'Order Management', description: 'Admin panel for order management.', priority: 'medium', status: 'open' },
        ];
        setRequirements(mockRequirements);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch requirements.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequirements();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const handleAddRequirement = async () => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newRequirement: Requirement = {
        id: String(Date.now()),
        ...formValues,
        status: 'open',
      };

      setRequirements([...requirements, newRequirement]);
      setFormValues(initialFormValues);
      setIsAdding(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add requirement.');
    }
  };

  const handleDeleteRequirement = async (id: string) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setRequirements(requirements.filter((req) => req.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete requirement.');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading requirements...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Ecommerce Requirements</h1>

      <div className="mb-4">
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          onClick={() => setIsAdding(true)}
          aria-label="Add Requirement"
        >
          Add Requirement
        </button>
      </div>

      {isAdding && (
        <div className="mb-4 p-4 border rounded">
          <h2 className="text-lg font-semibold mb-2">Add New Requirement</h2>
          <div className="mb-2">
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
              Name:
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formValues.name}
              onChange={handleInputChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Requirement Name"
            />
          </div>
          <div className="mb-2">
            <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
              Description:
            </label>
            <textarea
              id="description"
              name="description"
              value={formValues.description}
              onChange={handleInputChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Requirement Description"
            />
          </div>
          <div className="mb-2">
            <label htmlFor="priority" className="block text-gray-700 text-sm font-bold mb-2">
              Priority:
            </label>
            <select
              id="priority"
              name="priority"
              value={formValues.priority}
              onChange={handleInputChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Requirement Priority"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
            onClick={handleAddRequirement}
            aria-label="Save Requirement"
          >
            Save
          </button>
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={() => setIsAdding(false)}
            aria-label="Cancel"
          >
            Cancel
          </button>
        </div>
      )}

      <ul>
        {requirements.map((req) => (
          <li key={req.id} className="mb-2 p-4 border rounded">
            <h3 className="font-semibold">{req.name}</h3>
            <p>{req.description}</p>
            <p>Priority: {req.priority}</p>
            <p>Status: {req.status}</p>
            <button
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              onClick={() => handleDeleteRequirement(req.id)}
              aria-label={`Delete ${req.name}`}
            >
              Delete
            </button>
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
  status: 'open' | 'in progress' | 'completed';
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<RequirementsFormValues>(initialFormValues);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        const mockRequirements: Requirement[] = [
          { id: '1', name: 'Product Catalog', description: 'Display products with details.', priority: 'high', status: 'completed' },
          { id: '2', name: 'Shopping Cart', description: 'Allow users to add/remove items.', priority: 'high', status: 'completed' },
          { id: '3', name: 'Checkout Process', description: 'Secure and easy checkout.', priority: 'high', status: 'completed' },
          { id: '4', name: 'User Accounts', description: 'User registration and login.', priority: 'medium', status: 'completed' },
          { id: '5', name: 'Order Management', description: 'Admin panel for order management.', priority: 'medium', status: 'open' },
        ];
        setRequirements(mockRequirements);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch requirements.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequirements();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const handleAddRequirement = async () => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newRequirement: Requirement = {
        id: String(Date.now()),
        ...formValues,
        status: 'open',
      };

      setRequirements([...requirements, newRequirement]);
      setFormValues(initialFormValues);
      setIsAdding(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add requirement.');
    }
  };

  const handleDeleteRequirement = async (id: string) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setRequirements(requirements.filter((req) => req.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete requirement.');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading requirements...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Ecommerce Requirements</h1>

      <div className="mb-4">
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          onClick={() => setIsAdding(true)}
          aria-label="Add Requirement"
        >
          Add Requirement
        </button>
      </div>

      {isAdding && (
        <div className="mb-4 p-4 border rounded">
          <h2 className="text-lg font-semibold mb-2">Add New Requirement</h2>
          <div className="mb-2">
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
              Name:
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formValues.name}
              onChange={handleInputChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Requirement Name"
            />
          </div>
          <div className="mb-2">
            <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
              Description:
            </label>
            <textarea
              id="description"
              name="description"
              value={formValues.description}
              onChange={handleInputChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Requirement Description"
            />
          </div>
          <div className="mb-2">
            <label htmlFor="priority" className="block text-gray-700 text-sm font-bold mb-2">
              Priority:
            </label>
            <select
              id="priority"
              name="priority"
              value={formValues.priority}
              onChange={handleInputChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              aria-label="Requirement Priority"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
            onClick={handleAddRequirement}
            aria-label="Save Requirement"
          >
            Save
          </button>
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={() => setIsAdding(false)}
            aria-label="Cancel"
          >
            Cancel
          </button>
        </div>
      )}

      <ul>
        {requirements.map((req) => (
          <li key={req.id} className="mb-2 p-4 border rounded">
            <h3 className="font-semibold">{req.name}</h3>
            <p>{req.description}</p>
            <p>Priority: {req.priority}</p>
            <p>Status: {req.status}</p>
            <button
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              onClick={() => handleDeleteRequirement(req.id)}
              aria-label={`Delete ${req.name}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GatherRequirements;