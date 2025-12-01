import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DesignArchitecture from './DesignArchitecture';
import { ArchitectureContext } from '../../context/ArchitectureContext';
import { ToastContainer } from 'react-toastify';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '123', role: 'architect' } }),
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockProjects = [
  { id: '1', name: 'Modern Villa', status: 'active', client: 'Client A' },
  { id: '2', name: 'Urban Office', status: 'completed', client: 'Client B' },
];

const mockDesignTools = [
  { id: '1', name: 'AutoCAD', version: '2023', license: 'pro' },
  { id: '2', name: 'SketchUp', version: '2022', license: 'free' },
];

const mockContextValue = {
  projects: mockProjects,
  designTools: mockDesignTools,
  loading: false,
  error: null,
  addProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  addDesignTool: jest.fn(),
  updateDesignTool: jest.fn(),
  deleteDesignTool: jest.fn(),
  fetchProjects: jest.fn(),
  fetchDesignTools: jest.fn(),
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (route = '/') => {
    render(
      <ArchitectureContext.Provider value={mockContextValue}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/" element={<DesignArchitecture />} />
            <Route path="/projects/:id" element={<div>Project Detail</div>} />
            <Route path="/tools" element={<div>Design Tools</div>} />
          </Routes>
        </MemoryRouter>
        <ToastContainer />
      </ArchitectureContext.Provider>
    );
  };

  describe('Rendering and Initial State', () => {
    it('should render the main heading', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /design architecture dashboard/i })).toBeInTheDocument();
    });

    it('should display loading skeleton when data is loading', () => {
      render(
        <ArchitectureContext.Provider value={{ ...mockContextValue, loading: true }}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );
      expect(screen.getByTestId('projects-loading')).toBeInTheDocument();
      expect(screen.getByTestId('tools-loading')).toBeInTheDocument();
    });

    it('should display error message when there is an error', () => {
      render(
        <ArchitectureContext.Provider value={{ ...mockContextValue, error: 'Failed to fetch data' }}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );
      expect(screen.getByText(/failed to fetch data/i)).toBeInTheDocument();
    });
  });

  describe('Projects Section', () => {
    it('should display all projects in a list', () => {
      renderComponent();
      mockProjects.forEach(project => {
        expect(screen.getByText(project.name)).toBeInTheDocument();
        expect(screen.getByText(project.client)).toBeInTheDocument();
        expect(screen.getByText(project.status)).toBeInTheDocument();
      });
    });

    it('should navigate to project detail when a project is clicked', async () => {
      renderComponent();
      const projectItems = screen.getAllByRole('listitem');
      await userEvent.click(projectItems[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/projects/1');
    });

    it('should open add project modal when add button is clicked', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /add new project/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    });

    it('should submit new project form successfully', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { id: '3', name: 'New Project' } });
      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: /add new project/i }));

      await userEvent.type(screen.getByLabelText(/project name/i), 'New Project');
      await userEvent.type(screen.getByLabelText(/client name/i), 'Client C');
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'planning');
      await userEvent.type(screen.getByLabelText(/description/i), 'Test description');

      await userEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockContextValue.addProject).toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should show validation errors when submitting invalid project form', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /add new project/i }));
      await userEvent.click(screen.getByRole('button', { name: /submit/i }));

      expect(await screen.findByText(/project name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/client name is required/i)).toBeInTheDocument();
    });

    it('should handle project form submission error', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Submission failed'));
      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: /add new project/i }));
      await userEvent.type(screen.getByLabelText(/project name/i), 'New Project');
      await userEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to add project/i)).toBeInTheDocument();
      });
    });
  });

  describe('Design Tools Section', () => {
    it('should display all design tools', () => {
      renderComponent();
      mockDesignTools.forEach(tool => {
        expect(screen.getByText(tool.name)).toBeInTheDocument();
        expect(screen.getByText(tool.version)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(tool.license, 'i'))).toBeInTheDocument();
      });
    });

    it('should navigate to tools management page when manage tools button is clicked', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /manage design tools/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/tools');
    });

    it('should filter tools by license type', async () => {
      renderComponent();
      await userEvent.selectOptions(screen.getByLabelText(/filter by license/i), 'pro');
      expect(screen.getByText('AutoCAD')).toBeInTheDocument();
      expect(screen.queryByText('SketchUp')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderComponent();
      expect(screen.getByLabelText(/filter projects by status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter tools by license/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add new project/i })).toHaveAttribute('aria-label', 'Add new architecture project');
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();
      await userEvent.tab();
      expect(screen.getByLabelText(/filter projects by status/i)).toHaveFocus();

      await userEvent.tab();
      await userEvent.tab();
      expect(screen.getByRole('button', { name: /add new project/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      renderComponent();
      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      });
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    it('should handle empty projects list gracefully', () => {
      render(
        <ArchitectureContext.Provider value={{ ...mockContextValue, projects: [] }}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );
      expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
    });

    it('should handle empty design tools list gracefully', () => {
      render(
        <ArchitectureContext.Provider value={{ ...mockContextValue, designTools: [] }}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );
      expect(screen.getByText(/no design tools available/i)).toBeInTheDocument();
    });

    it('should disable add project button when user is not an architect', () => {
      jest.mock('../../hooks/useAuth', () => ({
        useAuth: () => ({ user: { id: '123', role: 'client' } }),
      }));

      renderComponent();
      expect(screen.getByRole('button', { name: /add new project/i })).toBeDisabled();
    });
  });

  describe('Project Management Features', () => {
    it('should allow editing an existing project', async () => {
      renderComponent();
      const editButtons = screen.getAllByLabelText(/edit project/i);
      await userEvent.click(editButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Modern Villa')).toBeInTheDocument();

      await userEvent.clear(screen.getByLabelText(/project name/i));
      await userEvent.type(screen.getByLabelText(/project name/i), 'Updated Modern Villa');
      await userEvent.click(screen.getByRole('button', { name: /update/i }));

      await waitFor(() => {
        expect(mockContextValue.updateProject).toHaveBeenCalled();
      });
    });

    it('should allow deleting a project with confirmation', async () => {
      window.confirm = jest.fn(() => true);
      renderComponent();

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockContextValue.deleteProject).toHaveBeenCalledWith('1');
      });
    });

    it('should not delete project when confirmation is cancelled', async () => {
      window.confirm = jest.fn(() => false);
      renderComponent();

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockContextValue.deleteProject).not.toHaveBeenCalled();
      });
    });

    it('should filter projects by status', async () => {
      renderComponent();
      await userEvent.selectOptions(screen.getByLabelText(/filter projects by status/i), 'completed');
      expect(screen.getByText('Urban Office')).toBeInTheDocument();
      expect(screen.queryByText('Modern Villa')).not.toBeInTheDocument();
    });
  });

  describe('Data Export Features', () => {
    it('should export projects data as CSV', async () => {
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
      const mockUrl = 'blob:url';
      jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /export projects/i }));

      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    });

    it('should handle export error gracefully', async () => {
      jest.spyOn(URL, 'createObjectURL').mockImplementation(() => {
        throw new Error('Export failed');
      });

      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /export projects/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to export projects/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile view', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));
      renderComponent();

      const mobileElements = screen.getAllByTestId('mobile-card');
      expect(mobileElements.length).toBeGreaterThan(0);
    });

    it('should show mobile menu when screen is small', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));
      renderComponent();

      await userEvent.click(screen.getByLabelText(/open menu/i));
      expect(screen.getByRole('navigation')).toBeInTheDocument();
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
import { ToastContainer } from 'react-toastify';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '123', role: 'architect' } }),
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockProjects = [
  { id: '1', name: 'Modern Villa', status: 'active', client: 'Client A' },
  { id: '2', name: 'Urban Office', status: 'completed', client: 'Client B' },
];

