import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  description: string;
  status: 'open' | 'inProgress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface RequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange?: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<RequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (onRequirementsChange) {
      onRequirementsChange(requirements);
    }
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = async () => {
    if (!newRequirementDescription.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      const newRequirement: Requirement = {
        id: Math.random().toString(36).substring(2, 15), // Generate a random ID
        description: newRequirementDescription,
        status: 'open',
        priority: 'medium',
      };

      setRequirements([...requirements, newRequirement]);
      setNewRequirementDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to add requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRequirement = (id: string, updatedRequirement: Partial<Requirement>) => {
    setRequirements(
      requirements.map(req =>
        req.id === id ? { ...req, ...updatedRequirement } : req
      )
    );
  };

  const handleDeleteRequirement = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      setRequirements(requirements.filter(req => req.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Gather Requirements</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

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
          disabled={isLoading}
        >
          {isLoading ? 'Adding...' : 'Add'}
        </button>
      </div>

      {requirements.length === 0 ? (
        <p className="text-gray-500">No requirements yet. Add one above!</p>
      ) : (
        <ul>
          {requirements.map((requirement) => (
            <li key={requirement.id} className="mb-2 p-2 border rounded">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">{requirement.description}</span>
                <div>
                  <select
                    className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
                    value={requirement.status}
                    onChange={(e) => handleUpdateRequirement(requirement.id, { status: e.target.value as Requirement['status'] })}
                    aria-label={`Status for requirement ${requirement.description}`}
                  >
                    <option value="open">Open</option>
                    <option value="inProgress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <select
                    className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
                    value={requirement.priority}
                    onChange={(e) => handleUpdateRequirement(requirement.id, { priority: e.target.value as Requirement['priority'] })}
                    aria-label={`Priority for requirement ${requirement.description}`}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    onClick={() => handleDeleteRequirement(requirement.id)}
                    disabled={isLoading}
                    aria-label={`Delete requirement ${requirement.description}`}
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
  description: string;
  status: 'open' | 'inProgress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface RequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange?: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<RequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (onRequirementsChange) {
      onRequirementsChange(requirements);
    }
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = async () => {
    if (!newRequirementDescription.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      const newRequirement: Requirement = {
        id: Math.random().toString(36).substring(2, 15), // Generate a random ID
        description: newRequirementDescription,
        status: 'open',
        priority: 'medium',
      };

      setRequirements([...requirements, newRequirement]);
      setNewRequirementDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to add requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRequirement = (id: string, updatedRequirement: Partial<Requirement>) => {
    setRequirements(
      requirements.map(req =>
        req.id === id ? { ...req, ...updatedRequirement } : req
      )
    );
  };

  const handleDeleteRequirement = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      setRequirements(requirements.filter(req => req.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Gather Requirements</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

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
          disabled={isLoading}
        >
          {isLoading ? 'Adding...' : 'Add'}
        </button>
      </div>

      {requirements.length === 0 ? (
        <p className="text-gray-500">No requirements yet. Add one above!</p>
      ) : (
        <ul>
          {requirements.map((requirement) => (
            <li key={requirement.id} className="mb-2 p-2 border rounded">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">{requirement.description}</span>
                <div>
                  <select
                    className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
                    value={requirement.status}
                    onChange={(e) => handleUpdateRequirement(requirement.id, { status: e.target.value as Requirement['status'] })}
                    aria-label={`Status for requirement ${requirement.description}`}
                  >
                    <option value="open">Open</option>
                    <option value="inProgress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <select
                    className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
                    value={requirement.priority}
                    onChange={(e) => handleUpdateRequirement(requirement.id, { priority: e.target.value as Requirement['priority'] })}
                    aria-label={`Priority for requirement ${requirement.description}`}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    onClick={() => handleDeleteRequirement(requirement.id)}
                    disabled={isLoading}
                    aria-label={`Delete requirement ${requirement.description}`}
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