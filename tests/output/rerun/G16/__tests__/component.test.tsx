import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../components/DashboardComponent'; // Replace with the actual path
import * as api from '../api/dashboardApi'; // Replace with the actual path
import { mockData } from './mockData'; // Replace with the actual path and data

jest.mock('../api/dashboardApi');

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    render(<DashboardComponent />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays dashboard data on mount', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(mockData.title)).toBeInTheDocument();
      expect(screen.getByText(mockData.description)).toBeInTheDocument();
    });
  });

  it('displays an error message when fetching data fails', async () => {
    (api.fetchDashboardData as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('allows the user to refresh the data', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(2);
    });
  });

  it('displays loading state while refreshing data', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });

    (api.fetchDashboardData as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockData);
        }, 500);
      });
    });

    fireEvent.click(refreshButton);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(2);
    });
  });

  it('updates data on successful refresh', async () => {
    const initialData = { ...mockData, title: 'Initial Title' };
    const refreshedData = { ...mockData, title: 'Refreshed Title' };

    (api.fetchDashboardData as jest.Mock).mockResolvedValueOnce(initialData).mockResolvedValueOnce(refreshedData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Initial Title/i)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/Refreshed Title/i)).toBeInTheDocument();
    });
  });

  it('handles error during refresh and displays error message', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValueOnce(mockData).mockRejectedValueOnce(new Error('Refresh failed'));
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(mockData.title)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/Error refreshing data/i)).toBeInTheDocument();
    });
  });

  it('renders with accessible labels and roles', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: mockData.title, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({ title: '', description: '' });
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.queryByText('')).toBeInTheDocument(); // Check if empty string is rendered
    });
  });

  it('handles null data gracefully', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({ title: null, description: null });
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.queryByText(null)).not.toBeInTheDocument();
    });
  });

  it('handles undefined data gracefully', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({ title: undefined, description: undefined });
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.queryByText(undefined)).not.toBeInTheDocument();
    });
  });

  it('displays a default message when title and description are empty', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({ title: '', description: '' });
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('calls the API with the correct parameters', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledWith(); // Assuming no parameters are passed
    });
  });

  it('renders the component with a specific className', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    const { container } = render(<DashboardComponent className="custom-class" />);

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  it('renders the component with custom styling', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    const customStyle = { backgroundColor: 'red' };
    const { container } = render(<DashboardComponent style={customStyle} />);

    await waitFor(() => {
      expect(container.firstChild).toHaveStyle(customStyle);
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../components/DashboardComponent'; // Replace with the actual path
import * as api from '../api/dashboardApi'; // Replace with the actual path
import { mockData } from './mockData'; // Replace with the actual path and data

jest.mock('../api/dashboardApi');

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    render(<DashboardComponent />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays dashboard data on mount', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(mockData.title)).toBeInTheDocument();
      expect(screen.getByText(mockData.description)).toBeInTheDocument();
    });
  });

  it('displays an error message when fetching data fails', async () => {
    (api.fetchDashboardData as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('allows the user to refresh the data', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(2);
    });
  });

  it('displays loading state while refreshing data', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });

    (api.fetchDashboardData as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockData);
        }, 500);
      });
    });

    fireEvent.click(refreshButton);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(2);
    });
  });

  it('updates data on successful refresh', async () => {
    const initialData = { ...mockData, title: 'Initial Title' };
    const refreshedData = { ...mockData, title: 'Refreshed Title' };

    (api.fetchDashboardData as jest.Mock).mockResolvedValueOnce(initialData).mockResolvedValueOnce(refreshedData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Initial Title/i)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/Refreshed Title/i)).toBeInTheDocument();
    });
  });

  it('handles error during refresh and displays error message', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValueOnce(mockData).mockRejectedValueOnce(new Error('Refresh failed'));
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(mockData.title)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/Error refreshing data/i)).toBeInTheDocument();
    });
  });

  it('renders with accessible labels and roles', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: mockData.title, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({ title: '', description: '' });
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.queryByText('')).toBeInTheDocument(); // Check if empty string is rendered
    });
  });

  it('handles null data gracefully', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({ title: null, description: null });
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.queryByText(null)).not.toBeInTheDocument();
    });
  });

  it('handles undefined data gracefully', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({ title: undefined, description: undefined });
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.queryByText(undefined)).not.toBeInTheDocument();
    });
  });

  it('displays a default message when title and description are empty', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({ title: '', description: '' });
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('calls the API with the correct parameters', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledWith(); // Assuming no parameters are passed
    });
  });

  it('renders the component with a specific className', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    const { container } = render(<DashboardComponent className="custom-class" />);

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  it('renders the component with custom styling', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockData);
    const customStyle = { backgroundColor: 'red' };
    const { container } = render(<DashboardComponent style={customStyle} />);

    await waitFor(() => {
      expect(container.firstChild).toHaveStyle(customStyle);
    });
  });
});