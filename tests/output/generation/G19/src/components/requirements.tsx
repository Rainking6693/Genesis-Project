import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface RequirementsData {
  requirements: Requirement[];
}

interface RequirementsProps {
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<RequirementsProps> = ({ onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [newRequirement, setNewRequirement] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching requirements from an API
    const fetchRequirements = async () => {
      setLoading(true);
      try {
        // Replace with actual API call
        const mockData: RequirementsData = {
          requirements: [
            { id: '1', description: 'Dashboard should display key metrics', status: 'open', priority: 'high' },
            { id: '2', description: 'User authentication required', status: 'in_progress', priority: 'medium' },
          ],
        };
        setRequirements(mockData.requirements);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch requirements.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequirements();
  }, []);

  useEffect(() => {
    onRequirementsChange(requirements);
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (newRequirement.trim() === '') return;

    const newRequirementObj: Requirement = {
      id: Math.random().toString(36).substring(7), // Simple ID generation
      description: newRequirement,
      status: 'open',
      priority: 'medium',
    };

    setRequirements([...requirements, newRequirementObj]);
    setNewRequirement('');
  };

  const handleStatusChange = (id: string, newStatus: Requirement['status']) => {
    setRequirements(
      requirements.map((req) =>
        req.id === id ? { ...req, status: newStatus } : req
      )
    );
  };

  const handlePriorityChange = (id: string, newPriority: Requirement['priority']) => {
    setRequirements(
      requirements.map((req) =>
        req.id === id ? { ...req, priority: newPriority } : req
      )
    );
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Gather Requirements</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {loading ? (
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
                placeholder="Enter new requirement"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
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
            <ul className="divide-y divide-gray-200">
              {requirements.map((req) => (
                <li key={req.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-800">{req.description}</p>
                      <div className="flex items-center mt-2">
                        <span className="mr-2 text-sm text-gray-600">Status:</span>
                        <select
                          className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                          value={req.status}
                          onChange={(e) => handleStatusChange(req.id, e.target.value as Requirement['status'])}
                          aria-label={`Status for requirement: ${req.description}`}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>

                        <span className="ml-4 mr-2 text-sm text-gray-600">Priority:</span>
                        <select
                          className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                          value={req.priority}
                          onChange={(e) => handlePriorityChange(req.id, e.target.value as Requirement['priority'])}
                          aria-label={`Priority for requirement: ${req.description}`}
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>
                    <button
                      className="text-red-500 hover:text-red-700 focus:outline-none"
                      onClick={() => handleDeleteRequirement(req.id)}
                      aria-label={`Delete requirement: ${req.description}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500">No requirements added yet.</div>
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
  status: 'open' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface RequirementsData {
  requirements: Requirement[];
}

interface RequirementsProps {
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<RequirementsProps> = ({ onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [newRequirement, setNewRequirement] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching requirements from an API
    const fetchRequirements = async () => {
      setLoading(true);
      try {
        // Replace with actual API call
        const mockData: RequirementsData = {
          requirements: [
            { id: '1', description: 'Dashboard should display key metrics', status: 'open', priority: 'high' },
            { id: '2', description: 'User authentication required', status: 'in_progress', priority: 'medium' },
          ],
        };
        setRequirements(mockData.requirements);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch requirements.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequirements();
  }, []);

  useEffect(() => {
    onRequirementsChange(requirements);
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = () => {
    if (newRequirement.trim() === '') return;

    const newRequirementObj: Requirement = {
      id: Math.random().toString(36).substring(7), // Simple ID generation
      description: newRequirement,
      status: 'open',
      priority: 'medium',
    };

    setRequirements([...requirements, newRequirementObj]);
    setNewRequirement('');
  };

  const handleStatusChange = (id: string, newStatus: Requirement['status']) => {
    setRequirements(
      requirements.map((req) =>
        req.id === id ? { ...req, status: newStatus } : req
      )
    );
  };

  const handlePriorityChange = (id: string, newPriority: Requirement['priority']) => {
    setRequirements(
      requirements.map((req) =>
        req.id === id ? { ...req, priority: newPriority } : req
      )
    );
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Gather Requirements</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {loading ? (
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
                placeholder="Enter new requirement"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
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
            <ul className="divide-y divide-gray-200">
              {requirements.map((req) => (
                <li key={req.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-800">{req.description}</p>
                      <div className="flex items-center mt-2">
                        <span className="mr-2 text-sm text-gray-600">Status:</span>
                        <select
                          className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                          value={req.status}
                          onChange={(e) => handleStatusChange(req.id, e.target.value as Requirement['status'])}
                          aria-label={`Status for requirement: ${req.description}`}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>

                        <span className="ml-4 mr-2 text-sm text-gray-600">Priority:</span>
                        <select
                          className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                          value={req.priority}
                          onChange={(e) => handlePriorityChange(req.id, e.target.value as Requirement['priority'])}
                          aria-label={`Priority for requirement: ${req.description}`}
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>
                    <button
                      className="text-red-500 hover:text-red-700 focus:outline-none"
                      onClick={() => handleDeleteRequirement(req.id)}
                      aria-label={`Delete requirement: ${req.description}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500">No requirements added yet.</div>
          )}
        </>
      )}
    </div>
  );
};

export default GatherRequirements;