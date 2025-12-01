import React, { useState, useEffect } from 'react';

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
      <h2 className="text-2xl font-semibold mb-4">Tests for Product: {productId}</h2>
      {tests.length === 0 ? (
        <p className="text-gray-500">No tests found for this product.</p>
      ) : (
        <ul className="space-y-4">
          {tests.map((test) => (
            <li key={test.id} className="bg-white shadow rounded-md p-4">
              <h3 className="text-lg font-medium">{test.name}</h3>
              <p className="text-gray-700">{test.description}</p>
              <div className="mt-2">
                <span className="font-semibold">Status:</span>
                <span className={`ml-1 ${
                  test.status === 'pending' ? 'text-yellow-500' :
                  test.status === 'running' ? 'text-blue-500' :
                  test.status === 'completed' ? 'text-green-500' :
                  'text-red-500'
                }`}>{test.status}</span>
              </div>
              <div className="mt-2">
                <span className="font-semibold">Created At:</span>
                <span className="ml-1">{new Date(test.createdAt).toLocaleDateString()}</span>
              </div>
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
  createdAt: Date;
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
      <h2 className="text-2xl font-semibold mb-4">Tests for Product: {productId}</h2>
      {tests.length === 0 ? (
        <p className="text-gray-500">No tests found for this product.</p>
      ) : (
        <ul className="space-y-4">
          {tests.map((test) => (
            <li key={test.id} className="bg-white shadow rounded-md p-4">
              <h3 className="text-lg font-medium">{test.name}</h3>
              <p className="text-gray-700">{test.description}</p>
              <div className="mt-2">
                <span className="font-semibold">Status:</span>
                <span className={`ml-1 ${
                  test.status === 'pending' ? 'text-yellow-500' :
                  test.status === 'running' ? 'text-blue-500' :
                  test.status === 'completed' ? 'text-green-500' :
                  'text-red-500'
                }`}>{test.status}</span>
              </div>
              <div className="mt-2">
                <span className="font-semibold">Created At:</span>
                <span className="ml-1">{new Date(test.createdAt).toLocaleDateString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WriteTests;