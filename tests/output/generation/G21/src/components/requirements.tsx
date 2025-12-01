import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in progress' | 'completed';
}

interface GatherRequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirementName, setNewRequirementName] = useState('');
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [newRequirementPriority, setNewRequirementPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onRequirementsChange(requirements);
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!newRequirementName.trim()) {
        throw new Error('Requirement name cannot be empty.');
      }

      const newRequirement: Requirement = {
        id: crypto.randomUUID(),
        name: newRequirementName,
        description: newRequirementDescription,
        priority: newRequirementPriority,
        status: 'open',
      };

      setRequirements([...requirements, newRequirement]);
      setNewRequirementName('');
      setNewRequirementDescription('');
      setNewRequirementPriority('medium');
    } catch (err: any) {
      setError(err.message || 'Failed to add requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRequirement = (id: string, updatedRequirement: Partial<Requirement>) => {
    setRequirements(
      requirements.map((requirement) =>
        requirement.id === id ? { ...requirement, ...updatedRequirement } : requirement
      )
    );
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((requirement) => requirement.id !== id));
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Gather Ecommerce Requirements</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}

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
          placeholder="Enter requirement name"
          aria-label="Requirement Name"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="requirementDescription" className="block text-gray-700 text-sm font-bold mb-2">
          Description:
        </label>
        <textarea
          id="requirementDescription"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={newRequirementDescription}
          onChange={(e) => setNewRequirementDescription(e.target.value)}
          placeholder="Enter requirement description"
          aria-label="Requirement Description"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="requirementPriority" className="block text-gray-700 text-sm font-bold mb-2">
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
      </div>

      <button
        className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleAddRequirement}
        disabled={isLoading}
      >
        {isLoading ? 'Adding...' : 'Add Requirement'}
      </button>

      <h3 className="text-xl font-bold mt-6 mb-2">Existing Requirements</h3>

      {requirements.length === 0 ? (
        <p>No requirements added yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{requirement.name}</p>
                  <p className="text-gray-600">{requirement.description}</p>
                  <p className="text-sm text-gray-500">Priority: {requirement.priority}, Status: {requirement.status}</p>
                </div>
                <div className="space-x-2">
                  <button
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline text-sm"
                    onClick={() => handleUpdateRequirement(requirement.id, { status: requirement.status === 'open' ? 'in progress' : requirement.status === 'in progress' ? 'completed' : 'open' })}
                    aria-label={`Update status of ${requirement.name}`}
                  >
                    {requirement.status === 'open' ? 'In Progress' : requirement.status === 'in progress' ? 'Complete' : 'Reopen'}
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline text-sm"
                    onClick={() => handleDeleteRequirement(requirement.id)}
                    aria-label={`Delete ${requirement.name}`}
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

interface GatherRequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirementName, setNewRequirementName] = useState('');
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [newRequirementPriority, setNewRequirementPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onRequirementsChange(requirements);
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!newRequirementName.trim()) {
        throw new Error('Requirement name cannot be empty.');
      }

      const newRequirement: Requirement = {
        id: crypto.randomUUID(),
        name: newRequirementName,
        description: newRequirementDescription,
        priority: newRequirementPriority,
        status: 'open',
      };

      setRequirements([...requirements, newRequirement]);
      setNewRequirementName('');
      setNewRequirementDescription('');
      setNewRequirementPriority('medium');
    } catch (err: any) {
      setError(err.message || 'Failed to add requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRequirement = (id: string, updatedRequirement: Partial<Requirement>) => {
    setRequirements(
      requirements.map((requirement) =>
        requirement.id === id ? { ...requirement, ...updatedRequirement } : requirement
      )
    );
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((requirement) => requirement.id !== id));
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Gather Ecommerce Requirements</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}

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
          placeholder="Enter requirement name"
          aria-label="Requirement Name"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="requirementDescription" className="block text-gray-700 text-sm font-bold mb-2">
          Description:
        </label>
        <textarea
          id="requirementDescription"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={newRequirementDescription}
          onChange={(e) => setNewRequirementDescription(e.target.value)}
          placeholder="Enter requirement description"
          aria-label="Requirement Description"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="requirementPriority" className="block text-gray-700 text-sm font-bold mb-2">
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
      </div>

      <button
        className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleAddRequirement}
        disabled={isLoading}
      >
        {isLoading ? 'Adding...' : 'Add Requirement'}
      </button>

      <h3 className="text-xl font-bold mt-6 mb-2">Existing Requirements</h3>

      {requirements.length === 0 ? (
        <p>No requirements added yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{requirement.name}</p>
                  <p className="text-gray-600">{requirement.description}</p>
                  <p className="text-sm text-gray-500">Priority: {requirement.priority}, Status: {requirement.status}</p>
                </div>
                <div className="space-x-2">
                  <button
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline text-sm"
                    onClick={() => handleUpdateRequirement(requirement.id, { status: requirement.status === 'open' ? 'in progress' : requirement.status === 'in progress' ? 'completed' : 'open' })}
                    aria-label={`Update status of ${requirement.name}`}
                  >
                    {requirement.status === 'open' ? 'In Progress' : requirement.status === 'in progress' ? 'Complete' : 'Reopen'}
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline text-sm"
                    onClick={() => handleDeleteRequirement(requirement.id)}
                    aria-label={`Delete ${requirement.name}`}
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
  );
};

export default GatherRequirements;