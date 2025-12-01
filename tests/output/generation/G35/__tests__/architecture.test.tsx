import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { ArchitectureContext } from '../../context/ArchitectureContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('../../hooks/useApi', () => ({
  useApi: jest.fn(),
}));

const mockNavigate = jest.fn();

const mockArchitectureData = {
  id: 'arch-123',
  name: 'Microservices Architecture',
  description: 'Modern scalable architecture',
  components: [
    { id: 'comp-1', name: 'API Gateway', type: 'gateway', connections: ['comp-2'] },
    { id: 'comp-2', name: 'User Service', type: 'service', connections: [] },
  ],
  lastUpdated: '2023-05-15T10:00:00Z',
  version: '1.2.0',
};

const mockErrorResponse = {
  response: {
    data: {
      message: 'Failed to save architecture',
      errors: ['Invalid component connection'],
    },
    status: 400,
  },
};

const renderWithProviders = (ui: React.ReactElement, { route = '/architectures/123' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <NotificationProvider>
          <ArchitectureContext.Provider
            value={{
              architectures: [mockArchitectureData],
              currentArchitecture: mockArchitectureData,
              setCurrentArchitecture: jest.fn(),
              saveArchitecture: jest.fn(),
              loading: false,
              error: null,
              setError: jest.fn(),
            }}
          >
            <Routes>
              <Route path="/architectures/:id" element={ui} />
            </Routes>
          </ArchitectureContext.Provider>
        </NotificationProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
  });

  describe('Initial Render', () => {
    it('should render loading state initially when data is being fetched', async () => {
      (axios.get as jest.Mock).mockImplementationOnce(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockArchitectureData }), 200))
      );

      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('should render architecture name and description', async () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
      expect(screen.getByText('Modern scalable architecture')).toBeInTheDocument();
    });

    it('should render all components in the architecture diagram', async () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByText('API Gateway')).toBeInTheDocument();
      expect(screen.getByText('User Service')).toBeInTheDocument();
    });

    it('should display version information', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByText('Version: 1.2.0')).toBeInTheDocument();
      expect(screen.getByText('Last updated: 05/15/2023')).toBeInTheDocument();
    });
  });

  describe('Component Interactions', () => {
    it('should allow adding a new component', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText('Add New Component')).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText('Component Name');
      const typeSelect = within(modal).getByLabelText('Component Type');
      const submitButton = within(modal).getByRole('button', { name: /save/i });

      await user.type(nameInput, 'Auth Service');
      await user.selectOptions(typeSelect, 'service');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Auth Service')).toBeInTheDocument();
      });
    });

    it('should validate component name before submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const submitButton = within(screen.getByRole('dialog')).getByRole('button', { name: /save/i });
      await user.click(submitButton);

      expect(await screen.findByText('Component name is required')).toBeInTheDocument();
    });

    it('should allow editing an existing component', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      const editButtons = screen.getAllByRole('button', { name: /edit component/i });
      await user.click(editButtons[0]);

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText('Edit Component')).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText('Component Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated API Gateway');

      const submitButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Updated API Gateway')).toBeInTheDocument();
      });
    });

    it('should allow deleting a component with confirmation', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn(() => true);

      renderWithProviders(<DesignArchitecture />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete component/i });
      await user.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete API Gateway?');
      await waitFor(() => {
        expect(screen.queryByText('API Gateway')).not.toBeInTheDocument();
      });
    });

    it('should cancel deletion when user declines confirmation', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn(() => false);

      renderWithProviders(<DesignArchitecture />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete component/i });
      await user.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalled();
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
    });

    it('should allow creating connections between components', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      const connectButtons = screen.getAllByRole('button', { name: /connect/i });
      await user.click(connectButtons[0]);

      const modal = screen.getByRole('dialog');
      const targetSelect = within(modal).getByLabelText('Target Component');
      await user.selectOptions(targetSelect, 'comp-2');

      const submitButton = within(modal).getByRole('button', { name: /connect/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('connection-comp-1-comp-2')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when failing to load architecture', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load architecture/i)).toBeInTheDocument();
      });
    });

    it('should display error message when failing to save architecture', async () => {
      const user = userEvent.setup();
      (axios.put as jest.Mock).mockRejectedValueOnce(mockErrorResponse);

      renderWithProviders(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to save architecture')).toBeInTheDocument();
        expect(screen.getByText('Invalid component connection')).toBeInTheDocument();
      });
    });

    it('should handle empty architecture data gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: null });

      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/no architecture data available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', () => {
      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      expect(addButton).toHaveAttribute('aria-label', 'Add new component');

      const components = screen.getAllByRole('region', { name: /component/i });
      expect(components.length).toBeGreaterThan(0);
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      await user.tab();
      expect(screen.getByRole('button', { name: /add component/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      renderWithProviders(<DesignArchitecture />);

      const heading = screen.getByRole('heading', { name: /microservices architecture/i });
      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');

      const componentNames = screen.getAllByTestId('component-name');
      componentNames.forEach(name => {
        expect(name).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      });
    });

    it('should provide screen reader announcements for dynamic content', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent('Add component dialog opened');
    });
  });

  describe('State Management', () => {
    it('should update the diagram when components are modified', async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(<DesignArchitecture />);

      const initialSvg = container.querySelector('svg');
      const initialSvgContent = initialSvg?.innerHTML;

      const editButtons = screen.getAllByRole('button', { name: /edit component/i });
      await user.click(editButtons[0]);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText('Component Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated API Gateway');

      const submitButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        const updatedSvg = container.querySelector('svg');
        expect(updatedSvg?.innerHTML).not.toEqual(initialSvgContent);
      });
    });

    it('should maintain connection state when components are moved', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      // Simulate drag and drop
      const component1 = screen.getByText('API Gateway');
      const component2 = screen.getByText('User Service');

      fireEvent.dragStart(component1);
      fireEvent.dragEnter(component2);
      fireEvent.dragOver(component2);
      fireEvent.drop(component2);
      fireEvent.dragEnd(component1);

      await waitFor(() => {
        expect(screen.getByTestId('connection-comp-1-comp-2')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation and Routing', () => {
    it('should navigate to architecture list when back button is clicked', async () => {
      const user = userEvent.setup();
      require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);

      renderWithProviders(<DesignArchitecture />);

      const backButton = screen.getByRole('button', { name: /back to architectures/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/architectures');
    });

    it('should handle invalid architecture ID in URL', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce({
        response: { status: 404, data: { message: 'Architecture not found' } }
      });

      renderWithProviders(<DesignArchitecture />, { route: '/architectures/invalid-id' });

      await waitFor(() => {
        expect(screen.getByText(/architecture not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when unrelated state changes', () => {
      const { rerender } = renderWithProviders(<DesignArchitecture />);

      const initialRender = screen.getByText('Microservices Architecture');
      rerender(
        <MemoryRouter initialEntries={['/architectures/123']}>
          <AuthProvider>
            <NotificationProvider>
              <ArchitectureContext.Provider
                value={{
                  ...mockArchitectureData,
                  loading: true, // Unrelated loading state
                }}
              >
                <Routes>
                  <Route path="/architectures/:id" element={<DesignArchitecture />} />
                </Routes>
              </ArchitectureContext.Provider>
            </NotificationProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Microservices Architecture')).toBe(initialRender);
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { ArchitectureContext } from '../../context/ArchitectureContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('../../hooks/useApi', () => ({
  useApi: jest.fn(),
}));

const mockNavigate = jest.fn();

const mockArchitectureData = {
  id: 'arch-123',
  name: 'Microservices Architecture',
  description: 'Modern scalable architecture',
  components: [
    { id: 'comp-1', name: 'API Gateway', type: 'gateway', connections: ['comp-2'] },
    { id: 'comp-2', name: 'User Service', type: 'service', connections: [] },
  ],
  lastUpdated: '2023-05-15T10:00:00Z',
  version: '1.2.0',
};

const mockErrorResponse = {
  response: {
    data: {
      message: 'Failed to save architecture',
      errors: ['Invalid component connection'],
    },
    status: 400,
  },
};

const renderWithProviders = (ui: React.ReactElement, { route = '/architectures/123' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <NotificationProvider>
          <ArchitectureContext.Provider
            value={{
              architectures: [mockArchitectureData],
              currentArchitecture: mockArchitectureData,
              setCurrentArchitecture: jest.fn(),
              saveArchitecture: jest.fn(),
              loading: false,
              error: null,
              setError: jest.fn(),
            }}
          >
            <Routes>
              <Route path="/architectures/:id" element={ui} />
            </Routes>
          </ArchitectureContext.Provider>
        </NotificationProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
  });

  describe('Initial Render', () => {
    it('should render loading state initially when data is being fetched', async () => {
      (axios.get as jest.Mock).mockImplementationOnce(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockArchitectureData }), 200))
      );

      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('should render architecture name and description', async () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
      expect(screen.getByText('Modern scalable architecture')).toBeInTheDocument();
    });

    it('should render all components in the architecture diagram', async () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByText('API Gateway')).toBeInTheDocument();
      expect(screen.getByText('User Service')).toBeInTheDocument();
    });

    it('should display version information', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByText('Version: 1.2.0')).toBeInTheDocument();
      expect(screen.getByText('Last updated: 05/15/2023')).toBeInTheDocument();
    });
  });

  describe('Component Interactions', () => {
    it('should allow adding a new component', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText('Add New Component')).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText('Component Name');
      const typeSelect = within(modal).getByLabelText('Component Type');
      const submitButton = within(modal).getByRole('button', { name: /save/i });

      await user.type(nameInput, 'Auth Service');
      await user.selectOptions(typeSelect, 'service');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Auth Service')).toBeInTheDocument();
      });
    });

    it('should validate component name before submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const submitButton = within(screen.getByRole('dialog')).getByRole('button', { name: /save/i });
      await user.click(submitButton);

      expect(await screen.findByText('Component name is required')).toBeInTheDocument();
    });

    it('should allow editing an existing component', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      const editButtons = screen.getAllByRole('button', { name: /edit component/i });
      await user.click(editButtons[0]);

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText('Edit Component')).toBeInTheDocument();

      const nameInput = within(modal).getByLabelText('Component Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated API Gateway');

      const submitButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Updated API Gateway')).toBeInTheDocument();
      });
    });

    it('should allow deleting a component with confirmation', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn(() => true);

      renderWithProviders(<DesignArchitecture />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete component/i });
      await user.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete API Gateway?');
      await waitFor(() => {
        expect(screen.queryByText('API Gateway')).not.toBeInTheDocument();
      });
    });

    it('should cancel deletion when user declines confirmation', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn(() => false);

      renderWithProviders(<DesignArchitecture />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete component/i });
      await user.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalled();
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
    });

    it('should allow creating connections between components', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      const connectButtons = screen.getAllByRole('button', { name: /connect/i });
      await user.click(connectButtons[0]);

      const modal = screen.getByRole('dialog');
      const targetSelect = within(modal).getByLabelText('Target Component');
      await user.selectOptions(targetSelect, 'comp-2');

      const submitButton = within(modal).getByRole('button', { name: /connect/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('connection-comp-1-comp-2')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when failing to load architecture', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load architecture/i)).toBeInTheDocument();
      });
    });

    it('should display error message when failing to save architecture', async () => {
      const user = userEvent.setup();
      (axios.put as jest.Mock).mockRejectedValueOnce(mockErrorResponse);

      renderWithProviders(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to save architecture')).toBeInTheDocument();
        expect(screen.getByText('Invalid component connection')).toBeInTheDocument();
      });
    });

    it('should handle empty architecture data gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: null });

      renderWithProviders(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/no architecture data available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', () => {
      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      expect(addButton).toHaveAttribute('aria-label', 'Add new component');

      const components = screen.getAllByRole('region', { name: /component/i });
      expect(components.length).toBeGreaterThan(0);
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      await user.tab();
      expect(screen.getByRole('button', { name: /add component/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      renderWithProviders(<DesignArchitecture />);

      const heading = screen.getByRole('heading', { name: /microservices architecture/i });
      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');

      const componentNames = screen.getAllByTestId('component-name');
      componentNames.forEach(name => {
        expect(name).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      });
    });

    it('should provide screen reader announcements for dynamic content', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      const addButton = screen.getByRole('button', { name: /add component/i });
      await user.click(addButton);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent('Add component dialog opened');
    });
  });

  describe('State Management', () => {
    it('should update the diagram when components are modified', async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(<DesignArchitecture />);

      const initialSvg = container.querySelector('svg');
      const initialSvgContent = initialSvg?.innerHTML;

      const editButtons = screen.getAllByRole('button', { name: /edit component/i });
      await user.click(editButtons[0]);

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText('Component Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated API Gateway');

      const submitButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        const updatedSvg = container.querySelector('svg');
        expect(updatedSvg?.innerHTML).not.toEqual(initialSvgContent);
      });
    });

    it('should maintain connection state when components are moved', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      // Simulate drag and drop
      const component1 = screen.getByText('API Gateway');
      const component2 = screen.getByText('User Service');

      fireEvent.dragStart(component1);
      fireEvent.dragEnter(component2);
      fireEvent.dragOver(component2);
      fireEvent.drop(component2);
      fireEvent.dragEnd(component1);

      await waitFor(() => {
        expect(screen.getByTestId('connection-comp-1-comp-2')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation and Routing', () => {
    it('should navigate to architecture list when back button is clicked', async () => {
      const user = userEvent.setup();
      require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);

      renderWithProviders(<DesignArchitecture />);

      const backButton = screen.getByRole('button', { name: /back to architectures/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/architectures');
    });

    it('should handle invalid architecture ID in URL', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce({
        response: { status: 404, data: { message: 'Architecture not found' } }
      });

      renderWithProviders(<DesignArchitecture />, { route: '/architectures/invalid-id' });

      await waitFor(() => {
        expect(screen.getByText(/architecture not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when unrelated state changes', () => {
      const { rerender } = renderWithProviders(<DesignArchitecture />);

      const initialRender = screen.getByText('Microservices Architecture');
      rerender(
        <MemoryRouter initialEntries={['/architectures/123']}>
          <AuthProvider>
            <NotificationProvider>
              <ArchitectureContext.Provider
                value={{
                  ...mockArchitectureData,
                  loading: true, // Unrelated loading state
                }}
              >
                <Routes>
                  <Route path="/architectures/:id" element={<DesignArchitecture />} />
                </Routes>
              </ArchitectureContext.Provider>
            </NotificationProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Microservices Architecture')).toBe(initialRender);
    });
  });
});