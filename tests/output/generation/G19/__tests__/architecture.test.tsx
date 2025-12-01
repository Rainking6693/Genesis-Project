import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData, useSaveDesign, useExportDesign } from '../../hooks/designHooks';
import { DesignNode, Connection } from '../../types/designTypes';
import { axe } from 'jest-axe';

// Mock hooks
jest.mock('../../hooks/designHooks');

const mockUseDesignData = useDesignData as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseExportDesign = useExportDesign as jest.Mock;

const mockNodes: DesignNode[] = [
  { id: '1', type: 'service', name: 'User Service', position: { x: 100, y: 100 } },
  { id: '2', type: 'database', name: 'PostgreSQL', position: { x: 300, y: 200 } },
];

const mockConnections: Connection[] = [
  { id: 'conn-1', source: '1', target: '2', type: 'http' },
];

const mockDesignData = {
  nodes: mockNodes,
  connections: mockConnections,
  loading: false,
  error: null,
  refetch: jest.fn(),
};

const mockSaveDesign = {
  saveDesign: jest.fn().mockResolvedValue({ success: true }),
  isSaving: false,
  saveError: null,
};

const mockExportDesign = {
  exportDesign: jest.fn().mockResolvedValue({ success: true, url: 'http://example.com/export' }),
  isExporting: false,
  exportError: null,
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseDesignData.mockReturnValue(mockDesignData);
    mockUseSaveDesign.mockReturnValue(mockSaveDesign);
    mockUseExportDesign.mockReturnValue(mockExportDesign);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<DesignArchitecture designId="123" />);
    expect(screen.getByText(/design architecture/i)).toBeInTheDocument();
  });

  it('should be accessible', async () => {
    const { container } = render(<DesignArchitecture designId="123" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  describe('Loading States', () => {
    it('should show loading skeleton when data is loading', () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        loading: true,
      });

      render(<DesignArchitecture designId="123" />);
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should show error message when data fetch fails', () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        error: new Error('Failed to fetch'),
        loading: false,
      });

      render(<DesignArchitecture designId="123" />);
      expect(screen.getByText(/failed to load design data/i)).toBeInTheDocument();
    });
  });

  describe('Node Operations', () => {
    it('should render all nodes and connections', () => {
      render(<DesignArchitecture designId="123" />);

      mockNodes.forEach(node => {
        expect(screen.getByText(node.name)).toBeInTheDocument();
      });

      // Check if connections are rendered (simplified check)
      const connections = screen.getAllByTestId(/connection-/i);
      expect(connections.length).toBeGreaterThan(0);
    });

    it('should allow adding a new node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const addNodeButton = screen.getByLabelText(/add node/i);
      await user.click(addNodeButton);

      const nodeTypeSelect = screen.getByLabelText(/node type/i);
      await user.selectOptions(nodeTypeSelect, 'service');

      const nameInput = screen.getByLabelText(/node name/i);
      await user.type(nameInput, 'New Service');

      const submitButton = screen.getByText(/add/i);
      await user.click(submitButton);

      // Verify the new node appears (this would depend on your state management)
      await waitFor(() => {
        expect(screen.getByText('New Service')).toBeInTheDocument();
      });
    });

    it('should show validation error when adding node with empty name', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const addNodeButton = screen.getByLabelText(/add node/i);
      await user.click(addNodeButton);

      const submitButton = screen.getByText(/add/i);
      await user.click(submitButton);

      expect(screen.getByText(/node name is required/i)).toBeInTheDocument();
    });

    it('should allow deleting a node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const node = screen.getByText('User Service');
      const deleteButton = within(node.closest('div')!).getByLabelText(/delete node/i);

      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByText(/confirm/i);
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText('User Service')).not.toBeInTheDocument();
      });
    });

    it('should show confirmation dialog before deleting node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const node = screen.getByText('User Service');
      const deleteButton = within(node.closest('div')!).getByLabelText(/delete node/i);

      await user.click(deleteButton);

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });
  });

  describe('Connection Operations', () => {
    it('should allow creating a connection between nodes', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const sourceNode = screen.getByText('User Service');
      const targetNode = screen.getByText('PostgreSQL');

      // Simulate connection creation (implementation depends on your connection logic)
      const connectButton = screen.getByLabelText(/connect nodes/i);
      await user.click(connectButton);

      // Select source and target (simplified)
      const sourceSelect = screen.getByLabelText(/source node/i);
      const targetSelect = screen.getByLabelText(/target node/i);

      await user.selectOptions(sourceSelect, 'User Service');
      await user.selectOptions(targetSelect, 'PostgreSQL');

      const connectionTypeSelect = screen.getByLabelText(/connection type/i);
      await user.selectOptions(connectionTypeSelect, 'http');

      const createButton = screen.getByText(/create connection/i);
      await user.click(createButton);

      // Verify connection is created (simplified check)
      await waitFor(() => {
        const connections = screen.getAllByTestId(/connection-/i);
        expect(connections.length).toBe(2); // Original + new one
      });
    });

    it('should prevent creating duplicate connections', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const connectButton = screen.getByLabelText(/connect nodes/i);
      await user.click(connectButton);

      const sourceSelect = screen.getByLabelText(/source node/i);
      const targetSelect = screen.getByLabelText(/target node/i);

      await user.selectOptions(sourceSelect, 'User Service');
      await user.selectOptions(targetSelect, 'PostgreSQL');

      const connectionTypeSelect = screen.getByLabelText(/connection type/i);
      await user.selectOptions(connectionTypeSelect, 'http');

      const createButton = screen.getByText(/create connection/i);
      await user.click(createButton);

      // Try to create the same connection again
      await user.click(createButton);

      expect(screen.getByText(/connection already exists/i)).toBeInTheDocument();
    });

    it('should allow deleting a connection', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      // Find a connection (simplified)
      const connections = screen.getAllByTestId(/connection-/i);
      expect(connections.length).toBe(1);

      const deleteButton = within(connections[0]).getByLabelText(/delete connection/i);
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByText(/confirm/i);
      await user.click(confirmButton);

      await waitFor(() => {
        const updatedConnections = screen.queryAllByTestId(/connection-/i);
        expect(updatedConnections.length).toBe(0);
      });
    });
  });

  describe('Save and Export Operations', () => {
    it('should save the design when save button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const saveButton = screen.getByLabelText(/save design/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveDesign.saveDesign).toHaveBeenCalled();
        expect(screen.getByText(/design saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error when save fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        ...mockSaveDesign,
        saveError: new Error('Save failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const saveButton = screen.getByLabelText(/save design/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save design/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during save', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        ...mockSaveDesign,
        isSaving: true,
      });

      render(<DesignArchitecture designId="123" />);

      expect(screen.getByLabelText(/saving.../i)).toBeInTheDocument();
    });

    it('should export the design when export button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const exportButton = screen.getByLabelText(/export design/i);
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockExportDesign.exportDesign).toHaveBeenCalled();
        expect(screen.getByText(/design exported successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error when export fails', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        ...mockExportDesign,
        exportError: new Error('Export failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const exportButton = screen.getByLabelText(/export design/i);
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to export design/i)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation and Accessibility', () => {
    it('should allow keyboard navigation through nodes', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      // Focus on the first node
      const firstNode = screen.getByText('User Service');
      firstNode.focus();

      // Navigate to next node with arrow keys
      await user.keyboard('{ArrowRight}');

      // Verify focus moved (implementation depends on your keyboard navigation)
      expect(screen.getByText('PostgreSQL')).toHaveFocus();
    });

    it('should have proper ARIA attributes for screen readers', () => {
      render(<DesignArchitecture designId="123" />);

      const canvas = screen.getByRole('application');
      expect(canvas).toHaveAttribute('aria-label', 'Design architecture canvas');

      mockNodes.forEach(node => {
        const nodeElement = screen.getByText(node.name);
        expect(nodeElement).toHaveAttribute('role', 'button');
        expect(nodeElement).toHaveAttribute('tabindex', '0');
      });
    });

    it('should announce changes for screen readers', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const addNodeButton = screen.getByLabelText(/add node/i);
      await user.click(addNodeButton);

      // Check if live region announces the change
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent(/add node dialog opened/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design state', () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        nodes: [],
        connections: [],
      });

      render(<DesignArchitecture designId="123" />);

      expect(screen.getByText(/no nodes in design/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first node/i)).toBeInTheDocument();
    });

    it('should prevent connection to self', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const connectButton = screen.getByLabelText(/connect nodes/i);
      await user.click(connectButton);

      const sourceSelect = screen.getByLabelText(/source node/i);
      const targetSelect = screen.getByLabelText(/target node/i);

      await user.selectOptions(sourceSelect, 'User Service');
      await user.selectOptions(targetSelect, 'User Service');

      const createButton = screen.getByText(/create connection/i);
      await user.click(createButton);

      expect(screen.getByText(/cannot connect node to itself/i)).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        error: new Error('Network Error'),
      });

      render(<DesignArchitecture designId="123" />);

      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.getByText(/check your connection/i)).toBeInTheDocument();
    });
  });

  describe('Zoom and Pan Functionality', () => {
    it('should allow zooming in and out', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const zoomInButton = screen.getByLabelText(/zoom in/i);
      const zoomOutButton = screen.getByLabelText(/zoom out/i);

      // Test zoom in
      await user.click(zoomInButton);
      // Verify zoom level changed (implementation depends on your zoom logic)

      // Test zoom out
      await user.click(zoomOutButton);
      // Verify zoom level changed
    });

    it('should allow panning the canvas', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const canvas = screen.getByRole('application');

      // Simulate drag to pan (implementation depends on your pan logic)
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(canvas);

      // Verify position changed (implementation depends on your state)
    });

    it('should reset view when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const resetButton = screen.getByLabelText(/reset view/i);
      await user.click(resetButton);

      // Verify view is reset (implementation depends on your reset logic)
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData, useSaveDesign, useExportDesign } from '../../hooks/designHooks';
import { DesignNode, Connection } from '../../types/designTypes';
import { axe } from 'jest-axe';

