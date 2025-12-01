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
        // Replace with your actual API endpoint or data source
        const response = await fetch(`/api/requirements?businessType=${businessType}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: Requirement[] = await response.json();
        setRequirements(data);
        setLoading(false);
      } catch (e: any) {
        setError(e.message);
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
      <div className="text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h2 className="text-2xl font-bold mb-4">Gather Requirements for {businessType}</h2>
      {requirements.length > 0 ? (
        <ul className="space-y-4">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="bg-white shadow-md rounded-md p-4">
              <h3 className="text-lg font-semibold">{requirement.name}</h3>
              <p className="text-gray-700">{requirement.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No requirements found for {businessType}.</p>
      )}
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
        // Replace with your actual API endpoint or data source
        const response = await fetch(`/api/requirements?businessType=${businessType}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: Requirement[] = await response.json();
        setRequirements(data);
        setLoading(false);
      } catch (e: any) {
        setError(e.message);
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
      <div className="text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h2 className="text-2xl font-bold mb-4">Gather Requirements for {businessType}</h2>
      {requirements.length > 0 ? (
        <ul className="space-y-4">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="bg-white shadow-md rounded-md p-4">
              <h3 className="text-lg font-semibold">{requirement.name}</h3>
              <p className="text-gray-700">{requirement.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No requirements found for {businessType}.</p>
      )}
    </div>
  );
};

export default GatherRequirements;