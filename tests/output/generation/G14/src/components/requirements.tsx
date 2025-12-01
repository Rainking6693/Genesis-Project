import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  text: string;
  status: 'open' | 'inProgress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface GatherRequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange?: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirementText, setNewRequirementText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (onRequirementsChange) {
      onRequirementsChange(requirements);
    }
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementText.trim()) return;

    setIsLoading(true);
    setError(null);

    // Simulate API call (replace with actual API call)
    setTimeout(() => {
      try {
        const newRequirement: Requirement = {
          id: Math.random().toString(36).substring(2, 15), // Generate a unique ID
          text: newRequirementText.trim(),
          status: 'open',
          priority: 'medium',
        };

        setRequirements([...requirements, newRequirement]);
        setNewRequirementText('');
        setIsLoading(false);
      } catch (e: any) {
        setError(e.message || 'Failed to add requirement.');
        setIsLoading(false);
      }
    }, 500);
  };

  const handleUpdateRequirement = (id: string, updatedRequirement: Partial<Requirement>) => {
    setRequirements(
      requirements.map((req) =>
        req.id === id ? { ...req, ...updatedRequirement } : req
      )
    );
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Gather Requirements</h2>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      <div className="mb-4">
        <label htmlFor="newRequirement" className="block text-gray-700 text-sm font-bold mb-2">
          New Requirement:
        </label>
        <div className="flex">
          <input
            type="text"
            id="newRequirement"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
            placeholder="Enter requirement..."
            value={newRequirementText}
            onChange={(e) => setNewRequirementText(e.target.value)}
            aria-label="New Requirement"
          />
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleAddRequirement}
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {isLoading && !newRequirementText.trim() && <div className="text-gray-500">Loading...</div>}

      {requirements.length > 0 ? (
        <ul>
          {requirements.map((req) => (
            <li key={req.id} className="mb-2 p-2 border rounded">
              <div className="flex items-center justify-between">
                <span>{req.text}</span>
                <div>
                  <select
                    value={req.status}
                    onChange={(e) => handleUpdateRequirement(req.id, { status: e.target.value as Requirement['status'] })}
                    className="mr-2"
                    aria-label={`Change status of requirement ${req.text}`}
                  >
                    <option value="open">Open</option>
                    <option value="inProgress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <select
                    value={req.priority}
                    onChange={(e) => handleUpdateRequirement(req.id, { priority: e.target.value as Requirement['priority'] })}
                    className="mr-2"
                    aria-label={`Change priority of requirement ${req.text}`}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                    onClick={() => handleDeleteRequirement(req.id)}
                    aria-label={`Delete requirement ${req.text}`}
                  >
                    Delete
                  </button>
                </div>
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
  text: string;
  status: 'open' | 'inProgress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface GatherRequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange?: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirementText, setNewRequirementText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (onRequirementsChange) {
      onRequirementsChange(requirements);
    }
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementText.trim()) return;

    setIsLoading(true);
    setError(null);

    // Simulate API call (replace with actual API call)
    setTimeout(() => {
      try {
        const newRequirement: Requirement = {
          id: Math.random().toString(36).substring(2, 15), // Generate a unique ID
          text: newRequirementText.trim(),
          status: 'open',
          priority: 'medium',
        };

        setRequirements([...requirements, newRequirement]);
        setNewRequirementText('');
        setIsLoading(false);
      } catch (e: any) {
        setError(e.message || 'Failed to add requirement.');
        setIsLoading(false);
      }
    }, 500);
  };

  const handleUpdateRequirement = (id: string, updatedRequirement: Partial<Requirement>) => {
    setRequirements(
      requirements.map((req) =>
        req.id === id ? { ...req, ...updatedRequirement } : req
      )
    );
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Gather Requirements</h2>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      <div className="mb-4">
        <label htmlFor="newRequirement" className="block text-gray-700 text-sm font-bold mb-2">
          New Requirement:
        </label>
        <div className="flex">
          <input
            type="text"
            id="newRequirement"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
            placeholder="Enter requirement..."
            value={newRequirementText}
            onChange={(e) => setNewRequirementText(e.target.value)}
            aria-label="New Requirement"
          />
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleAddRequirement}
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {isLoading && !newRequirementText.trim() && <div className="text-gray-500">Loading...</div>}

      {requirements.length > 0 ? (
        <ul>
          {requirements.map((req) => (
            <li key={req.id} className="mb-2 p-2 border rounded">
              <div className="flex items-center justify-between">
                <span>{req.text}</span>
                <div>
                  <select
                    value={req.status}
                    onChange={(e) => handleUpdateRequirement(req.id, { status: e.target.value as Requirement['status'] })}
                    className="mr-2"
                    aria-label={`Change status of requirement ${req.text}`}
                  >
                    <option value="open">Open</option>
                    <option value="inProgress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <select
                    value={req.priority}
                    onChange={(e) => handleUpdateRequirement(req.id, { priority: e.target.value as Requirement['priority'] })}
                    className="mr-2"
                    aria-label={`Change priority of requirement ${req.text}`}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                    onClick={() => handleDeleteRequirement(req.id)}
                    aria-label={`Delete requirement ${req.text}`}
                  >
                    Delete
                  </button>
                </div>
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