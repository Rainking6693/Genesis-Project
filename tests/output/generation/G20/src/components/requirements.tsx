import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  text: string;
  status: 'open' | 'inProgress' | 'completed';
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
      try {
        // Simulate API response
        const fetchedRequirements: Requirement[] = initialRequirements.length > 0 ? initialRequirements : [
          { id: '1', text: 'Define key performance indicators (KPIs)', status: 'open' },
          { id: '2', text: 'Identify target audience and their needs', status: 'inProgress' },
        ];
        setRequirements(fetchedRequirements);
        onRequirementsChange(fetchedRequirements);
        setIsLoading(false);
      } catch (err: any) {
        setError('Failed to load requirements.');
        setIsLoading(false);
        console.error(err);
      }
    }, 500); // Simulate network latency
  }, []); // Empty dependency array to run only on mount

  const handleAddRequirement = () => {
    if (newRequirementText.trim() === '') return;

    const newRequirement: Requirement = {
      id: Math.random().toString(36).substring(2, 15), // Simple ID generation
      text: newRequirementText,
      status: 'open',
    };

    const updatedRequirements = [...requirements, newRequirement];
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
    setNewRequirementText('');
  };

  const handleStatusChange = (id: string, newStatus: Requirement['status']) => {
    const updatedRequirements = requirements.map((req) =>
      req.id === id ? { ...req, status: newStatus } : req
    );
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
  };

  const handleDeleteRequirement = (id: string) => {
    const updatedRequirements = requirements.filter((req) => req.id !== id);
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
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
          placeholder="Add a new requirement"
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
          {requirements.map((requirement) => (
            <li key={requirement.id} className="mb-2 p-2 border rounded shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex-grow">{requirement.text}</span>
                <div>
                  <select
                    className="mr-2 border rounded p-1"
                    value={requirement.status}
                    onChange={(e) => handleStatusChange(requirement.id, e.target.value as Requirement['status'])}
                    aria-label={`Status for requirement: ${requirement.text}`}
                  >
                    <option value="open">Open</option>
                    <option value="inProgress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                    onClick={() => handleDeleteRequirement(requirement.id)}
                    aria-label={`Delete requirement: ${requirement.text}`}
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
      try {
        // Simulate API response
        const fetchedRequirements: Requirement[] = initialRequirements.length > 0 ? initialRequirements : [
          { id: '1', text: 'Define key performance indicators (KPIs)', status: 'open' },
          { id: '2', text: 'Identify target audience and their needs', status: 'inProgress' },
        ];
        setRequirements(fetchedRequirements);
        onRequirementsChange(fetchedRequirements);
        setIsLoading(false);
      } catch (err: any) {
        setError('Failed to load requirements.');
        setIsLoading(false);
        console.error(err);
      }
    }, 500); // Simulate network latency
  }, []); // Empty dependency array to run only on mount

  const handleAddRequirement = () => {
    if (newRequirementText.trim() === '') return;

    const newRequirement: Requirement = {
      id: Math.random().toString(36).substring(2, 15), // Simple ID generation
      text: newRequirementText,
      status: 'open',
    };

    const updatedRequirements = [...requirements, newRequirement];
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
    setNewRequirementText('');
  };

  const handleStatusChange = (id: string, newStatus: Requirement['status']) => {
    const updatedRequirements = requirements.map((req) =>
      req.id === id ? { ...req, status: newStatus } : req
    );
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
  };

  const handleDeleteRequirement = (id: string) => {
    const updatedRequirements = requirements.filter((req) => req.id !== id);
    setRequirements(updatedRequirements);
    onRequirementsChange(updatedRequirements);
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
          placeholder="Add a new requirement"
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
          {requirements.map((requirement) => (
            <li key={requirement.id} className="mb-2 p-2 border rounded shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex-grow">{requirement.text}</span>
                <div>
                  <select
                    className="mr-2 border rounded p-1"
                    value={requirement.status}
                    onChange={(e) => handleStatusChange(requirement.id, e.target.value as Requirement['status'])}
                    aria-label={`Status for requirement: ${requirement.text}`}
                  >
                    <option value="open">Open</option>
                    <option value="inProgress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                    onClick={() => handleDeleteRequirement(requirement.id)}
                    aria-label={`Delete requirement: ${requirement.text}`}
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