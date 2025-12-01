import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture'; // Adjust the path as needed

// Mock any external dependencies, e.g., API calls
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Sample Title',
    description: 'Sample Description',
    imageUrl: 'sample-image.jpg',
    features: ['Feature 1', 'Feature 2'],
  })),
}));

import { fetchDesignArchitectureData } from '../utils/api';

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DesignArchitecture />);
  });

  it('displays loading state initially', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data successfully', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: 'test-image.jpg',
      features: ['Test Feature 1', 'Test Feature 2'],
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Test Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Feature 2/i)).toBeInTheDocument();
      const imageElement = screen.getByRole('img', { name: /Test Title/i });
      expect(imageElement).toHaveAttribute('src', 'test-image.jpg');
    });
  });

  it('handles error state when data fetching fails', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch data'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch data/i)).toBeInTheDocument();
    });
  });

  it('displays default image when imageUrl is empty', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: '',
      features: ['Test Feature 1', 'Test Feature 2'],
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      const imageElement = screen.getByRole('img', { name: /Test Title/i });
      expect(imageElement).toHaveAttribute('src', 'default-image.jpg'); // Replace with your actual default image path
    });
  });

  it('handles missing features gracefully', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: 'test-image.jpg',
      features: null,
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Test Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
      // Ensure no error is thrown when features are null
    });
  });

  it('renders with accessibility attributes', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: 'test-image.jpg',
      features: ['Test Feature 1', 'Test Feature 2'],
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      const imageElement = screen.getByRole('img', { name: /Test Title/i });
      expect(imageElement).toHaveAttribute('alt', 'Test Title');
    });
  });

  it('re-fetches data on retry button click after an error', async () => {
    (fetchDesignArchitectureData as jest.Mock)
      .mockRejectedValueOnce(new Error('Failed to fetch data'))
      .mockResolvedValueOnce({
        title: 'Test Title',
        description: 'Test Description',
        imageUrl: 'test-image.jpg',
        features: ['Test Feature 1', 'Test Feature 2'],
      });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/Test Title/i)).toBeInTheDocument();
    });

    expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(2);
  });

  it('displays a generic error message if the error message is not available', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockRejectedValueOnce(new Error());

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
      expect(screen.getByText(/An error occurred/i)).toBeInTheDocument();
    });
  });

  it('handles very long descriptions without breaking the layout', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockResolvedValueOnce({
      title: 'Test Title',
      description: 'This is a very long description that should wrap properly and not break the layout of the component.  It should handle multiple lines and still be readable.',
      imageUrl: 'test-image.jpg',
      features: ['Test Feature 1', 'Test Feature 2'],
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/This is a very long description/i)).toBeInTheDocument();
    });

    // Add assertions to check layout if needed (e.g., using getComputedStyle)
  });

  it('displays no features message when features array is empty', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: 'test-image.jpg',
      features: [],
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No features available/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture'; // Adjust the path as needed

// Mock any external dependencies, e.g., API calls
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Sample Title',
    description: 'Sample Description',
    imageUrl: 'sample-image.jpg',
    features: ['Feature 1', 'Feature 2'],
  })),
}));

import { fetchDesignArchitectureData } from '../utils/api';

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DesignArchitecture />);
  });

  it('displays loading state initially', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data successfully', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: 'test-image.jpg',
      features: ['Test Feature 1', 'Test Feature 2'],
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Test Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Feature 2/i)).toBeInTheDocument();
      const imageElement = screen.getByRole('img', { name: /Test Title/i });
      expect(imageElement).toHaveAttribute('src', 'test-image.jpg');
    });
  });

  it('handles error state when data fetching fails', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch data'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch data/i)).toBeInTheDocument();
    });
  });

  it('displays default image when imageUrl is empty', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: '',
      features: ['Test Feature 1', 'Test Feature 2'],
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      const imageElement = screen.getByRole('img', { name: /Test Title/i });
      expect(imageElement).toHaveAttribute('src', 'default-image.jpg'); // Replace with your actual default image path
    });
  });

  it('handles missing features gracefully', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: 'test-image.jpg',
      features: null,
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Test Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
      // Ensure no error is thrown when features are null
    });
  });

  it('renders with accessibility attributes', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: 'test-image.jpg',
      features: ['Test Feature 1', 'Test Feature 2'],
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      const imageElement = screen.getByRole('img', { name: /Test Title/i });
      expect(imageElement).toHaveAttribute('alt', 'Test Title');
    });
  });

  it('re-fetches data on retry button click after an error', async () => {
    (fetchDesignArchitectureData as jest.Mock)
      .mockRejectedValueOnce(new Error('Failed to fetch data'))
      .mockResolvedValueOnce({
        title: 'Test Title',
        description: 'Test Description',
        imageUrl: 'test-image.jpg',
        features: ['Test Feature 1', 'Test Feature 2'],
      });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/Test Title/i)).toBeInTheDocument();
    });

    expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(2);
  });

  it('displays a generic error message if the error message is not available', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockRejectedValueOnce(new Error());

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
      expect(screen.getByText(/An error occurred/i)).toBeInTheDocument();
    });
  });

  it('handles very long descriptions without breaking the layout', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockResolvedValueOnce({
      title: 'Test Title',
      description: 'This is a very long description that should wrap properly and not break the layout of the component.  It should handle multiple lines and still be readable.',
      imageUrl: 'test-image.jpg',
      features: ['Test Feature 1', 'Test Feature 2'],
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/This is a very long description/i)).toBeInTheDocument();
    });

    // Add assertions to check layout if needed (e.g., using getComputedStyle)
  });

  it('displays no features message when features array is empty', async () => {
    (fetchDesignArchitectureData as jest.Mock).mockResolvedValueOnce({
      title: 'Test Title',
      description: 'Test Description',
      imageUrl: 'test-image.jpg',
      features: [],
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No features available/i)).toBeInTheDocument();
    });
  });
});