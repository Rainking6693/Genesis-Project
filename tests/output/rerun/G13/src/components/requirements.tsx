import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  description: string;
  status: 'open' | 'in progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface RequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<RequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading initial requirements from an API
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Simulate an error
      // setError('Failed to load requirements.');
    }, 500);
  }, []);

  useEffect(() => {
    onRequirementsChange(requirements);
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementDescription.trim()) return;

    const newRequirement: Requirement = {
      id: crypto.randomUUID(),
      description: newRequirementDescription,
      status: 'open',
      priority: 'medium',
    };

    setRequirements([...requirements, newRequirement]);
    setNewRequirementDescription('');
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((requirement) => requirement.id !== id));
  };

  const handleStatusChange = (id: string, newStatus: Requirement['status']) => {
    setRequirements(
      requirements.map((requirement) =>
        requirement.id === id ? { ...requirement, status: newStatus } : requirement
      )
    );
  };

  const handlePriorityChange = (id: string, newPriority: Requirement['priority']) => {
    setRequirements(
      requirements.map((requirement) =>
        requirement.id === id ? { ...requirement, priority: newPriority } : requirement
      )
    );
  };

  if (isLoading) {
    return <div className="p-4">Loading requirements...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Gather Requirements</h2>

      <div className="mb-4 flex">
        <input
          type="text"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
          placeholder="Enter new requirement"
          value={newRequirementDescription}
          onChange={(e) => setNewRequirementDescription(e.target.value)}
          aria-label="New requirement description"
        />
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          onClick={handleAddRequirement}
        >
          Add
        </button>
      </div>

      {requirements.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex-grow">
                  <p className="text-gray-800">{requirement.description}</p>
                  <div className="flex items-center mt-2">
                    <label htmlFor={`status-${requirement.id}`} className="mr-2 text-sm text-gray-600">
                      Status:
                    </label>
                    <select
                      id={`status-${requirement.id}`}
                      className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                      value={requirement.status}
                      onChange={(e) => handleStatusChange(requirement.id, e.target.value as Requirement['status'])}
                      aria-label={`Status for requirement ${requirement.description}`}
                    >
                      <option value="open">Open</option>
                      <option value="in progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>

                    <label htmlFor={`priority-${requirement.id}`} className="ml-4 mr-2 text-sm text-gray-600">
                      Priority:
                    </label>
                    <select
                      id={`priority-${requirement.id}`}
                      className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                      value={requirement.priority}
                      onChange={(e) => handlePriorityChange(requirement.id, e.target.value as Requirement['priority'])}
                      aria-label={`Priority for requirement ${requirement.description}`}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <button
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  onClick={() => handleDeleteRequirement(requirement.id)}
                  aria-label={`Delete requirement ${requirement.description}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No requirements yet. Add some!</p>
      )}
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

interface RequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<RequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading initial requirements from an API
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Simulate an error
      // setError('Failed to load requirements.');
    }, 500);
  }, []);

  useEffect(() => {
    onRequirementsChange(requirements);
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementDescription.trim()) return;

    const newRequirement: Requirement = {
      id: crypto.randomUUID(),
      description: newRequirementDescription,
      status: 'open',
      priority: 'medium',
    };

    setRequirements([...requirements, newRequirement]);
    setNewRequirementDescription('');
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((requirement) => requirement.id !== id));
  };

  const handleStatusChange = (id: string, newStatus: Requirement['status']) => {
    setRequirements(
      requirements.map((requirement) =>
        requirement.id === id ? { ...requirement, status: newStatus } : requirement
      )
    );
  };

  const handlePriorityChange = (id: string, newPriority: Requirement['priority']) => {
    setRequirements(
      requirements.map((requirement) =>
        requirement.id === id ? { ...requirement, priority: newPriority } : requirement
      )
    );
  };

  if (isLoading) {
    return <div className="p-4">Loading requirements...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Gather Requirements</h2>

      <div className="mb-4 flex">
        <input
          type="text"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
          placeholder="Enter new requirement"
          value={newRequirementDescription}
          onChange={(e) => setNewRequirementDescription(e.target.value)}
          aria-label="New requirement description"
        />
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          onClick={handleAddRequirement}
        >
          Add
        </button>
      </div>

      {requirements.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex-grow">
                  <p className="text-gray-800">{requirement.description}</p>
                  <div className="flex items-center mt-2">
                    <label htmlFor={`status-${requirement.id}`} className="mr-2 text-sm text-gray-600">
                      Status:
                    </label>
                    <select
                      id={`status-${requirement.id}`}
                      className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                      value={requirement.status}
                      onChange={(e) => handleStatusChange(requirement.id, e.target.value as Requirement['status'])}
                      aria-label={`Status for requirement ${requirement.description}`}
                    >
                      <option value="open">Open</option>
                      <option value="in progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>

                    <label htmlFor={`priority-${requirement.id}`} className="ml-4 mr-2 text-sm text-gray-600">
                      Priority:
                    </label>
                    <select
                      id={`priority-${requirement.id}`}
                      className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                      value={requirement.priority}
                      onChange={(e) => handlePriorityChange(requirement.id, e.target.value as Requirement['priority'])}
                      aria-label={`Priority for requirement ${requirement.description}`}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <button
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  onClick={() => handleDeleteRequirement(requirement.id)}
                  aria-label={`Delete requirement ${requirement.description}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No requirements yet. Add some!</p>
      )}
    </div>
  );
};

export default GatherRequirements;