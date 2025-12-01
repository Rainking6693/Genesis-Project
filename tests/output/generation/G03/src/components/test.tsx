import React, { useState } from 'react';

interface WriteTestsProps {
  onSubmit: (data: { testType: string; description: string }) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const WriteTests: React.FC<WriteTestsProps> = ({ onSubmit, isLoading, error, clearError }) => {
  const [testType, setTestType] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (error) {
      clearError();
    }
    await onSubmit({ testType, description });
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="block text-gray-700 text-xl font-bold mb-2">Write Tests</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="testType">
            Test Type
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="testType"
            type="text"
            placeholder="e.g., Unit Test, Integration Test"
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
            aria-label="Test Type"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="description"
            placeholder="Describe the test"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Test Description"
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
        {error && (
          <div className="mt-4 text-red-500">
            Error: {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default WriteTests;

import React, { useState } from 'react';

interface WriteTestsProps {
  onSubmit: (data: { testType: string; description: string }) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const WriteTests: React.FC<WriteTestsProps> = ({ onSubmit, isLoading, error, clearError }) => {
  const [testType, setTestType] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (error) {
      clearError();
    }
    await onSubmit({ testType, description });
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="block text-gray-700 text-xl font-bold mb-2">Write Tests</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="testType">
            Test Type
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="testType"
            type="text"
            placeholder="e.g., Unit Test, Integration Test"
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
            aria-label="Test Type"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="description"
            placeholder="Describe the test"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Test Description"
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
        {error && (
          <div className="mt-4 text-red-500">
            Error: {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default WriteTests;