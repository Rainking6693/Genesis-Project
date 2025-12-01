import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

jest.mock('axios');
jest.mock('react-apexcharts', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-chart"></div>,
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
        <MemoryRouter>
          <Routes>
            <Route path="/" element={ui} />
            <Route path="/details/:id" element={<div>Details Page</div>} />
          </Routes>
        </MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

describe('Dashboard Component', () => {
  const mockDashboardData = {
    summary: {
      totalUsers: 150,
      activeProjects: 12,
      pendingTasks: 5,
      revenue: 45000,
    },
    projects: [
      { id: '1', name: 'Project Alpha', status: 'active', progress: 75, budget: 50000 },
      { id: '2', name: 'Project Beta', status: 'pending', progress: 30, budget: 30000 },
      { id: '3', name: 'Project Gamma', status: 'completed', progress: 100, budget: 25000 },
    ],
    recentActivity: [
      { id: '1', type: 'project_update', message: 'Project Alpha updated', timestamp: '2023-05-15T10:00:00Z' },
      { id: '2', type: 'new_user', message: 'New user registered', timestamp: '2023-05-14T15:30:00Z' },
    ],
    charts: {
      projectStatus: {
        active: 4,
        pending: 2,
        completed: 6,
      },
      monthlyRevenue: [
        { month: 'Jan', value: 5000 },
        { month: 'Feb', value: 7000 },
        { month: 'Mar', value: 6500 },
      ],
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

      expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Overview')).not.toBeInTheDocument();
    });

    it('should render dashboard with data after successful fetch', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument(); // Total Users
        expect(screen.getByText('12')).toBeInTheDocument(); // Active Projects
        expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
      });
    });

    it('should handle fetch error gracefully', async () => {
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
  });

  describe('Data Display and Interaction', () => {
    beforeEach(async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });
    });

    it('should display all summary cards with correct values', () => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Pending Tasks')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      expect(screen.getByText('$45,000')).toBeInTheDocument();
    });

    it('should display projects table with correct data', () => {
      const table = screen.getByRole('table', { name: 'Projects Overview' });
      const rows = within(table).getAllByRole('row');

      // Header row + 3 data rows
      expect(rows).toHaveLength(4);

      expect(within(rows[1]).getByText('Project Alpha')).toBeInTheDocument();
      expect(within(rows[1]).getByText('active')).toBeInTheDocument();
      expect(within(rows[1]).getByText('75%')).toBeInTheDocument();

      expect(within(rows[2]).getByText('Project Beta')).toBeInTheDocument();
      expect(within(rows[2]).getByText('pending')).toBeInTheDocument();
    });

    it('should display recent activity items', () => {
      const activityItems = screen.getAllByRole('listitem');
      expect(activityItems).toHaveLength(2);
      expect(within(activityItems[0]).getByText('Project Alpha updated')).toBeInTheDocument();
      expect(within(activityItems[1]).getByText('New user registered')).toBeInTheDocument();
    });

    it('should navigate to project details when project row is clicked', async () => {
      const user = userEvent.setup();
      const table = screen.getByRole('table', { name: 'Projects Overview' });
      const firstRow = within(table).getAllByRole('row')[1];

      await user.click(firstRow);
      expect(mockNavigate).toHaveBeenCalledWith('/details/1');
    });
  });

  describe('Filtering and Search Functionality', () => {
    beforeEach(async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });
    });

    it('should filter projects by status', async () => {
      const user = userEvent.setup();
      const filterSelect = screen.getByLabelText('Filter by status');
      await user.selectOptions(filterSelect, 'completed');

      // Should only show Project Gamma
      const table = screen.getByRole('table', { name: 'Projects Overview' });
      const rows = within(table).getAllByRole('row');
      expect(rows).toHaveLength(2); // Header + 1 data row
      expect(within(rows[1]).getByText('Project Gamma')).toBeInTheDocument();
    });

    it('should search projects by name', async () => {
      const user = userEvent.setup();
      const searchInput = screen.getByPlaceholderText('Search projects...');
      await user.type(searchInput, 'Beta');

      const table = screen.getByRole('table', { name: 'Projects Overview' });
      const rows = within(table).getAllByRole('row');
      expect(rows).toHaveLength(2); // Header + 1 data row
      expect(within(rows[1]).getByText('Project Beta')).toBeInTheDocument();
    });

    it('should show "no results" message when search returns no matches', async () => {
      const user = userEvent.setup();
      const searchInput = screen.getByPlaceholderText('Search projects...');
      await user.type(searchInput, 'Nonexistent Project');

      expect(screen.getByText('No projects found')).toBeInTheDocument();
    });
  });

  describe('Date Range Selection', () => {
    beforeEach(async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });
    });

    it('should update charts when date range is changed', async () => {
      const user = userEvent.setup();
      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');
      const applyButton = screen.getByRole('button', { name: 'Apply' });

      await user.clear(startDateInput);
      await user.type(startDateInput, '2023-01-01');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2023-03-31');
      await user.click(applyButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          params: {
            startDate: '2023-01-01',
            endDate: '2023-03-31',
          },
        }));
      });
    });

    it('should show validation error for invalid date range', async () => {
      const user = userEvent.setup();
      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');
      const applyButton = screen.getByRole('button', { name: 'Apply' });

      await user.clear(startDateInput);
      await user.type(startDateInput, '2023-03-01');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2023-01-31');
      await user.click(applyButton);

      expect(await screen.findByText('End date must be after start date')).toBeInTheDocument();
      expect(axios.get).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        params: expect.objectContaining({
          startDate: expect.anything(),
          endDate: expect.anything(),
        }),
      }));
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search projects...')).toHaveAriaLabel('Search projects');
      expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
      expect(screen.getByRole('table', { name: 'Projects Overview' })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      // Tab through focusable elements
      const searchInput = screen.getByPlaceholderText('Search projects...');
      const filterSelect = screen.getByLabelText('Filter by status');
      const applyButton = screen.getByRole('button', { name: 'Apply' });

      await user.tab();
      expect(searchInput).toHaveFocus();

      await user.tab();
      expect(filterSelect).toHaveFocus();

      await user.tab();
      expect(applyButton).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      const heading = screen.getByRole('heading', { name: 'Dashboard Overview' });
      const cardTitle = screen.getByText('Total Users');
      const cardValue = screen.getByText('150');

      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      expect(cardTitle).toHaveStyle('color: rgba(0, 0, 0, 0.6)');
      expect(cardValue).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile-friendly layout on small screens', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      // Check for stacked layout indicators
      const summaryCards = screen.getAllByTestId('summary-card');
      const firstCard = summaryCards[0];
      expect(firstCard).toHaveStyle('width: 100%');

      // Check for mobile table headers
      expect(screen.getByText('Project Name')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should export data as CSV when export button is clicked', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      const mockUrl = 'mock-url';
      jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: 'Export as CSV' });
      await user.click(exportButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/export'), {
          responseType: 'blob',
          headers: {
            Authorization: 'Bearer test-token',
          },
        });
      });
    });

    it('should handle export error gracefully', async () => {
      const user = userEvent.setup();
      (axios.get as jest.Mock).mockRejectedValue(new Error('Export failed'));

      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: 'Export as CSV' });
      await user.click(exportButton);

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

  describe('User Role Based Access', () => {
    it('should show admin-specific controls for admin users', async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'Export as CSV' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create New Project' })).toBeInTheDocument();
    });

    it('should hide admin controls for non-admin users', async () => {
      const nonAdminContext = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          role: 'user',
        },
      };

      render(
        <AuthContext.Provider value={nonAdminContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <MemoryRouter>
              <Dashboard />
            </MemoryRouter>
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: 'Export as CSV' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Create New Project' })).not.toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

jest.mock('axios');
jest.mock('react-apexcharts', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-chart"></div>,
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
        <MemoryRouter>
          <Routes>
            <Route path="/" element={ui} />
            <Route path="/details/:id" element={<div>Details Page</div>} />
          </Routes>
        </MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

describe('Dashboard Component', () => {
  const mockDashboardData = {
    summary: {
      totalUsers: 150,
      activeProjects: 12,
      pendingTasks: 5,
      revenue: 45000,
    },
    projects: [
      { id: '1', name: 'Project Alpha', status: 'active', progress: 75, budget: 50000 },
      { id: '2', name: 'Project Beta', status: 'pending', progress: 30, budget: 30000 },
      { id: '3', name: 'Project Gamma', status: 'completed', progress: 100, budget: 25000 },
    ],
    recentActivity: [
      { id: '1', type: 'project_update', message: 'Project Alpha updated', timestamp: '2023-05-15T10:00:00Z' },
      { id: '2', type: 'new_user', message: 'New user registered', timestamp: '2023-05-14T15:30:00Z' },
    ],
    charts: {
      projectStatus: {
        active: 4,
        pending: 2,
        completed: 6,
      },
      monthlyRevenue: [
        { month: 'Jan', value: 5000 },
        { month: 'Feb', value: 7000 },
        { month: 'Mar', value: 6500 },
      ],
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

      expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Overview')).not.toBeInTheDocument();
    });

    it('should render dashboard with data after successful fetch', async () => {
      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument(); // Total Users
        expect(screen.getByText('12')).toBeInTheDocument(); // Active Projects
        expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
      });
    });

    it('should handle fetch error gracefully', async () => {
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
  });

  describe('Data Display and Interaction', () => {
    beforeEach(async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });
    });

    it('should display all summary cards with correct values', () => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Pending Tasks')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      expect(screen.getByText('$45,000')).toBeInTheDocument();
    });

    it('should display projects table with correct data', () => {
      const table = screen.getByRole('table', { name: 'Projects Overview' });
      const rows = within(table).getAllByRole('row');

      // Header row + 3 data rows
      expect(rows).toHaveLength(4);

      expect(within(rows[1]).getByText('Project Alpha')).toBeInTheDocument();
      expect(within(rows[1]).getByText('active')).toBeInTheDocument();
      expect(within(rows[1]).getByText('75%')).toBeInTheDocument();

      expect(within(rows[2]).getByText('Project Beta')).toBeInTheDocument();
      expect(within(rows[2]).getByText('pending')).toBeInTheDocument();
    });

    it('should display recent activity items', () => {
      const activityItems = screen.getAllByRole('listitem');
      expect(activityItems).toHaveLength(2);
      expect(within(activityItems[0]).getByText('Project Alpha updated')).toBeInTheDocument();
      expect(within(activityItems[1]).getByText('New user registered')).toBeInTheDocument();
    });

    it('should navigate to project details when project row is clicked', async () => {
      const user = userEvent.setup();
      const table = screen.getByRole('table', { name: 'Projects Overview' });
      const firstRow = within(table).getAllByRole('row')[1];

      await user.click(firstRow);
      expect(mockNavigate).toHaveBeenCalledWith('/details/1');
    });
  });

  describe('Filtering and Search Functionality', () => {
    beforeEach(async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });
    });

    it('should filter projects by status', async () => {
      const user = userEvent.setup();
      const filterSelect = screen.getByLabelText('Filter by status');
      await user.selectOptions(filterSelect, 'completed');

      // Should only show Project Gamma
      const table = screen.getByRole('table', { name: 'Projects Overview' });
      const rows = within(table).getAllByRole('row');
      expect(rows).toHaveLength(2); // Header + 1 data row
      expect(within(rows[1]).getByText('Project Gamma')).toBeInTheDocument();
    });

    it('should search projects by name', async () => {
      const user = userEvent.setup();
      const searchInput = screen.getByPlaceholderText('Search projects...');
      await user.type(searchInput, 'Beta');

      const table = screen.getByRole('table', { name: 'Projects Overview' });
      const rows = within(table).getAllByRole('row');
      expect(rows).toHaveLength(2); // Header + 1 data row
      expect(within(rows[1]).getByText('Project Beta')).toBeInTheDocument();
    });

    it('should show "no results" message when search returns no matches', async () => {
      const user = userEvent.setup();
      const searchInput = screen.getByPlaceholderText('Search projects...');
      await user.type(searchInput, 'Nonexistent Project');

      expect(screen.getByText('No projects found')).toBeInTheDocument();
    });
  });

  describe('Date Range Selection', () => {
    beforeEach(async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });
    });

    it('should update charts when date range is changed', async () => {
      const user = userEvent.setup();
      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');
      const applyButton = screen.getByRole('button', { name: 'Apply' });

      await user.clear(startDateInput);
      await user.type(startDateInput, '2023-01-01');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2023-03-31');
      await user.click(applyButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          params: {
            startDate: '2023-01-01',
            endDate: '2023-03-31',
          },
        }));
      });
    });

    it('should show validation error for invalid date range', async () => {
      const user = userEvent.setup();
      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');
      const applyButton = screen.getByRole('button', { name: 'Apply' });

      await user.clear(startDateInput);
      await user.type(startDateInput, '2023-03-01');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2023-01-31');
      await user.click(applyButton);

      expect(await screen.findByText('End date must be after start date')).toBeInTheDocument();
      expect(axios.get).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        params: expect.objectContaining({
          startDate: expect.anything(),
          endDate: expect.anything(),
        }),
      }));
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search projects...')).toHaveAriaLabel('Search projects');
      expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
      expect(screen.getByRole('table', { name: 'Projects Overview' })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      // Tab through focusable elements
      const searchInput = screen.getByPlaceholderText('Search projects...');
      const filterSelect = screen.getByLabelText('Filter by status');
      const applyButton = screen.getByRole('button', { name: 'Apply' });

      await user.tab();
      expect(searchInput).toHaveFocus();

      await user.tab();
      expect(filterSelect).toHaveFocus();

      await user.tab();
      expect(applyButton).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      const heading = screen.getByRole('heading', { name: 'Dashboard Overview' });
      const cardTitle = screen.getByText('Total Users');
      const cardValue = screen.getByText('150');

      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      expect(cardTitle).toHaveStyle('color: rgba(0, 0, 0, 0.6)');
      expect(cardValue).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile-friendly layout on small screens', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      // Check for stacked layout indicators
      const summaryCards = screen.getAllByTestId('summary-card');
      const firstCard = summaryCards[0];
      expect(firstCard).toHaveStyle('width: 100%');

      // Check for mobile table headers
      expect(screen.getByText('Project Name')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should export data as CSV when export button is clicked', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      const mockUrl = 'mock-url';
      jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: 'Export as CSV' });
      await user.click(exportButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/export'), {
          responseType: 'blob',
          headers: {
            Authorization: 'Bearer test-token',
          },
        });
      });
    });

    it('should handle export error gracefully', async () => {
      const user = userEvent.setup();
      (axios.get as jest.Mock).mockRejectedValue(new Error('Export failed'));

      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: 'Export as CSV' });
      await user.click(exportButton);

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

  describe('User Role Based Access', () => {
    it('should show admin-specific controls for admin users', async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'Export as CSV' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create New Project' })).toBeInTheDocument();
    });

    it('should hide admin controls for non-admin users', async () => {
      const nonAdminContext = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          role: 'user',
        },
      };

      render(
        <AuthContext.Provider value={nonAdminContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <MemoryRouter>
              <Dashboard />
            </MemoryRouter>
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: 'Export as CSV' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Create New Project' })).not.toBeInTheDocument();
    });
  });
});