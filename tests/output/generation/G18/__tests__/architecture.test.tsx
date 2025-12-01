import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { ACTIVE_STATUS, DRAFT_STATUS } from '../../constants/statusConstants';

jest.mock('axios');
jest.mock('../../context/AuthContext');
jest.mock('../../hooks/useToast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockNavigate = jest.fn();

const mockArchitectureData = {
  id: 'arch-123',
  name: 'Modern Dashboard',
  description: 'A modern dashboard design with dark theme',
  status: ACTIVE_STATUS,
  components: [
    { id: 'comp-1', name: 'Header', type: 'container', position: { x: 0, y: 0 } },
    { id: 'comp-2', name: 'Sidebar', type: 'navigation', position: { x: 200, y: 0 } },
  ],
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-15T00:00:00Z',
};

const mockDraftArchitecture = {
  ...mockArchitectureData,
  id: 'draft-456',
  name: 'Draft Design',
  status: DRAFT_STATUS,
};

const renderComponent = (initialRoute = '/design/arch-123') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/design/:id" element={<DesignArchitecture />} />
      </Routes>
    </MemoryRouter>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', name: 'Test User', role: 'admin' },
    isAuthenticated: true,
  });
  mockUseToast.mockReturnValue({
    showToast: jest.fn(),
  });
  (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
});

