import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../components/DashboardComponent'; // Replace with the actual path
import { mockDashboardData, mockError, mockEmptyData } from './mocks'; // Replace with your mock data
import * as api from '../api'; // Replace with the actual path to your API module
import '@testing-library/jest-dom';

jest.mock('../api');

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('should render dashboard data after loading', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });
  });

  it('should handle API error and display error message', async () => {
    (api.fetchDashboardData as jest.Mock).mockRejectedValue(mockError);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
      expect(screen.getByText(mockError.message)).toBeInTheDocument();
    });
  });

  it('should handle empty data and display a message', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockEmptyData);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('should update data when refresh button is clicked', async () => {
    (api.fetchDashboardData as jest.Mock)
      .mockResolvedValueOnce(mockDashboardData)
      .mockResolvedValueOnce({ ...mockDashboardData, title: 'Updated Title' });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/Updated Title/i)).toBeInTheDocument();
    });
  });

  it('should call the API with the correct parameters when refreshing', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(2);
    });
  });

  it('should display a loading indicator while refreshing', async () => {
    (api.fetchDashboardData as jest.Mock)
      .mockResolvedValueOnce(mockDashboardData)
      .mockResolvedValueOnce({ ...mockDashboardData, title: 'Updated Title' });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    expect(screen.getByText(/Refreshing/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Updated Title/i)).toBeInTheDocument();
    });
  });

  it('should be accessible', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const { container } = render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });
    expect(container).toBeAccessible();
  });

  it('should handle long loading times', async () => {
    (api.fetchDashboardData as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockDashboardData);
        }, 2000);
      });
    });

    render(<DashboardComponent />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    }, { timeout: 2500 });
  });

  it('should handle multiple refreshes quickly', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);
    fireEvent.click(refreshButton);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(4);
    });
  });

  it('should not allow refresh button to be clicked while loading', async () => {
    let resolvePromise: (value: any) => void;
    const loadingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (api.fetchDashboardData as jest.Mock).mockImplementation(() => loadingPromise);

    render(<DashboardComponent />);

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    expect(refreshButton).toBeDisabled();

    resolvePromise(mockDashboardData);
    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });
    expect(refreshButton).toBeEnabled();
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../components/DashboardComponent'; // Replace with the actual path
import { mockDashboardData, mockError, mockEmptyData } from './mocks'; // Replace with your mock data
import * as api from '../api'; // Replace with the actual path to your API module
import '@testing-library/jest-dom';

jest.mock('../api');

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('should render dashboard data after loading', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });
  });

  it('should handle API error and display error message', async () => {
    (api.fetchDashboardData as jest.Mock).mockRejectedValue(mockError);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
      expect(screen.getByText(mockError.message)).toBeInTheDocument();
    });
  });

  it('should handle empty data and display a message', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockEmptyData);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('should update data when refresh button is clicked', async () => {
    (api.fetchDashboardData as jest.Mock)
      .mockResolvedValueOnce(mockDashboardData)
      .mockResolvedValueOnce({ ...mockDashboardData, title: 'Updated Title' });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/Updated Title/i)).toBeInTheDocument();
    });
  });

  it('should call the API with the correct parameters when refreshing', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(2);
    });
  });

  it('should display a loading indicator while refreshing', async () => {
    (api.fetchDashboardData as jest.Mock)
      .mockResolvedValueOnce(mockDashboardData)
      .mockResolvedValueOnce({ ...mockDashboardData, title: 'Updated Title' });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    expect(screen.getByText(/Refreshing/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Updated Title/i)).toBeInTheDocument();
    });
  });

  it('should be accessible', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const { container } = render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });
    expect(container).toBeAccessible();
  });

  it('should handle long loading times', async () => {
    (api.fetchDashboardData as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockDashboardData);
        }, 2000);
      });
    });

    render(<DashboardComponent />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    }, { timeout: 2500 });
  });

  it('should handle multiple refreshes quickly', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);
    fireEvent.click(refreshButton);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(4);
    });
  });

  it('should not allow refresh button to be clicked while loading', async () => {
    let resolvePromise: (value: any) => void;
    const loadingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (api.fetchDashboardData as jest.Mock).mockImplementation(() => loadingPromise);

    render(<DashboardComponent />);

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    expect(refreshButton).toBeDisabled();

    resolvePromise(mockDashboardData);
    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });
    expect(refreshButton).toBeEnabled();
  });
});