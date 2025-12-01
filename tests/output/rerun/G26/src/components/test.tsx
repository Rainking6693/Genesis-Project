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
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency

        const mockTests: Test[] = [
          {
            id: 'test-1',
            name: 'Add to Cart Test',
            description: 'Verify adding product to cart works correctly.',
            status: 'completed',
            createdAt: new Date(),
          },
          {
            id: 'test-2',
            name: 'Checkout Process Test',
            description: 'Verify the checkout process is smooth and successful.',
            status: 'running',
            createdAt: new Date(),
          },
          {
            id: 'test-3',
            name: 'Product Details Test',
            description: 'Verify product details are displayed correctly.',
            status: 'pending',
            createdAt: new Date(),
          },
        ];

        setTests(mockTests);
        setError(null);
      } catch (err: any) {
        setError('Failed to load tests. Please try again.');
        console.error(err);
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
      <div className="text-red-500 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Tests for Product ID: {productId}</h2>
      {tests.length === 0 ? (
        <p>No tests found for this product.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {tests.map((test) => (
            <li key={test.id} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{test.name}</p>
                  <p className="text-gray-500 text-sm">{test.description}</p>
                </div>
                <div className="ml-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      test.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : test.status === 'running'
                        ? 'bg-blue-100 text-blue-800'
                        : test.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {test.status}
                  </span>
                </div>
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
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency

        const mockTests: Test[] = [
          {
            id: 'test-1',
            name: 'Add to Cart Test',
            description: 'Verify adding product to cart works correctly.',
            status: 'completed',
            createdAt: new Date(),
          },
          {
            id: 'test-2',
            name: 'Checkout Process Test',
            description: 'Verify the checkout process is smooth and successful.',
            status: 'running',
            createdAt: new Date(),
          },
          {
            id: 'test-3',
            name: 'Product Details Test',
            description: 'Verify product details are displayed correctly.',
            status: 'pending',
            createdAt: new Date(),
          },
        ];

        setTests(mockTests);
        setError(null);
      } catch (err: any) {
        setError('Failed to load tests. Please try again.');
        console.error(err);
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
      <div className="text-red-500 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Tests for Product ID: {productId}</h2>
      {tests.length === 0 ? (
        <p>No tests found for this product.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {tests.map((test) => (
            <li key={test.id} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{test.name}</p>
                  <p className="text-gray-500 text-sm">{test.description}</p>
                </div>
                <div className="ml-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      test.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : test.status === 'running'
                        ? 'bg-blue-100 text-blue-800'
                        : test.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {test.status}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WriteTests;