const mockDesignTools = [
  { id: '1', name: 'AutoCAD', version: '2023', license: 'pro' },
  { id: '2', name: 'SketchUp', version: '2022', license: 'free' },
];

const mockContextValue = {
  projects: mockProjects,
  designTools: mockDesignTools,
  loading: false,
  error: null,
  addProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  addDesignTool: jest.fn(),
  updateDesignTool: jest.fn(),
  deleteDesignTool: jest.fn(),
  fetchProjects: jest.fn(),
  fetchDesignTools: jest.fn(),
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (route = '/') => {
    render(
      <ArchitectureContext.Provider value={mockContextValue}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/" element={<DesignArchitecture />} />
            <Route path="/projects/:id" element={<div>Project Detail</div>} />
            <Route path="/tools" element={<div>Design Tools</div>} />
          </Routes>
        </MemoryRouter>
        <ToastContainer />
      </ArchitectureContext.Provider>
    );
  };

  describe('Rendering and Initial State', () => {
    it('should render the main heading', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /design architecture dashboard/i })).toBeInTheDocument();
    });

    it('should display loading skeleton when data is loading', () => {
      render(
        <ArchitectureContext.Provider value={{ ...mockContextValue, loading: true }}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );
      expect(screen.getByTestId('projects-loading')).toBeInTheDocument();
      expect(screen.getByTestId('tools-loading')).toBeInTheDocument();
    });

    it('should display error message when there is an error', () => {
      render(
        <ArchitectureContext.Provider value={{ ...mockContextValue, error: 'Failed to fetch data' }}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );
      expect(screen.getByText(/failed to fetch data/i)).toBeInTheDocument();
    });
  });

  describe('Projects Section', () => {
    it('should display all projects in a list', () => {
      renderComponent();
      mockProjects.forEach(project => {
        expect(screen.getByText(project.name)).toBeInTheDocument();
        expect(screen.getByText(project.client)).toBeInTheDocument();
        expect(screen.getByText(project.status)).toBeInTheDocument();
      });
    });

    it('should navigate to project detail when a project is clicked', async () => {
      renderComponent();
      const projectItems = screen.getAllByRole('listitem');
      await userEvent.click(projectItems[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/projects/1');
    });

    it('should open add project modal when add button is clicked', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /add new project/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    });

    it('should submit new project form successfully', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { id: '3', name: 'New Project' } });
      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: /add new project/i }));

      await userEvent.type(screen.getByLabelText(/project name/i), 'New Project');
      await userEvent.type(screen.getByLabelText(/client name/i), 'Client C');
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'planning');
      await userEvent.type(screen.getByLabelText(/description/i), 'Test description');

      await userEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockContextValue.addProject).toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should show validation errors when submitting invalid project form', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /add new project/i }));
      await userEvent.click(screen.getByRole('button', { name: /submit/i }));

      expect(await screen.findByText(/project name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/client name is required/i)).toBeInTheDocument();
    });

    it('should handle project form submission error', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Submission failed'));
      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: /add new project/i }));
      await userEvent.type(screen.getByLabelText(/project name/i), 'New Project');
      await userEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to add project/i)).toBeInTheDocument();
      });
    });
  });

  describe('Design Tools Section', () => {
    it('should display all design tools', () => {
      renderComponent();
      mockDesignTools.forEach(tool => {
        expect(screen.getByText(tool.name)).toBeInTheDocument();
        expect(screen.getByText(tool.version)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(tool.license, 'i'))).toBeInTheDocument();
      });
    });

    it('should navigate to tools management page when manage tools button is clicked', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /manage design tools/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/tools');
    });

    it('should filter tools by license type', async () => {
      renderComponent();
      await userEvent.selectOptions(screen.getByLabelText(/filter by license/i), 'pro');
      expect(screen.getByText('AutoCAD')).toBeInTheDocument();
      expect(screen.queryByText('SketchUp')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderComponent();
      expect(screen.getByLabelText(/filter projects by status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter tools by license/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add new project/i })).toHaveAttribute('aria-label', 'Add new architecture project');
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();
      await userEvent.tab();
      expect(screen.getByLabelText(/filter projects by status/i)).toHaveFocus();

      await userEvent.tab();
      await userEvent.tab();
      expect(screen.getByRole('button', { name: /add new project/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      renderComponent();
      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      });
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    it('should handle empty projects list gracefully', () => {
      render(
        <ArchitectureContext.Provider value={{ ...mockContextValue, projects: [] }}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );
      expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
    });

    it('should handle empty design tools list gracefully', () => {
      render(
        <ArchitectureContext.Provider value={{ ...mockContextValue, designTools: [] }}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );
      expect(screen.getByText(/no design tools available/i)).toBeInTheDocument();
    });

    it('should disable add project button when user is not an architect', () => {
      jest.mock('../../hooks/useAuth', () => ({
        useAuth: () => ({ user: { id: '123', role: 'client' } }),
      }));

      renderComponent();
      expect(screen.getByRole('button', { name: /add new project/i })).toBeDisabled();
    });
  });

  describe('Project Management Features', () => {
    it('should allow editing an existing project', async () => {
      renderComponent();
      const editButtons = screen.getAllByLabelText(/edit project/i);
      await userEvent.click(editButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Modern Villa')).toBeInTheDocument();

      await userEvent.clear(screen.getByLabelText(/project name/i));
      await userEvent.type(screen.getByLabelText(/project name/i), 'Updated Modern Villa');
      await userEvent.click(screen.getByRole('button', { name: /update/i }));

      await waitFor(() => {
        expect(mockContextValue.updateProject).toHaveBeenCalled();
      });
    });

    it('should allow deleting a project with confirmation', async () => {
      window.confirm = jest.fn(() => true);
      renderComponent();

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockContextValue.deleteProject).toHaveBeenCalledWith('1');
      });
    });

    it('should not delete project when confirmation is cancelled', async () => {
      window.confirm = jest.fn(() => false);
      renderComponent();

      const deleteButtons = screen.getAllByLabelText(/delete project/i);
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockContextValue.deleteProject).not.toHaveBeenCalled();
      });
    });

    it('should filter projects by status', async () => {
      renderComponent();
      await userEvent.selectOptions(screen.getByLabelText(/filter projects by status/i), 'completed');
      expect(screen.getByText('Urban Office')).toBeInTheDocument();
      expect(screen.queryByText('Modern Villa')).not.toBeInTheDocument();
    });
  });

  describe('Data Export Features', () => {
    it('should export projects data as CSV', async () => {
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
      const mockUrl = 'blob:url';
      jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /export projects/i }));

      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    });

    it('should handle export error gracefully', async () => {
      jest.spyOn(URL, 'createObjectURL').mockImplementation(() => {
        throw new Error('Export failed');
      });

      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /export projects/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to export projects/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile view', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));
      renderComponent();

      const mobileElements = screen.getAllByTestId('mobile-card');
      expect(mobileElements.length).toBeGreaterThan(0);
    });

    it('should show mobile menu when screen is small', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));
      renderComponent();

      await userEvent.click(screen.getByLabelText(/open menu/i));
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });
});