import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../DashboardComponent'; // Replace with the actual path
import { mockDashboardData, mockError, mockEmptyDashboardData } from './mocks'; // Replace with your mock data
import { DashboardService } from '../DashboardService'; // Replace with the actual path
import '@testing-library/jest-dom';

jest.mock('../DashboardService'); // Mock the DashboardService

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays dashboard data successfully', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Total Users/i)).toBeInTheDocument();
    expect(screen.getByText(/1000/i)).toBeInTheDocument();
  });

  it('displays an error message when fetching data fails', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockRejectedValue(mockError);
    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('displays a message when there is no data', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockEmptyDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/No data available/i)).toBeInTheDocument();
  });

  it('retries fetching data on retry button click', async () => {
    (DashboardService.fetchDashboardData as jest.Mock)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(mockDashboardData);

    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Total Users/i)).toBeInTheDocument();
  });

  it('updates data when refresh button is clicked', async () => {
    (DashboardService.fetchDashboardData as jest.Mock)
      .mockResolvedValueOnce(mockDashboardData)
      .mockResolvedValueOnce({ ...mockDashboardData, totalUsers: 1500 });

    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => expect(screen.getByText(/1500/i)).toBeInTheDocument());
  });

  it('renders with accessible labels and roles', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());

    expect(screen.getByRole('heading', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
  });

  it('handles errors when refresh button is clicked', async () => {
    (DashboardService.fetchDashboardData as jest.Mock)
      .mockResolvedValueOnce(mockDashboardData)
      .mockRejectedValueOnce(mockError);

    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument());
  });

  it('displays a custom loading message', () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent loadingMessage="Fetching your data..." />);
    expect(screen.getByText(/Fetching your data.../i)).toBeInTheDocument();
  });

  it('displays a custom error message', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockRejectedValue(mockError);
    render(<DashboardComponent errorMessage="Failed to load the dashboard." />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Failed to load the dashboard./i)).toBeInTheDocument();
  });

  it('allows custom styling', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent className="custom-dashboard" />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: /Dashboard/i }).closest('.custom-dashboard')).toBeInTheDocument();
  });

  it('handles data updates correctly after multiple refreshes', async () => {
    (DashboardService.fetchDashboardData as jest.Mock)
      .mockResolvedValueOnce(mockDashboardData)
      .mockResolvedValueOnce({ ...mockDashboardData, totalUsers: 1500 })
      .mockResolvedValueOnce({ ...mockDashboardData, totalUsers: 2000 });

    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);
    await waitFor(() => expect(screen.getByText(/1500/i)).toBeInTheDocument());

    fireEvent.click(refreshButton);
    await waitFor(() => expect(screen.getByText(/2000/i)).toBeInTheDocument());
  });

  it('renders with a custom refresh button label', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent refreshButtonLabel="Update Data" />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Update Data/i })).toBeInTheDocument();
  });

  it('renders with a custom retry button label', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockRejectedValue(mockError);
    render(<DashboardComponent retryButtonLabel="Try Again" />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('renders the dashboard title', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent title="My Awesome Dashboard" />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: /My Awesome Dashboard/i })).toBeInTheDocument();
  });

  it('handles accessibility for screen readers', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());

    const dashboardHeading = screen.getByRole('heading', { name: /Dashboard/i });
    expect(dashboardHeading).toHaveAttribute('aria-level', '1');
  });

  it('renders the component without crashing', () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const { container } = render(<DashboardComponent />);
    expect(container).toBeInTheDocument();
  });

  it('does not call fetchDashboardData if skipInitialFetch is true', () => {
    render(<DashboardComponent skipInitialFetch={true} />);
    expect(DashboardService.fetchDashboardData).not.toHaveBeenCalled();
  });

  it('fetches data when refresh button is clicked and skipInitialFetch is true', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent skipInitialFetch={true} />);

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => expect(screen.getByText(/Total Users/i)).toBeInTheDocument());
    expect(DashboardService.fetchDashboardData).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../DashboardComponent'; // Replace with the actual path
