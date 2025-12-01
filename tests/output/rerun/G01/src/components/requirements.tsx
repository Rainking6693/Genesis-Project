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
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        const mockRequirements: Requirement[] = [
          { id: '1', name: 'Target Audience', description: `Define your ideal customer for a ${businessType} landing page.` },
          { id: '2', name: 'Key Message', description: `Craft a compelling message that resonates with your audience for a ${businessType} landing page.` },
          { id: '3', name: 'Call to Action', description: `Determine the primary action you want visitors to take on your ${businessType} landing page.` },
          { id: '4', name: 'Visual Assets', description: `Gather high-quality images and videos relevant to your ${businessType} business.` },
          { id: '5', name: 'Unique Selling Proposition', description: `Identify what makes your ${businessType} business stand out from the competition.` },
        ];

        setRequirements(mockRequirements);
        setLoading(false);
      } catch (err: any) {
        setError('Failed to load requirements. Please try again.');
        setLoading(false);
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
        Before we start building your landing page, let's gather some essential information.
      </p>
      <ul className="list-disc list-inside">
        {requirements.map((requirement) => (
          <li key={requirement.id} className="mb-2">
            <strong className="font-medium">{requirement.name}:</strong> {requirement.description}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-gray-700">
        Having these details ready will help us create a highly effective landing page for your {businessType} business.
      </p>
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
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        const mockRequirements: Requirement[] = [
          { id: '1', name: 'Target Audience', description: `Define your ideal customer for a ${businessType} landing page.` },
          { id: '2', name: 'Key Message', description: `Craft a compelling message that resonates with your audience for a ${businessType} landing page.` },
          { id: '3', name: 'Call to Action', description: `Determine the primary action you want visitors to take on your ${businessType} landing page.` },
          { id: '4', name: 'Visual Assets', description: `Gather high-quality images and videos relevant to your ${businessType} business.` },
          { id: '5', name: 'Unique Selling Proposition', description: `Identify what makes your ${businessType} business stand out from the competition.` },
        ];

        setRequirements(mockRequirements);
        setLoading(false);
      } catch (err: any) {
        setError('Failed to load requirements. Please try again.');
        setLoading(false);
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
        Before we start building your landing page, let's gather some essential information.
      </p>
      <ul className="list-disc list-inside">
        {requirements.map((requirement) => (
          <li key={requirement.id} className="mb-2">
            <strong className="font-medium">{requirement.name}:</strong> {requirement.description}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-gray-700">
        Having these details ready will help us create a highly effective landing page for your {businessType} business.
      </p>
    </div>
  );
};

export default GatherRequirements;