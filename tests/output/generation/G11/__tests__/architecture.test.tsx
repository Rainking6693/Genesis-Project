import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useFetchDesignData } from '../../hooks/useFetchDesignData';
import { useUpdateDesign } from '../../hooks/useUpdateDesign';
import { useDeleteDesign } from '../../hooks/useDeleteDesign';
import { useAuth } from '../../context/AuthContext';
import { DesignData } from '../../types/designTypes';
import { axe } from 'jest-axe';

jest.mock('../../hooks/useFetchDesignData');
jest.mock('../../hooks/useUpdateDesign');
jest.mock('../../hooks/useDeleteDesign');
jest.mock('../../context/AuthContext');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockUseFetchDesignData = useFetchDesignData as jest.MockedFunction<typeof useFetchDesignData>;
const mockUseUpdateDesign = useUpdateDesign as jest.MockedFunction<typeof useUpdateDesign>;
const mockUseDeleteDesign = useDeleteDesign as jest.MockedFunction<typeof useDeleteDesign>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockDesignData: DesignData[] = [
  {
    id: '1',
    name: 'Component A',
    type: 'UI',
    status: 'active',
    lastModified: '2023-01-01',
    dependencies: ['2'],
    version: '1.0',
  },
  {
    id: '2',
    name: 'Service B',
    type: 'Backend',
    status: 'deprecated',
    lastModified: '2023-02-15',
    dependencies: [],
    version: '2.1',
  },
];

