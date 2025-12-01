import React, { useState, useEffect } from 'react';

interface Test {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface WriteTestsProps {
  // Define any props the component needs here
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
        setError(err.message || 'Failed to fetch tests.');
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  const handleCreateTest = async () => {
    try {
      setLoading(true);
      // Simulate API call to create a new test
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
      setError(err.message || 'Failed to create test.');
      setLoading(false);
    }
  };

  const handleDeleteTest = async (id: string) => {
    try {
      setLoading(true);
      // Simulate API call to delete a test
      setTimeout(() => {
        setTests(tests.filter((test) => test.id !== id));
        setLoading(false);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to delete test.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Write Tests</h1>

      {/* Create New Test Form */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Create New Test</h2>
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
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Create
          </button>
        </div>
      </div>

      {/* List of Tests */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Existing Tests</h2>
        {tests.length === 0 ? (
          <p>No tests found.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {tests.map((test) => (
              <li key={test.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{test.name}</p>
                    <p className="text-gray-500">{test.description}</p>
                    <p className="text-sm">Status: {test.status}</p>
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
  // Define any props the component needs here
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
        setError(err.message || 'Failed to fetch tests.');
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  const handleCreateTest = async () => {
    try {
      setLoading(true);
      // Simulate API call to create a new test
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
      setError(err.message || 'Failed to create test.');
      setLoading(false);
    }
  };

  const handleDeleteTest = async (id: string) => {
    try {
      setLoading(true);
      // Simulate API call to delete a test
      setTimeout(() => {
        setTests(tests.filter((test) => test.id !== id));
        setLoading(false);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to delete test.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Write Tests</h1>

      {/* Create New Test Form */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Create New Test</h2>
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
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Create
          </button>
        </div>
      </div>

      {/* List of Tests */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Existing Tests</h2>
        {tests.length === 0 ? (
          <p>No tests found.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {tests.map((test) => (
              <li key={test.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{test.name}</p>
                    <p className="text-gray-500">{test.description}</p>
                    <p className="text-sm">Status: {test.status}</p>
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
        )}
      </div>
    </div>
  );
};

export default WriteTests;