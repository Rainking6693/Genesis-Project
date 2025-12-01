import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  text: string;
  status: 'pending' | 'inProgress' | 'completed';
}

interface GatherRequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirementText, setNewRequirementText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading requirements from an API (replace with actual API call)
    setIsLoading(true);
    setTimeout(() => {
      // Simulate success or failure
      const success = true; // Change to false to simulate an error
      if (success) {
        setRequirements(initialRequirements);
        setIsLoading(false);
        setError(null);
      } else {
        setError('Failed to load requirements.');
        setIsLoading(false);
      }
    }, 500);

  }, [initialRequirements]);

  useEffect(() => {
    onRequirementsChange(requirements);
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (newRequirementText.trim() === '') return;

    const newRequirement: Requirement = {
      id: crypto.randomUUID(),
      text: newRequirementText.trim(),
      status: 'pending',
    };

    setRequirements([...requirements, newRequirement]);
    setNewRequirementText('');
  };

  const handleUpdateRequirementStatus = (id: string, newStatus: Requirement['status']) => {
    setRequirements(
      requirements.map((req) =>
        req.id === id ? { ...req, status: newStatus } : req
      )
    );
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Gather Requirements</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {isLoading ? (
        <div className="animate-pulse">Loading requirements...</div>
      ) : (
        <>
          <div className="mb-4 flex items-center space-x-2">
            <input
              type="text"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter new requirement"
              value={newRequirementText}
              onChange={(e) => setNewRequirementText(e.target.value)}
              aria-label="New requirement"
            />
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              onClick={handleAddRequirement}
            >
              Add
            </button>
          </div>

          {requirements.length > 0 ? (
            <ul>
              {requirements.map((req) => (
                <li key={req.id} className="mb-2 p-3 border rounded shadow-sm">
                  <div className="flex items-center justify-between">
                    <span>{req.text}</span>
                    <div className="space-x-2">
                      <select
                        value={req.status}
                        onChange={(e) =>
                          handleUpdateRequirementStatus(req.id, e.target.value as Requirement['status'])
                        }
                        aria-label={`Status for requirement: ${req.text}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="inProgress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                        onClick={() => handleDeleteRequirement(req.id)}
                        aria-label={`Delete requirement: ${req.text}`}
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
        </>
      )}
    </div>
  );
};

export default GatherRequirements;

import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  text: string;
  status: 'pending' | 'inProgress' | 'completed';
}

interface GatherRequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirementText, setNewRequirementText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading requirements from an API (replace with actual API call)
    setIsLoading(true);
    setTimeout(() => {
      // Simulate success or failure
      const success = true; // Change to false to simulate an error
      if (success) {
        setRequirements(initialRequirements);
        setIsLoading(false);
        setError(null);
      } else {
        setError('Failed to load requirements.');
        setIsLoading(false);
      }
    }, 500);

  }, [initialRequirements]);

  useEffect(() => {
    onRequirementsChange(requirements);
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (newRequirementText.trim() === '') return;

    const newRequirement: Requirement = {
      id: crypto.randomUUID(),
      text: newRequirementText.trim(),
      status: 'pending',
    };

    setRequirements([...requirements, newRequirement]);
    setNewRequirementText('');
  };

  const handleUpdateRequirementStatus = (id: string, newStatus: Requirement['status']) => {
    setRequirements(
      requirements.map((req) =>
        req.id === id ? { ...req, status: newStatus } : req
      )
    );
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Gather Requirements</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {isLoading ? (
        <div className="animate-pulse">Loading requirements...</div>
      ) : (
        <>
          <div className="mb-4 flex items-center space-x-2">
            <input
              type="text"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter new requirement"
              value={newRequirementText}
              onChange={(e) => setNewRequirementText(e.target.value)}
              aria-label="New requirement"
            />
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              onClick={handleAddRequirement}
            >
              Add
            </button>
          </div>

          {requirements.length > 0 ? (
            <ul>
              {requirements.map((req) => (
                <li key={req.id} className="mb-2 p-3 border rounded shadow-sm">
                  <div className="flex items-center justify-between">
                    <span>{req.text}</span>
                    <div className="space-x-2">
                      <select
                        value={req.status}
                        onChange={(e) =>
                          handleUpdateRequirementStatus(req.id, e.target.value as Requirement['status'])
                        }
                        aria-label={`Status for requirement: ${req.text}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="inProgress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                        onClick={() => handleDeleteRequirement(req.id)}
                        aria-label={`Delete requirement: ${req.text}`}
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
        </>
      )}
    </div>
  );
};

export default GatherRequirements;