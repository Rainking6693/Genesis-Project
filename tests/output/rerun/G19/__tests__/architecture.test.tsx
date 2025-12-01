import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust the import path as needed
import * as api from '../api/designArchitectureApi'; // Adjust the import path as needed
import { useDesignArchitectureData } from '../hooks/useDesignArchitectureData'; // Adjust the import path as needed

jest.mock('../api/designArchitectureApi');
jest.mock('../hooks/useDesignArchitectureData');

describe('DesignArchitecture Component', () => {
  const mockData = {
    architectureData: {
      title: 'Sample Architecture',
      description: 'A sample architecture description',
      components: [
        { id: '1', name: 'Component A', type: 'Database' },
        { id: '2', name: 'Component B', type: 'API' },
      ],
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useDesignArchitectureData as jest.Mock).mockReturnValue(mockData);
  });

  it('renders the component with data', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText('Sample Architecture')).toBeInTheDocument();
    expect(screen.getByText('A sample architecture description')).toBeInTheDocument();
    expect(screen.getByText('Component A')).toBeInTheDocument();
    expect(screen.getByText('Component B')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockData,
      isLoading: true,
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error message', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockData,
      isLoading: false,
      error: 'Failed to fetch data',
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
  });

  it('calls refetch on refresh button click', async () => {
    render(<DesignArchitecture />);
    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    await userEvent.click(refreshButton);
    expect(mockData.refetch).toHaveBeenCalledTimes(1);
  });

  it('renders with no data gracefully', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      architectureData: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('No architecture data available.')).toBeInTheDocument();
  });

  it('handles empty components array', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      architectureData: {
        title: 'Empty Architecture',
        description: 'Architecture with no components',
        components: [],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Empty Architecture')).toBeInTheDocument();
    expect(screen.getByText('Architecture with no components')).toBeInTheDocument();
    expect(screen.queryByText('Component A')).toBeNull();
  });

  it('handles undefined architectureData', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      architectureData: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('No architecture data available.')).toBeInTheDocument();
  });

  it('handles null architectureData', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      architectureData: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('No architecture data available.')).toBeInTheDocument();
  });

  it('renders with accessibility attributes', () => {
    render(<DesignArchitecture />);
    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    expect(refreshButton).toHaveAttribute('aria-label', 'Refresh architecture data');
  });

  it('displays a specific error message when the API call fails with a 404 error', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockData,
      isLoading: false,
      error: 'Request failed with status code 404',
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Error: Request failed with status code 404')).toBeInTheDocument();
  });

  it('displays a generic error message for other API errors', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockData,
      isLoading: false,
      error: 'Some other API error',
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Error: Some other API error')).toBeInTheDocument();
  });

  it('handles very long descriptions without breaking the layout', () => {
    const longDescription = 'This is a very long description that should wrap properly and not break the layout of the component. It should handle multiple lines and still be readable.';
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      architectureData: {
        title: 'Long Description Architecture',
        description: longDescription,
        components: [],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<DesignArchitecture />);
    expect(screen.getByText(longDescription)).toBeInTheDocument();
  });

  it('renders different component types correctly', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      architectureData: {
        title: 'Architecture with Different Types',
        description: 'Architecture with different component types',
        components: [
          { id: '1', name: 'Component A', type: 'Database' },
          { id: '2', name: 'Component B', type: 'API' },
          { id: '3', name: 'Component C', type: 'Service' },
          { id: '4', name: 'Component D', type: 'UI' },
        ],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Component A')).toBeInTheDocument();
    expect(screen.getByText('Component B')).toBeInTheDocument();
    expect(screen.getByText('Component C')).toBeInTheDocument();
    expect(screen.getByText('Component D')).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust the import path as needed
import * as api from '../api/designArchitectureApi'; // Adjust the import path as needed
import { useDesignArchitectureData } from '../hooks/useDesignArchitectureData'; // Adjust the import path as needed

jest.mock('../api/designArchitectureApi');
jest.mock('../hooks/useDesignArchitectureData');

describe('DesignArchitecture Component', () => {
  const mockData = {
    architectureData: {
      title: 'Sample Architecture',
      description: 'A sample architecture description',
      components: [
        { id: '1', name: 'Component A', type: 'Database' },
        { id: '2', name: 'Component B', type: 'API' },
      ],
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useDesignArchitectureData as jest.Mock).mockReturnValue(mockData);
  });

  it('renders the component with data', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText('Sample Architecture')).toBeInTheDocument();
    expect(screen.getByText('A sample architecture description')).toBeInTheDocument();
    expect(screen.getByText('Component A')).toBeInTheDocument();
    expect(screen.getByText('Component B')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockData,
      isLoading: true,
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error message', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockData,
      isLoading: false,
      error: 'Failed to fetch data',
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
  });

  it('calls refetch on refresh button click', async () => {
    render(<DesignArchitecture />);
    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    await userEvent.click(refreshButton);
    expect(mockData.refetch).toHaveBeenCalledTimes(1);
  });

  it('renders with no data gracefully', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      architectureData: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('No architecture data available.')).toBeInTheDocument();
  });

  it('handles empty components array', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      architectureData: {
        title: 'Empty Architecture',
        description: 'Architecture with no components',
        components: [],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Empty Architecture')).toBeInTheDocument();
    expect(screen.getByText('Architecture with no components')).toBeInTheDocument();
    expect(screen.queryByText('Component A')).toBeNull();
  });

  it('handles undefined architectureData', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      architectureData: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('No architecture data available.')).toBeInTheDocument();
  });

  it('handles null architectureData', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      architectureData: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('No architecture data available.')).toBeInTheDocument();
  });

  it('renders with accessibility attributes', () => {
    render(<DesignArchitecture />);
    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    expect(refreshButton).toHaveAttribute('aria-label', 'Refresh architecture data');
  });

  it('displays a specific error message when the API call fails with a 404 error', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockData,
      isLoading: false,
      error: 'Request failed with status code 404',
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Error: Request failed with status code 404')).toBeInTheDocument();
  });

  it('displays a generic error message for other API errors', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockData,
      isLoading: false,
      error: 'Some other API error',
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Error: Some other API error')).toBeInTheDocument();
  });

  it('handles very long descriptions without breaking the layout', () => {
    const longDescription = 'This is a very long description that should wrap properly and not break the layout of the component. It should handle multiple lines and still be readable.';
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      architectureData: {
        title: 'Long Description Architecture',
        description: longDescription,
        components: [],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<DesignArchitecture />);
    expect(screen.getByText(longDescription)).toBeInTheDocument();
  });

  it('renders different component types correctly', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      architectureData: {
        title: 'Architecture with Different Types',
        description: 'Architecture with different component types',
        components: [
          { id: '1', name: 'Component A', type: 'Database' },
          { id: '2', name: 'Component B', type: 'API' },
          { id: '3', name: 'Component C', type: 'Service' },
          { id: '4', name: 'Component D', type: 'UI' },
        ],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Component A')).toBeInTheDocument();
    expect(screen.getByText('Component B')).toBeInTheDocument();
    expect(screen.getByText('Component C')).toBeInTheDocument();
    expect(screen.getByText('Component D')).toBeInTheDocument();
  });
});