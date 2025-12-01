import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { fetchArchitectureData, saveArchitectureConfig } from './api/architectureApi';
import { useToast } from './hooks/useToast';
import { ArchitectureContext } from './context/ArchitectureContext';

// Mock the API calls
jest.mock('./api/architectureApi');
jest.mock('./hooks/useToast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockFetchArchitectureData = fetchArchitectureData as jest.MockedFunction<typeof fetchArchitectureData>;
const mockSaveArchitectureConfig = saveArchitectureConfig as jest.MockedFunction<typeof saveArchitectureConfig>;
const mockShowToast = useToast as jest.MockedFunction<typeof useToast>;

const mockContextValue = {
  currentProject: { id: 'proj-123', name: 'Test Project' },
  setCurrentProject: jest.fn(),
  architectureConfig: {
    layers: [
      { id: 'layer-1', name: 'Presentation', components: [] },
      { id: 'layer-2', name: 'Application', components: [] }
    ],
    connections: []
  },
  setArchitectureConfig: jest.fn(),
  isLoading: false,
  setIsLoading: jest.fn(),
  error: null,
  setError: jest.fn()
};

const renderWithContext = (ui: React.ReactElement) => {
  return render(
    <ArchitectureContext.Provider value={mockContextValue}>
      {ui}
    </ArchitectureContext.Provider>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast.mockReturnValue({ showToast: jest.fn() });
  });

  describe('Initial Render', () => {
    it('should render loading state initially when data is being fetched', () => {
      mockContextValue.isLoading = true;
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture/i)).toBeInTheDocument();
    });

    it('should render error state when fetch fails', () => {
      mockContextValue.error = new Error('Failed to load');
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    it('should render the architecture canvas when data is loaded', () => {
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
      expect(screen.getByText('Presentation')).toBeInTheDocument();
      expect(screen.getByText('Application')).toBeInTheDocument();
    });
  });

  describe('Layer Operations', () => {
    it('should add a new layer when add layer button is clicked', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const addLayerButton = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerButton);

      const layerNameInput = screen.getByLabelText(/layer name/i);
      const saveButton = screen.getByRole('button', { name: /save/i });

      await user.type(layerNameInput, 'New Layer');
      await user.click(saveButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });

    it('should prevent adding layer with empty name', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const addLayerButton = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(screen.getByText(/layer name is required/i)).toBeInTheDocument();
      expect(mockContextValue.setArchitectureConfig).not.toHaveBeenCalled();
    });

    it('should delete a layer when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const deleteButton = within(layer).getByRole('button', { name: /delete/i });

      await user.click(deleteButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
      expect(screen.queryByText('Presentation')).not.toBeInTheDocument();
    });

    it('should edit layer name when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const editButton = within(layer).getByRole('button', { name: /edit/i });

      await user.click(editButton);

      const layerNameInput = screen.getByDisplayValue('Presentation');
      await user.clear(layerNameInput);
      await user.type(layerNameInput, 'Updated Presentation');
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
      expect(screen.getByText('Updated Presentation')).toBeInTheDocument();
    });
  });

  describe('Component Operations', () => {
    it('should add a component to a layer', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const addComponentButton = within(layer).getByRole('button', { name: /add component/i });

      await user.click(addComponentButton);

      const componentNameInput = screen.getByLabelText(/component name/i);
      await user.type(componentNameInput, 'New Component');
      await user.click(screen.getByRole('button', { name: /add/i }));

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
      expect(within(layer).getByText('New Component')).toBeInTheDocument();
    });

    it('should delete a component from a layer', async () => {
      const user = userEvent.setup();
      // Add a component first
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Test Component' }
      ];
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const component = within(layer).getByText('Test Component').closest('.component') as HTMLElement;
      const deleteButton = within(component).getByRole('button', { name: /delete/i });

      await user.click(deleteButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
      expect(within(layer).queryByText('Test Component')).not.toBeInTheDocument();
    });

    it('should edit component name', async () => {
      const user = userEvent.setup();
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Test Component' }
      ];
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const component = within(layer).getByText('Test Component').closest('.component') as HTMLElement;
      const editButton = within(component).getByRole('button', { name: /edit/i });

      await user.click(editButton);

      const componentNameInput = screen.getByDisplayValue('Test Component');
      await user.clear(componentNameInput);
      await user.type(componentNameInput, 'Updated Component');
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
      expect(within(layer).getByText('Updated Component')).toBeInTheDocument();
    });
  });

  describe('Connection Operations', () => {
    it('should create a connection between two components', async () => {
      const user = userEvent.setup();
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Component 1' }
      ];
      mockContextValue.architectureConfig.layers[1].components = [
        { id: 'comp-2', name: 'Component 2' }
      ];
      renderWithContext(<DesignArchitecture />);

      // Start connection from first component
      const component1 = screen.getByText('Component 1').closest('.component') as HTMLElement;
      const connectButton1 = within(component1).getByRole('button', { name: /connect/i });
      await user.click(connectButton1);

      // Complete connection to second component
      const component2 = screen.getByText('Component 2').closest('.component') as HTMLElement;
      await user.click(component2);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
      expect(mockContextValue.setArchitectureConfig.mock.calls[0][0].connections.length).toBe(1);
    });

    it('should delete a connection', async () => {
      const user = userEvent.setup();
      mockContextValue.architectureConfig.connections = [
        {
          id: 'conn-1',
          source: { componentId: 'comp-1', layerId: 'layer-1' },
          target: { componentId: 'comp-2', layerId: 'layer-2' }
        }
      ];
      renderWithContext(<DesignArchitecture />);

      const connection = screen.getByTestId('connection-conn-1');
      const deleteButton = within(connection).getByRole('button', { name: /delete connection/i });

      await user.click(deleteButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
      expect(mockContextValue.setArchitectureConfig.mock.calls[0][0].connections.length).toBe(0);
    });
  });

  describe('Save Operations', () => {
    it('should save the architecture configuration', async () => {
      const user = userEvent.setup();
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });
      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          'proj-123',
          mockContextValue.architectureConfig
        );
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture saved successfully',
            type: 'success'
          })
        );
      });
    });

    it('should show error when save fails', async () => {
      const user = userEvent.setup();
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));
      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to save architecture',
            type: 'error'
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByRole('button', { name: /add layer/i })).toHaveAttribute('aria-label', 'Add new architecture layer');
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveAttribute('aria-label', 'Save current architecture configuration');

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      expect(within(layer).getByRole('button', { name: /delete/i })).toHaveAttribute('aria-label', 'Delete Presentation layer');
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Tab to add layer button
      await user.tab();
      expect(screen.getByRole('button', { name: /add layer/i })).toHaveFocus();

      // Press Enter to open modal
      await user.keyboard('{Enter}');
      expect(screen.getByLabelText(/layer name/i)).toBeInTheDocument();

      // Tab to input field
      await user.tab();
      expect(screen.getByLabelText(/layer name/i)).toHaveFocus();

      // Type layer name
      await user.keyboard('New Layer');

      // Tab to save button
      await user.tab();
      expect(screen.getByRole('button', { name: /save/i })).toHaveFocus();

      // Press Enter to save
      await user.keyboard('{Enter}');
      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture config', () => {
      mockContextValue.architectureConfig = {
        layers: [],
        connections: []
      };
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByText(/no layers found/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first layer/i)).toBeInTheDocument();
    });

    it('should prevent circular dependencies between components', async () => {
      const user = userEvent.setup();
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Component 1' },
        { id: 'comp-2', name: 'Component 2' }
      ];
      mockContextValue.architectureConfig.connections = [
        {
          id: 'conn-1',
          source: { componentId: 'comp-1', layerId: 'layer-1' },
          target: { componentId: 'comp-2', layerId: 'layer-1' }
        }
      ];
      renderWithContext(<DesignArchitecture />);

      // Try to create circular dependency
      const component2 = screen.getByText('Component 2').closest('.component') as HTMLElement;
      const connectButton2 = within(component2).getByRole('button', { name: /connect/i });
      await user.click(connectButton2);

      const component1 = screen.getByText('Component 1').closest('.component') as HTMLElement;
      await user.click(component1);

      expect(mockShowToast().showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Circular dependency detected',
          type: 'warning'
        })
      );
      expect(mockContextValue.setArchitectureConfig).not.toHaveBeenCalled();
    });

    it('should handle concurrent edits gracefully', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Simulate another user's change
      mockFetchArchitectureData.mockResolvedValue({
        ...mockContextValue.architectureConfig,
        layers: [...mockContextValue.architectureConfig.layers, { id: 'layer-3', name: 'New Layer', components: [] }]
      });

      // Make a local change
      const addLayerButton = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerButton);

      const layerNameInput = screen.getByLabelText(/layer name/i);
      await user.type(layerNameInput, 'Local Layer');
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Simulate refresh with external changes
      await waitFor(() => {
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture was updated by another user. Refreshing...',
            type: 'warning'
          })
        );
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch architecture data on mount', () => {
      renderWithContext(<DesignArchitecture />);
      expect(mockFetchArchitectureData).toHaveBeenCalledWith('proj-123');
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetchArchitectureData.mockRejectedValue(new Error('Network error'));
      renderWithContext(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to load architecture data',
            type: 'error'
          })
        );
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { fetchArchitectureData, saveArchitectureConfig } from './api/architectureApi';
import { useToast } from './hooks/useToast';
import { ArchitectureContext } from './context/ArchitectureContext';

