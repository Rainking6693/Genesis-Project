import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act } from 'react-dom/test-utils';
import CoreFunctionality from './CoreFunctionality';
import { ProjectContext } from '../../context/ProjectContext';
import { NotificationContext } from '../../context/NotificationContext';
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
    status: 'planning',
    budget: 500000,
    deadline: '2023-12-31',
    architect: 'architect1@example.com',
    client: 'client1@example.com',
    blueprints: [
      { id: 'bp1', name: 'Floor Plan', version: 1, fileUrl: '/floorplan.pdf', updatedAt: '2023-01-01' },
      { id: 'bp2', name: 'Elevation', version: 2, fileUrl: '/elevation.pdf', updatedAt: '2023-01-15' },
    ],
  },
  {
    id: '2',
    name: 'Urban Office',
    status: 'construction',
    budget: 1200000,
    deadline: '2024-06-30',
    architect: 'architect2@example.com',
    client: 'client2@example.com',
    blueprints: [],
  },
];

const mockUsers = [
  { id: '1', email: 'architect1@example.com', name: 'Architect One', role: 'architect' },
  { id: '2', email: 'client1@example.com', name: 'Client One', role: 'client' },
  { id: '3', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
];

const renderWithContexts = (
  ui: React.ReactElement,
  {
    projectValue = { projects: mockProjects, loading: false, error: null, addProject: jest.fn(), updateProject: jest.fn(), deleteProject: jest.fn() },
    authValue = { user: mockUsers[0], loading: false, error: null, login: jest.fn(), logout: jest.fn() },
    notificationValue = { showNotification: jest.fn() },
    route = '/projects/1',
  } = {}
) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <ProjectContext.Provider value={projectValue}>
        <NotificationContext.Provider value={notificationValue}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="/projects/:projectId" element={ui} />
              <Route path="/projects" element={<div>Projects List</div>} />
            </Routes>
          </MemoryRouter>
        </NotificationContext.Provider>
      </ProjectContext.Provider>
    </AuthContext.Provider>
  );
};

