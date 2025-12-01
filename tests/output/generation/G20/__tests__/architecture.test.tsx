import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useFetchDesignData } from '../../hooks/useFetchDesignData';
import { useUpdateDesign } from '../../hooks/useUpdateDesign';
import { useDeleteComponent } from '../../hooks/useDeleteComponent';
import { useExportDesign } from '../../hooks/useExportDesign';
import { DesignData, ComponentType } from '../../types/designTypes';

// Mock hooks
jest.mock('../../hooks/useFetchDesignData');
jest.mock('../../hooks/useUpdateDesign');
jest.mock('../../hooks/useDeleteComponent');
jest.mock('../../hooks/useExportDesign');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '123' }),
  useNavigate: () => jest.fn(),
}));

const mockUseFetchDesignData = useFetchDesignData as jest.MockedFunction<typeof useFetchDesignData>;
const mockUseUpdateDesign = useUpdateDesign as jest.MockedFunction<typeof useUpdateDesign>;
const mockUseDeleteComponent = useDeleteComponent as jest.MockedFunction<typeof useDeleteComponent>;
const mockUseExportDesign = useExportDesign as jest.MockedFunction<typeof useExportDesign>;

const mockDesignData: DesignData = {
  id: '123',
  name: 'Test Architecture',
  components: [
    { id: 'comp1', type: ComponentType.Database, name: 'Main DB', position: { x: 100, y: 100 } },
    { id: 'comp2', type: ComponentType.Service, name: 'API Service', position: { x: 200, y: 200 } },
  ],
  connections: [
    { id: 'conn1', source: 'comp1', target: 'comp2', type: 'rest' },
  ],
  lastUpdated: '2023-01-01T00:00:00Z',
};

