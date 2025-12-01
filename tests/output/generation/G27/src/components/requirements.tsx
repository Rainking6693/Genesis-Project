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
        throw new Error("Name and description are required.");
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
      setError(err.message || 'An error occurred while adding the requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="block text-gray-700 text-xl font-bold mb-2">Add New Requirement</h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline">{error}</span>
        </div>}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Name
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
            Description
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
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="priority">
            Priority
          </label>
          <div className="relative">
            <select
              className="block appearance-none w-full bg-white border border-gray-400 hover:border-gray-500 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline"
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
              aria-label="Requirement Priority"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="submit"
            disabled={isLoading}
            aria-label="Add Requirement"
          >
            {isLoading ? 'Adding...' : 'Add Requirement'}
          </button>
        </div>
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
        <p className="text-gray-600">No requirements added yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{requirement.name}</p>
                  <p className="text-sm text-gray-500 truncate">{requirement.description}</p>
                </div>
                <div className="ml-2 flex-shrink-0">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      requirement.priority === 'high' ? 'bg-red-100 text-red-800' :
                      requirement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                    {requirement.priority}
                  </span>
                </div>
              </div>
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
      <h1 className="text-2xl font-bold mb-4">Gather Ecommerce Requirements</h1>
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
        throw new Error("Name and description are required.");
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
      setError(err.message || 'An error occurred while adding the requirement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="block text-gray-700 text-xl font-bold mb-2">Add New Requirement</h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline">{error}</span>
        </div>}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Name
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
            Description
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
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="priority">
            Priority
          </label>
          <div className="relative">
            <select
              className="block appearance-none w-full bg-white border border-gray-400 hover:border-gray-500 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline"
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
              aria-label="Requirement Priority"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="submit"
            disabled={isLoading}
            aria-label="Add Requirement"
          >
            {isLoading ? 'Adding...' : 'Add Requirement'}
          </button>
        </div>
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
        <p className="text-gray-600">No requirements added yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{requirement.name}</p>
                  <p className="text-sm text-gray-500 truncate">{requirement.description}</p>
                </div>
                <div className="ml-2 flex-shrink-0">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      requirement.priority === 'high' ? 'bg-red-100 text-red-800' :
                      requirement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                    {requirement.priority}
                  </span>
                </div>
              </div>
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
      <h1 className="text-2xl font-bold mb-4">Gather Ecommerce Requirements</h1>
      <RequirementsForm onRequirementAdded={handleRequirementAdded} />
      <RequirementsList requirements={requirements} />
    </div>
  );
};

export default GatherRequirements;