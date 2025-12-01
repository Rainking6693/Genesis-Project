import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { ArchitectureContext } from '../../context/ArchitectureContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { AuthContext } from '../../context/AuthContext';

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

const mockArchitecture = {
  id: '1',
  name: 'Microservices',
  description: 'Modern microservices architecture',
  components: [
    { id: '1', name: 'API Gateway', type: 'gateway' },
    { id: '2', name: 'User Service', type: 'service' },
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

const renderWithProviders = (ui: React.ReactElement, { route = '/architectures/1' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={{ user: mockUser, isAuthenticated: true }}>
        <NotificationProvider>
          <ArchitectureContext.Provider value={{
            architectures: [mockArchitecture],
            currentArchitecture: mockArchitecture,
            setCurrentArchitecture: jest.fn(),
            loading: false,
            error: null,
            saveArchitecture: jest.fn(),
            deleteArchitecture: jest.fn(),
            createComponent: jest.fn(),
            updateComponent: jest.fn(),
            deleteComponent: jest.fn(),
            createConnection: jest.fn(),
            updateConnection: jest.fn(),
            deleteConnection: jest.fn(),
          }}>
            <Routes>
              <Route path="/architectures/:id" element={ui} />
            </Routes>
          </ArchitectureContext.Provider>
        </NotificationProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitecture });
  });

  describe('Initial Render', () => {
    it('should render loading state initially when data is being fetched', async () => {
      (axios.get as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: mockArchitecture }), 1000))
      );

      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('should render the architecture name and description', async () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByText(mockArchitecture.name)).toBeInTheDocument();
      expect(screen.getByText(mockArchitecture.description)).toBeInTheDocument();
    });

    it('should render all components in the diagram', async () => {
      renderWithProviders(<DesignArchitecture />);

      mockArchitecture.components.forEach(component => {
        expect(screen.getByText(component.name)).toBeInTheDocument();
      });
    });

    it('should render all connections between components', async () => {
      renderWithProviders(<DesignArchitecture />);

      // This would need to be adjusted based on how connections are visually represented
      const connectionElements = screen.getAllByTestId('connection');
      expect(connectionElements.length).toBe(mockArchitecture.connections.length);
    });
  });

  describe('Component Management', () => {
    it('should allow adding a new component', async () => {
      const user = userEvent.setup();
      const mockCreateComponent = jest.fn().mockResolvedValue({
        ...mockArchitecture,
        components: [...mockArchitecture.components, {
          id: '3',
          name: 'New Component',
          type: 'service'
        }]
      });

      renderWithProviders(<DesignArchitecture />, {
        route: '/architectures/1',
      });

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const nameInput = screen.getByLabelText(/component name/i);
      const typeSelect = screen.getByLabelText(/component type/i);
      const submitButton = screen.getByRole('button', { name: /create/i });

      await user.type(nameInput, 'New Component');
      await user.selectOptions(typeSelect, 'service');
      await user.click(submitButton);

      expect(mockCreateComponent).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          name: 'New Component',
          type: 'service'
        })
      );
    });

    it('should show validation errors when adding component with invalid data', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/type is required/i)).toBeInTheDocument();
    });

    it('should allow editing an existing component', async () => {
      const user = userEvent.setup();
      const mockUpdateComponent = jest.fn().mockResolvedValue({
        ...mockArchitecture,
        components: [mockArchitecture.components[0], {
          ...mockArchitecture.components[1],
          name: 'Updated User Service'
        }]
      });

      renderWithProviders(<DesignArchitecture />);

      const component = screen.getByText('User Service');
      const editButton = within(component.closest('div')!).getByRole('button', { name: /edit/i });
      await user.click(editButton);

      const nameInput = screen.getByDisplayValue('User Service');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated User Service');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockUpdateComponent).toHaveBeenCalledWith(
        '1',
        '2',
        expect.objectContaining({
          name: 'Updated User Service'
        })
      );
    });

    it('should allow deleting a component', async () => {
      const user = userEvent.setup();
      const mockDeleteComponent = jest.fn().mockResolvedValue({
        ...mockArchitecture,
        components: [mockArchitecture.components[0]]
      });

      window.confirm = jest.fn().mockReturnValue(true);

      renderWithProviders(<DesignArchitecture />);

      const component = screen.getByText('User Service');
      const deleteButton = within(component.closest('div')!).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockDeleteComponent).toHaveBeenCalledWith('1', '2');
    });
  });

  describe('Connection Management', () => {
    it('should allow creating a new connection between components', async () => {
      const user = userEvent.setup();
      const mockCreateConnection = jest.fn().mockResolvedValue({
        ...mockArchitecture,
        connections: [...mockArchitecture.connections, {
          id: '2',
          source: '1',
          target: '2',
          type: 'gRPC'
        }]
      });

      renderWithProviders(<DesignArchitecture />);

      const connectButton = screen.getByRole('button', { name: /connect components/i });
      await user.click(connectButton);

      const sourceSelect = screen.getByLabelText(/source component/i);
      const targetSelect = screen.getByLabelText(/target component/i);
      const typeSelect = screen.getByLabelText(/connection type/i);

      await user.selectOptions(sourceSelect, '1');
      await user.selectOptions(targetSelect, '2');
      await user.selectOptions(typeSelect, 'gRPC');

      const createButton = screen.getByRole('button', { name: /create connection/i });
      await user.click(createButton);

      expect(mockCreateConnection).toHaveBeenCalledWith('1', {
        source: '1',
        target: '2',
        type: 'gRPC'
      });
    });

    it('should prevent creating duplicate connections', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DesignArchitecture />);

      const connectButton = screen.getByRole('button', { name: /connect components/i });
      await user.click(connectButton);

      const sourceSelect = screen.getByLabelText(/source component/i);
      const targetSelect = screen.getByLabelText(/target component/i);
      const typeSelect = screen.getByLabelText(/connection type/i);

      await user.selectOptions(sourceSelect, '1');
      await user.selectOptions(targetSelect, '2');
      await user.selectOptions(typeSelect, 'HTTP');

      const createButton = screen.getByRole('button', { name: /create connection/i });
      await user.click(createButton);

      expect(screen.getByText(/connection already exists/i)).toBeInTheDocument();
    });

    it('should allow deleting a connection', async () => {
      const user = userEvent.setup();
      const mockDeleteConnection = jest.fn().mockResolvedValue({
        ...mockArchitecture,
        connections: []
      });

      window.confirm = jest.fn().mockReturnValue(true);

      renderWithProviders(<DesignArchitecture />);

      const connectionElements = screen.getAllByTestId('connection');
      const deleteButton = within(connectionElements[0]).getByRole('button', { name: /delete connection/i });
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockDeleteConnection).toHaveBeenCalledWith('1', '1');
    });
  });

  describe('Architecture Operations', () => {
    it('should allow saving the architecture', async () => {
      const user = userEvent.setup();
      const mockSave = jest.fn().mockResolvedValue(mockArchitecture);

      renderWithProviders(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        name: mockArchitecture.name
      }));
    });

    it('should show success notification after saving', async () => {
      const user = userEvent.setup();
      const mockSave = jest.fn().mockResolvedValue(mockArchitecture);

      renderWithProviders(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/architecture saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error notification when save fails', async () => {
      const user = userEvent.setup();
      const mockSave = jest.fn().mockRejectedValue(new Error('Save failed'));

      renderWithProviders(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save architecture/i)).toBeInTheDocument();
      });
    });

    it('should allow exporting the architecture as JSON', async () => {
      const user = userEvent.setup();
      const mockExport = jest.fn().mockResolvedValue({
        data: JSON.stringify(mockArchitecture, null, 2)
      });

      global.Blob = jest.fn() as any;
      global.URL.createObjectURL = jest.fn();

      renderWithProviders(<DesignArchitecture />);

      const exportButton = screen.getByRole('button', { name: /export as json/i });
      await user.click(exportButton);

      expect(mockExport).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when architecture fails to load', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Failed to load'));

      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load architecture/i)).toBeInTheDocument();
      });
    });

    it('should handle 404 error when architecture not found', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Architecture not found' }
        }
      });

      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/architecture not found/i)).toBeInTheDocument();
      });
    });

    it('should handle unauthorized access (403)', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Unauthorized' }
        }
      });

      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/you don't have permission/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByRole('button', { name: /add component/i })).toHaveAttribute('aria-label', 'Add new component');
      expect(screen.getByRole('button', { name: /connect components/i })).toHaveAttribute('aria-label', 'Connect components');
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveAttribute('aria-label', 'Save architecture changes');
    });

    it('should have proper heading structure', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: mockArchitecture.name, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /components/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /connections/i, level: 2 })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DesignArchitecture />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /add component/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /connect components/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveFocus();
    });
  });

  describe('Navigation', () => {
    it('should navigate back to architectures list when back button is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DesignArchitecture />);

      const backButton = screen.getByRole('button', { name: /back to architectures/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/architectures');
    });

    it('should navigate to component details when a component is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DesignArchitecture />, {
        route: '/architectures/1',
      });

      const component = screen.getByText('API Gateway');
      await user.click(component);

      expect(mockNavigate).toHaveBeenCalledWith('/architectures/1/components/1');
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile viewports', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<DesignArchitecture />);

      // Check for mobile-specific elements or classes
      expect(screen.getByTestId('mobile-diagram-container')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-diagram-container')).not.toBeInTheDocument();
    });

    it('should show mobile menu for small screens', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      const menuButton = screen.getByRole('button', { name: /menu/i });
      await user.click(menuButton);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
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
import { AuthContext } from '../../context/AuthContext';

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

const mockArchitecture = {
  id: '1',
  name: 'Microservices',
  description: 'Modern microservices architecture',
  components: [
    { id: '1', name: 'API Gateway', type: 'gateway' },
    { id: '2', name: 'User Service', type: 'service' },
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

const renderWithProviders = (ui: React.ReactElement, { route = '/architectures/1' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={{ user: mockUser, isAuthenticated: true }}>
        <NotificationProvider>
          <ArchitectureContext.Provider value={{
            architectures: [mockArchitecture],
            currentArchitecture: mockArchitecture,
            setCurrentArchitecture: jest.fn(),
            loading: false,
            error: null,
            saveArchitecture: jest.fn(),
            deleteArchitecture: jest.fn(),
            createComponent: jest.fn(),
            updateComponent: jest.fn(),
            deleteComponent: jest.fn(),
            createConnection: jest.fn(),
            updateConnection: jest.fn(),
            deleteConnection: jest.fn(),
          }}>
            <Routes>
              <Route path="/architectures/:id" element={ui} />
            </Routes>
          </ArchitectureContext.Provider>
        </NotificationProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitecture });
  });

  describe('Initial Render', () => {
    it('should render loading state initially when data is being fetched', async () => {
      (axios.get as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: mockArchitecture }), 1000))
      );

      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('should render the architecture name and description', async () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByText(mockArchitecture.name)).toBeInTheDocument();
      expect(screen.getByText(mockArchitecture.description)).toBeInTheDocument();
    });

    it('should render all components in the diagram', async () => {
      renderWithProviders(<DesignArchitecture />);

      mockArchitecture.components.forEach(component => {
        expect(screen.getByText(component.name)).toBeInTheDocument();
      });
    });

    it('should render all connections between components', async () => {
      renderWithProviders(<DesignArchitecture />);

      // This would need to be adjusted based on how connections are visually represented
      const connectionElements = screen.getAllByTestId('connection');
      expect(connectionElements.length).toBe(mockArchitecture.connections.length);
    });
  });

  describe('Component Management', () => {
    it('should allow adding a new component', async () => {
      const user = userEvent.setup();
      const mockCreateComponent = jest.fn().mockResolvedValue({
        ...mockArchitecture,
        components: [...mockArchitecture.components, {
          id: '3',
          name: 'New Component',
          type: 'service'
        }]
      });

      renderWithProviders(<DesignArchitecture />, {
        route: '/architectures/1',
      });

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const nameInput = screen.getByLabelText(/component name/i);
      const typeSelect = screen.getByLabelText(/component type/i);
      const submitButton = screen.getByRole('button', { name: /create/i });

      await user.type(nameInput, 'New Component');
      await user.selectOptions(typeSelect, 'service');
      await user.click(submitButton);

      expect(mockCreateComponent).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          name: 'New Component',
          type: 'service'
        })
      );
    });

    it('should show validation errors when adding component with invalid data', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/type is required/i)).toBeInTheDocument();
    });

    it('should allow editing an existing component', async () => {
      const user = userEvent.setup();
      const mockUpdateComponent = jest.fn().mockResolvedValue({
        ...mockArchitecture,
        components: [mockArchitecture.components[0], {
          ...mockArchitecture.components[1],
          name: 'Updated User Service'
        }]
      });

      renderWithProviders(<DesignArchitecture />);

      const component = screen.getByText('User Service');
      const editButton = within(component.closest('div')!).getByRole('button', { name: /edit/i });
      await user.click(editButton);

      const nameInput = screen.getByDisplayValue('User Service');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated User Service');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockUpdateComponent).toHaveBeenCalledWith(
        '1',
        '2',
        expect.objectContaining({
          name: 'Updated User Service'
        })
      );
    });

    it('should allow deleting a component', async () => {
      const user = userEvent.setup();
      const mockDeleteComponent = jest.fn().mockResolvedValue({
        ...mockArchitecture,
        components: [mockArchitecture.components[0]]
      });

      window.confirm = jest.fn().mockReturnValue(true);

      renderWithProviders(<DesignArchitecture />);

      const component = screen.getByText('User Service');
      const deleteButton = within(component.closest('div')!).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockDeleteComponent).toHaveBeenCalledWith('1', '2');
    });
  });

  describe('Connection Management', () => {
    it('should allow creating a new connection between components', async () => {
      const user = userEvent.setup();
      const mockCreateConnection = jest.fn().mockResolvedValue({
        ...mockArchitecture,
        connections: [...mockArchitecture.connections, {
          id: '2',
          source: '1',
          target: '2',
          type: 'gRPC'
        }]
      });

      renderWithProviders(<DesignArchitecture />);

      const connectButton = screen.getByRole('button', { name: /connect components/i });
      await user.click(connectButton);

      const sourceSelect = screen.getByLabelText(/source component/i);
      const targetSelect = screen.getByLabelText(/target component/i);
      const typeSelect = screen.getByLabelText(/connection type/i);

      await user.selectOptions(sourceSelect, '1');
      await user.selectOptions(targetSelect, '2');
      await user.selectOptions(typeSelect, 'gRPC');

      const createButton = screen.getByRole('button', { name: /create connection/i });
      await user.click(createButton);

      expect(mockCreateConnection).toHaveBeenCalledWith('1', {
        source: '1',
        target: '2',
        type: 'gRPC'
      });
    });

    it('should prevent creating duplicate connections', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DesignArchitecture />);

      const connectButton = screen.getByRole('button', { name: /connect components/i });
      await user.click(connectButton);

      const sourceSelect = screen.getByLabelText(/source component/i);
      const targetSelect = screen.getByLabelText(/target component/i);
      const typeSelect = screen.getByLabelText(/connection type/i);

      await user.selectOptions(sourceSelect, '1');
      await user.selectOptions(targetSelect, '2');
      await user.selectOptions(typeSelect, 'HTTP');

      const createButton = screen.getByRole('button', { name: /create connection/i });
      await user.click(createButton);

      expect(screen.getByText(/connection already exists/i)).toBeInTheDocument();
    });

    it('should allow deleting a connection', async () => {
      const user = userEvent.setup();
      const mockDeleteConnection = jest.fn().mockResolvedValue({
        ...mockArchitecture,
        connections: []
      });

      window.confirm = jest.fn().mockReturnValue(true);

      renderWithProviders(<DesignArchitecture />);

      const connectionElements = screen.getAllByTestId('connection');
      const deleteButton = within(connectionElements[0]).getByRole('button', { name: /delete connection/i });
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockDeleteConnection).toHaveBeenCalledWith('1', '1');
    });
  });

  describe('Architecture Operations', () => {
    it('should allow saving the architecture', async () => {
      const user = userEvent.setup();
      const mockSave = jest.fn().mockResolvedValue(mockArchitecture);

      renderWithProviders(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        name: mockArchitecture.name
      }));
    });

    it('should show success notification after saving', async () => {
      const user = userEvent.setup();
      const mockSave = jest.fn().mockResolvedValue(mockArchitecture);

      renderWithProviders(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/architecture saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error notification when save fails', async () => {
      const user = userEvent.setup();
      const mockSave = jest.fn().mockRejectedValue(new Error('Save failed'));

      renderWithProviders(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save architecture/i)).toBeInTheDocument();
      });
    });

    it('should allow exporting the architecture as JSON', async () => {
      const user = userEvent.setup();
      const mockExport = jest.fn().mockResolvedValue({
        data: JSON.stringify(mockArchitecture, null, 2)
      });

      global.Blob = jest.fn() as any;
      global.URL.createObjectURL = jest.fn();

      renderWithProviders(<DesignArchitecture />);

      const exportButton = screen.getByRole('button', { name: /export as json/i });
      await user.click(exportButton);

      expect(mockExport).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when architecture fails to load', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Failed to load'));

      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load architecture/i)).toBeInTheDocument();
      });
    });

    it('should handle 404 error when architecture not found', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Architecture not found' }
        }
      });

      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/architecture not found/i)).toBeInTheDocument();
      });
    });

    it('should handle unauthorized access (403)', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Unauthorized' }
        }
      });

      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/you don't have permission/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByRole('button', { name: /add component/i })).toHaveAttribute('aria-label', 'Add new component');
      expect(screen.getByRole('button', { name: /connect components/i })).toHaveAttribute('aria-label', 'Connect components');
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveAttribute('aria-label', 'Save architecture changes');
    });

    it('should have proper heading structure', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: mockArchitecture.name, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /components/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /connections/i, level: 2 })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DesignArchitecture />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /add component/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /connect components/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveFocus();
    });
  });

  describe('Navigation', () => {
    it('should navigate back to architectures list when back button is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DesignArchitecture />);

      const backButton = screen.getByRole('button', { name: /back to architectures/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/architectures');
    });

    it('should navigate to component details when a component is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DesignArchitecture />, {
        route: '/architectures/1',
      });

      const component = screen.getByText('API Gateway');
      await user.click(component);

      expect(mockNavigate).toHaveBeenCalledWith('/architectures/1/components/1');
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile viewports', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<DesignArchitecture />);

      // Check for mobile-specific elements or classes
      expect(screen.getByTestId('mobile-diagram-container')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-diagram-container')).not.toBeInTheDocument();
    });

    it('should show mobile menu for small screens', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      const menuButton = screen.getByRole('button', { name: /menu/i });
      await user.click(menuButton);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });
});