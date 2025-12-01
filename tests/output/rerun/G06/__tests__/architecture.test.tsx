import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture';

// Mock any external dependencies or API calls
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Mock Architecture',
    description: 'Mock Description',
    features: ['Feature 1', 'Feature 2'],
    image: 'mock-image.jpg',
  })),
}));

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with loading state', () => {
    render(<DesignArchitecture businessType="landing" />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data correctly', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/Mock Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 2/i)).toBeInTheDocument();
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'mock-image.jpg');
    });
  });

  it('handles error state when data fetching fails', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.reject(new Error('Failed to fetch data')));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('renders fallback content when data is empty', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.resolve(null));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('renders fallback content when data is undefined', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.resolve(undefined));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('renders fallback content when data is an empty object', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.resolve({}));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('renders image with alt text', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('alt', 'Mock Architecture');
    });
  });

  it('renders features as a list', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
  });

  it('applies correct styling', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      const container = screen.getByTestId('design-architecture-container');
      expect(container).toBeInTheDocument();
    });
  });

  it('handles different business types', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation((type) => Promise.resolve({
      title: `Mock Architecture for ${type}`,
      description: `Mock Description for ${type}`,
      features: [`Feature 1 for ${type}`, `Feature 2 for ${type}`],
      image: `mock-image-${type}.jpg`,
    }));

    render(<DesignArchitecture businessType="ecommerce" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('ecommerce');
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Architecture for ecommerce/i)).toBeInTheDocument();
      expect(screen.getByText(/Mock Description for ecommerce/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 1 for ecommerce/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 2 for ecommerce/i)).toBeInTheDocument();
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'mock-image-ecommerce.jpg');
    });
  });

  it('renders with default props when no props are passed', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation((type) => Promise.resolve({
      title: `Mock Architecture for ${type}`,
      description: `Mock Description for ${type}`,
      features: [`Feature 1 for ${type}`, `Feature 2 for ${type}`],
      image: `mock-image-${type}.jpg`,
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith(undefined);
    });
  });

  it('renders accessibility attributes', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

     await waitFor(() => {
        const imageElement = screen.getByRole('img');
        expect(imageElement).toHaveAttribute('alt');
     });
  });

  it('handles re-fetching data on prop change', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    const { rerender } = render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    fetchDesignArchitectureData.mockClear();

    rerender(<DesignArchitecture businessType="ecommerce" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('ecommerce');
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture';

// Mock any external dependencies or API calls
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Mock Architecture',
    description: 'Mock Description',
    features: ['Feature 1', 'Feature 2'],
    image: 'mock-image.jpg',
  })),
}));

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with loading state', () => {
    render(<DesignArchitecture businessType="landing" />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data correctly', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/Mock Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 2/i)).toBeInTheDocument();
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'mock-image.jpg');
    });
  });

  it('handles error state when data fetching fails', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.reject(new Error('Failed to fetch data')));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('renders fallback content when data is empty', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.resolve(null));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('renders fallback content when data is undefined', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.resolve(undefined));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('renders fallback content when data is an empty object', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.resolve({}));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('renders image with alt text', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('alt', 'Mock Architecture');
    });
  });

  it('renders features as a list', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
  });

  it('applies correct styling', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      const container = screen.getByTestId('design-architecture-container');
      expect(container).toBeInTheDocument();
    });
  });

  it('handles different business types', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation((type) => Promise.resolve({
      title: `Mock Architecture for ${type}`,
      description: `Mock Description for ${type}`,
      features: [`Feature 1 for ${type}`, `Feature 2 for ${type}`],
      image: `mock-image-${type}.jpg`,
    }));

    render(<DesignArchitecture businessType="ecommerce" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('ecommerce');
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Architecture for ecommerce/i)).toBeInTheDocument();
      expect(screen.getByText(/Mock Description for ecommerce/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 1 for ecommerce/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 2 for ecommerce/i)).toBeInTheDocument();
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'mock-image-ecommerce.jpg');
    });
  });

  it('renders with default props when no props are passed', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation((type) => Promise.resolve({
      title: `Mock Architecture for ${type}`,
      description: `Mock Description for ${type}`,
      features: [`Feature 1 for ${type}`, `Feature 2 for ${type}`],
      image: `mock-image-${type}.jpg`,
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith(undefined);
    });
  });

  it('renders accessibility attributes', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

     await waitFor(() => {
        const imageElement = screen.getByRole('img');
        expect(imageElement).toHaveAttribute('alt');
     });
  });

  it('handles re-fetching data on prop change', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    const { rerender } = render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    fetchDesignArchitectureData.mockClear();

    rerender(<DesignArchitecture businessType="ecommerce" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('ecommerce');
    });
  });
});