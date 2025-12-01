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
  useNavigate: () => jest.fn(),
}));

const mockUseDesignData = useDesignData as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseExportDesign = useExportDesign as jest.Mock;
const mockToast = toast as jest.Mock;

const mockDesignData = {
  components: [
    { id: '1', type: 'button', props: { label: 'Submit' } },
    { id: '2', type: 'input', props: { placeholder: 'Enter text' } },
  ],
  connections: [
    { from: '1', to: '2', type: 'action' }
  ],
  loading: false,
  error: null,
};

const mockSaveDesign = jest.fn();
const mockExportDesign = jest.fn();

const renderComponent = (contextValue = {}) => {
  mockUseDesignData.mockReturnValue(mockDesignData);
  mockUseSaveDesign.mockReturnValue({ saveDesign: mockSaveDesign });
  mockUseExportDesign.mockReturnValue({ exportDesign: mockExportDesign });

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
    it('should render the design canvas with components', () => {
      renderComponent();

      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      expect(screen.getByText('Submit')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should show loading state when data is loading', () => {
      mockUseDesignData.mockReturnValue({ ...mockDesignData, loading: true });
      renderComponent();

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByText('Submit')).not.toBeInTheDocument();
    });

    it('should show error message when data fetch fails', () => {
      mockUseDesignData.mockReturnValue({
        ...mockDesignData,
        loading: false,
        error: 'Failed to load design'
      });
      renderComponent();

      expect(screen.getByText('Failed to load design')).toBeInTheDocument();
      expect(screen.queryByText('Submit')).not.toBeInTheDocument();
    });
  });

  describe('Component Interactions', () => {
    it('should allow dragging components on the canvas', async () => {
      renderComponent();

      const buttonComponent = screen.getByText('Submit');
      const canvas = screen.getByTestId('design-canvas');

      fireEvent.dragStart(buttonComponent);
      fireEvent.dragOver(canvas);
      fireEvent.drop(canvas);

      // Verify drag feedback was shown
      await waitFor(() => {
        expect(screen.getByTestId('drag-feedback')).toBeInTheDocument();
      });
    });

    it('should open component properties panel when clicking a component', async () => {
      renderComponent();

      const buttonComponent = screen.getByText('Submit');
      await userEvent.click(buttonComponent);

      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
      expect(screen.getByLabelText('Component Properties')).toBeInTheDocument();
    });

    it('should update component properties when edited', async () => {
      const mockUpdateComponent = jest.fn();
      renderComponent({ updateComponent: mockUpdateComponent });

      await userEvent.click(screen.getByText('Submit'));
      const labelInput = screen.getByLabelText('Button Label');

      await userEvent.clear(labelInput);
      await userEvent.type(labelInput, 'Click Me');

      expect(mockUpdateComponent).toHaveBeenCalledWith('1', {
        type: 'button',
        props: { label: 'Click Me' }
      });
    });

    it('should delete a component when delete button is clicked', async () => {
      const mockDeleteComponent = jest.fn();
      renderComponent({ deleteComponent: mockDeleteComponent });

      await userEvent.click(screen.getByText('Submit'));
      await userEvent.click(screen.getByLabelText('Delete Component'));

      expect(mockDeleteComponent).toHaveBeenCalledWith('1');
      expect(screen.queryByText('Submit')).not.toBeInTheDocument();
    });
  });

  describe('Connection Management', () => {
    it('should create a connection between components', async () => {
      const mockAddConnection = jest.fn();
      renderComponent({ addConnection: mockAddConnection });

      const button = screen.getByText('Submit');
      const input = screen.getByPlaceholderText('Enter text');

      // Simulate connection drag from button to input
      const buttonConnector = within(button).getByTestId('connector-out');
      const inputConnector = within(input).getByTestId('connector-in');

      fireEvent.dragStart(buttonConnector);
      fireEvent.dragOver(inputConnector);
      fireEvent.drop(inputConnector);

      await waitFor(() => {
        expect(mockAddConnection).toHaveBeenCalledWith({
          from: '1',
          to: '2',
          type: 'action'
        });
      });
    });

    it('should delete a connection when connection line is clicked', async () => {
      const mockDeleteConnection = jest.fn();
      renderComponent({ deleteConnection: mockDeleteConnection });

      const connectionLine = screen.getByTestId('connection-1-2');
      await userEvent.click(connectionLine);

      expect(mockDeleteConnection).toHaveBeenCalledWith('1', '2');
    });

    it('should show connection type selector when creating a connection', async () => {
      renderComponent();

      const buttonConnector = screen.getAllByTestId('connector-out')[0];
      fireEvent.dragStart(buttonConnector);

      await waitFor(() => {
        expect(screen.getByTestId('connection-type-selector')).toBeInTheDocument();
      });
    });
  });

  describe('Toolbar Actions', () => {
    it('should add a new component when toolbar button is clicked', async () => {
      const mockAddComponent = jest.fn();
      renderComponent({ addComponent: mockAddComponent });

      await userEvent.click(screen.getByLabelText('Add Button'));
      expect(mockAddComponent).toHaveBeenCalledWith({ type: 'button', props: {} });

      await userEvent.click(screen.getByLabelText('Add Input'));
      expect(mockAddComponent).toHaveBeenCalledWith({ type: 'input', props: {} });
    });

    it('should save the design when save button is clicked', async () => {
      mockSaveDesign.mockResolvedValue({ success: true });
      renderComponent();

      await userEvent.click(screen.getByLabelText('Save Design'));

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalledWith(mockDesignData);
        expect(mockToast).toHaveBeenCalledWith('Design saved successfully', {
          type: 'success'
        });
      });
    });

    it('should show error when save fails', async () => {
      mockSaveDesign.mockRejectedValue(new Error('Save failed'));
      renderComponent();

      await userEvent.click(screen.getByLabelText('Save Design'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Failed to save design', {
          type: 'error'
        });
      });
    });

    it('should export the design when export button is clicked', async () => {
      mockExportDesign.mockResolvedValue({ data: 'exported-data' });
      renderComponent();

      await userEvent.click(screen.getByLabelText('Export Design'));

      await waitFor(() => {
        expect(mockExportDesign).toHaveBeenCalledWith('1');
        expect(screen.getByText('Design exported successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderComponent();

      expect(screen.getByLabelText('Design Canvas')).toBeInTheDocument();
      expect(screen.getByLabelText('Add Button')).toBeInTheDocument();
      expect(screen.getByLabelText('Save Design')).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      await userEvent.tab();
      expect(screen.getByLabelText('Add Button')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText('Add Input')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText('Save Design')).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      renderComponent();

      const button = screen.getByText('Submit');
      const input = screen.getByPlaceholderText('Enter text');

      expect(button).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Assuming Material-UI typography
      expect(input).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
    });

    it('should announce loading states to screen readers', () => {
      mockUseDesignData.mockReturnValue({ ...mockDesignData, loading: true });
      renderComponent();

      expect(screen.getByText('Loading design...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design state', () => {
      mockUseDesignData.mockReturnValue({
        components: [],
        connections: [],
        loading: false,
        error: null
      });
      renderComponent();

      expect(screen.getByText('Your design is empty. Add components to get started.')).toBeInTheDocument();
      expect(screen.queryByTestId('connection-line')).not.toBeInTheDocument();
    });

    it('should prevent invalid connections', async () => {
      const mockAddConnection = jest.fn();
      renderComponent({ addConnection: mockAddConnection });

      // Try to connect a component to itself
      const buttonConnectorOut = screen.getAllByTestId('connector-out')[0];
      const buttonConnectorIn = screen.getAllByTestId('connector-in')[0];

      fireEvent.dragStart(buttonConnectorOut);
      fireEvent.dragOver(buttonConnectorIn);
      fireEvent.drop(buttonConnectorIn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Cannot connect a component to itself', {
          type: 'error'
        });
        expect(mockAddConnection).not.toHaveBeenCalled();
      });
    });

    it('should handle concurrent saves gracefully', async () => {
      let resolveFirstSave: (value: unknown) => void;
      mockSaveDesign.mockImplementation(() => new Promise(resolve => {
        resolveFirstSave = resolve;
      }));

      renderComponent();

      // First save
      userEvent.click(screen.getByLabelText('Save Design'));

      // Second save before first completes
      userEvent.click(screen.getByLabelText('Save Design'));

      // Resolve first save
      resolveFirstSave!({ success: true });
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Previous save still in progress', {
          type: 'warning'
        });
      });
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should undo the last action', async () => {
      const mockUndo = jest.fn();
      renderComponent({ undo: mockUndo });

      await userEvent.click(screen.getByLabelText('Undo'));
      expect(mockUndo).toHaveBeenCalled();
    });

    it('should redo the last undone action', async () => {
      const mockRedo = jest.fn();
      renderComponent({ redo: mockRedo });

      await userEvent.click(screen.getByLabelText('Redo'));
      expect(mockRedo).toHaveBeenCalled();
    });

    it('should disable undo/redo buttons when no history exists', () => {
      renderComponent({
        canUndo: false,
        canRedo: false
      });

      expect(screen.getByLabelText('Undo')).toBeDisabled();
      expect(screen.getByLabelText('Redo')).toBeDisabled();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust canvas size on window resize', () => {
      renderComponent();

      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      const canvas = screen.getByTestId('design-canvas');
      expect(canvas).toHaveStyle('width: 500px');
    });

    it('should show mobile warning on small screens', () => {
      global.innerWidth = 400;
      renderComponent();

      expect(screen.getByText('For best experience, use a larger screen')).toBeInTheDocument();
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
  useNavigate: () => jest.fn(),
}));

