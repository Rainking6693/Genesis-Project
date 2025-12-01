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
          { id: '3', name: 'Call to Action (CTA)', description: `Define a clear and compelling call to action for users on the ${businessType} landing page.` },
          { id: '4', name: 'Key Features/Benefits', description: `Outline the key features and benefits of your ${businessType} offering.` },
          { id: '5', name: 'Visual Design & Branding', description: `Establish a consistent visual design and branding for the ${businessType} landing page.` },
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
        <p>Loading requirements...</p>
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
      <h2 className="text-2xl font-bold mb-4">Gather Requirements for Your {businessType} Landing Page</h2>
      <ul>
        {requirements.map((requirement) => (
          <li key={requirement.id} className="mb-4 p-4 border rounded-md shadow-sm">
            <h3 className="font-semibold text-lg">{requirement.name}</h3>
            <p className="text-gray-700">{requirement.description}</p>
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
          { id: '3', name: 'Call to Action (CTA)', description: `Define a clear and compelling call to action for users on the ${businessType} landing page.` },
          { id: '4', name: 'Key Features/Benefits', description: `Outline the key features and benefits of your ${businessType} offering.` },
          { id: '5', name: 'Visual Design & Branding', description: `Establish a consistent visual design and branding for the ${businessType} landing page.` },
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
        <p>Loading requirements...</p>
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
      <h2 className="text-2xl font-bold mb-4">Gather Requirements for Your {businessType} Landing Page</h2>
      <ul>
        {requirements.map((requirement) => (
          <li key={requirement.id} className="mb-4 p-4 border rounded-md shadow-sm">
            <h3 className="font-semibold text-lg">{requirement.name}</h3>
            <p className="text-gray-700">{requirement.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GatherRequirements;