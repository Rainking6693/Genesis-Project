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

const renderWithProviders = (ui: React.ReactElement, { route = '/', ...renderOptions } = {}) => {
  window.history.pushState({}, 'Test Page', route);

  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <NotificationContext.Provider value={mockNotificationContext}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/" element={ui} />
            <Route path="/success" element={<div>Success Page</div>} />
            <Route path="/error" element={<div>Error Page</div>} />
          </Routes>
        </MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>,
    renderOptions
  );
};

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: [] });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', async () => {
      (axios.get as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: [] }), 1000))
      );

      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('should render main content after data loads', async () => {
      const mockData = [
        { id: '1', name: 'Test Item 1', status: 'active' },
        { id: '2', name: 'Test Item 2', status: 'inactive' },
      ];

      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

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
    const mockData = [
      { id: '1', name: 'Test Item 1', status: 'active', description: 'Test description' },
      { id: '2', name: 'Test Item 2', status: 'inactive', description: 'Another description' },
    ];

    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
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

    it('should allow sorting by name', async () => {
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

    it('should open and close item details modal', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
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

      const createButton = screen.getByRole('button', { name: /create new item/i });
      await userEvent.click(createButton);

      const nameInput = screen.getByLabelText(/name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await userEvent.type(nameInput, 'New Item');
      await userEvent.type(descriptionInput, 'New description');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ name: 'New Item' }),
          expect.any(Object)
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });

    it('should handle item update', async () => {
      (axios.put as jest.Mock).mockResolvedValue({ data: { id: '1', name: 'Updated Item' } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Item');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/1'),
          expect.objectContaining({ name: 'Updated Item' }),
          expect.any(Object)
        );
      });
    });

    it('should handle item deletion with confirmation', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.any(Object));
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API fetch error', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to load items',
          })
        );
      });
    });

    it('should handle item creation error', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Creation failed'));

      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new item/i });
      await userEvent.click(createButton);

      const nameInput = screen.getByLabelText(/name/i);
      await userEvent.type(nameInput, 'New Item');

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to create item',
          })
        );
      });
    });

    it('should handle form validation errors', async () => {
      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new item/i });
      await userEvent.click(createButton);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);

      expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for loading state', async () => {
      (axios.get as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: [] }), 1000))
      );

      renderWithProviders(<CoreFunctionality />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-busy', 'true');
      expect(progressBar).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper ARIA attributes for modal dialogs', async () => {
      const mockData = [{ id: '1', name: 'Test Item', description: 'Test' }];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument();
      });

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', expect.any(String));
    });

    it('should be navigable via keyboard', async () => {
      const mockData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox');
      searchInput.focus();
      await userEvent.type(searchInput, 'Item 1');

      const firstRow = screen.getByText('Item 1').closest('tr');
      expect(firstRow).toHaveFocus();

      await userEvent.tab();
      const editButton = screen.getByRole('button', { name: /edit/i });
      expect(editButton).toHaveFocus();
    });
  });

  describe('Authentication and Authorization', () => {
    it('should redirect unauthenticated users', () => {
      const unauthMock = {
        ...mockAuthContext,
        isAuthenticated: false,
      };

      render(
        <AuthContext.Provider value={unauthMock}>
          <MemoryRouter>
            <CoreFunctionality />
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should disable admin-only features for non-admin users', async () => {
      const nonAdminMock = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'user' },
      };

      const mockData = [{ id: '1', name: 'Test Item' }];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      render(
        <AuthContext.Provider value={nonAdminMock}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <MemoryRouter>
              <CoreFunctionality />
            </MemoryRouter>
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument();
      });

      const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(0);
    });
  });

  describe('Pagination', () => {
    it('should handle pagination controls', async () => {
      const mockData = Array.from({ length: 25 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Item ${i + 1}`,
      }));

      (axios.get as jest.Mock).mockResolvedValue({
        data: mockData,
        headers: { 'x-total-count': '25' },
      });

      renderWithProviders(<CoreFunctionality />, { route: '/?page=1&pageSize=10' });

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 10')).toBeInTheDocument();
        expect(screen.queryByText('Item 11')).not.toBeInTheDocument();
      });

      const nextPageButton = screen.getByRole('button', { name: /next page/i });
      await userEvent.click(nextPageButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
          params: { page: 2, pageSize: 10 }
        }));
      });
    });

    it('should disable pagination buttons appropriately', async () => {
      const mockData = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Item ${i + 1}`,
      }));

      (axios.get as jest.Mock).mockResolvedValue({
        data: mockData,
        headers: { 'x-total-count': '5' },
      });

      renderWithProviders(<CoreFunctionality />, { route: '/?page=1&pageSize=10' });

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous page/i });
        const nextButton = screen.getByRole('button', { name: /next page/i });

        expect(prevButton).toBeDisabled();
        expect(nextButton).toBeDisabled();
      });
    });
  });

  describe('Performance', () => {
    it('should debounce search input', async () => {
      jest.useFakeTimers();

      const mockData = [{ id: '1', name: 'Test Item' }];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'test');

      act(() => {
        jest.advanceTimersByTime(300);
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

const renderWithProviders = (ui: React.ReactElement, { route = '/', ...renderOptions } = {}) => {
  window.history.pushState({}, 'Test Page', route);

  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <NotificationContext.Provider value={mockNotificationContext}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/" element={ui} />
            <Route path="/success" element={<div>Success Page</div>} />
            <Route path="/error" element={<div>Error Page</div>} />
          </Routes>
        </MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>,
    renderOptions
  );
};

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: [] });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', async () => {
      (axios.get as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: [] }), 1000))
      );

      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('should render main content after data loads', async () => {
      const mockData = [
        { id: '1', name: 'Test Item 1', status: 'active' },
        { id: '2', name: 'Test Item 2', status: 'inactive' },
      ];

      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

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
    const mockData = [
      { id: '1', name: 'Test Item 1', status: 'active', description: 'Test description' },
      { id: '2', name: 'Test Item 2', status: 'inactive', description: 'Another description' },
    ];

    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
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

    it('should allow sorting by name', async () => {
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

    it('should open and close item details modal', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
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

      const createButton = screen.getByRole('button', { name: /create new item/i });
      await userEvent.click(createButton);

      const nameInput = screen.getByLabelText(/name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await userEvent.type(nameInput, 'New Item');
      await userEvent.type(descriptionInput, 'New description');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ name: 'New Item' }),
          expect.any(Object)
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });

    it('should handle item update', async () => {
      (axios.put as jest.Mock).mockResolvedValue({ data: { id: '1', name: 'Updated Item' } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await userEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Item');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/1'),
          expect.objectContaining({ name: 'Updated Item' }),
          expect.any(Object)
        );
      });
    });

    it('should handle item deletion with confirmation', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await userEvent.click(deleteButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.any(Object));
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API fetch error', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to load items',
          })
        );
      });
    });

    it('should handle item creation error', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Creation failed'));

      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new item/i });
      await userEvent.click(createButton);

      const nameInput = screen.getByLabelText(/name/i);
      await userEvent.type(nameInput, 'New Item');

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to create item',
          })
        );
      });
    });

    it('should handle form validation errors', async () => {
      renderWithProviders(<CoreFunctionality />);

      const createButton = screen.getByRole('button', { name: /create new item/i });
      await userEvent.click(createButton);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);

      expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for loading state', async () => {
      (axios.get as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: [] }), 1000))
      );

      renderWithProviders(<CoreFunctionality />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-busy', 'true');
      expect(progressBar).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper ARIA attributes for modal dialogs', async () => {
      const mockData = [{ id: '1', name: 'Test Item', description: 'Test' }];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument();
      });

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', expect.any(String));
    });

    it('should be navigable via keyboard', async () => {
      const mockData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox');
      searchInput.focus();
      await userEvent.type(searchInput, 'Item 1');

      const firstRow = screen.getByText('Item 1').closest('tr');
      expect(firstRow).toHaveFocus();

      await userEvent.tab();
      const editButton = screen.getByRole('button', { name: /edit/i });
      expect(editButton).toHaveFocus();
    });
  });

  describe('Authentication and Authorization', () => {
    it('should redirect unauthenticated users', () => {
      const unauthMock = {
        ...mockAuthContext,
        isAuthenticated: false,
      };

      render(
        <AuthContext.Provider value={unauthMock}>
          <MemoryRouter>
            <CoreFunctionality />
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should disable admin-only features for non-admin users', async () => {
      const nonAdminMock = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'user' },
      };

      const mockData = [{ id: '1', name: 'Test Item' }];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      render(
        <AuthContext.Provider value={nonAdminMock}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <MemoryRouter>
              <CoreFunctionality />
            </MemoryRouter>
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument();
      });

      const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(0);
    });
  });

  describe('Pagination', () => {
    it('should handle pagination controls', async () => {
      const mockData = Array.from({ length: 25 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Item ${i + 1}`,
      }));

      (axios.get as jest.Mock).mockResolvedValue({
        data: mockData,
        headers: { 'x-total-count': '25' },
      });

      renderWithProviders(<CoreFunctionality />, { route: '/?page=1&pageSize=10' });

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 10')).toBeInTheDocument();
        expect(screen.queryByText('Item 11')).not.toBeInTheDocument();
      });

      const nextPageButton = screen.getByRole('button', { name: /next page/i });
      await userEvent.click(nextPageButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
          params: { page: 2, pageSize: 10 }
        }));
      });
    });

    it('should disable pagination buttons appropriately', async () => {
      const mockData = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Item ${i + 1}`,
      }));

      (axios.get as jest.Mock).mockResolvedValue({
        data: mockData,
        headers: { 'x-total-count': '5' },
      });

      renderWithProviders(<CoreFunctionality />, { route: '/?page=1&pageSize=10' });

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous page/i });
        const nextButton = screen.getByRole('button', { name: /next page/i });

        expect(prevButton).toBeDisabled();
        expect(nextButton).toBeDisabled();
      });
    });
  });

  describe('Performance', () => {
    it('should debounce search input', async () => {
      jest.useFakeTimers();

      const mockData = [{ id: '1', name: 'Test Item' }];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

      renderWithProviders(<CoreFunctionality />);

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'test');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });
  });
});