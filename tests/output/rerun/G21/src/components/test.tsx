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
          throw new Error(`HTTP error! Status: ${response.status}`);
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
      <h2 className="text-2xl font-semibold mb-4">Tests for Product ID: {productId}</h2>
      {tests.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {tests.map((test) => (
            <li key={test.id} className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{test.name}</p>
                  <p className="text-sm text-gray-500 truncate">{test.description}</p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
        <p>No tests found for this product.</p>
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
          throw new Error(`HTTP error! Status: ${response.status}`);
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
      <h2 className="text-2xl font-semibold mb-4">Tests for Product ID: {productId}</h2>
      {tests.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {tests.map((test) => (
            <li key={test.id} className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{test.name}</p>
                  <p className="text-sm text-gray-500 truncate">{test.description}</p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
        <p>No tests found for this product.</p>
      )}
    </div>
  );
};

export default WriteTests;