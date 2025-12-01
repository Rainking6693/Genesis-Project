import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { fetchArchitectureData, saveArchitectureConfig } from './api/architectureApi';
import { useToast } from './hooks/useToast';
import { ArchitectureProvider } from './context/ArchitectureContext';

// Mock external dependencies
jest.mock('./api/architectureApi');
jest.mock('./hooks/useToast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockToast = useToast as jest.MockedFunction<typeof useToast>;
const mockFetchArchitectureData = fetchArchitectureData as jest.MockedFunction<typeof fetchArchitectureData>;
const mockSaveArchitectureConfig = saveArchitectureConfig as jest.MockedFunction<typeof saveArchitectureConfig>;

const mockData = {
  id: '1',
  name: 'Microservices Architecture',
  components: [
    { id: '1', name: 'API Gateway', type: 'gateway', position: { x: 100, y: 100 } },
    { id: '2', name: 'User Service', type: 'service', position: { x: 200, y: 200 } },
  ],
  connections: [
    { id: '1', source: '1', target: '2', type: 'http' },
  ],
  lastUpdated: '2023-01-01T00:00:00Z',
};

const renderComponent = (props = {}) => {
  return render(
    <ArchitectureProvider>
      <DesignArchitecture {...props} />
    </ArchitectureProvider>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.mockReturnValue({ showToast: jest.fn() });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      mockFetchArchitectureData.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture/i)).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', async () => {
      mockFetchArchitectureData.mockRejectedValue(new Error('Failed to fetch'));
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should render the architecture diagram when data is loaded successfully', async () => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
        expect(screen.getByText('User Service')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
    });

    it('should allow adding a new component', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add component/i });
      fireEvent.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await userEvent.type(nameInput, 'Auth Service');
      await userEvent.selectOptions(typeSelect, 'service');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Auth Service')).toBeInTheDocument();
      });
    });

    it('should allow connecting two components', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const gateway = screen.getByText('API Gateway');
      const userService = screen.getByText('User Service');

      // Simulate drag from gateway to user service
      fireEvent.mouseDown(gateway);
      fireEvent.mouseMove(userService);
      fireEvent.mouseUp(userService);

      const connectionModal = await screen.findByRole('dialog');
      expect(connectionModal).toBeInTheDocument();

      const typeSelect = within(connectionModal).getByLabelText(/connection type/i);
      const submitButton = within(connectionModal).getByRole('button', { name: /connect/i });

      await userEvent.selectOptions(typeSelect, 'grpc');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('connection-1-2-grpc')).toBeInTheDocument();
      });
    });

    it('should allow editing component properties', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const gateway = screen.getByText('API Gateway');
      fireEvent.contextMenu(gateway);

      const contextMenu = screen.getByRole('menu');
      const editOption = within(contextMenu).getByRole('menuitem', { name: /edit/i });

      fireEvent.click(editOption);

      const editModal = screen.getByRole('dialog');
      const nameInput = within(editModal).getByDisplayValue('API Gateway');

      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Main API Gateway');

      const saveButton = within(editModal).getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Main API Gateway')).toBeInTheDocument();
      });
    });

    it('should allow deleting a component', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('User Service')).toBeInTheDocument();
      });

      const userService = screen.getByText('User Service');
      fireEvent.contextMenu(userService);

      const contextMenu = screen.getByRole('menu');
      const deleteOption = within(contextMenu).getByRole('menuitem', { name: /delete/i });

      fireEvent.click(deleteOption);

      const confirmDialog = screen.getByRole('alertdialog');
      const confirmButton = within(confirmDialog).getByRole('button', { name: /confirm/i });

      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText('User Service')).not.toBeInTheDocument();
      });
    });

    it('should allow dragging components to new positions', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const gateway = screen.getByText('API Gateway');
      const initialPosition = gateway.getBoundingClientRect();

      fireEvent.mouseDown(gateway);
      fireEvent.mouseMove(gateway, { clientX: initialPosition.x + 50, clientY: initialPosition.y + 50 });
      fireEvent.mouseUp(gateway);

      await waitFor(() => {
        const newPosition = gateway.getBoundingClientRect();
        expect(newPosition.x).not.toBe(initialPosition.x);
        expect(newPosition.y).not.toBe(initialPosition.y);
      });
    });
  });

  describe('Saving and Error Handling', () => {
    beforeEach(() => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
    });

    it('should save changes when save button is clicked', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            id: '1',
            name: 'Microservices Architecture',
          })
        );
        expect(screen.getByText(/changes saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error when save fails', async () => {
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/error saving changes/i)).toBeInTheDocument();
      });
    });

    it('should handle concurrent edits conflict', async () => {
      mockSaveArchitectureConfig.mockRejectedValue({
        response: {
          data: {
            error: 'CONCURRENT_EDIT',
            message: 'Another user has modified this architecture',
          },
        },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/concurrent edit detected/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
    });

    it('should have proper aria labels for interactive elements', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /add component/i })).toHaveAttribute('aria-label', 'Add new component');
      expect(screen.getByRole('button', { name: /save/i })).toHaveAttribute('aria-label', 'Save architecture changes');

      const components = screen.getAllByRole('article');
      expect(components[0]).toHaveAttribute('aria-label', 'API Gateway component');
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      // Tab through interactive elements
      const addButton = screen.getByRole('button', { name: /add component/i });
      const saveButton = screen.getByRole('button', { name: /save/i });

      addButton.focus();
      expect(addButton).toHaveFocus();

      fireEvent.keyDown(addButton, { key: 'Tab', code: 'Tab' });
      expect(saveButton).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderComponent();

      await waitFor(() => {
        const title = screen.getByText('Microservices Architecture');
        const component = screen.getByText('API Gateway');

        // These are visual checks that would typically be done with axe or similar tools
        // In a real test, you might use jest-axe for automated accessibility testing
        expect(title).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
        expect(component).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture data', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: '1',
        name: 'Empty Architecture',
        components: [],
        connections: [],
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Empty Architecture')).toBeInTheDocument();
        expect(screen.getByText(/no components added yet/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add your first component/i })).toBeInTheDocument();
      });
    });

    it('should prevent invalid connections', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      // Try to connect a component to itself
      const gateway = screen.getByText('API Gateway');
      fireEvent.mouseDown(gateway);
      fireEvent.mouseMove(gateway);
      fireEvent.mouseUp(gateway);

      await waitFor(() => {
        expect(screen.getByText(/cannot connect a component to itself/i)).toBeInTheDocument();
      });
    });

    it('should handle very large architectures without crashing', async () => {
      const largeData = {
        ...mockData,
        components: Array.from({ length: 100 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Service ${i + 1}`,
          type: 'service',
          position: { x: (i % 10) * 100, y: Math.floor(i / 10) * 100 },
        })),
      };

      mockFetchArchitectureData.mockResolvedValue(largeData);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
        expect(screen.getByText('Service 1')).toBeInTheDocument();
        expect(screen.getByText('Service 100')).toBeInTheDocument();
      });
    });
  });

  describe('Undo/Redo Functionality', () => {
    beforeEach(() => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
    });

    it('should allow undoing the last action', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      // Add a component
      const addButton = screen.getByRole('button', { name: /add component/i });
      fireEvent.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await userEvent.type(nameInput, 'Auth Service');
      await userEvent.selectOptions(typeSelect, 'service');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Auth Service')).toBeInTheDocument();
      });

      // Undo the action
      const undoButton = screen.getByRole('button', { name: /undo/i });
      fireEvent.click(undoButton);

      await waitFor(() => {
        expect(screen.queryByText('Auth Service')).not.toBeInTheDocument();
      });
    });

    it('should allow redoing an undone action', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      // Add a component
      const addButton = screen.getByRole('button', { name: /add component/i });
      fireEvent.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await userEvent.type(nameInput, 'Auth Service');
      await userEvent.selectOptions(typeSelect, 'service');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Auth Service')).toBeInTheDocument();
      });

      // Undo then redo
      const undoButton = screen.getByRole('button', { name: /undo/i });
      const redoButton = screen.getByRole('button', { name: /redo/i });

      fireEvent.click(undoButton);
      await waitFor(() => {
        expect(screen.queryByText('Auth Service')).not.toBeInTheDocument();
      });

      fireEvent.click(redoButton);
      await waitFor(() => {
        expect(screen.getByText('Auth Service')).toBeInTheDocument();
      });
    });

    it('should disable undo/redo buttons when no actions are available', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const undoButton = screen.getByRole('button', { name: /undo/i });
      const redoButton = screen.getByRole('button', { name: /redo/i });

      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { fetchArchitectureData, saveArchitectureConfig } from './api/architectureApi';
import { useToast } from './hooks/useToast';
import { ArchitectureProvider } from './context/ArchitectureContext';

// Mock external dependencies
jest.mock('./api/architectureApi');
jest.mock('./hooks/useToast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockToast = useToast as jest.MockedFunction<typeof useToast>;
const mockFetchArchitectureData = fetchArchitectureData as jest.MockedFunction<typeof fetchArchitectureData>;
const mockSaveArchitectureConfig = saveArchitectureConfig as jest.MockedFunction<typeof saveArchitectureConfig>;

const mockData = {
  id: '1',
  name: 'Microservices Architecture',
  components: [
    { id: '1', name: 'API Gateway', type: 'gateway', position: { x: 100, y: 100 } },
    { id: '2', name: 'User Service', type: 'service', position: { x: 200, y: 200 } },
  ],
  connections: [
    { id: '1', source: '1', target: '2', type: 'http' },
  ],
  lastUpdated: '2023-01-01T00:00:00Z',
};

const renderComponent = (props = {}) => {
  return render(
    <ArchitectureProvider>
      <DesignArchitecture {...props} />
    </ArchitectureProvider>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.mockReturnValue({ showToast: jest.fn() });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      mockFetchArchitectureData.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture/i)).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', async () => {
      mockFetchArchitectureData.mockRejectedValue(new Error('Failed to fetch'));
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should render the architecture diagram when data is loaded successfully', async () => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
        expect(screen.getByText('User Service')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
    });

    it('should allow adding a new component', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add component/i });
      fireEvent.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await userEvent.type(nameInput, 'Auth Service');
      await userEvent.selectOptions(typeSelect, 'service');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Auth Service')).toBeInTheDocument();
      });
    });

    it('should allow connecting two components', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const gateway = screen.getByText('API Gateway');
      const userService = screen.getByText('User Service');

      // Simulate drag from gateway to user service
      fireEvent.mouseDown(gateway);
      fireEvent.mouseMove(userService);
      fireEvent.mouseUp(userService);

      const connectionModal = await screen.findByRole('dialog');
      expect(connectionModal).toBeInTheDocument();

      const typeSelect = within(connectionModal).getByLabelText(/connection type/i);
      const submitButton = within(connectionModal).getByRole('button', { name: /connect/i });

      await userEvent.selectOptions(typeSelect, 'grpc');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('connection-1-2-grpc')).toBeInTheDocument();
      });
    });

    it('should allow editing component properties', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const gateway = screen.getByText('API Gateway');
      fireEvent.contextMenu(gateway);

      const contextMenu = screen.getByRole('menu');
      const editOption = within(contextMenu).getByRole('menuitem', { name: /edit/i });

      fireEvent.click(editOption);

      const editModal = screen.getByRole('dialog');
      const nameInput = within(editModal).getByDisplayValue('API Gateway');

      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Main API Gateway');

      const saveButton = within(editModal).getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Main API Gateway')).toBeInTheDocument();
      });
    });

    it('should allow deleting a component', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('User Service')).toBeInTheDocument();
      });

      const userService = screen.getByText('User Service');
      fireEvent.contextMenu(userService);

      const contextMenu = screen.getByRole('menu');
      const deleteOption = within(contextMenu).getByRole('menuitem', { name: /delete/i });

      fireEvent.click(deleteOption);

      const confirmDialog = screen.getByRole('alertdialog');
      const confirmButton = within(confirmDialog).getByRole('button', { name: /confirm/i });

      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText('User Service')).not.toBeInTheDocument();
      });
    });

    it('should allow dragging components to new positions', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const gateway = screen.getByText('API Gateway');
      const initialPosition = gateway.getBoundingClientRect();

      fireEvent.mouseDown(gateway);
      fireEvent.mouseMove(gateway, { clientX: initialPosition.x + 50, clientY: initialPosition.y + 50 });
      fireEvent.mouseUp(gateway);

      await waitFor(() => {
        const newPosition = gateway.getBoundingClientRect();
        expect(newPosition.x).not.toBe(initialPosition.x);
        expect(newPosition.y).not.toBe(initialPosition.y);
      });
    });
  });

  describe('Saving and Error Handling', () => {
    beforeEach(() => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
    });

    it('should save changes when save button is clicked', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            id: '1',
            name: 'Microservices Architecture',
          })
        );
        expect(screen.getByText(/changes saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error when save fails', async () => {
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/error saving changes/i)).toBeInTheDocument();
      });
    });

    it('should handle concurrent edits conflict', async () => {
      mockSaveArchitectureConfig.mockRejectedValue({
        response: {
          data: {
            error: 'CONCURRENT_EDIT',
            message: 'Another user has modified this architecture',
          },
        },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/concurrent edit detected/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
    });

    it('should have proper aria labels for interactive elements', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /add component/i })).toHaveAttribute('aria-label', 'Add new component');
      expect(screen.getByRole('button', { name: /save/i })).toHaveAttribute('aria-label', 'Save architecture changes');

      const components = screen.getAllByRole('article');
      expect(components[0]).toHaveAttribute('aria-label', 'API Gateway component');
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      // Tab through interactive elements
      const addButton = screen.getByRole('button', { name: /add component/i });
      const saveButton = screen.getByRole('button', { name: /save/i });

      addButton.focus();
      expect(addButton).toHaveFocus();

      fireEvent.keyDown(addButton, { key: 'Tab', code: 'Tab' });
      expect(saveButton).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderComponent();

      await waitFor(() => {
        const title = screen.getByText('Microservices Architecture');
        const component = screen.getByText('API Gateway');

        // These are visual checks that would typically be done with axe or similar tools
        // In a real test, you might use jest-axe for automated accessibility testing
        expect(title).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
        expect(component).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture data', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: '1',
        name: 'Empty Architecture',
        components: [],
        connections: [],
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Empty Architecture')).toBeInTheDocument();
        expect(screen.getByText(/no components added yet/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add your first component/i })).toBeInTheDocument();
      });
    });

    it('should prevent invalid connections', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      // Try to connect a component to itself
      const gateway = screen.getByText('API Gateway');
      fireEvent.mouseDown(gateway);
      fireEvent.mouseMove(gateway);
      fireEvent.mouseUp(gateway);

      await waitFor(() => {
        expect(screen.getByText(/cannot connect a component to itself/i)).toBeInTheDocument();
      });
    });

    it('should handle very large architectures without crashing', async () => {
      const largeData = {
        ...mockData,
        components: Array.from({ length: 100 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Service ${i + 1}`,
          type: 'service',
          position: { x: (i % 10) * 100, y: Math.floor(i / 10) * 100 },
        })),
      };

      mockFetchArchitectureData.mockResolvedValue(largeData);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
        expect(screen.getByText('Service 1')).toBeInTheDocument();
        expect(screen.getByText('Service 100')).toBeInTheDocument();
      });
    });
  });

  describe('Undo/Redo Functionality', () => {
    beforeEach(() => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
    });

    it('should allow undoing the last action', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      // Add a component
      const addButton = screen.getByRole('button', { name: /add component/i });
      fireEvent.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await userEvent.type(nameInput, 'Auth Service');
      await userEvent.selectOptions(typeSelect, 'service');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Auth Service')).toBeInTheDocument();
      });

      // Undo the action
      const undoButton = screen.getByRole('button', { name: /undo/i });
      fireEvent.click(undoButton);

      await waitFor(() => {
        expect(screen.queryByText('Auth Service')).not.toBeInTheDocument();
      });
    });

    it('should allow redoing an undone action', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      // Add a component
      const addButton = screen.getByRole('button', { name: /add component/i });
      fireEvent.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await userEvent.type(nameInput, 'Auth Service');
      await userEvent.selectOptions(typeSelect, 'service');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Auth Service')).toBeInTheDocument();
      });

      // Undo then redo
      const undoButton = screen.getByRole('button', { name: /undo/i });
      const redoButton = screen.getByRole('button', { name: /redo/i });

      fireEvent.click(undoButton);
      await waitFor(() => {
        expect(screen.queryByText('Auth Service')).not.toBeInTheDocument();
      });

      fireEvent.click(redoButton);
      await waitFor(() => {
        expect(screen.getByText('Auth Service')).toBeInTheDocument();
      });
    });

    it('should disable undo/redo buttons when no actions are available', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
      });

      const undoButton = screen.getByRole('button', { name: /undo/i });
      const redoButton = screen.getByRole('button', { name: /redo/i });

      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();
    });
  });
});