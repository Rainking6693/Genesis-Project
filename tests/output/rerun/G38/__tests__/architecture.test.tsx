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
const mockShowToast = useToast() as jest.MockedFunction<any>;

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
    name: 'Microservices',
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
    mockFetchArchitectureData.mockResolvedValue(mockData);
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      mockFetchArchitectureData.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByTestId('architecture-loader')).toBeInTheDocument();
      expect(screen.queryByTestId('architecture-canvas')).not.toBeInTheDocument();
    });

    it('should render architecture canvas after data loads', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      const errorMessage = 'Failed to load architecture';
      mockFetchArchitectureData.mockRejectedValue(new Error(errorMessage));
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Component Interaction', () => {
    it('should allow dragging components on the canvas', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        const component = screen.getByText('API Gateway');
        const initialPosition = component.getBoundingClientRect();

        fireEvent.dragStart(component);
        fireEvent.drag(component, { clientX: initialPosition.x + 50, clientY: initialPosition.y + 50 });
        fireEvent.dragEnd(component);

        const newPosition = component.getBoundingClientRect();
        expect(newPosition.x).not.toBe(initialPosition.x);
        expect(newPosition.y).not.toBe(initialPosition.y);
      });
    });

    it('should open component config panel when clicking a component', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        userEvent.click(screen.getByText('API Gateway'));
        expect(screen.getByTestId('component-config-panel')).toBeInTheDocument();
        expect(screen.getByDisplayValue('API Gateway')).toBeInTheDocument();
      });
    });

    it('should update component name in config panel', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        userEvent.click(screen.getByText('API Gateway'));
        const nameInput = screen.getByLabelText(/component name/i);
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'New Gateway Name');

        expect(nameInput).toHaveValue('New Gateway Name');
      });
    });

    it('should add new connection between components', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        const apiGateway = screen.getByText('API Gateway');
        const userService = screen.getByText('User Service');

        // Simulate connection start
        fireEvent.contextMenu(apiGateway);
        fireEvent.click(screen.getByText(/connect to/i));

        // Simulate connection end
        fireEvent.click(userService);

        await waitFor(() => {
          expect(screen.getByTestId('connection-1-2')).toBeInTheDocument();
        });
      });
    });

    it('should delete a component', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        userEvent.click(screen.getByText('API Gateway'));
        fireEvent.click(screen.getByLabelText(/delete component/i));

        await waitFor(() => {
          expect(screen.queryByText('API Gateway')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('Architecture Operations', () => {
    it('should save architecture configuration', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByText(/save architecture/i));

        await waitFor(() => {
          expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({ name: 'API Gateway' })
            ])
          }));
          expect(mockShowToast).toHaveBeenCalledWith({
            type: 'success',
            message: 'Architecture saved successfully'
          });
        });
      });
    });

    it('should show error when save fails', async () => {
      const errorMessage = 'Save failed';
      mockSaveArchitectureConfig.mockRejectedValue(new Error(errorMessage));
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByText(/save architecture/i));

        await waitFor(() => {
          expect(mockShowToast).toHaveBeenCalledWith({
            type: 'error',
            message: `Failed to save architecture: ${errorMessage}`
          });
        });
      });
    });

    it('should reset to default architecture', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByText(/reset architecture/i));
        fireEvent.click(screen.getByText(/confirm/i));

        await waitFor(() => {
          expect(mockFetchArchitectureData).toHaveBeenCalledTimes(2);
          expect(screen.getByText('API Gateway')).toBeInTheDocument();
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByLabelText(/architecture canvas/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add new component/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/save architecture/i)).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        const addButton = screen.getByLabelText(/add new component/i);
        addButton.focus();
        userEvent.keyboard('{Enter}');

        await waitFor(() => {
          expect(screen.getByTestId('add-component-modal')).toBeInTheDocument();
        });
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        const components = screen.getAllByText(/gateway|service/i);
        components.forEach(component => {
          const style = window.getComputedStyle(component);
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          // This is a simplified check - in real tests you'd use a proper contrast checking library
          expect(color).not.toBe(backgroundColor);
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

      await waitFor(() => {
        expect(screen.getByText(/no components added/i)).toBeInTheDocument();
        expect(screen.getByText(/drag components from the palette/i)).toBeInTheDocument();
      });
    });

    it('should prevent circular connections', async () => {
      const circularData = {
        ...mockData,
        connections: [
          { id: '1', source: '1', target: '2', type: 'http' },
          { id: '2', source: '2', target: '1', type: 'http' }
        ]
      };
      mockFetchArchitectureData.mockResolvedValue(circularData);
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        const apiGateway = screen.getByText('API Gateway');
        fireEvent.contextMenu(apiGateway);
        fireEvent.click(screen.getByText(/connect to/i));
        fireEvent.click(screen.getByText('User Service'));

        await waitFor(() => {
          expect(mockShowToast).toHaveBeenCalledWith({
            type: 'warning',
            message: 'Circular connection detected'
          });
        });
      });
    });

    it('should handle component position conflicts', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        const component = screen.getByText('API Gateway');
        const initialPosition = component.getBoundingClientRect();

        // Try to drag to same position as another component
        fireEvent.dragStart(component);
        fireEvent.drag(component, {
          clientX: initialPosition.x + 100,
          clientY: initialPosition.y + 100
        });
        fireEvent.dragEnd(component);

        await waitFor(() => {
          expect(mockShowToast).toHaveBeenCalledWith({
            type: 'warning',
            message: 'Position conflict detected'
          });
        });
      });
    });
  });

  describe('Component Palette', () => {
    it('should open component palette when add button is clicked', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByLabelText(/add new component/i));
        expect(screen.getByTestId('component-palette')).toBeInTheDocument();
      });
    });

    it('should add new component from palette', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByLabelText(/add new component/i));
        const databaseComponent = screen.getByText(/database/i);
        fireEvent.dragStart(databaseComponent);

        const canvas = screen.getByTestId('architecture-canvas');
        fireEvent.drop(canvas, {
          clientX: 300,
          clientY: 300
        });

        await waitFor(() => {
          expect(screen.getByText(/database/i)).toBeInTheDocument();
        });
      });
    });

    it('should filter components in palette by search', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByLabelText(/add new component/i));
        const searchInput = screen.getByPlaceholderText(/search components/i);
        await userEvent.type(searchInput, 'service');

        expect(screen.getByText(/user service/i)).toBeInTheDocument();
        expect(screen.queryByText(/database/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Connection Management', () => {
    it('should show connection details when clicked', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        const connection = screen.getByTestId('connection-1-2');
        fireEvent.click(connection);

        expect(screen.getByTestId('connection-config-panel')).toBeInTheDocument();
        expect(screen.getByDisplayValue(/http/i)).toBeInTheDocument();
      });
    });

    it('should update connection type', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByTestId('connection-1-2'));
        const typeSelect = screen.getByLabelText(/connection type/i);
        await userEvent.selectOptions(typeSelect, 'grpc');

        expect(screen.getByDisplayValue(/grpc/i)).toBeInTheDocument();
      });
    });

    it('should delete a connection', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByTestId('connection-1-2'));
        fireEvent.click(screen.getByLabelText(/delete connection/i));

        await waitFor(() => {
          expect(screen.queryByTestId('connection-1-2')).not.toBeInTheDocument();
        });
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
const mockShowToast = useToast() as jest.MockedFunction<any>;

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
    name: 'Microservices',
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
    mockFetchArchitectureData.mockResolvedValue(mockData);
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      mockFetchArchitectureData.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByTestId('architecture-loader')).toBeInTheDocument();
      expect(screen.queryByTestId('architecture-canvas')).not.toBeInTheDocument();
    });

    it('should render architecture canvas after data loads', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      const errorMessage = 'Failed to load architecture';
      mockFetchArchitectureData.mockRejectedValue(new Error(errorMessage));
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Component Interaction', () => {
    it('should allow dragging components on the canvas', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        const component = screen.getByText('API Gateway');
        const initialPosition = component.getBoundingClientRect();

        fireEvent.dragStart(component);
        fireEvent.drag(component, { clientX: initialPosition.x + 50, clientY: initialPosition.y + 50 });
        fireEvent.dragEnd(component);

        const newPosition = component.getBoundingClientRect();
        expect(newPosition.x).not.toBe(initialPosition.x);
        expect(newPosition.y).not.toBe(initialPosition.y);
      });
    });

    it('should open component config panel when clicking a component', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        userEvent.click(screen.getByText('API Gateway'));
        expect(screen.getByTestId('component-config-panel')).toBeInTheDocument();
        expect(screen.getByDisplayValue('API Gateway')).toBeInTheDocument();
      });
    });

    it('should update component name in config panel', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        userEvent.click(screen.getByText('API Gateway'));
        const nameInput = screen.getByLabelText(/component name/i);
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'New Gateway Name');

        expect(nameInput).toHaveValue('New Gateway Name');
      });
    });

    it('should add new connection between components', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        const apiGateway = screen.getByText('API Gateway');
        const userService = screen.getByText('User Service');

        // Simulate connection start
        fireEvent.contextMenu(apiGateway);
        fireEvent.click(screen.getByText(/connect to/i));

        // Simulate connection end
        fireEvent.click(userService);

        await waitFor(() => {
          expect(screen.getByTestId('connection-1-2')).toBeInTheDocument();
        });
      });
    });

    it('should delete a component', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        userEvent.click(screen.getByText('API Gateway'));
        fireEvent.click(screen.getByLabelText(/delete component/i));

        await waitFor(() => {
          expect(screen.queryByText('API Gateway')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('Architecture Operations', () => {
    it('should save architecture configuration', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByText(/save architecture/i));

        await waitFor(() => {
          expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({ name: 'API Gateway' })
            ])
          }));
          expect(mockShowToast).toHaveBeenCalledWith({
            type: 'success',
            message: 'Architecture saved successfully'
          });
        });
      });
    });

    it('should show error when save fails', async () => {
      const errorMessage = 'Save failed';
      mockSaveArchitectureConfig.mockRejectedValue(new Error(errorMessage));
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByText(/save architecture/i));

        await waitFor(() => {
          expect(mockShowToast).toHaveBeenCalledWith({
            type: 'error',
            message: `Failed to save architecture: ${errorMessage}`
          });
        });
      });
    });

    it('should reset to default architecture', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByText(/reset architecture/i));
        fireEvent.click(screen.getByText(/confirm/i));

        await waitFor(() => {
          expect(mockFetchArchitectureData).toHaveBeenCalledTimes(2);
          expect(screen.getByText('API Gateway')).toBeInTheDocument();
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByLabelText(/architecture canvas/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add new component/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/save architecture/i)).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        const addButton = screen.getByLabelText(/add new component/i);
        addButton.focus();
        userEvent.keyboard('{Enter}');

        await waitFor(() => {
          expect(screen.getByTestId('add-component-modal')).toBeInTheDocument();
        });
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        const components = screen.getAllByText(/gateway|service/i);
        components.forEach(component => {
          const style = window.getComputedStyle(component);
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          // This is a simplified check - in real tests you'd use a proper contrast checking library
          expect(color).not.toBe(backgroundColor);
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

      await waitFor(() => {
        expect(screen.getByText(/no components added/i)).toBeInTheDocument();
        expect(screen.getByText(/drag components from the palette/i)).toBeInTheDocument();
      });
    });

    it('should prevent circular connections', async () => {
      const circularData = {
        ...mockData,
        connections: [
          { id: '1', source: '1', target: '2', type: 'http' },
          { id: '2', source: '2', target: '1', type: 'http' }
        ]
      };
      mockFetchArchitectureData.mockResolvedValue(circularData);
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        const apiGateway = screen.getByText('API Gateway');
        fireEvent.contextMenu(apiGateway);
        fireEvent.click(screen.getByText(/connect to/i));
        fireEvent.click(screen.getByText('User Service'));

        await waitFor(() => {
          expect(mockShowToast).toHaveBeenCalledWith({
            type: 'warning',
            message: 'Circular connection detected'
          });
        });
      });
    });

    it('should handle component position conflicts', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        const component = screen.getByText('API Gateway');
        const initialPosition = component.getBoundingClientRect();

        // Try to drag to same position as another component
        fireEvent.dragStart(component);
        fireEvent.drag(component, {
          clientX: initialPosition.x + 100,
          clientY: initialPosition.y + 100
        });
        fireEvent.dragEnd(component);

        await waitFor(() => {
          expect(mockShowToast).toHaveBeenCalledWith({
            type: 'warning',
            message: 'Position conflict detected'
          });
        });
      });
    });
  });

  describe('Component Palette', () => {
    it('should open component palette when add button is clicked', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByLabelText(/add new component/i));
        expect(screen.getByTestId('component-palette')).toBeInTheDocument();
      });
    });

    it('should add new component from palette', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByLabelText(/add new component/i));
        const databaseComponent = screen.getByText(/database/i);
        fireEvent.dragStart(databaseComponent);

        const canvas = screen.getByTestId('architecture-canvas');
        fireEvent.drop(canvas, {
          clientX: 300,
          clientY: 300
        });

        await waitFor(() => {
          expect(screen.getByText(/database/i)).toBeInTheDocument();
        });
      });
    });

    it('should filter components in palette by search', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByLabelText(/add new component/i));
        const searchInput = screen.getByPlaceholderText(/search components/i);
        await userEvent.type(searchInput, 'service');

        expect(screen.getByText(/user service/i)).toBeInTheDocument();
        expect(screen.queryByText(/database/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Connection Management', () => {
    it('should show connection details when clicked', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        const connection = screen.getByTestId('connection-1-2');
        fireEvent.click(connection);

        expect(screen.getByTestId('connection-config-panel')).toBeInTheDocument();
        expect(screen.getByDisplayValue(/http/i)).toBeInTheDocument();
      });
    });

    it('should update connection type', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByTestId('connection-1-2'));
        const typeSelect = screen.getByLabelText(/connection type/i);
        await userEvent.selectOptions(typeSelect, 'grpc');

        expect(screen.getByDisplayValue(/grpc/i)).toBeInTheDocument();
      });
    });

    it('should delete a connection', async () => {
      renderWithProviders(<DesignArchitecture />);

      await waitFor(async () => {
        fireEvent.click(screen.getByTestId('connection-1-2'));
        fireEvent.click(screen.getByLabelText(/delete connection/i));

        await waitFor(() => {
          expect(screen.queryByTestId('connection-1-2')).not.toBeInTheDocument();
        });
      });
    });
  });
});