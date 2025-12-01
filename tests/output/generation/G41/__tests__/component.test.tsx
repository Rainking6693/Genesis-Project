import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CoreFunctionality from './CoreFunctionality';
import { ProjectContext } from '../../context/ProjectContext';
import { AuthContext } from '../../context/AuthContext';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockProjects = [
  {
    id: '1',
    name: 'Modern Villa',
    status: 'active',
    blueprints: [
      { id: 'bp1', name: 'Floor Plan', version: '1.0', fileUrl: '/floorplan.pdf' },
      { id: 'bp2', name: 'Electrical', version: '1.2', fileUrl: '/electrical.pdf' },
    ],
    lastUpdated: '2023-05-15',
  },
  {
    id: '2',
    name: 'Urban Loft',
    status: 'completed',
    blueprints: [],
    lastUpdated: '2023-03-10',
  },
];

const mockUser = {
  id: 'user1',
  name: 'Architect User',
  role: 'architect',
  permissions: ['create', 'edit', 'delete', 'view'],
};

const renderWithContext = (ui: React.ReactElement, { route = '/projects/1' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={{ user: mockUser, login: jest.fn(), logout: jest.fn() }}>
        <ProjectContext.Provider
          value={{
            projects: mockProjects,
            currentProject: mockProjects[0],
            loading: false,
            error: null,
            setCurrentProject: jest.fn(),
            addProject: jest.fn(),
            updateProject: jest.fn(),
            deleteProject: jest.fn(),
            refreshProjects: jest.fn(),
          }}
        >
          <Routes>
            <Route path="/projects/:id" element={ui} />
          </Routes>
        </ProjectContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('CoreFunctionality - Architecture Project Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Project Display and Navigation', () => {
    it('should render project details correctly when data is loaded', () => {
      renderWithContext(<CoreFunctionality />);

      expect(screen.getByText('Modern Villa')).toBeInTheDocument();
      expect(screen.getByText('Active')).toHaveClass('status-active');
      expect(screen.getByText('Last updated: 2023-05-15')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Blueprints' })).toBeInTheDocument();
    });

    it('should show loading skeleton when project data is being fetched', () => {
      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          projects: [],
          currentProject: null,
          loading: true,
          error: null,
        },
      });

      expect(screen.getByTestId('project-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Modern Villa')).not.toBeInTheDocument();
    });

    it('should display error message when project loading fails', () => {
      const errorMessage = 'Failed to load project data';
      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          projects: [],
          currentProject: null,
          loading: false,
          error: errorMessage,
        },
      });

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    it('should navigate to different project when project selector is used', async () => {
      const user = userEvent.setup();
      const mockNavigate = jest.fn();
      require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);

      renderWithContext(<CoreFunctionality />);

      const projectSelect = screen.getByLabelText('Select project');
      await user.click(projectSelect);
      await user.click(screen.getByText('Urban Loft'));

      expect(mockNavigate).toHaveBeenCalledWith('/projects/2');
    });
  });

  describe('Blueprint Management', () => {
    it('should display list of blueprints for the project', () => {
      renderWithContext(<CoreFunctionality />);

      const blueprintItems = screen.getAllByRole('listitem');
      expect(blueprintItems).toHaveLength(2);
      expect(within(blueprintItems[0]).getByText('Floor Plan')).toBeInTheDocument();
      expect(within(blueprintItems[1]).getByText('Electrical')).toBeInTheDocument();
    });

    it('should show empty state when project has no blueprints', () => {
      renderWithContext(<CoreFunctionality />, { route: '/projects/2' });

      expect(screen.getByText('No blueprints available')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Blueprint' })).toBeInTheDocument();
    });

    it('should open blueprint upload modal when add button is clicked', async () => {
      const user = userEvent.setup();
      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Add Blueprint' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Blueprint Name')).toBeInTheDocument();
    });

    it('should handle blueprint upload successfully', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Add Blueprint' }));
      await user.type(screen.getByLabelText('Blueprint Name'), 'New Blueprint');
      await user.type(screen.getByLabelText('Version'), '1.0');
      await user.upload(screen.getByLabelText('Upload File'), mockFile);
      await user.click(screen.getByRole('button', { name: 'Upload' }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
        expect(screen.getByText('Blueprint uploaded successfully')).toBeInTheDocument();
      });
    });

    it('should show error when blueprint upload fails', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Add Blueprint' }));
      await user.type(screen.getByLabelText('Blueprint Name'), 'New Blueprint');
      await user.click(screen.getByRole('button', { name: 'Upload' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to upload blueprint')).toBeInTheDocument();
      });
    });

    it('should validate blueprint form fields before submission', async () => {
      const user = userEvent.setup();
      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Add Blueprint' }));
      await user.click(screen.getByRole('button', { name: 'Upload' }));

      expect(await screen.findByText('Blueprint name is required')).toBeInTheDocument();
      expect(screen.getByText('File is required')).toBeInTheDocument();
    });
  });

  describe('Project Status Management', () => {
    it('should allow changing project status', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn();
      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          ...mockProjects,
          currentProject: mockProjects[0],
          updateProject: mockUpdate,
        },
      });

      const statusButton = screen.getByRole('button', { name: /active/i });
      await user.click(statusButton);
      await user.click(screen.getByRole('menuitem', { name: 'Completed' }));

      expect(mockUpdate).toHaveBeenCalledWith('1', { status: 'completed' });
    });

    it('should show confirmation dialog before deleting project', async () => {
      const user = userEvent.setup();
      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Project Actions' }));
      await user.click(screen.getByRole('menuitem', { name: 'Delete Project' }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this project?')).toBeInTheDocument();
    });

    it('should delete project when confirmed', async () => {
      const user = userEvent.setup();
      const mockDelete = jest.fn();
      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          ...mockProjects,
          currentProject: mockProjects[0],
          deleteProject: mockDelete,
        },
      });

      await user.click(screen.getByRole('button', { name: 'Project Actions' }));
      await user.click(screen.getByRole('menuitem', { name: 'Delete Project' }));
      await user.click(screen.getByRole('button', { name: 'Confirm Delete' }));

      expect(mockDelete).toHaveBeenCalledWith('1');
    });
  });

  describe('3D Model Viewer', () => {
    it('should display 3D model viewer when available', () => {
      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          ...mockProjects,
          currentProject: {
            ...mockProjects[0],
            modelUrl: '/model.glb',
          },
        },
      });

      expect(screen.getByTestId('3d-model-viewer')).toBeInTheDocument();
    });

    it('should show placeholder when no 3D model is available', () => {
      renderWithContext(<CoreFunctionality />);

      expect(screen.getByText('No 3D model available')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Upload 3D Model' })).toBeInTheDocument();
    });

    it('should handle 3D model upload', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['dummy content'], 'model.glb', { type: 'model/gltf-binary' });
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Upload 3D Model' }));
      await user.upload(screen.getByLabelText('Upload 3D Model File'), mockFile);
      await user.click(screen.getByRole('button', { name: 'Upload Model' }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
        expect(screen.getByText('3D model uploaded successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Collaboration Features', () => {
    it('should display team members list', () => {
      const projectWithTeam = {
        ...mockProjects[0],
        team: [
          { id: 'user1', name: 'Architect User', role: 'architect' },
          { id: 'user2', name: 'Structural Engineer', role: 'engineer' },
        ],
      };

      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          ...mockProjects,
          currentProject: projectWithTeam,
        },
      });

      expect(screen.getByText('Team Members')).toBeInTheDocument();
      expect(screen.getByText('Architect User')).toBeInTheDocument();
      expect(screen.getByText('Structural Engineer')).toBeInTheDocument();
    });

    it('should allow adding new team members', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Add Team Member' }));
      await user.type(screen.getByLabelText('Email'), 'engineer@example.com');
      await user.selectOptions(screen.getByLabelText('Role'), 'engineer');
      await user.click(screen.getByRole('button', { name: 'Add Member' }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            email: 'engineer@example.com',
            role: 'engineer',
          })
        );
      });
    });

    it('should show error when adding team member fails', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockRejectedValue(new Error('Failed to add member'));

      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Add Team Member' }));
      await user.type(screen.getByLabelText('Email'), 'invalid@example.com');
      await user.click(screen.getByRole('button', { name: 'Add Member' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to add team member')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', () => {
      renderWithContext(<CoreFunctionality />);

      expect(screen.getByRole('button', { name: 'Add Blueprint' })).toHaveAttribute('aria-label', 'Add new blueprint');
      expect(screen.getByRole('button', { name: 'Project Actions' })).toHaveAttribute('aria-haspopup', 'true');
      expect(screen.getByLabelText('Select project')).toHaveAttribute('aria-label', 'Select project');
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithContext(<CoreFunctionality />);

      await user.tab();
      expect(screen.getByRole('button', { name: 'Add Blueprint' })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: 'Project Actions' })).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should have proper contrast ratios for text elements', () => {
      renderWithContext(<CoreFunctionality />);

      const heading = screen.getByRole('heading', { name: 'Modern Villa' });
      expect(heading).toHaveStyle('color: rgb(30, 41, 59)'); // Assuming dark text on light background

      const statusBadge = screen.getByText('Active');
      expect(statusBadge).toHaveStyle('color: rgb(255, 255, 255)'); // Assuming white text on colored background
    });
  });

  describe('Error Boundaries and Recovery', () => {
    it('should handle component errors gracefully', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = CoreFunctionality;

      const BrokenComponent = () => {
        throw new Error('Test error');
      };

      renderWithContext(<BrokenComponent />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    });

    it('should recover from errors when reloaded', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      const UnstableComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <CoreFunctionality />;
      };

      const { rerender } = renderWithContext(<UnstableComponent />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      shouldThrow = false;
      await user.click(screen.getByRole('button', { name: 'Reload' }));
      rerender(<UnstableComponent />);

      expect(screen.getByText('Modern Villa')).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    it('should lazy load 3D model viewer', () => {
      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          ...mockProjects,
          currentProject: {
            ...mockProjects[0],
            modelUrl: '/model.glb',
          },
        },
      });

      // Assuming the 3D viewer is lazy loaded and shows a placeholder first
      expect(screen.getByTestId('3d-model-placeholder')).toBeInTheDocument();
    });

    it('should implement virtualized list for large blueprint collections', () => {
      const projectWithManyBlueprints = {
        ...mockProjects[0],
        blueprints: Array.from({ length: 100 }, (_, i) => ({
          id: `bp${i}`,
          name: `Blueprint ${i + 1}`,
          version: '1.0',
          fileUrl: `/blueprint${i}.pdf`,
        })),
      };

      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          ...mockProjects,
          currentProject: projectWithManyBlueprints,
        },
      });

      // Check that only a subset of items are rendered (virtualization)
      const blueprintItems = screen.getAllByRole('listitem');
      expect(blueprintItems.length).toBeLessThan(100);
      expect(blueprintItems.length).toBeGreaterThan(0);
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CoreFunctionality from './CoreFunctionality';
import { ProjectContext } from '../../context/ProjectContext';
import { AuthContext } from '../../context/AuthContext';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockProjects = [
  {
    id: '1',
    name: 'Modern Villa',
    status: 'active',
    blueprints: [
      { id: 'bp1', name: 'Floor Plan', version: '1.0', fileUrl: '/floorplan.pdf' },
      { id: 'bp2', name: 'Electrical', version: '1.2', fileUrl: '/electrical.pdf' },
    ],
    lastUpdated: '2023-05-15',
  },
  {
    id: '2',
    name: 'Urban Loft',
    status: 'completed',
    blueprints: [],
    lastUpdated: '2023-03-10',
  },
];

