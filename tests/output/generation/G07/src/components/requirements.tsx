import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  text: string;
}

interface RequirementsProps {
  onSubmit: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<RequirementsProps> = ({ onSubmit }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [newRequirementText, setNewRequirementText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading requirements from an API
    setIsLoading(true);
    setTimeout(() => {
      // Replace with actual API call
      // Example:
      // fetch('/api/requirements')
      //   .then(res => res.json())
      //   .then(data => {
      //     setRequirements(data);
      //     setIsLoading(false);
      //   })
      //   .catch(err => {
      //     setError('Failed to load requirements.');
      //     setIsLoading(false);
      //   });

      setRequirements([
        { id: '1', text: 'Define target audience' },
        { id: '2', text: 'Outline key features' },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleAddRequirement = () => {
    if (newRequirementText.trim() === '') return;

    const newRequirement: Requirement = {
      id: String(Date.now()),
      text: newRequirementText.trim(),
    };

    setRequirements([...requirements, newRequirement]);
    setNewRequirementText('');
  };

  const handleRemoveRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  const handleSubmit = () => {
    onSubmit(requirements);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Gather Requirements</h2>

      {isLoading && <div className="text-gray-500">Loading requirements...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <ul className="mb-4">
        {requirements.map((req) => (
          <li key={req.id} className="flex items-center justify-between py-2 border-b border-gray-200">
            <span>{req.text}</span>
            <button
              onClick={() => handleRemoveRequirement(req.id)}
              className="text-red-500 hover:text-red-700 focus:outline-none"
              aria-label={`Remove requirement: ${req.text}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center mb-4">
        <input
          type="text"
          placeholder="Add a new requirement"
          value={newRequirementText}
          onChange={(e) => setNewRequirementText(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
          aria-label="New requirement"
        />
        <button
          onClick={handleAddRequirement}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Add
        </button>
      </div>

      <button
        onClick={handleSubmit}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        Submit Requirements
      </button>
    </div>
  );
};

export default GatherRequirements;

import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  text: string;
}

interface RequirementsProps {
  onSubmit: (requirements: Requirement[]) => void;
}

const GatherRequirements: React.FC<RequirementsProps> = ({ onSubmit }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [newRequirementText, setNewRequirementText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading requirements from an API
    setIsLoading(true);
    setTimeout(() => {
      // Replace with actual API call
      // Example:
      // fetch('/api/requirements')
      //   .then(res => res.json())
      //   .then(data => {
      //     setRequirements(data);
      //     setIsLoading(false);
      //   })
      //   .catch(err => {
      //     setError('Failed to load requirements.');
      //     setIsLoading(false);
      //   });

      setRequirements([
        { id: '1', text: 'Define target audience' },
        { id: '2', text: 'Outline key features' },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleAddRequirement = () => {
    if (newRequirementText.trim() === '') return;

    const newRequirement: Requirement = {
      id: String(Date.now()),
      text: newRequirementText.trim(),
    };

    setRequirements([...requirements, newRequirement]);
    setNewRequirementText('');
  };

  const handleRemoveRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  const handleSubmit = () => {
    onSubmit(requirements);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Gather Requirements</h2>

      {isLoading && <div className="text-gray-500">Loading requirements...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <ul className="mb-4">
        {requirements.map((req) => (
          <li key={req.id} className="flex items-center justify-between py-2 border-b border-gray-200">
            <span>{req.text}</span>
            <button
              onClick={() => handleRemoveRequirement(req.id)}
              className="text-red-500 hover:text-red-700 focus:outline-none"
              aria-label={`Remove requirement: ${req.text}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center mb-4">
        <input
          type="text"
          placeholder="Add a new requirement"
          value={newRequirementText}
          onChange={(e) => setNewRequirementText(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
          aria-label="New requirement"
        />
        <button
          onClick={handleAddRequirement}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Add
        </button>
      </div>

      <button
        onClick={handleSubmit}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        Submit Requirements
      </button>
    </div>
  );
};

export default GatherRequirements;