const mockError = new Error('Failed to fetch design data');

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user1', role: 'admin', name: 'Test User' },
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should render loading skeleton when data is being fetched', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByTestId('design-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Component A')).not.toBeInTheDocument();
    });

    it('should render error message when data fetch fails', () => {
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
  });

  describe('Data Display', () => {
    beforeEach(() => {
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it('should render all design components in the architecture view', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText('Component A')).toBeInTheDocument();
      expect(screen.getByText('Service B')).toBeInTheDocument();
      expect(screen.getByText('UI')).toBeInTheDocument();
      expect(screen.getByText('Backend')).toBeInTheDocument();
    });

    it('should display component status with appropriate styling', () => {
      render(<DesignArchitecture />);

      const activeStatus = screen.getByText('active');
      const deprecatedStatus = screen.getByText('deprecated');

      expect(activeStatus).toHaveClass('status-active');
      expect(deprecatedStatus).toHaveClass('status-deprecated');
    });

    it('should show dependency connections between components', () => {
      render(<DesignArchitecture />);

      const componentA = screen.getByText('Component A');
      const serviceB = screen.getByText('Service B');

      // Verify connection line exists (simplified check)
      const connections = document.querySelectorAll('.dependency-connection');
      expect(connections.length).toBeGreaterThan(0);
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

      mockUseUpdateDesign.mockReturnValue({
        updateDesign: jest.fn().mockResolvedValue({ success: true }),
        isUpdating: false,
        error: null,
      });
    });

    it('should open component details panel when clicking on a component', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByText('Component A'));

      expect(screen.getByTestId('component-details-panel')).toBeInTheDocument();
      expect(screen.getByText('Component A Details')).toBeInTheDocument();
      expect(screen.getByText('Version: 1.0')).toBeInTheDocument();
    });

    it('should allow editing component details', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByText('Component A'));
      await user.click(screen.getByRole('button', { name: /edit/i }));

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Component A');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledWith({
        ...mockDesignData[0],
        name: 'Updated Component A',
      });
    });

    it('should show confirmation dialog before deleting a component', async () => {
      mockUseDeleteDesign.mockReturnValue({
        deleteDesign: jest.fn().mockResolvedValue({ success: true }),
        isDeleting: false,
        error: null,
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByText('Component A'));
      await user.click(screen.getByRole('button', { name: /delete/i }));

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument();
    });

    it('should delete component when confirmed', async () => {
      const mockDelete = jest.fn().mockResolvedValue({ success: true });
      mockUseDeleteDesign.mockReturnValue({
        deleteDesign: mockDelete,
        isDeleting: false,
        error: null,
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByText('Component A'));
      await user.click(screen.getByRole('button', { name: /delete/i }));
      await user.click(screen.getByRole('button', { name: /confirm delete/i }));

      expect(mockDelete).toHaveBeenCalledWith('1');
      await waitFor(() => {
        expect(screen.queryByText('Component A')).not.toBeInTheDocument();
      });
    });

    it('should handle update errors gracefully', async () => {
      const mockUpdateError = new Error('Update failed');
      mockUseUpdateDesign.mockReturnValue({
        updateDesign: jest.fn().mockRejectedValue(mockUpdateError),
        isUpdating: false,
        error: mockUpdateError,
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByText('Component A'));
      await user.click(screen.getByRole('button', { name: /edit/i }));

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(await screen.findByText(/failed to update component/i)).toBeInTheDocument();
    });
  });

  describe('Filtering and Search', () => {
    beforeEach(() => {
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it('should filter components by type', async () => {
      render(<DesignArchitecture />);

      const filterSelect = screen.getByLabelText(/filter by type/i);
      await user.selectOptions(filterSelect, 'UI');

      expect(screen.getByText('Component A')).toBeInTheDocument();
      expect(screen.queryByText('Service B')).not.toBeInTheDocument();
    });

    it('should filter components by status', async () => {
      render(<DesignArchitecture />);

      const filterSelect = screen.getByLabelText(/filter by status/i);
      await user.selectOptions(filterSelect, 'active');

      expect(screen.getByText('Component A')).toBeInTheDocument();
      expect(screen.queryByText('Service B')).not.toBeInTheDocument();
    });

    it('should search components by name', async () => {
      render(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search components/i);
      await user.type(searchInput, 'Service');

      expect(screen.queryByText('Component A')).not.toBeInTheDocument();
      expect(screen.getByText('Service B')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(<DesignArchitecture />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByLabelText(/filter by type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search components/i)).toHaveAttribute('aria-label', 'Search components');
    });

    it('should have proper keyboard navigation for component nodes', async () => {
      render(<DesignArchitecture />);

      const componentA = screen.getByText('Component A');
      componentA.focus();

      await user.keyboard('{Enter}');
      expect(screen.getByTestId('component-details-panel')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByTestId('component-details-panel')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design data gracefully', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no design components found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create new component/i })).toBeInTheDocument();
    });

    it('should disable edit/delete buttons for non-admin users', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user1', role: 'viewer', name: 'Test User' },
        isAuthenticated: true,
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByText('Component A'));

      expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
    });

    it('should show unauthorized message for non-authenticated users', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/you must be logged in to view this page/i)).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    it('should not re-render unnecessarily when unrelated state changes', () => {
      const { rerender } = render(<DesignArchitecture />);
      const initialRender = screen.getByText('Component A');

      mockUseFetchDesignData.mockReturnValue({
        data: [...mockDesignData],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      rerender(<DesignArchitecture />);
      const updatedRender = screen.getByText('Component A');

      expect(initialRender).toBe(updatedRender);
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useFetchDesignData } from '../../hooks/useFetchDesignData';
import { useUpdateDesign } from '../../hooks/useUpdateDesign';
import { useDeleteDesign } from '../../hooks/useDeleteDesign';
import { useAuth } from '../../context/AuthContext';
import { DesignData } from '../../types/designTypes';
import { axe } from 'jest-axe';

jest.mock('../../hooks/useFetchDesignData');
jest.mock('../../hooks/useUpdateDesign');
jest.mock('../../hooks/useDeleteDesign');
jest.mock('../../context/AuthContext');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockUseFetchDesignData = useFetchDesignData as jest.MockedFunction<typeof useFetchDesignData>;
const mockUseUpdateDesign = useUpdateDesign as jest.MockedFunction<typeof useUpdateDesign>;
const mockUseDeleteDesign = useDeleteDesign as jest.MockedFunction<typeof useDeleteDesign>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockDesignData: DesignData[] = [
  {
    id: '1',
    name: 'Component A',
    type: 'UI',
    status: 'active',
    lastModified: '2023-01-01',
    dependencies: ['2'],
    version: '1.0',
  },
  {
    id: '2',
    name: 'Service B',
    type: 'Backend',
    status: 'deprecated',
    lastModified: '2023-02-15',
    dependencies: [],
    version: '2.1',
  },
];

const mockError = new Error('Failed to fetch design data');

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user1', role: 'admin', name: 'Test User' },
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should render loading skeleton when data is being fetched', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByTestId('design-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Component A')).not.toBeInTheDocument();
    });

    it('should render error message when data fetch fails', () => {
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
  });

  describe('Data Display', () => {
    beforeEach(() => {
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it('should render all design components in the architecture view', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText('Component A')).toBeInTheDocument();
      expect(screen.getByText('Service B')).toBeInTheDocument();
      expect(screen.getByText('UI')).toBeInTheDocument();
      expect(screen.getByText('Backend')).toBeInTheDocument();
    });

    it('should display component status with appropriate styling', () => {
      render(<DesignArchitecture />);

      const activeStatus = screen.getByText('active');
      const deprecatedStatus = screen.getByText('deprecated');

      expect(activeStatus).toHaveClass('status-active');
      expect(deprecatedStatus).toHaveClass('status-deprecated');
    });

    it('should show dependency connections between components', () => {
      render(<DesignArchitecture />);

      const componentA = screen.getByText('Component A');
      const serviceB = screen.getByText('Service B');

      // Verify connection line exists (simplified check)
      const connections = document.querySelectorAll('.dependency-connection');
      expect(connections.length).toBeGreaterThan(0);
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

      mockUseUpdateDesign.mockReturnValue({
        updateDesign: jest.fn().mockResolvedValue({ success: true }),
        isUpdating: false,
        error: null,
      });
    });

    it('should open component details panel when clicking on a component', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByText('Component A'));

      expect(screen.getByTestId('component-details-panel')).toBeInTheDocument();
      expect(screen.getByText('Component A Details')).toBeInTheDocument();
      expect(screen.getByText('Version: 1.0')).toBeInTheDocument();
    });

    it('should allow editing component details', async () => {
      render(<DesignArchitecture />);

      await user.click(screen.getByText('Component A'));
      await user.click(screen.getByRole('button', { name: /edit/i }));

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Component A');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(mockUseUpdateDesign().updateDesign).toHaveBeenCalledWith({
        ...mockDesignData[0],
        name: 'Updated Component A',
      });
    });

    it('should show confirmation dialog before deleting a component', async () => {
      mockUseDeleteDesign.mockReturnValue({
        deleteDesign: jest.fn().mockResolvedValue({ success: true }),
        isDeleting: false,
        error: null,
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByText('Component A'));
      await user.click(screen.getByRole('button', { name: /delete/i }));

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument();
    });

    it('should delete component when confirmed', async () => {
      const mockDelete = jest.fn().mockResolvedValue({ success: true });
      mockUseDeleteDesign.mockReturnValue({
        deleteDesign: mockDelete,
        isDeleting: false,
        error: null,
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByText('Component A'));
      await user.click(screen.getByRole('button', { name: /delete/i }));
      await user.click(screen.getByRole('button', { name: /confirm delete/i }));

      expect(mockDelete).toHaveBeenCalledWith('1');
      await waitFor(() => {
        expect(screen.queryByText('Component A')).not.toBeInTheDocument();
      });
    });

    it('should handle update errors gracefully', async () => {
      const mockUpdateError = new Error('Update failed');
      mockUseUpdateDesign.mockReturnValue({
        updateDesign: jest.fn().mockRejectedValue(mockUpdateError),
        isUpdating: false,
        error: mockUpdateError,
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByText('Component A'));
      await user.click(screen.getByRole('button', { name: /edit/i }));

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(await screen.findByText(/failed to update component/i)).toBeInTheDocument();
    });
  });

  describe('Filtering and Search', () => {
    beforeEach(() => {
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it('should filter components by type', async () => {
      render(<DesignArchitecture />);

      const filterSelect = screen.getByLabelText(/filter by type/i);
      await user.selectOptions(filterSelect, 'UI');

      expect(screen.getByText('Component A')).toBeInTheDocument();
      expect(screen.queryByText('Service B')).not.toBeInTheDocument();
    });

    it('should filter components by status', async () => {
      render(<DesignArchitecture />);

      const filterSelect = screen.getByLabelText(/filter by status/i);
      await user.selectOptions(filterSelect, 'active');

      expect(screen.getByText('Component A')).toBeInTheDocument();
      expect(screen.queryByText('Service B')).not.toBeInTheDocument();
    });

    it('should search components by name', async () => {
      render(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search components/i);
      await user.type(searchInput, 'Service');

      expect(screen.queryByText('Component A')).not.toBeInTheDocument();
      expect(screen.getByText('Service B')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseFetchDesignData.mockReturnValue({
        data: mockDesignData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(<DesignArchitecture />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByLabelText(/filter by type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search components/i)).toHaveAttribute('aria-label', 'Search components');
    });

    it('should have proper keyboard navigation for component nodes', async () => {
      render(<DesignArchitecture />);

      const componentA = screen.getByText('Component A');
      componentA.focus();

      await user.keyboard('{Enter}');
      expect(screen.getByTestId('component-details-panel')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByTestId('component-details-panel')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design data gracefully', () => {
      mockUseFetchDesignData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no design components found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create new component/i })).toBeInTheDocument();
    });

    it('should disable edit/delete buttons for non-admin users', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user1', role: 'viewer', name: 'Test User' },
        isAuthenticated: true,
      });

      render(<DesignArchitecture />);

      await user.click(screen.getByText('Component A'));

      expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
    });

    it('should show unauthorized message for non-authenticated users', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/you must be logged in to view this page/i)).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    it('should not re-render unnecessarily when unrelated state changes', () => {
      const { rerender } = render(<DesignArchitecture />);
      const initialRender = screen.getByText('Component A');

      mockUseFetchDesignData.mockReturnValue({
        data: [...mockDesignData],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      rerender(<DesignArchitecture />);
      const updatedRender = screen.getByText('Component A');

      expect(initialRender).toBe(updatedRender);
    });
  });
});