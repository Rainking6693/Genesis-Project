import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData, useSaveDesign, useExportDesign } from '../../hooks/designHooks';
import { DesignNode, Connection } from '../../types/designTypes';
import { toast } from 'react-hot-toast';

// Mock the custom hooks
jest.mock('../../hooks/designHooks');
jest.mock('react-hot-toast');

const mockUseDesignData = useDesignData as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseExportDesign = useExportDesign as jest.Mock;
const mockToast = toast as jest.Mock;

const mockNodes: DesignNode[] = [
  { id: '1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'Auth Service' } },
  { id: '2', type: 'database', position: { x: 200, y: 100 }, data: { label: 'Users DB' } },
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
  saveDesign: jest.fn(),
  saving: false,
  saveError: null,
};

const mockExportDesign = {
  exportDesign: jest.fn(),
  exporting: false,
  exportError: null,
  exportUrl: null,
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseDesignData.mockReturnValue(mockDesignData);
    mockUseSaveDesign.mockReturnValue(mockSaveDesign);
    mockUseExportDesign.mockReturnValue(mockExportDesign);
    mockToast.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when data is loading', () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        loading: true,
        nodes: [],
        connections: [],
      });

      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByTestId('design-canvas')).not.toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        error: new Error('Failed to load design'),
        nodes: [],
        connections: [],
      });

      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByText(/failed to load design/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the design canvas with nodes and connections when data is loaded', () => {
      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      expect(screen.getByText('Auth Service')).toBeInTheDocument();
      expect(screen.getByText('Users DB')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow adding a new service node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const addNodeButton = screen.getByRole('button', { name: /add node/i });
      await user.click(addNodeButton);

      const serviceOption = screen.getByRole('option', { name: /service/i });
      await user.click(serviceOption);

      const nodeForm = screen.getByTestId('node-form');
      expect(nodeForm).toBeInTheDocument();

      const nameInput = within(nodeForm).getByLabelText(/name/i);
      const submitButton = within(nodeForm).getByRole('button', { name: /create/i });

      await user.type(nameInput, 'Payment Service');
      await user.click(submitButton);

      expect(mockDesignData.nodes).toHaveBeenCalled();
    });

    it('should allow connecting two nodes', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');
      const usersDB = screen.getByText('Users DB');

      // Simulate drag from Auth Service to Users DB
      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(authService, { clientX: 100, clientY: 50 });
      fireEvent.mouseUp(usersDB);

      await waitFor(() => {
        expect(mockDesignData.connections).toHaveBeenCalled();
      });
    });

    it('should allow deleting a node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');
      const deleteButton = within(authService.closest('div')!).getByRole('button', { name: /delete/i });

      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockDesignData.nodes).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Node deleted successfully', expect.anything());
    });

    it('should allow editing node properties', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');
      const editButton = within(authService.closest('div')!).getByRole('button', { name: /edit/i });

      await user.click(editButton);

      const editForm = screen.getByTestId('edit-node-form');
      expect(editForm).toBeInTheDocument();

      const nameInput = within(editForm).getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Authentication Service');

      const saveButton = within(editForm).getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockDesignData.nodes).toHaveBeenCalled();
    });
  });

  describe('Save and Export Functionality', () => {
    it('should save the design when save button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await user.click(saveButton);

      expect(mockSaveDesign.saveDesign).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: mockNodes,
          connections: mockConnections,
        })
      );
      expect(screen.getByText(/saving.../i)).toBeInTheDocument();
    });

    it('should show error when save fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        ...mockSaveDesign,
        saveError: new Error('Save failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Failed to save design', expect.anything());
      });
    });

    it('should export the design when export button is clicked', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        ...mockExportDesign,
        exportUrl: 'https://example.com/export/123',
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(mockExportDesign.exportDesign).toHaveBeenCalledWith('test-123');
      expect(screen.getByText(/exporting.../i)).toBeInTheDocument();
    });

    it('should show error when export fails', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        ...mockExportDesign,
        exportError: new Error('Export failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Failed to export design', expect.anything());
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByRole('button', { name: /add node/i })).toHaveAttribute('aria-label', 'Add new node');
      expect(screen.getByRole('button', { name: /save design/i })).toHaveAttribute('aria-label', 'Save current design');
      expect(screen.getByRole('button', { name: /export/i })).toHaveAttribute('aria-label', 'Export design');
    });

    it('should have proper keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      // Tab to add node button
      await user.tab();
      expect(screen.getByRole('button', { name: /add node/i })).toHaveFocus();

      // Press Enter to open node type selection
      await user.keyboard('{Enter}');
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Navigate with arrow keys and select service
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(screen.getByTestId('node-form')).toBeInTheDocument();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture designId="test-123" />);

      const nodes = screen.getAllByTestId('design-node');
      nodes.forEach(node => {
        expect(node).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // or your actual text color
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design state', () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        nodes: [],
        connections: [],
      });

      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByText(/your design is empty/i)).toBeInTheDocument();
      expect(screen.getByText(/add nodes to get started/i)).toBeInTheDocument();
    });

    it('should prevent connecting a node to itself', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');

      // Simulate drag from Auth Service to itself
      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(authService, { clientX: 50, clientY: 25 });
      fireEvent.mouseUp(authService);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Cannot connect a node to itself', expect.anything());
      });
    });

    it('should handle duplicate connection attempt', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');
      const usersDB = screen.getByText('Users DB');

      // First connection
      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(authService, { clientX: 100, clientY: 50 });
      fireEvent.mouseUp(usersDB);

      // Second connection (duplicate)
      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(authService, { clientX: 100, clientY: 50 });
      fireEvent.mouseUp(usersDB);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Connection already exists', expect.anything());
      });
    });

    it('should handle network errors during save gracefully', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        ...mockSaveDesign,
        saving: true,
        saveError: new Error('Network error'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Zoom and Pan Functionality', () => {
    it('should allow zooming in and out of the canvas', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });

      await user.click(zoomInButton);
      expect(screen.getByTestId('design-canvas')).toHaveStyle('transform: scale(1.2)');

      await user.click(zoomOutButton);
      expect(screen.getByTestId('design-canvas')).toHaveStyle('transform: scale(1)');
    });

    it('should allow panning the canvas when dragged', async () => {
      render(<DesignArchitecture designId="test-123" />);

      const canvas = screen.getByTestId('design-canvas');

      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(canvas);

      expect(canvas).toHaveStyle('transform: translate(50px, 50px) scale(1)');
    });

    it('should reset view when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const canvas = screen.getByTestId('design-canvas');
      // First set some transform
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(canvas);

      const resetButton = screen.getByRole('button', { name: /reset view/i });
      await user.click(resetButton);

      expect(canvas).toHaveStyle('transform: translate(0px, 0px) scale(1)');
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData, useSaveDesign, useExportDesign } from '../../hooks/designHooks';
import { DesignNode, Connection } from '../../types/designTypes';
import { toast } from 'react-hot-toast';

