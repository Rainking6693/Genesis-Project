import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture';

// Mock any external dependencies, e.g., API calls, custom hooks, etc.
jest.mock('../utils/api', () => ({
  fetchDesignArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Mock Design Architecture',
    description: 'This is a mock description.',
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

  it('displays loading state initially', () => {
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
      expect(screen.getByText(/Mock Design Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/This is a mock description./i)).toBeInTheDocument();
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

  it('renders accessibility attributes correctly', async () => {
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });
  });

  it('handles empty features array gracefully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: 'This is a mock description.',
      features: [],
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Design Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/This is a mock description./i)).toBeInTheDocument();
    });
  });

  it('displays a default message when no features are available', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: 'This is a mock description.',
      features: [],
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByRole('listitem')).toBeNull();
    });
  });

  it('handles long descriptions without breaking the layout', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: 'This is a very long description that should wrap properly within the component. It should not overflow or break the layout.  This is a very long description that should wrap properly within the component. It should not overflow or break the layout.',
      features: ['Feature 1', 'Feature 2'],
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/This is a very long description/i)).toBeInTheDocument();
    });
  });

  it('displays an alternative loading message', () => {
    render(<DesignArchitecture loadingMessage="Custom Loading..." />);
    expect(screen.getByText(/Custom Loading.../i)).toBeInTheDocument();
  });

  it('renders with custom CSS classes', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: 'This is a mock description.',
      features: ['Feature 1', 'Feature 2'],
    }));
    const { container } = render(<DesignArchitecture className="custom-class" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('custom-class');
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
    title: 'Mock Design Architecture',
    description: 'This is a mock description.',
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

  it('displays loading state initially', () => {
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
      expect(screen.getByText(/Mock Design Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/This is a mock description./i)).toBeInTheDocument();
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

  it('renders accessibility attributes correctly', async () => {
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });
  });

  it('handles empty features array gracefully', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: 'This is a mock description.',
      features: [],
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/Mock Design Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/This is a mock description./i)).toBeInTheDocument();
    });
  });

  it('displays a default message when no features are available', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: 'This is a mock description.',
      features: [],
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByRole('listitem')).toBeNull();
    });
  });

  it('handles long descriptions without breaking the layout', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: 'This is a very long description that should wrap properly within the component. It should not overflow or break the layout.  This is a very long description that should wrap properly within the component. It should not overflow or break the layout.',
      features: ['Feature 1', 'Feature 2'],
    }));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/This is a very long description/i)).toBeInTheDocument();
    });
  });

  it('displays an alternative loading message', () => {
    render(<DesignArchitecture loadingMessage="Custom Loading..." />);
    expect(screen.getByText(/Custom Loading.../i)).toBeInTheDocument();
  });

  it('renders with custom CSS classes', async () => {
    const { fetchDesignArchitectureData } = require('../utils/api');
    fetchDesignArchitectureData.mockImplementationOnce(() => Promise.resolve({
      title: 'Mock Design Architecture',
      description: 'This is a mock description.',
      features: ['Feature 1', 'Feature 2'],
    }));
    const { container } = render(<DesignArchitecture className="custom-class" />);

    await waitFor(() => {
      expect(fetchDesignArchitectureData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});