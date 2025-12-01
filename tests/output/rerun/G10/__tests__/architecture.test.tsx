import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import DesignArchitecture from '../components/DesignArchitecture'; // Adjust path as needed

expect.extend(toHaveNoViolations);

// Mock any external dependencies, e.g., API calls, context providers, etc.
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Sample Title',
    description: 'Sample Description',
    image: 'sample-image.jpg',
    features: ['Feature 1', 'Feature 2'],
  })),
}));

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DesignArchitecture />);
  });

  it('should pass accessibility tests', async () => {
    const { container } = render(<DesignArchitecture />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('displays loading state initially', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data correctly', async () => {
    const mockData = {
      title: 'Test Title',
      description: 'Test Description',
      image: 'test-image.jpg',
      features: ['Feature A', 'Feature B'],
    };

    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Test Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature A/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature B/i)).toBeInTheDocument();
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'test-image.jpg');
    });
  });

  it('handles error state when data fetching fails', async () => {
    require('../utils/api').fetchDesignArchitectureData.mockRejectedValue(new Error('Failed to fetch'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('displays a default image when the image URL is empty', async () => {
    const mockData = {
      title: 'Test Title',
      description: 'Test Description',
      image: '',
      features: ['Feature A', 'Feature B'],
    };

    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'default-image.jpg'); // Replace with your default image path
    });
  });

  it('displays a default description when the description is empty', async () => {
    const mockData = {
      title: 'Test Title',
      description: '',
      image: 'test-image.jpg',
      features: ['Feature A', 'Feature B'],
    };

    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No description available/i)).toBeInTheDocument();
    });
  });

  it('displays a default title when the title is empty', async () => {
    const mockData = {
      title: '',
      description: 'Test Description',
      image: 'test-image.jpg',
      features: ['Feature A', 'Feature B'],
    };

    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No title available/i)).toBeInTheDocument();
    });
  });

  it('displays "No features available" when the features array is empty', async () => {
    const mockData = {
      title: 'Test Title',
      description: 'Test Description',
      image: 'test-image.jpg',
      features: [],
    };

    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No features available/i)).toBeInTheDocument();
    });
  });

  it('handles the case where the API returns null data', async () => {
    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(null);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('handles the case where the API returns undefined data', async () => {
    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(undefined);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('retries fetching data after an error (simulated)', async () => {
    const mockFetch = require('../utils/api').fetchDesignArchitectureData;
    mockFetch.mockRejectedValueOnce(new Error('First fetch failed'));
    mockFetch.mockResolvedValueOnce({
      title: 'Retry Title',
      description: 'Retry Description',
      image: 'retry-image.jpg',
      features: ['Retry Feature'],
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Retry Title/i)).toBeInTheDocument();
    });
  });

  it('renders image with alt text', async () => {
    const mockData = {
      title: 'Test Title',
      description: 'Test Description',
      image: 'test-image.jpg',
      features: ['Feature A', 'Feature B'],
    };

    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('alt', 'Test Title');
    });
  });

  it('renders image with default alt text when title is empty', async () => {
    const mockData = {
      title: '',
      description: 'Test Description',
      image: 'test-image.jpg',
      features: ['Feature A', 'Feature B'],
    };

    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('alt', 'Design Architecture Image');
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import DesignArchitecture from '../components/DesignArchitecture'; // Adjust path as needed

expect.extend(toHaveNoViolations);

// Mock any external dependencies, e.g., API calls, context providers, etc.
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Sample Title',
    description: 'Sample Description',
    image: 'sample-image.jpg',
    features: ['Feature 1', 'Feature 2'],
  })),
}));

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DesignArchitecture />);
  });

  it('should pass accessibility tests', async () => {
    const { container } = render(<DesignArchitecture />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('displays loading state initially', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data correctly', async () => {
    const mockData = {
      title: 'Test Title',
      description: 'Test Description',
      image: 'test-image.jpg',
      features: ['Feature A', 'Feature B'],
    };

    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Test Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature A/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature B/i)).toBeInTheDocument();
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'test-image.jpg');
    });
  });

  it('handles error state when data fetching fails', async () => {
    require('../utils/api').fetchDesignArchitectureData.mockRejectedValue(new Error('Failed to fetch'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('displays a default image when the image URL is empty', async () => {
    const mockData = {
      title: 'Test Title',
      description: 'Test Description',
      image: '',
      features: ['Feature A', 'Feature B'],
    };

    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'default-image.jpg'); // Replace with your default image path
    });
  });

  it('displays a default description when the description is empty', async () => {
    const mockData = {
      title: 'Test Title',
      description: '',
      image: 'test-image.jpg',
      features: ['Feature A', 'Feature B'],
    };

    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No description available/i)).toBeInTheDocument();
    });
  });

  it('displays a default title when the title is empty', async () => {
    const mockData = {
      title: '',
      description: 'Test Description',
      image: 'test-image.jpg',
      features: ['Feature A', 'Feature B'],
    };

    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No title available/i)).toBeInTheDocument();
    });
  });

  it('displays "No features available" when the features array is empty', async () => {
    const mockData = {
      title: 'Test Title',
      description: 'Test Description',
      image: 'test-image.jpg',
      features: [],
    };

    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No features available/i)).toBeInTheDocument();
    });
  });

  it('handles the case where the API returns null data', async () => {
    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(null);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('handles the case where the API returns undefined data', async () => {
    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(undefined);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('retries fetching data after an error (simulated)', async () => {
    const mockFetch = require('../utils/api').fetchDesignArchitectureData;
    mockFetch.mockRejectedValueOnce(new Error('First fetch failed'));
    mockFetch.mockResolvedValueOnce({
      title: 'Retry Title',
      description: 'Retry Description',
      image: 'retry-image.jpg',
      features: ['Retry Feature'],
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Retry Title/i)).toBeInTheDocument();
    });
  });

  it('renders image with alt text', async () => {
    const mockData = {
      title: 'Test Title',
      description: 'Test Description',
      image: 'test-image.jpg',
      features: ['Feature A', 'Feature B'],
    };

    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('alt', 'Test Title');
    });
  });

  it('renders image with default alt text when title is empty', async () => {
    const mockData = {
      title: '',
      description: 'Test Description',
      image: 'test-image.jpg',
      features: ['Feature A', 'Feature B'],
    };

    require('../utils/api').fetchDesignArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('alt', 'Design Architecture Image');
    });
  });
});