const mockUser = {
  id: 'user1',
  name: 'Architect User',
  role: 'architect',
  permissions: ['create', 'edit', 'delete', 'view'],
};

const renderWithContext = (ui: React.ReactElement, { route = '/projects/1' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={{ user: mockUser, login: jest.fn(), logout: jest.fn() }}>
        <ProjectContext.Provider
          value={{
            projects: mockProjects,
            currentProject: mockProjects[0],
            loading: false,
            error: null,
            setCurrentProject: jest.fn(),
            addProject: jest.fn(),
            updateProject: jest.fn(),
            deleteProject: jest.fn(),
            refreshProjects: jest.fn(),
          }}
        >
          <Routes>
            <Route path="/projects/:id" element={ui} />
          </Routes>
        </ProjectContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('CoreFunctionality - Architecture Project Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Project Display and Navigation', () => {
    it('should render project details correctly when data is loaded', () => {
      renderWithContext(<CoreFunctionality />);

      expect(screen.getByText('Modern Villa')).toBeInTheDocument();
      expect(screen.getByText('Active')).toHaveClass('status-active');
      expect(screen.getByText('Last updated: 2023-05-15')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Blueprints' })).toBeInTheDocument();
    });

    it('should show loading skeleton when project data is being fetched', () => {
      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          projects: [],
          currentProject: null,
          loading: true,
          error: null,
        },
      });

      expect(screen.getByTestId('project-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Modern Villa')).not.toBeInTheDocument();
    });

    it('should display error message when project loading fails', () => {
      const errorMessage = 'Failed to load project data';
      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          projects: [],
          currentProject: null,
          loading: false,
          error: errorMessage,
        },
      });

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    it('should navigate to different project when project selector is used', async () => {
      const user = userEvent.setup();
      const mockNavigate = jest.fn();
      require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);

      renderWithContext(<CoreFunctionality />);

      const projectSelect = screen.getByLabelText('Select project');
      await user.click(projectSelect);
      await user.click(screen.getByText('Urban Loft'));

      expect(mockNavigate).toHaveBeenCalledWith('/projects/2');
    });
  });

  describe('Blueprint Management', () => {
    it('should display list of blueprints for the project', () => {
      renderWithContext(<CoreFunctionality />);

      const blueprintItems = screen.getAllByRole('listitem');
      expect(blueprintItems).toHaveLength(2);
      expect(within(blueprintItems[0]).getByText('Floor Plan')).toBeInTheDocument();
      expect(within(blueprintItems[1]).getByText('Electrical')).toBeInTheDocument();
    });

    it('should show empty state when project has no blueprints', () => {
      renderWithContext(<CoreFunctionality />, { route: '/projects/2' });

      expect(screen.getByText('No blueprints available')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Blueprint' })).toBeInTheDocument();
    });

    it('should open blueprint upload modal when add button is clicked', async () => {
      const user = userEvent.setup();
      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Add Blueprint' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Blueprint Name')).toBeInTheDocument();
    });

    it('should handle blueprint upload successfully', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Add Blueprint' }));
      await user.type(screen.getByLabelText('Blueprint Name'), 'New Blueprint');
      await user.type(screen.getByLabelText('Version'), '1.0');
      await user.upload(screen.getByLabelText('Upload File'), mockFile);
      await user.click(screen.getByRole('button', { name: 'Upload' }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
        expect(screen.getByText('Blueprint uploaded successfully')).toBeInTheDocument();
      });
    });

    it('should show error when blueprint upload fails', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Add Blueprint' }));
      await user.type(screen.getByLabelText('Blueprint Name'), 'New Blueprint');
      await user.click(screen.getByRole('button', { name: 'Upload' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to upload blueprint')).toBeInTheDocument();
      });
    });

    it('should validate blueprint form fields before submission', async () => {
      const user = userEvent.setup();
      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Add Blueprint' }));
      await user.click(screen.getByRole('button', { name: 'Upload' }));

      expect(await screen.findByText('Blueprint name is required')).toBeInTheDocument();
      expect(screen.getByText('File is required')).toBeInTheDocument();
    });
  });

  describe('Project Status Management', () => {
    it('should allow changing project status', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn();
      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          ...mockProjects,
          currentProject: mockProjects[0],
          updateProject: mockUpdate,
        },
      });

      const statusButton = screen.getByRole('button', { name: /active/i });
      await user.click(statusButton);
      await user.click(screen.getByRole('menuitem', { name: 'Completed' }));

      expect(mockUpdate).toHaveBeenCalledWith('1', { status: 'completed' });
    });

    it('should show confirmation dialog before deleting project', async () => {
      const user = userEvent.setup();
      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Project Actions' }));
      await user.click(screen.getByRole('menuitem', { name: 'Delete Project' }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this project?')).toBeInTheDocument();
    });

    it('should delete project when confirmed', async () => {
      const user = userEvent.setup();
      const mockDelete = jest.fn();
      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          ...mockProjects,
          currentProject: mockProjects[0],
          deleteProject: mockDelete,
        },
      });

      await user.click(screen.getByRole('button', { name: 'Project Actions' }));
      await user.click(screen.getByRole('menuitem', { name: 'Delete Project' }));
      await user.click(screen.getByRole('button', { name: 'Confirm Delete' }));

      expect(mockDelete).toHaveBeenCalledWith('1');
    });
  });

  describe('3D Model Viewer', () => {
    it('should display 3D model viewer when available', () => {
      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          ...mockProjects,
          currentProject: {
            ...mockProjects[0],
            modelUrl: '/model.glb',
          },
        },
      });

      expect(screen.getByTestId('3d-model-viewer')).toBeInTheDocument();
    });

    it('should show placeholder when no 3D model is available', () => {
      renderWithContext(<CoreFunctionality />);

      expect(screen.getByText('No 3D model available')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Upload 3D Model' })).toBeInTheDocument();
    });

    it('should handle 3D model upload', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['dummy content'], 'model.glb', { type: 'model/gltf-binary' });
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Upload 3D Model' }));
      await user.upload(screen.getByLabelText('Upload 3D Model File'), mockFile);
      await user.click(screen.getByRole('button', { name: 'Upload Model' }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
        expect(screen.getByText('3D model uploaded successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Collaboration Features', () => {
    it('should display team members list', () => {
      const projectWithTeam = {
        ...mockProjects[0],
        team: [
          { id: 'user1', name: 'Architect User', role: 'architect' },
          { id: 'user2', name: 'Structural Engineer', role: 'engineer' },
        ],
      };

      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          ...mockProjects,
          currentProject: projectWithTeam,
        },
      });

      expect(screen.getByText('Team Members')).toBeInTheDocument();
      expect(screen.getByText('Architect User')).toBeInTheDocument();
      expect(screen.getByText('Structural Engineer')).toBeInTheDocument();
    });

    it('should allow adding new team members', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Add Team Member' }));
      await user.type(screen.getByLabelText('Email'), 'engineer@example.com');
      await user.selectOptions(screen.getByLabelText('Role'), 'engineer');
      await user.click(screen.getByRole('button', { name: 'Add Member' }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            email: 'engineer@example.com',
            role: 'engineer',
          })
        );
      });
    });

    it('should show error when adding team member fails', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockRejectedValue(new Error('Failed to add member'));

      renderWithContext(<CoreFunctionality />);

      await user.click(screen.getByRole('button', { name: 'Add Team Member' }));
      await user.type(screen.getByLabelText('Email'), 'invalid@example.com');
      await user.click(screen.getByRole('button', { name: 'Add Member' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to add team member')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', () => {
      renderWithContext(<CoreFunctionality />);

      expect(screen.getByRole('button', { name: 'Add Blueprint' })).toHaveAttribute('aria-label', 'Add new blueprint');
      expect(screen.getByRole('button', { name: 'Project Actions' })).toHaveAttribute('aria-haspopup', 'true');
      expect(screen.getByLabelText('Select project')).toHaveAttribute('aria-label', 'Select project');
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithContext(<CoreFunctionality />);

      await user.tab();
      expect(screen.getByRole('button', { name: 'Add Blueprint' })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: 'Project Actions' })).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should have proper contrast ratios for text elements', () => {
      renderWithContext(<CoreFunctionality />);

      const heading = screen.getByRole('heading', { name: 'Modern Villa' });
      expect(heading).toHaveStyle('color: rgb(30, 41, 59)'); // Assuming dark text on light background

      const statusBadge = screen.getByText('Active');
      expect(statusBadge).toHaveStyle('color: rgb(255, 255, 255)'); // Assuming white text on colored background
    });
  });

  describe('Error Boundaries and Recovery', () => {
    it('should handle component errors gracefully', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = CoreFunctionality;

      const BrokenComponent = () => {
        throw new Error('Test error');
      };

      renderWithContext(<BrokenComponent />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    });

    it('should recover from errors when reloaded', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      const UnstableComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <CoreFunctionality />;
      };

      const { rerender } = renderWithContext(<UnstableComponent />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      shouldThrow = false;
      await user.click(screen.getByRole('button', { name: 'Reload' }));
      rerender(<UnstableComponent />);

      expect(screen.getByText('Modern Villa')).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    it('should lazy load 3D model viewer', () => {
      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          ...mockProjects,
          currentProject: {
            ...mockProjects[0],
            modelUrl: '/model.glb',
          },
        },
      });

      // Assuming the 3D viewer is lazy loaded and shows a placeholder first
      expect(screen.getByTestId('3d-model-placeholder')).toBeInTheDocument();
    });

    it('should implement virtualized list for large blueprint collections', () => {
      const projectWithManyBlueprints = {
        ...mockProjects[0],
        blueprints: Array.from({ length: 100 }, (_, i) => ({
          id: `bp${i}`,
          name: `Blueprint ${i + 1}`,
          version: '1.0',
          fileUrl: `/blueprint${i}.pdf`,
        })),
      };

      renderWithContext(<CoreFunctionality />, {
        contextValue: {
          ...mockProjects,
          currentProject: projectWithManyBlueprints,
        },
      });

      // Check that only a subset of items are rendered (virtualization)
      const blueprintItems = screen.getAllByRole('listitem');
      expect(blueprintItems.length).toBeLessThan(100);
      expect(blueprintItems.length).toBeGreaterThan(0);
    });
  });
});