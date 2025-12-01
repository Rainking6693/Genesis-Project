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
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
};

const mockNotificationContext = {
  showNotification: jest.fn(),
  clearNotification: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <NotificationContext.Provider value={mockNotificationContext}>
          {ui}
        </NotificationContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        metrics: {
          totalUsers: 150,
          activeUsers: 120,
          revenue: 45000,
          growthRate: 12.5,
        },
        recentActivity: [
          { id: '1', type: 'user_signup', user: 'John Doe', timestamp: '2023-05-15T10:00:00Z' },
          { id: '2', type: 'purchase', user: 'Jane Smith', timestamp: '2023-05-14T15:30:00Z' },
        ],
        charts: {
          userGrowth: [10, 20, 30, 40, 50],
          revenueTrend: [10000, 12000, 15000, 18000, 20000],
        },
      },
    });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<Dashboard />);

      expect(screen.getByTestId('metrics-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('activity-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('charts-skeleton')).toBeInTheDocument();
    });

    it('should render dashboard with data after successful fetch', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('Active Users')).toBeInTheDocument();
        expect(screen.getByText('120')).toBeInTheDocument();
        expect(screen.getByText('$45,000')).toBeInTheDocument();
        expect(screen.getByText('12.5%')).toBeInTheDocument();
        expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to load dashboard data',
          })
        );
      });
    });

    it('should handle 403 error and redirect to login', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: { status: 403, data: { message: 'Forbidden' } },
      });
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(mockAuthContext.logout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow date range selection and trigger data refresh', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Last 7 Days'));
      await user.click(screen.getByText('Last 30 Days'));

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenLastCalledWith(
          expect.stringContaining('range=30'),
          expect.any(Object)
        );
      });
    });

    it('should open and close activity details modal', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getAllByRole('button', { name: /view details/i })[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Activity Details')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /close/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should export data when export button is clicked', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['test data'], { type: 'application/json' });
      const mockUrl = 'http://example.com/export';
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: { exportUrl: mockUrl },
      });

      window.URL.createObjectURL = jest.fn().mockReturnValue('mock-url');
      window.open = jest.fn();

      renderWithProviders(<Dashboard />);

      await user.click(screen.getByRole('button', { name: /export data/i }));

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/export'),
          expect.any(Object)
        );
        expect(window.open).toHaveBeenCalledWith('mock-url', '_blank');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByLabelText('Date range selector')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /export data/i })).toHaveAccessibleName();
        expect(screen.getAllByRole('button', { name: /view details/i })[0]).toHaveAccessibleName();
      });
    });

    it('should have proper heading structure', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Dashboard Overview', level: 1 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Key Metrics', level: 2 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Recent Activity', level: 2 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'User Growth', level: 2 })).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(document.body).toHaveFocus();
      });

      await user.tab();
      expect(screen.getByLabelText('Date range selector')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /export data/i })).toHaveFocus();

      await user.tab();
      expect(screen.getAllByRole('button', { name: /view details/i })[0]).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty activity data gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          metrics: {
            totalUsers: 0,
            activeUsers: 0,
            revenue: 0,
            growthRate: 0,
          },
          recentActivity: [],
          charts: {
            userGrowth: [],
            revenueTrend: [],
          },
        },
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('No recent activity found')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    it('should display fallback UI when chart data is invalid', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          metrics: {
            totalUsers: 150,
            activeUsers: 120,
            revenue: 45000,
            growthRate: 12.5,
          },
          recentActivity: [],
          charts: {
            userGrowth: null,
            revenueTrend: undefined,
          },
        },
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chart data unavailable')).toBeInTheDocument();
      });
    });

    it('should handle very large numbers in metrics', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          metrics: {
            totalUsers: 1000000,
            activeUsers: 950000,
            revenue: 1000000000,
            growthRate: 150.75,
          },
          recentActivity: [],
          charts: {
            userGrowth: [100000, 200000, 300000],
            revenueTrend: [10000000, 20000000, 30000000],
          },
        },
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('1,000,000')).toBeInTheDocument();
        expect(screen.getByText('950,000')).toBeInTheDocument();
        expect(screen.getByText('$1,000,000,000')).toBeInTheDocument();
        expect(screen.getByText('150.75%')).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Access', () => {
    it('should hide admin-only features for non-admin users', async () => {
      const nonAdminContext = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          role: 'user',
        },
      };

      render(
        <MemoryRouter>
          <AuthContext.Provider value={nonAdminContext}>
            <NotificationContext.Provider value={mockNotificationContext}>
              <Dashboard />
            </NotificationContext.Provider>
          </AuthContext.Provider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /export data/i })).not.toBeInTheDocument();
        expect(screen.queryByText('Advanced Analytics')).not.toBeInTheDocument();
      });
    });

    it('should show all features for admin users', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument();
        expect(screen.getByText('Advanced Analytics')).toBeInTheDocument();
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
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
};

