import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData, useSaveDesign, useExportDesign } from '../../hooks/designHooks';
import { DesignContext } from '../../context/DesignContext';
import { toast } from 'react-hot-toast';

// Mock the hooks
jest.mock('../../hooks/designHooks');
jest.mock('react-hot-toast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockUseDesignData = useDesignData as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseExportDesign = useExportDesign as jest.Mock;
const mockToast = toast as jest.Mock;

const mockDesignData = {
  id: '123',
  name: 'Test Architecture',
  components: [
    { id: 'comp1', type: 'database', name: 'Primary DB', x: 100, y: 100 },
    { id: 'comp2', type: 'service', name: 'API Service', x: 300, y: 100 },
  ],
  connections: [
    { id: 'conn1', from: 'comp1', to: 'comp2', type: 'rest' },
  ],
  loading: false,
  error: null,
};

const mockSaveDesign = jest.fn();
const mockExportDesign = jest.fn();

const renderComponent = (contextValue = {}) => {
  mockUseDesignData.mockReturnValue({
    data: mockDesignData,
    loading: false,
    error: null,
    refetch: jest.fn(),
  });

  mockUseSaveDesign.mockReturnValue({
    saveDesign: mockSaveDesign,
    saving: false,
    saveError: null,
  });

  mockUseExportDesign.mockReturnValue({
    exportDesign: mockExportDesign,
    exporting: false,
    exportError: null,
  });

  return render(
    <DesignContext.Provider value={{ ...contextValue }}>
      <DesignArchitecture />
    </DesignContext.Provider>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when data is loading', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        loading: true,
        error: null,
        refetch: jest.fn(),
      });

      renderComponent();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        loading: false,
        error: new Error('Failed to fetch'),
        refetch: jest.fn(),
      });

      renderComponent();
      expect(screen.getByText(/failed to load design/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the design canvas with components when data is loaded', () => {
      renderComponent();
      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      expect(screen.getByText('Primary DB')).toBeInTheDocument();
      expect(screen.getByText('API Service')).toBeInTheDocument();
    });
  });

  describe('Component Interactions', () => {
    it('should allow dragging components on the canvas', async () => {
      renderComponent();

      const component = screen.getByText('Primary DB');
      const initialPosition = component.getBoundingClientRect();

      await userEvent.pointer({
        keys: '[MouseLeft>]',
        target: component,
        coords: { x: initialPosition.x + 5, y: initialPosition.y + 5 },
      });

      await userEvent.pointer({
        coords: { x: initialPosition.x + 50, y: initialPosition.y + 50 },
      });

      await userEvent.pointer({
        keys: '[/MouseLeft]',
      });

      // Verify position changed (implementation specific)
      const newPosition = component.getBoundingClientRect();
      expect(newPosition.x).not.toBe(initialPosition.x);
      expect(newPosition.y).not.toBe(initialPosition.y);
    });

    it('should open component settings when clicking on a component', async () => {
      renderComponent();

      await userEvent.click(screen.getByText('Primary DB'));
      expect(screen.getByTestId('component-settings')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Primary DB')).toBeInTheDocument();
    });

    it('should update component name in settings', async () => {
      renderComponent();

      await userEvent.click(screen.getByText('Primary DB'));
      const nameInput = screen.getByLabelText(/component name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated DB Name');

      expect(nameInput).toHaveValue('Updated DB Name');
    });

    it('should delete a component when delete button is clicked', async () => {
      renderComponent();

      await userEvent.click(screen.getByText('Primary DB'));
      await userEvent.click(screen.getByRole('button', { name: /delete component/i }));

      expect(screen.queryByText('Primary DB')).not.toBeInTheDocument();
    });
  });

  describe('Connection Management', () => {
    it('should create a connection between two components', async () => {
      renderComponent();

      const dbComponent = screen.getByText('Primary DB');
      const serviceComponent = screen.getByText('API Service');

      // Click on first component to start connection
      await userEvent.click(dbComponent);
      await userEvent.click(screen.getByRole('button', { name: /connect/i }));

      // Click on second component to complete connection
      await userEvent.click(serviceComponent);

      // Verify connection is created (implementation specific)
      expect(mockSaveDesign).toHaveBeenCalled();
    });

    it('should delete a connection when delete button is clicked', async () => {
      renderComponent();

      // Find the connection line (implementation specific)
      const connectionLine = screen.getByTestId('connection-conn1');
      await userEvent.click(connectionLine);

      await userEvent.click(screen.getByRole('button', { name: /delete connection/i }));

      expect(mockSaveDesign).toHaveBeenCalled();
    });
  });

  describe('Toolbar Actions', () => {
    it('should add a new component when add button is clicked', async () => {
      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: /add component/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /database/i }));

      expect(screen.getByText(/new database/i)).toBeInTheDocument();
    });

    it('should save the design when save button is clicked', async () => {
      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: /save/i }));
      expect(mockSaveDesign).toHaveBeenCalledWith(mockDesignData);
      expect(mockToast).toHaveBeenCalledWith('Design saved successfully', { type: 'success' });
    });

    it('should show error when save fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        saving: false,
        saveError: new Error('Save failed'),
      });

      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: /save/i }));
      expect(mockToast).toHaveBeenCalledWith('Failed to save design', { type: 'error' });
    });

    it('should export the design when export button is clicked', async () => {
      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: /export/i }));
      expect(mockExportDesign).toHaveBeenCalledWith('123');
    });

    it('should show loading state during export', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        exportDesign: mockExportDesign,
        exporting: true,
        exportError: null,
      });

      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: /export/i }));
      expect(screen.getByTestId('export-loading')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderComponent();

      expect(screen.getByRole('button', { name: /add component/i })).toHaveAttribute('aria-label', 'Add new component');
      expect(screen.getByRole('button', { name: /save/i })).toHaveAttribute('aria-label', 'Save design');
      expect(screen.getByRole('button', { name: /export/i })).toHaveAttribute('aria-label', 'Export design');
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /add component/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /save/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /export/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      renderComponent();

      const components = screen.getAllByRole('heading', { level: 3 });
      components.forEach(component => {
        const style = window.getComputedStyle(component);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        // This is a simplified check - in real tests you'd use a proper contrast checker
        expect(color).not.toBe(backgroundColor);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design state', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: { ...mockDesignData, components: [], connections: [] },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderComponent();
      expect(screen.getByText(/your design is empty/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add your first component/i })).toBeInTheDocument();
    });

    it('should prevent invalid connections (self-connections)', async () => {
      renderComponent();

      const component = screen.getByText('Primary DB');
      await userEvent.click(component);
      await userEvent.click(screen.getByRole('button', { name: /connect/i }));
      await userEvent.click(component);

      expect(mockToast).toHaveBeenCalledWith('Cannot connect a component to itself', { type: 'error' });
      expect(mockSaveDesign).not.toHaveBeenCalled();
    });

    it('should prevent duplicate connections', async () => {
      renderComponent();

      const dbComponent = screen.getByText('Primary DB');
      const serviceComponent = screen.getByText('API Service');

      await userEvent.click(dbComponent);
      await userEvent.click(screen.getByRole('button', { name: /connect/i }));
      await userEvent.click(serviceComponent);

      // Try to create the same connection again
      await userEvent.click(dbComponent);
      await userEvent.click(screen.getByRole('button', { name: /connect/i }));
      await userEvent.click(serviceComponent);

      expect(mockSaveDesign).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith('Connection already exists', { type: 'warning' });
    });

    it('should handle very large designs without performance issues', async () => {
      const largeDesignData = {
        ...mockDesignData,
        components: Array.from({ length: 100 }, (_, i) => ({
          id: `comp${i}`,
          type: 'service',
          name: `Service ${i}`,
          x: i * 50,
          y: i * 50,
        })),
      };

      mockUseDesignData.mockReturnValueOnce({
        data: largeDesignData,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderComponent();
      expect(screen.getByText(/service 0/i)).toBeInTheDocument();
      expect(screen.getByText(/service 99/i)).toBeInTheDocument();
    });
  });

  describe('Context Menu', () => {
    it('should show context menu on right click', async () => {
      renderComponent();

      const component = screen.getByText('Primary DB');
      await userEvent.pointer({
        keys: '[MouseRight>]',
        target: component,
      });

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
    });

    it('should perform actions from context menu', async () => {
      renderComponent();

      const component = screen.getByText('Primary DB');
      await userEvent.pointer({
        keys: '[MouseRight>]',
        target: component,
      });

      await userEvent.click(screen.getByRole('menuitem', { name: /delete/i }));
      expect(screen.queryByText('Primary DB')).not.toBeInTheDocument();
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should undo the last action', async () => {
      renderComponent();

      // Perform an action (add component)
      await userEvent.click(screen.getByRole('button', { name: /add component/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /database/i }));

      // Undo the action
      await userEvent.click(screen.getByRole('button', { name: /undo/i }));

      expect(screen.queryByText(/new database/i)).not.toBeInTheDocument();
    });

    it('should redo the last undone action', async () => {
      renderComponent();

      // Perform an action
      await userEvent.click(screen.getByRole('button', { name: /add component/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /database/i }));

      // Undo then redo
      await userEvent.click(screen.getByRole('button', { name: /undo/i }));
      await userEvent.click(screen.getByRole('button', { name: /redo/i }));

      expect(screen.getByText(/new database/i)).toBeInTheDocument();
    });

    it('should disable undo/redo buttons when no actions are available', async () => {
      renderComponent();

      expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /redo/i })).toBeDisabled();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData, useSaveDesign, useExportDesign } from '../../hooks/designHooks';