const mockUseDesignData = useDesignData as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseExportDesign = useExportDesign as jest.Mock;
const mockToast = toast as jest.Mock;

const mockDesignData = {
  components: [
    { id: '1', type: 'button', props: { label: 'Submit' } },
    { id: '2', type: 'input', props: { placeholder: 'Enter text' } },
  ],
  connections: [
    { from: '1', to: '2', type: 'action' }
  ],
  loading: false,
  error: null,
};

const mockSaveDesign = jest.fn();
const mockExportDesign = jest.fn();

const renderComponent = (contextValue = {}) => {
  mockUseDesignData.mockReturnValue(mockDesignData);
  mockUseSaveDesign.mockReturnValue({ saveDesign: mockSaveDesign });
  mockUseExportDesign.mockReturnValue({ exportDesign: mockExportDesign });

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
    it('should render the design canvas with components', () => {
      renderComponent();

      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      expect(screen.getByText('Submit')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should show loading state when data is loading', () => {
      mockUseDesignData.mockReturnValue({ ...mockDesignData, loading: true });
      renderComponent();

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByText('Submit')).not.toBeInTheDocument();
    });

    it('should show error message when data fetch fails', () => {
      mockUseDesignData.mockReturnValue({
        ...mockDesignData,
        loading: false,
        error: 'Failed to load design'
      });
      renderComponent();

      expect(screen.getByText('Failed to load design')).toBeInTheDocument();
      expect(screen.queryByText('Submit')).not.toBeInTheDocument();
    });
  });

  describe('Component Interactions', () => {
    it('should allow dragging components on the canvas', async () => {
      renderComponent();

      const buttonComponent = screen.getByText('Submit');
      const canvas = screen.getByTestId('design-canvas');

      fireEvent.dragStart(buttonComponent);
      fireEvent.dragOver(canvas);
      fireEvent.drop(canvas);

      // Verify drag feedback was shown
      await waitFor(() => {
        expect(screen.getByTestId('drag-feedback')).toBeInTheDocument();
      });
    });

    it('should open component properties panel when clicking a component', async () => {
      renderComponent();

      const buttonComponent = screen.getByText('Submit');
      await userEvent.click(buttonComponent);

      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
      expect(screen.getByLabelText('Component Properties')).toBeInTheDocument();
    });

    it('should update component properties when edited', async () => {
      const mockUpdateComponent = jest.fn();
      renderComponent({ updateComponent: mockUpdateComponent });

      await userEvent.click(screen.getByText('Submit'));
      const labelInput = screen.getByLabelText('Button Label');

      await userEvent.clear(labelInput);
      await userEvent.type(labelInput, 'Click Me');

      expect(mockUpdateComponent).toHaveBeenCalledWith('1', {
        type: 'button',
        props: { label: 'Click Me' }
      });
    });

    it('should delete a component when delete button is clicked', async () => {
      const mockDeleteComponent = jest.fn();
      renderComponent({ deleteComponent: mockDeleteComponent });

      await userEvent.click(screen.getByText('Submit'));
      await userEvent.click(screen.getByLabelText('Delete Component'));

      expect(mockDeleteComponent).toHaveBeenCalledWith('1');
      expect(screen.queryByText('Submit')).not.toBeInTheDocument();
    });
  });

  describe('Connection Management', () => {
    it('should create a connection between components', async () => {
      const mockAddConnection = jest.fn();
      renderComponent({ addConnection: mockAddConnection });

      const button = screen.getByText('Submit');
      const input = screen.getByPlaceholderText('Enter text');

      // Simulate connection drag from button to input
      const buttonConnector = within(button).getByTestId('connector-out');
      const inputConnector = within(input).getByTestId('connector-in');

      fireEvent.dragStart(buttonConnector);
      fireEvent.dragOver(inputConnector);
      fireEvent.drop(inputConnector);

      await waitFor(() => {
        expect(mockAddConnection).toHaveBeenCalledWith({
          from: '1',
          to: '2',
          type: 'action'
        });
      });
    });

    it('should delete a connection when connection line is clicked', async () => {
      const mockDeleteConnection = jest.fn();
      renderComponent({ deleteConnection: mockDeleteConnection });

      const connectionLine = screen.getByTestId('connection-1-2');
      await userEvent.click(connectionLine);

      expect(mockDeleteConnection).toHaveBeenCalledWith('1', '2');
    });

    it('should show connection type selector when creating a connection', async () => {
      renderComponent();

      const buttonConnector = screen.getAllByTestId('connector-out')[0];
      fireEvent.dragStart(buttonConnector);

      await waitFor(() => {
        expect(screen.getByTestId('connection-type-selector')).toBeInTheDocument();
      });
    });
  });

  describe('Toolbar Actions', () => {
    it('should add a new component when toolbar button is clicked', async () => {
      const mockAddComponent = jest.fn();
      renderComponent({ addComponent: mockAddComponent });

      await userEvent.click(screen.getByLabelText('Add Button'));
      expect(mockAddComponent).toHaveBeenCalledWith({ type: 'button', props: {} });

      await userEvent.click(screen.getByLabelText('Add Input'));
      expect(mockAddComponent).toHaveBeenCalledWith({ type: 'input', props: {} });
    });

    it('should save the design when save button is clicked', async () => {
      mockSaveDesign.mockResolvedValue({ success: true });
      renderComponent();

      await userEvent.click(screen.getByLabelText('Save Design'));

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalledWith(mockDesignData);
        expect(mockToast).toHaveBeenCalledWith('Design saved successfully', {
          type: 'success'
        });
      });
    });

    it('should show error when save fails', async () => {
      mockSaveDesign.mockRejectedValue(new Error('Save failed'));
      renderComponent();

      await userEvent.click(screen.getByLabelText('Save Design'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Failed to save design', {
          type: 'error'
        });
      });
    });

    it('should export the design when export button is clicked', async () => {
      mockExportDesign.mockResolvedValue({ data: 'exported-data' });
      renderComponent();

      await userEvent.click(screen.getByLabelText('Export Design'));

      await waitFor(() => {
        expect(mockExportDesign).toHaveBeenCalledWith('1');
        expect(screen.getByText('Design exported successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderComponent();

      expect(screen.getByLabelText('Design Canvas')).toBeInTheDocument();
      expect(screen.getByLabelText('Add Button')).toBeInTheDocument();
      expect(screen.getByLabelText('Save Design')).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      await userEvent.tab();
      expect(screen.getByLabelText('Add Button')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText('Add Input')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText('Save Design')).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      renderComponent();

      const button = screen.getByText('Submit');
      const input = screen.getByPlaceholderText('Enter text');

      expect(button).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Assuming Material-UI typography
      expect(input).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
    });

    it('should announce loading states to screen readers', () => {
      mockUseDesignData.mockReturnValue({ ...mockDesignData, loading: true });
      renderComponent();

      expect(screen.getByText('Loading design...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design state', () => {
      mockUseDesignData.mockReturnValue({
        components: [],
        connections: [],
        loading: false,
        error: null
      });
      renderComponent();

      expect(screen.getByText('Your design is empty. Add components to get started.')).toBeInTheDocument();
      expect(screen.queryByTestId('connection-line')).not.toBeInTheDocument();
    });

    it('should prevent invalid connections', async () => {
      const mockAddConnection = jest.fn();
      renderComponent({ addConnection: mockAddConnection });

      // Try to connect a component to itself
      const buttonConnectorOut = screen.getAllByTestId('connector-out')[0];
      const buttonConnectorIn = screen.getAllByTestId('connector-in')[0];

      fireEvent.dragStart(buttonConnectorOut);
      fireEvent.dragOver(buttonConnectorIn);
      fireEvent.drop(buttonConnectorIn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Cannot connect a component to itself', {
          type: 'error'
        });
        expect(mockAddConnection).not.toHaveBeenCalled();
      });
    });

    it('should handle concurrent saves gracefully', async () => {
      let resolveFirstSave: (value: unknown) => void;
      mockSaveDesign.mockImplementation(() => new Promise(resolve => {
        resolveFirstSave = resolve;
      }));

      renderComponent();

      // First save
      userEvent.click(screen.getByLabelText('Save Design'));

      // Second save before first completes
      userEvent.click(screen.getByLabelText('Save Design'));

      // Resolve first save
      resolveFirstSave!({ success: true });
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Previous save still in progress', {
          type: 'warning'
        });
      });
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should undo the last action', async () => {
      const mockUndo = jest.fn();
      renderComponent({ undo: mockUndo });

      await userEvent.click(screen.getByLabelText('Undo'));
      expect(mockUndo).toHaveBeenCalled();
    });

    it('should redo the last undone action', async () => {
      const mockRedo = jest.fn();
      renderComponent({ redo: mockRedo });

      await userEvent.click(screen.getByLabelText('Redo'));
      expect(mockRedo).toHaveBeenCalled();
    });

    it('should disable undo/redo buttons when no history exists', () => {
      renderComponent({
        canUndo: false,
        canRedo: false
      });

      expect(screen.getByLabelText('Undo')).toBeDisabled();
      expect(screen.getByLabelText('Redo')).toBeDisabled();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust canvas size on window resize', () => {
      renderComponent();

      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      const canvas = screen.getByTestId('design-canvas');
      expect(canvas).toHaveStyle('width: 500px');
    });

    it('should show mobile warning on small screens', () => {
      global.innerWidth = 400;
      renderComponent();

      expect(screen.getByText('For best experience, use a larger screen')).toBeInTheDocument();
    });
  });
});