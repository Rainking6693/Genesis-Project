import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in progress' | 'completed' | 'blocked';
}

interface GatherRequirementsProps {
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [newRequirementName, setNewRequirementName] = useState('');
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [newRequirementPriority, setNewRequirementPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching initial requirements from an API
    setIsLoading(true);
    setTimeout(() => {
      try {
        const initialRequirements: Requirement[] = [
          { id: '1', name: 'Product Catalog', description: 'Display products with details.', priority: 'high', status: 'completed' },
          { id: '2', name: 'Shopping Cart', description: 'Allow users to add items to a cart.', priority: 'high', status: 'completed' },
          { id: '3', name: 'Checkout Process', description: 'Secure and user-friendly checkout.', priority: 'high', status: 'completed' },
          { id: '4', name: 'User Accounts', description: 'Allow users to create and manage accounts.', priority: 'medium', status: 'in progress' },
          { id: '5', name: 'Order Management', description: 'Admin panel for managing orders.', priority: 'medium', status: 'in progress' },
        ];
        setRequirements(initialRequirements);
        onRequirementsChange(initialRequirements);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch initial requirements.');
      } finally {
        setIsLoading(false);
      }
    }, 500);
  }, [onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementName.trim()) {
      setError('Requirement name is required.');
      return;
    }

    setError(null);
    const newRequirement: Requirement = {
      id: String(Date.now()),
      name: newRequirementName,
      description: newRequirementDescription,
      priority: newRequirementPriority,
      status: 'open',
    };

