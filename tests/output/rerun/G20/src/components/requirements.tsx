import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in progress' | 'completed' | 'blocked';
  owner: string;
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
    // Simulate loading requirements from an API
    setIsLoading(true);
    setTimeout(() => {
      // Simulate API response
      setIsLoading(false);
      // If there was an error, set it here
      // setError("Failed to fetch requirements");
    }, 500);
  }, []);

  useEffect(() => {
    onRequirementsChange(requirements);
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementDescription.trim()) return;

    const newRequirement: Requirement = {
      id: Math.random().toString(36).substring(2, 15), // Generate a random ID
      description: newRequirementDescription,
      priority: 'medium',
      status: 'open',
      owner: '',
    };

    setRequirements([...requirements, newRequirement]);
    setNewRequirementDescription('');
  };

  const handleUpdateRequirement = (id: string, updates: Partial<Requirement>) => {
    setRequirements(
      requirements.map((req) => (req.id === id ? { ...req, ...updates } : req))
    );
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading requirements...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">Error: {error}</div>;
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

      {requirements.length === 0 ? (
        <p>No requirements yet. Add some!</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{requirement.description}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-gray-500">Priority:</span>
                    <select
                      className="border rounded py-1 px-2 text-sm"
                      value={requirement.priority}
                      onChange={(e) =>
                        handleUpdateRequirement(requirement.id, { priority: e.target.value as Requirement['priority'] })
                      }
                      aria-label={`Priority for requirement ${requirement.description}`}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>

                    <span className="text-sm text-gray-500">Status:</span>
                    <select
                      className="border rounded py-1 px-2 text-sm"
                      value={requirement.status}
                      onChange={(e) =>
                        handleUpdateRequirement(requirement.id, { status: e.target.value as Requirement['status'] })
                      }
                      aria-label={`Status for requirement ${requirement.description}`}
                    >
                      <option value="open">Open</option>
                      <option value="in progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                </div>
                <button
                  className="text-red-500 hover:text-red-700 focus:outline-none"
                  onClick={() => handleDeleteRequirement(requirement.id)}
                  aria-label={`Delete requirement ${requirement.description}`}
                >
                  Delete
                </button>
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
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in progress' | 'completed' | 'blocked';
  owner: string;
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
    // Simulate loading requirements from an API
    setIsLoading(true);
    setTimeout(() => {
      // Simulate API response
      setIsLoading(false);
      // If there was an error, set it here
      // setError("Failed to fetch requirements");
    }, 500);
  }, []);

  useEffect(() => {
    onRequirementsChange(requirements);
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementDescription.trim()) return;

    const newRequirement: Requirement = {
      id: Math.random().toString(36).substring(2, 15), // Generate a random ID
      description: newRequirementDescription,
      priority: 'medium',
      status: 'open',
      owner: '',
    };

    setRequirements([...requirements, newRequirement]);
    setNewRequirementDescription('');
  };

  const handleUpdateRequirement = (id: string, updates: Partial<Requirement>) => {
    setRequirements(
      requirements.map((req) => (req.id === id ? { ...req, ...updates } : req))
    );
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading requirements...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">Error: {error}</div>;
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

      {requirements.length === 0 ? (
        <p>No requirements yet. Add some!</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{requirement.description}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-gray-500">Priority:</span>
                    <select
                      className="border rounded py-1 px-2 text-sm"
                      value={requirement.priority}
                      onChange={(e) =>
                        handleUpdateRequirement(requirement.id, { priority: e.target.value as Requirement['priority'] })
                      }
                      aria-label={`Priority for requirement ${requirement.description}`}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>

                    <span className="text-sm text-gray-500">Status:</span>
                    <select
                      className="border rounded py-1 px-2 text-sm"
                      value={requirement.status}
                      onChange={(e) =>
                        handleUpdateRequirement(requirement.id, { status: e.target.value as Requirement['status'] })
                      }
                      aria-label={`Status for requirement ${requirement.description}`}
                    >
                      <option value="open">Open</option>
                      <option value="in progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                </div>
                <button
                  className="text-red-500 hover:text-red-700 focus:outline-none"
                  onClick={() => handleDeleteRequirement(requirement.id)}
                  aria-label={`Delete requirement ${requirement.description}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GatherRequirements;