describe('DesignArchitecture Component', () => {
  describe('Initial Rendering', () => {
    it('should render loading state initially', async () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderComponent();

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByText('Modern Dashboard')).not.toBeInTheDocument();
    });

    it('should render architecture details after successful data fetch', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Modern Dashboard')).toBeInTheDocument();
        expect(screen.getByText('A modern dashboard design with dark theme')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      const errorMessage = 'Failed to fetch architecture';
      (axios.get as jest.Mock).mockRejectedValue(new Error(errorMessage));
      mockUseToast.mockReturnValue({
        showToast: jest.fn((msg, type) => expect(type).toBe('error'),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow editing architecture name', async () => {
      renderComponent();

      const editButton = screen.getByLabelText('Edit architecture name');
      fireEvent.click(editButton);

      const nameInput = screen.getByDisplayValue('Modern Dashboard');
      fireEvent.change(nameInput, { target: { value: 'Updated Dashboard' } });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/api/architectures/arch-123'),
          expect.objectContaining({ name: 'Updated Dashboard' })
        );
      });
    });

    it('should handle edit name cancellation', async () => {
      renderComponent();

      const editButton = screen.getByLabelText('Edit architecture name');
      fireEvent.click(editButton);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByDisplayValue('Modern Dashboard')).not.toBeInTheDocument();
      expect(screen.getByText('Modern Dashboard')).toBeInTheDocument();
    });

    it('should allow adding new components', async () => {
      renderComponent();

      const addComponentButton = screen.getByText('Add Component');
      fireEvent.click(addComponentButton);

      const dialog = screen.getByRole('dialog');
      within(dialog).getByText('Add New Component');

      const nameInput = within(dialog).getByLabelText('Component Name');
      const typeSelect = within(dialog).getByLabelText('Component Type');

      userEvent.type(nameInput, 'New Footer');
      userEvent.selectOptions(typeSelect, 'footer');

      const addButton = within(dialog).getByText('Add');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/api/architectures/arch-123/components'),
          expect.objectContaining({
            name: 'New Footer',
            type: 'footer'
          })
        );
      });
    });

    it('should allow dragging and dropping components', async () => {
      renderComponent();

      const headerComponent = screen.getByText('Header');
      const sidebarComponent = screen.getByText('Sidebar');

      // Simulate drag and drop
      fireEvent.dragStart(headerComponent);
      fireEvent.dragEnter(sidebarComponent);
      fireEvent.dragOver(sidebarComponent);
      fireEvent.drop(sidebarComponent);
      fireEvent.dragEnd(headerComponent);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/api/architectures/arch-123/components'),
          expect.arrayContaining([
            expect.objectContaining({ id: 'comp-1', position: expect.any(Object) }),
            expect.objectContaining({ id: 'comp-2', position: expect.any(Object) })
          ])
        );
      });
    });

    it('should allow deleting components', async () => {
      renderComponent();

      const deleteButtons = screen.getAllByLabelText('Delete component');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          expect.stringContaining('/api/architectures/arch-123/components/comp-1')
        );
      });
    });
  });

  describe('Status Management', () => {
    it('should allow publishing a draft architecture', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: mockDraftArchitecture });

      renderComponent('/design/draft-456');

      const publishButton = screen.getByText('Publish');
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/api/architectures/draft-456/publish')
        );
        expect(mockNavigate).toHaveBeenCalledWith('/design/draft-456');
      });
    });

    it('should allow archiving an active architecture', async () => {
      renderComponent();

      const moreOptionsButton = screen.getByLabelText('More options');
      fireEvent.click(moreOptionsButton);

      const archiveButton = screen.getByText('Archive');
      fireEvent.click(archiveButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/api/architectures/arch-123/archive')
        );
      });
    });

    it('should show confirmation dialog for destructive actions', async () => {
      renderComponent();

      const moreOptionsButton = screen.getByLabelText('More options');
      fireEvent.click(moreOptionsButton);

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(screen.getByText('Are you sure you want to delete this architecture?')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });
  });

  describe('Navigation and Routing', () => {
    it('should navigate back to designs list when back button is clicked', async () => {
      renderComponent();

      const backButton = screen.getByLabelText('Back to designs');
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/designs');
    });

    it('should redirect to 404 when architecture is not found', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: { status: 404 }
      });

      renderComponent('/design/nonexistent');

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/404');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', async () => {
      renderComponent();

      expect(screen.getByLabelText('Edit architecture name')).toHaveAttribute('aria-label');
      expect(screen.getByLabelText('Delete component')).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: 'Add Component' })).toHaveAttribute('aria-haspopup');
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      // Tab through interactive elements
      fireEvent.keyDown(document.body, { key: 'Tab' });
      fireEvent.keyDown(document.body, { key: 'Tab' });

      const addComponentButton = screen.getByText('Add Component');
      expect(addComponentButton).toHaveFocus();

      fireEvent.keyDown(addComponentButton, { key: 'Enter' });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderComponent();

      const heading = screen.getByRole('heading', { name: 'Modern Dashboard' });
      expect(heading).toHaveStyle('color: var(--text-primary)');

      const description = screen.getByText('A modern dashboard design with dark theme');
      expect(description).toHaveStyle('color: var(--text-secondary)');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully when saving changes', async () => {
      (axios.put as jest.Mock).mockRejectedValue(new Error('Save failed'));

      renderComponent();

      const editButton = screen.getByLabelText('Edit architecture name');
      fireEvent.click(editButton);

      const nameInput = screen.getByDisplayValue('Modern Dashboard');
      fireEvent.change(nameInput, { target: { value: 'Updated Dashboard' } });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUseToast().showToast).toHaveBeenCalledWith(
          'Failed to update architecture. Please try again.',
          'error'
        );
      });
    });

    it('should handle network errors when loading components', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/unable to load components/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should show empty state when architecture has no components', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockArchitectureData,
          components: []
        }
      });

      renderComponent();

      expect(screen.getByText(/no components added yet/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first component/i)).toBeInTheDocument();
    });
  });

  describe('Permission Handling', () => {
    it('should disable edit controls for non-admin users', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', name: 'Test User', role: 'viewer' },
        isAuthenticated: true,
      });

      renderComponent();

      expect(screen.queryByLabelText('Edit architecture name')).not.toBeInTheDocument();
      expect(screen.queryByText('Add Component')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('More options')).not.toBeInTheDocument();
    });

    it('should show permission denied message when user tries to access without permissions', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      renderComponent();

      expect(screen.getByText(/you don't have permission to view this architecture/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt layout for mobile viewports', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderComponent();

      expect(screen.getByLabelText('Mobile menu toggle')).toBeInTheDocument();
      expect(screen.queryByText('Sidebar')).not.toBeInTheDocument();
    });

    it('should show mobile-specific controls', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderComponent();

      const mobileToggle = screen.getByLabelText('Mobile menu toggle');
      fireEvent.click(mobileToggle);

      await waitFor(() => {
        expect(screen.getByText('Sidebar')).toBeInTheDocument();
      });
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
import { ACTIVE_STATUS, DRAFT_STATUS } from '../../constants/statusConstants';

jest.mock('axios');
jest.mock('../../context/AuthContext');
jest.mock('../../hooks/useToast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockNavigate = jest.fn();

const mockArchitectureData = {
  id: 'arch-123',
  name: 'Modern Dashboard',
  description: 'A modern dashboard design with dark theme',
  status: ACTIVE_STATUS,
  components: [
    { id: 'comp-1', name: 'Header', type: 'container', position: { x: 0, y: 0 } },
    { id: 'comp-2', name: 'Sidebar', type: 'navigation', position: { x: 200, y: 0 } },
  ],
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-15T00:00:00Z',
};

const mockDraftArchitecture = {
  ...mockArchitectureData,
  id: 'draft-456',
  name: 'Draft Design',
  status: DRAFT_STATUS,
};

const renderComponent = (initialRoute = '/design/arch-123') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/design/:id" element={<DesignArchitecture />} />
      </Routes>
    </MemoryRouter>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', name: 'Test User', role: 'admin' },
    isAuthenticated: true,
  });
  mockUseToast.mockReturnValue({
    showToast: jest.fn(),
  });
  (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
});

