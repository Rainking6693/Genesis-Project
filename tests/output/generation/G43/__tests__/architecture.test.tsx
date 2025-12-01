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
      status: 'review',
      lastUpdated: '2023-05-10',
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

const renderWithProviders = (ui, { route = '/', path = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={ui} />
      </Routes>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData.projects });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={{ ...mockArchitectureData, loading: true }}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading projects/i)).toBeInTheDocument();
    });

    it('should render project list when data is loaded', async () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Villa')).toBeInTheDocument();
        expect(screen.getByText('Urban Office')).toBeInTheDocument();
      });
    });

    it('should render error message when data fetch fails', async () => {
      const errorMessage = 'Failed to fetch projects';
      (axios.get as jest.Mock).mockRejectedValue(new Error(errorMessage));

      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={{ ...mockArchitectureData, error: errorMessage }}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Project List Interactions', () => {
    beforeEach(() => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );
    });

    it('should filter projects by search term', async () => {
      const searchInput = screen.getByPlaceholderText(/search projects/i);
      await userEvent.type(searchInput, 'villa');

      expect(screen.getByText('Modern Villa')).toBeInTheDocument();
      expect(screen.queryByText('Urban Office')).not.toBeInTheDocument();
    });

    it('should sort projects by name when header is clicked', async () => {
      const nameHeader = screen.getByText(/name/i);
      await userEvent.click(nameHeader);

      const rows = screen.getAllByRole('row');
      const firstRow = within(rows[1]).getByText('Modern Villa');
      expect(firstRow).toBeInTheDocument();
    });

    it('should navigate to project details when project is clicked', async () => {
      require('react-router-dom').useNavigate.mockImplementation(() => mockNavigate);
      const projectRow = screen.getByText('Modern Villa').closest('tr');
      await userEvent.click(projectRow!);

      expect(mockNavigate).toHaveBeenCalledWith('/projects/1');
    });

    it('should open delete confirmation dialog when delete button is clicked', async () => {
      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      await userEvent.click(deleteButtons[0]);

      expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });

    it('should delete project when confirmed in dialog', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});
      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      await userEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText(/confirm/i);
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith('/api/projects/1');
        expect(screen.queryByText('Modern Villa')).not.toBeInTheDocument();
      });
    });
  });

  describe('Project Creation', () => {
    it('should open create project dialog when button is clicked', async () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const createButton = screen.getByRole('button', { name: /create new project/i });
      await userEvent.click(createButton);

      expect(screen.getByText(/create new project/i)).toBeInTheDocument();
    });

    it('should create new project when form is submitted', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          id: '3',
          name: 'New Project',
          status: 'draft',
          lastUpdated: '2023-06-01',
          blueprints: 0,
          client: 'New Client',
        },
      });

      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const createButton = screen.getByRole('button', { name: /create new project/i });
      await userEvent.click(createButton);

      await userEvent.type(screen.getByLabelText(/project name/i), 'New Project');
      await userEvent.type(screen.getByLabelText(/client name/i), 'New Client');
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'draft');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/projects', expect.any(Object));
        expect(screen.getByText('New Project')).toBeInTheDocument();
      });
    });

    it('should show validation errors when form is submitted with invalid data', async () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const createButton = screen.getByRole('button', { name: /create new project/i });
      await userEvent.click(createButton);

      const submitButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(submitButton);

      expect(await screen.findByText(/project name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/client name is required/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for project table', () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'Architecture projects');

      const rows = screen.getAllByRole('row');
      expect(rows[0]).toHaveAttribute('aria-rowindex', '1');
      expect(rows[1]).toHaveAttribute('aria-rowindex', '2');
    });

    it('should have proper labels for form inputs', async () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const createButton = screen.getByRole('button', { name: /create new project/i });
      await userEvent.click(createButton);

      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/client name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const createButton = screen.getByRole('button', { name: /create new project/i });
      createButton.focus();
      fireEvent.keyDown(createButton, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/create new project/i)).toBeInTheDocument();
      });

      const projectNameInput = screen.getByLabelText(/project name/i);
      projectNameInput.focus();
      fireEvent.keyDown(projectNameInput, { key: 'Tab', code: 'Tab' });

      expect(screen.getByLabelText(/client name/i)).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project list', () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={{ ...mockArchitectureData, projects: [] }}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
      expect(screen.getByText(/create your first project/i)).toBeInTheDocument();
    });

    it('should disable delete button for users without delete permission', () => {
      const authContextWithoutDelete = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          permissions: ['create', 'edit'],
        },
      };

      renderWithProviders(
        <AuthContext.Provider value={authContextWithoutDelete}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      expect(deleteButtons[0]).toBeDisabled();
    });

    it('should show proper status badges for different project statuses', () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const activeBadge = screen.getByText(/active/i).closest('span');
      const reviewBadge = screen.getByText(/review/i).closest('span');

      expect(activeBadge).toHaveClass('bg-green-100');
      expect(reviewBadge).toHaveClass('bg-yellow-100');
    });
  });

  describe('Route Handling', () => {
    it('should navigate to project details when URL has project ID', () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <Routes>
              <Route path="/" element={<DesignArchitecture />} />
              <Route path="/projects/:id" element={<div>Project Details</div>} />
            </Routes>
          </ArchitectureContext.Provider>
        </AuthContext.Provider>,
        { route: '/projects/1', path: '/projects/:id' }
      );

      expect(screen.getByText(/project details/i)).toBeInTheDocument();
    });

    it('should show 404 when project not found', () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <Routes>
              <Route path="/" element={<DesignArchitecture />} />
              <Route path="/projects/:id" element={<div>Project Details</div>} />
              <Route path="*" element={<div>404 Not Found</div>} />
            </Routes>
          </ArchitectureContext.Provider>
        </AuthContext.Provider>,
        { route: '/nonexistent', path: '*' }
      );

      expect(screen.getByText(/404 not found/i)).toBeInTheDocument();
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
      status: 'review',
      lastUpdated: '2023-05-10',
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

