import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act } from 'react-dom/test-utils';
import CoreFunctionality from './CoreFunctionality';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();

const mockAuthContext = {
  user: { id: '123', role: 'admin', token: 'test-token' },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
};

const mockNotificationContext = {
  showNotification: jest.fn(),
  clearNotification: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <NotificationContext.Provider value={mockNotificationContext}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={ui} />
            <Route path="/error" element={<div>Error Page</div>} />
          </Routes>
        </MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: [] });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', async () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render main content after data loads', async () => {
      const mockData = [
        { id: '1', name: 'Item 1', status: 'active' },
        { id: '2', name: 'Item 2', status: 'inactive' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
    });

    it('should handle empty data state', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no items found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch data on component mount', async () => {
      const mockData = [{ id: '1', name: 'Test Item' }];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/api/items'),
          expect.objectContaining({
            headers: { Authorization: 'Bearer test-token' },
          })
        );
      });
    });

    it('should handle API error gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to fetch items',
          })
        );
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
      });
    });

    it('should handle 401 unauthorized error', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } },
      });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockAuthContext.logout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('User Interactions', () => {
    const mockData = [
      { id: '1', name: 'Item 1', status: 'active', description: 'Test description' },
      { id: '2', name: 'Item 2', status: 'inactive', description: 'Another description' },
    ];

    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
    });

    it('should allow searching items', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'Item 1');

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    });

    it('should allow sorting by name', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      await userEvent.click(nameHeader);

      // Verify sort indicator appears
      expect(within(nameHeader).getByTestId('sort-icon')).toBeInTheDocument();
    });

    it('should open and close item details modal', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByRole('button', { name: /view details/i });
      await userEvent.click(viewButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should handle item creation', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { id: '3', name: 'New Item' } });

      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new/i });
      await userEvent.click(createButton);

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await userEvent.type(nameInput, 'New Item');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/api/items'),
          { name: 'New Item' },
          expect.any(Object)
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item created successfully',
          })
        );
      });
    });

    it('should handle item update', async () => {
      (axios.put as jest.Mock).mockResolvedValue({ data: { id: '1', name: 'Updated Item' } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Item 1');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Item');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/api/items/1'),
          { name: 'Updated Item' },
          expect.any(Object)
        );
      });
    });

    it('should handle item deletion', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          expect.stringContaining('/api/items/1'),
          expect.any(Object)
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item deleted successfully',
          })
        );
      });
    });

    it('should handle form validation errors', async () => {
      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new/i });
      await userEvent.click(createButton);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);

      expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should handle pagination controls', async () => {
      const mockData = Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Item ${i + 1}`,
      }));
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      // Check if pagination controls are present
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();

      // Click next page
      const nextButton = screen.getByRole('button', { name: /next/i });
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Item 11')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      const mockData = [
        { id: '1', name: 'Item 1', status: 'active' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toHaveAccessibleName();
        expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute('aria-sort', 'none');
        expect(screen.getByRole('button', { name: /create new/i })).toHaveAccessibleName();
      });
    });

    it('should be navigable via keyboard', async () => {
      const mockData = [
        { id: '1', name: 'Item 1', status: 'active' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      // Tab through interactive elements
      const createButton = screen.getByRole('button', { name: /create new/i });
      createButton.focus();
      fireEvent.keyDown(createButton, { key: 'Enter', code: 'Enter' });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have proper focus management in modals', async () => {
      const mockData = [
        { id: '1', name: 'Item 1', status: 'active' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();

      const closeButton = within(modal).getByRole('button', { name: /close/i });
      await userEvent.tab();
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component rendering errors', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const OriginalComponent = CoreFunctionality;
      const ErrorThrowingComponent = () => {
        throw new Error('Test error');
        return <OriginalComponent />;
      };

      renderWithProviders(<ErrorThrowingComponent />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      console.error.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should debounce search input', async () => {
      jest.useFakeTimers();

      renderWithProviders(<CoreFunctionality />);

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'test');

      // Fast-forward time
      act(() => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act } from 'react-dom/test-utils';
import CoreFunctionality from './CoreFunctionality';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();

const mockAuthContext = {
  user: { id: '123', role: 'admin', token: 'test-token' },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
};

const mockNotificationContext = {
  showNotification: jest.fn(),
  clearNotification: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <NotificationContext.Provider value={mockNotificationContext}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={ui} />
            <Route path="/error" element={<div>Error Page</div>} />
          </Routes>
        </MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: [] });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', async () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render main content after data loads', async () => {
      const mockData = [
        { id: '1', name: 'Item 1', status: 'active' },
        { id: '2', name: 'Item 2', status: 'inactive' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
    });

    it('should handle empty data state', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no items found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch data on component mount', async () => {
      const mockData = [{ id: '1', name: 'Test Item' }];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/api/items'),
          expect.objectContaining({
            headers: { Authorization: 'Bearer test-token' },
          })
        );
      });
    });

    it('should handle API error gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to fetch items',
          })
        );
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
      });
    });

    it('should handle 401 unauthorized error', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } },
      });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockAuthContext.logout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('User Interactions', () => {
    const mockData = [
      { id: '1', name: 'Item 1', status: 'active', description: 'Test description' },
      { id: '2', name: 'Item 2', status: 'inactive', description: 'Another description' },
    ];

    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
    });

    it('should allow searching items', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'Item 1');

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    });

    it('should allow sorting by name', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      await userEvent.click(nameHeader);

      // Verify sort indicator appears
      expect(within(nameHeader).getByTestId('sort-icon')).toBeInTheDocument();
    });

    it('should open and close item details modal', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByRole('button', { name: /view details/i });
      await userEvent.click(viewButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should handle item creation', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { id: '3', name: 'New Item' } });

      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new/i });
      await userEvent.click(createButton);

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await userEvent.type(nameInput, 'New Item');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/api/items'),
          { name: 'New Item' },
          expect.any(Object)
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item created successfully',
          })
        );
      });
    });

    it('should handle item update', async () => {
      (axios.put as jest.Mock).mockResolvedValue({ data: { id: '1', name: 'Updated Item' } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Item 1');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Item');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/api/items/1'),
          { name: 'Updated Item' },
          expect.any(Object)
        );
      });
    });

    it('should handle item deletion', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          expect.stringContaining('/api/items/1'),
          expect.any(Object)
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item deleted successfully',
          })
        );
      });
    });

    it('should handle form validation errors', async () => {
      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new/i });
      await userEvent.click(createButton);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);

      expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should handle pagination controls', async () => {
      const mockData = Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Item ${i + 1}`,
      }));
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      // Check if pagination controls are present
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();

      // Click next page
      const nextButton = screen.getByRole('button', { name: /next/i });
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Item 11')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      const mockData = [
        { id: '1', name: 'Item 1', status: 'active' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toHaveAccessibleName();
        expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute('aria-sort', 'none');
        expect(screen.getByRole('button', { name: /create new/i })).toHaveAccessibleName();
      });
    });

    it('should be navigable via keyboard', async () => {
      const mockData = [
        { id: '1', name: 'Item 1', status: 'active' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      // Tab through interactive elements
      const createButton = screen.getByRole('button', { name: /create new/i });
      createButton.focus();
      fireEvent.keyDown(createButton, { key: 'Enter', code: 'Enter' });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have proper focus management in modals', async () => {
      const mockData = [
        { id: '1', name: 'Item 1', status: 'active' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();

      const closeButton = within(modal).getByRole('button', { name: /close/i });
      await userEvent.tab();
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component rendering errors', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const OriginalComponent = CoreFunctionality;
      const ErrorThrowingComponent = () => {
        throw new Error('Test error');
        return <OriginalComponent />;
      };

      renderWithProviders(<ErrorThrowingComponent />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      console.error.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should debounce search input', async () => {
      jest.useFakeTimers();

      renderWithProviders(<CoreFunctionality />);

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'test');

      // Fast-forward time
      act(() => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });
  });
});