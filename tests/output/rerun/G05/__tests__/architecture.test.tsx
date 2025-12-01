import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture';

// Mock any external dependencies, e.g., API calls, context providers, etc.
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Mock Design Architecture',
    description: 'This is a mock design architecture description.',
    features: ['Feature 1', 'Feature 2'],
    image: 'mock-image.jpg',
  })),
}));

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<DesignArchitecture businessType="landing" />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays design architecture data successfully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Design Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/This is a mock design architecture description./i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 2/i)).toBeInTheDocument();
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'mock-image.jpg');
      expect(imageElement).toHaveAttribute('alt', 'Mock Design Architecture');
    });
  });

  it('handles error state when fetching data fails', async () => {
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

  it('renders alternative text for the image if the image fails to load', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    const imageElement = screen.getByRole('img');
    fireEvent.error(imageElement);

    await waitFor(() => {
      expect(imageElement).toHaveAttribute('alt', 'Mock Design Architecture');
    });
  });

  it('renders with correct aria attributes for accessibility', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      const titleElement = screen.getByText(/Mock Design Architecture/i);
      expect(titleElement).toHaveAttribute('aria-label', 'Design Architecture Title');
    });
  });

  it('displays a default message when no features are available', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: 'This is a mock design architecture description.',
      features: [],
      image: 'mock-image.jpg',
    }));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByText(/No features available./i)).toBeInTheDocument();
    });
  });

  it('handles empty description gracefully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: '',
      features: ['Feature 1'],
      image: 'mock-image.jpg',
    }));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.queryByText('')).not.toBeInTheDocument(); // Ensure empty string is not rendered
    });
  });

  it('handles null description gracefully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: null,
      features: ['Feature 1'],
      image: 'mock-image.jpg',
    }));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.queryByText(null)).not.toBeInTheDocument(); // Ensure null is not rendered
    });
  });

  it('handles undefined description gracefully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: undefined,
      features: ['Feature 1'],
      image: 'mock-image.jpg',
    }));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.queryByText(undefined)).not.toBeInTheDocument(); // Ensure undefined is not rendered
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture';

// Mock any external dependencies, e.g., API calls, context providers, etc.
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Mock Design Architecture',
    description: 'This is a mock design architecture description.',
    features: ['Feature 1', 'Feature 2'],
    image: 'mock-image.jpg',
  })),
}));

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<DesignArchitecture businessType="landing" />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays design architecture data successfully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Design Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/This is a mock design architecture description./i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Feature 2/i)).toBeInTheDocument();
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'mock-image.jpg');
      expect(imageElement).toHaveAttribute('alt', 'Mock Design Architecture');
    });
  });

  it('handles error state when fetching data fails', async () => {
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

  it('renders alternative text for the image if the image fails to load', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    const imageElement = screen.getByRole('img');
    fireEvent.error(imageElement);

    await waitFor(() => {
      expect(imageElement).toHaveAttribute('alt', 'Mock Design Architecture');
    });
  });

  it('renders with correct aria attributes for accessibility', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      const titleElement = screen.getByText(/Mock Design Architecture/i);
      expect(titleElement).toHaveAttribute('aria-label', 'Design Architecture Title');
    });
  });

  it('displays a default message when no features are available', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: 'This is a mock design architecture description.',
      features: [],
      image: 'mock-image.jpg',
    }));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.getByText(/No features available./i)).toBeInTheDocument();
    });
  });

  it('handles empty description gracefully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: '',
      features: ['Feature 1'],
      image: 'mock-image.jpg',
    }));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.queryByText('')).not.toBeInTheDocument(); // Ensure empty string is not rendered
    });
  });

  it('handles null description gracefully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: null,
      features: ['Feature 1'],
      image: 'mock-image.jpg',
    }));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.queryByText(null)).not.toBeInTheDocument(); // Ensure null is not rendered
    });
  });

  it('handles undefined description gracefully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementation(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: undefined,
      features: ['Feature 1'],
      image: 'mock-image.jpg',
    }));

    render(<DesignArchitecture businessType="landing" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledWith('landing');
    });

    await waitFor(() => {
      expect(screen.queryByText(undefined)).not.toBeInTheDocument(); // Ensure undefined is not rendered
    });
  });
});