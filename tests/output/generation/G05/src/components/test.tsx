import React, { useState } from 'react';

interface WriteTestsProps {
  onSubmit: (testData: any) => Promise<void>; // Replace 'any' with a more specific type if possible
  onCancel?: () => void;
}

interface TestInput {
  question: string;
  answer: string;
}

const WriteTests: React.FC<WriteTestsProps> = ({ onSubmit, onCancel }) => {
  const [tests, setTests] = useState<TestInput[]>([{ question: '', answer: '' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (index: number, event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    const newTests = [...tests];
    newTests[index][name] = value;
    setTests(newTests);
  };

  const handleAddTest = () => {
    setTests([...tests, { question: '', answer: '' }]);
  };

  const handleRemoveTest = (index: number) => {
    const newTests = [...tests];
    newTests.splice(index, 1);
    setTests(newTests);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(tests);
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the tests.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="block text-gray-700 text-xl font-bold mb-4">Write Tests</h2>
      <form onSubmit={handleSubmit}>
        {tests.map((test, index) => (
          <div key={index} className="mb-6 border p-4 rounded">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={`question-${index}`}>
              Question
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`question-${index}`}
              name="question"
              value={test.question}
              onChange={(e) => handleInputChange(index, e)}
              placeholder="Enter question"
              aria-label={`Question ${index + 1}`}
              rows={3}
            />

            <label className="block text-gray-700 text-sm font-bold mb-2 mt-4" htmlFor={`answer-${index}`}>
              Answer
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`answer-${index}`}
              name="answer"
              value={test.answer}
              onChange={(e) => handleInputChange(index, e)}
              placeholder="Enter answer"
              aria-label={`Answer ${index + 1}`}
              rows={3}
            />
            {tests.length > 1 && (
              <button
                type="button"
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
                onClick={() => handleRemoveTest(index)}
              >
                Remove
              </button>
            )}
          </div>
        ))}

        <div className="flex items-center justify-between">
          <button
            type="button"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={handleAddTest}
          >
            Add Test
          </button>
          <div>
            {onCancel && (
              <button
                type="button"
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
            <button
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm italic mt-4">{error}</p>}
      </form>
    </div>
  );
};

export default WriteTests;

import React, { useState } from 'react';

interface WriteTestsProps {
  onSubmit: (testData: any) => Promise<void>; // Replace 'any' with a more specific type if possible
  onCancel?: () => void;
}

interface TestInput {
  question: string;
  answer: string;
}

const WriteTests: React.FC<WriteTestsProps> = ({ onSubmit, onCancel }) => {
  const [tests, setTests] = useState<TestInput[]>([{ question: '', answer: '' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (index: number, event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    const newTests = [...tests];
    newTests[index][name] = value;
    setTests(newTests);
  };

  const handleAddTest = () => {
    setTests([...tests, { question: '', answer: '' }]);
  };

  const handleRemoveTest = (index: number) => {
    const newTests = [...tests];
    newTests.splice(index, 1);
    setTests(newTests);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(tests);
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the tests.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="block text-gray-700 text-xl font-bold mb-4">Write Tests</h2>
      <form onSubmit={handleSubmit}>
        {tests.map((test, index) => (
          <div key={index} className="mb-6 border p-4 rounded">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={`question-${index}`}>
              Question
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`question-${index}`}
              name="question"
              value={test.question}
              onChange={(e) => handleInputChange(index, e)}
              placeholder="Enter question"
              aria-label={`Question ${index + 1}`}
              rows={3}
            />

            <label className="block text-gray-700 text-sm font-bold mb-2 mt-4" htmlFor={`answer-${index}`}>
              Answer
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`answer-${index}`}
              name="answer"
              value={test.answer}
              onChange={(e) => handleInputChange(index, e)}
              placeholder="Enter answer"
              aria-label={`Answer ${index + 1}`}
              rows={3}
            />
            {tests.length > 1 && (
              <button
                type="button"
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
                onClick={() => handleRemoveTest(index)}
              >
                Remove
              </button>
            )}
          </div>
        ))}

        <div className="flex items-center justify-between">
          <button
            type="button"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={handleAddTest}
          >
            Add Test
          </button>
          <div>
            {onCancel && (
              <button
                type="button"
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
            <button
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm italic mt-4">{error}</p>}
      </form>
    </div>
  );
};

export default WriteTests;