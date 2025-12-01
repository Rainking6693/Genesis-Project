import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture';

// Mock any external dependencies, e.g., API calls
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Mock Title',
    description: 'Mock Description',
    image: 'mock-image.jpg',
    features: ['Feature 1', 'Feature 2'],
  })),
}));

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data correctly', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Mock Description/i)).toBeInTheDocument();
      expect(screen.getByAltText(/Design Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 2/i)).toBeInTheDocument();
    });
  });

  it('handles error state when data fetching fails', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch data')));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('renders fallback content when data is empty', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve(null));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('renders fallback content when data is undefined', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve(undefined));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('image has alt text', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const image = screen.getByAltText(/Design Architecture/i);
      expect(image).toBeInTheDocument();
    });
  });

  it('renders with correct aria attributes (accessibility)', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const title = screen.getByText(/Mock Title/i);
      expect(title).toHaveAttribute('aria-label');
    });
  });

  it('handles empty features array gracefully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Title',
      description: 'Mock Description',
      image: 'mock-image.jpg',
      features: [],
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByRole('list')).not.toBeInTheDocument(); // Or any other appropriate check
    });
  });

  it('handles null image gracefully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Title',
      description: 'Mock Description',
      image: null,
      features: ['Feature 1'],
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByAltText(/Design Architecture/i)).not.toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture';

// Mock any external dependencies, e.g., API calls
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Mock Title',
    description: 'Mock Description',
    image: 'mock-image.jpg',
    features: ['Feature 1', 'Feature 2'],
  })),
}));

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data correctly', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Mock Description/i)).toBeInTheDocument();
      expect(screen.getByAltText(/Design Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 2/i)).toBeInTheDocument();
    });
  });

  it('handles error state when data fetching fails', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch data')));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('renders fallback content when data is empty', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve(null));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('renders fallback content when data is undefined', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve(undefined));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('image has alt text', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const image = screen.getByAltText(/Design Architecture/i);
      expect(image).toBeInTheDocument();
    });
  });

  it('renders with correct aria attributes (accessibility)', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const title = screen.getByText(/Mock Title/i);
      expect(title).toHaveAttribute('aria-label');
    });
  });

  it('handles empty features array gracefully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Title',
      description: 'Mock Description',
      image: 'mock-image.jpg',
      features: [],
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByRole('list')).not.toBeInTheDocument(); // Or any other appropriate check
    });
  });

  it('handles null image gracefully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Title',
      description: 'Mock Description',
      image: null,
      features: ['Feature 1'],
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByAltText(/Design Architecture/i)).not.toBeInTheDocument();
    });
  });
});