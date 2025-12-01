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

const mockFetchArchitectureData = fetchArchitectureData as jest.MockedFunction<typeof fetchArchitectureData>;
const mockSaveArchitectureConfig = saveArchitectureConfig as jest.MockedFunction<typeof saveArchitectureConfig>;
const mockShowToast = useToast as jest.MockedFunction<typeof useToast>;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ArchitectureProvider>
      {ui}
    </ArchitectureProvider>
  );
};

describe('DesignArchitecture Component', () => {
  const mockData = {
    id: '1',
    name: 'Microservices Architecture',
    components: [
      { id: '1', name: 'API Gateway', type: 'gateway', position: { x: 100, y: 100 } },
      { id: '2', name: 'User Service', type: 'service', position: { x: 200, y: 200 } },
    ],
    connections: [
      { id: '1', source: '1', target: '2', type: 'http' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast.mockReturnValue({ showToast: jest.fn() });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      mockFetchArchitectureData.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<DesignArchitecture />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', async () => {
      mockFetchArchitectureData.mockRejectedValue(new Error('Failed to fetch'));
      renderWithProviders(<DesignArchitecture />);

      const errorMessage = await screen.findByText(/failed to load architecture data/i);
      expect(errorMessage).toBeInTheDocument();
    });

    it('should render the architecture canvas when data is loaded', async () => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
    });

    it('should allow adding a new component', async () => {
      renderWithProviders(<DesignArchitecture />);

      const addButton = await screen.findByLabelText(/add component/i);
      fireEvent.click(addButton);

      const dialog = screen.getByRole('dialog');
      const nameInput = within(dialog).getByLabelText(/component name/i);
      const typeSelect = within(dialog).getByLabelText(/component type/i);
      const submitButton = within(dialog).getByRole('button', { name: /add/i });

      await userEvent.type(nameInput, 'New Service');
      await userEvent.selectOptions(typeSelect, 'service');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('New Service')).toBeInTheDocument();
      });
    });

    it('should allow connecting two components', async () => {
      renderWithProviders(<DesignArchitecture />);

      // Wait for components to be rendered
      const apiGateway = await screen.findByText('API Gateway');
      const userService = await screen.findByText('User Service');

      // Simulate drag connection (simplified for test)
      fireEvent.mouseDown(apiGateway);
      fireEvent.mouseMove(userService);
      fireEvent.mouseUp(userService);

      // Check if connection was created (implementation specific)
      const connections = await screen.findAllByTestId('connection-line');
      expect(connections).toHaveLength(2); // Original + new connection
    });

    it('should allow deleting a component', async () => {
      renderWithProviders(<DesignArchitecture />);

      const userService = await screen.findByText('User Service');
      const deleteButton = within(userService.closest('div')!).getByLabelText(/delete component/i);

      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText('User Service')).not.toBeInTheDocument();
      });
    });

    it('should allow editing component properties', async () => {
      renderWithProviders(<DesignArchitecture />);

      const userService = await screen.findByText('User Service');
      fireEvent.doubleClick(userService);

      const dialog = screen.getByRole('dialog');
      const nameInput = within(dialog).getByDisplayValue('User Service');

      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated User Service');
      fireEvent.click(within(dialog).getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText('Updated User Service')).toBeInTheDocument();
      });
    });
  });

  describe('Save Functionality', () => {
    it('should save architecture changes successfully', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });
      renderWithProviders(<DesignArchitecture />);

      const saveButton = await screen.findByRole('button', { name: /save architecture/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalled();
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Architecture saved successfully'
          })
        );
      });
    });

    it('should show error when save fails', async () => {
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));
      renderWithProviders(<DesignArchitecture />);

      const saveButton = await screen.findByRole('button', { name: /save architecture/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to save architecture'
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByLabelText(/architecture canvas/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add component/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/save architecture/i)).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
      renderWithProviders(<DesignArchitecture />);

      // Tab through interactive elements
      await userEvent.tab();
      expect(screen.getByLabelText(/add component/i)).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText(/save architecture/i)).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByTestId('architecture-canvas')).toHaveFocus();
    });

    it('should have proper contrast for visual elements', async () => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
      const { container } = renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        const canvas = container.querySelector('[data-testid="architecture-canvas"]');
        expect(canvas).toHaveStyle('background-color: rgb(245, 245, 245)');

        const components = container.querySelectorAll('.architecture-component');
        components.forEach(component => {
          expect(component).toHaveStyle('color: rgb(33, 37, 41)');
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture data', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: '1',
        name: 'Empty Architecture',
        components: [],
        connections: []
      });
      renderWithProviders(<DesignArchitecture />);

      const emptyState = await screen.findByText(/no components added yet/i);
      expect(emptyState).toBeInTheDocument();
    });

    it('should prevent duplicate component names', async () => {
      renderWithProviders(<DesignArchitecture />);

      const addButton = await screen.findByLabelText(/add component/i);
      fireEvent.click(addButton);

      const dialog = screen.getByRole('dialog');
      const nameInput = within(dialog).getByLabelText(/component name/i);
      const submitButton = within(dialog).getByRole('button', { name: /add/i });

      await userEvent.type(nameInput, 'User Service');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/component name already exists/i)).toBeInTheDocument();
      });
    });

    it('should handle connection between same components', async () => {
      renderWithProviders(<DesignArchitecture />);

      const userService = await screen.findByText('User Service');

      // Try to connect component to itself
      fireEvent.mouseDown(userService);
      fireEvent.mouseMove(userService);
      fireEvent.mouseUp(userService);

      await waitFor(() => {
        expect(screen.getByText(/cannot connect component to itself/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when unrelated state changes', async () => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
      const { rerender } = renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
      });

      const initialRender = screen.getByTestId('architecture-canvas');
      rerender(<DesignArchitecture />);
      expect(screen.getByTestId('architecture-canvas')).toBe(initialRender);
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

const mockFetchArchitectureData = fetchArchitectureData as jest.MockedFunction<typeof fetchArchitectureData>;
const mockSaveArchitectureConfig = saveArchitectureConfig as jest.MockedFunction<typeof saveArchitectureConfig>;
const mockShowToast = useToast as jest.MockedFunction<typeof useToast>;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ArchitectureProvider>
      {ui}
    </ArchitectureProvider>
  );
};

describe('DesignArchitecture Component', () => {
  const mockData = {
    id: '1',
    name: 'Microservices Architecture',
    components: [
      { id: '1', name: 'API Gateway', type: 'gateway', position: { x: 100, y: 100 } },
      { id: '2', name: 'User Service', type: 'service', position: { x: 200, y: 200 } },
    ],
    connections: [
      { id: '1', source: '1', target: '2', type: 'http' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast.mockReturnValue({ showToast: jest.fn() });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      mockFetchArchitectureData.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<DesignArchitecture />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', async () => {
      mockFetchArchitectureData.mockRejectedValue(new Error('Failed to fetch'));
      renderWithProviders(<DesignArchitecture />);

      const errorMessage = await screen.findByText(/failed to load architecture data/i);
      expect(errorMessage).toBeInTheDocument();
    });

    it('should render the architecture canvas when data is loaded', async () => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
    });

    it('should allow adding a new component', async () => {
      renderWithProviders(<DesignArchitecture />);

      const addButton = await screen.findByLabelText(/add component/i);
      fireEvent.click(addButton);

      const dialog = screen.getByRole('dialog');
      const nameInput = within(dialog).getByLabelText(/component name/i);
      const typeSelect = within(dialog).getByLabelText(/component type/i);
      const submitButton = within(dialog).getByRole('button', { name: /add/i });

      await userEvent.type(nameInput, 'New Service');
      await userEvent.selectOptions(typeSelect, 'service');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('New Service')).toBeInTheDocument();
      });
    });

    it('should allow connecting two components', async () => {
      renderWithProviders(<DesignArchitecture />);

      // Wait for components to be rendered
      const apiGateway = await screen.findByText('API Gateway');
      const userService = await screen.findByText('User Service');

      // Simulate drag connection (simplified for test)
      fireEvent.mouseDown(apiGateway);
      fireEvent.mouseMove(userService);
      fireEvent.mouseUp(userService);

      // Check if connection was created (implementation specific)
      const connections = await screen.findAllByTestId('connection-line');
      expect(connections).toHaveLength(2); // Original + new connection
    });

    it('should allow deleting a component', async () => {
      renderWithProviders(<DesignArchitecture />);

      const userService = await screen.findByText('User Service');
      const deleteButton = within(userService.closest('div')!).getByLabelText(/delete component/i);

      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText('User Service')).not.toBeInTheDocument();
      });
    });

    it('should allow editing component properties', async () => {
      renderWithProviders(<DesignArchitecture />);

      const userService = await screen.findByText('User Service');
      fireEvent.doubleClick(userService);

      const dialog = screen.getByRole('dialog');
      const nameInput = within(dialog).getByDisplayValue('User Service');

      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated User Service');
      fireEvent.click(within(dialog).getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText('Updated User Service')).toBeInTheDocument();
      });
    });
  });

  describe('Save Functionality', () => {
    it('should save architecture changes successfully', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });
      renderWithProviders(<DesignArchitecture />);

      const saveButton = await screen.findByRole('button', { name: /save architecture/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalled();
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Architecture saved successfully'
          })
        );
      });
    });

    it('should show error when save fails', async () => {
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));
      renderWithProviders(<DesignArchitecture />);

      const saveButton = await screen.findByRole('button', { name: /save architecture/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to save architecture'
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByLabelText(/architecture canvas/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add component/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/save architecture/i)).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
      renderWithProviders(<DesignArchitecture />);

      // Tab through interactive elements
      await userEvent.tab();
      expect(screen.getByLabelText(/add component/i)).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText(/save architecture/i)).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByTestId('architecture-canvas')).toHaveFocus();
    });

    it('should have proper contrast for visual elements', async () => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
      const { container } = renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        const canvas = container.querySelector('[data-testid="architecture-canvas"]');
        expect(canvas).toHaveStyle('background-color: rgb(245, 245, 245)');

        const components = container.querySelectorAll('.architecture-component');
        components.forEach(component => {
          expect(component).toHaveStyle('color: rgb(33, 37, 41)');
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture data', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: '1',
        name: 'Empty Architecture',
        components: [],
        connections: []
      });
      renderWithProviders(<DesignArchitecture />);

      const emptyState = await screen.findByText(/no components added yet/i);
      expect(emptyState).toBeInTheDocument();
    });

    it('should prevent duplicate component names', async () => {
      renderWithProviders(<DesignArchitecture />);

      const addButton = await screen.findByLabelText(/add component/i);
      fireEvent.click(addButton);

      const dialog = screen.getByRole('dialog');
      const nameInput = within(dialog).getByLabelText(/component name/i);
      const submitButton = within(dialog).getByRole('button', { name: /add/i });

      await userEvent.type(nameInput, 'User Service');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/component name already exists/i)).toBeInTheDocument();
      });
    });

    it('should handle connection between same components', async () => {
      renderWithProviders(<DesignArchitecture />);

      const userService = await screen.findByText('User Service');

      // Try to connect component to itself
      fireEvent.mouseDown(userService);
      fireEvent.mouseMove(userService);
      fireEvent.mouseUp(userService);

      await waitFor(() => {
        expect(screen.getByText(/cannot connect component to itself/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when unrelated state changes', async () => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
      const { rerender } = renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
      });

      const initialRender = screen.getByTestId('architecture-canvas');
      rerender(<DesignArchitecture />);
      expect(screen.getByTestId('architecture-canvas')).toBe(initialRender);
    });
  });
});