import { mockDashboardData, mockError, mockEmptyDashboardData } from './mocks'; // Replace with your mock data
import { DashboardService } from '../DashboardService'; // Replace with the actual path
import '@testing-library/jest-dom';

jest.mock('../DashboardService'); // Mock the DashboardService

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays dashboard data successfully', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Total Users/i)).toBeInTheDocument();
    expect(screen.getByText(/1000/i)).toBeInTheDocument();
  });

  it('displays an error message when fetching data fails', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockRejectedValue(mockError);
    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('displays a message when there is no data', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockEmptyDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/No data available/i)).toBeInTheDocument();
  });

  it('retries fetching data on retry button click', async () => {
    (DashboardService.fetchDashboardData as jest.Mock)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(mockDashboardData);

    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Total Users/i)).toBeInTheDocument();
  });

  it('updates data when refresh button is clicked', async () => {
    (DashboardService.fetchDashboardData as jest.Mock)
      .mockResolvedValueOnce(mockDashboardData)
      .mockResolvedValueOnce({ ...mockDashboardData, totalUsers: 1500 });

    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => expect(screen.getByText(/1500/i)).toBeInTheDocument());
  });

  it('renders with accessible labels and roles', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());

    expect(screen.getByRole('heading', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
  });

  it('handles errors when refresh button is clicked', async () => {
    (DashboardService.fetchDashboardData as jest.Mock)
      .mockResolvedValueOnce(mockDashboardData)
      .mockRejectedValueOnce(mockError);

    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument());
  });

  it('displays a custom loading message', () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent loadingMessage="Fetching your data..." />);
    expect(screen.getByText(/Fetching your data.../i)).toBeInTheDocument();
  });

  it('displays a custom error message', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockRejectedValue(mockError);
    render(<DashboardComponent errorMessage="Failed to load the dashboard." />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Failed to load the dashboard./i)).toBeInTheDocument();
  });

  it('allows custom styling', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent className="custom-dashboard" />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: /Dashboard/i }).closest('.custom-dashboard')).toBeInTheDocument();
  });

  it('handles data updates correctly after multiple refreshes', async () => {
    (DashboardService.fetchDashboardData as jest.Mock)
      .mockResolvedValueOnce(mockDashboardData)
      .mockResolvedValueOnce({ ...mockDashboardData, totalUsers: 1500 })
      .mockResolvedValueOnce({ ...mockDashboardData, totalUsers: 2000 });

    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);
    await waitFor(() => expect(screen.getByText(/1500/i)).toBeInTheDocument());

    fireEvent.click(refreshButton);
    await waitFor(() => expect(screen.getByText(/2000/i)).toBeInTheDocument());
  });

  it('renders with a custom refresh button label', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent refreshButtonLabel="Update Data" />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Update Data/i })).toBeInTheDocument();
  });

  it('renders with a custom retry button label', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockRejectedValue(mockError);
    render(<DashboardComponent retryButtonLabel="Try Again" />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('renders the dashboard title', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent title="My Awesome Dashboard" />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: /My Awesome Dashboard/i })).toBeInTheDocument();
  });

  it('handles accessibility for screen readers', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());

    const dashboardHeading = screen.getByRole('heading', { name: /Dashboard/i });
    expect(dashboardHeading).toHaveAttribute('aria-level', '1');
  });

  it('renders the component without crashing', () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const { container } = render(<DashboardComponent />);
    expect(container).toBeInTheDocument();
  });

  it('does not call fetchDashboardData if skipInitialFetch is true', () => {
    render(<DashboardComponent skipInitialFetch={true} />);
    expect(DashboardService.fetchDashboardData).not.toHaveBeenCalled();
  });

  it('fetches data when refresh button is clicked and skipInitialFetch is true', async () => {
    (DashboardService.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent skipInitialFetch={true} />);

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => expect(screen.getByText(/Total Users/i)).toBeInTheDocument());
    expect(DashboardService.fetchDashboardData).toHaveBeenCalledTimes(1);
  });
});