describe('DesignArchitecture Component', () => {
  describe('Initial Rendering', () => {
    it('should render loading state initially', async () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderComponent();

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByText('Modern Dashboard')).not.toBeInTheDocument();
    });

    it('should render architecture details after successful data fetch', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Modern Dashboard')).toBeInTheDocument();
        expect(screen.getByText('A modern dashboard design with dark theme')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      const errorMessage = 'Failed to fetch architecture';
      (axios.get as jest.Mock).mockRejectedValue(new Error(errorMessage));
      mockUseToast.mockReturnValue({
        showToast: jest.fn((msg, type) => expect(type).toBe('error'),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow editing architecture name', async () => {
      renderComponent();

      const editButton = screen.getByLabelText('Edit architecture name');
      fireEvent.click(editButton);

      const nameInput = screen.getByDisplayValue('Modern Dashboard');
      fireEvent.change(nameInput, { target: { value: 'Updated Dashboard' } });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/api/architectures/arch-123'),
          expect.objectContaining({ name: 'Updated Dashboard' })
        );
      });
    });

    it('should handle edit name cancellation', async () => {
      renderComponent();

      const editButton = screen.getByLabelText('Edit architecture name');
      fireEvent.click(editButton);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByDisplayValue('Modern Dashboard')).not.toBeInTheDocument();
      expect(screen.getByText('Modern Dashboard')).toBeInTheDocument();
    });

    it('should allow adding new components', async () => {
      renderComponent();

      const addComponentButton = screen.getByText('Add Component');
      fireEvent.click(addComponentButton);

      const dialog = screen.getByRole('dialog');
      within(dialog).getByText('Add New Component');

      const nameInput = within(dialog).getByLabelText('Component Name');
      const typeSelect = within(dialog).getByLabelText('Component Type');

      userEvent.type(nameInput, 'New Footer');
      userEvent.selectOptions(typeSelect, 'footer');

      const addButton = within(dialog).getByText('Add');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/api/architectures/arch-123/components'),
          expect.objectContaining({
            name: 'New Footer',
            type: 'footer'
          })
        );
      });
    });

    it('should allow dragging and dropping components', async () => {
      renderComponent();

      const headerComponent = screen.getByText('Header');
      const sidebarComponent = screen.getByText('Sidebar');

      // Simulate drag and drop
      fireEvent.dragStart(headerComponent);
      fireEvent.dragEnter(sidebarComponent);
      fireEvent.dragOver(sidebarComponent);
      fireEvent.drop(sidebarComponent);
      fireEvent.dragEnd(headerComponent);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/api/architectures/arch-123/components'),
          expect.arrayContaining([
            expect.objectContaining({ id: 'comp-1', position: expect.any(Object) }),
            expect.objectContaining({ id: 'comp-2', position: expect.any(Object) })
          ])
        );
      });
    });

    it('should allow deleting components', async () => {
      renderComponent();

      const deleteButtons = screen.getAllByLabelText('Delete component');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          expect.stringContaining('/api/architectures/arch-123/components/comp-1')
        );
      });
    });
  });

  describe('Status Management', () => {
    it('should allow publishing a draft architecture', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: mockDraftArchitecture });

      renderComponent('/design/draft-456');

      const publishButton = screen.getByText('Publish');
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/api/architectures/draft-456/publish')
        );
        expect(mockNavigate).toHaveBeenCalledWith('/design/draft-456');
      });
    });

    it('should allow archiving an active architecture', async () => {
      renderComponent();

      const moreOptionsButton = screen.getByLabelText('More options');
      fireEvent.click(moreOptionsButton);

      const archiveButton = screen.getByText('Archive');
      fireEvent.click(archiveButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/api/architectures/arch-123/archive')
        );
      });
    });

    it('should show confirmation dialog for destructive actions', async () => {
      renderComponent();

      const moreOptionsButton = screen.getByLabelText('More options');
      fireEvent.click(moreOptionsButton);

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(screen.getByText('Are you sure you want to delete this architecture?')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });
  });

  describe('Navigation and Routing', () => {
    it('should navigate back to designs list when back button is clicked', async () => {
      renderComponent();

      const backButton = screen.getByLabelText('Back to designs');
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/designs');
    });

    it('should redirect to 404 when architecture is not found', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: { status: 404 }
      });

      renderComponent('/design/nonexistent');

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/404');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', async () => {
      renderComponent();

      expect(screen.getByLabelText('Edit architecture name')).toHaveAttribute('aria-label');
      expect(screen.getByLabelText('Delete component')).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: 'Add Component' })).toHaveAttribute('aria-haspopup');
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      // Tab through interactive elements
      fireEvent.keyDown(document.body, { key: 'Tab' });
      fireEvent.keyDown(document.body, { key: 'Tab' });

      const addComponentButton = screen.getByText('Add Component');
      expect(addComponentButton).toHaveFocus();

      fireEvent.keyDown(addComponentButton, { key: 'Enter' });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderComponent();

      const heading = screen.getByRole('heading', { name: 'Modern Dashboard' });
      expect(heading).toHaveStyle('color: var(--text-primary)');

      const description = screen.getByText('A modern dashboard design with dark theme');
      expect(description).toHaveStyle('color: var(--text-secondary)');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully when saving changes', async () => {
      (axios.put as jest.Mock).mockRejectedValue(new Error('Save failed'));

      renderComponent();

      const editButton = screen.getByLabelText('Edit architecture name');
      fireEvent.click(editButton);

      const nameInput = screen.getByDisplayValue('Modern Dashboard');
      fireEvent.change(nameInput, { target: { value: 'Updated Dashboard' } });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUseToast().showToast).toHaveBeenCalledWith(
          'Failed to update architecture. Please try again.',
          'error'
        );
      });
    });

    it('should handle network errors when loading components', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/unable to load components/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should show empty state when architecture has no components', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockArchitectureData,
          components: []
        }
      });

      renderComponent();

      expect(screen.getByText(/no components added yet/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first component/i)).toBeInTheDocument();
    });
  });

  describe('Permission Handling', () => {
    it('should disable edit controls for non-admin users', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', name: 'Test User', role: 'viewer' },
        isAuthenticated: true,
      });

      renderComponent();

      expect(screen.queryByLabelText('Edit architecture name')).not.toBeInTheDocument();
      expect(screen.queryByText('Add Component')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('More options')).not.toBeInTheDocument();
    });

    it('should show permission denied message when user tries to access without permissions', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      renderComponent();

      expect(screen.getByText(/you don't have permission to view this architecture/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt layout for mobile viewports', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderComponent();

      expect(screen.getByLabelText('Mobile menu toggle')).toBeInTheDocument();
      expect(screen.queryByText('Sidebar')).not.toBeInTheDocument();
    });

    it('should show mobile-specific controls', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderComponent();

      const mobileToggle = screen.getByLabelText('Mobile menu toggle');
      fireEvent.click(mobileToggle);

      await waitFor(() => {
        expect(screen.getByText('Sidebar')).toBeInTheDocument();
      });
    });
  });
});