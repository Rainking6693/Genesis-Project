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

  it('renders the component with loading state', () => {
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
      expect(screen.getByText(/Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 2/i)).toBeInTheDocument();
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'mock-image.jpg');
      expect(imageElement).toHaveAttribute('alt', 'Mock Title');
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

  it('renders alternative text for image when image fails to load', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      fireEvent.error(imageElement);
      expect(imageElement).toHaveAttribute('alt', 'Mock Title');
    });
  });

  it('renders without crashing when data is empty', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({}));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Mock Title/i)).toBeNull();
      expect(screen.queryByText(/Mock Description/i)).toBeNull();
    });
  });

  it('renders with default values when some data fields are missing', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Title',
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Title/i)).toBeInTheDocument();
    });
  });

  it('is accessible', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('alt', 'Mock Title');
    });
  });

  it('displays a retry button after an error', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch data')));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });

  it('retries fetching data when the retry button is clicked', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch data')));
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Title',
      description: 'Mock Description',
      image: 'mock-image.jpg',
      features: ['Feature 1', 'Feature 2'],
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    });

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Title/i)).toBeInTheDocument();
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

  it('renders the component with loading state', () => {
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
      expect(screen.getByText(/Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 2/i)).toBeInTheDocument();
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'mock-image.jpg');
      expect(imageElement).toHaveAttribute('alt', 'Mock Title');
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

  it('renders alternative text for image when image fails to load', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      fireEvent.error(imageElement);
      expect(imageElement).toHaveAttribute('alt', 'Mock Title');
    });
  });

  it('renders without crashing when data is empty', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({}));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Mock Title/i)).toBeNull();
      expect(screen.queryByText(/Mock Description/i)).toBeNull();
    });
  });

  it('renders with default values when some data fields are missing', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Title',
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Title/i)).toBeInTheDocument();
    });
  });

  it('is accessible', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('alt', 'Mock Title');
    });
  });

  it('displays a retry button after an error', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch data')));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });

  it('retries fetching data when the retry button is clicked', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch data')));
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Title',
      description: 'Mock Description',
      image: 'mock-image.jpg',
      features: ['Feature 1', 'Feature 2'],
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    });

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Title/i)).toBeInTheDocument();
    });
  });
});