// Mock hooks
jest.mock('../../hooks/designHooks');

const mockUseDesignData = useDesignData as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseExportDesign = useExportDesign as jest.Mock;

const mockNodes: DesignNode[] = [
  { id: '1', type: 'service', name: 'User Service', position: { x: 100, y: 100 } },
  { id: '2', type: 'database', name: 'PostgreSQL', position: { x: 300, y: 200 } },
];

const mockConnections: Connection[] = [
  { id: 'conn-1', source: '1', target: '2', type: 'http' },
];

const mockDesignData = {
  nodes: mockNodes,
  connections: mockConnections,
  loading: false,
  error: null,
  refetch: jest.fn(),
};

const mockSaveDesign = {
  saveDesign: jest.fn().mockResolvedValue({ success: true }),
  isSaving: false,
  saveError: null,
};

const mockExportDesign = {
  exportDesign: jest.fn().mockResolvedValue({ success: true, url: 'http://example.com/export' }),
  isExporting: false,
  exportError: null,
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseDesignData.mockReturnValue(mockDesignData);
    mockUseSaveDesign.mockReturnValue(mockSaveDesign);
    mockUseExportDesign.mockReturnValue(mockExportDesign);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<DesignArchitecture designId="123" />);
    expect(screen.getByText(/design architecture/i)).toBeInTheDocument();
  });

  it('should be accessible', async () => {
    const { container } = render(<DesignArchitecture designId="123" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  describe('Loading States', () => {
    it('should show loading skeleton when data is loading', () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        loading: true,
      });

      render(<DesignArchitecture designId="123" />);
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should show error message when data fetch fails', () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        error: new Error('Failed to fetch'),
        loading: false,
      });

      render(<DesignArchitecture designId="123" />);
      expect(screen.getByText(/failed to load design data/i)).toBeInTheDocument();
    });
  });

  describe('Node Operations', () => {
    it('should render all nodes and connections', () => {
      render(<DesignArchitecture designId="123" />);

      mockNodes.forEach(node => {
        expect(screen.getByText(node.name)).toBeInTheDocument();
      });

      // Check if connections are rendered (simplified check)
      const connections = screen.getAllByTestId(/connection-/i);
      expect(connections.length).toBeGreaterThan(0);
    });

    it('should allow adding a new node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const addNodeButton = screen.getByLabelText(/add node/i);
      await user.click(addNodeButton);

      const nodeTypeSelect = screen.getByLabelText(/node type/i);
      await user.selectOptions(nodeTypeSelect, 'service');

      const nameInput = screen.getByLabelText(/node name/i);
      await user.type(nameInput, 'New Service');

      const submitButton = screen.getByText(/add/i);
      await user.click(submitButton);

      // Verify the new node appears (this would depend on your state management)
      await waitFor(() => {
        expect(screen.getByText('New Service')).toBeInTheDocument();
      });
    });

    it('should show validation error when adding node with empty name', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const addNodeButton = screen.getByLabelText(/add node/i);
      await user.click(addNodeButton);

      const submitButton = screen.getByText(/add/i);
      await user.click(submitButton);

      expect(screen.getByText(/node name is required/i)).toBeInTheDocument();
    });

    it('should allow deleting a node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const node = screen.getByText('User Service');
      const deleteButton = within(node.closest('div')!).getByLabelText(/delete node/i);

      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByText(/confirm/i);
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText('User Service')).not.toBeInTheDocument();
      });
    });

    it('should show confirmation dialog before deleting node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const node = screen.getByText('User Service');
      const deleteButton = within(node.closest('div')!).getByLabelText(/delete node/i);

      await user.click(deleteButton);

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });
  });

  describe('Connection Operations', () => {
    it('should allow creating a connection between nodes', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const sourceNode = screen.getByText('User Service');
      const targetNode = screen.getByText('PostgreSQL');

      // Simulate connection creation (implementation depends on your connection logic)
      const connectButton = screen.getByLabelText(/connect nodes/i);
      await user.click(connectButton);

      // Select source and target (simplified)
      const sourceSelect = screen.getByLabelText(/source node/i);
      const targetSelect = screen.getByLabelText(/target node/i);

      await user.selectOptions(sourceSelect, 'User Service');
      await user.selectOptions(targetSelect, 'PostgreSQL');

      const connectionTypeSelect = screen.getByLabelText(/connection type/i);
      await user.selectOptions(connectionTypeSelect, 'http');

      const createButton = screen.getByText(/create connection/i);
      await user.click(createButton);

      // Verify connection is created (simplified check)
      await waitFor(() => {
        const connections = screen.getAllByTestId(/connection-/i);
        expect(connections.length).toBe(2); // Original + new one
      });
    });

    it('should prevent creating duplicate connections', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const connectButton = screen.getByLabelText(/connect nodes/i);
      await user.click(connectButton);

      const sourceSelect = screen.getByLabelText(/source node/i);
      const targetSelect = screen.getByLabelText(/target node/i);

      await user.selectOptions(sourceSelect, 'User Service');
      await user.selectOptions(targetSelect, 'PostgreSQL');

      const connectionTypeSelect = screen.getByLabelText(/connection type/i);
      await user.selectOptions(connectionTypeSelect, 'http');

      const createButton = screen.getByText(/create connection/i);
      await user.click(createButton);

      // Try to create the same connection again
      await user.click(createButton);

      expect(screen.getByText(/connection already exists/i)).toBeInTheDocument();
    });

    it('should allow deleting a connection', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      // Find a connection (simplified)
      const connections = screen.getAllByTestId(/connection-/i);
      expect(connections.length).toBe(1);

      const deleteButton = within(connections[0]).getByLabelText(/delete connection/i);
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByText(/confirm/i);
      await user.click(confirmButton);

      await waitFor(() => {
        const updatedConnections = screen.queryAllByTestId(/connection-/i);
        expect(updatedConnections.length).toBe(0);
      });
    });
  });

  describe('Save and Export Operations', () => {
    it('should save the design when save button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const saveButton = screen.getByLabelText(/save design/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveDesign.saveDesign).toHaveBeenCalled();
        expect(screen.getByText(/design saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error when save fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        ...mockSaveDesign,
        saveError: new Error('Save failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const saveButton = screen.getByLabelText(/save design/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save design/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during save', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        ...mockSaveDesign,
        isSaving: true,
      });

      render(<DesignArchitecture designId="123" />);

      expect(screen.getByLabelText(/saving.../i)).toBeInTheDocument();
    });

    it('should export the design when export button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const exportButton = screen.getByLabelText(/export design/i);
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockExportDesign.exportDesign).toHaveBeenCalled();
        expect(screen.getByText(/design exported successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error when export fails', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        ...mockExportDesign,
        exportError: new Error('Export failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const exportButton = screen.getByLabelText(/export design/i);
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to export design/i)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation and Accessibility', () => {
    it('should allow keyboard navigation through nodes', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      // Focus on the first node
      const firstNode = screen.getByText('User Service');
      firstNode.focus();

      // Navigate to next node with arrow keys
      await user.keyboard('{ArrowRight}');

      // Verify focus moved (implementation depends on your keyboard navigation)
      expect(screen.getByText('PostgreSQL')).toHaveFocus();
    });

    it('should have proper ARIA attributes for screen readers', () => {
      render(<DesignArchitecture designId="123" />);

      const canvas = screen.getByRole('application');
      expect(canvas).toHaveAttribute('aria-label', 'Design architecture canvas');

      mockNodes.forEach(node => {
        const nodeElement = screen.getByText(node.name);
        expect(nodeElement).toHaveAttribute('role', 'button');
        expect(nodeElement).toHaveAttribute('tabindex', '0');
      });
    });

    it('should announce changes for screen readers', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const addNodeButton = screen.getByLabelText(/add node/i);
      await user.click(addNodeButton);

      // Check if live region announces the change
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent(/add node dialog opened/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design state', () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        nodes: [],
        connections: [],
      });

      render(<DesignArchitecture designId="123" />);

      expect(screen.getByText(/no nodes in design/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first node/i)).toBeInTheDocument();
    });

    it('should prevent connection to self', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const connectButton = screen.getByLabelText(/connect nodes/i);
      await user.click(connectButton);

      const sourceSelect = screen.getByLabelText(/source node/i);
      const targetSelect = screen.getByLabelText(/target node/i);

      await user.selectOptions(sourceSelect, 'User Service');
      await user.selectOptions(targetSelect, 'User Service');

      const createButton = screen.getByText(/create connection/i);
      await user.click(createButton);

      expect(screen.getByText(/cannot connect node to itself/i)).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        error: new Error('Network Error'),
      });

      render(<DesignArchitecture designId="123" />);

      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.getByText(/check your connection/i)).toBeInTheDocument();
    });
  });

  describe('Zoom and Pan Functionality', () => {
    it('should allow zooming in and out', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const zoomInButton = screen.getByLabelText(/zoom in/i);
      const zoomOutButton = screen.getByLabelText(/zoom out/i);

      // Test zoom in
      await user.click(zoomInButton);
      // Verify zoom level changed (implementation depends on your zoom logic)

      // Test zoom out
      await user.click(zoomOutButton);
      // Verify zoom level changed
    });

    it('should allow panning the canvas', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const canvas = screen.getByRole('application');

      // Simulate drag to pan (implementation depends on your pan logic)
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(canvas);

      // Verify position changed (implementation depends on your state)
    });

    it('should reset view when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="123" />);

      const resetButton = screen.getByLabelText(/reset view/i);
      await user.click(resetButton);

      // Verify view is reset (implementation depends on your reset logic)
    });
  });
});