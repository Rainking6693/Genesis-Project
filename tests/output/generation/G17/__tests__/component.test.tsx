import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

jest.mock('axios');
jest.mock('react-apexcharts', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-chart">Mock Chart</div>,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockAuthContext = {
  user: {
    id: '123',
    name: 'Test User',
    role: 'admin',
    token: 'test-token',
  },
  logout: jest.fn(),
};

const mockNotificationContext = {
  showNotification: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <NotificationContext.Provider value={mockNotificationContext}>
        <MemoryRouter>{ui}</MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

describe('Dashboard Component', () => {
  const mockDashboardData = {
    stats: {
      totalUsers: 1500,
      activeUsers: 1200,
      revenue: 45000,
      growthRate: 12.5,
    },
    charts: {
      userGrowth: [100, 200, 300, 400, 500],
      revenueTrend: [10000, 12000, 15000, 18000, 20000],
    },
    recentActivities: [
      { id: '1', user: 'User A', action: 'created account', time: '2 mins ago' },
      { id: '2', user: 'User B', action: 'made purchase', time: '1 hour ago' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockDashboardData });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<Dashboard />);

      expect(screen.getByTestId('stats-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('activities-skeleton')).toBeInTheDocument();
    });

    it('should render dashboard with data after successful fetch', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('1,500')).toBeInTheDocument();
        expect(screen.getByText('Active Users')).toBeInTheDocument();
        expect(screen.getByText('1,200')).toBeInTheDocument();
        expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
        expect(screen.getByText('User A')).toBeInTheDocument();
      });
    });
  });

  describe('Data Display and Formatting', () => {
    it('should correctly format and display numerical data', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeInTheDocument();
        expect(screen.getByText('1,200')).toBeInTheDocument();
        expect(screen.getByText('$45,000')).toBeInTheDocument();
        expect(screen.getByText('12.5%')).toBeInTheDocument();
      });
    });

    it('should display growth indicators with correct colors', async () => {
      renderWithProviders(<Dashboard />);

      const growthElement = await screen.findByText('12.5%');
      expect(growthElement).toHaveClass('text-green-500');

      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: { ...mockDashboardData, stats: { ...mockDashboardData.stats, growthRate: -5.2 } },
      });
      renderWithProviders(<Dashboard />);

      const negativeGrowthElement = await screen.findByText('-5.2%');
      expect(negativeGrowthElement).toHaveClass('text-red-500');
    });
  });

  describe('User Interactions', () => {
    it('should allow date range selection and trigger data refresh', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      const dateRangeButton = screen.getByRole('button', { name: /last 7 days/i });
      await user.click(dateRangeButton);

      const last30DaysOption = screen.getByRole('menuitem', { name: /last 30 days/i });
      await user.click(last30DaysOption);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenLastCalledWith(
          expect.stringContaining('range=30'),
          expect.any(Object)
        );
      });
    });

    it('should navigate to user management when "View All Users" is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      const viewAllButton = await screen.findByRole('button', { name: /view all users/i });
      await user.click(viewAllButton);

      expect(mockNavigate).toHaveBeenCalledWith('/users');
    });

    it('should open and close the export modal', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      const exportButton = await screen.findByRole('button', { name: /export data/i });
      await user.click(exportButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Export Dashboard Data')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should allow retry after failed fetch', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ data: mockDashboardData });

      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      const retryButton = await screen.findByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
      });
    });

    it('should handle empty data response gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/no data available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByLabelText('Date range selector')).toBeInTheDocument();
        expect(screen.getByLabelText('Export dashboard data')).toBeInTheDocument();
        expect(screen.getByLabelText('Refresh dashboard data')).toBeInTheDocument();
      });
    });

    it('should have proper heading structure', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings[0]).toHaveTextContent('Dashboard');
        expect(headings[1]).toHaveTextContent('Key Metrics');
        expect(headings[2]).toHaveTextContent('User Activity');
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        const dateRangeButton = screen.getByRole('button', { name: /last 7 days/i });
        dateRangeButton.focus();
        expect(dateRangeButton).toHaveFocus();

        user.tab();
        expect(screen.getByRole('button', { name: /export data/i })).toHaveFocus();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt layout for mobile view', async () => {
      global.innerWidth = 600;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        const statsContainer = screen.getByTestId('stats-container');
        expect(statsContainer).toHaveClass('grid-cols-1');

        const chartsContainer = screen.getByTestId('charts-container');
        expect(chartsContainer).toHaveClass('flex-col');
      });

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });
  });

  describe('Data Export Functionality', () => {
    it('should export data in CSV format when selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      const exportButton = await screen.findByRole('button', { name: /export data/i });
      await user.click(exportButton);

      const csvOption = screen.getByRole('radio', { name: /csv/i });
      await user.click(csvOption);

      const exportConfirmButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportConfirmButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/export'),
          { format: 'csv', range: '7' },
          expect.any(Object)
        );
      });
    });

    it('should show success notification after export', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { downloadUrl: 'test.url' } });
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      const exportButton = await screen.findByRole('button', { name: /export data/i });
      await user.click(exportButton);

      const exportConfirmButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportConfirmButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Export successful!',
          })
        );
      });
    });

    it('should show error notification when export fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Export failed'));
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      const exportButton = await screen.findByRole('button', { name: /export data/i });
      await user.click(exportButton);

      const exportConfirmButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportConfirmButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to export data',
          })
        );
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should show notification when new data is available', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Data last updated')).toBeInTheDocument();
      });

      // Simulate new data available
      const updateButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle auto-refresh toggle', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      const autoRefreshToggle = await screen.findByRole('switch', { name: /auto-refresh/i });
      await user.click(autoRefreshToggle);

      await waitFor(() => {
        expect(autoRefreshToggle).toBeChecked();
      });

      // Verify auto-refresh is working by checking if data is refetched
      jest.advanceTimersByTime(30000);
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

