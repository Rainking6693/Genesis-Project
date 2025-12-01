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
        setRequirements(initialRequirements);
        onRequirementsChange(initialRequirements);
        setIsLoading(false);
      } catch (err: any) {
        setError('Failed to load requirements.');
        setIsLoading(false);
      }
    }, 500);
  }, [initialRequirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementDescription.trim()) return;

    const newRequirement: Requirement = {
      id: crypto.randomUUID(),
      description: newRequirementDescription.trim(),
      status: 'open',
      priority: 'medium',
    };

    const updatedRequirements = [...requirements, newRequirement];
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
    setNewRequirementDescription('');
  };

  const handleUpdateRequirement = (id: string, updatedFields: Partial<Requirement>) => {
    const updatedRequirements = requirements.map((req) =>
      req.id === id ? { ...req, ...updatedFields } : req
    );
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
  };

  const handleDeleteRequirement = (id: string) => {
    const updatedRequirements = requirements.filter((req) => req.id !== id);
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Gather Requirements</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {isLoading ? (
        <div className="text-gray-500">Loading requirements...</div>
      ) : (
        <>
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
                aria-label="New requirement description"
              />
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2 focus:outline-none focus:shadow-outline"
                onClick={handleAddRequirement}
              >
                Add
              </button>
            </div>
          </div>

          {requirements.length > 0 ? (
            <ul>
              {requirements.map((requirement) => (
                <li key={requirement.id} className="mb-2 border-b pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-800">{requirement.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <select
                          value={requirement.status}
                          onChange={(e) => handleUpdateRequirement(requirement.id, { status: e.target.value as Requirement['status'] })}
                          className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                          aria-label={`Status for requirement: ${requirement.description}`}
                        >
                          <option value="open">Open</option>
                          <option value="in progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>

                        <select
                          value={requirement.priority}
                          onChange={(e) => handleUpdateRequirement(requirement.id, { priority: e.target.value as Requirement['priority'] })}
                          className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                          aria-label={`Priority for requirement: ${requirement.description}`}
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>
                    <button
                      className="text-red-500 hover:text-red-700 focus:outline-none"
                      onClick={() => handleDeleteRequirement(requirement.id)}
                      aria-label={`Delete requirement: ${requirement.description}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500">No requirements yet.</div>
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
        setRequirements(initialRequirements);
        onRequirementsChange(initialRequirements);
        setIsLoading(false);
      } catch (err: any) {
        setError('Failed to load requirements.');
        setIsLoading(false);
      }
    }, 500);
  }, [initialRequirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementDescription.trim()) return;

    const newRequirement: Requirement = {
      id: crypto.randomUUID(),
      description: newRequirementDescription.trim(),
      status: 'open',
      priority: 'medium',
    };

    const updatedRequirements = [...requirements, newRequirement];
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
    setNewRequirementDescription('');
  };

  const handleUpdateRequirement = (id: string, updatedFields: Partial<Requirement>) => {
    const updatedRequirements = requirements.map((req) =>
      req.id === id ? { ...req, ...updatedFields } : req
    );
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
  };

  const handleDeleteRequirement = (id: string) => {
    const updatedRequirements = requirements.filter((req) => req.id !== id);
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Gather Requirements</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {isLoading ? (
        <div className="text-gray-500">Loading requirements...</div>
      ) : (
        <>
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
                aria-label="New requirement description"
              />
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2 focus:outline-none focus:shadow-outline"
                onClick={handleAddRequirement}
              >
                Add
              </button>
            </div>
          </div>

          {requirements.length > 0 ? (
            <ul>
              {requirements.map((requirement) => (
                <li key={requirement.id} className="mb-2 border-b pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-800">{requirement.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <select
                          value={requirement.status}
                          onChange={(e) => handleUpdateRequirement(requirement.id, { status: e.target.value as Requirement['status'] })}
                          className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                          aria-label={`Status for requirement: ${requirement.description}`}
                        >
                          <option value="open">Open</option>
                          <option value="in progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>

                        <select
                          value={requirement.priority}
                          onChange={(e) => handleUpdateRequirement(requirement.id, { priority: e.target.value as Requirement['priority'] })}
                          className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                          aria-label={`Priority for requirement: ${requirement.description}`}
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>
                    <button
                      className="text-red-500 hover:text-red-700 focus:outline-none"
                      onClick={() => handleDeleteRequirement(requirement.id)}
                      aria-label={`Delete requirement: ${requirement.description}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500">No requirements yet.</div>
          )}
        </>
      )}
    </div>
  );
};

export default GatherRequirements;