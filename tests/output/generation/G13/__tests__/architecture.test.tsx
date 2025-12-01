import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useFetchDesignData } from '../../hooks/useFetchDesignData';
import { useSaveDesign } from '../../hooks/useSaveDesign';
import { useExportDesign } from '../../hooks/useExportDesign';
import { DesignNode, DesignConnection } from '../../types/designTypes';
import { axe } from 'jest-axe';

// Mock hooks
jest.mock('../../hooks/useFetchDesignData');
jest.mock('../../hooks/useSaveDesign');
jest.mock('../../hooks/useExportDesign');

const mockUseFetchDesignData = useFetchDesignData as jest.MockedFunction<typeof useFetchDesignData>;
const mockUseSaveDesign = useSaveDesign as jest.MockedFunction<typeof useSaveDesign>;
const mockUseExportDesign = useExportDesign as jest.MockedFunction<typeof useExportDesign>;

const mockNodes: DesignNode[] = [
  { id: '1', type: 'service', position: { x: 100, y: 100 }, data: { label: 'Auth Service' } },
  { id: '2', type: 'database', position: { x: 300, y: 200 }, data: { label: 'Users DB' } },
];

const mockConnections: DesignConnection[] = [
  { id: 'conn-1', source: '1', target: '2', type: 'http' },
];

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseFetchDesignData.mockReturnValue({
      data: { nodes: mockNodes, connections: mockConnections },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseSaveDesign.mockReturnValue({
      saveDesign: jest.fn().mockResolvedValue(true),
      isSaving: false,
      saveError: null,
    });

    mockUseExportDesign.mockReturnValue({
      exportDesign: jest.fn().mockResolvedValue({ success: true, url: 'http://example.com/export' }),
      isExporting: false,
      exportError: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when data is being fetched', () => {
      mockUseFetchDesignData.mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading design/i)).toBeInTheDocument();
    });

    it('should render error state when fetch fails', () => {
      mockUseFetchDesignData.mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/error loading design/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the design canvas with nodes and connections when data is loaded', () => {
      render(<DesignArchitecture />);

      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      expect(screen.getByText('Auth Service')).toBeInTheDocument();
      expect(screen.getByText('Users DB')).toBeInTheDocument();

      const connectionLines = screen.getAllByTestId('connection-line');
      expect(connectionLines).toHaveLength(1);
    });
  });

  describe('User Interactions', () => {
    it('should allow adding a new service node', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /add service/i }));
      await user.type(screen.getByLabelText(/node name/i), 'Payment Service');
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(screen.getByText('Payment Service')).toBeInTheDocument();
    });

    it('should allow adding a new database node', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /add database/i }));
      await user.type(screen.getByLabelText(/node name/i), 'Orders DB');
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(screen.getByText('Orders DB')).toBeInTheDocument();
    });

    it('should allow connecting two nodes', async () => {
      render(<DesignArchitecture />);

      const authService = screen.getByText('Auth Service');
      const usersDB = screen.getByText('Users DB');

      // Simulate drag from source to target
      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(usersDB);
      fireEvent.mouseUp(usersDB);

      await waitFor(() => {
        const connectionLines = screen.getAllByTestId('connection-line');
        expect(connectionLines).toHaveLength(2);
      });
    });

    it('should allow deleting a node', async () => {
      render(<DesignArchitecture />);

      const deleteButtons = screen.getAllByLabelText(/delete node/i);
      await user.click(deleteButtons[0]);

      expect(screen.queryByText('Auth Service')).not.toBeInTheDocument();
    });

    it('should allow deleting a connection', async () => {
      render(<DesignArchitecture />);

      const connectionLine = screen.getByTestId('connection-line');
      await user.click(within(connectionLine).getByLabelText(/delete connection/i));

      await waitFor(() => {
        expect(screen.queryAllByTestId('connection-line')).toHaveLength(0);
      });
    });

    it('should allow editing node properties', async () => {
      render(<DesignArchitecture />);

      const editButtons = screen.getAllByLabelText(/edit node/i);
      await user.click(editButtons[0]);

      await user.clear(screen.getByLabelText(/node name/i));
      await user.type(screen.getByLabelText(/node name/i), 'Updated Auth Service');
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByText('Updated Auth Service')).toBeInTheDocument();
    });

    it('should allow zooming in and out of the canvas', async () => {
      render(<DesignArchitecture />);

      const zoomInButton = screen.getByLabelText(/zoom in/i);
      const zoomOutButton = screen.getByLabelText(/zoom out/i);

      await user.click(zoomInButton);
      await user.click(zoomOutButton);

      // Verify zoom level indicators (implementation specific)
      expect(screen.getByTestId('zoom-level')).toHaveTextContent('100%');
    });

    it('should allow panning the canvas', async () => {
      render(<DesignArchitecture />);

      const canvas = screen.getByTestId('design-canvas');

      // Simulate drag to pan
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(canvas);

      // Verify panning occurred (implementation specific)
      expect(canvas).toHaveStyle('transform: translate(50px, 50px)');
    });
  });

  describe('Save Functionality', () => {
    it('should save the design successfully', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /save design/i }));

      await waitFor(() => {
        expect(mockUseSaveDesign().saveDesign).toHaveBeenCalled();
        expect(screen.getByText(/design saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error when save fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockRejectedValue(new Error('Save failed')),
        isSaving: false,
        saveError: new Error('Save failed'),
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /save design/i }));

      await waitFor(() => {
        expect(screen.getByText(/error saving design/i)).toBeInTheDocument();
        expect(screen.getByText(/save failed/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during save', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100))),
        isSaving: true,
        saveError: null,
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /save design/i }));

      expect(screen.getByTestId('save-loading')).toBeInTheDocument();
      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should export the design successfully', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      await waitFor(() => {
        expect(mockUseExportDesign().exportDesign).toHaveBeenCalled();
        expect(screen.getByText(/export successful/i)).toBeInTheDocument();
      });
    });

    it('should show error when export fails', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        exportDesign: jest.fn().mockRejectedValue(new Error('Export failed')),
        isExporting: false,
        exportError: new Error('Export failed'),
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      await waitFor(() => {
        expect(screen.getByText(/error exporting design/i)).toBeInTheDocument();
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during export', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        exportDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true, url: '' }), 100))),
        isExporting: true,
        exportError: null,
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(screen.getByTestId('export-loading')).toBeInTheDocument();
      expect(screen.getByText(/exporting/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<DesignArchitecture />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByLabelText(/design canvas/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add service/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add database/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/save design/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/export design/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zoom out/i)).toBeInTheDocument();
    });

    it('should have proper keyboard navigation', async () => {
      render(<DesignArchitecture />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /add service/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /add database/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /save design/i })).toHaveFocus();

      // Test space/enter to activate
      await user.keyboard('{Enter}');
      expect(mockUseSaveDesign().saveDesign).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design state', () => {
      mockUseFetchDesignData.mockReturnValueOnce({
        data: { nodes: [], connections: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no nodes in design/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add your first service/i })).toBeInTheDocument();
    });

    it('should prevent invalid connections', async () => {
      render(<DesignArchitecture />);

      // Try to connect a node to itself
      const authService = screen.getByText('Auth Service');
      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(authService);
      fireEvent.mouseUp(authService);

      await waitFor(() => {
        const connectionLines = screen.getAllByTestId('connection-line');
        expect(connectionLines).toHaveLength(1); // Only the original connection
      });
    });

    it('should handle very large designs with performance considerations', () => {
      const largeNodes = Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        type: 'service',
        position: { x: i * 50, y: i * 50 },
        data: { label: `Service ${i}` }
      }));

      mockUseFetchDesignData.mockReturnValueOnce({
        data: { nodes: largeNodes, connections: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/large design detected/i)).toBeInTheDocument();
      expect(screen.getByText(/100 nodes/i)).toBeInTheDocument();
    });

    it('should recover from failed initial load after retry', async () => {
      mockUseFetchDesignData
        .mockReturnValueOnce({
          data: null,
          isLoading: false,
          error: new Error('Initial fail'),
          refetch: jest.fn(),
        })
        .mockReturnValueOnce({
          data: { nodes: mockNodes, connections: mockConnections },
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        });

      render(<DesignArchitecture />);

      expect(screen.getByText(/error loading design/i)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText('Auth Service')).toBeInTheDocument();
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useFetchDesignData } from '../../hooks/useFetchDesignData';
import { useSaveDesign } from '../../hooks/useSaveDesign';
import { useExportDesign } from '../../hooks/useExportDesign';
import { DesignNode, DesignConnection } from '../../types/designTypes';
import { axe } from 'jest-axe';

// Mock hooks
jest.mock('../../hooks/useFetchDesignData');
jest.mock('../../hooks/useSaveDesign');
jest.mock('../../hooks/useExportDesign');

const mockUseFetchDesignData = useFetchDesignData as jest.MockedFunction<typeof useFetchDesignData>;
const mockUseSaveDesign = useSaveDesign as jest.MockedFunction<typeof useSaveDesign>;
const mockUseExportDesign = useExportDesign as jest.MockedFunction<typeof useExportDesign>;

const mockNodes: DesignNode[] = [
  { id: '1', type: 'service', position: { x: 100, y: 100 }, data: { label: 'Auth Service' } },
  { id: '2', type: 'database', position: { x: 300, y: 200 }, data: { label: 'Users DB' } },
];

const mockConnections: DesignConnection[] = [
  { id: 'conn-1', source: '1', target: '2', type: 'http' },
];

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseFetchDesignData.mockReturnValue({
      data: { nodes: mockNodes, connections: mockConnections },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseSaveDesign.mockReturnValue({
      saveDesign: jest.fn().mockResolvedValue(true),
      isSaving: false,
      saveError: null,
    });

    mockUseExportDesign.mockReturnValue({
      exportDesign: jest.fn().mockResolvedValue({ success: true, url: 'http://example.com/export' }),
      isExporting: false,
      exportError: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when data is being fetched', () => {
      mockUseFetchDesignData.mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading design/i)).toBeInTheDocument();
    });

    it('should render error state when fetch fails', () => {
      mockUseFetchDesignData.mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/error loading design/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the design canvas with nodes and connections when data is loaded', () => {
      render(<DesignArchitecture />);

      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      expect(screen.getByText('Auth Service')).toBeInTheDocument();
      expect(screen.getByText('Users DB')).toBeInTheDocument();

      const connectionLines = screen.getAllByTestId('connection-line');
      expect(connectionLines).toHaveLength(1);
    });
  });

  describe('User Interactions', () => {
    it('should allow adding a new service node', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /add service/i }));
      await user.type(screen.getByLabelText(/node name/i), 'Payment Service');
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(screen.getByText('Payment Service')).toBeInTheDocument();
    });

    it('should allow adding a new database node', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /add database/i }));
      await user.type(screen.getByLabelText(/node name/i), 'Orders DB');
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(screen.getByText('Orders DB')).toBeInTheDocument();
    });

    it('should allow connecting two nodes', async () => {
      render(<DesignArchitecture />);

      const authService = screen.getByText('Auth Service');
      const usersDB = screen.getByText('Users DB');

      // Simulate drag from source to target
      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(usersDB);
      fireEvent.mouseUp(usersDB);

      await waitFor(() => {
        const connectionLines = screen.getAllByTestId('connection-line');
        expect(connectionLines).toHaveLength(2);
      });
    });

    it('should allow deleting a node', async () => {
      render(<DesignArchitecture />);

      const deleteButtons = screen.getAllByLabelText(/delete node/i);
      await user.click(deleteButtons[0]);

      expect(screen.queryByText('Auth Service')).not.toBeInTheDocument();
    });

    it('should allow deleting a connection', async () => {
      render(<DesignArchitecture />);

      const connectionLine = screen.getByTestId('connection-line');
      await user.click(within(connectionLine).getByLabelText(/delete connection/i));

      await waitFor(() => {
        expect(screen.queryAllByTestId('connection-line')).toHaveLength(0);
      });
    });

    it('should allow editing node properties', async () => {
      render(<DesignArchitecture />);

      const editButtons = screen.getAllByLabelText(/edit node/i);
      await user.click(editButtons[0]);

      await user.clear(screen.getByLabelText(/node name/i));
      await user.type(screen.getByLabelText(/node name/i), 'Updated Auth Service');
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByText('Updated Auth Service')).toBeInTheDocument();
    });

    it('should allow zooming in and out of the canvas', async () => {
      render(<DesignArchitecture />);

      const zoomInButton = screen.getByLabelText(/zoom in/i);
      const zoomOutButton = screen.getByLabelText(/zoom out/i);

      await user.click(zoomInButton);
      await user.click(zoomOutButton);

      // Verify zoom level indicators (implementation specific)
      expect(screen.getByTestId('zoom-level')).toHaveTextContent('100%');
    });

    it('should allow panning the canvas', async () => {
      render(<DesignArchitecture />);

      const canvas = screen.getByTestId('design-canvas');

      // Simulate drag to pan
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(canvas);

      // Verify panning occurred (implementation specific)
      expect(canvas).toHaveStyle('transform: translate(50px, 50px)');
    });
  });

  describe('Save Functionality', () => {
    it('should save the design successfully', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /save design/i }));

      await waitFor(() => {
        expect(mockUseSaveDesign().saveDesign).toHaveBeenCalled();
        expect(screen.getByText(/design saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error when save fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockRejectedValue(new Error('Save failed')),
        isSaving: false,
        saveError: new Error('Save failed'),
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /save design/i }));

      await waitFor(() => {
        expect(screen.getByText(/error saving design/i)).toBeInTheDocument();
        expect(screen.getByText(/save failed/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during save', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100))),
        isSaving: true,
        saveError: null,
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /save design/i }));

      expect(screen.getByTestId('save-loading')).toBeInTheDocument();
      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should export the design successfully', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      await waitFor(() => {
        expect(mockUseExportDesign().exportDesign).toHaveBeenCalled();
        expect(screen.getByText(/export successful/i)).toBeInTheDocument();
      });
    });

    it('should show error when export fails', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        exportDesign: jest.fn().mockRejectedValue(new Error('Export failed')),
        isExporting: false,
        exportError: new Error('Export failed'),
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      await waitFor(() => {
        expect(screen.getByText(/error exporting design/i)).toBeInTheDocument();
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during export', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        exportDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true, url: '' }), 100))),
        isExporting: true,
        exportError: null,
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(screen.getByTestId('export-loading')).toBeInTheDocument();
      expect(screen.getByText(/exporting/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<DesignArchitecture />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByLabelText(/design canvas/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add service/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add database/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/save design/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/export design/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zoom out/i)).toBeInTheDocument();
    });

    it('should have proper keyboard navigation', async () => {
      render(<DesignArchitecture />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /add service/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /add database/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /save design/i })).toHaveFocus();

      // Test space/enter to activate
      await user.keyboard('{Enter}');
      expect(mockUseSaveDesign().saveDesign).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design state', () => {
      mockUseFetchDesignData.mockReturnValueOnce({
        data: { nodes: [], connections: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no nodes in design/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add your first service/i })).toBeInTheDocument();
    });

    it('should prevent invalid connections', async () => {
      render(<DesignArchitecture />);

      // Try to connect a node to itself
      const authService = screen.getByText('Auth Service');
      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(authService);
      fireEvent.mouseUp(authService);

      await waitFor(() => {
        const connectionLines = screen.getAllByTestId('connection-line');
        expect(connectionLines).toHaveLength(1); // Only the original connection
      });
    });

    it('should handle very large designs with performance considerations', () => {
      const largeNodes = Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        type: 'service',
        position: { x: i * 50, y: i * 50 },
        data: { label: `Service ${i}` }
      }));

      mockUseFetchDesignData.mockReturnValueOnce({
        data: { nodes: largeNodes, connections: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/large design detected/i)).toBeInTheDocument();
      expect(screen.getByText(/100 nodes/i)).toBeInTheDocument();
    });

    it('should recover from failed initial load after retry', async () => {
      mockUseFetchDesignData
        .mockReturnValueOnce({
          data: null,
          isLoading: false,
          error: new Error('Initial fail'),
          refetch: jest.fn(),
        })
        .mockReturnValueOnce({
          data: { nodes: mockNodes, connections: mockConnections },
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        });

      render(<DesignArchitecture />);

      expect(screen.getByText(/error loading design/i)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText('Auth Service')).toBeInTheDocument();
      });
    });
  });
});