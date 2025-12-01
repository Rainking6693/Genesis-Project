import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DesignArchitecture from './DesignArchitecture';
import { ArchitectureContext } from '../../context/ArchitectureContext';
import { AuthContext } from '../../context/AuthContext';

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

const mockArchitectureData = {
  projects: [
    {
      id: '1',
      name: 'Modern Villa',
      status: 'active',
      lastUpdated: '2023-05-15',
      blueprints: 12,
      client: 'John Doe',
    },
    {
      id: '2',
      name: 'Urban Office',
      status: 'completed',
      lastUpdated: '2023-04-20',
      blueprints: 8,
      client: 'Acme Corp',
    },
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

const mockArchitectureContext = {
  ...mockArchitectureData,
  fetchProjects: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  setCurrentProject: jest.fn(),
};

const renderWithProviders = (
  ui: React.ReactElement,
  {
    architectureContext = mockArchitectureContext,
    authContext = mockAuthContext,
    route = '/',
  } = {}
) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={authContext}>
        <ArchitectureContext.Provider value={architectureContext}>
          <Routes>
            <Route path="/" element={ui} />
            <Route path="/projects/:id" element={<div>Project Detail</div>} />
          </Routes>
        </ArchitectureContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData.projects });
  });

  describe('Initial Render', () => {
    it('should render loading state initially when data is being fetched', () => {
      const loadingContext = {
        ...mockArchitectureContext,
        loading: true,
        projects: [],
      };
      renderWithProviders(<DesignArchitecture />, { architectureContext: loadingContext });

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByText('Modern Villa')).not.toBeInTheDocument();
    });

    it('should render error message when fetch fails', () => {
      const errorContext = {
        ...mockArchitectureContext,
        error: 'Failed to fetch projects',
        projects: [],
      };
      renderWithProviders(<DesignArchitecture />, { architectureContext: errorContext });

      expect(screen.getByText(/failed to load projects/i)).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch projects')).toBeInTheDocument();
    });

    it('should render project list when data is available', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByText('Modern Villa')).toBeInTheDocument();
      expect(screen.getByText('Urban Office')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });
  });

  describe('Project List Interactions', () => {
    it('should navigate to project detail when clicking on a project card', async () => {
      renderWithProviders(<DesignArchitecture />);

      const modernVillaCard = screen.getByText('Modern Villa').closest('article');
      if (modernVillaCard) {
        fireEvent.click(modernVillaCard);
      }

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/projects/1');
      });
    });

    it('should filter projects based on search input', async () => {
      renderWithProviders(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      await userEvent.type(searchInput, 'urban');

      expect(screen.getByText('Urban Office')).toBeInTheDocument();
      expect(screen.queryByText('Modern Villa')).not.toBeInTheDocument();
    });

    it('should filter projects by status', async () => {
      renderWithProviders(<DesignArchitecture />);

      const statusFilter = screen.getByLabelText(/filter by status/i);
      await userEvent.selectOptions(statusFilter, 'completed');

      expect(screen.getByText('Urban Office')).toBeInTheDocument();
      expect(screen.queryByText('Modern Villa')).not.toBeInTheDocument();
    });

    it('should sort projects by last updated date', async () => {
      renderWithProviders(<DesignArchitecture />);

      const sortButton = screen.getByLabelText(/sort by/i);
      await userEvent.selectOptions(sortButton, 'lastUpdated');

      const projectCards = screen.getAllByRole('article');
      const firstCard = within(projectCards[0]).getByText(/modern villa/i);
      expect(firstCard).toBeInTheDocument();
    });
  });

  describe('Project Management', () => {
    it('should open create project modal when clicking add button', async () => {
      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByLabelText(/add new project/i);
      await userEvent.click(addButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/create new project/i)).toBeInTheDocument();
    });

    it('should create a new project with valid form data', async () => {
      mockArchitectureContext.createProject.mockResolvedValue({
        id: '3',
        name: 'New Project',
        status: 'active',
        lastUpdated: new Date().toISOString(),
        blueprints: 0,
        client: 'New Client',
      });

      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByLabelText(/add new project/i);
      await userEvent.click(addButton);

      await userEvent.type(screen.getByLabelText(/project name/i), 'New Project');
      await userEvent.type(screen.getByLabelText(/client name/i), 'New Client');
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'active');

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockArchitectureContext.createProject).toHaveBeenCalledWith({
          name: 'New Project',
          client: 'New Client',
          status: 'active',
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should show validation errors when creating project with invalid data', async () => {
      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByLabelText(/add new project/i);
      await userEvent.click(addButton);

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await userEvent.click(submitButton);

      expect(await screen.findByText(/project name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/client name is required/i)).toBeInTheDocument();
    });

    it('should open edit modal when clicking edit button on a project', async () => {
      renderWithProviders(<DesignArchitecture />);

      const editButtons = screen.getAllByLabelText(/edit project/i);
      await userEvent.click(editButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/edit project/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Modern Villa')).toBeInTheDocument();
    });

    it('should update a project with valid form data', async () => {
      mockArchitectureContext.updateProject.mockResolvedValue({
        ...mockArchitectureData.projects[0],
        name: 'Updated Modern Villa',
      });

      renderWithProviders(<DesignArchitecture />);

      const editButtons = screen.getAllByLabelText(/edit project/i);
      await userEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/project name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Modern Villa');

      const submitButton = screen.getByRole('button', { name: /update project/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockArchitectureContext.updateProject).toHaveBeenCalledWith('1', {
          name: 'Updated Modern Villa',
          client: 'John Doe',
          status: 'active',
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should delete a project when confirmed', async () => {
      window.confirm = jest.fn(() => true);
      mockArchitectureContext.deleteProject.mockResolvedValue(true);

      renderWithProviders(<DesignArchitecture />);

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete Modern Villa?');
        expect(mockArchitectureContext.deleteProject).toHaveBeenCalledWith('1');
      });
    });

    it('should not delete a project when cancellation is confirmed', async () => {
      window.confirm = jest.fn(() => false);

      renderWithProviders(<DesignArchitecture />);

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled();
        expect(mockArchitectureContext.deleteProject).not.toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByLabelText(/add new project/i)).toHaveAttribute('aria-label');
      expect(screen.getByLabelText(/search projects/i)).toHaveAttribute('aria-label');
      expect(screen.getAllByLabelText(/edit project/i)[0]).toHaveAttribute('aria-label');
      expect(screen.getAllByLabelText(/delete project/i)[0]).toHaveAttribute('aria-label');
    });

    it('should have proper roles for landmark elements', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add new project/i })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<DesignArchitecture />);

      await userEvent.tab();
      expect(screen.getByRole('search')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /add new project/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getAllByRole('article')[0]).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('should show error message when project creation fails', async () => {
      mockArchitectureContext.createProject.mockRejectedValue(new Error('Creation failed'));

      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByLabelText(/add new project/i);
      await userEvent.click(addButton);

      await userEvent.type(screen.getByLabelText(/project name/i), 'New Project');
      await userEvent.type(screen.getByLabelText(/client name/i), 'New Client');

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create project/i)).toBeInTheDocument();
      });
    });

    it('should show error message when project update fails', async () => {
      mockArchitectureContext.updateProject.mockRejectedValue(new Error('Update failed'));

      renderWithProviders(<DesignArchitecture />);

      const editButtons = screen.getAllByLabelText(/edit project/i);
      await userEvent.click(editButtons[0]);

      const submitButton = screen.getByRole('button', { name: /update project/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to update project/i)).toBeInTheDocument();
      });
    });

    it('should show error message when project deletion fails', async () => {
      window.confirm = jest.fn(() => true);
      mockArchitectureContext.deleteProject.mockRejectedValue(new Error('Deletion failed'));

      renderWithProviders(<DesignArchitecture />);

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete project/i)).toBeInTheDocument();
      });
    });
  });

  describe('Permission Handling', () => {
    it('should disable create button for users without create permission', () => {
      const authContextWithoutPermission = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          permissions: ['edit', 'delete'],
        },
      };

      renderWithProviders(<DesignArchitecture />, { authContext: authContextWithoutPermission });

      expect(screen.getByLabelText(/add new project/i)).toBeDisabled();
    });

    it('should hide edit and delete buttons for users without edit/delete permissions', () => {
      const authContextWithoutPermission = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          permissions: ['create'],
        },
      };

      renderWithProviders(<DesignArchitecture />, { authContext: authContextWithoutPermission });

      expect(screen.queryAllByLabelText(/edit project/i)).toHaveLength(0);
      expect(screen.queryAllByLabelText(/delete project/i)).toHaveLength(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no projects exist', () => {
      const emptyContext = {
        ...mockArchitectureContext,
        projects: [],
      };

      renderWithProviders(<DesignArchitecture />, { architectureContext: emptyContext });

      expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
      expect(screen.getByText(/create your first project/i)).toBeInTheDocument();
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

const mockArchitectureData = {
  projects: [
    {
      id: '1',
      name: 'Modern Villa',
      status: 'active',
      lastUpdated: '2023-05-15',
      blueprints: 12,
      client: 'John Doe',
    },
    {
      id: '2',
      name: 'Urban Office',
      status: 'completed',
      lastUpdated: '2023-04-20',
      blueprints: 8,
      client: 'Acme Corp',
    },
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

const mockArchitectureContext = {
  ...mockArchitectureData,
  fetchProjects: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  setCurrentProject: jest.fn(),
};

const renderWithProviders = (
  ui: React.ReactElement,
  {
    architectureContext = mockArchitectureContext,
    authContext = mockAuthContext,
    route = '/',
  } = {}
) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={authContext}>
        <ArchitectureContext.Provider value={architectureContext}>
          <Routes>
            <Route path="/" element={ui} />
            <Route path="/projects/:id" element={<div>Project Detail</div>} />
          </Routes>
        </ArchitectureContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData.projects });
  });

  describe('Initial Render', () => {
    it('should render loading state initially when data is being fetched', () => {
      const loadingContext = {
        ...mockArchitectureContext,
        loading: true,
        projects: [],
      };
      renderWithProviders(<DesignArchitecture />, { architectureContext: loadingContext });

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByText('Modern Villa')).not.toBeInTheDocument();
    });

    it('should render error message when fetch fails', () => {
      const errorContext = {
        ...mockArchitectureContext,
        error: 'Failed to fetch projects',
        projects: [],
      };
      renderWithProviders(<DesignArchitecture />, { architectureContext: errorContext });

      expect(screen.getByText(/failed to load projects/i)).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch projects')).toBeInTheDocument();
    });

    it('should render project list when data is available', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByText('Modern Villa')).toBeInTheDocument();
      expect(screen.getByText('Urban Office')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });
  });

  describe('Project List Interactions', () => {
    it('should navigate to project detail when clicking on a project card', async () => {
      renderWithProviders(<DesignArchitecture />);

      const modernVillaCard = screen.getByText('Modern Villa').closest('article');
      if (modernVillaCard) {
        fireEvent.click(modernVillaCard);
      }

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/projects/1');
      });
    });

    it('should filter projects based on search input', async () => {
      renderWithProviders(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      await userEvent.type(searchInput, 'urban');

      expect(screen.getByText('Urban Office')).toBeInTheDocument();
      expect(screen.queryByText('Modern Villa')).not.toBeInTheDocument();
    });

    it('should filter projects by status', async () => {
      renderWithProviders(<DesignArchitecture />);

      const statusFilter = screen.getByLabelText(/filter by status/i);
      await userEvent.selectOptions(statusFilter, 'completed');

      expect(screen.getByText('Urban Office')).toBeInTheDocument();
      expect(screen.queryByText('Modern Villa')).not.toBeInTheDocument();
    });

    it('should sort projects by last updated date', async () => {
      renderWithProviders(<DesignArchitecture />);

      const sortButton = screen.getByLabelText(/sort by/i);
      await userEvent.selectOptions(sortButton, 'lastUpdated');

      const projectCards = screen.getAllByRole('article');
      const firstCard = within(projectCards[0]).getByText(/modern villa/i);
      expect(firstCard).toBeInTheDocument();
    });
  });

  describe('Project Management', () => {
    it('should open create project modal when clicking add button', async () => {
      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByLabelText(/add new project/i);
      await userEvent.click(addButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/create new project/i)).toBeInTheDocument();
    });

    it('should create a new project with valid form data', async () => {
      mockArchitectureContext.createProject.mockResolvedValue({
        id: '3',
        name: 'New Project',
        status: 'active',
        lastUpdated: new Date().toISOString(),
        blueprints: 0,
        client: 'New Client',
      });

      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByLabelText(/add new project/i);
      await userEvent.click(addButton);

      await userEvent.type(screen.getByLabelText(/project name/i), 'New Project');
      await userEvent.type(screen.getByLabelText(/client name/i), 'New Client');
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'active');

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockArchitectureContext.createProject).toHaveBeenCalledWith({
          name: 'New Project',
          client: 'New Client',
          status: 'active',
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should show validation errors when creating project with invalid data', async () => {
      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByLabelText(/add new project/i);
      await userEvent.click(addButton);

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await userEvent.click(submitButton);

      expect(await screen.findByText(/project name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/client name is required/i)).toBeInTheDocument();
    });

    it('should open edit modal when clicking edit button on a project', async () => {
      renderWithProviders(<DesignArchitecture />);

      const editButtons = screen.getAllByLabelText(/edit project/i);
      await userEvent.click(editButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/edit project/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Modern Villa')).toBeInTheDocument();
    });

    it('should update a project with valid form data', async () => {
      mockArchitectureContext.updateProject.mockResolvedValue({
        ...mockArchitectureData.projects[0],
        name: 'Updated Modern Villa',
      });

      renderWithProviders(<DesignArchitecture />);

      const editButtons = screen.getAllByLabelText(/edit project/i);
      await userEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/project name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Modern Villa');

      const submitButton = screen.getByRole('button', { name: /update project/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockArchitectureContext.updateProject).toHaveBeenCalledWith('1', {
          name: 'Updated Modern Villa',
          client: 'John Doe',
          status: 'active',
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should delete a project when confirmed', async () => {
      window.confirm = jest.fn(() => true);
      mockArchitectureContext.deleteProject.mockResolvedValue(true);

      renderWithProviders(<DesignArchitecture />);

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete Modern Villa?');
        expect(mockArchitectureContext.deleteProject).toHaveBeenCalledWith('1');
      });
    });

    it('should not delete a project when cancellation is confirmed', async () => {
      window.confirm = jest.fn(() => false);

      renderWithProviders(<DesignArchitecture />);

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled();
        expect(mockArchitectureContext.deleteProject).not.toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByLabelText(/add new project/i)).toHaveAttribute('aria-label');
      expect(screen.getByLabelText(/search projects/i)).toHaveAttribute('aria-label');
      expect(screen.getAllByLabelText(/edit project/i)[0]).toHaveAttribute('aria-label');
      expect(screen.getAllByLabelText(/delete project/i)[0]).toHaveAttribute('aria-label');
    });

    it('should have proper roles for landmark elements', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add new project/i })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<DesignArchitecture />);

      await userEvent.tab();
      expect(screen.getByRole('search')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /add new project/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getAllByRole('article')[0]).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('should show error message when project creation fails', async () => {
      mockArchitectureContext.createProject.mockRejectedValue(new Error('Creation failed'));

      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByLabelText(/add new project/i);
      await userEvent.click(addButton);

      await userEvent.type(screen.getByLabelText(/project name/i), 'New Project');
      await userEvent.type(screen.getByLabelText(/client name/i), 'New Client');

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create project/i)).toBeInTheDocument();
      });
    });

    it('should show error message when project update fails', async () => {
      mockArchitectureContext.updateProject.mockRejectedValue(new Error('Update failed'));

      renderWithProviders(<DesignArchitecture />);

      const editButtons = screen.getAllByLabelText(/edit project/i);
      await userEvent.click(editButtons[0]);

      const submitButton = screen.getByRole('button', { name: /update project/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to update project/i)).toBeInTheDocument();
      });
    });

    it('should show error message when project deletion fails', async () => {
      window.confirm = jest.fn(() => true);
      mockArchitectureContext.deleteProject.mockRejectedValue(new Error('Deletion failed'));

      renderWithProviders(<DesignArchitecture />);

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete project/i)).toBeInTheDocument();
      });
    });
  });

  describe('Permission Handling', () => {
    it('should disable create button for users without create permission', () => {
      const authContextWithoutPermission = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          permissions: ['edit', 'delete'],
        },
      };

      renderWithProviders(<DesignArchitecture />, { authContext: authContextWithoutPermission });

      expect(screen.getByLabelText(/add new project/i)).toBeDisabled();
    });

    it('should hide edit and delete buttons for users without edit/delete permissions', () => {
      const authContextWithoutPermission = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          permissions: ['create'],
        },
      };

      renderWithProviders(<DesignArchitecture />, { authContext: authContextWithoutPermission });

      expect(screen.queryAllByLabelText(/edit project/i)).toHaveLength(0);
      expect(screen.queryAllByLabelText(/delete project/i)).toHaveLength(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no projects exist', () => {
      const emptyContext = {
        ...mockArchitectureContext,
        projects: [],
      };

      renderWithProviders(<DesignArchitecture />, { architectureContext: emptyContext });

      expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
      expect(screen.getByText(/create your first project/i)).toBeInTheDocument();
    });
  });
});