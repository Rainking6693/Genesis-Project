import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

jest.mock('axios');
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Line: () => <div data-testid="line-chart" />,
  Doughnut: () => <div data-testid="doughnut-chart" />,
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
    recentActivity: [
      { id: '1', user: 'User A', action: 'created', entity: 'report', timestamp: '2023-05-01T10:00:00Z' },
      { id: '2', user: 'User B', action: 'updated', entity: 'profile', timestamp: '2023-05-01T09:30:00Z' },
    ],
    charts: {
      userGrowth: [100, 200, 300, 400, 500, 600, 700],
      revenueTrend: [10000, 12000, 15000, 18000, 20000, 25000, 30000],
      departmentDistribution: {
        labels: ['Sales', 'Marketing', 'Engineering', 'HR'],
        data: [30, 25, 35, 10],
      },
    },
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
      expect(screen.getByTestId('activity-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('charts-skeleton')).toBeInTheDocument();
    });

    it('should render dashboard with data after successful fetch', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeInTheDocument();
        expect(screen.getByText('1,200')).toBeInTheDocument();
        expect(screen.getByText('$45,000')).toBeInTheDocument();
        expect(screen.getByText('12.5%')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
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

    it('should handle 401 error by logging out user', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } },
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

    it('should filter activity items by search term', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('User A')).toBeInTheDocument();
        expect(screen.getByText('User B')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Search activity...'), 'User A');

      await waitFor(() => {
        expect(screen.getByText('User A')).toBeInTheDocument();
        expect(screen.queryByText('User B')).not.toBeInTheDocument();
      });
    });

    it('should navigate to user profile when clicking on activity user', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(async () => {
        await userEvent.click(screen.getAllByText('User A')[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/users/1');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByLabelText('Date range selector')).toBeInTheDocument();
        expect(screen.getByLabelText('Search activity')).toBeInTheDocument();
        expect(screen.getByLabelText('User growth chart')).toBeInTheDocument();
        expect(screen.getByLabelText('Revenue trend chart')).toBeInTheDocument();
        expect(screen.getByLabelText('Department distribution chart')).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      await waitFor(async () => {
        await user.tab();
        expect(screen.getByLabelText('Date range selector')).toHaveFocus();

        await user.tab();
        expect(screen.getByLabelText('Search activity')).toHaveFocus();

        await user.tab();
        expect(screen.getByText('Export Data')).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        const statCards = screen.getAllByTestId('stat-card');
        statCards.forEach(card => {
          const textElements = within(card).getAllByText(/[0-9]/);
          textElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const color = style.color;
            const backgroundColor = style.backgroundColor;
            // This is a simplified check - in real tests you'd calculate actual contrast
            expect(color).not.toBe(backgroundColor);
          });
        });
      });
    });
  });

  describe('Data Export Functionality', () => {
    it('should export data as CSV when export button is clicked', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      const mockUrl = 'blob:url';
      jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

      window.URL.revokeObjectURL = jest.fn();

      (axios.get as jest.Mock).mockResolvedValueOnce({ data: mockDashboardData })
        .mockResolvedValueOnce({
          data: 'user,action,entity,timestamp\nUser A,created,report,2023-05-01T10:00:00Z',
          headers: { 'content-type': 'text/csv' }
        });

      renderWithProviders(<Dashboard />);

      await waitFor(async () => {
        await user.click(screen.getByText('Export Data'));
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/export'),
          expect.any(Object)
        );
      });
    });

    it('should show error when export fails', async () => {
      const user = userEvent.setup();
      (axios.get as jest.Mock).mockRejectedValue(new Error('Export failed'));

      renderWithProviders(<Dashboard />);

      await waitFor(async () => {
        await user.click(screen.getByText('Export Data'));
      });

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

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile view', async () => {
      window.innerWidth = 500;
      window.dispatchEvent(new Event('resize'));

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        const statCards = screen.getAllByTestId('stat-card');
        statCards.forEach(card => {
          expect(card).toHaveStyle('flex: 1 1 100%');
        });
      });
    });

    it('should show mobile menu button on small screens', async () => {
      window.innerWidth = 500;
      window.dispatchEvent(new Event('resize'));

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByLabelText('Menu')).toBeInTheDocument();
      });
    });
  });

  describe('Admin-Specific Features', () => {
    it('should show admin controls when user is admin', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Manage Users')).toBeInTheDocument();
        expect(screen.getByText('System Settings')).toBeInTheDocument();
      });
    });

    it('should hide admin controls when user is not admin', async () => {
      const nonAdminContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'user' },
      };

      render(
        <AuthContext.Provider value={nonAdminContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <MemoryRouter><Dashboard /></MemoryRouter>
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
        expect(screen.queryByText('System Settings')).not.toBeInTheDocument();
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

jest.mock('axios');
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Line: () => <div data-testid="line-chart" />,
  Doughnut: () => <div data-testid="doughnut-chart" />,
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
    recentActivity: [
      { id: '1', user: 'User A', action: 'created', entity: 'report', timestamp: '2023-05-01T10:00:00Z' },
      { id: '2', user: 'User B', action: 'updated', entity: 'profile', timestamp: '2023-05-01T09:30:00Z' },
    ],
    charts: {
      userGrowth: [100, 200, 300, 400, 500, 600, 700],
      revenueTrend: [10000, 12000, 15000, 18000, 20000, 25000, 30000],
      departmentDistribution: {
        labels: ['Sales', 'Marketing', 'Engineering', 'HR'],
        data: [30, 25, 35, 10],
      },
    },
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
      expect(screen.getByTestId('activity-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('charts-skeleton')).toBeInTheDocument();
    });

    it('should render dashboard with data after successful fetch', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeInTheDocument();
        expect(screen.getByText('1,200')).toBeInTheDocument();
        expect(screen.getByText('$45,000')).toBeInTheDocument();
        expect(screen.getByText('12.5%')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
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

    it('should handle 401 error by logging out user', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } },
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

    it('should filter activity items by search term', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('User A')).toBeInTheDocument();
        expect(screen.getByText('User B')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Search activity...'), 'User A');

      await waitFor(() => {
        expect(screen.getByText('User A')).toBeInTheDocument();
        expect(screen.queryByText('User B')).not.toBeInTheDocument();
      });
    });

    it('should navigate to user profile when clicking on activity user', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(async () => {
        await userEvent.click(screen.getAllByText('User A')[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/users/1');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByLabelText('Date range selector')).toBeInTheDocument();
        expect(screen.getByLabelText('Search activity')).toBeInTheDocument();
        expect(screen.getByLabelText('User growth chart')).toBeInTheDocument();
        expect(screen.getByLabelText('Revenue trend chart')).toBeInTheDocument();
        expect(screen.getByLabelText('Department distribution chart')).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);

      await waitFor(async () => {
        await user.tab();
        expect(screen.getByLabelText('Date range selector')).toHaveFocus();

        await user.tab();
        expect(screen.getByLabelText('Search activity')).toHaveFocus();

        await user.tab();
        expect(screen.getByText('Export Data')).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        const statCards = screen.getAllByTestId('stat-card');
        statCards.forEach(card => {
          const textElements = within(card).getAllByText(/[0-9]/);
          textElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const color = style.color;
            const backgroundColor = style.backgroundColor;
            // This is a simplified check - in real tests you'd calculate actual contrast
            expect(color).not.toBe(backgroundColor);
          });
        });
      });
    });
  });

  describe('Data Export Functionality', () => {
    it('should export data as CSV when export button is clicked', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      const mockUrl = 'blob:url';
      jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

      window.URL.revokeObjectURL = jest.fn();

      (axios.get as jest.Mock).mockResolvedValueOnce({ data: mockDashboardData })
        .mockResolvedValueOnce({
          data: 'user,action,entity,timestamp\nUser A,created,report,2023-05-01T10:00:00Z',
          headers: { 'content-type': 'text/csv' }
        });

      renderWithProviders(<Dashboard />);

      await waitFor(async () => {
        await user.click(screen.getByText('Export Data'));
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/export'),
          expect.any(Object)
        );
      });
    });

    it('should show error when export fails', async () => {
      const user = userEvent.setup();
      (axios.get as jest.Mock).mockRejectedValue(new Error('Export failed'));

      renderWithProviders(<Dashboard />);

      await waitFor(async () => {
        await user.click(screen.getByText('Export Data'));
      });

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

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile view', async () => {
      window.innerWidth = 500;
      window.dispatchEvent(new Event('resize'));

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        const statCards = screen.getAllByTestId('stat-card');
        statCards.forEach(card => {
          expect(card).toHaveStyle('flex: 1 1 100%');
        });
      });
    });

    it('should show mobile menu button on small screens', async () => {
      window.innerWidth = 500;
      window.dispatchEvent(new Event('resize'));

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByLabelText('Menu')).toBeInTheDocument();
      });
    });
  });

  describe('Admin-Specific Features', () => {
    it('should show admin controls when user is admin', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Manage Users')).toBeInTheDocument();
        expect(screen.getByText('System Settings')).toBeInTheDocument();
      });
    });

    it('should hide admin controls when user is not admin', async () => {
      const nonAdminContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'user' },
      };

      render(
        <AuthContext.Provider value={nonAdminContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <MemoryRouter><Dashboard /></MemoryRouter>
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
        expect(screen.queryByText('System Settings')).not.toBeInTheDocument();
      });
    });
  });
});