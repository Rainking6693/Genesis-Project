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

jest.mock('../../hooks/useApi', () => ({
  useApi: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }),
}));

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
        <MemoryRouter>
          <Routes>
            <Route path="/" element={ui} />
            <Route path="/success" element={<div>Success Page</div>} />
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
      (axios.get as jest.Mock).mockResolvedValue({
        data: [
          { id: '1', name: 'Test Item 1' },
          { id: '2', name: 'Test Item 2' },
        ],
      });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.getByText('Test Item 2')).toBeInTheDocument();
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

  describe('User Interactions', () => {
    const mockItems = [
      { id: '1', name: 'Test Item 1', status: 'active' },
      { id: '2', name: 'Test Item 2', status: 'inactive' },
    ];

    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockItems });
    });

    it('should allow searching items', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'Test Item 1');

      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
    });

    it('should allow filtering by status', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const filterSelect = screen.getByRole('combobox', { name: /filter by status/i });
      await userEvent.selectOptions(filterSelect, 'active');

      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
    });

    it('should allow sorting items', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const sortButton = screen.getByRole('button', { name: /sort by name/i });
      await userEvent.click(sortButton);

      const items = screen.getAllByRole('row');
      expect(within(items[1]).getByText('Test Item 1')).toBeInTheDocument();
      expect(within(items[2]).getByText('Test Item 2')).toBeInTheDocument();
    });

    it('should open and close the create modal', async () => {
      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new/i });
      await userEvent.click(createButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/create new item/i)).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should create a new item successfully', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { id: '3', name: 'New Item', status: 'active' },
      });

      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new/i });
      await userEvent.click(createButton);

      await userEvent.type(screen.getByLabelText(/name/i), 'New Item');
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'active');

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          { name: 'New Item', status: 'active' },
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });

    it('should show error when item creation fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Creation failed'));

      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new/i });
      await userEvent.click(createButton);

      await userEvent.type(screen.getByLabelText(/name/i), 'New Item');
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'active');

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error' })
        );
      });
    });

    it('should open and close the edit modal', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/edit item/i)).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should update an item successfully', async () => {
      (axios.put as jest.Mock).mockResolvedValue({
        data: { id: '1', name: 'Updated Item', status: 'inactive' },
      });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);

      await userEvent.clear(screen.getByLabelText(/name/i));
      await userEvent.type(screen.getByLabelText(/name/i), 'Updated Item');
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'inactive');

      const submitButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/1'),
          { name: 'Updated Item', status: 'inactive' },
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });

    it('should show error when item update fails', async () => {
      (axios.put as jest.Mock).mockRejectedValue(new Error('Update failed'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);

      await userEvent.clear(screen.getByLabelText(/name/i));
      await userEvent.type(screen.getByLabelText(/name/i), 'Updated Item');

      const submitButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error' })
        );
      });
    });

    it('should delete an item successfully', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/1'), {
          headers: { Authorization: 'Bearer test-token' },
        });
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });

    it('should show error when item deletion fails', async () => {
      (axios.delete as jest.Mock).mockRejectedValue(new Error('Deletion failed'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error' })
        );
      });
    });
  });

  describe('Pagination', () => {
    it('should handle pagination controls', async () => {
      const mockPaginatedData = {
        data: Array.from({ length: 15 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Item ${i + 1}`,
        })),
        total: 20,
        page: 1,
        limit: 10,
      };

      (axios.get as jest.Mock).mockResolvedValue({ data: mockPaginatedData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 10')).toBeInTheDocument();
      });

      const nextPageButton = screen.getByRole('button', { name: /next page/i });
      await userEvent.click(nextPageButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
          params: expect.objectContaining({ page: 2 }),
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', /search/i);
        expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', /filter by status/i);
        expect(screen.getByRole('table')).toHaveAttribute('aria-label', /items list/i);
      });
    });

    it('should be navigable via keyboard', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox');
      searchInput.focus();
      fireEvent.keyDown(searchInput, { key: 'Tab' });

      const filterSelect = screen.getByRole('combobox');
      expect(filterSelect).toHaveFocus();
    });

    it('should have proper focus management in modals', async () => {
      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toHaveFocus();

        const firstInput = screen.getByLabelText(/name/i);
        expect(firstInput).toHaveFocus();
      });
    });
  });

  describe('Authentication', () => {
    it('should redirect to login when not authenticated', () => {
      const unauthenticatedContext = {
        ...mockAuthContext,
        isAuthenticated: false,
      };

      render(
        <AuthContext.Provider value={unauthenticatedContext}>
          <MemoryRouter>
            <CoreFunctionality />
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should disable actions for non-admin users', async () => {
      const nonAdminContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'user' },
      };

      render(
        <AuthContext.Provider value={nonAdminContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <MemoryRouter>
              <CoreFunctionality />
            </MemoryRouter>
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /create new/i })).not.toBeInTheDocument();
        expect(screen.queryAllByRole('button', { name: /delete/i })).toHaveLength(0);
      });
    });
  });

  describe('Performance', () => {
    it('should debounce search input', async () => {
      jest.useFakeTimers();

      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'test');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
          params: expect.objectContaining({ search: 'test' }),
        });
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

jest.mock('../../hooks/useApi', () => ({
  useApi: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }),
}));

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
        <MemoryRouter>
          <Routes>
            <Route path="/" element={ui} />
            <Route path="/success" element={<div>Success Page</div>} />
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
      (axios.get as jest.Mock).mockResolvedValue({
        data: [
          { id: '1', name: 'Test Item 1' },
          { id: '2', name: 'Test Item 2' },
        ],
      });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.getByText('Test Item 2')).toBeInTheDocument();
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

  describe('User Interactions', () => {
    const mockItems = [
      { id: '1', name: 'Test Item 1', status: 'active' },
      { id: '2', name: 'Test Item 2', status: 'inactive' },
    ];

    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockItems });
    });

    it('should allow searching items', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'Test Item 1');

      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
    });

    it('should allow filtering by status', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const filterSelect = screen.getByRole('combobox', { name: /filter by status/i });
      await userEvent.selectOptions(filterSelect, 'active');

      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
    });

    it('should allow sorting items', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const sortButton = screen.getByRole('button', { name: /sort by name/i });
      await userEvent.click(sortButton);

      const items = screen.getAllByRole('row');
      expect(within(items[1]).getByText('Test Item 1')).toBeInTheDocument();
      expect(within(items[2]).getByText('Test Item 2')).toBeInTheDocument();
    });

    it('should open and close the create modal', async () => {
      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new/i });
      await userEvent.click(createButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/create new item/i)).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should create a new item successfully', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { id: '3', name: 'New Item', status: 'active' },
      });

      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new/i });
      await userEvent.click(createButton);

      await userEvent.type(screen.getByLabelText(/name/i), 'New Item');
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'active');

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          { name: 'New Item', status: 'active' },
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });

    it('should show error when item creation fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Creation failed'));

      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new/i });
      await userEvent.click(createButton);

      await userEvent.type(screen.getByLabelText(/name/i), 'New Item');
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'active');

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error' })
        );
      });
    });

    it('should open and close the edit modal', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/edit item/i)).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should update an item successfully', async () => {
      (axios.put as jest.Mock).mockResolvedValue({
        data: { id: '1', name: 'Updated Item', status: 'inactive' },
      });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);

      await userEvent.clear(screen.getByLabelText(/name/i));
      await userEvent.type(screen.getByLabelText(/name/i), 'Updated Item');
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'inactive');

      const submitButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/1'),
          { name: 'Updated Item', status: 'inactive' },
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });

    it('should show error when item update fails', async () => {
      (axios.put as jest.Mock).mockRejectedValue(new Error('Update failed'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);

      await userEvent.clear(screen.getByLabelText(/name/i));
      await userEvent.type(screen.getByLabelText(/name/i), 'Updated Item');

      const submitButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error' })
        );
      });
    });

    it('should delete an item successfully', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/1'), {
          headers: { Authorization: 'Bearer test-token' },
        });
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });

    it('should show error when item deletion fails', async () => {
      (axios.delete as jest.Mock).mockRejectedValue(new Error('Deletion failed'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error' })
        );
      });
    });
  });

  describe('Pagination', () => {
    it('should handle pagination controls', async () => {
      const mockPaginatedData = {
        data: Array.from({ length: 15 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Item ${i + 1}`,
        })),
        total: 20,
        page: 1,
        limit: 10,
      };

      (axios.get as jest.Mock).mockResolvedValue({ data: mockPaginatedData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 10')).toBeInTheDocument();
      });

      const nextPageButton = screen.getByRole('button', { name: /next page/i });
      await userEvent.click(nextPageButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
          params: expect.objectContaining({ page: 2 }),
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', /search/i);
        expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', /filter by status/i);
        expect(screen.getByRole('table')).toHaveAttribute('aria-label', /items list/i);
      });
    });

    it('should be navigable via keyboard', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox');
      searchInput.focus();
      fireEvent.keyDown(searchInput, { key: 'Tab' });

      const filterSelect = screen.getByRole('combobox');
      expect(filterSelect).toHaveFocus();
    });

    it('should have proper focus management in modals', async () => {
      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toHaveFocus();

        const firstInput = screen.getByLabelText(/name/i);
        expect(firstInput).toHaveFocus();
      });
    });
  });

  describe('Authentication', () => {
    it('should redirect to login when not authenticated', () => {
      const unauthenticatedContext = {
        ...mockAuthContext,
        isAuthenticated: false,
      };

      render(
        <AuthContext.Provider value={unauthenticatedContext}>
          <MemoryRouter>
            <CoreFunctionality />
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should disable actions for non-admin users', async () => {
      const nonAdminContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'user' },
      };

      render(
        <AuthContext.Provider value={nonAdminContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <MemoryRouter>
              <CoreFunctionality />
            </MemoryRouter>
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /create new/i })).not.toBeInTheDocument();
        expect(screen.queryAllByRole('button', { name: /delete/i })).toHaveLength(0);
      });
    });
  });

  describe('Performance', () => {
    it('should debounce search input', async () => {
      jest.useFakeTimers();

      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'test');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
          params: expect.objectContaining({ search: 'test' }),
        });
      });

      jest.useRealTimers();
    });
  });
});