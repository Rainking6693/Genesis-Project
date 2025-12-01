import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  description: string;
  status: 'open' | 'in progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface RequirementsData {
  requirements: Requirement[];
  isLoading: boolean;
  error: string | null;
  addRequirement: (newRequirement: Omit<Requirement, 'id'>) => void;
  updateRequirement: (updatedRequirement: Requirement) => void;
  deleteRequirement: (id: string) => void;
}

const useRequirementsData = (): RequirementsData => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching requirements from an API
    const fetchRequirements = async () => {
      try {
        // Replace with your actual API endpoint
        const response = await new Promise<Requirement[]>((resolve) => {
          setTimeout(() => {
            resolve([
              { id: '1', description: 'Implement user authentication', status: 'completed', priority: 'high' },
              { id: '2', description: 'Design dashboard layout', status: 'in progress', priority: 'medium' },
              { id: '3', description: 'Integrate with data source', status: 'open', priority: 'high' },
            ]);
          }, 500); // Simulate network latency
        });

        setRequirements(response);
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch requirements.');
        setIsLoading(false);
      }
    };

    fetchRequirements();
  }, []);

  const addRequirement = (newRequirement: Omit<Requirement, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 15); // Generate a simple ID
    const requirementToAdd: Requirement = { ...newRequirement, id };
    setRequirements([...requirements, requirementToAdd]);
  };

  const updateRequirement = (updatedRequirement: Requirement) => {
    setRequirements(
      requirements.map((req) => (req.id === updatedRequirement.id ? updatedRequirement : req))
    );
  };

  const deleteRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  return {
    requirements,
    isLoading,
    error,
    addRequirement,
    updateRequirement,
    deleteRequirement,
  };
};

