import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiCheckCircle, FiAlertCircle, FiLoader, FiTrash2 } from 'react-icons/fi';

interface TestFile {
  id: string;
  file: File;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
  preview?: string;
}

interface TestResult {
  id: string;
  name: string;
  score: number;
  date: string;
  status: 'passed' | 'failed' | 'pending';
}

const WriteTests: React.FC = () => {
  const [testFiles, setTestFiles] = useState<TestFile[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processTestFiles = useCallback(async () => {
    if (testFiles.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Simulate API call for processing test files
      await new Promise(resolve => setTimeout(resolve, 2000));

      const results: TestResult[] = testFiles.map((file, index) => ({
        id: file.id,
        name: file.file.name,
        score: Math.random() > 0.3 ? 85 + Math.floor(Math.random() * 15) : 30 + Math.floor(Math.random() * 40),
        date: new Date().toISOString(),
        status: Math.random() > 0.3 ? 'passed' : 'failed'
      }));

      setTestResults(prev => [...prev, ...results]);

      setTestFiles(prev =>
        prev.map(file => ({
          ...file,
          status: 'completed',
          progress: 100
        }))
      );
    } catch (err) {
      setError('Failed to process test files. Please try again.');
      setTestFiles(prev =>
        prev.map(file => ({
          ...file,
          status: 'error',
          progress: 0
        }))
      );
    } finally {
      setIsProcessing(false);
    }
  }, [testFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/plain': ['.js', '.ts', '.jsx', '.tsx'],
      'application/json': ['.json']
    },
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: useCallback((acceptedFiles: File[]) => {
      setError(null);
      const newFiles = acceptedFiles.map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        status: 'uploading' as const,
        progress: 0,
        preview: URL.createObjectURL(file)
      }));

      setTestFiles(prev => [...prev, ...newFiles]);

      // Simulate upload progress
      newFiles.forEach((newFile, index) => {
        const interval = setInterval(() => {
          setTestFiles(prev => {
            const updatedFiles = prev.map(f =>
              f.id === newFile.id && f.progress < 100
                ? { ...f, progress: Math.min(f.progress + 10, 95) }
                : f
            );

            if (updatedFiles.some(f => f.id === newFile.id && f.progress >= 95)) {
              clearInterval(interval);
              return updatedFiles.map(f =>
                f.id === newFile.id ? { ...f, status: 'completed', progress: 100 } : f
              );
            }

            return updatedFiles;
          });
        }, 300);
      });
    }, []),
    onDropRejected: useCallback(() => {
      setError('Some files were rejected. Only .js, .ts, .jsx, .tsx, and .json files under 5MB are allowed.');
    }, []),
    onError: useCallback(() => {
      setError('An error occurred while uploading files.');
    }, [])
  });

  const removeFile = useCallback((id: string) => {
    setTestFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });

    setTestResults(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearAllFiles = useCallback(() => {
    testFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setTestFiles([]);
    setTestResults([]);
  }, [testFiles]);

  useEffect(() => {
    return () => {
      testFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [testFiles]);

  const getStatusIcon = (status: TestFile['status']) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="text-green-500" aria-label="Upload completed" />;
      case 'error':
        return <FiAlertCircle className="text-red-500" aria-label="Upload failed" />;
      case 'uploading':
        return <FiLoader className="text-blue-500 animate-spin" aria-label="Uploading" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-md space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Write Tests</h2>
        <p className="text-gray-600">
          Upload your test files to validate your landing page functionality.
          Supported formats: .js, .ts, .jsx, .tsx, .json (Max 5MB per file)
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${error ? 'border-red-500 bg-red-50' : ''}`}
        aria-label="Drag and drop area for test files"
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        <FiUploadCloud className={`mx-auto h-10 w-10 ${error ? 'text-red-500' : 'text-gray-400'}`} />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive
            ? 'Drop the files here'
            : error
            ? error
            : 'Drag and drop your test files here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-gray-500">JS/TS files or JSON configurations</p>
      </div>

      {testFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-700">Uploaded Files</h3>
            <button
              onClick={clearAllFiles}
              className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
              aria-label="Clear all files"
            >
              <FiTrash2 className="h-4 w-4" />
              Clear All
            </button>
          </div>

          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            {testFiles.map(file => (
              <li key={file.id} className="p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getStatusIcon(file.status)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate" title={file.file.name}>
                        {file.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {Math.round(file.file.size / 1024)} KB • {file.status}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {file.status === 'uploading' && (
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300 ease-out"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={`Remove ${file.file.name}`}
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex justify-end">
            <button
              onClick={processTestFiles}
              disabled={isProcessing || testFiles.some(f => f.status !== 'completed')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                isProcessing || testFiles.some(f => f.status !== 'completed')
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isProcessing ? (
                <>
                  <FiLoader className="animate-spin h-4 w-4" />
                  Processing...
                </>
              ) : (
                'Run Tests'
              )}
            </button>
          </div>
        </div>
      )}

      {testResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">Test Results</h3>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {testResults.map(result => (
                  <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(result.status)}`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.score}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(result.date).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Tests</p>
                <p className="text-2xl font-bold text-gray-900">{testResults.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Passed</p>
                <p className="text-2xl font-bold text-green-600">
                  {testResults.filter(r => r.status === 'passed').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {testResults.filter(r => r.status === 'failed').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WriteTests;