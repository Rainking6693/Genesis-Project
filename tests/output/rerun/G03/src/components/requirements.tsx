import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  description: string;
  status: 'pending' | 'inProgress' | 'completed';
}

interface GatherRequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange?: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirement, setNewRequirement] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (onRequirementsChange) {
      onRequirementsChange(requirements);
    }
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = async () => {
    if (!newRequirement.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      const newRequirementObj: Requirement = {
        id: Math.random().toString(36).substring(2, 15), // Generate a unique ID
        description: newRequirement.trim(),
        status: 'pending',
      };

      setRequirements([...requirements, newRequirementObj]);
      setNewRequirement('');
    } catch (err: any) {
      setError(err.message || 'Failed to add requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Requirement['status']) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedRequirements = requirements.map(req =>
        req.id === id ? { ...req, status: newStatus } : req
      );
      setRequirements(updatedRequirements);
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRequirement = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedRequirements = requirements.filter(req => req.id !== id);
      setRequirements(updatedRequirements);
    } catch (err: any) {
      setError(err.message || 'Failed to delete requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 md:p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Gather Requirements</h2>

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
            value={newRequirement}
            onChange={(e) => setNewRequirement(e.target.value)}
            aria-label="New requirement description"
          />
          <button
            className={`ml-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="button"
            onClick={handleAddRequirement}
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add'}
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
                  <div className="mt-2">
                    <label htmlFor={`status-${req.id}`} className="text-gray-700 text-sm font-bold mr-2">Status:</label>
                    <select
                      id={`status-${req.id}`}
                      className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={req.status}
                      onChange={(e) => handleStatusChange(req.id, e.target.value as Requirement['status'])}
                      disabled={isLoading}
                      aria-label={`Status for requirement: ${req.description}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="inProgress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <button
                  className={`bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  type="button"
                  onClick={() => handleDeleteRequirement(req.id)}
                  disabled={isLoading}
                  aria-label={`Delete requirement: ${req.description}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No requirements added yet.</p>
      )}
    </div>
  );
};

export default GatherRequirements;

import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  description: string;
  status: 'pending' | 'inProgress' | 'completed';
}

interface GatherRequirementsProps {
  initialRequirements?: Requirement[];
  onRequirementsChange?: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ initialRequirements = [], onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [newRequirement, setNewRequirement] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (onRequirementsChange) {
      onRequirementsChange(requirements);
    }
  }, [requirements, onRequirementsChange]);

  const handleAddRequirement = async () => {
    if (!newRequirement.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      const newRequirementObj: Requirement = {
        id: Math.random().toString(36).substring(2, 15), // Generate a unique ID
        description: newRequirement.trim(),
        status: 'pending',
      };

      setRequirements([...requirements, newRequirementObj]);
      setNewRequirement('');
    } catch (err: any) {
      setError(err.message || 'Failed to add requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Requirement['status']) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedRequirements = requirements.map(req =>
        req.id === id ? { ...req, status: newStatus } : req
      );
      setRequirements(updatedRequirements);
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRequirement = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedRequirements = requirements.filter(req => req.id !== id);
      setRequirements(updatedRequirements);
    } catch (err: any) {
      setError(err.message || 'Failed to delete requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 md:p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Gather Requirements</h2>

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
            value={newRequirement}
            onChange={(e) => setNewRequirement(e.target.value)}
            aria-label="New requirement description"
          />
          <button
            className={`ml-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="button"
            onClick={handleAddRequirement}
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add'}
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
                  <div className="mt-2">
                    <label htmlFor={`status-${req.id}`} className="text-gray-700 text-sm font-bold mr-2">Status:</label>
                    <select
                      id={`status-${req.id}`}
                      className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      value={req.status}
                      onChange={(e) => handleStatusChange(req.id, e.target.value as Requirement['status'])}
                      disabled={isLoading}
                      aria-label={`Status for requirement: ${req.description}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="inProgress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <button
                  className={`bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  type="button"
                  onClick={() => handleDeleteRequirement(req.id)}
                  disabled={isLoading}
                  aria-label={`Delete requirement: ${req.description}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No requirements added yet.</p>
      )}
    </div>
  );
};

export default GatherRequirements;