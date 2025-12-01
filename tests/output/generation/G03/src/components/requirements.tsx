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
          { id: '1', name: 'Landing Page Design', description: `Visually appealing design tailored for a ${businessType} business.` },
          { id: '2', name: 'Lead Capture Form', description: 'Integrated form to collect potential customer information.' },
          { id: '3', name: 'Responsive Layout', description: 'Ensures optimal viewing experience across all devices.' },
          { id: '4', name: 'SEO Optimization', description: 'Basic SEO setup to improve search engine visibility.' },
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
      <h2 className="text-2xl font-semibold mb-4">Essential Requirements for Your {businessType} Landing Page</h2>
      <ul>
        {requirements.map((requirement) => (
          <li key={requirement.id} className="mb-4">
            <h3 className="text-lg font-medium">{requirement.name}</h3>
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
          { id: '1', name: 'Landing Page Design', description: `Visually appealing design tailored for a ${businessType} business.` },
          { id: '2', name: 'Lead Capture Form', description: 'Integrated form to collect potential customer information.' },
          { id: '3', name: 'Responsive Layout', description: 'Ensures optimal viewing experience across all devices.' },
          { id: '4', name: 'SEO Optimization', description: 'Basic SEO setup to improve search engine visibility.' },
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
      <h2 className="text-2xl font-semibold mb-4">Essential Requirements for Your {businessType} Landing Page</h2>
      <ul>
        {requirements.map((requirement) => (
          <li key={requirement.id} className="mb-4">
            <h3 className="text-lg font-medium">{requirement.name}</h3>
            <p className="text-gray-700">{requirement.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GatherRequirements;