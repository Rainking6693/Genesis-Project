import React, { useState, useEffect } from 'react';

interface Test {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
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
            { id: '1', name: 'Test 1', description: 'Description 1', status: 'completed', createdAt: new Date() },
            { id: '2', name: 'Test 2', description: 'Description 2', status: 'running', createdAt: new Date() },
          ];
          setTests(mockTests);
          setLoading(false);
        }, 500);
      } catch (err: any) {
        setError('Failed to load tests.');
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  const handleCreateTest = async () => {
    if (!newTestName.trim()) {
      alert('Test name cannot be empty.');
      return;
    }

    try {
      // Simulate API call to create a new test
      setLoading(true);
      setTimeout(() => {
        const newTest: Test = {
          id: String(Date.now()),
          name: newTestName,
          description: newTestDescription,
          status: 'pending',
          createdAt: new Date(),
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
      // Simulate API call to delete a test
      setLoading(true);
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
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
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
        <h2 className="text-lg font-semibold mb-2">Create New Test</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Test Name"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={newTestName}
            onChange={(e) => setNewTestName(e.target.value)}
            aria-label="Test Name"
          />
          <input
            type="text"
            placeholder="Test Description"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={newTestDescription}
            onChange={(e) => setNewTestDescription(e.target.value)}
            aria-label="Test Description"
          />
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={handleCreateTest}
          >
            Create Test
          </button>
        </div>
      </div>

      {/* Test List */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Existing Tests</h2>
        {tests.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {tests.map((test) => (
              <li key={test.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{test.name}</p>
                    <p className="text-gray-500">{test.description}</p>
                    <p className="text-sm text-gray-400">Created: {test.createdAt.toLocaleDateString()}</p>
                    <p className="text-sm">Status: {test.status}</p>
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
        ) : (
          <p>No tests found.</p>
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
  createdAt: Date;
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
            { id: '1', name: 'Test 1', description: 'Description 1', status: 'completed', createdAt: new Date() },
            { id: '2', name: 'Test 2', description: 'Description 2', status: 'running', createdAt: new Date() },
          ];
          setTests(mockTests);
          setLoading(false);
        }, 500);
      } catch (err: any) {
        setError('Failed to load tests.');
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  const handleCreateTest = async () => {
    if (!newTestName.trim()) {
      alert('Test name cannot be empty.');
      return;
    }

    try {
      // Simulate API call to create a new test
      setLoading(true);
      setTimeout(() => {
        const newTest: Test = {
          id: String(Date.now()),
          name: newTestName,
          description: newTestDescription,
          status: 'pending',
          createdAt: new Date(),
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
      // Simulate API call to delete a test
      setLoading(true);
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
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
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
        <h2 className="text-lg font-semibold mb-2">Create New Test</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Test Name"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={newTestName}
            onChange={(e) => setNewTestName(e.target.value)}
            aria-label="Test Name"
          />
          <input
            type="text"
            placeholder="Test Description"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={newTestDescription}
            onChange={(e) => setNewTestDescription(e.target.value)}
            aria-label="Test Description"
          />
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={handleCreateTest}
          >
            Create Test
          </button>
        </div>
      </div>

      {/* Test List */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Existing Tests</h2>
        {tests.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {tests.map((test) => (
              <li key={test.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{test.name}</p>
                    <p className="text-gray-500">{test.description}</p>
                    <p className="text-sm text-gray-400">Created: {test.createdAt.toLocaleDateString()}</p>
                    <p className="text-sm">Status: {test.status}</p>
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
        ) : (
          <p>No tests found.</p>
        )}
      </div>
    </div>
  );
};

export default WriteTests;