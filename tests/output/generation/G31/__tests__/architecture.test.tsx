import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { ArchitectureContext } from '../../context/ArchitectureContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('../../hooks/useApi', () => ({
  useApi: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }),
}));

const mockArchitectureData = {
  id: '1',
  name: 'Microservices Architecture',
  description: 'A collection of loosely coupled services',
  components: [
    { id: '1', name: 'API Gateway', type: 'gateway', status: 'active' },
    { id: '2', name: 'User Service', type: 'service', status: 'active' },
  ],
  connections: [
    { id: '1', source: '1', target: '2', type: 'HTTP' },
  ],
  lastUpdated: '2023-01-01T00:00:00Z',
};

const mockUser = {
  id: 'user1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'architect',
};

const renderWithProviders = (ui, { initialState = {}, route = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider initialUser={mockUser}>
        <NotificationProvider>
          <ArchitectureContext.Provider value={{ ...initialState }}>
            <Routes>
              <Route path="/" element={ui} />
              <Route path="/design/:id" element={ui} />
            </Routes>
          </ArchitectureContext.Provider>
        </NotificationProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
  });

  describe('Initial Rendering', () => {
    it('should render loading state initially', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockArchitectureData }), 1000))
      );

      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture/i)).toBeInTheDocument();
    });

    it('should render architecture details after loading', async () => {
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
        expect(screen.getByText('A collection of loosely coupled services')).toBeInTheDocument();
      });
    });

    it('should display error message when fetching fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText(/failed to load architecture/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow editing architecture name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
      });

      const editButton = screen.getByLabelText(/edit architecture name/i);
      await user.click(editButton);

      const nameInput = screen.getByRole('textbox', { name: /architecture name/i });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Architecture Name');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(axios.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: 'Updated Architecture Name',
        })
      );
    });

    it('should add a new component to the architecture', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const addComponentButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addComponentButton);

      const dialog = screen.getByRole('dialog');
      within(dialog).getByText(/add new component/i);

      const nameInput = within(dialog).getByRole('textbox', { name: /component name/i });
      await user.type(nameInput, 'New Service');

      const typeSelect = within(dialog).getByRole('combobox', { name: /component type/i });
      await user.selectOptions(typeSelect, 'service');

      const submitButton = within(dialog).getByRole('button', { name: /add/i });
      await user.click(submitButton);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: 'New Service',
          type: 'service',
        })
      );
    });

    it('should delete a component from the architecture', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('User Service')).toBeInTheDocument();
      });

      const component = screen.getByText('User Service').closest('div');
      const deleteButton = within(component!).getByLabelText(/delete component/i);
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/components/2'));
    });

    it('should create a connection between components', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
        expect(screen.getByText('User Service')).toBeInTheDocument();
      });

      const connectButton = screen.getByRole('button', { name: /connect components/i });
      await user.click(connectButton);

      const dialog = screen.getByRole('dialog');
      within(dialog).getByText(/create connection/i);

      const sourceSelect = within(dialog).getByRole('combobox', { name: /source component/i });
      await user.selectOptions(sourceSelect, 'API Gateway');

      const targetSelect = within(dialog).getByRole('combobox', { name: /target component/i });
      await user.selectOptions(targetSelect, 'User Service');

      const typeSelect = within(dialog).getByRole('combobox', { name: /connection type/i });
      await user.selectOptions(typeSelect, 'HTTP');

      const submitButton = within(dialog).getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          source: '1',
          target: '2',
          type: 'HTTP',
        })
      );
    });

    it('should delete a connection between components', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('HTTP')).toBeInTheDocument();
      });

      const connection = screen.getByText('HTTP').closest('div');
      const deleteButton = within(connection!).getByLabelText(/delete connection/i);
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/connections/1'));
    });
  });

  describe('Visualization Features', () => {
    it('should render the architecture diagram', async () => {
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByTestId('architecture-diagram')).toBeInTheDocument();
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
        expect(screen.getByText('User Service')).toBeInTheDocument();
      });
    });

    it('should highlight components on hover', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const component = screen.getByText('API Gateway').closest('div');
      await user.hover(component!);

      expect(component).toHaveClass('highlighted');
    });

    it('should show connection details on click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('HTTP')).toBeInTheDocument();
      });

      const connection = screen.getByText('HTTP').closest('div');
      await user.click(connection!);

      expect(screen.getByText(/connection details/i)).toBeInTheDocument();
      expect(screen.getByText(/source: api gateway/i)).toBeInTheDocument();
      expect(screen.getByText(/target: user service/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByLabelText(/architecture diagram/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/edit architecture name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add new component/i)).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      // Tab to first interactive element
      await user.tab();
      expect(screen.getByLabelText(/edit architecture name/i)).toHaveFocus();

      // Tab to next element
      await user.tab();
      expect(screen.getByRole('button', { name: /add component/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        const title = screen.getByText('Microservices Architecture');
        expect(title).toHaveStyle('color: rgba(0, 0, 0, 0.87)');

        const description = screen.getByText('A collection of loosely coupled services');
        expect(description).toHaveStyle('color: rgba(0, 0, 0, 0.6)');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when component addition fails', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockRejectedValue(new Error('Failed to add component'));

      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const addComponentButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addComponentButton);

      const dialog = screen.getByRole('dialog');
      const nameInput = within(dialog).getByRole('textbox', { name: /component name/i });
      await user.type(nameInput, 'New Service');

      const submitButton = within(dialog).getByRole('button', { name: /add/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to add component/i)).toBeInTheDocument();
      });
    });

    it('should show error when connection creation fails', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockRejectedValue(new Error('Failed to create connection'));

      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const connectButton = screen.getByRole('button', { name: /connect components/i });
      await user.click(connectButton);

      const dialog = screen.getByRole('dialog');
      const submitButton = within(dialog).getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create connection/i)).toBeInTheDocument();
      });
    });

    it('should handle empty architecture data gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText(/no architecture data available/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create new architecture/i })).toBeInTheDocument();
      });
    });
  });

  describe('Navigation and Routing', () => {
    it('should navigate back to architectures list', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, {
        route: '/design/1',
        initialState: { architectures: [mockArchitectureData] }
      });

      await waitFor(() => {
        expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back to architectures/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/architectures');
    });

    it('should navigate to component details when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const component = screen.getByText('API Gateway').closest('div');
      await user.click(component!);

      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/components/1'));
    });
  });

  describe('Permission Handling', () => {
    it('should disable edit buttons for view-only users', async () => {
      const viewOnlyUser = { ...mockUser, role: 'viewer' };
      renderWithProviders(<DesignArchitecture />, {
        route: '/design/1',
        initialState: { user: viewOnlyUser }
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/edit architecture name/i)).toBeDisabled();
        expect(screen.getByRole('button', { name: /add component/i })).toBeDisabled();
      });
    });

    it('should show permission error when unauthorized user tries to edit', async () => {
      const user = userEvent.setup();
      const unauthorizedUser = { ...mockUser, role: 'viewer' };
      renderWithProviders(<DesignArchitecture />, {
        route: '/design/1',
        initialState: { user: unauthorizedUser }
      });

      await waitFor(() => {
        expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
      });

      // Try to click disabled edit button
      const editButton = screen.getByLabelText(/edit architecture name/i);
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText(/you don't have permission to edit this architecture/i)).toBeInTheDocument();
      });
    });
  });

  describe('State Persistence', () => {
    it('should maintain diagram layout between sessions', async () => {
      const mockLayout = {
        positions: { '1': { x: 100, y: 200 }, '2': { x: 300, y: 400 } },
        zoom: 1.2
      };

      localStorage.setItem('architecture-1-layout', JSON.stringify(mockLayout));

      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByTestId('architecture-diagram')).toHaveAttribute(
          'data-layout',
          JSON.stringify(mockLayout)
        );
      });
    });

    it('should save diagram layout when components are moved', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const component = screen.getByText('API Gateway').closest('div');
      fireEvent.dragStart(component!);
      fireEvent.dragOver(component!, { clientX: 200, clientY: 300 });
      fireEvent.dragEnd(component!);

      await waitFor(() => {
        expect(localStorage.getItem('architecture-1-layout')).toBeTruthy();
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { ArchitectureContext } from '../../context/ArchitectureContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('../../hooks/useApi', () => ({
  useApi: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }),
}));

