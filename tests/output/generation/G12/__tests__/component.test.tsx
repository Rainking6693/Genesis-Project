import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { DashboardProvider } from './DashboardContext';
import { mockDashboardData, mockErrorResponse } from './mocks/dashboardMocks';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('./hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '123', role: 'admin' }, isAuthenticated: true }),
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Dashboard Component', () => {
  const renderDashboard = () => {
    return render(
      <MemoryRouter>
        <DashboardProvider>
          <Dashboard />
        </DashboardProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockDashboardData });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while data is being fetched', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockDashboardData }), 1000))
      );

      renderDashboard();

      expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-content')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument();
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Core Functionality', () => {
    it('should render all main dashboard sections with proper data', async () => {
      renderDashboard();

      await waitFor(() => {
        // Check summary cards
        expect(screen.getByText(/total users/i)).toBeInTheDocument();
        expect(screen.getByText(mockDashboardData.summary.totalUsers)).toBeInTheDocument();
        expect(screen.getByText(/active projects/i)).toBeInTheDocument();
        expect(screen.getByText(mockDashboardData.summary.activeProjects)).toBeInTheDocument();

        // Check recent activity
        expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
        mockDashboardData.recentActivity.forEach((activity) => {
          expect(screen.getByText(activity.description)).toBeInTheDocument();
        });

        // Check charts
        expect(screen.getByTestId('projects-chart')).toBeInTheDocument();
        expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
      });
    });

    it('should allow filtering by date range', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      });

      const dateFilterButton = screen.getByRole('button', { name: /filter by date/i });
      await user.click(dateFilterButton);

      const last7DaysOption = screen.getByRole('option', { name: /last 7 days/i });
      await user.click(last7DaysOption);

      expect(axios.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        params: expect.objectContaining({
          dateRange: '7days'
        })
      }));
    });

    it('should update charts when data changes', async () => {
      const updatedData = {
        ...mockDashboardData,
        projectStats: {
          ...mockDashboardData.projectStats,
          data: [15, 25, 35, 45] // Different data points
        }
      };

      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDashboardData })
        .mockResolvedValueOnce({ data: updatedData });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('projects-chart')).toBeInTheDocument();
      });

      // Simulate refresh
      const refreshButton = screen.getByRole('button', { name: /refresh data/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        // Verify new data is rendered
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('User Interactions', () => {
    it('should open and close the project details modal', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(mockDashboardData.recentActivity[0].projectName)).toBeInTheDocument();
      });

      const projectLink = screen.getAllByRole('link', { name: mockDashboardData.recentActivity[0].projectName })[0];
      await user.click(projectLink);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/project details/i)).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should handle project status updates', async () => {
      const user = userEvent.setup();
      (axios.put as jest.Mock).mockResolvedValue({ data: { success: true } });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(mockDashboardData.projects[0].name)).toBeInTheDocument();
      });

      const moreOptionsButton = screen.getAllByRole('button', { name: /more options/i })[0];
      await user.click(moreOptionsButton);

      const statusMenuItem = screen.getByRole('menuitem', { name: /change status/i });
      await user.click(statusMenuItem);

      const statusSelect = screen.getByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelect, 'completed');

      const submitButton = screen.getByRole('button', { name: /update/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            status: 'completed'
          })
        );
        expect(screen.getByText(/status updated successfully/i)).toBeInTheDocument();
      });
    });

    it('should show confirmation dialog before deleting a project', async () => {
      const user = userEvent.setup();
      (axios.delete as jest.Mock).mockResolvedValue({ data: { success: true } });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(mockDashboardData.projects[0].name)).toBeInTheDocument();
      });

      const moreOptionsButton = screen.getAllByRole('button', { name: /more options/i })[0];
      await user.click(moreOptionsButton);

      const deleteMenuItem = screen.getByRole('menuitem', { name: /delete/i });
      await user.click(deleteMenuItem);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalled();
        expect(screen.getByText(/project deleted successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      });

      // Check main navigation
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'main navigation');

      // Check buttons
      const refreshButton = screen.getByRole('button', { name: /refresh data/i });
      expect(refreshButton).toHaveAttribute('aria-label', 'Refresh dashboard data');

      // Check charts
      const projectsChart = screen.getByTestId('projects-chart');
      expect(projectsChart).toHaveAttribute('role', 'img');
      expect(projectsChart).toHaveAccessibleName();
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /filter by date/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /refresh data/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('link', { name: mockDashboardData.recentActivity[0].projectName })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderDashboard();

      await waitFor(() => {
        const summaryCards = screen.getAllByTestId('summary-card');
        summaryCards.forEach(card => {
          const textElements = within(card).getAllByText(/[a-z]/i);
          textElements.forEach(el => {
            expect(el).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // or your actual text color
          });
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data states gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockDashboardData,
          projects: [],
          recentActivity: [],
          projectStats: { labels: [], data: [] }
        }
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
        expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
        expect(screen.getByTestId('empty-projects-chart')).toBeInTheDocument();
      });
    });

    it('should show unauthorized message when user lacks permissions', async () => {
      jest.mock('./hooks/useAuth', () => ({
        useAuth: () => ({ user: null, isAuthenticated: false }),
      }));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/you don't have permission to view this dashboard/i)).toBeInTheDocument();
      });
    });

    it('should handle API rate limiting gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: {
          status: 429,
          data: { message: 'Too many requests' }
        }
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
        expect(screen.getByText(/please try again later/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should catch and display component rendering errors', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Force a rendering error in a child component
      jest.mock('./components/ProjectChart', () => ({
        __esModule: true,
        default: () => {
          throw new Error('Chart rendering failed');
        }
      }));

      const { rerender } = renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
        expect(screen.getByText(/chart rendering failed/i)).toBeInTheDocument();
      });

      // Clean up
      jest.restoreAllMocks();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { DashboardProvider } from './DashboardContext';
