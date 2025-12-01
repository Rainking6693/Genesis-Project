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
        setError(err.message || 'Failed to fetch tests.');
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
          createdAt: new Date(),
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">Error: {error}</div>
    );
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
        <h2 className="text-xl font-semibold mb-2">Existing Tests</h2>
        {tests.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {tests.map((test) => (
              <li key={test.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{test.name}</p>
                    <p className="text-gray-500">{test.description}</p>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      test.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      test.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      test.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {test.status}
                    </span>
                  </div>
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
        setError(err.message || 'Failed to fetch tests.');
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
          createdAt: new Date(),
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">Error: {error}</div>
    );
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
        <h2 className="text-xl font-semibold mb-2">Existing Tests</h2>
        {tests.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {tests.map((test) => (
              <li key={test.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{test.name}</p>
                    <p className="text-gray-500">{test.description}</p>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      test.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      test.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      test.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {test.status}
                    </span>
                  </div>
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