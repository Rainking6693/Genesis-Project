import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { useDesignData } from '../../hooks/useDesignData';

// Mock external dependencies
jest.mock('axios');
jest.mock('../../context/AuthContext');
jest.mock('../../hooks/useToast');
jest.mock('../../hooks/useDesignData');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseDesignData = useDesignData as jest.MockedFunction<typeof useDesignData>;
const mockAxios = axios as jest.Mocked<typeof axios>;

const mockDesignData = {
  id: '1',
  name: 'Modern Dashboard',
  components: [
    { id: '101', type: 'header', name: 'Main Header', position: { x: 0, y: 0 } },
    { id: '102', type: 'sidebar', name: 'Navigation', position: { x: 0, y: 100 } },
  ],
  lastModified: '2023-01-01T00:00:00Z',
};

const mockUser = {
  id: 'user1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'designer',
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
    });

    mockUseToast.mockReturnValue({
      showToast: jest.fn(),
    });

    mockUseDesignData.mockReturnValue({
      designData: mockDesignData,
      isLoading: false,
      error: null,
      saveDesign: jest.fn(),
      updateComponent: jest.fn(),
      addComponent: jest.fn(),
      removeComponent: jest.fn(),
      fetchDesign: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Initial State', () => {
    it('should render the design architecture dashboard with all main sections', () => {
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      expect(screen.getByText('Design Architecture')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Modern Dashboard' })).toBeInTheDocument();
      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Component Palette' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Properties Panel' })).toBeInTheDocument();
    });

    it('should show loading skeleton when data is loading', () => {
      mockUseDesignData.mockReturnValueOnce({
        designData: null,
        isLoading: true,
        error: null,
        saveDesign: jest.fn(),
        updateComponent: jest.fn(),
        addComponent: jest.fn(),
        removeComponent: jest.fn(),
        fetchDesign: jest.fn(),
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Modern Dashboard')).not.toBeInTheDocument();
    });

    it('should display error message when data fetch fails', () => {
      mockUseDesignData.mockReturnValueOnce({
        designData: null,
        isLoading: false,
        error: new Error('Failed to fetch design data'),
        saveDesign: jest.fn(),
        updateComponent: jest.fn(),
        addComponent: jest.fn(),
        removeComponent: jest.fn(),
        fetchDesign: jest.fn(),
      });

      const mockShowToast = jest.fn();
      mockUseToast.mockReturnValueOnce({
        showToast: mockShowToast,
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to load design data',
          type: 'error',
        })
      );
    });
  });

  describe('Component Interaction', () => {
    it('should allow dragging and dropping components from palette to canvas', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const buttonComponent = screen.getByLabelText('Button Component');
      const canvas = screen.getByTestId('design-canvas');

      // Simulate drag start
      fireEvent.dragStart(buttonComponent);
      // Simulate drop on canvas
      fireEvent.drop(canvas);
      fireEvent.dragEnd(buttonComponent);

      await waitFor(() => {
        expect(mockUseDesignData().addComponent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'button',
          })
        );
      });
    });

    it('should select a component when clicked on canvas', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const headerComponent = screen.getByText('Main Header');
      await user.click(headerComponent);

      expect(screen.getByRole('heading', { name: 'Component Properties' })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Main Header')).toBeInTheDocument();
    });

    it('should update component properties when edited', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const headerComponent = screen.getByText('Main Header');
      await user.click(headerComponent);

      const nameInput = screen.getByLabelText('Component Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Header');

      const saveButton = screen.getByRole('button', { name: 'Save Changes' });
      await user.click(saveButton);

      expect(mockUseDesignData().updateComponent).toHaveBeenCalledWith(
        '101',
        expect.objectContaining({
          name: 'Updated Header',
        })
      );
    });

    it('should delete a component when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const headerComponent = screen.getByText('Main Header');
      await user.click(headerComponent);

      const deleteButton = screen.getByRole('button', { name: 'Delete Component' });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      await user.click(confirmButton);

      expect(mockUseDesignData().removeComponent).toHaveBeenCalledWith('101');
    });
  });

  describe('Design Operations', () => {
    it('should save the current design when save button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const saveButton = screen.getByRole('button', { name: 'Save Design' });
      await user.click(saveButton);

      expect(mockUseDesignData().saveDesign).toHaveBeenCalled();
    });

    it('should show success toast after successful save', async () => {
      const user = userEvent.setup();
      const mockShowToast = jest.fn();
      mockUseToast.mockReturnValueOnce({
        showToast: mockShowToast,
      });

      mockUseDesignData.mockReturnValueOnce({
        ...mockUseDesignData(),
        saveDesign: jest.fn().mockResolvedValue(true),
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const saveButton = screen.getByRole('button', { name: 'Save Design' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Design saved successfully',
            type: 'success',
          })
        );
      });
    });

    it('should show error toast when save fails', async () => {
      const user = userEvent.setup();
      const mockShowToast = jest.fn();
      mockUseToast.mockReturnValueOnce({
        showToast: mockShowToast,
      });

      mockUseDesignData.mockReturnValueOnce({
        ...mockUseDesignData(),
        saveDesign: jest.fn().mockRejectedValue(new Error('Save failed')),
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const saveButton = screen.getByRole('button', { name: 'Save Design' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to save design',
            type: 'error',
          })
        );
      });
    });

    it('should navigate to preview when preview button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/design/1']}>
          <Routes>
            <Route path="/design/:id" element={<DesignArchitecture />} />
            <Route path="/preview/:id" element={<div>Preview Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      const previewButton = screen.getByRole('button', { name: 'Preview Design' });
      await user.click(previewButton);

      expect(mockNavigate).toHaveBeenCalledWith('/preview/1');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', () => {
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      expect(screen.getByRole('region', { name: 'Design Canvas' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Component Palette' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Properties Panel' })).toBeInTheDocument();

      const components = screen.getAllByRole('article');
      components.forEach(component => {
        expect(component).toHaveAttribute('aria-label');
        expect(component).toHaveAttribute('draggable');
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      // Tab to save button
      await user.tab();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Save Design' })).toHaveFocus();

      // Activate save button with Enter
      await user.keyboard('{Enter}');
      expect(mockUseDesignData().saveDesign).toHaveBeenCalled();

      // Navigate to component and select it
      await user.tab();
      await user.tab();
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(screen.getByRole('heading', { name: 'Component Properties' })).toBeInTheDocument();
    });

    it('should have proper contrast ratios for accessibility', () => {
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const heading = screen.getByRole('heading', { name: 'Design Architecture' });
      const button = screen.getByRole('button', { name: 'Save Design' });

      // These would normally be tested with actual contrast checking tools
      // This is a placeholder for the test structure
      expect(heading).toHaveStyle('color: rgb(30, 41, 59)'); // Example color
      expect(button).toHaveStyle('background-color: rgb(37, 99, 235)'); // Example color
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design data gracefully', () => {
      mockUseDesignData.mockReturnValueOnce({
        designData: { id: '1', name: 'Empty Design', components: [] },
        isLoading: false,
        error: null,
        saveDesign: jest.fn(),
        updateComponent: jest.fn(),
        addComponent: jest.fn(),
        removeComponent: jest.fn(),
        fetchDesign: jest.fn(),
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      expect(screen.getByText('Empty Design')).toBeInTheDocument();
      expect(screen.getByText('No components added yet')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Component' })).toBeEnabled();
    });

    it('should prevent saving when there are validation errors', async () => {
      const user = userEvent.setup();
      mockUseDesignData.mockReturnValueOnce({
        ...mockUseDesignData(),
        designData: {
          ...mockDesignData,
          name: '', // Invalid empty name
        },
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const saveButton = screen.getByRole('button', { name: 'Save Design' });
      await user.click(saveButton);

      expect(screen.getByText('Design name is required')).toBeInTheDocument();
      expect(mockUseDesignData().saveDesign).not.toHaveBeenCalled();
    });

    it('should handle concurrent updates gracefully', async () => {
      const user = userEvent.setup();
      mockUseDesignData.mockReturnValueOnce({
        ...mockUseDesignData(),
        saveDesign: jest.fn().mockImplementation(() => {
          // Simulate a conflict error
          return Promise.reject(new Error('Conflict: Design was modified by another user'));
        }),
      });

      const mockShowToast = jest.fn();
      mockUseToast.mockReturnValueOnce({
        showToast: mockShowToast,
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const saveButton = screen.getByRole('button', { name: 'Save Design' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Conflict detected. Please refresh and try again.',
            type: 'error',
          })
        );
      });
    });
  });

  describe('Route Handling', () => {
    it('should redirect to login when user is not authenticated', () => {
      mockUseAuth.mockReturnValueOnce({
        user: null,
        isAuthenticated: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should fetch design data when design ID changes in URL', () => {
      render(
        <MemoryRouter initialEntries={['/design/2']}>
          <Routes>
            <Route path="/design/:id" element={<DesignArchitecture />} />
          </Routes>
        </MemoryRouter>
      );

      expect(mockUseDesignData().fetchDesign).toHaveBeenCalledWith('2');
    });

    it('should show 404 when design is not found', () => {
      mockUseDesignData.mockReturnValueOnce({
        designData: null,
        isLoading: false,
        error: new Error('Design not found'),
        saveDesign: jest.fn(),
        updateComponent: jest.fn(),
        addComponent: jest.fn(),
        removeComponent: jest.fn(),
        fetchDesign: jest.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/design/999']}>
          <Routes>
            <Route path="/design/:id" element={<DesignArchitecture />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Design not found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back to Dashboard' })).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { useDesignData } from '../../hooks/useDesignData';

// Mock external dependencies
jest.mock('axios');
jest.mock('../../context/AuthContext');
jest.mock('../../hooks/useToast');
jest.mock('../../hooks/useDesignData');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseDesignData = useDesignData as jest.MockedFunction<typeof useDesignData>;
const mockAxios = axios as jest.Mocked<typeof axios>;

const mockDesignData = {
  id: '1',
  name: 'Modern Dashboard',
  components: [
    { id: '101', type: 'header', name: 'Main Header', position: { x: 0, y: 0 } },
    { id: '102', type: 'sidebar', name: 'Navigation', position: { x: 0, y: 100 } },
  ],
  lastModified: '2023-01-01T00:00:00Z',
};

const mockUser = {
  id: 'user1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'designer',
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
    });

    mockUseToast.mockReturnValue({
      showToast: jest.fn(),
    });

    mockUseDesignData.mockReturnValue({
      designData: mockDesignData,
      isLoading: false,
      error: null,
      saveDesign: jest.fn(),
      updateComponent: jest.fn(),
      addComponent: jest.fn(),
      removeComponent: jest.fn(),
      fetchDesign: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Initial State', () => {
    it('should render the design architecture dashboard with all main sections', () => {
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      expect(screen.getByText('Design Architecture')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Modern Dashboard' })).toBeInTheDocument();
      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Component Palette' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Properties Panel' })).toBeInTheDocument();
    });

    it('should show loading skeleton when data is loading', () => {
      mockUseDesignData.mockReturnValueOnce({
        designData: null,
        isLoading: true,
        error: null,
        saveDesign: jest.fn(),
        updateComponent: jest.fn(),
        addComponent: jest.fn(),
        removeComponent: jest.fn(),
        fetchDesign: jest.fn(),
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Modern Dashboard')).not.toBeInTheDocument();
    });

    it('should display error message when data fetch fails', () => {
      mockUseDesignData.mockReturnValueOnce({
        designData: null,
        isLoading: false,
        error: new Error('Failed to fetch design data'),
        saveDesign: jest.fn(),
        updateComponent: jest.fn(),
        addComponent: jest.fn(),
        removeComponent: jest.fn(),
        fetchDesign: jest.fn(),
      });

      const mockShowToast = jest.fn();
      mockUseToast.mockReturnValueOnce({
        showToast: mockShowToast,
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to load design data',
          type: 'error',
        })
      );
    });
  });

  describe('Component Interaction', () => {
    it('should allow dragging and dropping components from palette to canvas', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const buttonComponent = screen.getByLabelText('Button Component');
      const canvas = screen.getByTestId('design-canvas');

      // Simulate drag start
      fireEvent.dragStart(buttonComponent);
      // Simulate drop on canvas
      fireEvent.drop(canvas);
      fireEvent.dragEnd(buttonComponent);

      await waitFor(() => {
        expect(mockUseDesignData().addComponent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'button',
          })
        );
      });
    });

    it('should select a component when clicked on canvas', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const headerComponent = screen.getByText('Main Header');
      await user.click(headerComponent);

      expect(screen.getByRole('heading', { name: 'Component Properties' })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Main Header')).toBeInTheDocument();
    });

    it('should update component properties when edited', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const headerComponent = screen.getByText('Main Header');
      await user.click(headerComponent);

      const nameInput = screen.getByLabelText('Component Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Header');

      const saveButton = screen.getByRole('button', { name: 'Save Changes' });
      await user.click(saveButton);

      expect(mockUseDesignData().updateComponent).toHaveBeenCalledWith(
        '101',
        expect.objectContaining({
          name: 'Updated Header',
        })
      );
    });

    it('should delete a component when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const headerComponent = screen.getByText('Main Header');
      await user.click(headerComponent);

      const deleteButton = screen.getByRole('button', { name: 'Delete Component' });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      await user.click(confirmButton);

      expect(mockUseDesignData().removeComponent).toHaveBeenCalledWith('101');
    });
  });

  describe('Design Operations', () => {
    it('should save the current design when save button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const saveButton = screen.getByRole('button', { name: 'Save Design' });
      await user.click(saveButton);

      expect(mockUseDesignData().saveDesign).toHaveBeenCalled();
    });

    it('should show success toast after successful save', async () => {
      const user = userEvent.setup();
      const mockShowToast = jest.fn();
      mockUseToast.mockReturnValueOnce({
        showToast: mockShowToast,
      });

      mockUseDesignData.mockReturnValueOnce({
        ...mockUseDesignData(),
        saveDesign: jest.fn().mockResolvedValue(true),
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const saveButton = screen.getByRole('button', { name: 'Save Design' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Design saved successfully',
            type: 'success',
          })
        );
      });
    });

    it('should show error toast when save fails', async () => {
      const user = userEvent.setup();
      const mockShowToast = jest.fn();
      mockUseToast.mockReturnValueOnce({
        showToast: mockShowToast,
      });

      mockUseDesignData.mockReturnValueOnce({
        ...mockUseDesignData(),
        saveDesign: jest.fn().mockRejectedValue(new Error('Save failed')),
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const saveButton = screen.getByRole('button', { name: 'Save Design' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to save design',
            type: 'error',
          })
        );
      });
    });

    it('should navigate to preview when preview button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/design/1']}>
          <Routes>
            <Route path="/design/:id" element={<DesignArchitecture />} />
            <Route path="/preview/:id" element={<div>Preview Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      const previewButton = screen.getByRole('button', { name: 'Preview Design' });
      await user.click(previewButton);

      expect(mockNavigate).toHaveBeenCalledWith('/preview/1');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', () => {
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      expect(screen.getByRole('region', { name: 'Design Canvas' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Component Palette' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Properties Panel' })).toBeInTheDocument();

      const components = screen.getAllByRole('article');
      components.forEach(component => {
        expect(component).toHaveAttribute('aria-label');
        expect(component).toHaveAttribute('draggable');
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      // Tab to save button
      await user.tab();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Save Design' })).toHaveFocus();

      // Activate save button with Enter
      await user.keyboard('{Enter}');
      expect(mockUseDesignData().saveDesign).toHaveBeenCalled();

      // Navigate to component and select it
      await user.tab();
      await user.tab();
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(screen.getByRole('heading', { name: 'Component Properties' })).toBeInTheDocument();
    });

    it('should have proper contrast ratios for accessibility', () => {
      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const heading = screen.getByRole('heading', { name: 'Design Architecture' });
      const button = screen.getByRole('button', { name: 'Save Design' });

      // These would normally be tested with actual contrast checking tools
      // This is a placeholder for the test structure
      expect(heading).toHaveStyle('color: rgb(30, 41, 59)'); // Example color
      expect(button).toHaveStyle('background-color: rgb(37, 99, 235)'); // Example color
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design data gracefully', () => {
      mockUseDesignData.mockReturnValueOnce({
        designData: { id: '1', name: 'Empty Design', components: [] },
        isLoading: false,
        error: null,
        saveDesign: jest.fn(),
        updateComponent: jest.fn(),
        addComponent: jest.fn(),
        removeComponent: jest.fn(),
        fetchDesign: jest.fn(),
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      expect(screen.getByText('Empty Design')).toBeInTheDocument();
      expect(screen.getByText('No components added yet')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Component' })).toBeEnabled();
    });

    it('should prevent saving when there are validation errors', async () => {
      const user = userEvent.setup();
      mockUseDesignData.mockReturnValueOnce({
        ...mockUseDesignData(),
        designData: {
          ...mockDesignData,
          name: '', // Invalid empty name
        },
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const saveButton = screen.getByRole('button', { name: 'Save Design' });
      await user.click(saveButton);

      expect(screen.getByText('Design name is required')).toBeInTheDocument();
      expect(mockUseDesignData().saveDesign).not.toHaveBeenCalled();
    });

    it('should handle concurrent updates gracefully', async () => {
      const user = userEvent.setup();
      mockUseDesignData.mockReturnValueOnce({
        ...mockUseDesignData(),
        saveDesign: jest.fn().mockImplementation(() => {
          // Simulate a conflict error
          return Promise.reject(new Error('Conflict: Design was modified by another user'));
        }),
      });

      const mockShowToast = jest.fn();
      mockUseToast.mockReturnValueOnce({
        showToast: mockShowToast,
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      const saveButton = screen.getByRole('button', { name: 'Save Design' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Conflict detected. Please refresh and try again.',
            type: 'error',
          })
        );
      });
    });
  });

  describe('Route Handling', () => {
    it('should redirect to login when user is not authenticated', () => {
      mockUseAuth.mockReturnValueOnce({
        user: null,
        isAuthenticated: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      render(
        <MemoryRouter>
          <DesignArchitecture />
        </MemoryRouter>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should fetch design data when design ID changes in URL', () => {
      render(
        <MemoryRouter initialEntries={['/design/2']}>
          <Routes>
            <Route path="/design/:id" element={<DesignArchitecture />} />
          </Routes>
        </MemoryRouter>
      );

      expect(mockUseDesignData().fetchDesign).toHaveBeenCalledWith('2');
    });

    it('should show 404 when design is not found', () => {
      mockUseDesignData.mockReturnValueOnce({
        designData: null,
        isLoading: false,
        error: new Error('Design not found'),
        saveDesign: jest.fn(),
        updateComponent: jest.fn(),
        addComponent: jest.fn(),
        removeComponent: jest.fn(),
        fetchDesign: jest.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/design/999']}>
          <Routes>
            <Route path="/design/:id" element={<DesignArchitecture />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Design not found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back to Dashboard' })).toBeInTheDocument();
    });
  });
});