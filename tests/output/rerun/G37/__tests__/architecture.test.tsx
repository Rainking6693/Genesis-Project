import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData, useSaveDesign, useValidation } from '../../hooks/designHooks';
import { DesignContext } from '../../context/DesignContext';
import { mockArchitectureData, mockErrorResponse } from '../../mocks/designMocks';
import { act } from 'react-dom/test-utils';

// Mock hooks
jest.mock('../../hooks/designHooks');
jest.mock('../../context/DesignContext');

const mockUseDesignData = useDesignData as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseValidation = useValidation as jest.Mock;
const mockUseDesignContext = DesignContext as unknown as jest.Mock;

const renderComponent = (overrides = {}) => {
  const defaultProps = {
    projectId: 'proj-123',
    onClose: jest.fn(),
    ...overrides
  };

  return render(
    <DesignContext.Provider value={{
      currentLayer: 'architecture',
      setCurrentLayer: jest.fn(),
      designState: mockArchitectureData,
      setDesignState: jest.fn()
    }}>
      <DesignArchitecture {...defaultProps} />
    </DesignContext.Provider>
  );
};

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseDesignData.mockReturnValue({
      data: mockArchitectureData,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    mockUseSaveDesign.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
      error: null,
      isSuccess: false
    });

    mockUseValidation.mockReturnValue({
      validateDesign: jest.fn().mockReturnValue({ isValid: true, errors: [] })
    });

    mockUseDesignContext.mockReturnValue({
      currentLayer: 'architecture',
      setCurrentLayer: jest.fn(),
      designState: mockArchitectureData,
      setDesignState: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when data is loading', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn()
      });

      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading design architecture/i)).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: mockErrorResponse,
        refetch: jest.fn()
      });

      renderComponent();

      expect(screen.getByText(/failed to load architecture/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the architecture diagram when data is loaded', () => {
      renderComponent();

      expect(screen.getByTestId('architecture-diagram')).toBeInTheDocument();
      expect(screen.getByText(mockArchitectureData.components[0].name)).toBeInTheDocument();
      expect(screen.getByText(mockArchitectureData.connections[0].name)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow adding a new component', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/add new component/i)).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await user.type(nameInput, 'New Service');
      await user.selectOptions(typeSelect, 'service');
      await user.click(submitButton);

      expect(mockUseDesignContext().setDesignState).toHaveBeenCalled();
    });

    it('should allow editing an existing component', async () => {
      renderComponent();

      const component = screen.getByText(mockArchitectureData.components[0].name);
      await user.click(component);

      const editButton = screen.getByRole('button', { name: /edit component/i });
      await user.click(editButton);

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText(/edit component/i)).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText(/component name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Service');

      const submitButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(submitButton);

      expect(mockUseDesignContext().setDesignState).toHaveBeenCalled();
    });

    it('should allow deleting a component with confirmation', async () => {
      renderComponent();

      const component = screen.getByText(mockArchitectureData.components[0].name);
      await user.click(component);

      const deleteButton = screen.getByRole('button', { name: /delete component/i });
      await user.click(deleteButton);

      const confirmDialog = screen.getByRole('alertdialog');
      expect(within(confirmDialog).getByText(/confirm deletion/i)).toBeInTheDocument();

      const confirmButton = within(confirmDialog).getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockUseDesignContext().setDesignState).toHaveBeenCalled();
    });

    it('should allow creating connections between components', async () => {
      renderComponent();

      const sourceComponent = screen.getByText(mockArchitectureData.components[0].name);
      const targetComponent = screen.getByText(mockArchitectureData.components[1].name);

      // Simulate connection mode activation
      const connectButton = screen.getByRole('button', { name: /connect components/i });
      await user.click(connectButton);

      // Select source component
      await user.click(sourceComponent);

      // Select target component
      await user.click(targetComponent);

      // Connection modal should appear
      const modal = await screen.findByRole('dialog');
      expect(within(modal).getByText(/create connection/i)).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText(/connection name/i);
      await user.type(nameInput, 'New Connection');

      const submitButton = within(modal).getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(mockUseDesignContext().setDesignState).toHaveBeenCalled();
    });

    it('should allow saving the architecture design', async () => {
      const mockMutate = jest.fn();
      mockUseSaveDesign.mockReturnValueOnce({
        mutate: mockMutate,
        isLoading: false,
        error: null,
        isSuccess: false
      });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-123',
          designData: mockArchitectureData
        })
      );
    });

    it('should show success message after successful save', async () => {
      const mockMutate = jest.fn();
      mockUseSaveDesign.mockReturnValueOnce({
        mutate: mockMutate,
        isLoading: false,
        error: null,
        isSuccess: true
      });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/architecture saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error message when save fails', async () => {
      const mockMutate = jest.fn();
      mockUseSaveDesign.mockReturnValueOnce({
        mutate: mockMutate,
        isLoading: false,
        error: mockErrorResponse,
        isSuccess: false
      });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save architecture/i)).toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('should show validation errors when trying to save invalid design', async () => {
      mockUseValidation.mockReturnValueOnce({
        validateDesign: jest.fn().mockReturnValue({
          isValid: false,
          errors: [
            { field: 'component-1', message: 'Component name is required' },
            { field: 'connection-1', message: 'Connection source is missing' }
          ]
        })
      });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      expect(screen.getByText(/component name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/connection source is missing/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save architecture/i })).toBeDisabled();
    });

    it('should enable save button when all validations pass', async () => {
      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', () => {
      renderComponent();

      expect(screen.getByRole('button', { name: /add component/i })).toHaveAttribute('aria-label', 'Add new component');
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveAttribute('aria-busy', 'false');
      expect(screen.getByTestId('architecture-diagram')).toHaveAttribute('role', 'application');
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      // Tab to first interactive element
      await user.tab();
      expect(screen.getByRole('button', { name: /add component/i })).toHaveFocus();

      // Tab to next element
      await user.tab();
      expect(screen.getByRole('button', { name: /connect components/i })).toHaveFocus();

      // Tab to save button
      await user.tab();
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveFocus();
    });

    it('should have proper labels for form elements in modals', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByLabelText(/component name/i)).toBeInTheDocument();
      expect(within(modal).getByLabelText(/component type/i)).toBeInTheDocument();
      expect(within(modal).getByLabelText(/description/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture data gracefully', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: { components: [], connections: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });

      renderComponent();

      expect(screen.getByText(/no components found/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first component/i)).toBeInTheDocument();
    });

    it('should prevent duplicate component names', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      // Try to add component with existing name
      await user.type(nameInput, mockArchitectureData.components[0].name);
      await user.click(submitButton);

      expect(screen.getByText(/component name already exists/i)).toBeInTheDocument();
      expect(mockUseDesignContext().setDesignState).not.toHaveBeenCalled();
    });

    it('should handle rapid successive clicks on save button', async () => {
      let mutateCallCount = 0;
      const mockMutate = jest.fn().mockImplementation(() => {
        mutateCallCount++;
        return Promise.resolve();
      });

      mockUseSaveDesign.mockReturnValue({
        mutate: mockMutate,
        isLoading: mutateCallCount > 0,
        error: null,
        isSuccess: false
      });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });

      // Rapid clicks
      await user.click(saveButton);
      await user.click(saveButton);
      await user.click(saveButton);

      // Should only call mutate once
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledTimes(1);
      });
    });

    it('should recover from failed save and allow retry', async () => {
      let shouldFail = true;
      const mockMutate = jest.fn().mockImplementation(() => {
        return shouldFail
          ? Promise.reject(mockErrorResponse)
          : Promise.resolve();
      });

      mockUseSaveDesign.mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
        error: shouldFail ? mockErrorResponse : null,
        isSuccess: !shouldFail
      });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });

      // First attempt fails
      await user.click(saveButton);
      await waitFor(() => {
        expect(screen.getByText(/failed to save architecture/i)).toBeInTheDocument();
      });

      // Change to success
      shouldFail = false;
      mockUseSaveDesign.mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
        error: null,
        isSuccess: true
      });

      // Retry
      await user.click(saveButton);
      await waitFor(() => {
        expect(screen.getByText(/architecture saved successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Context Integration', () => {
    it('should update context when components are modified', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await user.type(nameInput, 'New Component');
      await user.click(submitButton);

      expect(mockUseDesignContext().setDesignState).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({ name: 'New Component' })
          ])
        })
      );
    });

    it('should reflect context changes in the UI', () => {
      const updatedData = {
        ...mockArchitectureData,
        components: [
          ...mockArchitectureData.components,
          { id: 'comp-3', name: 'New Component', type: 'service' }
        ]
      };

      mockUseDesignContext.mockReturnValueOnce({
        currentLayer: 'architecture',
        setCurrentLayer: jest.fn(),
        designState: updatedData,
        setDesignState: jest.fn()
      });

      renderComponent();

      expect(screen.getByText('New Component')).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData, useSaveDesign, useValidation } from '../../hooks/designHooks';
import { DesignContext } from '../../context/DesignContext';
import { mockArchitectureData, mockErrorResponse } from '../../mocks/designMocks';
import { act } from 'react-dom/test-utils';

// Mock hooks
jest.mock('../../hooks/designHooks');
jest.mock('../../context/DesignContext');

const mockUseDesignData = useDesignData as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseValidation = useValidation as jest.Mock;
const mockUseDesignContext = DesignContext as unknown as jest.Mock;

const renderComponent = (overrides = {}) => {
  const defaultProps = {
    projectId: 'proj-123',
    onClose: jest.fn(),
    ...overrides
  };

  return render(
    <DesignContext.Provider value={{
      currentLayer: 'architecture',
      setCurrentLayer: jest.fn(),
      designState: mockArchitectureData,
      setDesignState: jest.fn()
    }}>
      <DesignArchitecture {...defaultProps} />
    </DesignContext.Provider>
  );
};

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseDesignData.mockReturnValue({
      data: mockArchitectureData,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    mockUseSaveDesign.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
      error: null,
      isSuccess: false
    });

    mockUseValidation.mockReturnValue({
      validateDesign: jest.fn().mockReturnValue({ isValid: true, errors: [] })
    });

    mockUseDesignContext.mockReturnValue({
      currentLayer: 'architecture',
      setCurrentLayer: jest.fn(),
      designState: mockArchitectureData,
      setDesignState: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when data is loading', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn()
      });

      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading design architecture/i)).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: mockErrorResponse,
        refetch: jest.fn()
      });

      renderComponent();

      expect(screen.getByText(/failed to load architecture/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render the architecture diagram when data is loaded', () => {
      renderComponent();

      expect(screen.getByTestId('architecture-diagram')).toBeInTheDocument();
      expect(screen.getByText(mockArchitectureData.components[0].name)).toBeInTheDocument();
      expect(screen.getByText(mockArchitectureData.connections[0].name)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow adding a new component', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/add new component/i)).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText(/component name/i);
      const typeSelect = within(modal).getByLabelText(/component type/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await user.type(nameInput, 'New Service');
      await user.selectOptions(typeSelect, 'service');
      await user.click(submitButton);

      expect(mockUseDesignContext().setDesignState).toHaveBeenCalled();
    });

    it('should allow editing an existing component', async () => {
      renderComponent();

      const component = screen.getByText(mockArchitectureData.components[0].name);
      await user.click(component);

      const editButton = screen.getByRole('button', { name: /edit component/i });
      await user.click(editButton);

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText(/edit component/i)).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText(/component name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Service');

      const submitButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(submitButton);

      expect(mockUseDesignContext().setDesignState).toHaveBeenCalled();
    });

    it('should allow deleting a component with confirmation', async () => {
      renderComponent();

      const component = screen.getByText(mockArchitectureData.components[0].name);
      await user.click(component);

      const deleteButton = screen.getByRole('button', { name: /delete component/i });
      await user.click(deleteButton);

      const confirmDialog = screen.getByRole('alertdialog');
      expect(within(confirmDialog).getByText(/confirm deletion/i)).toBeInTheDocument();

      const confirmButton = within(confirmDialog).getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockUseDesignContext().setDesignState).toHaveBeenCalled();
    });

    it('should allow creating connections between components', async () => {
      renderComponent();

      const sourceComponent = screen.getByText(mockArchitectureData.components[0].name);
      const targetComponent = screen.getByText(mockArchitectureData.components[1].name);

      // Simulate connection mode activation
      const connectButton = screen.getByRole('button', { name: /connect components/i });
      await user.click(connectButton);

      // Select source component
      await user.click(sourceComponent);

      // Select target component
      await user.click(targetComponent);

      // Connection modal should appear
      const modal = await screen.findByRole('dialog');
      expect(within(modal).getByText(/create connection/i)).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText(/connection name/i);
      await user.type(nameInput, 'New Connection');

      const submitButton = within(modal).getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(mockUseDesignContext().setDesignState).toHaveBeenCalled();
    });

    it('should allow saving the architecture design', async () => {
      const mockMutate = jest.fn();
      mockUseSaveDesign.mockReturnValueOnce({
        mutate: mockMutate,
        isLoading: false,
        error: null,
        isSuccess: false
      });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-123',
          designData: mockArchitectureData
        })
      );
    });

    it('should show success message after successful save', async () => {
      const mockMutate = jest.fn();
      mockUseSaveDesign.mockReturnValueOnce({
        mutate: mockMutate,
        isLoading: false,
        error: null,
        isSuccess: true
      });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/architecture saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error message when save fails', async () => {
      const mockMutate = jest.fn();
      mockUseSaveDesign.mockReturnValueOnce({
        mutate: mockMutate,
        isLoading: false,
        error: mockErrorResponse,
        isSuccess: false
      });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save architecture/i)).toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('should show validation errors when trying to save invalid design', async () => {
      mockUseValidation.mockReturnValueOnce({
        validateDesign: jest.fn().mockReturnValue({
          isValid: false,
          errors: [
            { field: 'component-1', message: 'Component name is required' },
            { field: 'connection-1', message: 'Connection source is missing' }
          ]
        })
      });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      expect(screen.getByText(/component name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/connection source is missing/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save architecture/i })).toBeDisabled();
    });

    it('should enable save button when all validations pass', async () => {
      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', () => {
      renderComponent();

      expect(screen.getByRole('button', { name: /add component/i })).toHaveAttribute('aria-label', 'Add new component');
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveAttribute('aria-busy', 'false');
      expect(screen.getByTestId('architecture-diagram')).toHaveAttribute('role', 'application');
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      // Tab to first interactive element
      await user.tab();
      expect(screen.getByRole('button', { name: /add component/i })).toHaveFocus();

      // Tab to next element
      await user.tab();
      expect(screen.getByRole('button', { name: /connect components/i })).toHaveFocus();

      // Tab to save button
      await user.tab();
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveFocus();
    });

    it('should have proper labels for form elements in modals', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByLabelText(/component name/i)).toBeInTheDocument();
      expect(within(modal).getByLabelText(/component type/i)).toBeInTheDocument();
      expect(within(modal).getByLabelText(/description/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture data gracefully', () => {
      mockUseDesignData.mockReturnValueOnce({
        data: { components: [], connections: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });

      renderComponent();

      expect(screen.getByText(/no components found/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first component/i)).toBeInTheDocument();
    });

    it('should prevent duplicate component names', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      // Try to add component with existing name
      await user.type(nameInput, mockArchitectureData.components[0].name);
      await user.click(submitButton);

      expect(screen.getByText(/component name already exists/i)).toBeInTheDocument();
      expect(mockUseDesignContext().setDesignState).not.toHaveBeenCalled();
    });

    it('should handle rapid successive clicks on save button', async () => {
      let mutateCallCount = 0;
      const mockMutate = jest.fn().mockImplementation(() => {
        mutateCallCount++;
        return Promise.resolve();
      });

      mockUseSaveDesign.mockReturnValue({
        mutate: mockMutate,
        isLoading: mutateCallCount > 0,
        error: null,
        isSuccess: false
      });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });

      // Rapid clicks
      await user.click(saveButton);
      await user.click(saveButton);
      await user.click(saveButton);

      // Should only call mutate once
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledTimes(1);
      });
    });

    it('should recover from failed save and allow retry', async () => {
      let shouldFail = true;
      const mockMutate = jest.fn().mockImplementation(() => {
        return shouldFail
          ? Promise.reject(mockErrorResponse)
          : Promise.resolve();
      });

      mockUseSaveDesign.mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
        error: shouldFail ? mockErrorResponse : null,
        isSuccess: !shouldFail
      });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });

      // First attempt fails
      await user.click(saveButton);
      await waitFor(() => {
        expect(screen.getByText(/failed to save architecture/i)).toBeInTheDocument();
      });

      // Change to success
      shouldFail = false;
      mockUseSaveDesign.mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
        error: null,
        isSuccess: true
      });

      // Retry
      await user.click(saveButton);
      await waitFor(() => {
        expect(screen.getByText(/architecture saved successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Context Integration', () => {
    it('should update context when components are modified', async () => {
      renderComponent();

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/component name/i);
      const submitButton = within(modal).getByRole('button', { name: /add/i });

      await user.type(nameInput, 'New Component');
      await user.click(submitButton);

      expect(mockUseDesignContext().setDesignState).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({ name: 'New Component' })
          ])
        })
      );
    });

    it('should reflect context changes in the UI', () => {
      const updatedData = {
        ...mockArchitectureData,
        components: [
          ...mockArchitectureData.components,
          { id: 'comp-3', name: 'New Component', type: 'service' }
        ]
      };

      mockUseDesignContext.mockReturnValueOnce({
        currentLayer: 'architecture',
        setCurrentLayer: jest.fn(),
        designState: updatedData,
        setDesignState: jest.fn()
      });

      renderComponent();

      expect(screen.getByText('New Component')).toBeInTheDocument();
    });
  });
});