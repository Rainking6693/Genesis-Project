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

  useEffect(() => {
    const fetchTests = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          const mockTests: Test[] = [
            { id: '1', name: 'Test 1', description: 'Checks basic functionality', status: 'completed', createdAt: new Date() },
            { id: '2', name: 'Test 2', description: 'Validates user input', status: 'running', createdAt: new Date() },
            { id: '3', name: 'Test 3', description: 'Verifies data integrity', status: 'pending', createdAt: new Date() },
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Write Tests</h1>
      {tests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <div key={test.id} className="bg-white shadow-md rounded-md p-4">
              <h2 className="text-lg font-semibold">{test.name}</h2>
              <p className="text-gray-600">{test.description}</p>
              <p className="mt-2">
                Status: <span className={`font-medium ${test.status === 'completed' ? 'text-green-500' : test.status === 'running' ? 'text-blue-500' : test.status === 'failed' ? 'text-red-500' : 'text-gray-500'}`}>{test.status}</span>
              </p>
              <p className="text-sm text-gray-400">Created At: {test.createdAt.toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>No tests available.</p>
      )}
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

  useEffect(() => {
    const fetchTests = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          const mockTests: Test[] = [
            { id: '1', name: 'Test 1', description: 'Checks basic functionality', status: 'completed', createdAt: new Date() },
            { id: '2', name: 'Test 2', description: 'Validates user input', status: 'running', createdAt: new Date() },
            { id: '3', name: 'Test 3', description: 'Verifies data integrity', status: 'pending', createdAt: new Date() },
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Write Tests</h1>
      {tests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <div key={test.id} className="bg-white shadow-md rounded-md p-4">
              <h2 className="text-lg font-semibold">{test.name}</h2>
              <p className="text-gray-600">{test.description}</p>
              <p className="mt-2">
                Status: <span className={`font-medium ${test.status === 'completed' ? 'text-green-500' : test.status === 'running' ? 'text-blue-500' : test.status === 'failed' ? 'text-red-500' : 'text-gray-500'}`}>{test.status}</span>
              </p>
              <p className="text-sm text-gray-400">Created At: {test.createdAt.toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>No tests available.</p>
      )}
    </div>
  );
};

export default WriteTests;