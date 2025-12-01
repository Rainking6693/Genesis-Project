import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useFetchDesignData } from '../../hooks/useFetchDesignData';
import { useUpdateDesign } from '../../hooks/useUpdateDesign';
import { useDeleteComponent } from '../../hooks/useDeleteComponent';
import { useExportDesign } from '../../hooks/useExportDesign';
import { DesignData, ComponentType } from '../../types/designTypes';
import { axe } from 'jest-axe';

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
  name: 'E-commerce Dashboard',
  components: [
    { id: '1', type: ComponentType.Header, name: 'Main Header', position: { x: 0, y: 0 } },
    { id: '2', type: ComponentType.Sidebar, name: 'Navigation', position: { x: 0, y: 100 } },
    { id: '3', type: ComponentType.Content, name: 'Product Grid', position: { x: 200, y: 0 } },
  ],
  connections: [
    { from: '1', to: '2', type: 'data' },
    { from: '2', to: '3', type: 'navigation' },
  ],
  lastUpdated: '2023-05-15T10:00:00Z',
};

const mockError = new Error('Failed to fetch design data');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseFetchDesignData.mockReturnValue({
      data: null,
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
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading design architecture/i)).toBeInTheDocument();
    });

    it('should render error state when fetch fails', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load design data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the design architecture when data is loaded', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/e-commerce dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/main header/i)).toBeInTheDocument();
      expect(screen.getByText(/navigation/i)).toBeInTheDocument();
      expect(screen.getByText(/product grid/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it('should allow adding a new component', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText(/add new component/i)).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await user.type(nameInput, 'New Footer');
      await user.selectOptions(typeSelect, 'footer');
      await user.click(submitButton);

      expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({ name: 'New Footer', type: ComponentType.Footer })
          ])
        })
      );
    });

    it('should allow deleting a component', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockUseDeleteComponent().deleteComponent).toHaveBeenCalledWith('1');
    });

    it('should allow updating component position via drag and drop', async () => {
      render(<DesignArchitecture />);

      const component = screen.getByText(/main header/i).closest('.draggable-component');
      if (component) {
        fireEvent.dragStart(component);
        fireEvent.dragOver(component, { clientX: 100, clientY: 100 });
        fireEvent.dragEnd(component);

        await waitFor(() => {
          expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledWith(
            expect.objectContaining({
              components: expect.arrayContaining([
                expect.objectContaining({
                  id: '1',
                  position: expect.objectContaining({ x: 100, y: 100 })
                })
              ])
            })
          );
        });
      }
    });

    it('should allow creating connections between components', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const headerComponent = screen.getByText(/main header/i);
      const sidebarComponent = screen.getByText(/navigation/i);

      // Simulate connection start
      const connectButton = within(headerComponent.closest('.component-container')!).getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      // Simulate connection end
      await user.click(sidebarComponent);

      expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledWith(
        expect.objectContaining({
          connections: expect.arrayContaining([
            expect.objectContaining({
              from: '1',
              to: '2',
              type: expect.any(String)
            })
          ])
        })
      );
    });

    it('should allow exporting the design', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(mockUseExportDesign().exportDesign).toHaveBeenCalledWith('123');
      await waitFor(() => {
        expect(screen.getByText(/export successful/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when component addition fails', async () => {
      mockUseUpdateDesign.mockReturnValue({
        updateDesign: jest.fn().mockRejectedValue(new Error('Add failed')),
        isUpdating: false,
        error: new Error('Add failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await user.type(nameInput, 'New Footer');
      await user.selectOptions(typeSelect, 'footer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to add component/i)).toBeInTheDocument();
      });
    });

    it('should show error when component deletion fails', async () => {
      mockUseDeleteComponent.mockReturnValue({
        deleteComponent: jest.fn().mockRejectedValue(new Error('Delete failed')),
        isDeleting: false,
        error: new Error('Delete failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete component/i)).toBeInTheDocument();
      });
    });

    it('should show error when export fails', async () => {
      mockUseExportDesign.mockReturnValue({
        exportDesign: jest.fn().mockRejectedValue(new Error('Export failed')),
        isExporting: false,
        error: new Error('Export failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to export design/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator when adding component', async () => {
      mockUseUpdateDesign.mockReturnValue({
        updateDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isUpdating: true,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await user.type(nameInput, 'New Footer');
      await user.selectOptions(typeSelect, 'footer');
      await user.click(submitButton);

      expect(screen.getByText(/adding component/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should show loading indicator when deleting component', async () => {
      mockUseDeleteComponent.mockReturnValue({
        deleteComponent: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isDeleting: true,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(screen.getByText(/deleting component/i)).toBeInTheDocument();
      expect(confirmButton).toBeDisabled();
    });

    it('should show loading indicator when exporting design', async () => {
      mockUseExportDesign.mockReturnValue({
        exportDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true, url: 'http://example.com/export' }), 100))),
        isExporting: true,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(screen.getByText(/preparing export/i)).toBeInTheDocument();
      expect(exportButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { container } = render(<DesignArchitecture />);
      const results = await axe(container);

      expect(results).toHaveNoViolations();
    });

    it('should have proper aria labels for interactive elements', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      expect(addButton).toHaveAttribute('aria-label', 'Add new component');

      const exportButton = screen.getByRole('button', { name: /export/i });
      expect(exportButton).toHaveAttribute('aria-label', 'Export design');

      const components = screen.getAllByRole('article');
      components.forEach(component => {
        expect(component).toHaveAttribute('aria-label', expect.stringMatching(/component/i));
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /add component/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /export/i })).toHaveFocus();

      await user.tab();
      expect(screen.getAllByRole('button', { name: /delete/i })[0]).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design data', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: {
          id: '123',
          name: 'Empty Design',
          components: [],
          connections: [],
          lastUpdated: '2023-05-15T10:00:00Z',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no components found/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first component/i)).toBeInTheDocument();
    });

    it('should prevent circular connections', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      // Try to create a circular connection (1 -> 2 -> 3 -> 1)
      const component1 = screen.getByText(/main header/i);
      const component3 = screen.getByText(/product grid/i);

      const connectButton = within(component3.closest('.component-container')!).getByRole('button', { name: /connect/i });
      await user.click(connectButton);
      await user.click(component1);

      await waitFor(() => {
        expect(screen.getByText(/circular connection detected/i)).toBeInTheDocument();
      });
      expect(mockUseUpdateDesign().updateDesign).not.toHaveBeenCalled();
    });

    it('should handle component name conflicts', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await user.type(nameInput, 'Main Header'); // Duplicate name
      await user.selectOptions(typeSelect, 'footer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/component name already exists/i)).toBeInTheDocument();
      });
      expect(mockUseUpdateDesign().updateDesign).not.toHaveBeenCalled();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useFetchDesignData } from '../../hooks/useFetchDesignData';
import { useUpdateDesign } from '../../hooks/useUpdateDesign';
import { useDeleteComponent } from '../../hooks/useDeleteComponent';
import { useExportDesign } from '../../hooks/useExportDesign';
import { DesignData, ComponentType } from '../../types/designTypes';
import { axe } from 'jest-axe';

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
  name: 'E-commerce Dashboard',
  components: [
    { id: '1', type: ComponentType.Header, name: 'Main Header', position: { x: 0, y: 0 } },
    { id: '2', type: ComponentType.Sidebar, name: 'Navigation', position: { x: 0, y: 100 } },
    { id: '3', type: ComponentType.Content, name: 'Product Grid', position: { x: 200, y: 0 } },
  ],
  connections: [
    { from: '1', to: '2', type: 'data' },
    { from: '2', to: '3', type: 'navigation' },
  ],
  lastUpdated: '2023-05-15T10:00:00Z',
};

const mockError = new Error('Failed to fetch design data');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseFetchDesignData.mockReturnValue({
      data: null,
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
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading design architecture/i)).toBeInTheDocument();
    });

    it('should render error state when fetch fails', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load design data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the design architecture when data is loaded', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/e-commerce dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/main header/i)).toBeInTheDocument();
      expect(screen.getByText(/navigation/i)).toBeInTheDocument();
      expect(screen.getByText(/product grid/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it('should allow adding a new component', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText(/add new component/i)).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await user.type(nameInput, 'New Footer');
      await user.selectOptions(typeSelect, 'footer');
      await user.click(submitButton);

      expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({ name: 'New Footer', type: ComponentType.Footer })
          ])
        })
      );
    });

    it('should allow deleting a component', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockUseDeleteComponent().deleteComponent).toHaveBeenCalledWith('1');
    });

    it('should allow updating component position via drag and drop', async () => {
      render(<DesignArchitecture />);

      const component = screen.getByText(/main header/i).closest('.draggable-component');
      if (component) {
        fireEvent.dragStart(component);
        fireEvent.dragOver(component, { clientX: 100, clientY: 100 });
        fireEvent.dragEnd(component);

        await waitFor(() => {
          expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledWith(
            expect.objectContaining({
              components: expect.arrayContaining([
                expect.objectContaining({
                  id: '1',
                  position: expect.objectContaining({ x: 100, y: 100 })
                })
              ])
            })
          );
        });
      }
    });

    it('should allow creating connections between components', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const headerComponent = screen.getByText(/main header/i);
      const sidebarComponent = screen.getByText(/navigation/i);

      // Simulate connection start
      const connectButton = within(headerComponent.closest('.component-container')!).getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      // Simulate connection end
      await user.click(sidebarComponent);

      expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledWith(
        expect.objectContaining({
          connections: expect.arrayContaining([
            expect.objectContaining({
              from: '1',
              to: '2',
              type: expect.any(String)
            })
          ])
        })
      );
    });

    it('should allow exporting the design', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(mockUseExportDesign().exportDesign).toHaveBeenCalledWith('123');
      await waitFor(() => {
        expect(screen.getByText(/export successful/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when component addition fails', async () => {
      mockUseUpdateDesign.mockReturnValue({
        updateDesign: jest.fn().mockRejectedValue(new Error('Add failed')),
        isUpdating: false,
        error: new Error('Add failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await user.type(nameInput, 'New Footer');
      await user.selectOptions(typeSelect, 'footer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to add component/i)).toBeInTheDocument();
      });
    });

    it('should show error when component deletion fails', async () => {
      mockUseDeleteComponent.mockReturnValue({
        deleteComponent: jest.fn().mockRejectedValue(new Error('Delete failed')),
        isDeleting: false,
        error: new Error('Delete failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete component/i)).toBeInTheDocument();
      });
    });

    it('should show error when export fails', async () => {
      mockUseExportDesign.mockReturnValue({
        exportDesign: jest.fn().mockRejectedValue(new Error('Export failed')),
        isExporting: false,
        error: new Error('Export failed'),
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to export design/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator when adding component', async () => {
      mockUseUpdateDesign.mockReturnValue({
        updateDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isUpdating: true,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await user.type(nameInput, 'New Footer');
      await user.selectOptions(typeSelect, 'footer');
      await user.click(submitButton);

      expect(screen.getByText(/adding component/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should show loading indicator when deleting component', async () => {
      mockUseDeleteComponent.mockReturnValue({
        deleteComponent: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isDeleting: true,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(screen.getByText(/deleting component/i)).toBeInTheDocument();
      expect(confirmButton).toBeDisabled();
    });

    it('should show loading indicator when exporting design', async () => {
      mockUseExportDesign.mockReturnValue({
        exportDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true, url: 'http://example.com/export' }), 100))),
        isExporting: true,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(screen.getByText(/preparing export/i)).toBeInTheDocument();
      expect(exportButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { container } = render(<DesignArchitecture />);
      const results = await axe(container);

      expect(results).toHaveNoViolations();
    });

    it('should have proper aria labels for interactive elements', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      expect(addButton).toHaveAttribute('aria-label', 'Add new component');

      const exportButton = screen.getByRole('button', { name: /export/i });
      expect(exportButton).toHaveAttribute('aria-label', 'Export design');

      const components = screen.getAllByRole('article');
      components.forEach(component => {
        expect(component).toHaveAttribute('aria-label', expect.stringMatching(/component/i));
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /add component/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /export/i })).toHaveFocus();

      await user.tab();
      expect(screen.getAllByRole('button', { name: /delete/i })[0]).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design data', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: {
          id: '123',
          name: 'Empty Design',
          components: [],
          connections: [],
          lastUpdated: '2023-05-15T10:00:00Z',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no components found/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first component/i)).toBeInTheDocument();
    });

    it('should prevent circular connections', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      // Try to create a circular connection (1 -> 2 -> 3 -> 1)
      const component1 = screen.getByText(/main header/i);
      const component3 = screen.getByText(/product grid/i);

      const connectButton = within(component3.closest('.component-container')!).getByRole('button', { name: /connect/i });
      await user.click(connectButton);
      await user.click(component1);

      await waitFor(() => {
        expect(screen.getByText(/circular connection detected/i)).toBeInTheDocument();
      });
      expect(mockUseUpdateDesign().updateDesign).not.toHaveBeenCalled();
    });

    it('should handle component name conflicts', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await user.type(nameInput, 'Main Header'); // Duplicate name
      await user.selectOptions(typeSelect, 'footer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/component name already exists/i)).toBeInTheDocument();
      });
      expect(mockUseUpdateDesign().updateDesign).not.toHaveBeenCalled();
    });
  });
});