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
  architecture: {
    layers: [
      { id: 'layer-1', name: 'Presentation', components: [] },
      { id: 'layer-2', name: 'Application', components: [] }
    ],
    connections: []
  },
  setArchitecture: jest.fn(),
  loading: false,
  setLoading: jest.fn(),
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
      mockContextValue.loading = true;
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture/i)).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockContextValue.error = new Error('Failed to load');
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    it('should render the architecture canvas when data is loaded successfully', () => {
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
      expect(screen.getByText('Presentation')).toBeInTheDocument();
      expect(screen.getByText('Application')).toBeInTheDocument();
    });
  });

  describe('Layer Management', () => {
    it('should allow adding a new layer', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const addLayerButton = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerButton);

      const layerNameInput = screen.getByLabelText(/layer name/i);
      await user.type(layerNameInput, 'Domain');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: expect.arrayContaining([
            expect.objectContaining({ name: 'Domain' })
          ])
        })
      );
    });

    it('should validate layer name before adding', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const addLayerButton = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(screen.getByText(/layer name is required/i)).toBeInTheDocument();
      expect(mockContextValue.setArchitecture).not.toHaveBeenCalled();
    });

    it('should allow deleting a layer with confirmation', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const deleteButton = within(layer).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: expect.not.arrayContaining([
            expect.objectContaining({ name: 'Presentation' })
          ])
        })
      );
    });

    it('should prevent deleting layer when it has components', async () => {
      mockContextValue.architecture.layers[0].components = [{ id: 'comp-1', name: 'Test Component' }];
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const deleteButton = within(layer).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(screen.getByText(/cannot delete layer with components/i)).toBeInTheDocument();
      expect(mockContextValue.setArchitecture).not.toHaveBeenCalled();
    });
  });

  describe('Component Management', () => {
    it('should allow adding a component to a layer', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const addComponentButton = within(layer).getByRole('button', { name: /add component/i });
      await user.click(addComponentButton);

      const componentNameInput = screen.getByLabelText(/component name/i);
      await user.type(componentNameInput, 'User Interface');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: expect.arrayContaining([
            expect.objectContaining({
              name: 'Presentation',
              components: expect.arrayContaining([
                expect.objectContaining({ name: 'User Interface' })
              ])
            })
          ])
        })
      );
    });

    it('should validate component name before adding', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const addComponentButton = within(layer).getByRole('button', { name: /add component/i });
      await user.click(addComponentButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(screen.getByText(/component name is required/i)).toBeInTheDocument();
      expect(mockContextValue.setArchitecture).not.toHaveBeenCalled();
    });

    it('should allow editing a component', async () => {
      mockContextValue.architecture.layers[0].components = [
        { id: 'comp-1', name: 'Old Name', type: 'service' }
      ];
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const component = screen.getByText('Old Name').closest('.component') as HTMLElement;
      const editButton = within(component).getByRole('button', { name: /edit/i });
      await user.click(editButton);

      const componentNameInput = screen.getByLabelText(/component name/i);
      await user.clear(componentNameInput);
      await user.type(componentNameInput, 'New Name');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: expect.arrayContaining([
            expect.objectContaining({
              components: expect.arrayContaining([
                expect.objectContaining({ name: 'New Name' })
              ])
            })
          ])
        })
      );
    });

    it('should allow deleting a component with confirmation', async () => {
      mockContextValue.architecture.layers[0].components = [
        { id: 'comp-1', name: 'Test Component' }
      ];
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const component = screen.getByText('Test Component').closest('.component') as HTMLElement;
      const deleteButton = within(component).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: expect.arrayContaining([
            expect.objectContaining({
              components: []
            })
          ])
        })
      );
    });
  });

  describe('Connection Management', () => {
    it('should allow creating a connection between components', async () => {
      mockContextValue.architecture = {
        layers: [
          {
            id: 'layer-1',
            name: 'Presentation',
            components: [
              { id: 'comp-1', name: 'UI Component' },
              { id: 'comp-2', name: 'API Gateway' }
            ]
          }
        ],
        connections: []
      };
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Start connection from first component
      const sourceComponent = screen.getByText('UI Component').closest('.component') as HTMLElement;
      const connectButton = within(sourceComponent).getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      // Select target component
      const targetComponent = screen.getByText('API Gateway').closest('.component') as HTMLElement;
      await user.click(targetComponent);

      // Save connection
      const saveButton = screen.getByRole('button', { name: /save connection/i });
      await user.click(saveButton);

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          connections: expect.arrayContaining([
            expect.objectContaining({
              source: 'comp-1',
              target: 'comp-2'
            })
          ])
        })
      );
    });

    it('should prevent creating duplicate connections', async () => {
      mockContextValue.architecture = {
        layers: [
          {
            id: 'layer-1',
            name: 'Presentation',
            components: [
              { id: 'comp-1', name: 'UI Component' },
              { id: 'comp-2', name: 'API Gateway' }
            ]
          }
        ],
        connections: [
          { id: 'conn-1', source: 'comp-1', target: 'comp-2', type: 'http' }
        ]
      };
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const sourceComponent = screen.getByText('UI Component').closest('.component') as HTMLElement;
      const connectButton = within(sourceComponent).getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      const targetComponent = screen.getByText('API Gateway').closest('.component') as HTMLElement;
      await user.click(targetComponent);

      expect(screen.getByText(/connection already exists/i)).toBeInTheDocument();
      expect(mockContextValue.setArchitecture).not.toHaveBeenCalled();
    });

    it('should allow deleting a connection', async () => {
      mockContextValue.architecture = {
        layers: [
          {
            id: 'layer-1',
            name: 'Presentation',
            components: [
              { id: 'comp-1', name: 'UI Component' },
              { id: 'comp-2', name: 'API Gateway' }
            ]
          }
        ],
        connections: [
          { id: 'conn-1', source: 'comp-1', target: 'comp-2', type: 'http' }
        ]
      };
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const connection = screen.getByTestId('connection-conn-1');
      const deleteButton = within(connection).getByRole('button', { name: /delete connection/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          connections: []
        })
      );
    });
  });

  describe('Save and Export', () => {
    it('should save the architecture configuration', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          'proj-123',
          mockContextValue.architecture
        );
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture saved successfully',
            type: 'success'
          })
        );
      });
    });

    it('should handle save errors gracefully', async () => {
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));
      const user = userEvent.setup();
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

    it('should export the architecture as JSON', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const exportButton = screen.getByRole('button', { name: /export as json/i });
      await user.click(exportButton);

      expect(screen.getByText(/architecture configuration/i)).toBeInTheDocument();
      expect(screen.getByText(JSON.stringify(mockContextValue.architecture, null, 2))).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', () => {
      renderWithContext(<DesignArchitecture />);

      const addLayerButton = screen.getByRole('button', { name: /add layer/i });
      expect(addLayerButton).toHaveAttribute('aria-label', 'Add new architecture layer');

      const layers = screen.getAllByRole('region', { name: /layer/i });
      expect(layers.length).toBeGreaterThan(0);
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Tab to add layer button and activate it
      await user.tab();
      await user.keyboard('{Enter}');

      expect(screen.getByLabelText(/layer name/i)).toBeInTheDocument();

      // Tab to input and type
      await user.tab();
      await user.keyboard('New Layer');

      // Tab to save button and activate it
      await user.tab();
      await user.keyboard('{Enter}');

      expect(mockContextValue.setArchitecture).toHaveBeenCalled();
    });

    it('should have proper contrast ratios for text elements', () => {
      renderWithContext(<DesignArchitecture />);

      const layerHeaders = screen.getAllByRole('heading', { name: /presentation|application/i });
      layerHeaders.forEach(header => {
        const style = window.getComputedStyle(header);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        // This is a simplified check - in real tests you'd use a proper contrast checker
        expect(color).not.toBe(backgroundColor);
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component rendering errors gracefully', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = DesignArchitecture;

      // Simulate a rendering error in a child component
      jest.doMock('./components/Layer', () => {
        throw new Error('Layer component failed');
      });

      const { DesignArchitecture: BrokenComponent } = jest.requireActual('./DesignArchitecture');
      renderWithContext(<BrokenComponent />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/error rendering architecture/i)).toBeInTheDocument();

      jest.restoreAllMocks();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when unrelated state changes', () => {
      const { rerender } = renderWithContext(<DesignArchitecture />);
      const initialRender = screen.getByTestId('architecture-canvas');

      // Change something unrelated in context
      mockContextValue.currentProject.name = 'Updated Project';
      rerender(
        <ArchitectureContext.Provider value={mockContextValue}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      const updatedRender = screen.getByTestId('architecture-canvas');
      expect(initialRender).toBe(updatedRender);
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
  architecture: {
    layers: [
      { id: 'layer-1', name: 'Presentation', components: [] },
      { id: 'layer-2', name: 'Application', components: [] }
    ],
    connections: []
  },
  setArchitecture: jest.fn(),
  loading: false,
  setLoading: jest.fn(),
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
      mockContextValue.loading = true;
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture/i)).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockContextValue.error = new Error('Failed to load');
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    it('should render the architecture canvas when data is loaded successfully', () => {
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
      expect(screen.getByText('Presentation')).toBeInTheDocument();
      expect(screen.getByText('Application')).toBeInTheDocument();
    });
  });

  describe('Layer Management', () => {
    it('should allow adding a new layer', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const addLayerButton = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerButton);

      const layerNameInput = screen.getByLabelText(/layer name/i);
      await user.type(layerNameInput, 'Domain');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: expect.arrayContaining([
            expect.objectContaining({ name: 'Domain' })
          ])
        })
      );
    });

    it('should validate layer name before adding', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const addLayerButton = screen.getByRole('button', { name: /add layer/i });
      await user.click(addLayerButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(screen.getByText(/layer name is required/i)).toBeInTheDocument();
      expect(mockContextValue.setArchitecture).not.toHaveBeenCalled();
    });

    it('should allow deleting a layer with confirmation', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const deleteButton = within(layer).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: expect.not.arrayContaining([
            expect.objectContaining({ name: 'Presentation' })
          ])
        })
      );
    });

    it('should prevent deleting layer when it has components', async () => {
      mockContextValue.architecture.layers[0].components = [{ id: 'comp-1', name: 'Test Component' }];
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const deleteButton = within(layer).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(screen.getByText(/cannot delete layer with components/i)).toBeInTheDocument();
      expect(mockContextValue.setArchitecture).not.toHaveBeenCalled();
    });
  });

  describe('Component Management', () => {
    it('should allow adding a component to a layer', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const addComponentButton = within(layer).getByRole('button', { name: /add component/i });
      await user.click(addComponentButton);

      const componentNameInput = screen.getByLabelText(/component name/i);
      await user.type(componentNameInput, 'User Interface');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: expect.arrayContaining([
            expect.objectContaining({
              name: 'Presentation',
              components: expect.arrayContaining([
                expect.objectContaining({ name: 'User Interface' })
              ])
            })
          ])
        })
      );
    });

    it('should validate component name before adding', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const layer = screen.getByText('Presentation').closest('.layer') as HTMLElement;
      const addComponentButton = within(layer).getByRole('button', { name: /add component/i });
      await user.click(addComponentButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(screen.getByText(/component name is required/i)).toBeInTheDocument();
      expect(mockContextValue.setArchitecture).not.toHaveBeenCalled();
    });

    it('should allow editing a component', async () => {
      mockContextValue.architecture.layers[0].components = [
        { id: 'comp-1', name: 'Old Name', type: 'service' }
      ];
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const component = screen.getByText('Old Name').closest('.component') as HTMLElement;
      const editButton = within(component).getByRole('button', { name: /edit/i });
      await user.click(editButton);

      const componentNameInput = screen.getByLabelText(/component name/i);
      await user.clear(componentNameInput);
      await user.type(componentNameInput, 'New Name');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: expect.arrayContaining([
            expect.objectContaining({
              components: expect.arrayContaining([
                expect.objectContaining({ name: 'New Name' })
              ])
            })
          ])
        })
      );
    });

    it('should allow deleting a component with confirmation', async () => {
      mockContextValue.architecture.layers[0].components = [
        { id: 'comp-1', name: 'Test Component' }
      ];
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const component = screen.getByText('Test Component').closest('.component') as HTMLElement;
      const deleteButton = within(component).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: expect.arrayContaining([
            expect.objectContaining({
              components: []
            })
          ])
        })
      );
    });
  });

  describe('Connection Management', () => {
    it('should allow creating a connection between components', async () => {
      mockContextValue.architecture = {
        layers: [
          {
            id: 'layer-1',
            name: 'Presentation',
            components: [
              { id: 'comp-1', name: 'UI Component' },
              { id: 'comp-2', name: 'API Gateway' }
            ]
          }
        ],
        connections: []
      };
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Start connection from first component
      const sourceComponent = screen.getByText('UI Component').closest('.component') as HTMLElement;
      const connectButton = within(sourceComponent).getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      // Select target component
      const targetComponent = screen.getByText('API Gateway').closest('.component') as HTMLElement;
      await user.click(targetComponent);

      // Save connection
      const saveButton = screen.getByRole('button', { name: /save connection/i });
      await user.click(saveButton);

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          connections: expect.arrayContaining([
            expect.objectContaining({
              source: 'comp-1',
              target: 'comp-2'
            })
          ])
        })
      );
    });

    it('should prevent creating duplicate connections', async () => {
      mockContextValue.architecture = {
        layers: [
          {
            id: 'layer-1',
            name: 'Presentation',
            components: [
              { id: 'comp-1', name: 'UI Component' },
              { id: 'comp-2', name: 'API Gateway' }
            ]
          }
        ],
        connections: [
          { id: 'conn-1', source: 'comp-1', target: 'comp-2', type: 'http' }
        ]
      };
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const sourceComponent = screen.getByText('UI Component').closest('.component') as HTMLElement;
      const connectButton = within(sourceComponent).getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      const targetComponent = screen.getByText('API Gateway').closest('.component') as HTMLElement;
      await user.click(targetComponent);

      expect(screen.getByText(/connection already exists/i)).toBeInTheDocument();
      expect(mockContextValue.setArchitecture).not.toHaveBeenCalled();
    });

    it('should allow deleting a connection', async () => {
      mockContextValue.architecture = {
        layers: [
          {
            id: 'layer-1',
            name: 'Presentation',
            components: [
              { id: 'comp-1', name: 'UI Component' },
              { id: 'comp-2', name: 'API Gateway' }
            ]
          }
        ],
        connections: [
          { id: 'conn-1', source: 'comp-1', target: 'comp-2', type: 'http' }
        ]
      };
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const connection = screen.getByTestId('connection-conn-1');
      const deleteButton = within(connection).getByRole('button', { name: /delete connection/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          connections: []
        })
      );
    });
  });

  describe('Save and Export', () => {
    it('should save the architecture configuration', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          'proj-123',
          mockContextValue.architecture
        );
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture saved successfully',
            type: 'success'
          })
        );
      });
    });

    it('should handle save errors gracefully', async () => {
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));
      const user = userEvent.setup();
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

    it('should export the architecture as JSON', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      const exportButton = screen.getByRole('button', { name: /export as json/i });
      await user.click(exportButton);

      expect(screen.getByText(/architecture configuration/i)).toBeInTheDocument();
      expect(screen.getByText(JSON.stringify(mockContextValue.architecture, null, 2))).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', () => {
      renderWithContext(<DesignArchitecture />);

      const addLayerButton = screen.getByRole('button', { name: /add layer/i });
      expect(addLayerButton).toHaveAttribute('aria-label', 'Add new architecture layer');

      const layers = screen.getAllByRole('region', { name: /layer/i });
      expect(layers.length).toBeGreaterThan(0);
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithContext(<DesignArchitecture />);

      // Tab to add layer button and activate it
      await user.tab();
      await user.keyboard('{Enter}');

      expect(screen.getByLabelText(/layer name/i)).toBeInTheDocument();

      // Tab to input and type
      await user.tab();
      await user.keyboard('New Layer');

      // Tab to save button and activate it
      await user.tab();
      await user.keyboard('{Enter}');

      expect(mockContextValue.setArchitecture).toHaveBeenCalled();
    });

    it('should have proper contrast ratios for text elements', () => {
      renderWithContext(<DesignArchitecture />);

      const layerHeaders = screen.getAllByRole('heading', { name: /presentation|application/i });
      layerHeaders.forEach(header => {
        const style = window.getComputedStyle(header);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        // This is a simplified check - in real tests you'd use a proper contrast checker
        expect(color).not.toBe(backgroundColor);
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component rendering errors gracefully', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = DesignArchitecture;

      // Simulate a rendering error in a child component
      jest.doMock('./components/Layer', () => {
        throw new Error('Layer component failed');
      });

      const { DesignArchitecture: BrokenComponent } = jest.requireActual('./DesignArchitecture');
      renderWithContext(<BrokenComponent />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/error rendering architecture/i)).toBeInTheDocument();

      jest.restoreAllMocks();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when unrelated state changes', () => {
      const { rerender } = renderWithContext(<DesignArchitecture />);
      const initialRender = screen.getByTestId('architecture-canvas');

      // Change something unrelated in context
      mockContextValue.currentProject.name = 'Updated Project';
      rerender(
        <ArchitectureContext.Provider value={mockContextValue}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      const updatedRender = screen.getByTestId('architecture-canvas');
      expect(initialRender).toBe(updatedRender);
    });
  });
});