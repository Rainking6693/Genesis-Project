import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'inProgress' | 'completed';
}

interface GatherRequirementsProps {
  businessType: string;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ businessType }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        setLoading(true);
        // Simulate API call (replace with actual API endpoint)
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

        const mockRequirements: Requirement[] = [
          { id: '1', name: 'Landing Page Design', description: `Design a visually appealing landing page for ${businessType}.`, status: 'pending' },
          { id: '2', name: 'Content Creation', description: `Write compelling content highlighting the benefits of ${businessType}.`, status: 'inProgress' },
          { id: '3', name: 'SEO Optimization', description: `Optimize the landing page for search engines to attract organic traffic for ${businessType}.`, status: 'pending' },
          { id: '4', name: 'Call to Action', description: `Implement clear and effective calls to action on the landing page for ${businessType}.`, status: 'completed' },
        ];

        setRequirements(mockRequirements);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch requirements.');
        setLoading(false);
      }
    };

    fetchRequirements();
  }, [businessType]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
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
      <h2 className="text-xl font-semibold mb-4">Requirements for {businessType} Landing Page</h2>
      <ul>
        {requirements.map((requirement) => (
          <li key={requirement.id} className="mb-2 p-2 border rounded-md">
            <div className="flex items-center justify-between">
              <span className="font-medium">{requirement.name}</span>
              <span className={`text-sm font-semibold ${
                requirement.status === 'pending' ? 'text-yellow-500' :
                requirement.status === 'inProgress' ? 'text-blue-500' :
                'text-green-500'
              }`}>
                {requirement.status}
              </span>
            </div>
            <p className="text-gray-600">{requirement.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GatherRequirements;

import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'inProgress' | 'completed';
}

interface GatherRequirementsProps {
  businessType: string;
}

const GatherRequirements: React.FC<GatherRequirementsProps> = ({ businessType }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        setLoading(true);
        // Simulate API call (replace with actual API endpoint)
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

        const mockRequirements: Requirement[] = [
          { id: '1', name: 'Landing Page Design', description: `Design a visually appealing landing page for ${businessType}.`, status: 'pending' },
          { id: '2', name: 'Content Creation', description: `Write compelling content highlighting the benefits of ${businessType}.`, status: 'inProgress' },
          { id: '3', name: 'SEO Optimization', description: `Optimize the landing page for search engines to attract organic traffic for ${businessType}.`, status: 'pending' },
          { id: '4', name: 'Call to Action', description: `Implement clear and effective calls to action on the landing page for ${businessType}.`, status: 'completed' },
        ];

        setRequirements(mockRequirements);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch requirements.');
        setLoading(false);
      }
    };

    fetchRequirements();
  }, [businessType]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
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
      <h2 className="text-xl font-semibold mb-4">Requirements for {businessType} Landing Page</h2>
      <ul>
        {requirements.map((requirement) => (
          <li key={requirement.id} className="mb-2 p-2 border rounded-md">
            <div className="flex items-center justify-between">
              <span className="font-medium">{requirement.name}</span>
              <span className={`text-sm font-semibold ${
                requirement.status === 'pending' ? 'text-yellow-500' :
                requirement.status === 'inProgress' ? 'text-blue-500' :
                'text-green-500'
              }`}>
                {requirement.status}
              </span>
            </div>
            <p className="text-gray-600">{requirement.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GatherRequirements;