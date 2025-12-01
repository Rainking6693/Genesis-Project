import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  name: string;
  description: string;
}

interface GatherRequirementsProps {
  onSubmit: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ onSubmit }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [newRequirementName, setNewRequirementName] = useState<string>('');
  const [newRequirementDescription, setNewRequirementDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading existing requirements from an API
    setIsLoading(true);
    setTimeout(() => {
      setRequirements([
        { id: '1', name: 'Landing Page Design', description: 'Visually appealing and user-friendly design.' },
        { id: '2', name: 'SEO Optimization', description: 'Optimize for search engines to increase visibility.' },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleAddRequirement = () => {
    if (!newRequirementName || !newRequirementDescription) {
      setError('Requirement name and description are required.');
      return;
    }

    const newRequirement: Requirement = {
      id: Math.random().toString(36).substring(2, 15), // Generate a unique ID
      name: newRequirementName,
      description: newRequirementDescription,
    };

    setRequirements([...requirements, newRequirement]);
    setNewRequirementName('');
    setNewRequirementDescription('');
    setError(null);
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((requirement) => requirement.id !== id));
  };

  const handleSubmit = () => {
    if (requirements.length === 0) {
      setError('Please add at least one requirement.');
      return;
    }
    onSubmit(requirements);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Gather Requirements</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}

      {isLoading ? (
        <div className="text-center">Loading requirements...</div>
      ) : (
        <>
          <div className="mb-4">
            <label htmlFor="requirementName" className="block text-gray-700 text-sm font-bold mb-2">
              Requirement Name:
            </label>
            <input
              type="text"
              id="requirementName"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter requirement name"
              value={newRequirementName}
              onChange={(e) => setNewRequirementName(e.target.value)}
              aria-label="Requirement Name"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="requirementDescription" className="block text-gray-700 text-sm font-bold mb-2">
              Requirement Description:
            </label>
            <textarea
              id="requirementDescription"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter requirement description"
              value={newRequirementDescription}
              onChange={(e) => setNewRequirementDescription(e.target.value)}
              aria-label="Requirement Description"
            />
          </div>

          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mb-4"
            onClick={handleAddRequirement}
          >
            Add Requirement
          </button>

          {requirements.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Current Requirements:</h3>
              <ul>
                {requirements.map((requirement) => (
                  <li key={requirement.id} className="mb-2 p-2 border rounded flex items-center justify-between">
                    <div>
                      <p className="font-medium">{requirement.name}</p>
                      <p className="text-gray-600">{requirement.description}</p>
                    </div>
                    <button
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                      onClick={() => handleDeleteRequirement(requirement.id)}
                      aria-label={`Delete requirement ${requirement.name}`}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={handleSubmit}
          >
            Submit Requirements
          </button>
        </>
      )}
    </div>
  );
};

export default GatherRequirements;

import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  name: string;
  description: string;
}

interface GatherRequirementsProps {
  onSubmit: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ onSubmit }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [newRequirementName, setNewRequirementName] = useState<string>('');
  const [newRequirementDescription, setNewRequirementDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading existing requirements from an API
    setIsLoading(true);
    setTimeout(() => {
      setRequirements([
        { id: '1', name: 'Landing Page Design', description: 'Visually appealing and user-friendly design.' },
        { id: '2', name: 'SEO Optimization', description: 'Optimize for search engines to increase visibility.' },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleAddRequirement = () => {
    if (!newRequirementName || !newRequirementDescription) {
      setError('Requirement name and description are required.');
      return;
    }

    const newRequirement: Requirement = {
      id: Math.random().toString(36).substring(2, 15), // Generate a unique ID
      name: newRequirementName,
      description: newRequirementDescription,
    };

    setRequirements([...requirements, newRequirement]);
    setNewRequirementName('');
    setNewRequirementDescription('');
    setError(null);
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((requirement) => requirement.id !== id));
  };

  const handleSubmit = () => {
    if (requirements.length === 0) {
      setError('Please add at least one requirement.');
      return;
    }
    onSubmit(requirements);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Gather Requirements</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}

      {isLoading ? (
        <div className="text-center">Loading requirements...</div>
      ) : (
        <>
          <div className="mb-4">
            <label htmlFor="requirementName" className="block text-gray-700 text-sm font-bold mb-2">
              Requirement Name:
            </label>
            <input
              type="text"
              id="requirementName"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter requirement name"
              value={newRequirementName}
              onChange={(e) => setNewRequirementName(e.target.value)}
              aria-label="Requirement Name"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="requirementDescription" className="block text-gray-700 text-sm font-bold mb-2">
              Requirement Description:
            </label>
            <textarea
              id="requirementDescription"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter requirement description"
              value={newRequirementDescription}
              onChange={(e) => setNewRequirementDescription(e.target.value)}
              aria-label="Requirement Description"
            />
          </div>

          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mb-4"
            onClick={handleAddRequirement}
          >
            Add Requirement
          </button>

          {requirements.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Current Requirements:</h3>
              <ul>
                {requirements.map((requirement) => (
                  <li key={requirement.id} className="mb-2 p-2 border rounded flex items-center justify-between">
                    <div>
                      <p className="font-medium">{requirement.name}</p>
                      <p className="text-gray-600">{requirement.description}</p>
                    </div>
                    <button
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                      onClick={() => handleDeleteRequirement(requirement.id)}
                      aria-label={`Delete requirement ${requirement.name}`}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={handleSubmit}
          >
            Submit Requirements
          </button>
        </>
      )}
    </div>
  );
};

export default GatherRequirements;