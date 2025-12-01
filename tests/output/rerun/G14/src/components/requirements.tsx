import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
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
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading requirements from an API (replace with actual API call)
    setIsLoading(true);
    setTimeout(() => {
      // Simulate an error
      // setError('Failed to load requirements.');
      // setIsLoading(false);

      // Simulate successful loading
      setRequirements(initialRequirements);
      setIsLoading(false);
    }, 500);
  }, [initialRequirements]);

  useEffect(() => {
    onRequirementsChange(requirements);
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementDescription.trim()) return;

    const newRequirement: Requirement = {
      id: Math.random().toString(36).substring(2, 15), // Generate a random ID
      description: newRequirementDescription.trim(),
      priority: 'medium',
      status: 'open',
    };

    setRequirements([...requirements, newRequirement]);
    setNewRequirementDescription('');
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
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Gather Requirements</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {isLoading ? (
        <div className="text-gray-500">Loading requirements...</div>
      ) : (
        <>
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
            <ul>
              {requirements.map((requirement) => (
                <li key={requirement.id} className="mb-2 p-2 border rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">{requirement.description}</span>
                    <div>
                      <select
                        className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
                        value={requirement.priority}
                        onChange={(e) =>
                          handleUpdateRequirement(requirement.id, { priority: e.target.value as Requirement['priority'] })
                        }
                        aria-label="Requirement priority"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>

                      <select
                        className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
                        value={requirement.status}
                        onChange={(e) =>
                          handleUpdateRequirement(requirement.id, { status: e.target.value as Requirement['status'] })
                        }
                        aria-label="Requirement status"
                      >
                        <option value="open">Open</option>
                        <option value="in progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>

                      <button
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        onClick={() => handleDeleteRequirement(requirement.id)}
                        aria-label={`Delete requirement ${requirement.description}`}
                      >
                        Delete
                      </button>
                    </div>
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
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in progress' | 'completed';
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
      // Simulate an error
      // setError('Failed to load requirements.');
      // setIsLoading(false);

      // Simulate successful loading
      setRequirements(initialRequirements);
      setIsLoading(false);
    }, 500);
  }, [initialRequirements]);

  useEffect(() => {
    onRequirementsChange(requirements);
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (!newRequirementDescription.trim()) return;

    const newRequirement: Requirement = {
      id: Math.random().toString(36).substring(2, 15), // Generate a random ID
      description: newRequirementDescription.trim(),
      priority: 'medium',
      status: 'open',
    };

    setRequirements([...requirements, newRequirement]);
    setNewRequirementDescription('');
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
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Gather Requirements</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {isLoading ? (
        <div className="text-gray-500">Loading requirements...</div>
      ) : (
        <>
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
            <ul>
              {requirements.map((requirement) => (
                <li key={requirement.id} className="mb-2 p-2 border rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">{requirement.description}</span>
                    <div>
                      <select
                        className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
                        value={requirement.priority}
                        onChange={(e) =>
                          handleUpdateRequirement(requirement.id, { priority: e.target.value as Requirement['priority'] })
                        }
                        aria-label="Requirement priority"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>

                      <select
                        className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
                        value={requirement.status}
                        onChange={(e) =>
                          handleUpdateRequirement(requirement.id, { status: e.target.value as Requirement['status'] })
                        }
                        aria-label="Requirement status"
                      >
                        <option value="open">Open</option>
                        <option value="in progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>

                      <button
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        onClick={() => handleDeleteRequirement(requirement.id)}
                        aria-label={`Delete requirement ${requirement.description}`}
                      >
                        Delete
                      </button>
                    </div>
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