jest.mock('axios');
jest.mock('react-apexcharts', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-chart">Mock Chart</div>,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockAuthContext = {
  user: {
    id: '123',
    name: 'Test User',
    role: 'admin',
    token: 'test-token',
  },
  logout: jest.fn(),
};

const mockNotificationContext = {
  showNotification: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <NotificationContext.Provider value={mockNotificationContext}>
        <MemoryRouter>{ui}</MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

describe('Dashboard Component', () => {
  const mockDashboardData = {
    stats: {
      totalUsers: 1500,
      activeUsers: 1200,
      revenue: 45000,
      growthRate: 12.5,
    },
    charts: {
      userGrowth: [100, 200, 300, 400, 500],
      revenueTrend: [10000, 12000, 15000, 18000, 20000],
    },
    recentActivities: [
      { id: '1', user: 'User A', action: 'created account', time: '2 mins ago' },
      { id: '2', user: 'User B', action: 'made purchase', time: '1 hour ago' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockDashboardData });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<Dashboard />);

      expect(screen.getByTestId('stats-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('activities-skeleton')).toBeInTheDocument();
    });

    it('should render dashboard with data after successful fetch', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('1,500')).toBeInTheDocument();
        expect(screen.getByText('Active Users')).toBeInTheDocument();
        expect(screen.getByText('1,200')).toBeInTheDocument();
        expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
        expect(screen.getByText('User A')).toBeInTheDocument();
      });
    });
  });

  describe('Data Display and Formatting', () => {
    it('should correctly format and display numerical data', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeInTheDocument();
        expect(screen.getByText('1,200')).toBeInTheDocument();
        expect(screen.getByText('$45,000')).toBeInTheDocument();
        expect(screen.getByText('12.5%')).toBeInTheDocument();
      });
    });

    it('should display growth indicators with correct colors', async () => {
      renderWithProviders(<Dashboard />);

      const growthElement = await screen.findByText('12.5%');
      expect(growthElement).toHaveClass('text-green-500');

      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: { ...mockDashboardData, stats: { ...mockDashboardData.stats, growthRate: -5.2 } },
      });
      renderWithProviders(<Dashboard />);

      const negativeGrowthElement = await screen.findByText('-5.2%');
      expect(negativeGrowthElement).toHaveClass('text-red-500');
    });
  });

  describe('User Interactions', () => {
    it('should allow date range selection and trigger data refresh', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      const dateRangeButton = screen.getByRole('button', { name: /last 7 days/i });
      await user.click(dateRangeButton);

      const last30DaysOption = screen.getByRole('menuitem', { name: /last 30 days/i });
      await user.click(last30DaysOption);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenLastCalledWith(
          expect.stringContaining('range=30'),
          expect.any(Object)
        );
      });
    });

    it('should navigate to user management when "View All Users" is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      const viewAllButton = await screen.findByRole('button', { name: /view all users/i });
      await user.click(viewAllButton);

      expect(mockNavigate).toHaveBeenCalledWith('/users');
    });

    it('should open and close the export modal', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      const exportButton = await screen.findByRole('button', { name: /export data/i });
      await user.click(exportButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Export Dashboard Data')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should allow retry after failed fetch', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ data: mockDashboardData });

      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      const retryButton = await screen.findByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
      });
    });

    it('should handle empty data response gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/no data available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByLabelText('Date range selector')).toBeInTheDocument();
        expect(screen.getByLabelText('Export dashboard data')).toBeInTheDocument();
        expect(screen.getByLabelText('Refresh dashboard data')).toBeInTheDocument();
      });
    });

    it('should have proper heading structure', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings[0]).toHaveTextContent('Dashboard');
        expect(headings[1]).toHaveTextContent('Key Metrics');
        expect(headings[2]).toHaveTextContent('User Activity');
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        const dateRangeButton = screen.getByRole('button', { name: /last 7 days/i });
        dateRangeButton.focus();
        expect(dateRangeButton).toHaveFocus();

        user.tab();
        expect(screen.getByRole('button', { name: /export data/i })).toHaveFocus();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt layout for mobile view', async () => {
      global.innerWidth = 600;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        const statsContainer = screen.getByTestId('stats-container');
        expect(statsContainer).toHaveClass('grid-cols-1');

        const chartsContainer = screen.getByTestId('charts-container');
        expect(chartsContainer).toHaveClass('flex-col');
      });

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });
  });

  describe('Data Export Functionality', () => {
    it('should export data in CSV format when selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      const exportButton = await screen.findByRole('button', { name: /export data/i });
      await user.click(exportButton);

      const csvOption = screen.getByRole('radio', { name: /csv/i });
      await user.click(csvOption);

      const exportConfirmButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportConfirmButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/export'),
          { format: 'csv', range: '7' },
          expect.any(Object)
        );
      });
    });

    it('should show success notification after export', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { downloadUrl: 'test.url' } });
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      const exportButton = await screen.findByRole('button', { name: /export data/i });
      await user.click(exportButton);

      const exportConfirmButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportConfirmButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Export successful!',
          })
        );
      });
    });

    it('should show error notification when export fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Export failed'));
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      const exportButton = await screen.findByRole('button', { name: /export data/i });
      await user.click(exportButton);

      const exportConfirmButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportConfirmButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to export data',
          })
        );
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should show notification when new data is available', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Data last updated')).toBeInTheDocument();
      });

      // Simulate new data available
      const updateButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle auto-refresh toggle', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      const autoRefreshToggle = await screen.findByRole('switch', { name: /auto-refresh/i });
      await user.click(autoRefreshToggle);

      await waitFor(() => {
        expect(autoRefreshToggle).toBeChecked();
      });

      // Verify auto-refresh is working by checking if data is refetched
      jest.advanceTimersByTime(30000);
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });
  });
});