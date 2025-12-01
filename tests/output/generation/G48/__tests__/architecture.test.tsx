import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DesignArchitecture from './DesignArchitecture';
import { ArchitectureContext } from '../../context/ArchitectureContext';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('../../hooks/useLocalStorage', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockArchitectureData = {
  projects: [
    {
      id: '1',
      name: 'Modern Villa',
      status: 'active',
      lastModified: '2023-05-15',
      blueprints: 12,
      collaborators: 3,
    },
    {
      id: '2',
      name: 'Urban Office',
      status: 'draft',
      lastModified: '2023-04-20',
      blueprints: 8,
      collaborators: 5,
    },
  ],
  materials: [
    { id: '1', name: 'Concrete', type: 'structural', cost: 50 },
    { id: '2', name: 'Glass', type: 'facade', cost: 75 },
  ],
  loading: false,
  error: null,
};

const mockAuthContext = {
  user: {
    id: 'user123',
    name: 'Test User',
    role: 'architect',
    permissions: ['create', 'edit', 'delete'],
  },
  isAuthenticated: true,
};

const mockNotificationContext = {
  showNotification: jest.fn(),
};

const renderWithProviders = (
  ui,
  {
    architectureValue = mockArchitectureData,
    authValue = mockAuthContext,
    notificationValue = mockNotificationContext,
    route = '/',
  } = {}
) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={authValue}>
        <ArchitectureContext.Provider value={architectureValue}>
          <NotificationContext.Provider value={notificationValue}>
            <Routes>
              <Route path="/" element={ui} />
              <Route path="/projects/:id" element={<div>Project Detail</div>} />
              <Route path="/materials" element={<div>Materials Page</div>} />
            </Routes>
          </NotificationContext.Provider>
        </ArchitectureContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state initially when data is loading', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: { ...mockArchitectureData, loading: true },
      });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture data/i)).toBeInTheDocument();
    });

    it('should render error message when there is an error', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          loading: false,
          error: 'Failed to fetch data',
        },
      });

      expect(screen.getByText(/failed to fetch data/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render the main sections when data is loaded successfully', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByText(/design architecture dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/recent projects/i)).toBeInTheDocument();
      expect(screen.getByText(/material library/i)).toBeInTheDocument();
      expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
    });
  });

  describe('Projects Section', () => {
    it('should display all projects in a responsive grid', () => {
      renderWithProviders(<DesignArchitecture />);

      const projects = screen.getAllByRole('article');
      expect(projects).toHaveLength(2);

      expect(within(projects[0]).getByText(/modern villa/i)).toBeInTheDocument();
      expect(within(projects[0]).getByText(/active/i)).toBeInTheDocument();
      expect(within(projects[0]).getByText(/12 blueprints/i)).toBeInTheDocument();

      expect(within(projects[1]).getByText(/urban office/i)).toBeInTheDocument();
      expect(within(projects[1]).getByText(/draft/i)).toBeInTheDocument();
    });

    it('should navigate to project detail when a project card is clicked', async () => {
      renderWithProviders(<DesignArchitecture />);

      const projectCards = screen.getAllByRole('article');
      await userEvent.click(projectCards[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/projects/1');
    });

    it('should show "No projects found" message when there are no projects', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          projects: [],
        },
      });

      expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
    });

    it('should filter projects based on search input', async () => {
      renderWithProviders(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      await userEvent.type(searchInput, 'villa');

      expect(screen.getByText(/modern villa/i)).toBeInTheDocument();
      expect(screen.queryByText(/urban office/i)).not.toBeInTheDocument();
    });

    it('should filter projects by status', async () => {
      renderWithProviders(<DesignArchitecture />);

      const statusFilter = screen.getByLabelText(/filter by status/i);
      await userEvent.selectOptions(statusFilter, 'draft');

      expect(screen.queryByText(/modern villa/i)).not.toBeInTheDocument();
      expect(screen.getByText(/urban office/i)).toBeInTheDocument();
    });
  });

  describe('Materials Section', () => {
    it('should display materials in a table format', () => {
      renderWithProviders(<DesignArchitecture />);

      const materialRows = screen.getAllByRole('row');
      expect(materialRows).toHaveLength(3); // header + 2 materials

      expect(screen.getByText(/concrete/i)).toBeInTheDocument();
      expect(screen.getByText(/glass/i)).toBeInTheDocument();
      expect(screen.getByText(/structural/i)).toBeInTheDocument();
      expect(screen.getByText(/\$50/i)).toBeInTheDocument();
    });

    it('should navigate to materials page when "View All" is clicked', async () => {
      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /view all materials/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/materials');
    });

    it('should show "No materials found" when materials list is empty', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          materials: [],
        },
      });

      expect(screen.getByText(/no materials found/i)).toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    it('should open the new project modal when "Create New Project" is clicked', async () => {
      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /create new project/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/create new architecture project/i)).toBeInTheDocument();
    });

    it('should submit new project form successfully', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { id: '3', name: 'New Project' } });

      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /create new project/i }));

      await userEvent.type(screen.getByLabelText(/project name/i), 'New Project');
      await userEvent.type(screen.getByLabelText(/description/i), 'Test description');
      await userEvent.selectOptions(screen.getByLabelText(/project type/i), 'residential');
      await userEvent.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(expect.any(String), {
          name: 'New Project',
          description: 'Test description',
          type: 'residential',
          createdBy: 'user123',
        });
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Project created successfully',
          })
        );
      });
    });

    it('should show error when project creation fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Creation failed'));

      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /create new project/i }));
      await userEvent.type(screen.getByLabelText(/project name/i), 'Failed Project');
      await userEvent.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to create project: Creation failed',
          })
        );
      });
    });

    it('should validate form fields before submission', async () => {
      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /create new project/i }));
      await userEvent.click(screen.getByRole('button', { name: /create project/i }));

      expect(await screen.findByText(/project name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /design architecture dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /recent projects/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /material library/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /quick actions/i })).toBeInTheDocument();

      const projectCards = screen.getAllByRole('article');
      expect(projectCards[0]).toHaveAccessibleName(/modern villa project card/i);
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<DesignArchitecture />);

      // Tab through interactive elements
      await userEvent.tab();
      expect(screen.getByPlaceholderText(/search projects/i)).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText(/filter by status/i)).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /create new project/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      const { container } = renderWithProviders(<DesignArchitecture />);
      const heading = container.querySelector('h1');
      const textElements = container.querySelectorAll('p, span, td, th');

      // These are visual tests that would typically be handled by axe or similar tools
      // In a real test, you would use jest-axe for automated accessibility testing
      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      textElements.forEach(el => {
        expect(el).toHaveStyle(expect.stringMatching(/color: (rgba?\(\d+, \d+, \d+(, \d+)?\)|#[\da-f]{3,6})/i));
      });
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    it('should handle missing project data gracefully', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          projects: [
            {
              id: '1',
              // Missing name property
              status: 'active',
              lastModified: '2023-05-15',
            },
          ],
        },
      });

      expect(screen.getByText(/unnamed project/i)).toBeInTheDocument();
    });

    it('should handle API errors when fetching additional data', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /refresh data/i }));

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to refresh data: Network error',
          })
        );
      });
    });

    it('should disable actions for users without proper permissions', () => {
      renderWithProviders(<DesignArchitecture />, {
        authValue: {
          ...mockAuthContext,
          user: {
            ...mockAuthContext.user,
            permissions: [], // No permissions
          },
        },
      });

      expect(screen.getByRole('button', { name: /create new project/i })).toBeDisabled();
      expect(screen.getByText(/you don't have permission to create projects/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile viewports', () => {
      // Mock matchMedia for responsive tests
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 768px'),
        media: query,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));

      renderWithProviders(<DesignArchitecture />);

      // In mobile view, projects should stack vertically
      const projectCards = screen.getAllByRole('article');
      expect(projectCards[0]).toHaveStyle('width: 100%');
    });

    it('should show mobile-specific navigation elements', () => {
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 768px'),
        media: query,
      }));

      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
    });
  });

  describe('Data Export', () => {
    it('should allow exporting projects data as CSV', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      const mockUrl = 'blob:url';
      jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
      jest.spyOn(global, 'Blob').mockImplementation(() => mockBlob as unknown as Blob);

      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /export projects/i }));

      await waitFor(() => {
        expect(Blob).toHaveBeenCalled();
        expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      });
    });

    it('should show error when export fails', async () => {
      jest.spyOn(global, 'Blob').mockImplementation(() => {
        throw new Error('Blob error');
      });

      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /export projects/i }));

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to export data: Blob error',
          })
        );
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DesignArchitecture from './DesignArchitecture';
import { ArchitectureContext } from '../../context/ArchitectureContext';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('../../hooks/useLocalStorage', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockArchitectureData = {
  projects: [
    {
      id: '1',
      name: 'Modern Villa',
      status: 'active',
      lastModified: '2023-05-15',
      blueprints: 12,
      collaborators: 3,
    },
    {
      id: '2',
      name: 'Urban Office',
      status: 'draft',
      lastModified: '2023-04-20',
      blueprints: 8,
      collaborators: 5,
    },
  ],
  materials: [
    { id: '1', name: 'Concrete', type: 'structural', cost: 50 },
    { id: '2', name: 'Glass', type: 'facade', cost: 75 },
  ],
  loading: false,
  error: null,
};

const mockAuthContext = {
  user: {
    id: 'user123',
    name: 'Test User',
    role: 'architect',
    permissions: ['create', 'edit', 'delete'],
  },
  isAuthenticated: true,
};

const mockNotificationContext = {
  showNotification: jest.fn(),
};

const renderWithProviders = (
  ui,
  {
    architectureValue = mockArchitectureData,
    authValue = mockAuthContext,
    notificationValue = mockNotificationContext,
    route = '/',
  } = {}
) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={authValue}>
        <ArchitectureContext.Provider value={architectureValue}>
          <NotificationContext.Provider value={notificationValue}>
            <Routes>
              <Route path="/" element={ui} />
              <Route path="/projects/:id" element={<div>Project Detail</div>} />
              <Route path="/materials" element={<div>Materials Page</div>} />
            </Routes>
          </NotificationContext.Provider>
        </ArchitectureContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state initially when data is loading', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: { ...mockArchitectureData, loading: true },
      });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture data/i)).toBeInTheDocument();
    });

    it('should render error message when there is an error', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          loading: false,
          error: 'Failed to fetch data',
        },
      });

      expect(screen.getByText(/failed to fetch data/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render the main sections when data is loaded successfully', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByText(/design architecture dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/recent projects/i)).toBeInTheDocument();
      expect(screen.getByText(/material library/i)).toBeInTheDocument();
      expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
    });
  });

  describe('Projects Section', () => {
    it('should display all projects in a responsive grid', () => {
      renderWithProviders(<DesignArchitecture />);

      const projects = screen.getAllByRole('article');
      expect(projects).toHaveLength(2);

      expect(within(projects[0]).getByText(/modern villa/i)).toBeInTheDocument();
      expect(within(projects[0]).getByText(/active/i)).toBeInTheDocument();
      expect(within(projects[0]).getByText(/12 blueprints/i)).toBeInTheDocument();

      expect(within(projects[1]).getByText(/urban office/i)).toBeInTheDocument();
      expect(within(projects[1]).getByText(/draft/i)).toBeInTheDocument();
    });

    it('should navigate to project detail when a project card is clicked', async () => {
      renderWithProviders(<DesignArchitecture />);

      const projectCards = screen.getAllByRole('article');
      await userEvent.click(projectCards[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/projects/1');
    });

    it('should show "No projects found" message when there are no projects', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          projects: [],
        },
      });

      expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
    });

    it('should filter projects based on search input', async () => {
      renderWithProviders(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      await userEvent.type(searchInput, 'villa');

      expect(screen.getByText(/modern villa/i)).toBeInTheDocument();
      expect(screen.queryByText(/urban office/i)).not.toBeInTheDocument();
    });

    it('should filter projects by status', async () => {
      renderWithProviders(<DesignArchitecture />);

      const statusFilter = screen.getByLabelText(/filter by status/i);
      await userEvent.selectOptions(statusFilter, 'draft');

      expect(screen.queryByText(/modern villa/i)).not.toBeInTheDocument();
      expect(screen.getByText(/urban office/i)).toBeInTheDocument();
    });
  });

  describe('Materials Section', () => {
    it('should display materials in a table format', () => {
      renderWithProviders(<DesignArchitecture />);

      const materialRows = screen.getAllByRole('row');
      expect(materialRows).toHaveLength(3); // header + 2 materials

      expect(screen.getByText(/concrete/i)).toBeInTheDocument();
      expect(screen.getByText(/glass/i)).toBeInTheDocument();
      expect(screen.getByText(/structural/i)).toBeInTheDocument();
      expect(screen.getByText(/\$50/i)).toBeInTheDocument();
    });

    it('should navigate to materials page when "View All" is clicked', async () => {
      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /view all materials/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/materials');
    });

    it('should show "No materials found" when materials list is empty', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          materials: [],
        },
      });

      expect(screen.getByText(/no materials found/i)).toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    it('should open the new project modal when "Create New Project" is clicked', async () => {
      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /create new project/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/create new architecture project/i)).toBeInTheDocument();
    });

    it('should submit new project form successfully', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { id: '3', name: 'New Project' } });

      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /create new project/i }));

      await userEvent.type(screen.getByLabelText(/project name/i), 'New Project');
      await userEvent.type(screen.getByLabelText(/description/i), 'Test description');
      await userEvent.selectOptions(screen.getByLabelText(/project type/i), 'residential');
      await userEvent.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(expect.any(String), {
          name: 'New Project',
          description: 'Test description',
          type: 'residential',
          createdBy: 'user123',
        });
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Project created successfully',
          })
        );
      });
    });

    it('should show error when project creation fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Creation failed'));

      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /create new project/i }));
      await userEvent.type(screen.getByLabelText(/project name/i), 'Failed Project');
      await userEvent.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to create project: Creation failed',
          })
        );
      });
    });

    it('should validate form fields before submission', async () => {
      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /create new project/i }));
      await userEvent.click(screen.getByRole('button', { name: /create project/i }));

      expect(await screen.findByText(/project name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /design architecture dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /recent projects/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /material library/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /quick actions/i })).toBeInTheDocument();

      const projectCards = screen.getAllByRole('article');
      expect(projectCards[0]).toHaveAccessibleName(/modern villa project card/i);
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<DesignArchitecture />);

      // Tab through interactive elements
      await userEvent.tab();
      expect(screen.getByPlaceholderText(/search projects/i)).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText(/filter by status/i)).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /create new project/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      const { container } = renderWithProviders(<DesignArchitecture />);
      const heading = container.querySelector('h1');
      const textElements = container.querySelectorAll('p, span, td, th');

      // These are visual tests that would typically be handled by axe or similar tools
      // In a real test, you would use jest-axe for automated accessibility testing
      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      textElements.forEach(el => {
        expect(el).toHaveStyle(expect.stringMatching(/color: (rgba?\(\d+, \d+, \d+(, \d+)?\)|#[\da-f]{3,6})/i));
      });
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    it('should handle missing project data gracefully', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          projects: [
            {
              id: '1',
              // Missing name property
              status: 'active',
              lastModified: '2023-05-15',
            },
          ],
        },
      });

      expect(screen.getByText(/unnamed project/i)).toBeInTheDocument();
    });

    it('should handle API errors when fetching additional data', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /refresh data/i }));

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to refresh data: Network error',
          })
        );
      });
    });

    it('should disable actions for users without proper permissions', () => {
      renderWithProviders(<DesignArchitecture />, {
        authValue: {
          ...mockAuthContext,
          user: {
            ...mockAuthContext.user,
            permissions: [], // No permissions
          },
        },
      });

      expect(screen.getByRole('button', { name: /create new project/i })).toBeDisabled();
      expect(screen.getByText(/you don't have permission to create projects/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile viewports', () => {
      // Mock matchMedia for responsive tests
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 768px'),
        media: query,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));

      renderWithProviders(<DesignArchitecture />);

      // In mobile view, projects should stack vertically
      const projectCards = screen.getAllByRole('article');
      expect(projectCards[0]).toHaveStyle('width: 100%');
    });

    it('should show mobile-specific navigation elements', () => {
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 768px'),
        media: query,
      }));

      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
    });
  });

  describe('Data Export', () => {
    it('should allow exporting projects data as CSV', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      const mockUrl = 'blob:url';
      jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
      jest.spyOn(global, 'Blob').mockImplementation(() => mockBlob as unknown as Blob);

      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /export projects/i }));

      await waitFor(() => {
        expect(Blob).toHaveBeenCalled();
        expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      });
    });

    it('should show error when export fails', async () => {
      jest.spyOn(global, 'Blob').mockImplementation(() => {
        throw new Error('Blob error');
      });

      renderWithProviders(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /export projects/i }));

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to export data: Blob error',
          })
        );
      });
    });
  });
});