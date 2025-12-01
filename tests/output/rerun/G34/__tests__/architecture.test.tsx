import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { ArchitectureContext } from '../../context/ArchitectureContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { AuthProvider } from '../../context/AuthContext';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
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

const renderWithProviders = (ui: React.ReactElement, { route = '/architectures/1' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <NotificationProvider>
          <ArchitectureContext.Provider
            value={{
              architectures: [mockArchitectureData],
              currentArchitecture: mockArchitectureData,
              setCurrentArchitecture: jest.fn(),
              addComponent: jest.fn(),
              updateComponent: jest.fn(),
              removeComponent: jest.fn(),
              addConnection: jest.fn(),
              removeConnection: jest.fn(),
              saveArchitecture: jest.fn(),
              isSaving: false,
              error: null,
              setError: jest.fn(),
            }}
          >
            <Routes>
              <Route path="/architectures/:id" element={ui} />
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
    mockedAxios.get.mockResolvedValue({ data: mockArchitectureData });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      mockedAxios.get.mockImplementationOnce(() => new Promise(() => {}));
      renderWithProviders(<DesignArchitecture />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render architecture name in the header', async () => {
      renderWithProviders(<DesignArchitecture />);
      expect(await screen.findByText('Microservices Architecture')).toBeInTheDocument();
    });

    it('should render all components in the diagram', async () => {
      renderWithProviders(<DesignArchitecture />);
      expect(await screen.findByText('API Gateway')).toBeInTheDocument();
      expect(screen.getByText('User Service')).toBeInTheDocument();
    });

    it('should render connections between components', async () => {
      renderWithProviders(<DesignArchitecture />);
      const connection = await screen.findByTestId('connection-1');
      expect(connection).toBeInTheDocument();
    });
  });

  describe('Component Management', () => {
    it('should open add component modal when clicking add component button', async () => {
      renderWithProviders(<DesignArchitecture />);
      const addButton = await screen.findByLabelText('Add Component');
      fireEvent.click(addButton);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add New Component')).toBeInTheDocument();
    });

    it('should add a new component when form is submitted', async () => {
      const mockAddComponent = jest.fn();
      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          addComponent: mockAddComponent,
        },
      });

      const addButton = await screen.findByLabelText('Add Component');
      fireEvent.click(addButton);

      const nameInput = screen.getByLabelText('Component Name');
      const typeSelect = screen.getByLabelText('Component Type');
      const submitButton = screen.getByText('Add Component');

      await userEvent.type(nameInput, 'Auth Service');
      await userEvent.selectOptions(typeSelect, 'service');
      fireEvent.click(submitButton);

      expect(mockAddComponent).toHaveBeenCalledWith({
        name: 'Auth Service',
        type: 'service',
      });
    });

    it('should show validation errors when adding component with empty name', async () => {
      renderWithProviders(<DesignArchitecture />);
      const addButton = await screen.findByLabelText('Add Component');
      fireEvent.click(addButton);

      const submitButton = screen.getByText('Add Component');
      fireEvent.click(submitButton);

      expect(await screen.findByText('Name is required')).toBeInTheDocument();
    });

    it('should edit a component when edit button is clicked', async () => {
      const mockUpdateComponent = jest.fn();
      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          updateComponent: mockUpdateComponent,
        },
      });

      const editButtons = await screen.findAllByLabelText('Edit Component');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('API Gateway');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Gateway');

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      expect(mockUpdateComponent).toHaveBeenCalledWith('1', {
        name: 'Updated Gateway',
        type: 'gateway',
      });
    });

    it('should delete a component when delete button is clicked and confirmed', async () => {
      const mockRemoveComponent = jest.fn();
      window.confirm = jest.fn().mockImplementation(() => true);

      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          removeComponent: mockRemoveComponent,
        },
      });

      const deleteButtons = await screen.findAllByLabelText('Delete Component');
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockRemoveComponent).toHaveBeenCalledWith('1');
    });

    it('should not delete a component when deletion is cancelled', async () => {
      const mockRemoveComponent = jest.fn();
      window.confirm = jest.fn().mockImplementation(() => false);

      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          removeComponent: mockRemoveComponent,
        },
      });

      const deleteButtons = await screen.findAllByLabelText('Delete Component');
      fireEvent.click(deleteButtons[0]);

      expect(mockRemoveComponent).not.toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    it('should add a connection between two components', async () => {
      const mockAddConnection = jest.fn();
      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          addConnection: mockAddConnection,
        },
      });

      // Simulate drag and drop connection creation
      const sourceComponent = await screen.findByText('API Gateway');
      const targetComponent = screen.getByText('User Service');

      fireEvent.mouseDown(sourceComponent);
      fireEvent.mouseMove(targetComponent);
      fireEvent.mouseUp(targetComponent);

      await waitFor(() => {
        expect(mockAddConnection).toHaveBeenCalledWith({
          source: '1',
          target: '2',
          type: 'HTTP',
        });
      });
    });

    it('should remove a connection when delete is clicked', async () => {
      const mockRemoveConnection = jest.fn();
      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          removeConnection: mockRemoveConnection,
        },
      });

      const connection = await screen.findByTestId('connection-1');
      const deleteButton = within(connection).getByLabelText('Delete Connection');
      fireEvent.click(deleteButton);

      expect(mockRemoveConnection).toHaveBeenCalledWith('1');
    });
  });

  describe('Architecture Actions', () => {
    it('should save architecture when save button is clicked', async () => {
      const mockSave = jest.fn().mockResolvedValue({});
      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          saveArchitecture: mockSave,
        },
      });

      const saveButton = await screen.findByText('Save Architecture');
      fireEvent.click(saveButton);

      expect(mockSave).toHaveBeenCalled();
      expect(await screen.findByText('Architecture saved successfully')).toBeInTheDocument();
    });

    it('should show error when save fails', async () => {
      const mockSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          saveArchitecture: mockSave,
        },
      });

      const saveButton = await screen.findByText('Save Architecture');
      fireEvent.click(saveButton);

      expect(await screen.findByText('Failed to save architecture: Save failed')).toBeInTheDocument();
    });

    it('should show loading state during save', async () => {
      const mockSave = jest.fn().mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          saveArchitecture: mockSave,
          isSaving: true,
        },
      });

      const saveButton = await screen.findByText('Saving...');
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    it('should export architecture as JSON when export button is clicked', async () => {
      renderWithProviders(<DesignArchitecture />);

      const exportButton = await screen.findByText('Export');
      fireEvent.click(exportButton);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/export'),
        expect.any(Object)
      );
    });

    it('should navigate to deployment when deploy button is clicked', async () => {
      renderWithProviders(<DesignArchitecture />);

      const deployButton = await screen.findByText('Deploy');
      fireEvent.click(deployButton);

      expect(mockNavigate).toHaveBeenCalledWith('/architectures/1/deploy');
    });
  });

  describe('Error Handling', () => {
    it('should show error message when architecture fails to load', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Failed to load'));
      renderWithProviders(<DesignArchitecture />);

      expect(await screen.findByText('Failed to load architecture: Failed to load')).toBeInTheDocument();
    });

    it('should show empty state when no components exist', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          ...mockArchitectureData,
          components: [],
        },
      });

      renderWithProviders(<DesignArchitecture />);
      expect(await screen.findByText('No components in this architecture')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', async () => {
      renderWithProviders(<DesignArchitecture />);

      expect(await screen.findByLabelText('Add Component')).toBeInTheDocument();
      expect(screen.getByLabelText('Save Architecture')).toBeInTheDocument();
      expect(screen.getByLabelText('Export Architecture')).toBeInTheDocument();
    });

    it('should have proper keyboard navigation for components', async () => {
      renderWithProviders(<DesignArchitecture />);

      const components = await screen.findAllByRole('button', { name: /component/i });
      expect(components[0]).toHaveFocus();

      fireEvent.keyDown(components[0], { key: 'Tab' });
      expect(components[1]).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<DesignArchitecture />);

      const header = await screen.findByRole('heading', { name: 'Microservices Architecture' });
      expect(header).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Assuming Material-UI default
    });
  });

  describe('Responsive Behavior', () => {
    it('should show mobile-friendly layout on small screens', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<DesignArchitecture />);

      const mobileMenuButton = await screen.findByLabelText('Menu');
      expect(mobileMenuButton).toBeInTheDocument();

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });
  });

  describe('Context Menu', () => {
    it('should show context menu when right-clicking a component', async () => {
      renderWithProviders(<DesignArchitecture />);

      const component = await screen.findByText('API Gateway');
      fireEvent.contextMenu(component);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should close context menu when clicking outside', async () => {
      renderWithProviders(<DesignArchitecture />);

      const component = await screen.findByText('API Gateway');
      fireEvent.contextMenu(component);

      const outsideElement = screen.getByTestId('architecture-diagram');
      fireEvent.mouseDown(outsideElement);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should disable undo button when no actions to undo', async () => {
      renderWithProviders(<DesignArchitecture />);

      const undoButton = await screen.findByLabelText('Undo');
      expect(undoButton).toBeDisabled();
    });

    it('should disable redo button when no actions to redo', async () => {
      renderWithProviders(<DesignArchitecture />);

      const redoButton = await screen.findByLabelText('Redo');
      expect(redoButton).toBeDisabled();
    });
  });

  describe('Permission Handling', () => {
    it('should disable edit buttons for read-only users', async () => {
      renderWithProviders(<DesignArchitecture />, {
        authValue: {
          user: { ...mockUser, role: 'viewer' },
        },
      });

      const editButtons = await screen.findAllByLabelText('Edit Component');
      expect(editButtons[0]).toBeDisabled();
    });

    it('should hide delete buttons for read-only users', async () => {
      renderWithProviders(<DesignArchitecture />, {
        authValue: {
          user: { ...mockUser, role: 'viewer' },
        },
      });

      expect(screen.queryAllByLabelText('Delete Component')).toHaveLength(0);
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

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
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

const renderWithProviders = (ui: React.ReactElement, { route = '/architectures/1' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <NotificationProvider>
          <ArchitectureContext.Provider
            value={{
              architectures: [mockArchitectureData],
              currentArchitecture: mockArchitectureData,
              setCurrentArchitecture: jest.fn(),
              addComponent: jest.fn(),
              updateComponent: jest.fn(),
              removeComponent: jest.fn(),
              addConnection: jest.fn(),
              removeConnection: jest.fn(),
              saveArchitecture: jest.fn(),
              isSaving: false,
              error: null,
              setError: jest.fn(),
            }}
          >
            <Routes>
              <Route path="/architectures/:id" element={ui} />
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
    mockedAxios.get.mockResolvedValue({ data: mockArchitectureData });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      mockedAxios.get.mockImplementationOnce(() => new Promise(() => {}));
      renderWithProviders(<DesignArchitecture />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render architecture name in the header', async () => {
      renderWithProviders(<DesignArchitecture />);
      expect(await screen.findByText('Microservices Architecture')).toBeInTheDocument();
    });

    it('should render all components in the diagram', async () => {
      renderWithProviders(<DesignArchitecture />);
      expect(await screen.findByText('API Gateway')).toBeInTheDocument();
      expect(screen.getByText('User Service')).toBeInTheDocument();
    });

    it('should render connections between components', async () => {
      renderWithProviders(<DesignArchitecture />);
      const connection = await screen.findByTestId('connection-1');
      expect(connection).toBeInTheDocument();
    });
  });

  describe('Component Management', () => {
    it('should open add component modal when clicking add component button', async () => {
      renderWithProviders(<DesignArchitecture />);
      const addButton = await screen.findByLabelText('Add Component');
      fireEvent.click(addButton);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add New Component')).toBeInTheDocument();
    });

    it('should add a new component when form is submitted', async () => {
      const mockAddComponent = jest.fn();
      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          addComponent: mockAddComponent,
        },
      });

      const addButton = await screen.findByLabelText('Add Component');
      fireEvent.click(addButton);

      const nameInput = screen.getByLabelText('Component Name');
      const typeSelect = screen.getByLabelText('Component Type');
      const submitButton = screen.getByText('Add Component');

      await userEvent.type(nameInput, 'Auth Service');
      await userEvent.selectOptions(typeSelect, 'service');
      fireEvent.click(submitButton);

      expect(mockAddComponent).toHaveBeenCalledWith({
        name: 'Auth Service',
        type: 'service',
      });
    });

    it('should show validation errors when adding component with empty name', async () => {
      renderWithProviders(<DesignArchitecture />);
      const addButton = await screen.findByLabelText('Add Component');
      fireEvent.click(addButton);

      const submitButton = screen.getByText('Add Component');
      fireEvent.click(submitButton);

      expect(await screen.findByText('Name is required')).toBeInTheDocument();
    });

    it('should edit a component when edit button is clicked', async () => {
      const mockUpdateComponent = jest.fn();
      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          updateComponent: mockUpdateComponent,
        },
      });

      const editButtons = await screen.findAllByLabelText('Edit Component');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('API Gateway');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Gateway');

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      expect(mockUpdateComponent).toHaveBeenCalledWith('1', {
        name: 'Updated Gateway',
        type: 'gateway',
      });
    });

    it('should delete a component when delete button is clicked and confirmed', async () => {
      const mockRemoveComponent = jest.fn();
      window.confirm = jest.fn().mockImplementation(() => true);

      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          removeComponent: mockRemoveComponent,
        },
      });

      const deleteButtons = await screen.findAllByLabelText('Delete Component');
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockRemoveComponent).toHaveBeenCalledWith('1');
    });

    it('should not delete a component when deletion is cancelled', async () => {
      const mockRemoveComponent = jest.fn();
      window.confirm = jest.fn().mockImplementation(() => false);

      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          removeComponent: mockRemoveComponent,
        },
      });

      const deleteButtons = await screen.findAllByLabelText('Delete Component');
      fireEvent.click(deleteButtons[0]);

      expect(mockRemoveComponent).not.toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    it('should add a connection between two components', async () => {
      const mockAddConnection = jest.fn();
      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          addConnection: mockAddConnection,
        },
      });

      // Simulate drag and drop connection creation
      const sourceComponent = await screen.findByText('API Gateway');
      const targetComponent = screen.getByText('User Service');

      fireEvent.mouseDown(sourceComponent);
      fireEvent.mouseMove(targetComponent);
      fireEvent.mouseUp(targetComponent);

      await waitFor(() => {
        expect(mockAddConnection).toHaveBeenCalledWith({
          source: '1',
          target: '2',
          type: 'HTTP',
        });
      });
    });

    it('should remove a connection when delete is clicked', async () => {
      const mockRemoveConnection = jest.fn();
      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          removeConnection: mockRemoveConnection,
        },
      });

      const connection = await screen.findByTestId('connection-1');
      const deleteButton = within(connection).getByLabelText('Delete Connection');
      fireEvent.click(deleteButton);

      expect(mockRemoveConnection).toHaveBeenCalledWith('1');
    });
  });

  describe('Architecture Actions', () => {
    it('should save architecture when save button is clicked', async () => {
      const mockSave = jest.fn().mockResolvedValue({});
      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          saveArchitecture: mockSave,
        },
      });

      const saveButton = await screen.findByText('Save Architecture');
      fireEvent.click(saveButton);

      expect(mockSave).toHaveBeenCalled();
      expect(await screen.findByText('Architecture saved successfully')).toBeInTheDocument();
    });

    it('should show error when save fails', async () => {
      const mockSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          saveArchitecture: mockSave,
        },
      });

      const saveButton = await screen.findByText('Save Architecture');
      fireEvent.click(saveButton);

      expect(await screen.findByText('Failed to save architecture: Save failed')).toBeInTheDocument();
    });

    it('should show loading state during save', async () => {
      const mockSave = jest.fn().mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<DesignArchitecture />, {
        contextValue: {
          ...mockArchitectureData,
          saveArchitecture: mockSave,
          isSaving: true,
        },
      });

      const saveButton = await screen.findByText('Saving...');
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    it('should export architecture as JSON when export button is clicked', async () => {
      renderWithProviders(<DesignArchitecture />);

      const exportButton = await screen.findByText('Export');
      fireEvent.click(exportButton);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/export'),
        expect.any(Object)
      );
    });

    it('should navigate to deployment when deploy button is clicked', async () => {
      renderWithProviders(<DesignArchitecture />);

      const deployButton = await screen.findByText('Deploy');
      fireEvent.click(deployButton);

      expect(mockNavigate).toHaveBeenCalledWith('/architectures/1/deploy');
    });
  });

  describe('Error Handling', () => {
    it('should show error message when architecture fails to load', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Failed to load'));
      renderWithProviders(<DesignArchitecture />);

      expect(await screen.findByText('Failed to load architecture: Failed to load')).toBeInTheDocument();
    });

    it('should show empty state when no components exist', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          ...mockArchitectureData,
          components: [],
        },
      });

      renderWithProviders(<DesignArchitecture />);
      expect(await screen.findByText('No components in this architecture')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', async () => {
      renderWithProviders(<DesignArchitecture />);

      expect(await screen.findByLabelText('Add Component')).toBeInTheDocument();
      expect(screen.getByLabelText('Save Architecture')).toBeInTheDocument();
      expect(screen.getByLabelText('Export Architecture')).toBeInTheDocument();
    });

    it('should have proper keyboard navigation for components', async () => {
      renderWithProviders(<DesignArchitecture />);

      const components = await screen.findAllByRole('button', { name: /component/i });
      expect(components[0]).toHaveFocus();

      fireEvent.keyDown(components[0], { key: 'Tab' });
      expect(components[1]).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<DesignArchitecture />);

      const header = await screen.findByRole('heading', { name: 'Microservices Architecture' });
      expect(header).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Assuming Material-UI default
    });
  });

  describe('Responsive Behavior', () => {
    it('should show mobile-friendly layout on small screens', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<DesignArchitecture />);

      const mobileMenuButton = await screen.findByLabelText('Menu');
      expect(mobileMenuButton).toBeInTheDocument();

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });
  });

  describe('Context Menu', () => {
    it('should show context menu when right-clicking a component', async () => {
      renderWithProviders(<DesignArchitecture />);

      const component = await screen.findByText('API Gateway');
      fireEvent.contextMenu(component);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should close context menu when clicking outside', async () => {
      renderWithProviders(<DesignArchitecture />);

      const component = await screen.findByText('API Gateway');
      fireEvent.contextMenu(component);

      const outsideElement = screen.getByTestId('architecture-diagram');
      fireEvent.mouseDown(outsideElement);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should disable undo button when no actions to undo', async () => {
      renderWithProviders(<DesignArchitecture />);

      const undoButton = await screen.findByLabelText('Undo');
      expect(undoButton).toBeDisabled();
    });

    it('should disable redo button when no actions to redo', async () => {
      renderWithProviders(<DesignArchitecture />);

      const redoButton = await screen.findByLabelText('Redo');
      expect(redoButton).toBeDisabled();
    });
  });

  describe('Permission Handling', () => {
    it('should disable edit buttons for read-only users', async () => {
      renderWithProviders(<DesignArchitecture />, {
        authValue: {
          user: { ...mockUser, role: 'viewer' },
        },
      });

      const editButtons = await screen.findAllByLabelText('Edit Component');
      expect(editButtons[0]).toBeDisabled();
    });

    it('should hide delete buttons for read-only users', async () => {
      renderWithProviders(<DesignArchitecture />, {
        authValue: {
          user: { ...mockUser, role: 'viewer' },
        },
      });

      expect(screen.queryAllByLabelText('Delete Component')).toHaveLength(0);
    });
  });
});