    const updatedRequirements = [...requirements, newRequirement];
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);

    setNewRequirementName('');
    setNewRequirementDescription('');
    setNewRequirementPriority('medium');
  };

  const handleUpdateRequirementStatus = (id: string, newStatus: Requirement['status']) => {
    const updatedRequirements = requirements.map((req) =>
      req.id === id ? { ...req, status: newStatus } : req
    );
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
  };

  const handleDeleteRequirement = (id: string) => {
    const updatedRequirements = requirements.filter((req) => req.id !== id);
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
  };

  if (isLoading) {
    return <div className="p-4">Loading requirements...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Gather Ecommerce Requirements</h2>

      {/* Add New Requirement Form */}
      <div className="mb-4">
        <label htmlFor="requirementName" className="block text-gray-700 text-sm font-bold mb-2">
          Requirement Name:
        </label>
        <input
          type="text"
          id="requirementName"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={newRequirementName}
          onChange={(e) => setNewRequirementName(e.target.value)}
          placeholder="e.g., User Authentication"
          aria-label="Requirement Name"
        />

        <label htmlFor="requirementDescription" className="block text-gray-700 text-sm font-bold mt-2 mb-2">
          Description:
        </label>
        <textarea
          id="requirementDescription"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={newRequirementDescription}
          onChange={(e) => setNewRequirementDescription(e.target.value)}
          placeholder="Detailed description of the requirement"
          aria-label="Requirement Description"
        />

        <label htmlFor="requirementPriority" className="block text-gray-700 text-sm font-bold mt-2 mb-2">
          Priority:
        </label>
        <select
          id="requirementPriority"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={newRequirementPriority}
          onChange={(e) => setNewRequirementPriority(e.target.value as 'high' | 'medium' | 'low')}
          aria-label="Requirement Priority"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
          onClick={handleAddRequirement}
        >
          Add Requirement
        </button>
      </div>

      {/* Requirements List */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Current Requirements</h3>
        {requirements.length === 0 ? (
          <p>No requirements yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {requirements.map((req) => (
              <li key={req.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{req.name}</p>
                    <p className="text-gray-500 text-sm">{req.description}</p>
                    <p className="text-gray-600 text-xs">Priority: {req.priority}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={req.status}
                      onChange={(e) => handleUpdateRequirementStatus(req.id, e.target.value as Requirement['status'])}
                      className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                      aria-label={`Update status for ${req.name}`}
                    >
                      <option value="open">Open</option>
                      <option value="in progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                    </select>
                    <button
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline text-sm"
                      onClick={() => handleDeleteRequirement(req.id)}
                      aria-label={`Delete ${req.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
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
  status: 'open' | 'in progress' | 'completed' | 'blocked';
}

interface GatherRequirementsProps {
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [newRequirementName, setNewRequirementName] = useState('');
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [newRequirementPriority, setNewRequirementPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching initial requirements from an API
    setIsLoading(true);
    setTimeout(() => {
      try {
        const initialRequirements: Requirement[] = [
          { id: '1', name: 'Product Catalog', description: 'Display products with details.', priority: 'high', status: 'completed' },
          { id: '2', name: 'Shopping Cart', description: 'Allow users to add items to a cart.', priority: 'high', status: 'completed' },
          { id: '3', name: 'Checkout Process', description: 'Secure and user-friendly checkout.', priority: 'high', status: 'completed' },
          { id: '4', name: 'User Accounts', description: 'Allow users to create and manage accounts.', priority: 'medium', status: 'in progress' },
          { id: '5', name: 'Order Management', description: 'Admin panel for managing orders.', priority: 'medium', status: 'in progress' },
        ];
        setRequirements(initialRequirements);
        onRequirementsChange(initialRequirements);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch initial requirements.');
      } finally {
        setIsLoading(false);
      }
    }, 500);
  }, [onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementName.trim()) {
      setError('Requirement name is required.');
      return;
    }

    setError(null);
    const newRequirement: Requirement = {
      id: String(Date.now()),
      name: newRequirementName,
      description: newRequirementDescription,
      priority: newRequirementPriority,
      status: 'open',
    };

    const updatedRequirements = [...requirements, newRequirement];
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);

    setNewRequirementName('');
    setNewRequirementDescription('');
    setNewRequirementPriority('medium');
  };

  const handleUpdateRequirementStatus = (id: string, newStatus: Requirement['status']) => {
    const updatedRequirements = requirements.map((req) =>
      req.id === id ? { ...req, status: newStatus } : req
    );
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
  };

  const handleDeleteRequirement = (id: string) => {
    const updatedRequirements = requirements.filter((req) => req.id !== id);
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
  };

  if (isLoading) {
    return <div className="p-4">Loading requirements...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Gather Ecommerce Requirements</h2>

      {/* Add New Requirement Form */}
      <div className="mb-4">
        <label htmlFor="requirementName" className="block text-gray-700 text-sm font-bold mb-2">
          Requirement Name:
        </label>
        <input
          type="text"
          id="requirementName"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={newRequirementName}
          onChange={(e) => setNewRequirementName(e.target.value)}
          placeholder="e.g., User Authentication"
          aria-label="Requirement Name"
        />

        <label htmlFor="requirementDescription" className="block text-gray-700 text-sm font-bold mt-2 mb-2">
          Description:
        </label>
        <textarea
          id="requirementDescription"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={newRequirementDescription}
          onChange={(e) => setNewRequirementDescription(e.target.value)}
          placeholder="Detailed description of the requirement"
          aria-label="Requirement Description"
        />

        <label htmlFor="requirementPriority" className="block text-gray-700 text-sm font-bold mt-2 mb-2">
          Priority:
        </label>
        <select
          id="requirementPriority"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={newRequirementPriority}
          onChange={(e) => setNewRequirementPriority(e.target.value as 'high' | 'medium' | 'low')}
          aria-label="Requirement Priority"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
          onClick={handleAddRequirement}
        >
          Add Requirement
        </button>
      </div>

      {/* Requirements List */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Current Requirements</h3>
        {requirements.length === 0 ? (
          <p>No requirements yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {requirements.map((req) => (
              <li key={req.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{req.name}</p>
                    <p className="text-gray-500 text-sm">{req.description}</p>
                    <p className="text-gray-600 text-xs">Priority: {req.priority}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={req.status}
                      onChange={(e) => handleUpdateRequirementStatus(req.id, e.target.value as Requirement['status'])}
                      className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                      aria-label={`Update status for ${req.name}`}
                    >
                      <option value="open">Open</option>
                      <option value="in progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                    </select>
                    <button
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline text-sm"
                      onClick={() => handleDeleteRequirement(req.id)}
                      aria-label={`Delete ${req.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default GatherRequirements;