describe('CoreFunctionality - Project Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Project Viewing', () => {
    it('should display project details when loaded', async () => {
      renderWithContexts(<CoreFunctionality />);

      expect(screen.getByText('Modern Villa')).toBeInTheDocument();
      expect(screen.getByText('Planning')).toBeInTheDocument();
      expect(screen.getByText('$500,000')).toBeInTheDocument();
      expect(screen.getByText('Dec 31, 2023')).toBeInTheDocument();
      expect(screen.getByText('Floor Plan')).toBeInTheDocument();
      expect(screen.getByText('Elevation')).toBeInTheDocument();
    });

    it('should show loading skeleton when projects are loading', () => {
      renderWithContexts(<CoreFunctionality />, {
        projectValue: { projects: [], loading: true, error: null },
      });

      expect(screen.getByTestId('project-skeleton')).toBeInTheDocument();
    });

    it('should display error message when project load fails', () => {
      renderWithContexts(<CoreFunctionality />, {
        projectValue: { projects: [], loading: false, error: 'Failed to load projects' },
      });

      expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
    });

    it('should be accessible with proper ARIA attributes', () => {
      renderWithContexts(<CoreFunctionality />);

      expect(screen.getByRole('heading', { name: 'Modern Villa' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'project-details' })).toBeInTheDocument();
      expect(screen.getByRole('table', { name: 'blueprints' })).toBeInTheDocument();
    });
  });

  describe('Project Editing', () => {
    it('should allow editing project details', async () => {
      const user = userEvent.setup();
      const updateProject = jest.fn().mockResolvedValue({ ...mockProjects[0], name: 'Updated Villa' });

      renderWithContexts(<CoreFunctionality />, {
        projectValue: { ...ProjectContext, updateProject },
      });

      const editButton = screen.getByRole('button', { name: /edit project/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/project name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Villa');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(updateProject).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'Updated Villa' }));
        expect(screen.getByText('Updated Villa')).toBeInTheDocument();
      });
    });

    it('should show validation errors for invalid input', async () => {
      const user = userEvent.setup();

      renderWithContexts(<CoreFunctionality />);

      const editButton = screen.getByRole('button', { name: /edit project/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/project name/i);
      await user.clear(nameInput);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(await screen.findByText('Project name is required')).toBeInTheDocument();
    });

    it('should handle edit errors gracefully', async () => {
      const user = userEvent.setup();
      const updateProject = jest.fn().mockRejectedValue(new Error('Update failed'));

      renderWithContexts(<CoreFunctionality />, {
        projectValue: { ...ProjectContext, updateProject },
        notificationValue: { showNotification: jest.fn() },
      });

      const editButton = screen.getByRole('button', { name: /edit project/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/project name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Villa');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });
    });
  });

  describe('Blueprint Management', () => {
    it('should allow uploading new blueprints', async () => {
      const user = userEvent.setup();
      const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          id: 'bp3',
          name: 'test.pdf',
          version: 1,
          fileUrl: '/test.pdf',
          updatedAt: new Date().toISOString(),
        },
      });

      renderWithContexts(<CoreFunctionality />);

      const uploadInput = screen.getByLabelText(/upload blueprint/i);
      await user.upload(uploadInput, file);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    });

    it('should show error for invalid file types', async () => {
      const user = userEvent.setup();
      const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });

      renderWithContexts(<CoreFunctionality />);

      const uploadInput = screen.getByLabelText(/upload blueprint/i);
      await user.upload(uploadInput, file);

      expect(await screen.findByText('Only PDF files are allowed')).toBeInTheDocument();
    });

    it('should allow downloading blueprints', async () => {
      const user = userEvent.setup();
      window.URL.createObjectURL = jest.fn();

      renderWithContexts(<CoreFunctionality />);

      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      await user.click(downloadButtons[0]);

      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should allow deleting blueprints', async () => {
      const user = userEvent.setup();
      (axios.delete as jest.Mock).mockResolvedValue({});

      renderWithContexts(<CoreFunctionality />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalled();
        expect(screen.queryByText('Floor Plan')).not.toBeInTheDocument();
      });
    });
  });

  describe('Status Management', () => {
    it('should allow changing project status', async () => {
      const user = userEvent.setup();
      const updateProject = jest.fn().mockResolvedValue({
        ...mockProjects[0],
        status: 'construction',
      });

      renderWithContexts(<CoreFunctionality />, {
        projectValue: { ...ProjectContext, updateProject },
      });

      const statusButton = screen.getByRole('button', { name: /planning/i });
      await user.click(statusButton);

      const constructionOption = screen.getByRole('option', { name: /construction/i });
      await user.click(constructionOption);

      await waitFor(() => {
        expect(updateProject).toHaveBeenCalledWith('1', expect.objectContaining({ status: 'construction' }));
        expect(screen.getByText('Construction')).toBeInTheDocument();
      });
    });

    it('should show confirmation for status changes that require it', async () => {
      const user = userEvent.setup();

      renderWithContexts(<CoreFunctionality />, {
        projectValue: {
          projects: [{
            ...mockProjects[0],
            status: 'construction',
          }],
          loading: false,
          error: null,
          addProject: jest.fn(),
          updateProject: jest.fn(),
          deleteProject: jest.fn(),
        },
      });

      const statusButton = screen.getByRole('button', { name: /construction/i });
      await user.click(statusButton);

      const completedOption = screen.getByRole('option', { name: /completed/i });
      await user.click(completedOption);

      expect(screen.getByText(/confirm status change/i)).toBeInTheDocument();
    });
  });

  describe('Collaboration Features', () => {
    it('should display collaboration options for architects', async () => {
      renderWithContexts(<CoreFunctionality />, {
        authValue: { user: mockUsers[0] },
      });

      expect(screen.getByRole('button', { name: /invite collaborator/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share project/i })).toBeInTheDocument();
    });

    it('should restrict certain actions for clients', () => {
      renderWithContexts(<CoreFunctionality />, {
        authValue: { user: mockUsers[1] },
      });

      expect(screen.queryByRole('button', { name: /invite collaborator/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /edit project/i })).not.toBeInTheDocument();
    });

    it('should allow sending messages to collaborators', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockResolvedValue({});

      renderWithContexts(<CoreFunctionality />);

      const messageButton = screen.getByRole('button', { name: /send message/i });
      await user.click(messageButton);

      const messageInput = screen.getByLabelText(/message/i);
      await user.type(messageInput, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(expect.any(String), {
          projectId: '1',
          message: 'Test message',
        });
      });
    });
  });

  describe('Navigation and Routing', () => {
    it('should navigate back to projects list when back button is clicked', async () => {
      const user = userEvent.setup();
      const navigate = jest.fn();

      jest.requireActual('react-router-dom').useNavigate.mockReturnValue(navigate);

      renderWithContexts(<CoreFunctionality />);

      const backButton = screen.getByRole('button', { name: /back to projects/i });
      await user.click(backButton);

      expect(navigate).toHaveBeenCalledWith('/projects');
    });

    it('should handle 404 when project not found', () => {
      renderWithContexts(<CoreFunctionality />, {
        projectValue: { projects: [], loading: false, error: null },
        route: '/projects/999',
      });

      expect(screen.getByText(/project not found/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithContexts(<CoreFunctionality />);

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-layout')).not.toBeInTheDocument();
    });

    it('should show mobile menu toggle on small screens', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithContexts(<CoreFunctionality />);

      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper focus management', async () => {
      const user = userEvent.setup();

      renderWithContexts(<CoreFunctionality />);

      const editButton = screen.getByRole('button', { name: /edit project/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/project name/i);
      expect(nameInput).toHaveFocus();
    });

    it('should have proper keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithContexts(<CoreFunctionality />);

      await user.tab();
      expect(screen.getByRole('button', { name: /edit project/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /invite collaborator/i })).toHaveFocus();
    });

    it('should have proper ARIA labels for interactive elements', () => {
      renderWithContexts(<CoreFunctionality />);

      expect(screen.getByRole('button', { name: /edit project/i })).toHaveAttribute('aria-label', 'Edit project details');
      expect(screen.getByRole('button', { name: /delete blueprint/i })).toHaveAttribute('aria-label', 'Delete Floor Plan blueprint');
    });
  });

  describe('Performance', () => {
    it('should implement virtualization for long blueprint lists', () => {
      const longProject = {
        ...mockProjects[0],
        blueprints: Array.from({ length: 100 }, (_, i) => ({
          id: `bp${i}`,
          name: `Blueprint ${i}`,
          version: 1,
          fileUrl: `/bp${i}.pdf`,
          updatedAt: new Date().toISOString(),
        })),
      };

      renderWithContexts(<CoreFunctionality />, {
        projectValue: { projects: [longProject], loading: false, error: null },
      });

      // Check that not all items are rendered initially
      const blueprintRows = screen.queryAllByRole('row');
      expect(blueprintRows.length).toBeLessThan(100);
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act } from 'react-dom/test-utils';
import CoreFunctionality from './CoreFunctionality';
import { ProjectContext } from '../../context/ProjectContext';
import { NotificationContext } from '../../context/NotificationContext';
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
    status: 'planning',
    budget: 500000,
    deadline: '2023-12-31',
    architect: 'architect1@example.com',
    client: 'client1@example.com',
    blueprints: [
      { id: 'bp1', name: 'Floor Plan', version: 1, fileUrl: '/floorplan.pdf', updatedAt: '2023-01-01' },
      { id: 'bp2', name: 'Elevation', version: 2, fileUrl: '/elevation.pdf', updatedAt: '2023-01-15' },
    ],
  },
  {
    id: '2',
    name: 'Urban Office',
    status: 'construction',
    budget: 1200000,
    deadline: '2024-06-30',
    architect: 'architect2@example.com',
    client: 'client2@example.com',
    blueprints: [],
  },
];

const mockUsers = [
  { id: '1', email: 'architect1@example.com', name: 'Architect One', role: 'architect' },
  { id: '2', email: 'client1@example.com', name: 'Client One', role: 'client' },
  { id: '3', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
];

const renderWithContexts = (
  ui: React.ReactElement,
  {
    projectValue = { projects: mockProjects, loading: false, error: null, addProject: jest.fn(), updateProject: jest.fn(), deleteProject: jest.fn() },
    authValue = { user: mockUsers[0], loading: false, error: null, login: jest.fn(), logout: jest.fn() },
    notificationValue = { showNotification: jest.fn() },
    route = '/projects/1',
  } = {}
) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <ProjectContext.Provider value={projectValue}>
        <NotificationContext.Provider value={notificationValue}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="/projects/:projectId" element={ui} />
              <Route path="/projects" element={<div>Projects List</div>} />
            </Routes>
          </MemoryRouter>
        </NotificationContext.Provider>
      </ProjectContext.Provider>
    </AuthContext.Provider>
  );
};

describe('CoreFunctionality - Project Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Project Viewing', () => {
    it('should display project details when loaded', async () => {
      renderWithContexts(<CoreFunctionality />);

      expect(screen.getByText('Modern Villa')).toBeInTheDocument();
      expect(screen.getByText('Planning')).toBeInTheDocument();
      expect(screen.getByText('$500,000')).toBeInTheDocument();
      expect(screen.getByText('Dec 31, 2023')).toBeInTheDocument();
      expect(screen.getByText('Floor Plan')).toBeInTheDocument();
      expect(screen.getByText('Elevation')).toBeInTheDocument();
    });

    it('should show loading skeleton when projects are loading', () => {
      renderWithContexts(<CoreFunctionality />, {
        projectValue: { projects: [], loading: true, error: null },
      });

      expect(screen.getByTestId('project-skeleton')).toBeInTheDocument();
    });

    it('should display error message when project load fails', () => {
      renderWithContexts(<CoreFunctionality />, {
        projectValue: { projects: [], loading: false, error: 'Failed to load projects' },
      });

      expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
    });

    it('should be accessible with proper ARIA attributes', () => {
      renderWithContexts(<CoreFunctionality />);

      expect(screen.getByRole('heading', { name: 'Modern Villa' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'project-details' })).toBeInTheDocument();
      expect(screen.getByRole('table', { name: 'blueprints' })).toBeInTheDocument();
    });
  });

  describe('Project Editing', () => {
    it('should allow editing project details', async () => {
      const user = userEvent.setup();
      const updateProject = jest.fn().mockResolvedValue({ ...mockProjects[0], name: 'Updated Villa' });

      renderWithContexts(<CoreFunctionality />, {
        projectValue: { ...ProjectContext, updateProject },
      });

      const editButton = screen.getByRole('button', { name: /edit project/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/project name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Villa');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(updateProject).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'Updated Villa' }));
        expect(screen.getByText('Updated Villa')).toBeInTheDocument();
      });
    });

    it('should show validation errors for invalid input', async () => {
      const user = userEvent.setup();

      renderWithContexts(<CoreFunctionality />);

      const editButton = screen.getByRole('button', { name: /edit project/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/project name/i);
      await user.clear(nameInput);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(await screen.findByText('Project name is required')).toBeInTheDocument();
    });

    it('should handle edit errors gracefully', async () => {
      const user = userEvent.setup();
      const updateProject = jest.fn().mockRejectedValue(new Error('Update failed'));

      renderWithContexts(<CoreFunctionality />, {
        projectValue: { ...ProjectContext, updateProject },
        notificationValue: { showNotification: jest.fn() },
      });

      const editButton = screen.getByRole('button', { name: /edit project/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/project name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Villa');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });
    });
  });

  describe('Blueprint Management', () => {
    it('should allow uploading new blueprints', async () => {
      const user = userEvent.setup();
      const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          id: 'bp3',
          name: 'test.pdf',
          version: 1,
          fileUrl: '/test.pdf',
          updatedAt: new Date().toISOString(),
        },
      });

      renderWithContexts(<CoreFunctionality />);

      const uploadInput = screen.getByLabelText(/upload blueprint/i);
      await user.upload(uploadInput, file);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    });

    it('should show error for invalid file types', async () => {
      const user = userEvent.setup();
      const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });

      renderWithContexts(<CoreFunctionality />);

      const uploadInput = screen.getByLabelText(/upload blueprint/i);
      await user.upload(uploadInput, file);

      expect(await screen.findByText('Only PDF files are allowed')).toBeInTheDocument();
    });

    it('should allow downloading blueprints', async () => {
      const user = userEvent.setup();
      window.URL.createObjectURL = jest.fn();

      renderWithContexts(<CoreFunctionality />);

      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      await user.click(downloadButtons[0]);

      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should allow deleting blueprints', async () => {
      const user = userEvent.setup();
      (axios.delete as jest.Mock).mockResolvedValue({});

      renderWithContexts(<CoreFunctionality />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalled();
        expect(screen.queryByText('Floor Plan')).not.toBeInTheDocument();
      });
    });
  });

  describe('Status Management', () => {
    it('should allow changing project status', async () => {
      const user = userEvent.setup();
      const updateProject = jest.fn().mockResolvedValue({
        ...mockProjects[0],
        status: 'construction',
      });

      renderWithContexts(<CoreFunctionality />, {
        projectValue: { ...ProjectContext, updateProject },
      });

      const statusButton = screen.getByRole('button', { name: /planning/i });
      await user.click(statusButton);

      const constructionOption = screen.getByRole('option', { name: /construction/i });
      await user.click(constructionOption);

      await waitFor(() => {
        expect(updateProject).toHaveBeenCalledWith('1', expect.objectContaining({ status: 'construction' }));
        expect(screen.getByText('Construction')).toBeInTheDocument();
      });
    });

    it('should show confirmation for status changes that require it', async () => {
      const user = userEvent.setup();

      renderWithContexts(<CoreFunctionality />, {
        projectValue: {
          projects: [{
            ...mockProjects[0],
            status: 'construction',
          }],
          loading: false,
          error: null,
          addProject: jest.fn(),
          updateProject: jest.fn(),
          deleteProject: jest.fn(),
        },
      });

      const statusButton = screen.getByRole('button', { name: /construction/i });
      await user.click(statusButton);

      const completedOption = screen.getByRole('option', { name: /completed/i });
      await user.click(completedOption);

      expect(screen.getByText(/confirm status change/i)).toBeInTheDocument();
    });
  });

  describe('Collaboration Features', () => {
    it('should display collaboration options for architects', async () => {
      renderWithContexts(<CoreFunctionality />, {
        authValue: { user: mockUsers[0] },
      });

      expect(screen.getByRole('button', { name: /invite collaborator/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share project/i })).toBeInTheDocument();
    });

    it('should restrict certain actions for clients', () => {
      renderWithContexts(<CoreFunctionality />, {
        authValue: { user: mockUsers[1] },
      });

      expect(screen.queryByRole('button', { name: /invite collaborator/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /edit project/i })).not.toBeInTheDocument();
    });

    it('should allow sending messages to collaborators', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockResolvedValue({});

      renderWithContexts(<CoreFunctionality />);

      const messageButton = screen.getByRole('button', { name: /send message/i });
      await user.click(messageButton);

      const messageInput = screen.getByLabelText(/message/i);
      await user.type(messageInput, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(expect.any(String), {
          projectId: '1',
          message: 'Test message',
        });
      });
    });
  });

  describe('Navigation and Routing', () => {
    it('should navigate back to projects list when back button is clicked', async () => {
      const user = userEvent.setup();
      const navigate = jest.fn();

      jest.requireActual('react-router-dom').useNavigate.mockReturnValue(navigate);

      renderWithContexts(<CoreFunctionality />);

      const backButton = screen.getByRole('button', { name: /back to projects/i });
      await user.click(backButton);

      expect(navigate).toHaveBeenCalledWith('/projects');
    });

    it('should handle 404 when project not found', () => {
      renderWithContexts(<CoreFunctionality />, {
        projectValue: { projects: [], loading: false, error: null },
        route: '/projects/999',
      });

      expect(screen.getByText(/project not found/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithContexts(<CoreFunctionality />);

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-layout')).not.toBeInTheDocument();
    });

    it('should show mobile menu toggle on small screens', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithContexts(<CoreFunctionality />);

      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper focus management', async () => {
      const user = userEvent.setup();

      renderWithContexts(<CoreFunctionality />);

      const editButton = screen.getByRole('button', { name: /edit project/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/project name/i);
      expect(nameInput).toHaveFocus();
    });

    it('should have proper keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithContexts(<CoreFunctionality />);

      await user.tab();
      expect(screen.getByRole('button', { name: /edit project/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /invite collaborator/i })).toHaveFocus();
    });

    it('should have proper ARIA labels for interactive elements', () => {
      renderWithContexts(<CoreFunctionality />);

      expect(screen.getByRole('button', { name: /edit project/i })).toHaveAttribute('aria-label', 'Edit project details');
      expect(screen.getByRole('button', { name: /delete blueprint/i })).toHaveAttribute('aria-label', 'Delete Floor Plan blueprint');
    });
  });

  describe('Performance', () => {
    it('should implement virtualization for long blueprint lists', () => {
      const longProject = {
        ...mockProjects[0],
        blueprints: Array.from({ length: 100 }, (_, i) => ({
          id: `bp${i}`,
          name: `Blueprint ${i}`,
          version: 1,
          fileUrl: `/bp${i}.pdf`,
          updatedAt: new Date().toISOString(),
        })),
      };

      renderWithContexts(<CoreFunctionality />, {
        projectValue: { projects: [longProject], loading: false, error: null },
      });

      // Check that not all items are rendered initially
      const blueprintRows = screen.queryAllByRole('row');
      expect(blueprintRows.length).toBeLessThan(100);
    });
  });
});