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
        error: new Error('Failed to fetch'),
        nodes: [],
        connections: [],
      });

      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByText(/failed to load design/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the design canvas with nodes and connections when data is available', () => {
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

      await user.click(screen.getByRole('button', { name: /add service/i }));
      await user.type(screen.getByLabelText(/service name/i), 'Payment Service');
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(mockDesignData.refetch).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Service added successfully', { type: 'success' });
    });

    it('should allow adding a new database node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      await user.click(screen.getByRole('button', { name: /add database/i }));
      await user.type(screen.getByLabelText(/database name/i), 'Payments DB');
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(mockDesignData.refetch).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Database added successfully', { type: 'success' });
    });

    it('should show validation error when adding node with empty name', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      await user.click(screen.getByRole('button', { name: /add service/i }));
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(mockDesignData.refetch).not.toHaveBeenCalled();
    });

    it('should allow creating connections between nodes', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');
      const usersDB = screen.getByText('Users DB');

      // Simulate drag from source to target
      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(authService, { clientX: 100, clientY: 50 });
      fireEvent.mouseUp(usersDB);

      await waitFor(() => {
        expect(screen.getByTestId('connection-conn-1')).toBeInTheDocument();
      });
    });

    it('should allow deleting a node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const deleteButtons = screen.getAllByLabelText(/delete node/i);
      await user.click(deleteButtons[0]);

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(mockDesignData.refetch).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Node deleted successfully', { type: 'success' });
    });

    it('should allow deleting a connection', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const connection = screen.getByTestId('connection-conn-1');
      const deleteButton = within(connection).getByLabelText(/delete connection/i);

      await user.click(deleteButton);
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(mockDesignData.refetch).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Connection deleted successfully', { type: 'success' });
    });
  });

  describe('Save Functionality', () => {
    it('should save the design successfully', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      await user.click(screen.getByRole('button', { name: /save design/i }));

      expect(mockSaveDesign.saveDesign).toHaveBeenCalledWith('test-123', {
        nodes: mockNodes,
        connections: mockConnections,
      });
      expect(mockToast).toHaveBeenCalledWith('Design saved successfully', { type: 'success' });
    });

    it('should show error when save fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        ...mockSaveDesign,
        saveError: new Error('Save failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      await user.click(screen.getByRole('button', { name: /save design/i }));

      expect(mockToast).toHaveBeenCalledWith('Failed to save design', { type: 'error' });
    });

    it('should show loading state during save', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        ...mockSaveDesign,
        saving: true,
      });

      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should export the design successfully', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        ...mockExportDesign,
        exportUrl: 'https://example.com/export/test-123',
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(mockExportDesign.exportDesign).toHaveBeenCalledWith('test-123');
      expect(screen.getByText(/design exported successfully/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /download export/i })).toHaveAttribute(
        'href',
        'https://example.com/export/test-123'
      );
    });

    it('should show error when export fails', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        ...mockExportDesign,
        exportError: new Error('Export failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(mockToast).toHaveBeenCalledWith('Failed to export design', { type: 'error' });
    });

    it('should show loading state during export', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        ...mockExportDesign,
        exporting: true,
      });

      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByRole('button', { name: /exporting/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByLabelText(/design canvas/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add service node/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add database node/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/save current design/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/export design/i)).toBeInTheDocument();
    });

    it('should have proper keyboard navigation for nodes', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');
      authService.focus();

      await user.keyboard('{Enter}');
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.keyboard('{ArrowDown}{Enter}');
      expect(mockDesignData.refetch).toHaveBeenCalled();
    });

    it('should have proper contrast for interactive elements', () => {
      render(<DesignArchitecture designId="test-123" />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveStyle('color: rgb(255, 255, 255)');
        expect(button).toHaveStyle('background-color: rgb(59, 130, 246)');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design state gracefully', () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        nodes: [],
        connections: [],
      });

      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByText(/your design is empty/i)).toBeInTheDocument();
      expect(screen.getByText(/add nodes to get started/i)).toBeInTheDocument();
    });

    it('should prevent connection to same node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');

      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(authService, { clientX: 50, clientY: 25 });
      fireEvent.mouseUp(authService);

      expect(mockToast).toHaveBeenCalledWith('Cannot connect a node to itself', { type: 'error' });
    });

    it('should handle rapid successive saves', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const saveButton = screen.getByRole('button', { name: /save design/i });

      // Rapid clicks
      await user.click(saveButton);
      await user.click(saveButton);
      await user.click(saveButton);

      expect(mockSaveDesign.saveDesign).toHaveBeenCalledTimes(1);
      expect(saveButton).toBeDisabled();
    });

    it('should recover from failed initial load after retry', async () => {
      const errorData = {
        ...mockDesignData,
        error: new Error('Initial load failed'),
        nodes: [],
        connections: [],
      };

      const successData = {
        ...mockDesignData,
        error: null,
      };

      mockUseDesignData.mockReturnValueOnce(errorData).mockReturnValueOnce(successData);

      const user = userEvent.setup();
      const { rerender } = render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByText(/failed to load design/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /retry/i }));

      rerender(<DesignArchitecture designId="test-123" />);

      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
    });
  });

  describe('Zoom and Pan Functionality', () => {
    it('should allow zooming in and out', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const canvas = screen.getByTestId('design-canvas');

      // Zoom in
      fireEvent.wheel(canvas, { deltaY: -100, ctrlKey: true });
      expect(canvas).toHaveStyle('transform: scale(1.1)');

      // Zoom out
      fireEvent.wheel(canvas, { deltaY: 100, ctrlKey: true });
      expect(canvas).toHaveStyle('transform: scale(1)');
    });

    it('should allow panning the canvas', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const canvas = screen.getByTestId('design-canvas');

      // Start pan
      fireEvent.mouseDown(canvas, { button: 1 }); // Middle mouse button
      fireEvent.mouseMove(canvas, { clientX: 100, clientY: 50, movementX: 50, movementY: 25 });
      fireEvent.mouseUp(canvas);

      expect(canvas).toHaveStyle('transform: translate(50px, 25px) scale(1)');
    });

    it('should reset view on double click', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const canvas = screen.getByTestId('design-canvas');

      // First set some zoom/pan
      fireEvent.wheel(canvas, { deltaY: -100, ctrlKey: true });
      fireEvent.mouseDown(canvas, { button: 1 });
      fireEvent.mouseMove(canvas, { clientX: 100, clientY: 50, movementX: 50, movementY: 25 });
      fireEvent.mouseUp(canvas);

      // Then reset
      await user.dblClick(canvas);

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
        error: new Error('Failed to fetch'),
        nodes: [],
        connections: [],
      });

      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByText(/failed to load design/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the design canvas with nodes and connections when data is available', () => {
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

      await user.click(screen.getByRole('button', { name: /add service/i }));
      await user.type(screen.getByLabelText(/service name/i), 'Payment Service');
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(mockDesignData.refetch).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Service added successfully', { type: 'success' });
    });

    it('should allow adding a new database node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      await user.click(screen.getByRole('button', { name: /add database/i }));
      await user.type(screen.getByLabelText(/database name/i), 'Payments DB');
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(mockDesignData.refetch).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Database added successfully', { type: 'success' });
    });

    it('should show validation error when adding node with empty name', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      await user.click(screen.getByRole('button', { name: /add service/i }));
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(mockDesignData.refetch).not.toHaveBeenCalled();
    });

    it('should allow creating connections between nodes', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');
      const usersDB = screen.getByText('Users DB');

      // Simulate drag from source to target
      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(authService, { clientX: 100, clientY: 50 });
      fireEvent.mouseUp(usersDB);

      await waitFor(() => {
        expect(screen.getByTestId('connection-conn-1')).toBeInTheDocument();
      });
    });

    it('should allow deleting a node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const deleteButtons = screen.getAllByLabelText(/delete node/i);
      await user.click(deleteButtons[0]);

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(mockDesignData.refetch).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Node deleted successfully', { type: 'success' });
    });

    it('should allow deleting a connection', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const connection = screen.getByTestId('connection-conn-1');
      const deleteButton = within(connection).getByLabelText(/delete connection/i);

      await user.click(deleteButton);
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(mockDesignData.refetch).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Connection deleted successfully', { type: 'success' });
    });
  });

  describe('Save Functionality', () => {
    it('should save the design successfully', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      await user.click(screen.getByRole('button', { name: /save design/i }));

      expect(mockSaveDesign.saveDesign).toHaveBeenCalledWith('test-123', {
        nodes: mockNodes,
        connections: mockConnections,
      });
      expect(mockToast).toHaveBeenCalledWith('Design saved successfully', { type: 'success' });
    });

    it('should show error when save fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        ...mockSaveDesign,
        saveError: new Error('Save failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      await user.click(screen.getByRole('button', { name: /save design/i }));

      expect(mockToast).toHaveBeenCalledWith('Failed to save design', { type: 'error' });
    });

    it('should show loading state during save', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        ...mockSaveDesign,
        saving: true,
      });

      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should export the design successfully', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        ...mockExportDesign,
        exportUrl: 'https://example.com/export/test-123',
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(mockExportDesign.exportDesign).toHaveBeenCalledWith('test-123');
      expect(screen.getByText(/design exported successfully/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /download export/i })).toHaveAttribute(
        'href',
        'https://example.com/export/test-123'
      );
    });

    it('should show error when export fails', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        ...mockExportDesign,
        exportError: new Error('Export failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(mockToast).toHaveBeenCalledWith('Failed to export design', { type: 'error' });
    });

    it('should show loading state during export', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        ...mockExportDesign,
        exporting: true,
      });

      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByRole('button', { name: /exporting/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByLabelText(/design canvas/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add service node/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add database node/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/save current design/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/export design/i)).toBeInTheDocument();
    });

    it('should have proper keyboard navigation for nodes', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');
      authService.focus();

      await user.keyboard('{Enter}');
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.keyboard('{ArrowDown}{Enter}');
      expect(mockDesignData.refetch).toHaveBeenCalled();
    });

    it('should have proper contrast for interactive elements', () => {
      render(<DesignArchitecture designId="test-123" />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveStyle('color: rgb(255, 255, 255)');
        expect(button).toHaveStyle('background-color: rgb(59, 130, 246)');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design state gracefully', () => {
      mockUseDesignData.mockReturnValueOnce({
        ...mockDesignData,
        nodes: [],
        connections: [],
      });

      render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByText(/your design is empty/i)).toBeInTheDocument();
      expect(screen.getByText(/add nodes to get started/i)).toBeInTheDocument();
    });

    it('should prevent connection to same node', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const authService = screen.getByText('Auth Service');

      fireEvent.mouseDown(authService);
      fireEvent.mouseMove(authService, { clientX: 50, clientY: 25 });
      fireEvent.mouseUp(authService);

      expect(mockToast).toHaveBeenCalledWith('Cannot connect a node to itself', { type: 'error' });
    });

    it('should handle rapid successive saves', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const saveButton = screen.getByRole('button', { name: /save design/i });

      // Rapid clicks
      await user.click(saveButton);
      await user.click(saveButton);
      await user.click(saveButton);

      expect(mockSaveDesign.saveDesign).toHaveBeenCalledTimes(1);
      expect(saveButton).toBeDisabled();
    });

    it('should recover from failed initial load after retry', async () => {
      const errorData = {
        ...mockDesignData,
        error: new Error('Initial load failed'),
        nodes: [],
        connections: [],
      };

      const successData = {
        ...mockDesignData,
        error: null,
      };

      mockUseDesignData.mockReturnValueOnce(errorData).mockReturnValueOnce(successData);

      const user = userEvent.setup();
      const { rerender } = render(<DesignArchitecture designId="test-123" />);

      expect(screen.getByText(/failed to load design/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /retry/i }));

      rerender(<DesignArchitecture designId="test-123" />);

      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
    });
  });

  describe('Zoom and Pan Functionality', () => {
    it('should allow zooming in and out', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const canvas = screen.getByTestId('design-canvas');

      // Zoom in
      fireEvent.wheel(canvas, { deltaY: -100, ctrlKey: true });
      expect(canvas).toHaveStyle('transform: scale(1.1)');

      // Zoom out
      fireEvent.wheel(canvas, { deltaY: 100, ctrlKey: true });
      expect(canvas).toHaveStyle('transform: scale(1)');
    });

    it('should allow panning the canvas', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const canvas = screen.getByTestId('design-canvas');

      // Start pan
      fireEvent.mouseDown(canvas, { button: 1 }); // Middle mouse button
      fireEvent.mouseMove(canvas, { clientX: 100, clientY: 50, movementX: 50, movementY: 25 });
      fireEvent.mouseUp(canvas);

      expect(canvas).toHaveStyle('transform: translate(50px, 25px) scale(1)');
    });

    it('should reset view on double click', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="test-123" />);

      const canvas = screen.getByTestId('design-canvas');

      // First set some zoom/pan
      fireEvent.wheel(canvas, { deltaY: -100, ctrlKey: true });
      fireEvent.mouseDown(canvas, { button: 1 });
      fireEvent.mouseMove(canvas, { clientX: 100, clientY: 50, movementX: 50, movementY: 25 });
      fireEvent.mouseUp(canvas);

      // Then reset
      await user.dblClick(canvas);

      expect(canvas).toHaveStyle('transform: translate(0px, 0px) scale(1)');
    });
  });
});