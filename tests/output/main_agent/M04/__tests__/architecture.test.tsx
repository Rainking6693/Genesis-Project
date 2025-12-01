import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData, useSaveDesign, useExportDesign } from '../../hooks/designHooks';
import { DesignContext } from '../../context/DesignContext';
import { mockArchitectureData } from '../../mocks/designMocks';
import { act } from 'react-dom/test-utils';

// Mock hooks
jest.mock('../../hooks/designHooks');
jest.mock('../../context/DesignContext', () => ({
  ...jest.requireActual('../../context/DesignContext'),
  useDesignContext: jest.fn(),
}));

const mockUseDesignContext = useDesignContext as jest.Mock;
const mockUseDesignData = useDesignData as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseExportDesign = useExportDesign as jest.Mock;

const renderComponent = (overrides = {}) => {
  const defaultProps = {
    projectId: 'proj-123',
    onClose: jest.fn(),
    ...overrides,
  };

  return render(<DesignArchitecture {...defaultProps} />);
};

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseDesignContext.mockReturnValue({
      currentDesign: null,
      setCurrentDesign: jest.fn(),
      isReadOnly: false,
    });

    mockUseDesignData.mockReturnValue({
      data: mockArchitectureData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseSaveDesign.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
      error: null,
      isSuccess: false,
    });

    mockUseExportDesign.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
      error: null,
      isSuccess: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should display loading skeleton when data is loading', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      renderComponent();
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should display error message when data fetch fails', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: { message: 'Failed to load design' },
        refetch: jest.fn(),
      });

      renderComponent();
      expect(screen.getByText(/failed to load design/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the architecture diagram when data is available', () => {
      renderComponent();
      expect(screen.getByTestId('architecture-diagram')).toBeInTheDocument();
      expect(screen.getByText(mockArchitectureData.name)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow adding a new component to the architecture', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const saveButton = within(modal).getByRole('button', { name: /save/i });

      await user.type(nameInput, 'New Service');
      await user.selectOptions(typeSelect, 'service');
      await user.click(saveButton);

      expect(mockUseSaveDesign().mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({ name: 'New Service', type: 'service' })
          ])
        })
      );
    });

    it('should allow connecting two components', async () => {
      renderComponent();

      const sourceComponent = screen.getByText(/api gateway/i);
      const targetComponent = screen.getByText(/auth service/i);

      // Simulate drag and drop connection
      fireEvent.dragStart(sourceComponent);
      fireEvent.dragEnter(targetComponent);
      fireEvent.dragOver(targetComponent);
      fireEvent.drop(targetComponent);

      await waitFor(() => {
        expect(mockUseSaveDesign().mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            connections: expect.arrayContaining([
              expect.objectContaining({
                source: expect.any(String),
                target: expect.any(String)
              })
            ])
          })
        );
      });
    });

    it('should allow deleting a component', async () => {
      renderComponent();

      const component = screen.getByText(/database/i);
      const deleteButton = within(component.closest('.component-node')!).getByRole('button', { name: /delete/i });

      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockUseSaveDesign().mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.not.arrayContaining([
            expect.objectContaining({ name: 'Database' })
          ])
        })
      );
    });

    it('should handle component configuration changes', async () => {
      renderComponent();

      const component = screen.getByText(/auth service/i);
      await user.click(component);

      const configPanel = screen.getByTestId('component-config-panel');
      expect(configPanel).toBeInTheDocument();

      const replicaInput = within(configPanel).getByLabelText(/replicas/i);
      await user.clear(replicaInput);
      await user.type(replicaInput, '3');

      const saveConfigButton = within(configPanel).getByRole('button', { name: /save config/i });
      await user.click(saveConfigButton);

      expect(mockUseSaveDesign().mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({
              name: 'Auth Service',
              config: expect.objectContaining({ replicas: 3 })
            })
          ])
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should display error when saving fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        mutate: jest.fn(),
        isLoading: false,
        error: { message: 'Save failed' },
        isSuccess: false,
      });

      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const saveButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(await screen.findByText(/save failed/i)).toBeInTheDocument();
    });

    it('should prevent invalid component connections', async () => {
      renderComponent();

      // Try to connect a component to itself
      const component = screen.getByText(/api gateway/i);

      fireEvent.dragStart(component);
      fireEvent.dragEnter(component);
      fireEvent.dragOver(component);
      fireEvent.drop(component);

      expect(await screen.findByText(/cannot connect to itself/i)).toBeInTheDocument();
      expect(mockUseSaveDesign().mutate).not.toHaveBeenCalled();
    });

    it('should handle empty component name validation', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const saveButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
      expect(mockUseSaveDesign().mutate).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator during save operation', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        mutate: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200))),
        isLoading: true,
        error: null,
        isSuccess: false,
      });

      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const saveButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should disable interactions during export', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        mutate: jest.fn(),
        isLoading: true,
        error: null,
        isSuccess: false,
      });

      renderComponent();

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(screen.getByRole('button', { name: /add component/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for diagram elements', () => {
      renderComponent();

      const components = screen.getAllByRole('article');
      expect(components.length).toBeGreaterThan(0);

      components.forEach(component => {
        expect(component).toHaveAttribute('aria-label');
        expect(component).toHaveAttribute('tabindex', '0');
      });
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      const firstComponent = screen.getByText(/api gateway/i);
      firstComponent.focus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByText(/auth service/i)).toHaveFocus();

      await user.keyboard('{ArrowLeft}');
      expect(firstComponent).toHaveFocus();
    });

    it('should have proper contrast ratios for all interactive elements', () => {
      renderComponent();

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const style = window.getComputedStyle(button);
        const color = style.color;
        const backgroundColor = style.backgroundColor;

        // This is a simplified check - in real tests you'd use a proper contrast checking library
        expect(color).not.toBe(backgroundColor);
      });
    });

    it('should announce changes to screen readers', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture state', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: { ...mockArchitectureData, components: [], connections: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderComponent();
      expect(screen.getByText(/no components added yet/i)).toBeInTheDocument();
    });

    it('should prevent duplicate component names', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const saveButton = within(modal).getByRole('button', { name: /save/i });

      await user.type(nameInput, 'API Gateway');
      await user.click(saveButton);

      expect(await screen.findByText(/name must be unique/i)).toBeInTheDocument();
      expect(mockUseSaveDesign().mutate).not.toHaveBeenCalled();
    });

    it('should handle very large architecture diagrams with virtualization', async () => {
      const largeData = {
        ...mockArchitectureData,
        components: Array.from({ length: 100 }, (_, i) => ({
          id: `comp-${i}`,
          name: `Component ${i}`,
          type: 'service',
          position: { x: i * 50, y: i * 30 }
        })),
        connections: []
      };

      mockUseDesignData.mockReturnValueOnce({
        data: largeData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderComponent();

      // Verify virtualization is working by checking only visible components are rendered
      const renderedComponents = screen.getAllByRole('article');
      expect(renderedComponents.length).toBeLessThan(100);
      expect(renderedComponents.length).toBeGreaterThan(0);
    });

    it('should maintain state when switching between read-only and edit modes', async () => {
      const { rerender } = renderComponent();

      // Add a component in edit mode
      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      await user.type(nameInput, 'New Component');
      await user.click(within(modal).getByRole('button', { name: /save/i }));

      // Switch to read-only mode
      mockUseDesignContext.mockReturnValueOnce({
        currentDesign: null,
        setCurrentDesign: jest.fn(),
        isReadOnly: true,
      });

      rerender(<DesignArchitecture projectId="proj-123" />);

      // Verify component is still visible but controls are disabled
      expect(screen.getByText('New Component')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add component/i })).not.toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should allow exporting the architecture in different formats', async () => {
      renderComponent();

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      const menu = screen.getByRole('menu');
      const pdfOption = within(menu).getByRole('menuitem', { name: /pdf/i });
      const jsonOption = within(menu).getByRole('menuitem', { name: /json/i });

      await user.click(pdfOption);
      expect(mockUseExportDesign().mutate).toHaveBeenCalledWith({
        projectId: 'proj-123',
        format: 'pdf',
      });

      await user.click(jsonOption);
      expect(mockUseExportDesign().mutate).toHaveBeenCalledWith({
        projectId: 'proj-123',
        format: 'json',
      });
    });

    it('should show success message after export', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        mutate: jest.fn().mockResolvedValue({}),
        isLoading: false,
        error: null,
        isSuccess: true,
      });

      renderComponent();

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      const menu = screen.getByRole('menu');
      const pdfOption = within(menu).getByRole('menuitem', { name: /pdf/i });
      await user.click(pdfOption);

      expect(await screen.findByText(/export successful/i)).toBeInTheDocument();
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should allow undoing and redoing changes', async () => {
      renderComponent();

      // Make a change
      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      await user.type(within(modal).getByLabelText(/component name/i), 'Test Component');
      await user.click(within(modal).getByRole('button', { name: /save/i }));

      // Undo the change
      const undoButton = screen.getByRole('button', { name: /undo/i });
      await user.click(undoButton);

      expect(mockUseDesignData().refetch).toHaveBeenCalled();

      // Redo the change
      const redoButton = screen.getByRole('button', { name: /redo/i });
      await user.click(redoButton);

      expect(mockUseDesignData().refetch).toHaveBeenCalledTimes(2);
    });

    it('should disable undo/redo buttons when no history is available', async () => {
      renderComponent();

      const undoButton = screen.getByRole('button', { name: /undo/i });
      const redoButton = screen.getByRole('button', { name: /redo/i });

      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData, useSaveDesign, useExportDesign } from '../../hooks/designHooks';
import { DesignContext } from '../../context/DesignContext';
import { mockArchitectureData } from '../../mocks/designMocks';
import { act } from 'react-dom/test-utils';

// Mock hooks
jest.mock('../../hooks/designHooks');
jest.mock('../../context/DesignContext', () => ({
  ...jest.requireActual('../../context/DesignContext'),
  useDesignContext: jest.fn(),
}));

const mockUseDesignContext = useDesignContext as jest.Mock;
const mockUseDesignData = useDesignData as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseExportDesign = useExportDesign as jest.Mock;

const renderComponent = (overrides = {}) => {
  const defaultProps = {
    projectId: 'proj-123',
    onClose: jest.fn(),
    ...overrides,
  };

  return render(<DesignArchitecture {...defaultProps} />);
};

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseDesignContext.mockReturnValue({
      currentDesign: null,
      setCurrentDesign: jest.fn(),
      isReadOnly: false,
    });

    mockUseDesignData.mockReturnValue({
      data: mockArchitectureData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseSaveDesign.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
      error: null,
      isSuccess: false,
    });

    mockUseExportDesign.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
      error: null,
      isSuccess: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should display loading skeleton when data is loading', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      renderComponent();
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should display error message when data fetch fails', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: { message: 'Failed to load design' },
        refetch: jest.fn(),
      });

      renderComponent();
      expect(screen.getByText(/failed to load design/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the architecture diagram when data is available', () => {
      renderComponent();
      expect(screen.getByTestId('architecture-diagram')).toBeInTheDocument();
      expect(screen.getByText(mockArchitectureData.name)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow adding a new component to the architecture', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const saveButton = within(modal).getByRole('button', { name: /save/i });

      await user.type(nameInput, 'New Service');
      await user.selectOptions(typeSelect, 'service');
      await user.click(saveButton);

      expect(mockUseSaveDesign().mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({ name: 'New Service', type: 'service' })
          ])
        })
      );
    });

    it('should allow connecting two components', async () => {
      renderComponent();

      const sourceComponent = screen.getByText(/api gateway/i);
      const targetComponent = screen.getByText(/auth service/i);

      // Simulate drag and drop connection
      fireEvent.dragStart(sourceComponent);
      fireEvent.dragEnter(targetComponent);
      fireEvent.dragOver(targetComponent);
      fireEvent.drop(targetComponent);

      await waitFor(() => {
        expect(mockUseSaveDesign().mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            connections: expect.arrayContaining([
              expect.objectContaining({
                source: expect.any(String),
                target: expect.any(String)
              })
            ])
          })
        );
      });
    });

    it('should allow deleting a component', async () => {
      renderComponent();

      const component = screen.getByText(/database/i);
      const deleteButton = within(component.closest('.component-node')!).getByRole('button', { name: /delete/i });

      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockUseSaveDesign().mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.not.arrayContaining([
            expect.objectContaining({ name: 'Database' })
          ])
        })
      );
    });

    it('should handle component configuration changes', async () => {
      renderComponent();

      const component = screen.getByText(/auth service/i);
      await user.click(component);

      const configPanel = screen.getByTestId('component-config-panel');
      expect(configPanel).toBeInTheDocument();

      const replicaInput = within(configPanel).getByLabelText(/replicas/i);
      await user.clear(replicaInput);
      await user.type(replicaInput, '3');

      const saveConfigButton = within(configPanel).getByRole('button', { name: /save config/i });
      await user.click(saveConfigButton);

      expect(mockUseSaveDesign().mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({
              name: 'Auth Service',
              config: expect.objectContaining({ replicas: 3 })
            })
          ])
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should display error when saving fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        mutate: jest.fn(),
        isLoading: false,
        error: { message: 'Save failed' },
        isSuccess: false,
      });

      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const saveButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(await screen.findByText(/save failed/i)).toBeInTheDocument();
    });

    it('should prevent invalid component connections', async () => {
      renderComponent();

      // Try to connect a component to itself
      const component = screen.getByText(/api gateway/i);

      fireEvent.dragStart(component);
      fireEvent.dragEnter(component);
      fireEvent.dragOver(component);
      fireEvent.drop(component);

      expect(await screen.findByText(/cannot connect to itself/i)).toBeInTheDocument();
      expect(mockUseSaveDesign().mutate).not.toHaveBeenCalled();
    });

    it('should handle empty component name validation', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const saveButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
      expect(mockUseSaveDesign().mutate).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator during save operation', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        mutate: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200))),
        isLoading: true,
        error: null,
        isSuccess: false,
      });

      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const saveButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should disable interactions during export', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        mutate: jest.fn(),
        isLoading: true,
        error: null,
        isSuccess: false,
      });

      renderComponent();

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(screen.getByRole('button', { name: /add component/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for diagram elements', () => {
      renderComponent();

      const components = screen.getAllByRole('article');
      expect(components.length).toBeGreaterThan(0);

      components.forEach(component => {
        expect(component).toHaveAttribute('aria-label');
        expect(component).toHaveAttribute('tabindex', '0');
      });
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      const firstComponent = screen.getByText(/api gateway/i);
      firstComponent.focus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByText(/auth service/i)).toHaveFocus();

      await user.keyboard('{ArrowLeft}');
      expect(firstComponent).toHaveFocus();
    });

    it('should have proper contrast ratios for all interactive elements', () => {
      renderComponent();

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const style = window.getComputedStyle(button);
        const color = style.color;
        const backgroundColor = style.backgroundColor;

        // This is a simplified check - in real tests you'd use a proper contrast checking library
        expect(color).not.toBe(backgroundColor);
      });
    });

    it('should announce changes to screen readers', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture state', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: { ...mockArchitectureData, components: [], connections: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderComponent();
      expect(screen.getByText(/no components added yet/i)).toBeInTheDocument();
    });

    it('should prevent duplicate component names', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const saveButton = within(modal).getByRole('button', { name: /save/i });

      await user.type(nameInput, 'API Gateway');
      await user.click(saveButton);

      expect(await screen.findByText(/name must be unique/i)).toBeInTheDocument();
      expect(mockUseSaveDesign().mutate).not.toHaveBeenCalled();
    });

    it('should handle very large architecture diagrams with virtualization', async () => {
      const largeData = {
        ...mockArchitectureData,
        components: Array.from({ length: 100 }, (_, i) => ({
          id: `comp-${i}`,
          name: `Component ${i}`,
          type: 'service',
          position: { x: i * 50, y: i * 30 }
        })),
        connections: []
      };

      mockUseDesignData.mockReturnValueOnce({
        data: largeData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderComponent();

      // Verify virtualization is working by checking only visible components are rendered
      const renderedComponents = screen.getAllByRole('article');
      expect(renderedComponents.length).toBeLessThan(100);
      expect(renderedComponents.length).toBeGreaterThan(0);
    });

    it('should maintain state when switching between read-only and edit modes', async () => {
      const { rerender } = renderComponent();

      // Add a component in edit mode
      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      await user.type(nameInput, 'New Component');
      await user.click(within(modal).getByRole('button', { name: /save/i }));

      // Switch to read-only mode
      mockUseDesignContext.mockReturnValueOnce({
        currentDesign: null,
        setCurrentDesign: jest.fn(),
        isReadOnly: true,
      });

      rerender(<DesignArchitecture projectId="proj-123" />);

      // Verify component is still visible but controls are disabled
      expect(screen.getByText('New Component')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add component/i })).not.toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should allow exporting the architecture in different formats', async () => {
      renderComponent();

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      const menu = screen.getByRole('menu');
      const pdfOption = within(menu).getByRole('menuitem', { name: /pdf/i });
      const jsonOption = within(menu).getByRole('menuitem', { name: /json/i });

      await user.click(pdfOption);
      expect(mockUseExportDesign().mutate).toHaveBeenCalledWith({
        projectId: 'proj-123',
        format: 'pdf',
      });

      await user.click(jsonOption);
      expect(mockUseExportDesign().mutate).toHaveBeenCalledWith({
        projectId: 'proj-123',
        format: 'json',
      });
    });

    it('should show success message after export', async () => {
      mockUseExportDesign.mockReturnValueOnce({
        mutate: jest.fn().mockResolvedValue({}),
        isLoading: false,
        error: null,
        isSuccess: true,
      });

      renderComponent();

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      const menu = screen.getByRole('menu');
      const pdfOption = within(menu).getByRole('menuitem', { name: /pdf/i });
      await user.click(pdfOption);

      expect(await screen.findByText(/export successful/i)).toBeInTheDocument();
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should allow undoing and redoing changes', async () => {
      renderComponent();

      // Make a change
      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      await user.type(within(modal).getByLabelText(/component name/i), 'Test Component');
      await user.click(within(modal).getByRole('button', { name: /save/i }));

      // Undo the change
      const undoButton = screen.getByRole('button', { name: /undo/i });
      await user.click(undoButton);

      expect(mockUseDesignData().refetch).toHaveBeenCalled();

      // Redo the change
      const redoButton = screen.getByRole('button', { name: /redo/i });
      await user.click(redoButton);

      expect(mockUseDesignData().refetch).toHaveBeenCalledTimes(2);
    });

    it('should disable undo/redo buttons when no history is available', async () => {
      renderComponent();

      const undoButton = screen.getByRole('button', { name: /undo/i });
      const redoButton = screen.getByRole('button', { name: /redo/i });

      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();
    });
  });
});