// Mock the custom hooks
jest.mock('../../hooks/designHooks');
jest.mock('react-hot-toast');

const mockUseDesignData = useDesignData as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseExportDesign = useExportDesign as jest.Mock;
const mockToast = toast as jest.Mock;

const mockNodes: DesignNode[] = [
  { id: '1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'Auth Service' } },
  { id: '2', type: 'database', position: { x: 200, y: 100 }, data: { label: 'Users DB' } },
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
  saveDesign: jest.fn(),
  saving: false,
  saveError: null,
};

const mockExportDesign = {
  exportDesign: jest.fn(),
  exporting: false,
  exportError: null,
  exportUrl: null,
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseDesignData.mockReturnValue(mockDesignData);
    mockUseSaveDesign.mockReturnValue(mockSaveDesign);
    mockUseExportDesign.mockReturnValue(mockExportDesign);
    mockToast.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when data is loading', () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        loading: true,
        nodes: [],
        connections: [],
      });

      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByTestId('design-canvas')).not.toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        error: new Error('Failed to load design'),
        nodes: [],
        connections: [],
      });

      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByText(/failed to load design/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the design canvas with nodes and connections when data is loaded', () => {
      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      expect(screen.getByText('Auth Service')).toBeInTheDocument();
      expect(screen.getByText('Users DB')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow adding a new service node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const addNodeButton = screen.getByRole('button', { name: /add node/i });
      await user.click(addNodeButton);

      const serviceOption = screen.getByRole('option', { name: /service/i });
      await user.click(serviceOption);

      const nodeForm = screen.getByTestId('node-form');
      expect(nodeForm).toBeInTheDocument();

      const nameInput = within(nodeForm).getByLabelText(/name/i);
      const submitButton = within(nodeForm).getByRole('button', { name: /create/i });

      await user.type(nameInput, 'Payment Service');
      await user.click(submitButton);

      expect(mockDesignData.nodes).toHaveBeenCalled();
    });

    it('should allow connecting two nodes', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');
      const usersDB = screen.getByText('Users DB');

      // Simulate drag from Auth Service to Users DB
      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(authService, { clientX: 100, clientY: 50 });
      fireEvent.mouseUp(usersDB);

      await waitFor(() => {
        expect(mockDesignData.connections).toHaveBeenCalled();
      });
    });

    it('should allow deleting a node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');
      const deleteButton = within(authService.closest('div')!).getByRole('button', { name: /delete/i });

      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockDesignData.nodes).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Node deleted successfully', expect.anything());
    });

    it('should allow editing node properties', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');
      const editButton = within(authService.closest('div')!).getByRole('button', { name: /edit/i });

      await user.click(editButton);

      const editForm = screen.getByTestId('edit-node-form');
      expect(editForm).toBeInTheDocument();

      const nameInput = within(editForm).getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Authentication Service');

      const saveButton = within(editForm).getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockDesignData.nodes).toHaveBeenCalled();
    });
  });

  describe('Save and Export Functionality', () => {
    it('should save the design when save button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await user.click(saveButton);

      expect(mockSaveDesign.saveDesign).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: mockNodes,
          connections: mockConnections,
        })
      );
      expect(screen.getByText(/saving.../i)).toBeInTheDocument();
    });

    it('should show error when save fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        ...mockSaveDesign,
        saveError: new Error('Save failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Failed to save design', expect.anything());
      });
    });

    it('should export the design when export button is clicked', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        ...mockExportDesign,
        exportUrl: 'https://example.com/export/123',
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(mockExportDesign.exportDesign).toHaveBeenCalledWith('test-123');
      expect(screen.getByText(/exporting.../i)).toBeInTheDocument();
    });

    it('should show error when export fails', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        ...mockExportDesign,
        exportError: new Error('Export failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Failed to export design', expect.anything());
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByRole('button', { name: /add node/i })).toHaveAttribute('aria-label', 'Add new node');
      expect(screen.getByRole('button', { name: /save design/i })).toHaveAttribute('aria-label', 'Save current design');
      expect(screen.getByRole('button', { name: /export/i })).toHaveAttribute('aria-label', 'Export design');
    });

    it('should have proper keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      // Tab to add node button
      await user.tab();
      expect(screen.getByRole('button', { name: /add node/i })).toHaveFocus();

      // Press Enter to open node type selection
      await user.keyboard('{Enter}');
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Navigate with arrow keys and select service
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(screen.getByTestId('node-form')).toBeInTheDocument();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture designId="test-123" />);

      const nodes = screen.getAllByTestId('design-node');
      nodes.forEach(node => {
        expect(node).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // or your actual text color
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design state', () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        nodes: [],
        connections: [],
      });

      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByText(/your design is empty/i)).toBeInTheDocument();
      expect(screen.getByText(/add nodes to get started/i)).toBeInTheDocument();
    });

    it('should prevent connecting a node to itself', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');

      // Simulate drag from Auth Service to itself
      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(authService, { clientX: 50, clientY: 25 });
      fireEvent.mouseUp(authService);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Cannot connect a node to itself', expect.anything());
      });
    });

    it('should handle duplicate connection attempt', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');
      const usersDB = screen.getByText('Users DB');

      // First connection
      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(authService, { clientX: 100, clientY: 50 });
      fireEvent.mouseUp(usersDB);

      // Second connection (duplicate)
      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(authService, { clientX: 100, clientY: 50 });
      fireEvent.mouseUp(usersDB);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Connection already exists', expect.anything());
      });
    });

    it('should handle network errors during save gracefully', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        ...mockSaveDesign,
        saving: true,
        saveError: new Error('Network error'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Zoom and Pan Functionality', () => {
    it('should allow zooming in and out of the canvas', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });

      await user.click(zoomInButton);
      expect(screen.getByTestId('design-canvas')).toHaveStyle('transform: scale(1.2)');

      await user.click(zoomOutButton);
      expect(screen.getByTestId('design-canvas')).toHaveStyle('transform: scale(1)');
    });

    it('should allow panning the canvas when dragged', async () => {
      render(<DesignArchitecture designId="test-123" />);

      const canvas = screen.getByTestId('design-canvas');

      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(canvas);

      expect(canvas).toHaveStyle('transform: translate(50px, 50px) scale(1)');
    });

    it('should reset view when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const canvas = screen.getByTestId('design-canvas');
      // First set some transform
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(canvas);

      const resetButton = screen.getByRole('button', { name: /reset view/i });
      await user.click(resetButton);

      expect(canvas).toHaveStyle('transform: translate(0px, 0px) scale(1)');
    });
  });
});