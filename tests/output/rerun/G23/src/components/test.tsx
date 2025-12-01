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
      setTests(data.map(test => ({...test, createdAt: new Date(test.createdAt)})));
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
      setError('Test name and description are required.');
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

      await fetchTests(); // Refresh tests after creation
      setNewTestName('');
      setNewTestDescription('');

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
      const response = await fetch(`/api/products/${productId}/tests/${testId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchTests(); // Refresh tests after deletion
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
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
      <h2 className="text-2xl font-semibold mb-4">Write Tests</h2>

      {/* Create Test Form */}
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Create New Test</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Test Name"
            value={newTestName}
            onChange={(e) => setNewTestName(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Test Name"
          />
          <input
            type="text"
            placeholder="Test Description"
            value={newTestDescription}
            onChange={(e) => setNewTestDescription(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Test Description"
          />
          <button
            onClick={handleCreateTest}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Create Test
          </button>
        </div>
      </div>

      {/* Test List */}
      <div>
        <h3 className="text-lg font-medium mb-2">Existing Tests</h3>
        {tests.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {tests.map((test) => (
              <li key={test.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{test.name}</p>
                    <p className="text-gray-500">{test.description}</p>
                    <p className="text-sm text-gray-400">
                      Created At: {test.createdAt.toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-400">
                      Status: {test.status}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteTest(test.id)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No tests found for this product.</p>
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
      setTests(data.map(test => ({...test, createdAt: new Date(test.createdAt)})));
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
      setError('Test name and description are required.');
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

      await fetchTests(); // Refresh tests after creation
      setNewTestName('');
      setNewTestDescription('');

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
      const response = await fetch(`/api/products/${productId}/tests/${testId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchTests(); // Refresh tests after deletion
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
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
      <h2 className="text-2xl font-semibold mb-4">Write Tests</h2>

      {/* Create Test Form */}
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Create New Test</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Test Name"
            value={newTestName}
            onChange={(e) => setNewTestName(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Test Name"
          />
          <input
            type="text"
            placeholder="Test Description"
            value={newTestDescription}
            onChange={(e) => setNewTestDescription(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Test Description"
          />
          <button
            onClick={handleCreateTest}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Create Test
          </button>
        </div>
      </div>

      {/* Test List */}
      <div>
        <h3 className="text-lg font-medium mb-2">Existing Tests</h3>
        {tests.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {tests.map((test) => (
              <li key={test.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{test.name}</p>
                    <p className="text-gray-500">{test.description}</p>
                    <p className="text-sm text-gray-400">
                      Created At: {test.createdAt.toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-400">
                      Status: {test.status}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteTest(test.id)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No tests found for this product.</p>
        )}
      </div>
    </div>
  );
};

export default WriteTests;