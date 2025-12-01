import React, { useState, useEffect } from 'react';

interface Test {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
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
        const response = await fetch(`/api/products/${productId}/tests`); // Replace with your API endpoint
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
      <h2 className="text-2xl font-bold mb-4">Tests for Product ID: {productId}</h2>
      {tests.length === 0 ? (
        <p>No tests found for this product.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <div key={test.id} className="bg-white shadow-md rounded-md p-4">
              <h3 className="text-lg font-semibold">{test.name}</h3>
              <p className="text-gray-600">{test.description}</p>
              <p className="mt-2">
                Status: <span className={`font-bold ${
                  test.status === 'pending' ? 'text-yellow-500' :
                  test.status === 'running' ? 'text-blue-500' :
                  test.status === 'completed' ? 'text-green-500' :
                  'text-red-500'
                }`}>{test.status}</span>
              </p>
              <p className="text-sm text-gray-500">Created At: {new Date(test.createdAt).toLocaleDateString()}</p>
              <p className="text-sm text-gray-500">Updated At: {new Date(test.updatedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
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
  updatedAt: Date;
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
        const response = await fetch(`/api/products/${productId}/tests`); // Replace with your API endpoint
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
      <h2 className="text-2xl font-bold mb-4">Tests for Product ID: {productId}</h2>
      {tests.length === 0 ? (
        <p>No tests found for this product.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <div key={test.id} className="bg-white shadow-md rounded-md p-4">
              <h3 className="text-lg font-semibold">{test.name}</h3>
              <p className="text-gray-600">{test.description}</p>
              <p className="mt-2">
                Status: <span className={`font-bold ${
                  test.status === 'pending' ? 'text-yellow-500' :
                  test.status === 'running' ? 'text-blue-500' :
                  test.status === 'completed' ? 'text-green-500' :
                  'text-red-500'
                }`}>{test.status}</span>
              </p>
              <p className="text-sm text-gray-500">Created At: {new Date(test.createdAt).toLocaleDateString()}</p>
              <p className="text-sm text-gray-500">Updated At: {new Date(test.updatedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WriteTests;