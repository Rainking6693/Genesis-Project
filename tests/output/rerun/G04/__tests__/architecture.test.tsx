import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture';

// Mock any external dependencies, e.g., API calls, custom hooks, etc.
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Sample Architecture',
    description: 'A sample architecture description.',
    imageUrl: 'sample.jpg',
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

  it('fetches and displays architecture data on successful load', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Test Architecture',
      description: 'A test architecture description.',
      imageUrl: 'test.jpg',
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Test Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/A test architecture description./i)).toBeInTheDocument();
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'test.jpg');
    });
  });

  it('displays an error message when data fetching fails', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockRejectedValueOnce(new Error('Failed to fetch data'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: '',
      description: '',
      imageUrl: '',
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.queryByText(/undefined/i)).toBeNull(); // Check no undefined text rendered
    });
  });

  it('renders with accessible alt text for the image', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Accessible Architecture',
      description: 'An accessible architecture description.',
      imageUrl: 'accessible.jpg',
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'Accessible Architecture');
    });
  });

  it('renders with a default image if imageUrl is missing', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Architecture with no image',
      description: 'Architecture without an image URL.',
      imageUrl: '',
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'placeholder.jpg'); // Replace 'placeholder.jpg' with your actual default image path
    });
  });

  it('handles very long descriptions without breaking the layout', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Long Description Architecture',
      description: 'This is a very long description that should wrap properly and not break the layout of the component. It should handle multiple lines and different screen sizes without causing any issues. This is a very long description that should wrap properly and not break the layout of the component. It should handle multiple lines and different screen sizes without causing any issues.',
      imageUrl: 'long_description.jpg',
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/This is a very long description/i)).toBeInTheDocument();
    });
  });

  it('renders correctly with special characters in title and description', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Architecture with Special Chars: &<>"',
      description: 'Description with Special Chars: &<>"',
      imageUrl: 'special_chars.jpg',
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Architecture with Special Chars: &<>" /i)).toBeInTheDocument();
      expect(screen.getByText(/Description with Special Chars: &<>" /i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture';

// Mock any external dependencies, e.g., API calls, custom hooks, etc.
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Sample Architecture',
    description: 'A sample architecture description.',
    imageUrl: 'sample.jpg',
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

  it('fetches and displays architecture data on successful load', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Test Architecture',
      description: 'A test architecture description.',
      imageUrl: 'test.jpg',
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Test Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/A test architecture description./i)).toBeInTheDocument();
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'test.jpg');
    });
  });

  it('displays an error message when data fetching fails', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockRejectedValueOnce(new Error('Failed to fetch data'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: '',
      description: '',
      imageUrl: '',
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.queryByText(/undefined/i)).toBeNull(); // Check no undefined text rendered
    });
  });

  it('renders with accessible alt text for the image', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Accessible Architecture',
      description: 'An accessible architecture description.',
      imageUrl: 'accessible.jpg',
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'Accessible Architecture');
    });
  });

  it('renders with a default image if imageUrl is missing', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Architecture with no image',
      description: 'Architecture without an image URL.',
      imageUrl: '',
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'placeholder.jpg'); // Replace 'placeholder.jpg' with your actual default image path
    });
  });

  it('handles very long descriptions without breaking the layout', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Long Description Architecture',
      description: 'This is a very long description that should wrap properly and not break the layout of the component. It should handle multiple lines and different screen sizes without causing any issues. This is a very long description that should wrap properly and not break the layout of the component. It should handle multiple lines and different screen sizes without causing any issues.',
      imageUrl: 'long_description.jpg',
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/This is a very long description/i)).toBeInTheDocument();
    });
  });

  it('renders correctly with special characters in title and description', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockResolvedValueOnce({
      title: 'Architecture with Special Chars: &<>"',
      description: 'Description with Special Chars: &<>"',
      imageUrl: 'special_chars.jpg',
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Architecture with Special Chars: &<>" /i)).toBeInTheDocument();
      expect(screen.getByText(/Description with Special Chars: &<>" /i)).toBeInTheDocument();
    });
  });
});