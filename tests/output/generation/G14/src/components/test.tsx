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
            { id: '1', name: 'Login Test', description: 'Tests user login functionality', status: 'completed', createdAt: new Date() },
            { id: '2', name: 'Dashboard Load Test', description: 'Tests dashboard loading performance', status: 'running', createdAt: new Date() },
            { id: '3', name: 'Data Fetch Test', description: 'Tests fetching data from the API', status: 'pending', createdAt: new Date() },
          ];
          setTests(mockTests);
          setLoading(false);
        }, 500); // Simulate API latency
      } catch (err: any) {
        setError('Failed to fetch tests.');
        setLoading(false);
        console.error(err);
      }
    };

    fetchTests();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Write Tests</h1>
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
            { id: '1', name: 'Login Test', description: 'Tests user login functionality', status: 'completed', createdAt: new Date() },
            { id: '2', name: 'Dashboard Load Test', description: 'Tests dashboard loading performance', status: 'running', createdAt: new Date() },
            { id: '3', name: 'Data Fetch Test', description: 'Tests fetching data from the API', status: 'pending', createdAt: new Date() },
          ];
          setTests(mockTests);
          setLoading(false);
        }, 500); // Simulate API latency
      } catch (err: any) {
        setError('Failed to fetch tests.');
        setLoading(false);
        console.error(err);
      }
    };

    fetchTests();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Write Tests</h1>
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
  );
};

export default WriteTests;