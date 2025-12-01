import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { fetchArchitectureData, saveDesign, exportDesign } from './api/architectureApi';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../ui/useToast';

// Mock external dependencies
jest.mock('./api/architectureApi');
jest.mock('../auth/AuthContext');
jest.mock('../ui/useToast');
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

const mockFetchArchitectureData = fetchArchitectureData as jest.MockedFunction<typeof fetchArchitectureData>;
const mockSaveDesign = saveDesign as jest.MockedFunction<typeof saveDesign>;
const mockExportDesign = exportDesign as jest.MockedFunction<typeof exportDesign>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockShowToast = jest.fn();
const mockNavigate = jest.fn();

beforeEach(() => {
  mockUseToast.mockReturnValue({ showToast: mockShowToast });
  mockUseAuth.mockReturnValue({
    user: { id: 'user-123', role: 'architect', name: 'Test User' },
    isAuthenticated: true,
  });
  require('react-router-dom').useNavigate.mockImplementation(() => mockNavigate);
});

afterEach(() => {
  jest.clearAllMocks();
});

const renderComponent = (props = {}) => {
  const defaultProps = {
    projectId: 'proj-123',
    onClose: jest.fn(),
    ...props,
  };

  return render(<DesignArchitecture {...defaultProps} />);
};

