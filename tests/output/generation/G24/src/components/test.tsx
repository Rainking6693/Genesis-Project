import React, { useState, useEffect, useCallback } from 'react';

interface Test {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
}

interface WriteTestsProps {
  productId: string;
}

const WriteTests: React.FC<WriteTestsProps> = ({ productId }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newTestName, setNewTestName] = useState<string>('');
  const [newTestDescription, setNewTestDescription] = useState<string>('');

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/products/${productId}/tests`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Test[] = await response.json();
      setTests(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleCreateTest = async () => {
    if (!newTestName || !newTestDescription) {
      setError("Test name and description are required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/products/${productId}/tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTestName,
          description: newTestDescription,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newTest: Test = await response.json();
      setTests([...tests, newTest]);
      setNewTestName('');
      setNewTestDescription('');
      fetchTests(); // Refresh tests after creating a new one

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setTests(tests.filter((test) => test.id !== testId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Write Tests</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}

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
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        onClick={handleCreateTest}
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create Test'}
      </button>

      {loading && <div className="text-gray-500 mt-4">Loading tests...</div>}

      <ul className="mt-4">
        {tests.map((test) => (
          <li key={test.id} className="border rounded p-4 mb-2">
            <h3 className="text-lg font-semibold">{test.name}</h3>
            <p className="text-gray-600">{test.description}</p>
            <p className="text-sm text-gray-500">Status: {test.status}</p>
            <button
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-2"
              onClick={() => handleDeleteTest(test.id)}
              disabled={loading}
              aria-label={`Delete test ${test.name}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
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
  productId: string;
}

const WriteTests: React.FC<WriteTestsProps> = ({ productId }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newTestName, setNewTestName] = useState<string>('');
  const [newTestDescription, setNewTestDescription] = useState<string>('');

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/products/${productId}/tests`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Test[] = await response.json();
      setTests(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleCreateTest = async () => {
    if (!newTestName || !newTestDescription) {
      setError("Test name and description are required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/products/${productId}/tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTestName,
          description: newTestDescription,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newTest: Test = await response.json();
      setTests([...tests, newTest]);
      setNewTestName('');
      setNewTestDescription('');
      fetchTests(); // Refresh tests after creating a new one

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setTests(tests.filter((test) => test.id !== testId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Write Tests</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}

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
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        onClick={handleCreateTest}
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create Test'}
      </button>

      {loading && <div className="text-gray-500 mt-4">Loading tests...</div>}

      <ul className="mt-4">
        {tests.map((test) => (
          <li key={test.id} className="border rounded p-4 mb-2">
            <h3 className="text-lg font-semibold">{test.name}</h3>
            <p className="text-gray-600">{test.description}</p>
            <p className="text-sm text-gray-500">Status: {test.status}</p>
            <button
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-2"
              onClick={() => handleDeleteTest(test.id)}
              disabled={loading}
              aria-label={`Delete test ${test.name}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WriteTests;