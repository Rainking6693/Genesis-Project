import React, { useState, useEffect, useCallback } from 'react';

interface Test {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
}

interface WriteTestsProps {
  // Define any props the component might receive here
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
    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/tests', {
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

      setNewTestName('');
      setNewTestDescription('');
      await fetchTests(); // Refresh the test list
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteTest = async (id: string) => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/tests/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchTests(); // Refresh the test list
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading tests...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">Error: {error}</div>;
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
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-2"
          onClick={handleCreateTest}
          aria-label="Create Test"
        >
          Create Test
        </button>
      </div>

      {/* Test List */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b text-left">Name</th>
              <th className="py-2 px-4 border-b text-left">Description</th>
              <th className="py-2 px-4 border-b text-left">Status</th>
              <th className="py-2 px-4 border-b text-left">Created At</th>
              <th className="py-2 px-4 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => (
              <tr key={test.id}>
                <td className="py-2 px-4 border-b">{test.name}</td>
                <td className="py-2 px-4 border-b">{test.description}</td>
                <td className="py-2 px-4 border-b">{test.status}</td>
                <td className="py-2 px-4 border-b">{test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td className="py-2 px-4 border-b">
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                    onClick={() => handleDeleteTest(test.id)}
                    aria-label={`Delete Test ${test.name}`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
  // Define any props the component might receive here
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
    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/tests', {
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

      setNewTestName('');
      setNewTestDescription('');
      await fetchTests(); // Refresh the test list
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteTest = async (id: string) => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/tests/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchTests(); // Refresh the test list
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading tests...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">Error: {error}</div>;
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
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-2"
          onClick={handleCreateTest}
          aria-label="Create Test"
        >
          Create Test
        </button>
      </div>

      {/* Test List */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b text-left">Name</th>
              <th className="py-2 px-4 border-b text-left">Description</th>
              <th className="py-2 px-4 border-b text-left">Status</th>
              <th className="py-2 px-4 border-b text-left">Created At</th>
              <th className="py-2 px-4 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => (
              <tr key={test.id}>
                <td className="py-2 px-4 border-b">{test.name}</td>
                <td className="py-2 px-4 border-b">{test.description}</td>
                <td className="py-2 px-4 border-b">{test.status}</td>
                <td className="py-2 px-4 border-b">{test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td className="py-2 px-4 border-b">
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                    onClick={() => handleDeleteTest(test.id)}
                    aria-label={`Delete Test ${test.name}`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WriteTests;