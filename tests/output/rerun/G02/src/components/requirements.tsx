import React, { useState, useEffect } from 'react';

interface Requirement {
  id: string;
  name: string;
  description: string;
}

interface RequirementsProps {
  businessType: string;
}

const GatherRequirements: React.FC<RequirementsProps> = ({ businessType }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        setLoading(true);
        // Simulate API call (replace with actual API endpoint)
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency

        const mockRequirements: Requirement[] = [
          { id: '1', name: 'Clear Value Proposition', description: `Clearly articulate the value proposition of your ${businessType} landing page.` },
          { id: '2', name: 'Target Audience Definition', description: `Identify and understand your target audience for the ${businessType} landing page.` },
          { id: '3', name: 'Compelling Call to Action', description: `Define a clear and compelling call to action for visitors to take on your ${businessType} landing page.` },
          { id: '4', name: 'High-Quality Visuals', description: `Gather high-quality images and videos to enhance the visual appeal of your ${businessType} landing page.` },
          { id: '5', name: 'Mobile Responsiveness', description: `Ensure your ${businessType} landing page is fully responsive and optimized for mobile devices.` },
        ];

        setRequirements(mockRequirements);
        setLoading(false);
      } catch (err: any) {
        setError('Failed to load requirements. Please try again.');
        setLoading(false);
        console.error(err);
      }
    };

    fetchRequirements();
  }, [businessType]);

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
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-4">Gather Requirements</h2>
      <p className="text-gray-700 mb-4">
        Before building your {businessType} landing page, let's gather some key requirements:
      </p>
      <ul>
        {requirements.map((requirement) => (
          <li key={requirement.id} className="mb-2">
            <strong className="font-medium">{requirement.name}:</strong> {requirement.description}
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
}

interface RequirementsProps {
  businessType: string;
}

const GatherRequirements: React.FC<RequirementsProps> = ({ businessType }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        setLoading(true);
        // Simulate API call (replace with actual API endpoint)
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency

        const mockRequirements: Requirement[] = [
          { id: '1', name: 'Clear Value Proposition', description: `Clearly articulate the value proposition of your ${businessType} landing page.` },
          { id: '2', name: 'Target Audience Definition', description: `Identify and understand your target audience for the ${businessType} landing page.` },
          { id: '3', name: 'Compelling Call to Action', description: `Define a clear and compelling call to action for visitors to take on your ${businessType} landing page.` },
          { id: '4', name: 'High-Quality Visuals', description: `Gather high-quality images and videos to enhance the visual appeal of your ${businessType} landing page.` },
          { id: '5', name: 'Mobile Responsiveness', description: `Ensure your ${businessType} landing page is fully responsive and optimized for mobile devices.` },
        ];

        setRequirements(mockRequirements);
        setLoading(false);
      } catch (err: any) {
        setError('Failed to load requirements. Please try again.');
        setLoading(false);
        console.error(err);
      }
    };

    fetchRequirements();
  }, [businessType]);

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
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-4">Gather Requirements</h2>
      <p className="text-gray-700 mb-4">
        Before building your {businessType} landing page, let's gather some key requirements:
      </p>
      <ul>
        {requirements.map((requirement) => (
          <li key={requirement.id} className="mb-2">
            <strong className="font-medium">{requirement.name}:</strong> {requirement.description}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GatherRequirements;