import { DesignContext } from '../../context/DesignContext';
import { toast } from 'react-hot-toast';

// Mock the hooks
jest.mock('../../hooks/designHooks');
jest.mock('react-hot-toast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockUseDesignData = useDesignData as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseExportDesign = useExportDesign as jest.Mock;
const mockToast = toast as jest.Mock;

const mockDesignData = {
  id: '123',
  name: 'Test Architecture',
  components: [
    { id: 'comp1', type: 'database', name: 'Primary DB', x: 100, y: 100 },
    { id: 'comp2', type: 'service', name: 'API Service', x: 300, y: 100 },
  ],
  connections: [
    { id: 'conn1', from: 'comp1', to: 'comp2', type: 'rest' },
  ],
  loading: false,
  error: null,
};

const mockSaveDesign = jest.fn();
const mockExportDesign = jest.fn();

const renderComponent = (contextValue = {}) => {
  mockUseDesignData.mockReturnValue({
    data: mockDesignData,
    loading: false,
    error: null,
    refetch: jest.fn(),
  });

  mockUseSaveDesign.mockReturnValue({
    saveDesign: mockSaveDesign,
    saving: false,
    saveError: null,
  });

  mockUseExportDesign.mockReturnValue({
    exportDesign: mockExportDesign,
    exporting: false,
    exportError: null,
  });

  return render(
    <DesignContext.Provider value={{ ...contextValue }}>
      <DesignArchitecture />
    </DesignContext.Provider>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when data is loading', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        loading: true,
        error: null,
        refetch: jest.fn(),
      });

      renderComponent();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        loading: false,
        error: new Error('Failed to fetch'),
        refetch: jest.fn(),
      });

      renderComponent();
      expect(screen.getByText(/failed to load design/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the design canvas with components when data is loaded', () => {
      renderComponent();
      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      expect(screen.getByText('Primary DB')).toBeInTheDocument();
      expect(screen.getByText('API Service')).toBeInTheDocument();
    });
  });

  describe('Component Interactions', () => {
    it('should allow dragging components on the canvas', async () => {
      renderComponent();

      const component = screen.getByText('Primary DB');
      const initialPosition = component.getBoundingClientRect();

      await userEvent.pointer({
        keys: '[MouseLeft>]',
        target: component,
        coords: { x: initialPosition.x + 5, y: initialPosition.y + 5 },
      });

      await userEvent.pointer({
        coords: { x: initialPosition.x + 50, y: initialPosition.y + 50 },
      });

      await userEvent.pointer({
        keys: '[/MouseLeft]',
      });

      // Verify position changed (implementation specific)
      const newPosition = component.getBoundingClientRect();
      expect(newPosition.x).not.toBe(initialPosition.x);
      expect(newPosition.y).not.toBe(initialPosition.y);
    });

    it('should open component settings when clicking on a component', async () => {
      renderComponent();

      await userEvent.click(screen.getByText('Primary DB'));
      expect(screen.getByTestId('component-settings')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Primary DB')).toBeInTheDocument();
    });

    it('should update component name in settings', async () => {
      renderComponent();

      await userEvent.click(screen.getByText('Primary DB'));
      const nameInput = screen.getByLabelText(/component name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated DB Name');

      expect(nameInput).toHaveValue('Updated DB Name');
    });

    it('should delete a component when delete button is clicked', async () => {
      renderComponent();

      await userEvent.click(screen.getByText('Primary DB'));
      await userEvent.click(screen.getByRole('button', { name: /delete component/i }));

      expect(screen.queryByText('Primary DB')).not.toBeInTheDocument();
    });
  });

  describe('Connection Management', () => {
    it('should create a connection between two components', async () => {
      renderComponent();

      const dbComponent = screen.getByText('Primary DB');
      const serviceComponent = screen.getByText('API Service');

      // Click on first component to start connection
      await userEvent.click(dbComponent);
      await userEvent.click(screen.getByRole('button', { name: /connect/i }));

      // Click on second component to complete connection
      await userEvent.click(serviceComponent);

      // Verify connection is created (implementation specific)
      expect(mockSaveDesign).toHaveBeenCalled();
    });

    it('should delete a connection when delete button is clicked', async () => {
      renderComponent();

      // Find the connection line (implementation specific)
      const connectionLine = screen.getByTestId('connection-conn1');
      await userEvent.click(connectionLine);

      await userEvent.click(screen.getByRole('button', { name: /delete connection/i }));

      expect(mockSaveDesign).toHaveBeenCalled();
    });
  });

  describe('Toolbar Actions', () => {
    it('should add a new component when add button is clicked', async () => {
      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: /add component/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /database/i }));

      expect(screen.getByText(/new database/i)).toBeInTheDocument();
    });

    it('should save the design when save button is clicked', async () => {
      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: /save/i }));
      expect(mockSaveDesign).toHaveBeenCalledWith(mockDesignData);
      expect(mockToast).toHaveBeenCalledWith('Design saved successfully', { type: 'success' });
    });

    it('should show error when save fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        saving: false,
        saveError: new Error('Save failed'),
      });

      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: /save/i }));
      expect(mockToast).toHaveBeenCalledWith('Failed to save design', { type: 'error' });
    });

    it('should export the design when export button is clicked', async () => {
      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: /export/i }));
      expect(mockExportDesign).toHaveBeenCalledWith('123');
    });

    it('should show loading state during export', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        exportDesign: mockExportDesign,
        exporting: true,
        exportError: null,
      });

      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: /export/i }));
      expect(screen.getByTestId('export-loading')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderComponent();

      expect(screen.getByRole('button', { name: /add component/i })).toHaveAttribute('aria-label', 'Add new component');
      expect(screen.getByRole('button', { name: /save/i })).toHaveAttribute('aria-label', 'Save design');
      expect(screen.getByRole('button', { name: /export/i })).toHaveAttribute('aria-label', 'Export design');
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /add component/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /save/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /export/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      renderComponent();

      const components = screen.getAllByRole('heading', { level: 3 });
      components.forEach(component => {
        const style = window.getComputedStyle(component);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        // This is a simplified check - in real tests you'd use a proper contrast checker
        expect(color).not.toBe(backgroundColor);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design state', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: { ...mockDesignData, components: [], connections: [] },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderComponent();
      expect(screen.getByText(/your design is empty/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add your first component/i })).toBeInTheDocument();
    });

    it('should prevent invalid connections (self-connections)', async () => {
      renderComponent();

      const component = screen.getByText('Primary DB');
      await userEvent.click(component);
      await userEvent.click(screen.getByRole('button', { name: /connect/i }));
      await userEvent.click(component);

      expect(mockToast).toHaveBeenCalledWith('Cannot connect a component to itself', { type: 'error' });
      expect(mockSaveDesign).not.toHaveBeenCalled();
    });

    it('should prevent duplicate connections', async () => {
      renderComponent();

      const dbComponent = screen.getByText('Primary DB');
      const serviceComponent = screen.getByText('API Service');

      await userEvent.click(dbComponent);
      await userEvent.click(screen.getByRole('button', { name: /connect/i }));
      await userEvent.click(serviceComponent);

      // Try to create the same connection again
      await userEvent.click(dbComponent);
      await userEvent.click(screen.getByRole('button', { name: /connect/i }));
      await userEvent.click(serviceComponent);

      expect(mockSaveDesign).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith('Connection already exists', { type: 'warning' });
    });

    it('should handle very large designs without performance issues', async () => {
      const largeDesignData = {
        ...mockDesignData,
        components: Array.from({ length: 100 }, (_, i) => ({
          id: `comp${i}`,
          type: 'service',
          name: `Service ${i}`,
          x: i * 50,
          y: i * 50,
        })),
      };

      mockUseDesignData.mockReturnValueOnce({
        data: largeDesignData,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderComponent();
      expect(screen.getByText(/service 0/i)).toBeInTheDocument();
      expect(screen.getByText(/service 99/i)).toBeInTheDocument();
    });
  });

  describe('Context Menu', () => {
    it('should show context menu on right click', async () => {
      renderComponent();

      const component = screen.getByText('Primary DB');
      await userEvent.pointer({
        keys: '[MouseRight>]',
        target: component,
      });

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
    });

    it('should perform actions from context menu', async () => {
      renderComponent();

      const component = screen.getByText('Primary DB');
      await userEvent.pointer({
        keys: '[MouseRight>]',
        target: component,
      });

      await userEvent.click(screen.getByRole('menuitem', { name: /delete/i }));
      expect(screen.queryByText('Primary DB')).not.toBeInTheDocument();
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should undo the last action', async () => {
      renderComponent();

      // Perform an action (add component)
      await userEvent.click(screen.getByRole('button', { name: /add component/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /database/i }));

      // Undo the action
      await userEvent.click(screen.getByRole('button', { name: /undo/i }));

      expect(screen.queryByText(/new database/i)).not.toBeInTheDocument();
    });

    it('should redo the last undone action', async () => {
      renderComponent();

      // Perform an action
      await userEvent.click(screen.getByRole('button', { name: /add component/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /database/i }));

      // Undo then redo
      await userEvent.click(screen.getByRole('button', { name: /undo/i }));
      await userEvent.click(screen.getByRole('button', { name: /redo/i }));

      expect(screen.getByText(/new database/i)).toBeInTheDocument();
    });

    it('should disable undo/redo buttons when no actions are available', async () => {
      renderComponent();

      expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /redo/i })).toBeDisabled();
    });
  });
});