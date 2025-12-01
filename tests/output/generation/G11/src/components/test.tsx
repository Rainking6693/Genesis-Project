import React, { useState, useEffect } from 'react';

interface Test {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
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

  useEffect(() => {
    const fetchTests = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          const mockTests: Test[] = [
            { id: '1', name: 'Test 1', description: 'Description 1', status: 'completed' },
            { id: '2', name: 'Test 2', description: 'Description 2', status: 'running' },
          ];
          setTests(mockTests);
          setLoading(false);
        }, 500);
      } catch (err: any) {
        setError('Failed to fetch tests.');
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  const handleCreateTest = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        const newTest: Test = {
          id: Math.random().toString(36).substring(7),
          name: newTestName,
          description: newTestDescription,
          status: 'pending',
        };
        setTests([...tests, newTest]);
        setNewTestName('');
        setNewTestDescription('');
        setLoading(false);
      }, 500);
    } catch (err: any) {
      setError('Failed to create test.');
      setLoading(false);
    }
  };

  const handleDeleteTest = async (id: string) => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setTests(tests.filter((test) => test.id !== id));
        setLoading(false);
      }, 500);
    } catch (err: any) {
      setError('Failed to delete test.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
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
          value={newTestName}
          onChange={(e) => setNewTestName(e.target.value)}
          placeholder="Enter test name"
          aria-label="Test Name"
        />

        <label htmlFor="testDescription" className="block text-gray-700 text-sm font-bold mt-2 mb-2">
          Test Description:
        </label>
        <textarea
          id="testDescription"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={newTestDescription}
          onChange={(e) => setNewTestDescription(e.target.value)}
          placeholder="Enter test description"
          aria-label="Test Description"
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
                    <p className="font-medium">{test.name}</p>
                    <p className="text-gray-500">{test.description}</p>
                    <p className="text-sm text-gray-700">Status: {test.status}</p>
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

import React, { useState, useEffect } from 'react';

interface Test {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
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

  useEffect(() => {
    const fetchTests = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          const mockTests: Test[] = [
            { id: '1', name: 'Test 1', description: 'Description 1', status: 'completed' },
            { id: '2', name: 'Test 2', description: 'Description 2', status: 'running' },
          ];
          setTests(mockTests);
          setLoading(false);
        }, 500);
      } catch (err: any) {
        setError('Failed to fetch tests.');
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  const handleCreateTest = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        const newTest: Test = {
          id: Math.random().toString(36).substring(7),
          name: newTestName,
          description: newTestDescription,
          status: 'pending',
        };
        setTests([...tests, newTest]);
        setNewTestName('');
        setNewTestDescription('');
        setLoading(false);
      }, 500);
    } catch (err: any) {
      setError('Failed to create test.');
      setLoading(false);
    }
  };

  const handleDeleteTest = async (id: string) => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setTests(tests.filter((test) => test.id !== id));
        setLoading(false);
      }, 500);
    } catch (err: any) {
      setError('Failed to delete test.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
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
          value={newTestName}
          onChange={(e) => setNewTestName(e.target.value)}
          placeholder="Enter test name"
          aria-label="Test Name"
        />

        <label htmlFor="testDescription" className="block text-gray-700 text-sm font-bold mt-2 mb-2">
          Test Description:
        </label>
        <textarea
          id="testDescription"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={newTestDescription}
          onChange={(e) => setNewTestDescription(e.target.value)}
          placeholder="Enter test description"
          aria-label="Test Description"
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
                    <p className="font-medium">{test.name}</p>
                    <p className="text-gray-500">{test.description}</p>
                    <p className="text-sm text-gray-700">Status: {test.status}</p>
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