const mockNotificationContext = {
  showNotification: jest.fn(),
  clearNotification: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <NotificationContext.Provider value={mockNotificationContext}>
          {ui}
        </NotificationContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        metrics: {
          totalUsers: 150,
          activeUsers: 120,
          revenue: 45000,
          growthRate: 12.5,
        },
        recentActivity: [
          { id: '1', type: 'user_signup', user: 'John Doe', timestamp: '2023-05-15T10:00:00Z' },
          { id: '2', type: 'purchase', user: 'Jane Smith', timestamp: '2023-05-14T15:30:00Z' },
        ],
        charts: {
          userGrowth: [10, 20, 30, 40, 50],
          revenueTrend: [10000, 12000, 15000, 18000, 20000],
        },
      },
    });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<Dashboard />);

      expect(screen.getByTestId('metrics-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('activity-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('charts-skeleton')).toBeInTheDocument();
    });

    it('should render dashboard with data after successful fetch', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('Active Users')).toBeInTheDocument();
        expect(screen.getByText('120')).toBeInTheDocument();
        expect(screen.getByText('$45,000')).toBeInTheDocument();
        expect(screen.getByText('12.5%')).toBeInTheDocument();
        expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to load dashboard data',
          })
        );
      });
    });

    it('should handle 403 error and redirect to login', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: { status: 403, data: { message: 'Forbidden' } },
      });
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(mockAuthContext.logout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow date range selection and trigger data refresh', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Last 7 Days'));
      await user.click(screen.getByText('Last 30 Days'));

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenLastCalledWith(
          expect.stringContaining('range=30'),
          expect.any(Object)
        );
      });
    });

    it('should open and close activity details modal', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getAllByRole('button', { name: /view details/i })[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Activity Details')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /close/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should export data when export button is clicked', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['test data'], { type: 'application/json' });
      const mockUrl = 'http://example.com/export';
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: { exportUrl: mockUrl },
      });

      window.URL.createObjectURL = jest.fn().mockReturnValue('mock-url');
      window.open = jest.fn();

      renderWithProviders(<Dashboard />);

      await user.click(screen.getByRole('button', { name: /export data/i }));

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/export'),
          expect.any(Object)
        );
        expect(window.open).toHaveBeenCalledWith('mock-url', '_blank');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByLabelText('Date range selector')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /export data/i })).toHaveAccessibleName();
        expect(screen.getAllByRole('button', { name: /view details/i })[0]).toHaveAccessibleName();
      });
    });

    it('should have proper heading structure', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Dashboard Overview', level: 1 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Key Metrics', level: 2 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Recent Activity', level: 2 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'User Growth', level: 2 })).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(document.body).toHaveFocus();
      });

      await user.tab();
      expect(screen.getByLabelText('Date range selector')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /export data/i })).toHaveFocus();

      await user.tab();
      expect(screen.getAllByRole('button', { name: /view details/i })[0]).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty activity data gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          metrics: {
            totalUsers: 0,
            activeUsers: 0,
            revenue: 0,
            growthRate: 0,
          },
          recentActivity: [],
          charts: {
            userGrowth: [],
            revenueTrend: [],
          },
        },
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('No recent activity found')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    it('should display fallback UI when chart data is invalid', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          metrics: {
            totalUsers: 150,
            activeUsers: 120,
            revenue: 45000,
            growthRate: 12.5,
          },
          recentActivity: [],
          charts: {
            userGrowth: null,
            revenueTrend: undefined,
          },
        },
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chart data unavailable')).toBeInTheDocument();
      });
    });

    it('should handle very large numbers in metrics', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          metrics: {
            totalUsers: 1000000,
            activeUsers: 950000,
            revenue: 1000000000,
            growthRate: 150.75,
          },
          recentActivity: [],
          charts: {
            userGrowth: [100000, 200000, 300000],
            revenueTrend: [10000000, 20000000, 30000000],
          },
        },
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('1,000,000')).toBeInTheDocument();
        expect(screen.getByText('950,000')).toBeInTheDocument();
        expect(screen.getByText('$1,000,000,000')).toBeInTheDocument();
        expect(screen.getByText('150.75%')).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Access', () => {
    it('should hide admin-only features for non-admin users', async () => {
      const nonAdminContext = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          role: 'user',
        },
      };

      render(
        <MemoryRouter>
          <AuthContext.Provider value={nonAdminContext}>
            <NotificationContext.Provider value={mockNotificationContext}>
              <Dashboard />
            </NotificationContext.Provider>
          </AuthContext.Provider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /export data/i })).not.toBeInTheDocument();
        expect(screen.queryByText('Advanced Analytics')).not.toBeInTheDocument();
      });
    });

    it('should show all features for admin users', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument();
        expect(screen.getByText('Advanced Analytics')).toBeInTheDocument();
      });
    });
  });
});