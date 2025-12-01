import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import CoreFunctionality from './CoreFunctionality';
import { AuthContext } from '../../context/AuthContext';
import { FeatureFlagsContext } from '../../context/FeatureFlagsContext';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('react-toastify', () => ({
  ...jest.requireActual('react-toastify'),
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithProviders = (
  ui: React.ReactElement,
  {
    authValue = { user: { id: '123', name: 'Test User', email: 'test@example.com' }, isAuthenticated: true },
    featureFlagsValue = { isNewDashboardEnabled: true, isAdvancedAnalyticsEnabled: false },
    route = '/dashboard',
  } = {}
) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={authValue}>
        <FeatureFlagsContext.Provider value={featureFlagsValue}>
          <Routes>
            <Route path="/dashboard" element={ui} />
            <Route path="/dashboard/:id" element={ui} />
          </Routes>
          <ToastContainer />
        </FeatureFlagsContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('CoreFunctionality Component', () => {
  const mockData = {
    id: '1',
    name: 'Test Project',
    status: 'active',
    createdAt: '2023-01-01T00:00:00Z',
    metrics: {
      users: 100,
      revenue: 5000,
      conversionRate: 0.75,
    },
  };

  const mockErrorResponse = {
    response: {
      data: {
        message: 'Server error occurred',
      },
      status: 500,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Test Project')).not.toBeInTheDocument();
    });

    it('should render error state when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
        expect(screen.getByText(/server error occurred/i)).toBeInTheDocument();
      });
    });

    it('should render empty state when no data is available', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
        expect(screen.getByText(/create your first project/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Display and Interaction', () => {
    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
    });

    it('should render project data correctly after successful fetch', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('100 users')).toBeInTheDocument();
        expect(screen.getByText('$5,000')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
    });

    it('should allow sorting by different columns', async () => {
      const mockSortedData = [
        { ...mockData, name: 'Z Project' },
        { ...mockData, name: 'A Project' },
      ];
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: mockSortedData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Z Project')).toBeInTheDocument();
      });

      const nameHeader = screen.getByText(/name/i);
      fireEvent.click(nameHeader);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          params: { sortBy: 'name', sortOrder: 'asc' }
        }));
      });
    });

    it('should filter projects based on search input', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText(/no projects match/i)).toBeInTheDocument();
      });
    });

    it('should handle pagination correctly', async () => {
      const mockPaginatedData = {
        data: Array(15).fill(mockData).map((item, i) => ({ ...item, id: i.toString() })),
        total: 25,
        page: 1,
        limit: 10,
      };
      (axios.get as jest.Mock).mockResolvedValue({ data: mockPaginatedData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/showing 1-10 of 25/i)).toBeInTheDocument();
      });

      const nextPageButton = screen.getByLabelText(/next page/i);
      fireEvent.click(nextPageButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          params: { page: 2 }
        }));
      });
    });
  });

  describe('Project Actions', () => {
    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
    });

    it('should open project details modal when clicking on a project', async () => {
      renderWithProviders(<CoreFunctionality />, { route: '/dashboard' });

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Test Project'));

      await waitFor(() => {
        expect(screen.getByTestId('project-details-modal')).toBeInTheDocument();
        expect(screen.getByText('Project Details')).toBeInTheDocument();
      });
    });

    it('should navigate to project edit page when edit button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit project/i);
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/1/edit');
      });
    });

    it('should delete project when delete button is clicked and confirmed', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});
      window.confirm = jest.fn(() => true);

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith('/api/projects/1');
        expect(screen.queryByText('Test Project')).not.toBeInTheDocument();
      });
    });

    it('should show error when project deletion fails', async () => {
      (axios.delete as jest.Mock).mockRejectedValue(mockErrorResponse);
      window.confirm = jest.fn(() => true);

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete project/i)).toBeInTheDocument();
      });
    });
  });

  describe('Create Project Flow', () => {
    it('should open create project modal when clicking create button', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });
      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('create-project-modal')).toBeInTheDocument();
        expect(screen.getByText('Create New Project')).toBeInTheDocument();
      });
    });

    it('should create new project when form is submitted with valid data', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });
      (axios.post as jest.Mock).mockResolvedValue({ data: { ...mockData, id: '2', name: 'New Project' } });

      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(createButton);

      const nameInput = screen.getByLabelText(/project name/i);
      const submitButton = screen.getByRole('button', { name: /create/i });

      await userEvent.type(nameInput, 'New Project');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/projects', {
          name: 'New Project',
          status: 'active',
        });
        expect(screen.getByText('New Project')).toBeInTheDocument();
      });
    });

    it('should show validation errors when form is submitted with invalid data', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(createButton);

      const submitButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/project name is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper aria labels for interactive elements', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText(/sort by name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/filter projects/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/pagination navigation/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/edit project test project/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/delete project test project/i)).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create project/i });
      createButton.focus();
      fireEvent.keyDown(createButton, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByTestId('create-project-modal')).toBeInTheDocument();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
      const { container } = renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const projectName = screen.getByText('Test Project');
        expect(projectName).toHaveStyle('color: rgba(0, 0, 0, 0.87)');

        const statusBadge = screen.getByText('Active');
        expect(statusBadge).toHaveStyle('color: rgb(255, 255, 255)');
      });
    });
  });

  describe('Feature Flags', () => {
    it('should show advanced analytics when feature flag is enabled', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />, {
        featureFlagsValue: { isNewDashboardEnabled: true, isAdvancedAnalyticsEnabled: true }
      });

      await waitFor(() => {
        expect(screen.getByText(/advanced analytics/i)).toBeInTheDocument();
        expect(screen.getByText(/conversion funnel/i)).toBeInTheDocument();
      });
    });

    it('should hide advanced analytics when feature flag is disabled', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />, {
        featureFlagsValue: { isNewDashboardEnabled: true, isAdvancedAnalyticsEnabled: false }
      });

      await waitFor(() => {
        expect(screen.queryByText(/advanced analytics/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries and Recovery', () => {
    it('should show error boundary when component crashes', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const CrashingComponent = () => {
        throw new Error('Test error');
        return null;
      };

      renderWithProviders(<CrashingComponent />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should recover from error when retry button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce({ data: [mockData] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });
  });

  describe('Route Handling', () => {
    it('should redirect to login when user is not authenticated', async () => {
      renderWithProviders(<CoreFunctionality />, {
        authValue: { user: null, isAuthenticated: false }
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should handle project details route correctly', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: [mockData] })
        .mockResolvedValueOnce({ data: mockData });

      renderWithProviders(<CoreFunctionality />, { route: '/dashboard/1' });

      await waitFor(() => {
        expect(screen.getByTestId('project-details-modal')).toBeInTheDocument();
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import CoreFunctionality from './CoreFunctionality';
import { AuthContext } from '../../context/AuthContext';
import { FeatureFlagsContext } from '../../context/FeatureFlagsContext';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('react-toastify', () => ({
  ...jest.requireActual('react-toastify'),
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithProviders = (
  ui: React.ReactElement,
  {
    authValue = { user: { id: '123', name: 'Test User', email: 'test@example.com' }, isAuthenticated: true },
    featureFlagsValue = { isNewDashboardEnabled: true, isAdvancedAnalyticsEnabled: false },
    route = '/dashboard',
  } = {}
) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={authValue}>
        <FeatureFlagsContext.Provider value={featureFlagsValue}>
          <Routes>
            <Route path="/dashboard" element={ui} />
            <Route path="/dashboard/:id" element={ui} />
          </Routes>
          <ToastContainer />
        </FeatureFlagsContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('CoreFunctionality Component', () => {
  const mockData = {
    id: '1',
    name: 'Test Project',
    status: 'active',
    createdAt: '2023-01-01T00:00:00Z',
    metrics: {
      users: 100,
      revenue: 5000,
      conversionRate: 0.75,
    },
  };

  const mockErrorResponse = {
    response: {
      data: {
        message: 'Server error occurred',
      },
      status: 500,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Test Project')).not.toBeInTheDocument();
    });

    it('should render error state when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
        expect(screen.getByText(/server error occurred/i)).toBeInTheDocument();
      });
    });

    it('should render empty state when no data is available', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
        expect(screen.getByText(/create your first project/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Display and Interaction', () => {
    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
    });

    it('should render project data correctly after successful fetch', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('100 users')).toBeInTheDocument();
        expect(screen.getByText('$5,000')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
    });

    it('should allow sorting by different columns', async () => {
      const mockSortedData = [
        { ...mockData, name: 'Z Project' },
        { ...mockData, name: 'A Project' },
      ];
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: mockSortedData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Z Project')).toBeInTheDocument();
      });

      const nameHeader = screen.getByText(/name/i);
      fireEvent.click(nameHeader);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          params: { sortBy: 'name', sortOrder: 'asc' }
        }));
      });
    });

    it('should filter projects based on search input', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText(/no projects match/i)).toBeInTheDocument();
      });
    });

    it('should handle pagination correctly', async () => {
      const mockPaginatedData = {
        data: Array(15).fill(mockData).map((item, i) => ({ ...item, id: i.toString() })),
        total: 25,
        page: 1,
        limit: 10,
      };
      (axios.get as jest.Mock).mockResolvedValue({ data: mockPaginatedData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/showing 1-10 of 25/i)).toBeInTheDocument();
      });

      const nextPageButton = screen.getByLabelText(/next page/i);
      fireEvent.click(nextPageButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          params: { page: 2 }
        }));
      });
    });
  });

  describe('Project Actions', () => {
    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
    });

    it('should open project details modal when clicking on a project', async () => {
      renderWithProviders(<CoreFunctionality />, { route: '/dashboard' });

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Test Project'));

      await waitFor(() => {
        expect(screen.getByTestId('project-details-modal')).toBeInTheDocument();
        expect(screen.getByText('Project Details')).toBeInTheDocument();
      });
    });

    it('should navigate to project edit page when edit button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit project/i);
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/1/edit');
      });
    });

    it('should delete project when delete button is clicked and confirmed', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});
      window.confirm = jest.fn(() => true);

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith('/api/projects/1');
        expect(screen.queryByText('Test Project')).not.toBeInTheDocument();
      });
    });

    it('should show error when project deletion fails', async () => {
      (axios.delete as jest.Mock).mockRejectedValue(mockErrorResponse);
      window.confirm = jest.fn(() => true);

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete project/i)).toBeInTheDocument();
      });
    });
  });

  describe('Create Project Flow', () => {
    it('should open create project modal when clicking create button', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });
      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('create-project-modal')).toBeInTheDocument();
        expect(screen.getByText('Create New Project')).toBeInTheDocument();
      });
    });

    it('should create new project when form is submitted with valid data', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });
      (axios.post as jest.Mock).mockResolvedValue({ data: { ...mockData, id: '2', name: 'New Project' } });

      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(createButton);

      const nameInput = screen.getByLabelText(/project name/i);
      const submitButton = screen.getByRole('button', { name: /create/i });

      await userEvent.type(nameInput, 'New Project');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/projects', {
          name: 'New Project',
          status: 'active',
        });
        expect(screen.getByText('New Project')).toBeInTheDocument();
      });
    });

    it('should show validation errors when form is submitted with invalid data', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create project/i });
      fireEvent.click(createButton);

      const submitButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/project name is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper aria labels for interactive elements', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText(/sort by name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/filter projects/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/pagination navigation/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/edit project test project/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/delete project test project/i)).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create project/i });
      createButton.focus();
      fireEvent.keyDown(createButton, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByTestId('create-project-modal')).toBeInTheDocument();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
      const { container } = renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const projectName = screen.getByText('Test Project');
        expect(projectName).toHaveStyle('color: rgba(0, 0, 0, 0.87)');

        const statusBadge = screen.getByText('Active');
        expect(statusBadge).toHaveStyle('color: rgb(255, 255, 255)');
      });
    });
  });

  describe('Feature Flags', () => {
    it('should show advanced analytics when feature flag is enabled', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />, {
        featureFlagsValue: { isNewDashboardEnabled: true, isAdvancedAnalyticsEnabled: true }
      });

      await waitFor(() => {
        expect(screen.getByText(/advanced analytics/i)).toBeInTheDocument();
        expect(screen.getByText(/conversion funnel/i)).toBeInTheDocument();
      });
    });

    it('should hide advanced analytics when feature flag is disabled', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />, {
        featureFlagsValue: { isNewDashboardEnabled: true, isAdvancedAnalyticsEnabled: false }
      });

      await waitFor(() => {
        expect(screen.queryByText(/advanced analytics/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries and Recovery', () => {
    it('should show error boundary when component crashes', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const CrashingComponent = () => {
        throw new Error('Test error');
        return null;
      };

      renderWithProviders(<CrashingComponent />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should recover from error when retry button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce({ data: [mockData] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });
  });

  describe('Route Handling', () => {
    it('should redirect to login when user is not authenticated', async () => {
      renderWithProviders(<CoreFunctionality />, {
        authValue: { user: null, isAuthenticated: false }
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should handle project details route correctly', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: [mockData] })
        .mockResolvedValueOnce({ data: mockData });

      renderWithProviders(<CoreFunctionality />, { route: '/dashboard/1' });

      await waitFor(() => {
        expect(screen.getByTestId('project-details-modal')).toBeInTheDocument();
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });
  });
});