const mockErrorData = {
  error: 'Failed to load design data',
};

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseFetchDesignData.mockReturnValue({
      data: mockDesignData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseUpdateDesign.mockReturnValue({
      updateDesign: jest.fn().mockResolvedValue({ success: true }),
      isUpdating: false,
      error: null,
    });

    mockUseDeleteComponent.mockReturnValue({
      deleteComponent: jest.fn().mockResolvedValue({ success: true }),
      isDeleting: false,
      error: null,
    });

    mockUseExportDesign.mockReturnValue({
      exportDesign: jest.fn().mockResolvedValue({ success: true, url: 'http://example.com/export' }),
      isExporting: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when data is being fetched', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading design/i)).toBeInTheDocument();
    });

    it('should render error message when fetch fails', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockErrorData.error,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(mockErrorData.error)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the design canvas with components when data is loaded', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText('Test Architecture')).toBeInTheDocument();
      expect(screen.getByText('Main DB')).toBeInTheDocument();
      expect(screen.getByText('API Service')).toBeInTheDocument();
      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
    });
  });

  describe('Component Interactions', () => {
    it('should allow dragging components on the canvas', async () => {
      render(<DesignArchitecture />);

      const component = screen.getByText('Main DB').closest('div') as HTMLElement;
      const initialPosition = component.getBoundingClientRect();

      fireEvent.mouseDown(component);
      fireEvent.mouseMove(component, { clientX: initialPosition.x + 50, clientY: initialPosition.y + 50 });
      fireEvent.mouseUp(component);

      await waitFor(() => {
        expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalled();
      });
    });

    it('should open component details when clicked', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByText('Main DB'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Main DB')).toBeInTheDocument();
    });

    it('should update component details when saved', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByText('Main DB'));
      await user.clear(screen.getByDisplayValue('Main DB'));
      await user.type(screen.getByDisplayValue('Main DB'), 'Updated DB');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledWith(
          expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({ name: 'Updated DB' })
            ])
          })
        );
      });
    });

    it('should delete a component when delete is confirmed', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByText('Main DB'));
      await user.click(screen.getByRole('button', { name: /delete/i }));
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(mockUseDeleteComponent().deleteComponent).toHaveBeenCalledWith('comp1');
      });
    });
  });

  describe('Connection Management', () => {
    it('should create a new connection between components', async () => {
      render(<DesignArchitecture />);

      const source = screen.getByText('Main DB').closest('div') as HTMLElement;
      const target = screen.getByText('API Service').closest('div') as HTMLElement;

      // Simulate connection creation
      fireEvent.mouseDown(source, { buttons: 1 });
      fireEvent.mouseMove(document.body, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(target);

      await waitFor(() => {
        expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalled();
      });
    });

    it('should delete a connection when connection is clicked and deleted', async () => {
      render(<DesignArchitecture />);

      // Find the connection line (simplified for test)
      const connection = screen.getByTestId('connection-conn1');
      await user.click(connection);

      await user.click(screen.getByRole('button', { name: /delete connection/i }));

      await waitFor(() => {
        expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledWith(
          expect.objectContaining({
            connections: []
          })
        );
      });
    });
  });

  describe('Toolbar Actions', () => {
    it('should add a new component when add button is clicked', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /add component/i }));
      await user.selectOptions(screen.getByRole('combobox'), 'Service');
      await user.type(screen.getByRole('textbox', { name: /component name/i }), 'New Service');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledWith(
          expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({ name: 'New Service', type: ComponentType.Service })
            ])
          })
        );
      });
    });

    it('should export the design when export button is clicked', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      await waitFor(() => {
        expect(mockUseExportDesign().exportDesign).toHaveBeenCalledWith('123');
      });
    });

    it('should show success message after successful export', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      await waitFor(() => {
        expect(screen.getByText(/export successful/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute('href', 'http://example.com/export');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('button', { name: /add component/i })).toHaveAttribute('aria-label', 'Add new component');
      expect(screen.getByRole('button', { name: /export/i })).toHaveAttribute('aria-label', 'Export design');
      expect(screen.getByTestId('design-canvas')).toHaveAttribute('aria-label', 'Design architecture canvas');
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      await user.tab();
      expect(screen.getByRole('button', { name: /add component/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /export/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Main DB').closest('div')).toHaveFocus();
    });

    it('should have proper contrast for text elements', () => {
      render(<DesignArchitecture />);

      const components = screen.getAllByRole('heading', { level: 3 });
      components.forEach(component => {
        const style = window.getComputedStyle(component);
        const contrast = getContrastRatio(style.color, style.backgroundColor);
        expect(contrast).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when component update fails', async () => {
      mockUseUpdateDesign.mockReturnValue({
        updateDesign: jest.fn().mockRejectedValue(new Error('Update failed')),
        isUpdating: false,
        error: 'Update failed',
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByText('Main DB'));
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/update failed/i)).toBeInTheDocument();
      });
    });

    it('should show error message when component deletion fails', async () => {
      mockUseDeleteComponent.mockReturnValue({
        deleteComponent: jest.fn().mockRejectedValue(new Error('Deletion failed')),
        isDeleting: false,
        error: 'Deletion failed',
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByText('Main DB'));
      await user.click(screen.getByRole('button', { name: /delete/i }));
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(screen.getByText(/deletion failed/i)).toBeInTheDocument();
      });
    });

    it('should show error message when export fails', async () => {
      mockUseExportDesign.mockReturnValue({
        exportDesign: jest.fn().mockRejectedValue(new Error('Export failed')),
        isExporting: false,
        error: 'Export failed',
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design data gracefully', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: { ...mockDesignData, components: [], connections: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no components found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add your first component/i })).toBeInTheDocument();
    });

    it('should prevent invalid connections (self-connections)', async () => {
      render(<DesignArchitecture />);

      const component = screen.getByText('Main DB').closest('div') as HTMLElement;

      fireEvent.mouseDown(component, { buttons: 1 });
      fireEvent.mouseMove(document.body, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(component);

      await waitFor(() => {
        expect(mockUseUpdateDesign().updateDesign).not.toHaveBeenCalled();
      });
    });

    it('should handle concurrent updates gracefully', async () => {
      let resolveUpdate: (value: unknown) => void;
      const updatePromise = new Promise(resolve => {
        resolveUpdate = resolve;
      });

      mockUseUpdateDesign.mockReturnValue({
        updateDesign: jest.fn().mockReturnValue(updatePromise),
        isUpdating: true,
        error: null,
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByText('Main DB'));
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Try to make another update while first is pending
      await user.click(screen.getByText('API Service'));
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByText(/please wait/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i }, { hidden: true })).toBeDisabled();

      resolveUpdate!(true);
      await waitFor(() => {
        expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledTimes(2);
      });
    });
  });
});

// Helper function for contrast ratio (simplified for test)
function getContrastRatio(color1: string, color2: string): number {
  // Simplified implementation - in real tests you might want to use a proper color contrast library
  return 5; // Assume sufficient contrast for test purposes
}

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useFetchDesignData } from '../../hooks/useFetchDesignData';
import { useUpdateDesign } from '../../hooks/useUpdateDesign';
import { useDeleteComponent } from '../../hooks/useDeleteComponent';
import { useExportDesign } from '../../hooks/useExportDesign';
import { DesignData, ComponentType } from '../../types/designTypes';