// Mock the API calls
jest.mock('./api/architectureApi');
jest.mock('./hooks/useToast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockFetchArchitectureData = fetchArchitectureData as jest.MockedFunction<typeof fetchArchitectureData>;
const mockSaveArchitectureConfig = saveArchitectureConfig as jest.MockedFunction<typeof saveArchitectureConfig>;
const mockShowToast = useToast as jest.MockedFunction<typeof useToast>;

const mockContextValue = {
  currentProject: { id: 'proj-123', name: 'Test Project' },
  setCurrentProject: jest.fn(),
  architectureConfig: {
    layers: [
      { id: 'layer-1', name: 'Presentation', components: [] },
      { id: 'layer-2', name: 'Application', components: [] }
    ],
    connections: []
  },
  setArchitectureConfig: jest.fn(),
  isLoading: false,
  setIsLoading: jest.fn(),
  error: null,
  setError: jest.fn()
};

const renderWithContext = (ui: React.ReactElement) => {
  return render(
    <ArchitectureContext.Provider value={mockContextValue}>
      {ui}
    </ArchitectureContext.Provider>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast.mockReturnValue({ showToast: jest.fn() });
  });

  describe('Initial Render', () => {
    it('should render loading state initially when data is being fetched', () => {
      mockContextValue.isLoading = true;
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture/i)).toBeInTheDocument();
    });

    it('should render error state when fetch fails', () => {
      mockContextValue.error = new Error('Failed to load');
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    it('should render the architecture canvas when data is loaded', () => {
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
      expect(screen.getByText('Presentation')).toBeInTheDocument();
      expect(screen.getByText('Application')).toBeInTheDocument();
    });
  });

  describe('Layer Operations', () => {
    it('should add a new layer when add layer button is clicked', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const addLayerButton = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerButton);

      const layerNameInput = screen.getByLabelText(/layer name/i);
      const saveButton = screen.getByRole('button', { name: /save/i });

      await user.type(layerNameInput, 'New Layer');
      await user.click(saveButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });

    it('should prevent adding layer with empty name', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const addLayerButton = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(screen.getByText(/layer name is required/i)).toBeInTheDocument();
      expect(mockContextValue.setArchitectureConfig).not.toHaveBeenCalled();
    });

    it('should delete a layer when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const deleteButton = within(layer).getByRole('button', { name: /delete/i });

      await user.click(deleteButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
      expect(screen.queryByText('Presentation')).not.toBeInTheDocument();
    });

    it('should edit layer name when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const editButton = within(layer).getByRole('button', { name: /edit/i });

      await user.click(editButton);

      const layerNameInput = screen.getByDisplayValue('Presentation');
      await user.clear(layerNameInput);
      await user.type(layerNameInput, 'Updated Presentation');
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
      expect(screen.getByText('Updated Presentation')).toBeInTheDocument();
    });
  });

  describe('Component Operations', () => {
    it('should add a component to a layer', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const addComponentButton = within(layer).getByRole('button', { name: /add component/i });

      await user.click(addComponentButton);

      const componentNameInput = screen.getByLabelText(/component name/i);
      await user.type(componentNameInput, 'New Component');
      await user.click(screen.getByRole('button', { name: /add/i }));

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
      expect(within(layer).getByText('New Component')).toBeInTheDocument();
    });

    it('should delete a component from a layer', async () => {
      const user = userEvent.setup();
      // Add a component first
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Test Component' }
      ];
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const component = within(layer).getByText('Test Component').closest('.component') as HTMLElement;
      const deleteButton = within(component).getByRole('button', { name: /delete/i });

      await user.click(deleteButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
      expect(within(layer).queryByText('Test Component')).not.toBeInTheDocument();
    });

    it('should edit component name', async () => {
      const user = userEvent.setup();
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Test Component' }
      ];
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const component = within(layer).getByText('Test Component').closest('.component') as HTMLElement;
      const editButton = within(component).getByRole('button', { name: /edit/i });

      await user.click(editButton);

      const componentNameInput = screen.getByDisplayValue('Test Component');
      await user.clear(componentNameInput);
      await user.type(componentNameInput, 'Updated Component');
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
      expect(within(layer).getByText('Updated Component')).toBeInTheDocument();
    });
  });

  describe('Connection Operations', () => {
    it('should create a connection between two components', async () => {
      const user = userEvent.setup();
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Component 1' }
      ];
      mockContextValue.architectureConfig.layers[1].components = [
        { id: 'comp-2', name: 'Component 2' }
      ];
      renderWithContext(<DesignArchitecture />);

      // Start connection from first component
      const component1 = screen.getByText('Component 1').closest('.component') as HTMLElement;
      const connectButton1 = within(component1).getByRole('button', { name: /connect/i });
      await user.click(connectButton1);

      // Complete connection to second component
      const component2 = screen.getByText('Component 2').closest('.component') as HTMLElement;
      await user.click(component2);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
      expect(mockContextValue.setArchitectureConfig.mock.calls[0][0].connections.length).toBe(1);
    });

    it('should delete a connection', async () => {
      const user = userEvent.setup();
      mockContextValue.architectureConfig.connections = [
        {
          id: 'conn-1',
          source: { componentId: 'comp-1', layerId: 'layer-1' },
          target: { componentId: 'comp-2', layerId: 'layer-2' }
        }
      ];
      renderWithContext(<DesignArchitecture />);

      const connection = screen.getByTestId('connection-conn-1');
      const deleteButton = within(connection).getByRole('button', { name: /delete connection/i });

      await user.click(deleteButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
      expect(mockContextValue.setArchitectureConfig.mock.calls[0][0].connections.length).toBe(0);
    });
  });

  describe('Save Operations', () => {
    it('should save the architecture configuration', async () => {
      const user = userEvent.setup();
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });
      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          'proj-123',
          mockContextValue.architectureConfig
        );
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture saved successfully',
            type: 'success'
          })
        );
      });
    });

    it('should show error when save fails', async () => {
      const user = userEvent.setup();
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));
      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to save architecture',
            type: 'error'
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByRole('button', { name: /add layer/i })).toHaveAttribute('aria-label', 'Add new architecture layer');
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveAttribute('aria-label', 'Save current architecture configuration');

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      expect(within(layer).getByRole('button', { name: /delete/i })).toHaveAttribute('aria-label', 'Delete Presentation layer');
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Tab to add layer button
      await user.tab();
      expect(screen.getByRole('button', { name: /add layer/i })).toHaveFocus();

      // Press Enter to open modal
      await user.keyboard('{Enter}');
      expect(screen.getByLabelText(/layer name/i)).toBeInTheDocument();

      // Tab to input field
      await user.tab();
      expect(screen.getByLabelText(/layer name/i)).toHaveFocus();

      // Type layer name
      await user.keyboard('New Layer');

      // Tab to save button
      await user.tab();
      expect(screen.getByRole('button', { name: /save/i })).toHaveFocus();

      // Press Enter to save
      await user.keyboard('{Enter}');
      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture config', () => {
      mockContextValue.architectureConfig = {
        layers: [],
        connections: []
      };
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByText(/no layers found/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first layer/i)).toBeInTheDocument();
    });

    it('should prevent circular dependencies between components', async () => {
      const user = userEvent.setup();
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Component 1' },
        { id: 'comp-2', name: 'Component 2' }
      ];
      mockContextValue.architectureConfig.connections = [
        {
          id: 'conn-1',
          source: { componentId: 'comp-1', layerId: 'layer-1' },
          target: { componentId: 'comp-2', layerId: 'layer-1' }
        }
      ];
      renderWithContext(<DesignArchitecture />);

      // Try to create circular dependency
      const component2 = screen.getByText('Component 2').closest('.component') as HTMLElement;
      const connectButton2 = within(component2).getByRole('button', { name: /connect/i });
      await user.click(connectButton2);

      const component1 = screen.getByText('Component 1').closest('.component') as HTMLElement;
      await user.click(component1);

      expect(mockShowToast().showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Circular dependency detected',
          type: 'warning'
        })
      );
      expect(mockContextValue.setArchitectureConfig).not.toHaveBeenCalled();
    });

    it('should handle concurrent edits gracefully', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Simulate another user's change
      mockFetchArchitectureData.mockResolvedValue({
        ...mockContextValue.architectureConfig,
        layers: [...mockContextValue.architectureConfig.layers, { id: 'layer-3', name: 'New Layer', components: [] }]
      });

      // Make a local change
      const addLayerButton = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerButton);

      const layerNameInput = screen.getByLabelText(/layer name/i);
      await user.type(layerNameInput, 'Local Layer');
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Simulate refresh with external changes
      await waitFor(() => {
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture was updated by another user. Refreshing...',
            type: 'warning'
          })
        );
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch architecture data on mount', () => {
      renderWithContext(<DesignArchitecture />);
      expect(mockFetchArchitectureData).toHaveBeenCalledWith('proj-123');
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetchArchitectureData.mockRejectedValue(new Error('Network error'));
      renderWithContext(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to load architecture data',
            type: 'error'
          })
        );
      });
    });
  });
});