const renderWithProviders = (ui, { route = '/', path = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={ui} />
      </Routes>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData.projects });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={{ ...mockArchitectureData, loading: true }}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading projects/i)).toBeInTheDocument();
    });

    it('should render project list when data is loaded', async () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('Modern Villa')).toBeInTheDocument();
        expect(screen.getByText('Urban Office')).toBeInTheDocument();
      });
    });

    it('should render error message when data fetch fails', async () => {
      const errorMessage = 'Failed to fetch projects';
      (axios.get as jest.Mock).mockRejectedValue(new Error(errorMessage));

      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={{ ...mockArchitectureData, error: errorMessage }}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Project List Interactions', () => {
    beforeEach(() => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );
    });

    it('should filter projects by search term', async () => {
      const searchInput = screen.getByPlaceholderText(/search projects/i);
      await userEvent.type(searchInput, 'villa');

      expect(screen.getByText('Modern Villa')).toBeInTheDocument();
      expect(screen.queryByText('Urban Office')).not.toBeInTheDocument();
    });

    it('should sort projects by name when header is clicked', async () => {
      const nameHeader = screen.getByText(/name/i);
      await userEvent.click(nameHeader);

      const rows = screen.getAllByRole('row');
      const firstRow = within(rows[1]).getByText('Modern Villa');
      expect(firstRow).toBeInTheDocument();
    });

    it('should navigate to project details when project is clicked', async () => {
      require('react-router-dom').useNavigate.mockImplementation(() => mockNavigate);
      const projectRow = screen.getByText('Modern Villa').closest('tr');
      await userEvent.click(projectRow!);

      expect(mockNavigate).toHaveBeenCalledWith('/projects/1');
    });

    it('should open delete confirmation dialog when delete button is clicked', async () => {
      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      await userEvent.click(deleteButtons[0]);

      expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });

    it('should delete project when confirmed in dialog', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});
      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      await userEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText(/confirm/i);
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith('/api/projects/1');
        expect(screen.queryByText('Modern Villa')).not.toBeInTheDocument();
      });
    });
  });

  describe('Project Creation', () => {
    it('should open create project dialog when button is clicked', async () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const createButton = screen.getByRole('button', { name: /create new project/i });
      await userEvent.click(createButton);

      expect(screen.getByText(/create new project/i)).toBeInTheDocument();
    });

    it('should create new project when form is submitted', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          id: '3',
          name: 'New Project',
          status: 'draft',
          lastUpdated: '2023-06-01',
          blueprints: 0,
          client: 'New Client',
        },
      });

      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const createButton = screen.getByRole('button', { name: /create new project/i });
      await userEvent.click(createButton);

      await userEvent.type(screen.getByLabelText(/project name/i), 'New Project');
      await userEvent.type(screen.getByLabelText(/client name/i), 'New Client');
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'draft');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/projects', expect.any(Object));
        expect(screen.getByText('New Project')).toBeInTheDocument();
      });
    });

    it('should show validation errors when form is submitted with invalid data', async () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const createButton = screen.getByRole('button', { name: /create new project/i });
      await userEvent.click(createButton);

      const submitButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(submitButton);

      expect(await screen.findByText(/project name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/client name is required/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for project table', () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'Architecture projects');

      const rows = screen.getAllByRole('row');
      expect(rows[0]).toHaveAttribute('aria-rowindex', '1');
      expect(rows[1]).toHaveAttribute('aria-rowindex', '2');
    });

    it('should have proper labels for form inputs', async () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const createButton = screen.getByRole('button', { name: /create new project/i });
      await userEvent.click(createButton);

      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/client name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const createButton = screen.getByRole('button', { name: /create new project/i });
      createButton.focus();
      fireEvent.keyDown(createButton, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/create new project/i)).toBeInTheDocument();
      });

      const projectNameInput = screen.getByLabelText(/project name/i);
      projectNameInput.focus();
      fireEvent.keyDown(projectNameInput, { key: 'Tab', code: 'Tab' });

      expect(screen.getByLabelText(/client name/i)).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project list', () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={{ ...mockArchitectureData, projects: [] }}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
      expect(screen.getByText(/create your first project/i)).toBeInTheDocument();
    });

    it('should disable delete button for users without delete permission', () => {
      const authContextWithoutDelete = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          permissions: ['create', 'edit'],
        },
      };

      renderWithProviders(
        <AuthContext.Provider value={authContextWithoutDelete}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      expect(deleteButtons[0]).toBeDisabled();
    });

    it('should show proper status badges for different project statuses', () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <DesignArchitecture />
          </ArchitectureContext.Provider>
        </AuthContext.Provider>
      );

      const activeBadge = screen.getByText(/active/i).closest('span');
      const reviewBadge = screen.getByText(/review/i).closest('span');

      expect(activeBadge).toHaveClass('bg-green-100');
      expect(reviewBadge).toHaveClass('bg-yellow-100');
    });
  });

  describe('Route Handling', () => {
    it('should navigate to project details when URL has project ID', () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <Routes>
              <Route path="/" element={<DesignArchitecture />} />
              <Route path="/projects/:id" element={<div>Project Details</div>} />
            </Routes>
          </ArchitectureContext.Provider>
        </AuthContext.Provider>,
        { route: '/projects/1', path: '/projects/:id' }
      );

      expect(screen.getByText(/project details/i)).toBeInTheDocument();
    });

    it('should show 404 when project not found', () => {
      renderWithProviders(
        <AuthContext.Provider value={mockAuthContext}>
          <ArchitectureContext.Provider value={mockArchitectureData}>
            <Routes>
              <Route path="/" element={<DesignArchitecture />} />
              <Route path="/projects/:id" element={<div>Project Details</div>} />
              <Route path="*" element={<div>404 Not Found</div>} />
            </Routes>
          </ArchitectureContext.Provider>
        </AuthContext.Provider>,
        { route: '/nonexistent', path: '*' }
      );

      expect(screen.getByText(/404 not found/i)).toBeInTheDocument();
    });
  });
});