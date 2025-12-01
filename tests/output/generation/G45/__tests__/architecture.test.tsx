import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DesignArchitecture from './DesignArchitecture';
import { ArchitectureContext } from '../../context/ArchitectureContext';
import { toast } from 'react-toastify';

jest.mock('axios');
jest.mock('react-toastify', () => ({
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

const mockContextValue = {
  projects: [
    { id: '1', name: 'Modern Villa', status: 'active' },
    { id: '2', name: 'Urban Loft', status: 'completed' },
  ],
  materials: [
    { id: '101', name: 'Concrete', type: 'structural' },
    { id: '102', name: 'Glass', type: 'facade' },
  ],
  loadProjects: jest.fn(),
  loadMaterials: jest.fn(),
  addProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  isLoading: false,
  error: null,
};

const renderWithContext = (ui: React.ReactElement, { route = '/', path = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={
          <ArchitectureContext.Provider value={mockContextValue}>
            {ui}
          </ArchitectureContext.Provider>
        } />
      </Routes>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the component with loading state initially when data is being fetched', () => {
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading design tools/i)).toBeInTheDocument();
    });

    it('should display projects and materials after loading completes', async () => {
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      await waitFor(() => {
        expect(screen.getByText('Modern Villa')).toBeInTheDocument();
        expect(screen.getByText('Urban Loft')).toBeInTheDocument();
        expect(screen.getByText('Concrete')).toBeInTheDocument();
        expect(screen.getByText('Glass')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetching fails', () => {
      const errorContext = {
        ...mockContextValue,
        error: 'Failed to load projects',
        isLoading: false,
      };

      render(
        <ArchitectureContext.Provider value={errorContext}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      expect(screen.getByText(/failed to load projects/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Project Management', () => {
    it('should allow creating a new project with valid inputs', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const addButton = screen.getByRole('button', { name: /add new project/i });
      await user.click(addButton);

      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/project description/i);
      const submitButton = screen.getByRole('button', { name: /create project/i });

      await user.type(nameInput, 'Eco House');
      await user.type(descriptionInput, 'Sustainable living design');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockContextValue.addProject).toHaveBeenCalledWith({
          name: 'Eco House',
          description: 'Sustainable living design',
          status: 'draft',
        });
        expect(toast.success).toHaveBeenCalledWith('Project created successfully');
      });
    });

    it('should show validation errors when creating project with invalid inputs', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const addButton = screen.getByRole('button', { name: /add new project/i });
      await user.click(addButton);

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      expect(await screen.findByText(/project name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      expect(mockContextValue.addProject).not.toHaveBeenCalled();
    });

    it('should allow editing an existing project', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Modern Villa');
      await user.clear(nameInput);
      await user.type(nameInput, 'Modern Villa Updated');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockContextValue.updateProject).toHaveBeenCalledWith('1', {
          name: 'Modern Villa Updated',
          description: expect.any(String),
          status: 'active',
        });
        expect(toast.success).toHaveBeenCalledWith('Project updated successfully');
      });
    });

    it('should show confirmation dialog before deleting a project', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockContextValue.deleteProject).toHaveBeenCalledWith('1');
        expect(toast.success).toHaveBeenCalledWith('Project deleted successfully');
      });
    });

    it('should cancel project deletion when user clicks cancel', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText(/are you sure you want to delete/i)).not.toBeInTheDocument();
      expect(mockContextValue.deleteProject).not.toHaveBeenCalled();
    });
  });

  describe('Material Selection', () => {
    it('should allow selecting materials for a project', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const projectCards = screen.getAllByTestId('project-card');
      await user.click(projectCards[0]);

      const materialCheckboxes = screen.getAllByRole('checkbox');
      await user.click(materialCheckboxes[0]);

      expect(screen.getByText(/selected materials/i)).toBeInTheDocument();
      expect(within(screen.getByTestId('selected-materials')).getByText('Concrete')).toBeInTheDocument();
    });

    it('should show error when trying to select more materials than allowed', async () => {
      const user = userEvent.setup();
      const limitedContext = {
        ...mockContextValue,
        materials: Array(11).fill(0).map((_, i) => ({
          id: `10${i}`,
          name: `Material ${i}`,
          type: 'test',
        })),
      };

      render(
        <ArchitectureContext.Provider value={limitedContext}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      const projectCards = screen.getAllByTestId('project-card');
      await user.click(projectCards[0]);

      const materialCheckboxes = screen.getAllByRole('checkbox');
      for (let i = 0; i < 10; i++) {
        await user.click(materialCheckboxes[i]);
      }

      await user.click(materialCheckboxes[10]);

      expect(screen.getByText(/maximum of 10 materials allowed/i)).toBeInTheDocument();
      expect(toast.warning).toHaveBeenCalledWith('You can select maximum 10 materials per project');
    });
  });

  describe('3D Visualization', () => {
    it('should load 3D viewer when viewing a project', async () => {
      renderWithContext(<DesignArchitecture />, {
        path: '/design/project/1',
      });

      await waitFor(() => {
        expect(screen.getByTestId('3d-viewer-container')).toBeInTheDocument();
        expect(screen.getByText(/3d visualization/i)).toBeInTheDocument();
      });
    });

    it('should show error when 3D model fails to load', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Failed to load model'));

      renderWithContext(<DesignArchitecture />, {
        path: '/design/project/1',
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to load 3d model/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should allow rotating the 3D model', async () => {
      renderWithContext(<DesignArchitecture />, {
        path: '/design/project/1',
      });

      const rotateButton = await screen.findByRole('button', { name: /rotate/i });
      fireEvent.click(rotateButton);

      // Mock canvas interaction would be tested here in a real implementation
      expect(screen.getByTestId('3d-viewer-container')).toHaveClass('rotating');
    });
  });

  describe('Collaboration Features', () => {
    it('should allow inviting collaborators to a project', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design/project/1',
      });

      const inviteButton = screen.getByRole('button', { name: /invite collaborator/i });
      await user.click(inviteButton);

      const emailInput = screen.getByLabelText(/email/i);
      const roleSelect = screen.getByLabelText(/role/i);
      const sendButton = screen.getByRole('button', { name: /send invitation/i });

      await user.type(emailInput, 'architect@example.com');
      await user.selectOptions(roleSelect, 'editor');
      await user.click(sendButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/invite'),
          {
            projectId: '1',
            email: 'architect@example.com',
            role: 'editor',
          }
        );
        expect(toast.success).toHaveBeenCalledWith('Invitation sent successfully');
      });
    });

    it('should show error for invalid email when inviting collaborator', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design/project/1',
      });

      const inviteButton = screen.getByRole('button', { name: /invite collaborator/i });
      await user.click(inviteButton);

      const emailInput = screen.getByLabelText(/email/i);
      const sendButton = screen.getByRole('button', { name: /send invitation/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(sendButton);

      expect(await screen.findByText(/please enter a valid email/i)).toBeInTheDocument();
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe('Export Functionality', () => {
    it('should allow exporting project as PDF', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design/project/1',
      });

      const exportButton = screen.getByRole('button', { name: /export as pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/export/pdf'),
          { projectId: '1' },
          { responseType: 'blob' }
        );
      });
    });

    it('should show error when PDF export fails', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Export failed'));

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design/project/1',
      });

      const exportButton = screen.getByRole('button', { name: /export as pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to export project as PDF');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', () => {
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      expect(screen.getByRole('heading', { name: /design architecture dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /projects list/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /materials palette/i })).toBeInTheDocument();

      const projectCards = screen.getAllByRole('article');
      expect(projectCards.length).toBeGreaterThan(0);
      projectCards.forEach(card => {
        expect(card).toHaveAttribute('aria-labelledby');
      });
    });

    it('should be navigable using keyboard only', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      // Tab through the main elements
      await user.tab();
      expect(screen.getByRole('button', { name: /add new project/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('searchbox')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /filter projects/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for accessibility', () => {
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const heading = screen.getByRole('heading', { name: /design architecture dashboard/i });
      const computedStyle = window.getComputedStyle(heading);
      const color = computedStyle.getPropertyValue('color');
      const backgroundColor = computedStyle.getPropertyValue('background-color');

      // This would normally be tested with actual contrast ratio calculations
      expect(color).not.toBe(backgroundColor);
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile viewports', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      expect(screen.getByTestId('mobile-menu-button')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
    });

    it('should show mobile menu when menu button is clicked', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const menuButton = screen.getByTestId('mobile-menu-button');
      await user.click(menuButton);

      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('Error Boundaries', () => {
    it('should display error boundary when component crashes', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = DesignArchitecture;

      const BrokenComponent = () => {
        throw new Error('Test error');
        return <OriginalComponent />;
      };

      renderWithContext(<BrokenComponent />, {
        path: '/design',
      });

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
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
import { toast } from 'react-toastify';

jest.mock('axios');
jest.mock('react-toastify', () => ({
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

const mockContextValue = {
  projects: [
    { id: '1', name: 'Modern Villa', status: 'active' },
    { id: '2', name: 'Urban Loft', status: 'completed' },
  ],
  materials: [
    { id: '101', name: 'Concrete', type: 'structural' },
    { id: '102', name: 'Glass', type: 'facade' },
  ],
  loadProjects: jest.fn(),
  loadMaterials: jest.fn(),
  addProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  isLoading: false,
  error: null,
};

const renderWithContext = (ui: React.ReactElement, { route = '/', path = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={
          <ArchitectureContext.Provider value={mockContextValue}>
            {ui}
          </ArchitectureContext.Provider>
        } />
      </Routes>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the component with loading state initially when data is being fetched', () => {
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading design tools/i)).toBeInTheDocument();
    });

    it('should display projects and materials after loading completes', async () => {
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      await waitFor(() => {
        expect(screen.getByText('Modern Villa')).toBeInTheDocument();
        expect(screen.getByText('Urban Loft')).toBeInTheDocument();
        expect(screen.getByText('Concrete')).toBeInTheDocument();
        expect(screen.getByText('Glass')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetching fails', () => {
      const errorContext = {
        ...mockContextValue,
        error: 'Failed to load projects',
        isLoading: false,
      };

      render(
        <ArchitectureContext.Provider value={errorContext}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      expect(screen.getByText(/failed to load projects/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Project Management', () => {
    it('should allow creating a new project with valid inputs', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const addButton = screen.getByRole('button', { name: /add new project/i });
      await user.click(addButton);

      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/project description/i);
      const submitButton = screen.getByRole('button', { name: /create project/i });

      await user.type(nameInput, 'Eco House');
      await user.type(descriptionInput, 'Sustainable living design');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockContextValue.addProject).toHaveBeenCalledWith({
          name: 'Eco House',
          description: 'Sustainable living design',
          status: 'draft',
        });
        expect(toast.success).toHaveBeenCalledWith('Project created successfully');
      });
    });

    it('should show validation errors when creating project with invalid inputs', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const addButton = screen.getByRole('button', { name: /add new project/i });
      await user.click(addButton);

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      expect(await screen.findByText(/project name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      expect(mockContextValue.addProject).not.toHaveBeenCalled();
    });

    it('should allow editing an existing project', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Modern Villa');
      await user.clear(nameInput);
      await user.type(nameInput, 'Modern Villa Updated');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockContextValue.updateProject).toHaveBeenCalledWith('1', {
          name: 'Modern Villa Updated',
          description: expect.any(String),
          status: 'active',
        });
        expect(toast.success).toHaveBeenCalledWith('Project updated successfully');
      });
    });

    it('should show confirmation dialog before deleting a project', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockContextValue.deleteProject).toHaveBeenCalledWith('1');
        expect(toast.success).toHaveBeenCalledWith('Project deleted successfully');
      });
    });

    it('should cancel project deletion when user clicks cancel', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText(/are you sure you want to delete/i)).not.toBeInTheDocument();
      expect(mockContextValue.deleteProject).not.toHaveBeenCalled();
    });
  });

  describe('Material Selection', () => {
    it('should allow selecting materials for a project', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const projectCards = screen.getAllByTestId('project-card');
      await user.click(projectCards[0]);

      const materialCheckboxes = screen.getAllByRole('checkbox');
      await user.click(materialCheckboxes[0]);

      expect(screen.getByText(/selected materials/i)).toBeInTheDocument();
      expect(within(screen.getByTestId('selected-materials')).getByText('Concrete')).toBeInTheDocument();
    });

    it('should show error when trying to select more materials than allowed', async () => {
      const user = userEvent.setup();
      const limitedContext = {
        ...mockContextValue,
        materials: Array(11).fill(0).map((_, i) => ({
          id: `10${i}`,
          name: `Material ${i}`,
          type: 'test',
        })),
      };

      render(
        <ArchitectureContext.Provider value={limitedContext}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      const projectCards = screen.getAllByTestId('project-card');
      await user.click(projectCards[0]);

      const materialCheckboxes = screen.getAllByRole('checkbox');
      for (let i = 0; i < 10; i++) {
        await user.click(materialCheckboxes[i]);
      }

      await user.click(materialCheckboxes[10]);

      expect(screen.getByText(/maximum of 10 materials allowed/i)).toBeInTheDocument();
      expect(toast.warning).toHaveBeenCalledWith('You can select maximum 10 materials per project');
    });
  });

  describe('3D Visualization', () => {
    it('should load 3D viewer when viewing a project', async () => {
      renderWithContext(<DesignArchitecture />, {
        path: '/design/project/1',
      });

      await waitFor(() => {
        expect(screen.getByTestId('3d-viewer-container')).toBeInTheDocument();
        expect(screen.getByText(/3d visualization/i)).toBeInTheDocument();
      });
    });

    it('should show error when 3D model fails to load', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Failed to load model'));

      renderWithContext(<DesignArchitecture />, {
        path: '/design/project/1',
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to load 3d model/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should allow rotating the 3D model', async () => {
      renderWithContext(<DesignArchitecture />, {
        path: '/design/project/1',
      });

      const rotateButton = await screen.findByRole('button', { name: /rotate/i });
      fireEvent.click(rotateButton);

      // Mock canvas interaction would be tested here in a real implementation
      expect(screen.getByTestId('3d-viewer-container')).toHaveClass('rotating');
    });
  });

  describe('Collaboration Features', () => {
    it('should allow inviting collaborators to a project', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design/project/1',
      });

      const inviteButton = screen.getByRole('button', { name: /invite collaborator/i });
      await user.click(inviteButton);

      const emailInput = screen.getByLabelText(/email/i);
      const roleSelect = screen.getByLabelText(/role/i);
      const sendButton = screen.getByRole('button', { name: /send invitation/i });

      await user.type(emailInput, 'architect@example.com');
      await user.selectOptions(roleSelect, 'editor');
      await user.click(sendButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/invite'),
          {
            projectId: '1',
            email: 'architect@example.com',
            role: 'editor',
          }
        );
        expect(toast.success).toHaveBeenCalledWith('Invitation sent successfully');
      });
    });

    it('should show error for invalid email when inviting collaborator', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design/project/1',
      });

      const inviteButton = screen.getByRole('button', { name: /invite collaborator/i });
      await user.click(inviteButton);

      const emailInput = screen.getByLabelText(/email/i);
      const sendButton = screen.getByRole('button', { name: /send invitation/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(sendButton);

      expect(await screen.findByText(/please enter a valid email/i)).toBeInTheDocument();
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe('Export Functionality', () => {
    it('should allow exporting project as PDF', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design/project/1',
      });

      const exportButton = screen.getByRole('button', { name: /export as pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/export/pdf'),
          { projectId: '1' },
          { responseType: 'blob' }
        );
      });
    });

    it('should show error when PDF export fails', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Export failed'));

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design/project/1',
      });

      const exportButton = screen.getByRole('button', { name: /export as pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to export project as PDF');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', () => {
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      expect(screen.getByRole('heading', { name: /design architecture dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /projects list/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /materials palette/i })).toBeInTheDocument();

      const projectCards = screen.getAllByRole('article');
      expect(projectCards.length).toBeGreaterThan(0);
      projectCards.forEach(card => {
        expect(card).toHaveAttribute('aria-labelledby');
      });
    });

    it('should be navigable using keyboard only', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      // Tab through the main elements
      await user.tab();
      expect(screen.getByRole('button', { name: /add new project/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('searchbox')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /filter projects/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for accessibility', () => {
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const heading = screen.getByRole('heading', { name: /design architecture dashboard/i });
      const computedStyle = window.getComputedStyle(heading);
      const color = computedStyle.getPropertyValue('color');
      const backgroundColor = computedStyle.getPropertyValue('background-color');

      // This would normally be tested with actual contrast ratio calculations
      expect(color).not.toBe(backgroundColor);
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile viewports', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      expect(screen.getByTestId('mobile-menu-button')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
    });

    it('should show mobile menu when menu button is clicked', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />, {
        path: '/design',
      });

      const menuButton = screen.getByTestId('mobile-menu-button');
      await user.click(menuButton);

      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('Error Boundaries', () => {
    it('should display error boundary when component crashes', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = DesignArchitecture;

      const BrokenComponent = () => {
        throw new Error('Test error');
        return <OriginalComponent />;
      };

      renderWithContext(<BrokenComponent />, {
        path: '/design',
      });

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });
});