const GatherRequirements = () => {
  const { requirements, isLoading, error, addRequirement, updateRequirement, deleteRequirement } = useRequirementsData();
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [newRequirementPriority, setNewRequirementPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const handleAddRequirement = () => {
    if (newRequirementDescription.trim() === '') return;

    addRequirement({
      description: newRequirementDescription,
      status: 'open',
      priority: newRequirementPriority,
    });

    setNewRequirementDescription('');
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading requirements...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Gather Requirements</h2>

      {/* Add Requirement Form */}
      <div className="mb-4">
        <label htmlFor="requirementDescription" className="block text-gray-700 text-sm font-bold mb-2">
          New Requirement:
        </label>
        <input
          type="text"
          id="requirementDescription"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2"
          placeholder="Enter requirement description"
          value={newRequirementDescription}
          onChange={(e) => setNewRequirementDescription(e.target.value)}
        />
        <label htmlFor="requirementPriority" className="block text-gray-700 text-sm font-bold mb-2">
          Priority:
        </label>
        <select
          id="requirementPriority"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2"
          value={newRequirementPriority}
          onChange={(e) => setNewRequirementPriority(e.target.value as 'high' | 'medium' | 'low')}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          onClick={handleAddRequirement}
        >
          Add Requirement
        </button>
      </div>

      {/* Requirements List */}
      <ul className="divide-y divide-gray-200">
        {requirements.map((requirement) => (
          <li key={requirement.id} className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-800">{requirement.description}</p>
                <p className="text-sm text-gray-500">
                  Priority: {requirement.priority}, Status: {requirement.status}
                </p>
              </div>
              <div className="space-x-2">
                <button
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm"
                  onClick={() => {
                    const newStatus = requirement.status === 'open' ? 'in progress' : requirement.status === 'in progress' ? 'completed' : 'open';
                    updateRequirement({ ...requirement, status: newStatus });
                  }}
                  aria-label={`Mark requirement ${requirement.description} as complete`}
                >
                  {requirement.status === 'open' ? 'Start' : requirement.status === 'in progress' ? 'Complete' : 'Reopen'}
                </button>
                <button
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm"
                  onClick={() => deleteRequirement(requirement.id)}
                  aria-label={`Delete requirement ${requirement.description}`}
                >
                  Delete
                </button>
              </div>
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
  description: string;
  status: 'open' | 'in progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface RequirementsData {
  requirements: Requirement[];
  isLoading: boolean;
  error: string | null;
  addRequirement: (newRequirement: Omit<Requirement, 'id'>) => void;
  updateRequirement: (updatedRequirement: Requirement) => void;
  deleteRequirement: (id: string) => void;
}

const useRequirementsData = (): RequirementsData => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching requirements from an API
    const fetchRequirements = async () => {
      try {
        // Replace with your actual API endpoint
        const response = await new Promise<Requirement[]>((resolve) => {
          setTimeout(() => {
            resolve([
              { id: '1', description: 'Implement user authentication', status: 'completed', priority: 'high' },
              { id: '2', description: 'Design dashboard layout', status: 'in progress', priority: 'medium' },
              { id: '3', description: 'Integrate with data source', status: 'open', priority: 'high' },
            ]);
          }, 500); // Simulate network latency
        });

        setRequirements(response);
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch requirements.');
        setIsLoading(false);
      }
    };

    fetchRequirements();
  }, []);

  const addRequirement = (newRequirement: Omit<Requirement, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 15); // Generate a simple ID
    const requirementToAdd: Requirement = { ...newRequirement, id };
    setRequirements([...requirements, requirementToAdd]);
  };

  const updateRequirement = (updatedRequirement: Requirement) => {
    setRequirements(
      requirements.map((req) => (req.id === updatedRequirement.id ? updatedRequirement : req))
    );
  };

  const deleteRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  return {
    requirements,
    isLoading,
    error,
    addRequirement,
    updateRequirement,
    deleteRequirement,
  };
};

const GatherRequirements = () => {
  const { requirements, isLoading, error, addRequirement, updateRequirement, deleteRequirement } = useRequirementsData();
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [newRequirementPriority, setNewRequirementPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const handleAddRequirement = () => {
    if (newRequirementDescription.trim() === '') return;

    addRequirement({
      description: newRequirementDescription,
      status: 'open',
      priority: newRequirementPriority,
    });

    setNewRequirementDescription('');
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading requirements...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Gather Requirements</h2>

      {/* Add Requirement Form */}
      <div className="mb-4">
        <label htmlFor="requirementDescription" className="block text-gray-700 text-sm font-bold mb-2">
          New Requirement:
        </label>
        <input
          type="text"
          id="requirementDescription"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2"
          placeholder="Enter requirement description"
          value={newRequirementDescription}
          onChange={(e) => setNewRequirementDescription(e.target.value)}
        />
        <label htmlFor="requirementPriority" className="block text-gray-700 text-sm font-bold mb-2">
          Priority:
        </label>
        <select
          id="requirementPriority"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2"
          value={newRequirementPriority}
          onChange={(e) => setNewRequirementPriority(e.target.value as 'high' | 'medium' | 'low')}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          onClick={handleAddRequirement}
        >
          Add Requirement
        </button>
      </div>

      {/* Requirements List */}
      <ul className="divide-y divide-gray-200">
        {requirements.map((requirement) => (
          <li key={requirement.id} className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-800">{requirement.description}</p>
                <p className="text-sm text-gray-500">
                  Priority: {requirement.priority}, Status: {requirement.status}
                </p>
              </div>
              <div className="space-x-2">
                <button
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm"
                  onClick={() => {
                    const newStatus = requirement.status === 'open' ? 'in progress' : requirement.status === 'in progress' ? 'completed' : 'open';
                    updateRequirement({ ...requirement, status: newStatus });
                  }}
                  aria-label={`Mark requirement ${requirement.description} as complete`}
                >
                  {requirement.status === 'open' ? 'Start' : requirement.status === 'in progress' ? 'Complete' : 'Reopen'}
                </button>
                <button
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm"
                  onClick={() => deleteRequirement(requirement.id)}
                  aria-label={`Delete requirement ${requirement.description}`}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GatherRequirements;