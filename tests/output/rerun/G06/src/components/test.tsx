import React, { useState } from 'react';

interface WriteTestsProps {
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
}

interface FormState {
  testName: string;
  description: string;
  estimatedTime: number;
  priority: 'high' | 'medium' | 'low';
}

const WriteTests: React.FC<WriteTestsProps> = ({ onSubmit, initialData }) => {
  const [formState, setFormState] = useState<FormState>(
    initialData || {
      testName: '',
      description: '',
      estimatedTime: 0,
      priority: 'medium',
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formState);
      // Optionally reset the form after successful submission
      setFormState({
        testName: '',
        description: '',
        estimatedTime: 0,
        priority: 'medium',
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the form.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Write Tests</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="testName" className="block text-gray-700 text-sm font-bold mb-2">
            Test Name:
          </label>
          <input
            type="text"
            id="testName"
            name="testName"
            value={formState.testName}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter test name"
            aria-label="Test Name"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
            Description:
          </label>
          <textarea
            id="description"
            name="description"
            value={formState.description}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter description"
            aria-label="Description"
            rows={3}
          />
        </div>
        <div>
          <label htmlFor="estimatedTime" className="block text-gray-700 text-sm font-bold mb-2">
            Estimated Time (hours):
          </label>
          <input
            type="number"
            id="estimatedTime"
            name="estimatedTime"
            value={formState.estimatedTime}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter estimated time"
            aria-label="Estimated Time"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="priority" className="block text-gray-700 text-sm font-bold mb-2">
            Priority:
          </label>
          <select
            id="priority"
            name="priority"
            value={formState.priority}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Priority"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <button
            type="submit"
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WriteTests;

import React, { useState } from 'react';

interface WriteTestsProps {
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
}

interface FormState {
  testName: string;
  description: string;
  estimatedTime: number;
  priority: 'high' | 'medium' | 'low';
}

const WriteTests: React.FC<WriteTestsProps> = ({ onSubmit, initialData }) => {
  const [formState, setFormState] = useState<FormState>(
    initialData || {
      testName: '',
      description: '',
      estimatedTime: 0,
      priority: 'medium',
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formState);
      // Optionally reset the form after successful submission
      setFormState({
        testName: '',
        description: '',
        estimatedTime: 0,
        priority: 'medium',
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the form.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Write Tests</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">{error}</span>
      </div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="testName" className="block text-gray-700 text-sm font-bold mb-2">
            Test Name:
          </label>
          <input
            type="text"
            id="testName"
            name="testName"
            value={formState.testName}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter test name"
            aria-label="Test Name"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
            Description:
          </label>
          <textarea
            id="description"
            name="description"
            value={formState.description}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter description"
            aria-label="Description"
            rows={3}
          />
        </div>
        <div>
          <label htmlFor="estimatedTime" className="block text-gray-700 text-sm font-bold mb-2">
            Estimated Time (hours):
          </label>
          <input
            type="number"
            id="estimatedTime"
            name="estimatedTime"
            value={formState.estimatedTime}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter estimated time"
            aria-label="Estimated Time"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="priority" className="block text-gray-700 text-sm font-bold mb-2">
            Priority:
          </label>
          <select
            id="priority"
            name="priority"
            value={formState.priority}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            aria-label="Priority"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <button
            type="submit"
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WriteTests;