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

      const addLayerBtn = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerBtn);

      const layerNameInput = screen.getByLabelText(/layer name/i);
      await user.type(layerNameInput, 'New Layer');

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });

    it('should prevent adding layer with empty name', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const addLayerBtn = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerBtn);

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      expect(screen.getByText(/layer name is required/i)).toBeInTheDocument();
      expect(mockContextValue.setArchitectureConfig).not.toHaveBeenCalled();
    });

    it('should delete a layer when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const deleteBtn = within(layer).getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });

    it('should edit layer name when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const editBtn = within(layer).getByRole('button', { name: /edit/i });
      await user.click(editBtn);

      const nameInput = screen.getByDisplayValue('Presentation');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Presentation');

      const saveBtn = screen.getByRole('button', { name: /save/i });
      await user.click(saveBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });
  });

  describe('Component Operations', () => {
    it('should add a component to a layer', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const addComponentBtn = within(layer).getByRole('button', { name: /add component/i });
      await user.click(addComponentBtn);

      const componentNameInput = screen.getByLabelText(/component name/i);
      await user.type(componentNameInput, 'New Component');

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });

    it('should delete a component from a layer', async () => {
      // First add a component
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Test Component' }
      ];

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const component = screen.getByText('Test Component').closest('.component') as HTMLElement;
      const deleteBtn = within(component).getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });

    it('should edit component name', async () => {
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Test Component' }
      ];

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const component = screen.getByText('Test Component').closest('.component') as HTMLElement;
      const editBtn = within(component).getByRole('button', { name: /edit/i });
      await user.click(editBtn);

      const nameInput = screen.getByDisplayValue('Test Component');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Component');

      const saveBtn = screen.getByRole('button', { name: /save/i });
      await user.click(saveBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });
  });

  describe('Connection Operations', () => {
    it('should create a connection between two components', async () => {
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Component 1' }
      ];
      mockContextValue.architectureConfig.layers[1].components = [
        { id: 'comp-2', name: 'Component 2' }
      ];

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Start connection from first component
      const comp1 = screen.getByText('Component 1').closest('.component') as HTMLElement;
      const connectBtn = within(comp1).getByRole('button', { name: /connect/i });
      await user.click(connectBtn);

      // Select second component as target
      const comp2 = screen.getByText('Component 2').closest('.component') as HTMLElement;
      await user.click(comp2);

      // Fill connection details
      const connectionNameInput = screen.getByLabelText(/connection name/i);
      await user.type(connectionNameInput, 'API Call');

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });

    it('should delete a connection', async () => {
      mockContextValue.architectureConfig.connections = [
        {
          id: 'conn-1',
          source: 'comp-1',
          target: 'comp-2',
          name: 'Test Connection'
        }
      ];

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const connection = screen.getByText('Test Connection').closest('.connection') as HTMLElement;
      const deleteBtn = within(connection).getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });
  });

  describe('Save Operations', () => {
    it('should save the architecture configuration', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const saveBtn = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveBtn);

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
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const saveBtn = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveBtn);

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

      expect(screen.getByRole('button', { name: /add layer/i })).toHaveAttribute('aria-label', 'Add new layer');
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveAttribute('aria-label', 'Save architecture configuration');
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Tab to add layer button
      await user.tab();
      expect(screen.getByRole('button', { name: /add layer/i })).toHaveFocus();

      // Press Enter to open dialog
      await user.keyboard('{Enter}');
      expect(screen.getByLabelText(/layer name/i)).toBeInTheDocument();

      // Tab to input field
      await user.tab();
      expect(screen.getByLabelText(/layer name/i)).toHaveFocus();

      // Type layer name
      await user.keyboard('New Layer');

      // Tab to confirm button
      await user.tab();
      expect(screen.getByRole('button', { name: /confirm/i })).toHaveFocus();

      // Press Enter to confirm
      await user.keyboard('{Enter}');
    });

    it('should have proper contrast ratios for text elements', () => {
      renderWithContext(<DesignArchitecture />);

      const layerText = screen.getByText('Presentation');
      expect(layerText).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Assuming default theme

      const button = screen.getByRole('button', { name: /add layer/i });
      expect(button).toHaveStyle('color: rgb(255, 255, 255)'); // Assuming primary button style
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

    it('should prevent circular connections', async () => {
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Component 1' }
      ];

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Try to connect component to itself
      const comp1 = screen.getByText('Component 1').closest('.component') as HTMLElement;
      const connectBtn = within(comp1).getByRole('button', { name: /connect/i });
      await user.click(connectBtn);

      await user.click(comp1);

      expect(screen.getByText(/cannot connect to itself/i)).toBeInTheDocument();
      expect(mockContextValue.setArchitectureConfig).not.toHaveBeenCalled();
    });

    it('should handle concurrent edits gracefully', async () => {
      // Simulate another user's change
      mockFetchArchitectureData.mockResolvedValue({
        ...mockContextValue.architectureConfig,
        layers: [...mockContextValue.architectureConfig.layers, { id: 'layer-3', name: 'New Layer', components: [] }]
      });

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Make a local change
      const addLayerBtn = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerBtn);

      const layerNameInput = screen.getByLabelText(/layer name/i);
      await user.type(layerNameInput, 'Local Layer');

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      // Simulate refresh with external changes
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

      await waitFor(() => {
        expect(screen.getByText('New Layer')).toBeInTheDocument();
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture was updated by another user. Your local changes may be overwritten.',
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

    it('should allow retry after fetch failure', async () => {
      mockFetchArchitectureData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockContextValue.architectureConfig);

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await user.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
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

      const addLayerBtn = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerBtn);

      const layerNameInput = screen.getByLabelText(/layer name/i);
      await user.type(layerNameInput, 'New Layer');

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });

    it('should prevent adding layer with empty name', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const addLayerBtn = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerBtn);

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      expect(screen.getByText(/layer name is required/i)).toBeInTheDocument();
      expect(mockContextValue.setArchitectureConfig).not.toHaveBeenCalled();
    });

    it('should delete a layer when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const deleteBtn = within(layer).getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });

    it('should edit layer name when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const editBtn = within(layer).getByRole('button', { name: /edit/i });
      await user.click(editBtn);

      const nameInput = screen.getByDisplayValue('Presentation');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Presentation');

      const saveBtn = screen.getByRole('button', { name: /save/i });
      await user.click(saveBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });
  });

  describe('Component Operations', () => {
    it('should add a component to a layer', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const addComponentBtn = within(layer).getByRole('button', { name: /add component/i });
      await user.click(addComponentBtn);

      const componentNameInput = screen.getByLabelText(/component name/i);
      await user.type(componentNameInput, 'New Component');

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });

    it('should delete a component from a layer', async () => {
      // First add a component
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Test Component' }
      ];

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const component = screen.getByText('Test Component').closest('.component') as HTMLElement;
      const deleteBtn = within(component).getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });

    it('should edit component name', async () => {
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Test Component' }
      ];

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const component = screen.getByText('Test Component').closest('.component') as HTMLElement;
      const editBtn = within(component).getByRole('button', { name: /edit/i });
      await user.click(editBtn);

      const nameInput = screen.getByDisplayValue('Test Component');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Component');

      const saveBtn = screen.getByRole('button', { name: /save/i });
      await user.click(saveBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });
  });

  describe('Connection Operations', () => {
    it('should create a connection between two components', async () => {
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Component 1' }
      ];
      mockContextValue.architectureConfig.layers[1].components = [
        { id: 'comp-2', name: 'Component 2' }
      ];

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Start connection from first component
      const comp1 = screen.getByText('Component 1').closest('.component') as HTMLElement;
      const connectBtn = within(comp1).getByRole('button', { name: /connect/i });
      await user.click(connectBtn);

      // Select second component as target
      const comp2 = screen.getByText('Component 2').closest('.component') as HTMLElement;
      await user.click(comp2);

      // Fill connection details
      const connectionNameInput = screen.getByLabelText(/connection name/i);
      await user.type(connectionNameInput, 'API Call');

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });

    it('should delete a connection', async () => {
      mockContextValue.architectureConfig.connections = [
        {
          id: 'conn-1',
          source: 'comp-1',
          target: 'comp-2',
          name: 'Test Connection'
        }
      ];

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const connection = screen.getByText('Test Connection').closest('.connection') as HTMLElement;
      const deleteBtn = within(connection).getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalled();
    });
  });

  describe('Save Operations', () => {
    it('should save the architecture configuration', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const saveBtn = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveBtn);

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
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const saveBtn = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveBtn);

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

      expect(screen.getByRole('button', { name: /add layer/i })).toHaveAttribute('aria-label', 'Add new layer');
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveAttribute('aria-label', 'Save architecture configuration');
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Tab to add layer button
      await user.tab();
      expect(screen.getByRole('button', { name: /add layer/i })).toHaveFocus();

      // Press Enter to open dialog
      await user.keyboard('{Enter}');
      expect(screen.getByLabelText(/layer name/i)).toBeInTheDocument();

      // Tab to input field
      await user.tab();
      expect(screen.getByLabelText(/layer name/i)).toHaveFocus();

      // Type layer name
      await user.keyboard('New Layer');

      // Tab to confirm button
      await user.tab();
      expect(screen.getByRole('button', { name: /confirm/i })).toHaveFocus();

      // Press Enter to confirm
      await user.keyboard('{Enter}');
    });

    it('should have proper contrast ratios for text elements', () => {
      renderWithContext(<DesignArchitecture />);

      const layerText = screen.getByText('Presentation');
      expect(layerText).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Assuming default theme

      const button = screen.getByRole('button', { name: /add layer/i });
      expect(button).toHaveStyle('color: rgb(255, 255, 255)'); // Assuming primary button style
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

    it('should prevent circular connections', async () => {
      mockContextValue.architectureConfig.layers[0].components = [
        { id: 'comp-1', name: 'Component 1' }
      ];

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Try to connect component to itself
      const comp1 = screen.getByText('Component 1').closest('.component') as HTMLElement;
      const connectBtn = within(comp1).getByRole('button', { name: /connect/i });
      await user.click(connectBtn);

      await user.click(comp1);

      expect(screen.getByText(/cannot connect to itself/i)).toBeInTheDocument();
      expect(mockContextValue.setArchitectureConfig).not.toHaveBeenCalled();
    });

    it('should handle concurrent edits gracefully', async () => {
      // Simulate another user's change
      mockFetchArchitectureData.mockResolvedValue({
        ...mockContextValue.architectureConfig,
        layers: [...mockContextValue.architectureConfig.layers, { id: 'layer-3', name: 'New Layer', components: [] }]
      });

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Make a local change
      const addLayerBtn = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerBtn);

      const layerNameInput = screen.getByLabelText(/layer name/i);
      await user.type(layerNameInput, 'Local Layer');

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      // Simulate refresh with external changes
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

      await waitFor(() => {
        expect(screen.getByText('New Layer')).toBeInTheDocument();
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture was updated by another user. Your local changes may be overwritten.',
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

    it('should allow retry after fetch failure', async () => {
      mockFetchArchitectureData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockContextValue.architectureConfig);

      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await user.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
      });
    });
  });
});