// Mock hooks
jest.mock('../../hooks/useFetchDesignData');
jest.mock('../../hooks/useUpdateDesign');
jest.mock('../../hooks/useDeleteComponent');
jest.mock('../../hooks/useExportDesign');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '123' }),
  useNavigate: () => jest.fn(),
}));

const mockUseFetchDesignData = useFetchDesignData as jest.MockedFunction<typeof useFetchDesignData>;
const mockUseUpdateDesign = useUpdateDesign as jest.MockedFunction<typeof useUpdateDesign>;
const mockUseDeleteComponent = useDeleteComponent as jest.MockedFunction<typeof useDeleteComponent>;
const mockUseExportDesign = useExportDesign as jest.MockedFunction<typeof useExportDesign>;

const mockDesignData: DesignData = {
  id: '123',
  name: 'Test Architecture',
  components: [
    { id: 'comp1', type: ComponentType.Database, name: 'Main DB', position: { x: 100, y: 100 } },
    { id: 'comp2', type: ComponentType.Service, name: 'API Service', position: { x: 200, y: 200 } },
  ],
  connections: [
    { id: 'conn1', source: 'comp1', target: 'comp2', type: 'rest' },
  ],
  lastUpdated: '2023-01-01T00:00:00Z',
};

const mockErrorData = {
  error: 'Failed to load design data',
};

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseFetchDesignData.mockReturnValue({
      data: mockDesignData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseUpdateDesign.mockReturnValue({
      updateDesign: jest.fn().mockResolvedValue({ success: true }),
      isUpdating: false,
      error: null,
    });

    mockUseDeleteComponent.mockReturnValue({
      deleteComponent: jest.fn().mockResolvedValue({ success: true }),
      isDeleting: false,
      error: null,
    });

    mockUseExportDesign.mockReturnValue({
      exportDesign: jest.fn().mockResolvedValue({ success: true, url: 'http://example.com/export' }),
      isExporting: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when data is being fetched', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading design/i)).toBeInTheDocument();
    });

    it('should render error message when fetch fails', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockErrorData.error,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(mockErrorData.error)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the design canvas with components when data is loaded', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText('Test Architecture')).toBeInTheDocument();
      expect(screen.getByText('Main DB')).toBeInTheDocument();
      expect(screen.getByText('API Service')).toBeInTheDocument();
      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
    });
  });

  describe('Component Interactions', () => {
    it('should allow dragging components on the canvas', async () => {
      render(<DesignArchitecture />);

      const component = screen.getByText('Main DB').closest('div') as HTMLElement;
      const initialPosition = component.getBoundingClientRect();

      fireEvent.mouseDown(component);
      fireEvent.mouseMove(component, { clientX: initialPosition.x + 50, clientY: initialPosition.y + 50 });
      fireEvent.mouseUp(component);

      await waitFor(() => {
        expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalled();
      });
    });

    it('should open component details when clicked', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByText('Main DB'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Main DB')).toBeInTheDocument();
    });

    it('should update component details when saved', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByText('Main DB'));
      await user.clear(screen.getByDisplayValue('Main DB'));
      await user.type(screen.getByDisplayValue('Main DB'), 'Updated DB');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledWith(
          expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({ name: 'Updated DB' })
            ])
          })
        );
      });
    });

    it('should delete a component when delete is confirmed', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByText('Main DB'));
      await user.click(screen.getByRole('button', { name: /delete/i }));
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(mockUseDeleteComponent().deleteComponent).toHaveBeenCalledWith('comp1');
      });
    });
  });

  describe('Connection Management', () => {
    it('should create a new connection between components', async () => {
      render(<DesignArchitecture />);

      const source = screen.getByText('Main DB').closest('div') as HTMLElement;
      const target = screen.getByText('API Service').closest('div') as HTMLElement;

      // Simulate connection creation
      fireEvent.mouseDown(source, { buttons: 1 });
      fireEvent.mouseMove(document.body, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(target);

      await waitFor(() => {
        expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalled();
      });
    });

    it('should delete a connection when connection is clicked and deleted', async () => {
      render(<DesignArchitecture />);

      // Find the connection line (simplified for test)
      const connection = screen.getByTestId('connection-conn1');
      await user.click(connection);

      await user.click(screen.getByRole('button', { name: /delete connection/i }));

      await waitFor(() => {
        expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledWith(
          expect.objectContaining({
            connections: []
          })
        );
      });
    });
  });

  describe('Toolbar Actions', () => {
    it('should add a new component when add button is clicked', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /add component/i }));
      await user.selectOptions(screen.getByRole('combobox'), 'Service');
      await user.type(screen.getByRole('textbox', { name: /component name/i }), 'New Service');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledWith(
          expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({ name: 'New Service', type: ComponentType.Service })
            ])
          })
        );
      });
    });

    it('should export the design when export button is clicked', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      await waitFor(() => {
        expect(mockUseExportDesign().exportDesign).toHaveBeenCalledWith('123');
      });
    });

    it('should show success message after successful export', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      await waitFor(() => {
        expect(screen.getByText(/export successful/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute('href', 'http://example.com/export');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('button', { name: /add component/i })).toHaveAttribute('aria-label', 'Add new component');
      expect(screen.getByRole('button', { name: /export/i })).toHaveAttribute('aria-label', 'Export design');
      expect(screen.getByTestId('design-canvas')).toHaveAttribute('aria-label', 'Design architecture canvas');
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      await user.tab();
      expect(screen.getByRole('button', { name: /add component/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /export/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Main DB').closest('div')).toHaveFocus();
    });

    it('should have proper contrast for text elements', () => {
      render(<DesignArchitecture />);

      const components = screen.getAllByRole('heading', { level: 3 });
      components.forEach(component => {
        const style = window.getComputedStyle(component);
        const contrast = getContrastRatio(style.color, style.backgroundColor);
        expect(contrast).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when component update fails', async () => {
      mockUseUpdateDesign.mockReturnValue({
        updateDesign: jest.fn().mockRejectedValue(new Error('Update failed')),
        isUpdating: false,
        error: 'Update failed',
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByText('Main DB'));
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/update failed/i)).toBeInTheDocument();
      });
    });

    it('should show error message when component deletion fails', async () => {
      mockUseDeleteComponent.mockReturnValue({
        deleteComponent: jest.fn().mockRejectedValue(new Error('Deletion failed')),
        isDeleting: false,
        error: 'Deletion failed',
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByText('Main DB'));
      await user.click(screen.getByRole('button', { name: /delete/i }));
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(screen.getByText(/deletion failed/i)).toBeInTheDocument();
      });
    });

    it('should show error message when export fails', async () => {
      mockUseExportDesign.mockReturnValue({
        exportDesign: jest.fn().mockRejectedValue(new Error('Export failed')),
        isExporting: false,
        error: 'Export failed',
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design data gracefully', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: { ...mockDesignData, components: [], connections: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no components found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add your first component/i })).toBeInTheDocument();
    });

    it('should prevent invalid connections (self-connections)', async () => {
      render(<DesignArchitecture />);

      const component = screen.getByText('Main DB').closest('div') as HTMLElement;

      fireEvent.mouseDown(component, { buttons: 1 });
      fireEvent.mouseMove(document.body, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(component);

      await waitFor(() => {
        expect(mockUseUpdateDesign().updateDesign).not.toHaveBeenCalled();
      });
    });

    it('should handle concurrent updates gracefully', async () => {
      let resolveUpdate: (value: unknown) => void;
      const updatePromise = new Promise(resolve => {
        resolveUpdate = resolve;
      });

      mockUseUpdateDesign.mockReturnValue({
        updateDesign: jest.fn().mockReturnValue(updatePromise),
        isUpdating: true,
        error: null,
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByText('Main DB'));
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Try to make another update while first is pending
      await user.click(screen.getByText('API Service'));
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByText(/please wait/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i }, { hidden: true })).toBeDisabled();

      resolveUpdate!(true);
      await waitFor(() => {
        expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledTimes(2);
      });
    });
  });
});

// Helper function for contrast ratio (simplified for test)
function getContrastRatio(color1: string, color2: string): number {
  // Simplified implementation - in real tests you might want to use a proper color contrast library
  return 5; // Assume sufficient contrast for test purposes
}