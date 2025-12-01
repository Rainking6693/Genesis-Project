import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in progress' | 'completed';
}

interface GatherRequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange?: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirementDescription, setNewRequirementDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (onRequirementsChange) {
      onRequirementsChange(requirements);
    }
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementDescription.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // Simulate API call (replace with actual API call)
    setTimeout(() => {
      try {
        const newRequirement: Requirement = {
          id: Math.random().toString(36).substring(2, 15), // Generate a random ID
          description: newRequirementDescription,
          priority: 'medium',
          status: 'open',
        };

        setRequirements([...requirements, newRequirement]);
        setNewRequirementDescription('');
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to add requirement.');
        setIsLoading(false);
      }
    }, 500);
  };

  const handleUpdateRequirement = (id: string, updatedRequirement: Partial<Requirement>) => {
    setIsLoading(true);
    setError(null);

    // Simulate API call (replace with actual API call)
    setTimeout(() => {
      try {
        const updatedRequirements = requirements.map((req) =>
          req.id === id ? { ...req, ...updatedRequirement } : req
        );
        setRequirements(updatedRequirements);
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to update requirement.');
        setIsLoading(false);
      }
    }, 500);
  };

  const handleDeleteRequirement = (id: string) => {
    setIsLoading(true);
    setError(null);

    // Simulate API call (replace with actual API call)
    setTimeout(() => {
      try {
        const filteredRequirements = requirements.filter((req) => req.id !== id);
        setRequirements(filteredRequirements);
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to delete requirement.');
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Gather Requirements</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}

      <div className="mb-4">
        <label htmlFor="newRequirement" className="block text-gray-700 text-sm font-bold mb-2">
          New Requirement:
        </label>
        <div className="flex">
          <input
            type="text"
            id="newRequirement"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter requirement description"
            value={newRequirementDescription}
            onChange={(e) => setNewRequirementDescription(e.target.value)}
            aria-label="New Requirement Description"
          />
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-2"
            onClick={handleAddRequirement}
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {requirements.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-800">{requirement.description}</p>
                  <div className="flex items-center mt-2">
                    <span className="text-gray-600 text-sm mr-2">Priority:</span>
                    <select
                      className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                      value={requirement.priority}
                      onChange={(e) => handleUpdateRequirement(requirement.id, { priority: e.target.value as Requirement['priority'] })}
                      aria-label={`Priority for requirement ${requirement.description}`}
                      disabled={isLoading}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <span className="text-gray-600 text-sm ml-4 mr-2">Status:</span>
                    <select
                      className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                      value={requirement.status}
                      onChange={(e) => handleUpdateRequirement(requirement.id, { status: e.target.value as Requirement['status'] })}
                      aria-label={`Status for requirement ${requirement.description}`}
                      disabled={isLoading}
                    >
                      <option value="open">Open</option>
                      <option value="in progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <button
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  onClick={() => handleDeleteRequirement(requirement.id)}
                  disabled={isLoading}
                  aria-label={`Delete requirement ${requirement.description}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No requirements yet. Add one above!</p>
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
  status: 'open' | 'in progress' | 'completed';
}

interface GatherRequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange?: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirementDescription, setNewRequirementDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (onRequirementsChange) {
      onRequirementsChange(requirements);
    }
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementDescription.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // Simulate API call (replace with actual API call)
    setTimeout(() => {
      try {
        const newRequirement: Requirement = {
          id: Math.random().toString(36).substring(2, 15), // Generate a random ID
          description: newRequirementDescription,
          priority: 'medium',
          status: 'open',
        };

        setRequirements([...requirements, newRequirement]);
        setNewRequirementDescription('');
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to add requirement.');
        setIsLoading(false);
      }
    }, 500);
  };

  const handleUpdateRequirement = (id: string, updatedRequirement: Partial<Requirement>) => {
    setIsLoading(true);
    setError(null);

    // Simulate API call (replace with actual API call)
    setTimeout(() => {
      try {
        const updatedRequirements = requirements.map((req) =>
          req.id === id ? { ...req, ...updatedRequirement } : req
        );
        setRequirements(updatedRequirements);
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to update requirement.');
        setIsLoading(false);
      }
    }, 500);
  };

  const handleDeleteRequirement = (id: string) => {
    setIsLoading(true);
    setError(null);

    // Simulate API call (replace with actual API call)
    setTimeout(() => {
      try {
        const filteredRequirements = requirements.filter((req) => req.id !== id);
        setRequirements(filteredRequirements);
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to delete requirement.');
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Gather Requirements</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}

      <div className="mb-4">
        <label htmlFor="newRequirement" className="block text-gray-700 text-sm font-bold mb-2">
          New Requirement:
        </label>
        <div className="flex">
          <input
            type="text"
            id="newRequirement"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter requirement description"
            value={newRequirementDescription}
            onChange={(e) => setNewRequirementDescription(e.target.value)}
            aria-label="New Requirement Description"
          />
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-2"
            onClick={handleAddRequirement}
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {requirements.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-800">{requirement.description}</p>
                  <div className="flex items-center mt-2">
                    <span className="text-gray-600 text-sm mr-2">Priority:</span>
                    <select
                      className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                      value={requirement.priority}
                      onChange={(e) => handleUpdateRequirement(requirement.id, { priority: e.target.value as Requirement['priority'] })}
                      aria-label={`Priority for requirement ${requirement.description}`}
                      disabled={isLoading}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <span className="text-gray-600 text-sm ml-4 mr-2">Status:</span>
                    <select
                      className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                      value={requirement.status}
                      onChange={(e) => handleUpdateRequirement(requirement.id, { status: e.target.value as Requirement['status'] })}
                      aria-label={`Status for requirement ${requirement.description}`}
                      disabled={isLoading}
                    >
                      <option value="open">Open</option>
                      <option value="in progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <button
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  onClick={() => handleDeleteRequirement(requirement.id)}
                  disabled={isLoading}
                  aria-label={`Delete requirement ${requirement.description}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No requirements yet. Add one above!</p>
      )}
    </div>
  );
};

export default GatherRequirements;