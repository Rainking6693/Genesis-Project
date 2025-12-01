import React, { useState, useEffect, useCallback } from 'react';

interface Test {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
}

interface WriteTestsProps {
  // Add any props needed for the component
}

const WriteTests: React.FC<WriteTestsProps> = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newTestName, setNewTestName] = useState<string>('');
  const [newTestDescription, setNewTestDescription] = useState<string>('');

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
      const mockTests: Test[] = [
        { id: '1', name: 'Test 1', description: 'Description 1', status: 'completed', createdAt: new Date() },
        { id: '2', name: 'Test 2', description: 'Description 2', status: 'running', createdAt: new Date() },
      ];
      setTests(mockTests);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleCreateTest = async () => {
    if (!newTestName.trim()) {
      alert('Test name is required.');
      return;
    }

    try {
      // Simulate API call to create a test
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      const newTest: Test = {
        id: String(Date.now()), // Generate a unique ID
        name: newTestName,
        description: newTestDescription,
        status: 'pending',
        createdAt: new Date(),
      };

      setTests(prevTests => [...prevTests, newTest]);
      setNewTestName('');
      setNewTestDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to create test.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Write Tests</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="testName" className="block text-gray-700 text-sm font-bold mb-2">
          Test Name:
        </label>
        <input
          type="text"
          id="testName"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter test name"
          value={newTestName}
          onChange={(e) => setNewTestName(e.target.value)}
          aria-label="Test Name"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="testDescription" className="block text-gray-700 text-sm font-bold mb-2">
          Test Description:
        </label>
        <textarea
          id="testDescription"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter test description"
          value={newTestDescription}
          onChange={(e) => setNewTestDescription(e.target.value)}
          aria-label="Test Description"
        />
      </div>

      <button
        className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleCreateTest}
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create Test'}
      </button>

      {loading && <div className="text-gray-500 mt-4">Loading tests...</div>}

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Existing Tests</h2>
        {tests.length === 0 && !loading && <p>No tests found.</p>}
        <ul>
          {tests.map((test) => (
            <li key={test.id} className="mb-2 p-2 border rounded">
              <div className="font-bold">{test.name}</div>
              <div className="text-gray-600">{test.description}</div>
              <div>Status: {test.status}</div>
              <div>Created At: {test.createdAt.toLocaleDateString()}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default WriteTests;

import React, { useState, useEffect, useCallback } from 'react';

interface Test {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
}

interface WriteTestsProps {
  // Add any props needed for the component
}

const WriteTests: React.FC<WriteTestsProps> = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newTestName, setNewTestName] = useState<string>('');
  const [newTestDescription, setNewTestDescription] = useState<string>('');

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
      const mockTests: Test[] = [
        { id: '1', name: 'Test 1', description: 'Description 1', status: 'completed', createdAt: new Date() },
        { id: '2', name: 'Test 2', description: 'Description 2', status: 'running', createdAt: new Date() },
      ];
      setTests(mockTests);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleCreateTest = async () => {
    if (!newTestName.trim()) {
      alert('Test name is required.');
      return;
    }

    try {
      // Simulate API call to create a test
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      const newTest: Test = {
        id: String(Date.now()), // Generate a unique ID
        name: newTestName,
        description: newTestDescription,
        status: 'pending',
        createdAt: new Date(),
      };

      setTests(prevTests => [...prevTests, newTest]);
      setNewTestName('');
      setNewTestDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to create test.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Write Tests</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="testName" className="block text-gray-700 text-sm font-bold mb-2">
          Test Name:
        </label>
        <input
          type="text"
          id="testName"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter test name"
          value={newTestName}
          onChange={(e) => setNewTestName(e.target.value)}
          aria-label="Test Name"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="testDescription" className="block text-gray-700 text-sm font-bold mb-2">
          Test Description:
        </label>
        <textarea
          id="testDescription"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter test description"
          value={newTestDescription}
          onChange={(e) => setNewTestDescription(e.target.value)}
          aria-label="Test Description"
        />
      </div>

      <button
        className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleCreateTest}
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create Test'}
      </button>

      {loading && <div className="text-gray-500 mt-4">Loading tests...</div>}

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Existing Tests</h2>
        {tests.length === 0 && !loading && <p>No tests found.</p>}
        <ul>
          {tests.map((test) => (
            <li key={test.id} className="mb-2 p-2 border rounded">
              <div className="font-bold">{test.name}</div>
              <div className="text-gray-600">{test.description}</div>
              <div>Status: {test.status}</div>
              <div>Created At: {test.createdAt.toLocaleDateString()}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default WriteTests;