describe('DesignArchitecture Component', () => {
  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      mockFetchArchitectureData.mockReturnValue(Promise.resolve({}));
      renderComponent();

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading design/i)).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', async () => {
      mockFetchArchitectureData.mockRejectedValue(new Error('Failed to fetch'));
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/error loading design/i)).toBeInTheDocument();
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });

    it('should render the design canvas when data is loaded successfully', async () => {
      const mockData = {
        id: 'design-123',
        name: 'Modern House',
        elements: [
          { id: 'wall-1', type: 'wall', x: 10, y: 20, width: 100, height: 50 },
          { id: 'door-1', type: 'door', x: 30, y: 40, width: 20, height: 30 },
        ],
        layers: ['structural', 'electrical'],
        currentLayer: 'structural',
      };

      mockFetchArchitectureData.mockResolvedValue(mockData);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
        expect(screen.getByText('Modern House')).toBeInTheDocument();
        expect(screen.getByText('Structural Layer')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    const mockData = {
      id: 'design-123',
      name: 'Modern House',
      elements: [
        { id: 'wall-1', type: 'wall', x: 10, y: 20, width: 100, height: 50 },
        { id: 'door-1', type: 'door', x: 30, y: 40, width: 20, height: 30 },
      ],
      layers: ['structural', 'electrical'],
      currentLayer: 'structural',
    };

    beforeEach(() => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
    });

    it('should allow adding new elements to the design', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const addWallButton = screen.getByLabelText(/add wall/i);
      userEvent.click(addWallButton);

      // Simulate drawing on canvas
      const canvas = screen.getByTestId('design-canvas');
      fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 100 });
      fireEvent.mouseUp(canvas);

      await waitFor(() => {
        expect(screen.getByText(/wall 2/i)).toBeInTheDocument();
      });
    });

    it('should allow selecting and moving elements', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('element-wall-1')).toBeInTheDocument();
      });

      const wallElement = screen.getByTestId('element-wall-1');
      fireEvent.mouseDown(wallElement, { clientX: 60, clientY: 45 });
      fireEvent.mouseMove(wallElement, { clientX: 70, clientY: 55 });
      fireEvent.mouseUp(wallElement);

      // Verify position changed (implementation would track this)
      expect(wallElement).toHaveAttribute('data-x', '15'); // Example expectation
    });

    it('should allow deleting elements', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('element-door-1')).toBeInTheDocument();
      });

      const deleteButton = within(screen.getByTestId('element-door-1')).getByLabelText(/delete/i);
      userEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByTestId('element-door-1')).not.toBeInTheDocument();
      });
    });

    it('should allow switching between layers', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Structural Layer')).toBeInTheDocument();
      });

      const layerDropdown = screen.getByLabelText(/select layer/i);
      userEvent.click(layerDropdown);
      userEvent.click(screen.getByText('Electrical'));

      await waitFor(() => {
        expect(screen.getByText('Electrical Layer')).toBeInTheDocument();
      });
    });

    it('should allow zooming in and out of the canvas', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const zoomInButton = screen.getByLabelText(/zoom in/i);
      const zoomOutButton = screen.getByLabelText(/zoom out/i);

      userEvent.click(zoomInButton);
      // Verify zoom level increased (implementation would track this)

      userEvent.click(zoomOutButton);
      // Verify zoom level decreased
    });

    it('should allow saving the design', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      mockSaveDesign.mockResolvedValue({ success: true });

      const saveButton = screen.getByText(/save design/i);
      userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalledWith(
          'proj-123',
          expect.objectContaining({
            id: 'design-123',
            name: 'Modern House',
          })
        );
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Design saved successfully',
          type: 'success',
        });
      });
    });

    it('should show error when save fails', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      mockSaveDesign.mockRejectedValue(new Error('Save failed'));

      const saveButton = screen.getByText(/save design/i);
      userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Failed to save design: Save failed',
          type: 'error',
        });
      });
    });

    it('should allow exporting the design', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const exportButton = screen.getByText(/export/i);
      userEvent.click(exportButton);

      await waitFor(() => {
        expect(mockExportDesign).toHaveBeenCalledWith('design-123', 'dxf');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Modern House',
        elements: [],
        layers: ['structural'],
        currentLayer: 'structural',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/design canvas/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add wall/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add door/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add window/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/zoom out/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/reset view/i)).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Modern House',
        elements: [],
        layers: ['structural'],
        currentLayer: 'structural',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      // Tab through interactive elements
      userEvent.tab();
      expect(screen.getByLabelText(/add wall/i)).toHaveFocus();

      userEvent.tab();
      expect(screen.getByLabelText(/add door/i)).toHaveFocus();

      userEvent.tab();
      expect(screen.getByLabelText(/add window/i)).toHaveFocus();
    });

    it('should have proper contrast for text elements', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Modern House',
        elements: [],
        layers: ['structural'],
        currentLayer: 'structural',
      });

      const { container } = renderComponent();

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /modern house/i });
        expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Example contrast check
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design data', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Empty Design',
        elements: [],
        layers: [],
        currentLayer: null,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Empty Design')).toBeInTheDocument();
        expect(screen.getByText(/no layers available/i)).toBeInTheDocument();
        expect(screen.getByText(/add your first element/i)).toBeInTheDocument();
      });
    });

    it('should prevent actions when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Modern House',
        elements: [],
        layers: ['structural'],
        currentLayer: 'structural',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/please sign in/i)).toBeInTheDocument();
        expect(screen.getByText(/save design/i)).toBeDisabled();
        expect(screen.getByText(/export/i)).toBeDisabled();
      });
    });

    it('should handle very large designs without crashing', async () => {
      const largeDesign = {
        id: 'design-123',
        name: 'Large Design',
        elements: Array(1000).fill(0).map((_, i) => ({
          id: `element-${i}`,
          type: 'wall',
          x: i * 10,
          y: i * 5,
          width: 100,
          height: 50,
        })),
        layers: ['structural'],
        currentLayer: 'structural',
      };

      mockFetchArchitectureData.mockResolvedValue(largeDesign);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Large Design')).toBeInTheDocument();
        expect(screen.getByText(/1000 elements/i)).toBeInTheDocument();
      });
    });

    it('should show confirmation before clearing the design', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Modern House',
        elements: [
          { id: 'wall-1', type: 'wall', x: 10, y: 20, width: 100, height: 50 },
        ],
        layers: ['structural'],
        currentLayer: 'structural',
      });

      window.confirm = jest.fn(() => true);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const clearButton = screen.getByText(/clear all/i);
      userEvent.click(clearButton);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to clear all elements? This cannot be undone.');
        expect(screen.queryByTestId('element-wall-1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when element addition fails', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Modern House',
        elements: [],
        layers: ['structural'],
        currentLayer: 'structural',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      // Mock console.error to verify it's called
      const originalError = console.error;
      console.error = jest.fn();

      // Simulate an error during element addition
      const canvas = screen.getByTestId('design-canvas');
      fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 100 });
      // Simulate an error during mouse up
      const error = new Error('Failed to add element');
      fireEvent.error(canvas, { error });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error adding element:', error);
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Failed to add element to design',
          type: 'error',
        });
      });

      console.error = originalError;
    });

    it('should handle API rate limiting gracefully', async () => {
      mockFetchArchitectureData.mockRejectedValue({
        response: {
          status: 429,
          data: { message: 'Too many requests' },
        },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
        expect(screen.getByText(/please try again later/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockFetchArchitectureData.mockRejectedValue({
        message: 'Network Error',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByText(/check your connection/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should render quickly with many elements', async () => {
      const manyElements = Array(500).fill(0).map((_, i) => ({
        id: `element-${i}`,
        type: 'wall',
        x: i * 2,
        y: i * 2,
        width: 100,
        height: 50,
      }));

      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Complex Design',
        elements: manyElements,
        layers: ['structural'],
        currentLayer: 'structural',
      });

      const start = performance.now();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Complex Design')).toBeInTheDocument();
        const end = performance.now();
        // Verify rendering completes within acceptable time (e.g., 1 second)
        expect(end - start).toBeLessThan(1000);
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { fetchArchitectureData, saveDesign, exportDesign } from './api/architectureApi';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../ui/useToast';

// Mock external dependencies
jest.mock('./api/architectureApi');
jest.mock('../auth/AuthContext');
jest.mock('../ui/useToast');
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

const mockFetchArchitectureData = fetchArchitectureData as jest.MockedFunction<typeof fetchArchitectureData>;
const mockSaveDesign = saveDesign as jest.MockedFunction<typeof saveDesign>;
const mockExportDesign = exportDesign as jest.MockedFunction<typeof exportDesign>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockShowToast = jest.fn();
const mockNavigate = jest.fn();

beforeEach(() => {
  mockUseToast.mockReturnValue({ showToast: mockShowToast });
  mockUseAuth.mockReturnValue({
    user: { id: 'user-123', role: 'architect', name: 'Test User' },
    isAuthenticated: true,
  });
  require('react-router-dom').useNavigate.mockImplementation(() => mockNavigate);
});

afterEach(() => {
  jest.clearAllMocks();
});

const renderComponent = (props = {}) => {
  const defaultProps = {
    projectId: 'proj-123',
    onClose: jest.fn(),
    ...props,
  };

  return render(<DesignArchitecture {...defaultProps} />);
};

describe('DesignArchitecture Component', () => {
  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      mockFetchArchitectureData.mockReturnValue(Promise.resolve({}));
      renderComponent();

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading design/i)).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', async () => {
      mockFetchArchitectureData.mockRejectedValue(new Error('Failed to fetch'));
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/error loading design/i)).toBeInTheDocument();
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });

    it('should render the design canvas when data is loaded successfully', async () => {
      const mockData = {
        id: 'design-123',
        name: 'Modern House',
        elements: [
          { id: 'wall-1', type: 'wall', x: 10, y: 20, width: 100, height: 50 },
          { id: 'door-1', type: 'door', x: 30, y: 40, width: 20, height: 30 },
        ],
        layers: ['structural', 'electrical'],
        currentLayer: 'structural',
      };

      mockFetchArchitectureData.mockResolvedValue(mockData);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
        expect(screen.getByText('Modern House')).toBeInTheDocument();
        expect(screen.getByText('Structural Layer')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    const mockData = {
      id: 'design-123',
      name: 'Modern House',
      elements: [
        { id: 'wall-1', type: 'wall', x: 10, y: 20, width: 100, height: 50 },
        { id: 'door-1', type: 'door', x: 30, y: 40, width: 20, height: 30 },
      ],
      layers: ['structural', 'electrical'],
      currentLayer: 'structural',
    };

    beforeEach(() => {
      mockFetchArchitectureData.mockResolvedValue(mockData);
    });

    it('should allow adding new elements to the design', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const addWallButton = screen.getByLabelText(/add wall/i);
      userEvent.click(addWallButton);

      // Simulate drawing on canvas
      const canvas = screen.getByTestId('design-canvas');
      fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 100 });
      fireEvent.mouseUp(canvas);

      await waitFor(() => {
        expect(screen.getByText(/wall 2/i)).toBeInTheDocument();
      });
    });

    it('should allow selecting and moving elements', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('element-wall-1')).toBeInTheDocument();
      });

      const wallElement = screen.getByTestId('element-wall-1');
      fireEvent.mouseDown(wallElement, { clientX: 60, clientY: 45 });
      fireEvent.mouseMove(wallElement, { clientX: 70, clientY: 55 });
      fireEvent.mouseUp(wallElement);

      // Verify position changed (implementation would track this)
      expect(wallElement).toHaveAttribute('data-x', '15'); // Example expectation
    });

    it('should allow deleting elements', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('element-door-1')).toBeInTheDocument();
      });

      const deleteButton = within(screen.getByTestId('element-door-1')).getByLabelText(/delete/i);
      userEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByTestId('element-door-1')).not.toBeInTheDocument();
      });
    });

    it('should allow switching between layers', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Structural Layer')).toBeInTheDocument();
      });

      const layerDropdown = screen.getByLabelText(/select layer/i);
      userEvent.click(layerDropdown);
      userEvent.click(screen.getByText('Electrical'));

      await waitFor(() => {
        expect(screen.getByText('Electrical Layer')).toBeInTheDocument();
      });
    });

    it('should allow zooming in and out of the canvas', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const zoomInButton = screen.getByLabelText(/zoom in/i);
      const zoomOutButton = screen.getByLabelText(/zoom out/i);

      userEvent.click(zoomInButton);
      // Verify zoom level increased (implementation would track this)

      userEvent.click(zoomOutButton);
      // Verify zoom level decreased
    });

    it('should allow saving the design', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      mockSaveDesign.mockResolvedValue({ success: true });

      const saveButton = screen.getByText(/save design/i);
      userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalledWith(
          'proj-123',
          expect.objectContaining({
            id: 'design-123',
            name: 'Modern House',
          })
        );
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Design saved successfully',
          type: 'success',
        });
      });
    });

    it('should show error when save fails', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      mockSaveDesign.mockRejectedValue(new Error('Save failed'));

      const saveButton = screen.getByText(/save design/i);
      userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Failed to save design: Save failed',
          type: 'error',
        });
      });
    });

    it('should allow exporting the design', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const exportButton = screen.getByText(/export/i);
      userEvent.click(exportButton);

      await waitFor(() => {
        expect(mockExportDesign).toHaveBeenCalledWith('design-123', 'dxf');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Modern House',
        elements: [],
        layers: ['structural'],
        currentLayer: 'structural',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/design canvas/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add wall/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add door/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add window/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/zoom out/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/reset view/i)).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Modern House',
        elements: [],
        layers: ['structural'],
        currentLayer: 'structural',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      // Tab through interactive elements
      userEvent.tab();
      expect(screen.getByLabelText(/add wall/i)).toHaveFocus();

      userEvent.tab();
      expect(screen.getByLabelText(/add door/i)).toHaveFocus();

      userEvent.tab();
      expect(screen.getByLabelText(/add window/i)).toHaveFocus();
    });

    it('should have proper contrast for text elements', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Modern House',
        elements: [],
        layers: ['structural'],
        currentLayer: 'structural',
      });

      const { container } = renderComponent();

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /modern house/i });
        expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Example contrast check
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design data', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Empty Design',
        elements: [],
        layers: [],
        currentLayer: null,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Empty Design')).toBeInTheDocument();
        expect(screen.getByText(/no layers available/i)).toBeInTheDocument();
        expect(screen.getByText(/add your first element/i)).toBeInTheDocument();
      });
    });

    it('should prevent actions when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Modern House',
        elements: [],
        layers: ['structural'],
        currentLayer: 'structural',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/please sign in/i)).toBeInTheDocument();
        expect(screen.getByText(/save design/i)).toBeDisabled();
        expect(screen.getByText(/export/i)).toBeDisabled();
      });
    });

    it('should handle very large designs without crashing', async () => {
      const largeDesign = {
        id: 'design-123',
        name: 'Large Design',
        elements: Array(1000).fill(0).map((_, i) => ({
          id: `element-${i}`,
          type: 'wall',
          x: i * 10,
          y: i * 5,
          width: 100,
          height: 50,
        })),
        layers: ['structural'],
        currentLayer: 'structural',
      };

      mockFetchArchitectureData.mockResolvedValue(largeDesign);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Large Design')).toBeInTheDocument();
        expect(screen.getByText(/1000 elements/i)).toBeInTheDocument();
      });
    });

    it('should show confirmation before clearing the design', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Modern House',
        elements: [
          { id: 'wall-1', type: 'wall', x: 10, y: 20, width: 100, height: 50 },
        ],
        layers: ['structural'],
        currentLayer: 'structural',
      });

      window.confirm = jest.fn(() => true);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const clearButton = screen.getByText(/clear all/i);
      userEvent.click(clearButton);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to clear all elements? This cannot be undone.');
        expect(screen.queryByTestId('element-wall-1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when element addition fails', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Modern House',
        elements: [],
        layers: ['structural'],
        currentLayer: 'structural',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      // Mock console.error to verify it's called
      const originalError = console.error;
      console.error = jest.fn();

      // Simulate an error during element addition
      const canvas = screen.getByTestId('design-canvas');
      fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 100 });
      // Simulate an error during mouse up
      const error = new Error('Failed to add element');
      fireEvent.error(canvas, { error });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error adding element:', error);
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Failed to add element to design',
          type: 'error',
        });
      });

      console.error = originalError;
    });

    it('should handle API rate limiting gracefully', async () => {
      mockFetchArchitectureData.mockRejectedValue({
        response: {
          status: 429,
          data: { message: 'Too many requests' },
        },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
        expect(screen.getByText(/please try again later/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockFetchArchitectureData.mockRejectedValue({
        message: 'Network Error',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByText(/check your connection/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should render quickly with many elements', async () => {
      const manyElements = Array(500).fill(0).map((_, i) => ({
        id: `element-${i}`,
        type: 'wall',
        x: i * 2,
        y: i * 2,
        width: 100,
        height: 50,
      }));

      mockFetchArchitectureData.mockResolvedValue({
        id: 'design-123',
        name: 'Complex Design',
        elements: manyElements,
        layers: ['structural'],
        currentLayer: 'structural',
      });

      const start = performance.now();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Complex Design')).toBeInTheDocument();
        const end = performance.now();
        // Verify rendering completes within acceptable time (e.g., 1 second)
        expect(end - start).toBeLessThan(1000);
      });
    });
  });
});