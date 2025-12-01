import React, { useState, useEffect } from 'react';

interface Test {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: any;
}

interface WriteTestsProps {
  productId: string;
}

const WriteTests: React.FC<WriteTestsProps> = ({ productId }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true);
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
    };

    fetchTests();
  }, [productId]);

  const handleRunTest = async (testId: string) => {
    try {
      // Optimistically update the UI
      setTests(prevTests =>
        prevTests.map(test =>
          test.id === testId ? { ...test, status: 'running' } : test
        )
      );

      // Replace with your actual API endpoint
      const response = await fetch(`/api/tests/${testId}/run`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert to previous state if the request fails
        setTests(prevTests =>
          prevTests.map(test =>
            test.id === testId ? { ...test, status: 'failed' } : test
          )
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      setTests(prevTests =>
        prevTests.map(test =>
          test.id === testId ? { ...test, status: 'completed', results: result } : test
        )
      );
    } catch (e: any) {
      setError(e.message);
      // Revert to previous state if the request fails
      setTests(prevTests =>
        prevTests.map(test =>
          test.id === testId ? { ...test, status: 'failed' } : test
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <p>Loading tests...</p>
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
      <h2 className="text-2xl font-semibold mb-4">Tests for Product ID: {productId}</h2>
      {tests.length === 0 ? (
        <p>No tests found for this product.</p>
      ) : (
        <ul className="space-y-4">
          {tests.map((test) => (
            <li key={test.id} className="border rounded-md p-4 shadow-sm">
              <h3 className="text-lg font-medium">{test.name}</h3>
              <p className="text-gray-600">{test.description}</p>
              <div className="mt-2">
                <span className="font-semibold">Status:</span> {test.status}
              </div>
              {test.results && (
                <div className="mt-2">
                  <span className="font-semibold">Results:</span>
                  <pre>{JSON.stringify(test.results, null, 2)}</pre>
                </div>
              )}
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4 focus:outline-none focus:shadow-outline"
                onClick={() => handleRunTest(test.id)}
                disabled={test.status === 'running' || test.status === 'completed'}
                aria-label={`Run test ${test.name}`}
              >
                {test.status === 'running' ? 'Running...' : 'Run Test'}
              </button>
            </li>
          ))}
        </ul>
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
  results?: any;
}

interface WriteTestsProps {
  productId: string;
}

const WriteTests: React.FC<WriteTestsProps> = ({ productId }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true);
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
    };

    fetchTests();
  }, [productId]);

  const handleRunTest = async (testId: string) => {
    try {
      // Optimistically update the UI
      setTests(prevTests =>
        prevTests.map(test =>
          test.id === testId ? { ...test, status: 'running' } : test
        )
      );

      // Replace with your actual API endpoint
      const response = await fetch(`/api/tests/${testId}/run`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert to previous state if the request fails
        setTests(prevTests =>
          prevTests.map(test =>
            test.id === testId ? { ...test, status: 'failed' } : test
          )
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      setTests(prevTests =>
        prevTests.map(test =>
          test.id === testId ? { ...test, status: 'completed', results: result } : test
        )
      );
    } catch (e: any) {
      setError(e.message);
      // Revert to previous state if the request fails
      setTests(prevTests =>
        prevTests.map(test =>
          test.id === testId ? { ...test, status: 'failed' } : test
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <p>Loading tests...</p>
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
      <h2 className="text-2xl font-semibold mb-4">Tests for Product ID: {productId}</h2>
      {tests.length === 0 ? (
        <p>No tests found for this product.</p>
      ) : (
        <ul className="space-y-4">
          {tests.map((test) => (
            <li key={test.id} className="border rounded-md p-4 shadow-sm">
              <h3 className="text-lg font-medium">{test.name}</h3>
              <p className="text-gray-600">{test.description}</p>
              <div className="mt-2">
                <span className="font-semibold">Status:</span> {test.status}
              </div>
              {test.results && (
                <div className="mt-2">
                  <span className="font-semibold">Results:</span>
                  <pre>{JSON.stringify(test.results, null, 2)}</pre>
                </div>
              )}
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4 focus:outline-none focus:shadow-outline"
                onClick={() => handleRunTest(test.id)}
                disabled={test.status === 'running' || test.status === 'completed'}
                aria-label={`Run test ${test.name}`}
              >
                {test.status === 'running' ? 'Running...' : 'Run Test'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WriteTests;