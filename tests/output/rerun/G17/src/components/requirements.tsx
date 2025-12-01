import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface RequirementsProps {
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<RequirementsProps> = ({ onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequirements = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate delay

        const mockRequirements: Requirement[] = [
          { id: '1', description: 'Implement user authentication', status: 'completed', priority: 'high' },
          { id: '2', description: 'Design dashboard layout', status: 'in_progress', priority: 'medium' },
          { id: '3', description: 'Develop data visualization components', status: 'open', priority: 'high' },
        ];

        setRequirements(mockRequirements);
        onRequirementsChange(mockRequirements); // Notify parent component
      } catch (err: any) {
        setError('Failed to fetch requirements.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequirements();
  }, [onRequirementsChange]);

  const handleAddRequirement = () => {
    if (newRequirementDescription.trim() === '') return;

    const newRequirement: Requirement = {
      id: String(Date.now()),
      description: newRequirementDescription,
      status: 'open',
      priority: 'medium',
    };

    const updatedRequirements = [...requirements, newRequirement];
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements); // Notify parent component
    setNewRequirementDescription('');
  };

  const handleStatusChange = (id: string, newStatus: Requirement['status']) => {
    const updatedRequirements = requirements.map((req) =>
      req.id === id ? { ...req, status: newStatus } : req
    );
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements); // Notify parent component
  };

  const handlePriorityChange = (id: string, newPriority: Requirement['priority']) => {
    const updatedRequirements = requirements.map((req) =>
      req.id === id ? { ...req, priority: newPriority } : req
    );
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements); // Notify parent component
  };

  const handleDeleteRequirement = (id: string) => {
    const updatedRequirements = requirements.filter((req) => req.id !== id);
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements); // Notify parent component
  };

  if (isLoading) {
    return <div className="p-4">Loading requirements...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Gather Requirements</h2>

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
        <ul className="divide-y divide-gray-200">
          {requirements.map((req) => (
            <li key={req.id} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-800">{req.description}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <div>
                      <label htmlFor={`status-${req.id}`} className="block text-sm font-medium text-gray-700">
                        Status:
                      </label>
                      <select
                        id={`status-${req.id}`}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={req.status}
                        onChange={(e) => handleStatusChange(req.id, e.target.value as Requirement['status'])}
                        aria-label={`Status for requirement ${req.description}`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`priority-${req.id}`} className="block text-sm font-medium text-gray-700">
                        Priority:
                      </label>
                      <select
                        id={`priority-${req.id}`}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={req.priority}
                        onChange={(e) => handlePriorityChange(req.id, e.target.value as Requirement['priority'])}
                        aria-label={`Priority for requirement ${req.description}`}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button
                  className="text-red-500 hover:text-red-700 focus:outline-none"
                  onClick={() => handleDeleteRequirement(req.id)}
                  aria-label={`Delete requirement ${req.description}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No requirements yet.</p>
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

interface RequirementsProps {
  onRequirementsChange: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<RequirementsProps> = ({ onRequirementsChange }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequirements = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate delay

        const mockRequirements: Requirement[] = [
          { id: '1', description: 'Implement user authentication', status: 'completed', priority: 'high' },
          { id: '2', description: 'Design dashboard layout', status: 'in_progress', priority: 'medium' },
          { id: '3', description: 'Develop data visualization components', status: 'open', priority: 'high' },
        ];

        setRequirements(mockRequirements);
        onRequirementsChange(mockRequirements); // Notify parent component
      } catch (err: any) {
        setError('Failed to fetch requirements.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequirements();
  }, [onRequirementsChange]);

  const handleAddRequirement = () => {
    if (newRequirementDescription.trim() === '') return;

    const newRequirement: Requirement = {
      id: String(Date.now()),
      description: newRequirementDescription,
      status: 'open',
      priority: 'medium',
    };

    const updatedRequirements = [...requirements, newRequirement];
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements); // Notify parent component
    setNewRequirementDescription('');
  };

  const handleStatusChange = (id: string, newStatus: Requirement['status']) => {
    const updatedRequirements = requirements.map((req) =>
      req.id === id ? { ...req, status: newStatus } : req
    );
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements); // Notify parent component
  };

  const handlePriorityChange = (id: string, newPriority: Requirement['priority']) => {
    const updatedRequirements = requirements.map((req) =>
      req.id === id ? { ...req, priority: newPriority } : req
    );
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements); // Notify parent component
  };

  const handleDeleteRequirement = (id: string) => {
    const updatedRequirements = requirements.filter((req) => req.id !== id);
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements); // Notify parent component
  };

  if (isLoading) {
    return <div className="p-4">Loading requirements...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Gather Requirements</h2>

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
        <ul className="divide-y divide-gray-200">
          {requirements.map((req) => (
            <li key={req.id} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-800">{req.description}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <div>
                      <label htmlFor={`status-${req.id}`} className="block text-sm font-medium text-gray-700">
                        Status:
                      </label>
                      <select
                        id={`status-${req.id}`}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={req.status}
                        onChange={(e) => handleStatusChange(req.id, e.target.value as Requirement['status'])}
                        aria-label={`Status for requirement ${req.description}`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`priority-${req.id}`} className="block text-sm font-medium text-gray-700">
                        Priority:
                      </label>
                      <select
                        id={`priority-${req.id}`}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={req.priority}
                        onChange={(e) => handlePriorityChange(req.id, e.target.value as Requirement['priority'])}
                        aria-label={`Priority for requirement ${req.description}`}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button
                  className="text-red-500 hover:text-red-700 focus:outline-none"
                  onClick={() => handleDeleteRequirement(req.id)}
                  aria-label={`Delete requirement ${req.description}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No requirements yet.</p>
      )}
    </div>
  );
};

export default GatherRequirements;