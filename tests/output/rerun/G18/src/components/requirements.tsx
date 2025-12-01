import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  description: string;
  status: 'open' | 'in progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface GatherRequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading requirements from an API (replace with actual API call)
    setIsLoading(true);
    setTimeout(() => {
      try {
        // Simulate successful API response
        setRequirements(initialRequirements); // Use initialRequirements passed as prop
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load requirements.');
        setIsLoading(false);
      }
    }, 500); // Simulate API latency
  }, []);

  useEffect(() => {
    onRequirementsChange(requirements);
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementDescription.trim()) return;

    const newRequirement: Requirement = {
      id: crypto.randomUUID(),
      description: newRequirementDescription.trim(),
      status: 'open',
      priority: 'medium',
    };

    setRequirements([...requirements, newRequirement]);
    setNewRequirementDescription('');
  };

  const handleUpdateRequirement = (id: string, updatedRequirement: Partial<Requirement>) => {
    setRequirements(
      requirements.map((req) => (req.id === id ? { ...req, ...updatedRequirement } : req))
    );
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Gather Requirements</h2>

      {isLoading && <div className="text-gray-500">Loading requirements...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}

      <div className="mb-4">
        <label htmlFor="newRequirement" className="block text-sm font-medium text-gray-700">
          New Requirement:
        </label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <input
            type="text"
            id="newRequirement"
            className="flex-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full min-w-0 rounded-none rounded-l-md sm:text-sm border-gray-300"
            placeholder="Describe the requirement"
            value={newRequirementDescription}
            onChange={(e) => setNewRequirementDescription(e.target.value)}
            aria-label="New Requirement Description"
          />
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={handleAddRequirement}
          >
            Add
          </button>
        </div>
      </div>

      <ul>
        {requirements.map((requirement) => (
          <li key={requirement.id} className="mb-2 p-2 border rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-gray-800">{requirement.description}</span>
              <div>
                <select
                  value={requirement.status}
                  onChange={(e) =>
                    handleUpdateRequirement(requirement.id, { status: e.target.value as Requirement['status'] })
                  }
                  className="mr-2 rounded border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  aria-label={`Status for requirement: ${requirement.description}`}
                >
                  <option value="open">Open</option>
                  <option value="in progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>

                <select
                  value={requirement.priority}
                  onChange={(e) =>
                    handleUpdateRequirement(requirement.id, { priority: e.target.value as Requirement['priority'] })
                  }
                  className="mr-2 rounded border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  aria-label={`Priority for requirement: ${requirement.description}`}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <button
                  onClick={() => handleDeleteRequirement(requirement.id)}
                  className="text-red-500 hover:text-red-700 focus:outline-none"
                  aria-label={`Delete requirement: ${requirement.description}`}
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

interface GatherRequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading requirements from an API (replace with actual API call)
    setIsLoading(true);
    setTimeout(() => {
      try {
        // Simulate successful API response
        setRequirements(initialRequirements); // Use initialRequirements passed as prop
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load requirements.');
        setIsLoading(false);
      }
    }, 500); // Simulate API latency
  }, []);

  useEffect(() => {
    onRequirementsChange(requirements);
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementDescription.trim()) return;

    const newRequirement: Requirement = {
      id: crypto.randomUUID(),
      description: newRequirementDescription.trim(),
      status: 'open',
      priority: 'medium',
    };

    setRequirements([...requirements, newRequirement]);
    setNewRequirementDescription('');
  };

  const handleUpdateRequirement = (id: string, updatedRequirement: Partial<Requirement>) => {
    setRequirements(
      requirements.map((req) => (req.id === id ? { ...req, ...updatedRequirement } : req))
    );
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Gather Requirements</h2>

      {isLoading && <div className="text-gray-500">Loading requirements...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}

      <div className="mb-4">
        <label htmlFor="newRequirement" className="block text-sm font-medium text-gray-700">
          New Requirement:
        </label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <input
            type="text"
            id="newRequirement"
            className="flex-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full min-w-0 rounded-none rounded-l-md sm:text-sm border-gray-300"
            placeholder="Describe the requirement"
            value={newRequirementDescription}
            onChange={(e) => setNewRequirementDescription(e.target.value)}
            aria-label="New Requirement Description"
          />
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={handleAddRequirement}
          >
            Add
          </button>
        </div>
      </div>

      <ul>
        {requirements.map((requirement) => (
          <li key={requirement.id} className="mb-2 p-2 border rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-gray-800">{requirement.description}</span>
              <div>
                <select
                  value={requirement.status}
                  onChange={(e) =>
                    handleUpdateRequirement(requirement.id, { status: e.target.value as Requirement['status'] })
                  }
                  className="mr-2 rounded border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  aria-label={`Status for requirement: ${requirement.description}`}
                >
                  <option value="open">Open</option>
                  <option value="in progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>

                <select
                  value={requirement.priority}
                  onChange={(e) =>
                    handleUpdateRequirement(requirement.id, { priority: e.target.value as Requirement['priority'] })
                  }
                  className="mr-2 rounded border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  aria-label={`Priority for requirement: ${requirement.description}`}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <button
                  onClick={() => handleDeleteRequirement(requirement.id)}
                  className="text-red-500 hover:text-red-700 focus:outline-none"
                  aria-label={`Delete requirement: ${requirement.description}`}
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