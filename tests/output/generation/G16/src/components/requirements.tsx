import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  description: string;
  status: 'open' | 'in progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface RequirementsData {
  requirements: Requirement[];
}

interface RequirementsProps {
  // Add any props needed for fetching or updating requirements
  fetchRequirements: () => Promise<RequirementsData>;
  updateRequirementStatus: (id: string, status: string) => Promise<void>;
}

const GatherRequirements: React.FC<RequirementsProps> = ({ fetchRequirements, updateRequirementStatus }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRequirements = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRequirements();
        setRequirements(data.requirements);
      } catch (err: any) {
        setError(err.message || 'Failed to load requirements.');
      } finally {
        setLoading(false);
      }
    };

    loadRequirements();
  }, [fetchRequirements]);

  const handleStatusChange = async (id: string, newStatus: 'open' | 'in progress' | 'completed') => {
    try {
      await updateRequirementStatus(id, newStatus);
      setRequirements((prevRequirements) =>
        prevRequirements.map((req) =>
          req.id === id ? { ...req, status: newStatus } : req
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Requirements</h2>
      {requirements.length === 0 ? (
        <p>No requirements found.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-800">{requirement.description}</p>
                  <p className="text-sm text-gray-500">Priority: {requirement.priority}</p>
                </div>
                <div>
                  <label htmlFor={`status-${requirement.id}`} className="mr-2 text-sm font-medium text-gray-700">
                    Status:
                  </label>
                  <select
                    id={`status-${requirement.id}`}
                    className="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    value={requirement.status}
                    onChange={(e) => handleStatusChange(requirement.id, e.target.value as 'open' | 'in progress' | 'completed')}
                    aria-label={`Status for requirement: ${requirement.description}`}
                  >
                    <option value="open">Open</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
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
  status: 'open' | 'in progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface RequirementsData {
  requirements: Requirement[];
}

interface RequirementsProps {
  // Add any props needed for fetching or updating requirements
  fetchRequirements: () => Promise<RequirementsData>;
  updateRequirementStatus: (id: string, status: string) => Promise<void>;
}

const GatherRequirements: React.FC<RequirementsProps> = ({ fetchRequirements, updateRequirementStatus }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRequirements = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRequirements();
        setRequirements(data.requirements);
      } catch (err: any) {
        setError(err.message || 'Failed to load requirements.');
      } finally {
        setLoading(false);
      }
    };

    loadRequirements();
  }, [fetchRequirements]);

  const handleStatusChange = async (id: string, newStatus: 'open' | 'in progress' | 'completed') => {
    try {
      await updateRequirementStatus(id, newStatus);
      setRequirements((prevRequirements) =>
        prevRequirements.map((req) =>
          req.id === id ? { ...req, status: newStatus } : req
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Requirements</h2>
      {requirements.length === 0 ? (
        <p>No requirements found.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-800">{requirement.description}</p>
                  <p className="text-sm text-gray-500">Priority: {requirement.priority}</p>
                </div>
                <div>
                  <label htmlFor={`status-${requirement.id}`} className="mr-2 text-sm font-medium text-gray-700">
                    Status:
                  </label>
                  <select
                    id={`status-${requirement.id}`}
                    className="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    value={requirement.status}
                    onChange={(e) => handleStatusChange(requirement.id, e.target.value as 'open' | 'in progress' | 'completed')}
                    aria-label={`Status for requirement: ${requirement.description}`}
                  >
                    <option value="open">Open</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
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