const mockArchitectureData = {
  id: '1',
  name: 'Microservices Architecture',
  description: 'A collection of loosely coupled services',
  components: [
    { id: '1', name: 'API Gateway', type: 'gateway', status: 'active' },
    { id: '2', name: 'User Service', type: 'service', status: 'active' },
  ],
  connections: [
    { id: '1', source: '1', target: '2', type: 'HTTP' },
  ],
  lastUpdated: '2023-01-01T00:00:00Z',
};

const mockUser = {
  id: 'user1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'architect',
};

const renderWithProviders = (ui, { initialState = {}, route = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider initialUser={mockUser}>
        <NotificationProvider>
          <ArchitectureContext.Provider value={{ ...initialState }}>
            <Routes>
              <Route path="/" element={ui} />
              <Route path="/design/:id" element={ui} />
            </Routes>
          </ArchitectureContext.Provider>
        </NotificationProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
  });

  describe('Initial Rendering', () => {
    it('should render loading state initially', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockArchitectureData }), 1000))
      );

      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture/i)).toBeInTheDocument();
    });

    it('should render architecture details after loading', async () => {
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
        expect(screen.getByText('A collection of loosely coupled services')).toBeInTheDocument();
      });
    });

    it('should display error message when fetching fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText(/failed to load architecture/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow editing architecture name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
      });

      const editButton = screen.getByLabelText(/edit architecture name/i);
      await user.click(editButton);

      const nameInput = screen.getByRole('textbox', { name: /architecture name/i });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Architecture Name');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(axios.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: 'Updated Architecture Name',
        })
      );
    });

    it('should add a new component to the architecture', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const addComponentButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addComponentButton);

      const dialog = screen.getByRole('dialog');
      within(dialog).getByText(/add new component/i);

      const nameInput = within(dialog).getByRole('textbox', { name: /component name/i });
      await user.type(nameInput, 'New Service');

      const typeSelect = within(dialog).getByRole('combobox', { name: /component type/i });
      await user.selectOptions(typeSelect, 'service');

      const submitButton = within(dialog).getByRole('button', { name: /add/i });
      await user.click(submitButton);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: 'New Service',
          type: 'service',
        })
      );
    });

    it('should delete a component from the architecture', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('User Service')).toBeInTheDocument();
      });

      const component = screen.getByText('User Service').closest('div');
      const deleteButton = within(component!).getByLabelText(/delete component/i);
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/components/2'));
    });

    it('should create a connection between components', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
        expect(screen.getByText('User Service')).toBeInTheDocument();
      });

      const connectButton = screen.getByRole('button', { name: /connect components/i });
      await user.click(connectButton);

      const dialog = screen.getByRole('dialog');
      within(dialog).getByText(/create connection/i);

      const sourceSelect = within(dialog).getByRole('combobox', { name: /source component/i });
      await user.selectOptions(sourceSelect, 'API Gateway');

      const targetSelect = within(dialog).getByRole('combobox', { name: /target component/i });
      await user.selectOptions(targetSelect, 'User Service');

      const typeSelect = within(dialog).getByRole('combobox', { name: /connection type/i });
      await user.selectOptions(typeSelect, 'HTTP');

      const submitButton = within(dialog).getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          source: '1',
          target: '2',
          type: 'HTTP',
        })
      );
    });

    it('should delete a connection between components', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('HTTP')).toBeInTheDocument();
      });

      const connection = screen.getByText('HTTP').closest('div');
      const deleteButton = within(connection!).getByLabelText(/delete connection/i);
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/connections/1'));
    });
  });

  describe('Visualization Features', () => {
    it('should render the architecture diagram', async () => {
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByTestId('architecture-diagram')).toBeInTheDocument();
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
        expect(screen.getByText('User Service')).toBeInTheDocument();
      });
    });

    it('should highlight components on hover', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const component = screen.getByText('API Gateway').closest('div');
      await user.hover(component!);

      expect(component).toHaveClass('highlighted');
    });

    it('should show connection details on click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('HTTP')).toBeInTheDocument();
      });

      const connection = screen.getByText('HTTP').closest('div');
      await user.click(connection!);

      expect(screen.getByText(/connection details/i)).toBeInTheDocument();
      expect(screen.getByText(/source: api gateway/i)).toBeInTheDocument();
      expect(screen.getByText(/target: user service/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByLabelText(/architecture diagram/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/edit architecture name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add new component/i)).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      // Tab to first interactive element
      await user.tab();
      expect(screen.getByLabelText(/edit architecture name/i)).toHaveFocus();

      // Tab to next element
      await user.tab();
      expect(screen.getByRole('button', { name: /add component/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        const title = screen.getByText('Microservices Architecture');
        expect(title).toHaveStyle('color: rgba(0, 0, 0, 0.87)');

        const description = screen.getByText('A collection of loosely coupled services');
        expect(description).toHaveStyle('color: rgba(0, 0, 0, 0.6)');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when component addition fails', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockRejectedValue(new Error('Failed to add component'));

      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const addComponentButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addComponentButton);

      const dialog = screen.getByRole('dialog');
      const nameInput = within(dialog).getByRole('textbox', { name: /component name/i });
      await user.type(nameInput, 'New Service');

      const submitButton = within(dialog).getByRole('button', { name: /add/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to add component/i)).toBeInTheDocument();
      });
    });

    it('should show error when connection creation fails', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockRejectedValue(new Error('Failed to create connection'));

      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const connectButton = screen.getByRole('button', { name: /connect components/i });
      await user.click(connectButton);

      const dialog = screen.getByRole('dialog');
      const submitButton = within(dialog).getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create connection/i)).toBeInTheDocument();
      });
    });

    it('should handle empty architecture data gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText(/no architecture data available/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create new architecture/i })).toBeInTheDocument();
      });
    });
  });

  describe('Navigation and Routing', () => {
    it('should navigate back to architectures list', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, {
        route: '/design/1',
        initialState: { architectures: [mockArchitectureData] }
      });

      await waitFor(() => {
        expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back to architectures/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/architectures');
    });

    it('should navigate to component details when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const component = screen.getByText('API Gateway').closest('div');
      await user.click(component!);

      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/components/1'));
    });
  });

  describe('Permission Handling', () => {
    it('should disable edit buttons for view-only users', async () => {
      const viewOnlyUser = { ...mockUser, role: 'viewer' };
      renderWithProviders(<DesignArchitecture />, {
        route: '/design/1',
        initialState: { user: viewOnlyUser }
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/edit architecture name/i)).toBeDisabled();
        expect(screen.getByRole('button', { name: /add component/i })).toBeDisabled();
      });
    });

    it('should show permission error when unauthorized user tries to edit', async () => {
      const user = userEvent.setup();
      const unauthorizedUser = { ...mockUser, role: 'viewer' };
      renderWithProviders(<DesignArchitecture />, {
        route: '/design/1',
        initialState: { user: unauthorizedUser }
      });

      await waitFor(() => {
        expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
      });

      // Try to click disabled edit button
      const editButton = screen.getByLabelText(/edit architecture name/i);
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText(/you don't have permission to edit this architecture/i)).toBeInTheDocument();
      });
    });
  });

  describe('State Persistence', () => {
    it('should maintain diagram layout between sessions', async () => {
      const mockLayout = {
        positions: { '1': { x: 100, y: 200 }, '2': { x: 300, y: 400 } },
        zoom: 1.2
      };

      localStorage.setItem('architecture-1-layout', JSON.stringify(mockLayout));

      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByTestId('architecture-diagram')).toHaveAttribute(
          'data-layout',
          JSON.stringify(mockLayout)
        );
      });
    });

    it('should save diagram layout when components are moved', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, { route: '/design/1' });

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const component = screen.getByText('API Gateway').closest('div');
      fireEvent.dragStart(component!);
      fireEvent.dragOver(component!, { clientX: 200, clientY: 300 });
      fireEvent.dragEnd(component!);

      await waitFor(() => {
        expect(localStorage.getItem('architecture-1-layout')).toBeTruthy();
      });
    });
  });
});