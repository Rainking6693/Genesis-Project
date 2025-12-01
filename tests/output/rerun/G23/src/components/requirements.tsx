import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in progress' | 'completed';
}

interface RequirementsFormProps {
  onRequirementAdded: (requirement: Requirement) => void;
}

const RequirementsForm: React.FC<RequirementsFormProps> = ({ onRequirementAdded }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!name || !description) {
        throw new Error('Name and description are required.');
      }

      const newRequirement: Requirement = {
        id: Math.random().toString(36).substring(2, 15),
        name,
        description,
        priority,
        status: 'open',
      };

      onRequirementAdded(newRequirement);
      setName('');
      setDescription('');
      setPriority('medium');

    } catch (err: any) {
      setError(err.message || 'Failed to add requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="block text-gray-700 text-xl font-bold mb-2">Add New Requirement</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Name:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="name"
            type="text"
            placeholder="Requirement Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Requirement Name"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Description:
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="description"
            placeholder="Requirement Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Requirement Description"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="priority">
            Priority:
          </label>
          <select
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
            aria-label="Requirement Priority"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add Requirement'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm italic mt-4">{error}</p>}
      </form>
    </div>
  );
};

interface RequirementsListProps {
  requirements: Requirement[];
}

const RequirementsList: React.FC<RequirementsListProps> = ({ requirements }) => {
  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="block text-gray-700 text-xl font-bold mb-2">Requirements List</h2>
      {requirements.length === 0 ? (
        <p>No requirements added yet.</p>
      ) : (
        <ul className="list-disc pl-5">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="mb-2">
              <strong>{requirement.name}</strong> - {requirement.description} (Priority: {requirement.priority})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const GatherRequirements: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);

  const handleRequirementAdded = (newRequirement: Requirement) => {
    setRequirements([...requirements, newRequirement]);
  };

  return (
    <div className="container mx-auto p-4">
      <RequirementsForm onRequirementAdded={handleRequirementAdded} />
      <RequirementsList requirements={requirements} />
    </div>
  );
};

export default GatherRequirements;

import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in progress' | 'completed';
}

interface RequirementsFormProps {
  onRequirementAdded: (requirement: Requirement) => void;
}

const RequirementsForm: React.FC<RequirementsFormProps> = ({ onRequirementAdded }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!name || !description) {
        throw new Error('Name and description are required.');
      }

      const newRequirement: Requirement = {
        id: Math.random().toString(36).substring(2, 15),
        name,
        description,
        priority,
        status: 'open',
      };

      onRequirementAdded(newRequirement);
      setName('');
      setDescription('');
      setPriority('medium');

    } catch (err: any) {
      setError(err.message || 'Failed to add requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="block text-gray-700 text-xl font-bold mb-2">Add New Requirement</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Name:
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="name"
            type="text"
            placeholder="Requirement Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Requirement Name"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Description:
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="description"
            placeholder="Requirement Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Requirement Description"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="priority">
            Priority:
          </label>
          <select
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
            aria-label="Requirement Priority"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add Requirement'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm italic mt-4">{error}</p>}
      </form>
    </div>
  );
};

interface RequirementsListProps {
  requirements: Requirement[];
}

const RequirementsList: React.FC<RequirementsListProps> = ({ requirements }) => {
  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="block text-gray-700 text-xl font-bold mb-2">Requirements List</h2>
      {requirements.length === 0 ? (
        <p>No requirements added yet.</p>
      ) : (
        <ul className="list-disc pl-5">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="mb-2">
              <strong>{requirement.name}</strong> - {requirement.description} (Priority: {requirement.priority})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const GatherRequirements: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);

  const handleRequirementAdded = (newRequirement: Requirement) => {
    setRequirements([...requirements, newRequirement]);
  };

  return (
    <div className="container mx-auto p-4">
      <RequirementsForm onRequirementAdded={handleRequirementAdded} />
      <RequirementsList requirements={requirements} />
    </div>
  );
};

export default GatherRequirements;