import { mockDashboardData, mockErrorResponse } from './mocks/dashboardMocks';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('./hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '123', role: 'admin' }, isAuthenticated: true }),
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Dashboard Component', () => {
  const renderDashboard = () => {
    return render(
      <MemoryRouter>
        <DashboardProvider>
          <Dashboard />
        </DashboardProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockDashboardData });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while data is being fetched', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockDashboardData }), 1000))
      );

      renderDashboard();

      expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-content')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument();
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Core Functionality', () => {
    it('should render all main dashboard sections with proper data', async () => {
      renderDashboard();

      await waitFor(() => {
        // Check summary cards
        expect(screen.getByText(/total users/i)).toBeInTheDocument();
        expect(screen.getByText(mockDashboardData.summary.totalUsers)).toBeInTheDocument();
        expect(screen.getByText(/active projects/i)).toBeInTheDocument();
        expect(screen.getByText(mockDashboardData.summary.activeProjects)).toBeInTheDocument();

        // Check recent activity
        expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
        mockDashboardData.recentActivity.forEach((activity) => {
          expect(screen.getByText(activity.description)).toBeInTheDocument();
        });

        // Check charts
        expect(screen.getByTestId('projects-chart')).toBeInTheDocument();
        expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
      });
    });

    it('should allow filtering by date range', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      });

      const dateFilterButton = screen.getByRole('button', { name: /filter by date/i });
      await user.click(dateFilterButton);

      const last7DaysOption = screen.getByRole('option', { name: /last 7 days/i });
      await user.click(last7DaysOption);

      expect(axios.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        params: expect.objectContaining({
          dateRange: '7days'
        })
      }));
    });

    it('should update charts when data changes', async () => {
      const updatedData = {
        ...mockDashboardData,
        projectStats: {
          ...mockDashboardData.projectStats,
          data: [15, 25, 35, 45] // Different data points
        }
      };

      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDashboardData })
        .mockResolvedValueOnce({ data: updatedData });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('projects-chart')).toBeInTheDocument();
      });

      // Simulate refresh
      const refreshButton = screen.getByRole('button', { name: /refresh data/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        // Verify new data is rendered
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('User Interactions', () => {
    it('should open and close the project details modal', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(mockDashboardData.recentActivity[0].projectName)).toBeInTheDocument();
      });

      const projectLink = screen.getAllByRole('link', { name: mockDashboardData.recentActivity[0].projectName })[0];
      await user.click(projectLink);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/project details/i)).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should handle project status updates', async () => {
      const user = userEvent.setup();
      (axios.put as jest.Mock).mockResolvedValue({ data: { success: true } });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(mockDashboardData.projects[0].name)).toBeInTheDocument();
      });

      const moreOptionsButton = screen.getAllByRole('button', { name: /more options/i })[0];
      await user.click(moreOptionsButton);

      const statusMenuItem = screen.getByRole('menuitem', { name: /change status/i });
      await user.click(statusMenuItem);

      const statusSelect = screen.getByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelect, 'completed');

      const submitButton = screen.getByRole('button', { name: /update/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            status: 'completed'
          })
        );
        expect(screen.getByText(/status updated successfully/i)).toBeInTheDocument();
      });
    });

    it('should show confirmation dialog before deleting a project', async () => {
      const user = userEvent.setup();
      (axios.delete as jest.Mock).mockResolvedValue({ data: { success: true } });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(mockDashboardData.projects[0].name)).toBeInTheDocument();
      });

      const moreOptionsButton = screen.getAllByRole('button', { name: /more options/i })[0];
      await user.click(moreOptionsButton);

      const deleteMenuItem = screen.getByRole('menuitem', { name: /delete/i });
      await user.click(deleteMenuItem);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalled();
        expect(screen.getByText(/project deleted successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      });

      // Check main navigation
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'main navigation');

      // Check buttons
      const refreshButton = screen.getByRole('button', { name: /refresh data/i });
      expect(refreshButton).toHaveAttribute('aria-label', 'Refresh dashboard data');

      // Check charts
      const projectsChart = screen.getByTestId('projects-chart');
      expect(projectsChart).toHaveAttribute('role', 'img');
      expect(projectsChart).toHaveAccessibleName();
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /filter by date/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /refresh data/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('link', { name: mockDashboardData.recentActivity[0].projectName })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderDashboard();

      await waitFor(() => {
        const summaryCards = screen.getAllByTestId('summary-card');
        summaryCards.forEach(card => {
          const textElements = within(card).getAllByText(/[a-z]/i);
          textElements.forEach(el => {
            expect(el).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // or your actual text color
          });
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data states gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockDashboardData,
          projects: [],
          recentActivity: [],
          projectStats: { labels: [], data: [] }
        }
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
        expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
        expect(screen.getByTestId('empty-projects-chart')).toBeInTheDocument();
      });
    });

    it('should show unauthorized message when user lacks permissions', async () => {
      jest.mock('./hooks/useAuth', () => ({
        useAuth: () => ({ user: null, isAuthenticated: false }),
      }));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/you don't have permission to view this dashboard/i)).toBeInTheDocument();
      });
    });

    it('should handle API rate limiting gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: {
          status: 429,
          data: { message: 'Too many requests' }
        }
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
        expect(screen.getByText(/please try again later/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should catch and display component rendering errors', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Force a rendering error in a child component
      jest.mock('./components/ProjectChart', () => ({
        __esModule: true,
        default: () => {
          throw new Error('Chart rendering failed');
        }
      }));

      const { rerender } = renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
        expect(screen.getByText(/chart rendering failed/i)).toBeInTheDocument();
      });

      // Clean up
      jest.restoreAllMocks();
    });
  });
});