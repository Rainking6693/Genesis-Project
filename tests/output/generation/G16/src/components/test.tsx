import React, { useState, useEffect, useCallback } from 'react';

interface Test {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
}

interface WriteTestsProps {
  // Add any props the component needs here
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
      // Replace with your actual API endpoint
      const response = await fetch('/api/tests');
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
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleCreateTest = async () => {
    if (!newTestName.trim()) {
      alert('Test name cannot be empty.');
      return;
    }

    try {
      const newTest = {
        name: newTestName,
        description: newTestDescription,
      };

      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setNewTestName('');
      setNewTestDescription('');
      fetchTests(); // Refresh the test list
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteTest = async (id: string) => {
    try {
      const response = await fetch(`/api/tests/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      fetchTests(); // Refresh the test list
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading tests...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-4">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Write Tests</h1>

      {/* Create Test Form */}
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
        />

        <label htmlFor="testDescription" className="block text-gray-700 text-sm font-bold mt-2 mb-2">
          Test Description:
        </label>
        <textarea
          id="testDescription"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter test description"
          value={newTestDescription}
          onChange={(e) => setNewTestDescription(e.target.value)}
        />

        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
          onClick={handleCreateTest}
        >
          Create Test
        </button>
      </div>

      {/* Test List */}
      <div>
        <h2 className="text-xl font-bold mb-2">Existing Tests</h2>
        {tests.length === 0 ? (
          <p>No tests available.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {tests.map((test) => (
              <li key={test.id} className="py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{test.name}</p>
                    <p className="text-gray-600">{test.description}</p>
                    <p className="text-sm text-gray-500">Created: {new Date(test.createdAt).toLocaleDateString()}</p>
                    <p className={`text-sm ${
                      test.status === 'pending' ? 'text-yellow-500' :
                      test.status === 'running' ? 'text-blue-500' :
                      test.status === 'completed' ? 'text-green-500' :
                      'text-red-500'
                    }`}>
                      Status: {test.status}
                    </p>
                  </div>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    onClick={() => handleDeleteTest(test.id)}
                    aria-label={`Delete test ${test.name}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
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
  // Add any props the component needs here
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
      // Replace with your actual API endpoint
      const response = await fetch('/api/tests');
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
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleCreateTest = async () => {
    if (!newTestName.trim()) {
      alert('Test name cannot be empty.');
      return;
    }

    try {
      const newTest = {
        name: newTestName,
        description: newTestDescription,
      };

      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setNewTestName('');
      setNewTestDescription('');
      fetchTests(); // Refresh the test list
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteTest = async (id: string) => {
    try {
      const response = await fetch(`/api/tests/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      fetchTests(); // Refresh the test list
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading tests...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-4">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Write Tests</h1>

      {/* Create Test Form */}
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
        />

        <label htmlFor="testDescription" className="block text-gray-700 text-sm font-bold mt-2 mb-2">
          Test Description:
        </label>
        <textarea
          id="testDescription"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter test description"
          value={newTestDescription}
          onChange={(e) => setNewTestDescription(e.target.value)}
        />

        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
          onClick={handleCreateTest}
        >
          Create Test
        </button>
      </div>

      {/* Test List */}
      <div>
        <h2 className="text-xl font-bold mb-2">Existing Tests</h2>
        {tests.length === 0 ? (
          <p>No tests available.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {tests.map((test) => (
              <li key={test.id} className="py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{test.name}</p>
                    <p className="text-gray-600">{test.description}</p>
                    <p className="text-sm text-gray-500">Created: {new Date(test.createdAt).toLocaleDateString()}</p>
                    <p className={`text-sm ${
                      test.status === 'pending' ? 'text-yellow-500' :
                      test.status === 'running' ? 'text-blue-500' :
                      test.status === 'completed' ? 'text-green-500' :
                      'text-red-500'
                    }`}>
                      Status: {test.status}
                    </p>
                  </div>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    onClick={() => handleDeleteTest(test.id)}
                    aria-label={`Delete test ${test.name}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default WriteTests;