import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

jest.mock('axios');
jest.mock('react-chartjs-2', () => ({
  Bar: () => <canvas data-testid="bar-chart" />,
  Line: () => <canvas data-testid="line-chart" />,
  Doughnut: () => <canvas data-testid="doughnut-chart" />,
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

const renderDashboard = () => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <NotificationContext.Provider value={mockNotificationContext}>
          <Dashboard />
        </NotificationContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise(() => {})
      );

      renderDashboard();
      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render all major sections after data loads', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          stats: { totalUsers: 100, activeProjects: 25, revenue: 5000 },
          recentActivity: [],
          charts: {
            userGrowth: { labels: [], datasets: [] },
            projectStatus: { labels: [], datasets: [] },
          },
        },
      });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('stats-section')).toBeInTheDocument();
        expect(screen.getByTestId('recent-activity')).toBeInTheDocument();
        expect(screen.getByTestId('charts-section')).toBeInTheDocument();
      });
    });

    it('should display user greeting with correct name', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/welcome back, test user/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch dashboard data on mount', () => {
      renderDashboard();
      expect(axios.get).toHaveBeenCalledWith('/api/dashboard', {
        headers: { Authorization: 'Bearer test-token' },
      });
    });

    it('should handle API error gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderDashboard();
      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to load dashboard data',
          })
        );
      });
    });

    it('should display error message when data fetching fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/unable to load dashboard data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          stats: { totalUsers: 100, activeProjects: 25, revenue: 5000 },
          recentActivity: [
            { id: '1', type: 'project_created', title: 'New Project', date: '2023-01-01' },
            { id: '2', type: 'user_joined', title: 'New User', date: '2023-01-02' },
          ],
          charts: {
            userGrowth: { labels: ['Jan', 'Feb'], datasets: [{ data: [10, 20] }] },
            projectStatus: { labels: ['Active', 'Completed'], datasets: [{ data: [15, 10] }] },
          },
        },
      });
    });

    it('should allow date range selection', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('date-range-selector')).toBeInTheDocument();
      });

      const selector = screen.getByTestId('date-range-selector');
      fireEvent.change(selector, { target: { value: 'last_30_days' } });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('range=last_30_days'),
          expect.any(Object)
        );
      });
    });

    it('should allow filtering recent activity', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /filter activity/i })).toBeInTheDocument();
      });

      const filter = screen.getByRole('combobox', { name: /filter activity/i });
      userEvent.selectOptions(filter, 'project_created');

      await waitFor(() => {
        expect(screen.getByText('New Project')).toBeInTheDocument();
        expect(screen.queryByText('New User')).not.toBeInTheDocument();
      });
    });

    it('should navigate to project details when clicking on a project activity', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          stats: {},
          recentActivity: [
            { id: '1', type: 'project_created', title: 'New Project', date: '2023-01-01', projectId: 'proj-123' },
          ],
          charts: {},
        },
      });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText('New Project')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('New Project'));
      expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-123');
    });

    it('should refresh data when refresh button is clicked', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });

      (axios.get as jest.Mock).mockClear();
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });

    it('should retry data fetch when retry button is shown and clicked', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({ data: {} });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for loading state', () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise(() => {})
      );

      renderDashboard();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper ARIA labels for charts', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: { charts: {} } });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toHaveAccessibleName();
        expect(screen.getByTestId('line-chart')).toHaveAccessibleName();
        expect(screen.getByTestId('doughnut-chart')).toHaveAccessibleName();
      });
    });

    it('should be navigable via keyboard', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      renderDashboard();
      await waitFor(() => {
        expect(document.body).toHaveFocus();
      });

      // Tab through interactive elements
      userEvent.tab();
      expect(screen.getByTestId('date-range-selector')).toHaveFocus();

      userEvent.tab();
      expect(screen.getByRole('combobox', { name: /filter activity/i })).toHaveFocus();

      userEvent.tab();
      expect(screen.getByRole('button', { name: /refresh/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      const { container } = renderDashboard();
      await waitFor(() => {
        const statsSection = screen.getByTestId('stats-section');
        const statCards = within(statsSection).getAllByRole('heading');
        statCards.forEach(card => {
          expect(card).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty recent activity gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          stats: {},
          recentActivity: [],
          charts: {},
        },
      });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/no recent activity found/i)).toBeInTheDocument();
      });
    });

    it('should handle empty chart data gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          stats: {},
          recentActivity: [],
          charts: {
            userGrowth: { labels: [], datasets: [] },
            projectStatus: { labels: [], datasets: [] },
          },
        },
      });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/no data available for this chart/i)).toBeInTheDocument();
      });
    });

    it('should display proper message when user has no permissions', async () => {
      const restrictedMockAuthContext = {
        user: {
          id: '123',
          name: 'Test User',
          role: 'viewer',
          token: 'test-token',
        },
        logout: jest.fn(),
      };

      render(
        <MemoryRouter>
          <AuthContext.Provider value={restrictedMockAuthContext}>
            <NotificationContext.Provider value={mockNotificationContext}>
              <Dashboard />
            </NotificationContext.Provider>
          </AuthContext.Provider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/your access is limited to view-only mode/i)).toBeInTheDocument();
        expect(screen.queryByTestId('date-range-selector')).not.toBeInTheDocument();
      });
    });

    it('should handle token expiration gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Token expired' },
        },
      });

      renderDashboard();
      await waitFor(() => {
        expect(mockAuthContext.logout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Performance', () => {
    it('should not make duplicate API calls when rapidly changing filters', async () => {
      jest.useFakeTimers();
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('date-range-selector')).toBeInTheDocument();
      });

      const selector = screen.getByTestId('date-range-selector');
      fireEvent.change(selector, { target: { value: 'last_7_days' } });
      fireEvent.change(selector, { target: { value: 'last_30_days' } });
      fireEvent.change(selector, { target: { value: 'last_90_days' } });

      // Fast-forward time
      act(() => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

jest.mock('axios');
jest.mock('react-chartjs-2', () => ({
  Bar: () => <canvas data-testid="bar-chart" />,
  Line: () => <canvas data-testid="line-chart" />,
  Doughnut: () => <canvas data-testid="doughnut-chart" />,
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

const renderDashboard = () => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <NotificationContext.Provider value={mockNotificationContext}>
          <Dashboard />
        </NotificationContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise(() => {})
      );

      renderDashboard();
      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render all major sections after data loads', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          stats: { totalUsers: 100, activeProjects: 25, revenue: 5000 },
          recentActivity: [],
          charts: {
            userGrowth: { labels: [], datasets: [] },
            projectStatus: { labels: [], datasets: [] },
          },
        },
      });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('stats-section')).toBeInTheDocument();
        expect(screen.getByTestId('recent-activity')).toBeInTheDocument();
        expect(screen.getByTestId('charts-section')).toBeInTheDocument();
      });
    });

    it('should display user greeting with correct name', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/welcome back, test user/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch dashboard data on mount', () => {
      renderDashboard();
      expect(axios.get).toHaveBeenCalledWith('/api/dashboard', {
        headers: { Authorization: 'Bearer test-token' },
      });
    });

    it('should handle API error gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderDashboard();
      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to load dashboard data',
          })
        );
      });
    });

    it('should display error message when data fetching fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/unable to load dashboard data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          stats: { totalUsers: 100, activeProjects: 25, revenue: 5000 },
          recentActivity: [
            { id: '1', type: 'project_created', title: 'New Project', date: '2023-01-01' },
            { id: '2', type: 'user_joined', title: 'New User', date: '2023-01-02' },
          ],
          charts: {
            userGrowth: { labels: ['Jan', 'Feb'], datasets: [{ data: [10, 20] }] },
            projectStatus: { labels: ['Active', 'Completed'], datasets: [{ data: [15, 10] }] },
          },
        },
      });
    });

    it('should allow date range selection', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('date-range-selector')).toBeInTheDocument();
      });

      const selector = screen.getByTestId('date-range-selector');
      fireEvent.change(selector, { target: { value: 'last_30_days' } });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('range=last_30_days'),
          expect.any(Object)
        );
      });
    });

    it('should allow filtering recent activity', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /filter activity/i })).toBeInTheDocument();
      });

      const filter = screen.getByRole('combobox', { name: /filter activity/i });
      userEvent.selectOptions(filter, 'project_created');

      await waitFor(() => {
        expect(screen.getByText('New Project')).toBeInTheDocument();
        expect(screen.queryByText('New User')).not.toBeInTheDocument();
      });
    });

    it('should navigate to project details when clicking on a project activity', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          stats: {},
          recentActivity: [
            { id: '1', type: 'project_created', title: 'New Project', date: '2023-01-01', projectId: 'proj-123' },
          ],
          charts: {},
        },
      });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText('New Project')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('New Project'));
      expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-123');
    });

    it('should refresh data when refresh button is clicked', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });

      (axios.get as jest.Mock).mockClear();
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });

    it('should retry data fetch when retry button is shown and clicked', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({ data: {} });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for loading state', () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise(() => {})
      );

      renderDashboard();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper ARIA labels for charts', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: { charts: {} } });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toHaveAccessibleName();
        expect(screen.getByTestId('line-chart')).toHaveAccessibleName();
        expect(screen.getByTestId('doughnut-chart')).toHaveAccessibleName();
      });
    });

    it('should be navigable via keyboard', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      renderDashboard();
      await waitFor(() => {
        expect(document.body).toHaveFocus();
      });

      // Tab through interactive elements
      userEvent.tab();
      expect(screen.getByTestId('date-range-selector')).toHaveFocus();

      userEvent.tab();
      expect(screen.getByRole('combobox', { name: /filter activity/i })).toHaveFocus();

      userEvent.tab();
      expect(screen.getByRole('button', { name: /refresh/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      const { container } = renderDashboard();
      await waitFor(() => {
        const statsSection = screen.getByTestId('stats-section');
        const statCards = within(statsSection).getAllByRole('heading');
        statCards.forEach(card => {
          expect(card).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty recent activity gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          stats: {},
          recentActivity: [],
          charts: {},
        },
      });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/no recent activity found/i)).toBeInTheDocument();
      });
    });

    it('should handle empty chart data gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          stats: {},
          recentActivity: [],
          charts: {
            userGrowth: { labels: [], datasets: [] },
            projectStatus: { labels: [], datasets: [] },
          },
        },
      });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/no data available for this chart/i)).toBeInTheDocument();
      });
    });

    it('should display proper message when user has no permissions', async () => {
      const restrictedMockAuthContext = {
        user: {
          id: '123',
          name: 'Test User',
          role: 'viewer',
          token: 'test-token',
        },
        logout: jest.fn(),
      };

      render(
        <MemoryRouter>
          <AuthContext.Provider value={restrictedMockAuthContext}>
            <NotificationContext.Provider value={mockNotificationContext}>
              <Dashboard />
            </NotificationContext.Provider>
          </AuthContext.Provider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/your access is limited to view-only mode/i)).toBeInTheDocument();
        expect(screen.queryByTestId('date-range-selector')).not.toBeInTheDocument();
      });
    });

    it('should handle token expiration gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Token expired' },
        },
      });

      renderDashboard();
      await waitFor(() => {
        expect(mockAuthContext.logout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Performance', () => {
    it('should not make duplicate API calls when rapidly changing filters', async () => {
      jest.useFakeTimers();
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('date-range-selector')).toBeInTheDocument();
      });

      const selector = screen.getByTestId('date-range-selector');
      fireEvent.change(selector, { target: { value: 'last_7_days' } });
      fireEvent.change(selector, { target: { value: 'last_30_days' } });
      fireEvent.change(selector, { target: { value: 'last_90_days' } });

      // Fast-forward time
      act(() => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });
  });
});