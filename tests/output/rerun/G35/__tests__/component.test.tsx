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

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
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
            <Route path="/details/:id" element={<div>Details Page</div>} />
          </Routes>
        </MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

describe('CoreFunctionality Component', () => {
  const mockData = [
    { id: '1', name: 'Item 1', status: 'active', value: 100 },
    { id: '2', name: 'Item 2', status: 'inactive', value: 200 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockData }), 1000))
      );

      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to load data',
          })
        );
      });
    });
  });

  describe('Data Display', () => {
    it('should render all items with correct information', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('inactive')).toBeInTheDocument();
      });
    });

    it('should display empty state when no data is available', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow filtering items by status', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });

      const filterSelect = screen.getByLabelText('Filter by status');
      fireEvent.change(filterSelect, { target: { value: 'active' } });

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    });

    it('should allow sorting items by value', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const items = screen.getAllByTestId('item-row');
        expect(within(items[0]).getByText('Item 1')).toBeInTheDocument();
        expect(within(items[1]).getByText('Item 2')).toBeInTheDocument();
      });

      const sortButton = screen.getByLabelText('Sort by value');
      fireEvent.click(sortButton);

      await waitFor(() => {
        const items = screen.getAllByTestId('item-row');
        expect(within(items[0]).getByText('Item 2')).toBeInTheDocument();
        expect(within(items[1]).getByText('Item 1')).toBeInTheDocument();
      });
    });

    it('should navigate to details page when item is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const item1 = screen.getByText('Item 1').closest('button');
        if (item1) {
          fireEvent.click(item1);
          expect(mockNavigate).toHaveBeenCalledWith('/details/1');
        }
      });
    });
  });

  describe('CRUD Operations', () => {
    it('should create a new item successfully', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { id: '3', name: 'New Item', status: 'active', value: 300 },
      });

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByLabelText('Add new item');
      fireEvent.click(addButton);

      const nameInput = screen.getByLabelText('Item name');
      const valueInput = screen.getByLabelText('Item value');
      const statusSelect = screen.getByLabelText('Item status');
      const submitButton = screen.getByText('Create');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'New Item' } });
        fireEvent.change(valueInput, { target: { value: '300' } });
        fireEvent.change(statusSelect, { target: { value: 'active' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          { name: 'New Item', status: 'active', value: 300 },
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item created successfully',
          })
        );
        expect(screen.getByText('New Item')).toBeInTheDocument();
      });
    });

    it('should show error when item creation fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Creation failed'));

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByLabelText('Add new item');
      fireEvent.click(addButton);

      const nameInput = screen.getByLabelText('Item name');
      const submitButton = screen.getByText('Create');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'New Item' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to create item',
          })
        );
      });
    });

    it('should update an item successfully', async () => {
      (axios.put as jest.Mock).mockResolvedValue({
        data: { id: '1', name: 'Updated Item', status: 'active', value: 150 },
      });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const editButtons = screen.getAllByLabelText('Edit item');
        fireEvent.click(editButtons[0]);
      });

      const nameInput = screen.getByLabelText('Item name');
      const valueInput = screen.getByLabelText('Item value');
      const submitButton = screen.getByText('Update');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Updated Item' } });
        fireEvent.change(valueInput, { target: { value: '150' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/1'),
          { name: 'Updated Item', status: 'active', value: 150 },
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item updated successfully',
          })
        );
        expect(screen.getByText('Updated Item')).toBeInTheDocument();
      });
    });

    it('should delete an item successfully', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText('Delete item');
        fireEvent.click(deleteButtons[0]);
      });

      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/1'), {
          headers: { Authorization: 'Bearer test-token' },
        });
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item deleted successfully',
          })
        );
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filter by status')).toHaveAttribute('aria-label');
        expect(screen.getByLabelText('Sort by value')).toHaveAttribute('aria-label');
        expect(screen.getByLabelText('Add new item')).toHaveAttribute('aria-label');
      });
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const addButton = screen.getByLabelText('Add new item');
        expect(addButton).toHaveFocus();

        userEvent.tab();
        expect(screen.getByLabelText('Filter by status')).toHaveFocus();

        userEvent.tab();
        expect(screen.getByLabelText('Sort by value')).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const items = screen.getAllByTestId('item-row');
        items.forEach(item => {
          expect(item).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
        });
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should not allow actions when user is not authenticated', async () => {
      const unauthMock = {
        ...mockAuthContext,
        isAuthenticated: false,
        user: null,
      };

      render(
        <AuthContext.Provider value={unauthMock}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <CoreFunctionality />
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.queryByLabelText('Add new item')).not.toBeInTheDocument();
        expect(screen.queryAllByLabelText('Edit item')).toHaveLength(0);
        expect(screen.queryAllByLabelText('Delete item')).toHaveLength(0);
      });
    });

    it('should show login prompt when unauthenticated user tries to access', async () => {
      const unauthMock = {
        ...mockAuthContext,
        isAuthenticated: false,
        user: null,
      };

      render(
        <AuthContext.Provider value={unauthMock}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <CoreFunctionality />
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            message: 'Please log in to access this feature',
          })
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle API response with malformed data', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [{ id: '1', name: null }] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Invalid data format received',
          })
        );
      });
    });

    it('should handle very large datasets without crashing', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        name: `Item ${i}`,
        status: i % 2 === 0 ? 'active' : 'inactive',
        value: i * 10,
      }));

      (axios.get as jest.Mock).mockResolvedValue({ data: largeData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 0')).toBeInTheDocument();
        expect(screen.getByText('Item 999')).toBeInTheDocument();
      });
    });

    it('should prevent duplicate form submissions', async () => {
      let resolveRequest: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      (axios.post as jest.Mock).mockReturnValue(promise);

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByLabelText('Add new item');
      fireEvent.click(addButton);

      const submitButton = screen.getByText('Create');
      fireEvent.click(submitButton);
      fireEvent.click(submitButton); // Second click

      expect(axios.post).toHaveBeenCalledTimes(1);

      act(() => {
        resolveRequest({ data: { id: '3', name: 'New Item' } });
      });

      await waitFor(() => {
        expect(screen.getByText('New Item')).toBeInTheDocument();
      });
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

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
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
            <Route path="/details/:id" element={<div>Details Page</div>} />
          </Routes>
        </MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

describe('CoreFunctionality Component', () => {
  const mockData = [
    { id: '1', name: 'Item 1', status: 'active', value: 100 },
    { id: '2', name: 'Item 2', status: 'inactive', value: 200 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockData }), 1000))
      );

      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to load data',
          })
        );
      });
    });
  });

  describe('Data Display', () => {
    it('should render all items with correct information', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('inactive')).toBeInTheDocument();
      });
    });

    it('should display empty state when no data is available', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow filtering items by status', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });

      const filterSelect = screen.getByLabelText('Filter by status');
      fireEvent.change(filterSelect, { target: { value: 'active' } });

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    });

    it('should allow sorting items by value', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const items = screen.getAllByTestId('item-row');
        expect(within(items[0]).getByText('Item 1')).toBeInTheDocument();
        expect(within(items[1]).getByText('Item 2')).toBeInTheDocument();
      });

      const sortButton = screen.getByLabelText('Sort by value');
      fireEvent.click(sortButton);

      await waitFor(() => {
        const items = screen.getAllByTestId('item-row');
        expect(within(items[0]).getByText('Item 2')).toBeInTheDocument();
        expect(within(items[1]).getByText('Item 1')).toBeInTheDocument();
      });
    });

    it('should navigate to details page when item is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const item1 = screen.getByText('Item 1').closest('button');
        if (item1) {
          fireEvent.click(item1);
          expect(mockNavigate).toHaveBeenCalledWith('/details/1');
        }
      });
    });
  });

  describe('CRUD Operations', () => {
    it('should create a new item successfully', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { id: '3', name: 'New Item', status: 'active', value: 300 },
      });

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByLabelText('Add new item');
      fireEvent.click(addButton);

      const nameInput = screen.getByLabelText('Item name');
      const valueInput = screen.getByLabelText('Item value');
      const statusSelect = screen.getByLabelText('Item status');
      const submitButton = screen.getByText('Create');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'New Item' } });
        fireEvent.change(valueInput, { target: { value: '300' } });
        fireEvent.change(statusSelect, { target: { value: 'active' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          { name: 'New Item', status: 'active', value: 300 },
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item created successfully',
          })
        );
        expect(screen.getByText('New Item')).toBeInTheDocument();
      });
    });

    it('should show error when item creation fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Creation failed'));

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByLabelText('Add new item');
      fireEvent.click(addButton);

      const nameInput = screen.getByLabelText('Item name');
      const submitButton = screen.getByText('Create');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'New Item' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to create item',
          })
        );
      });
    });

    it('should update an item successfully', async () => {
      (axios.put as jest.Mock).mockResolvedValue({
        data: { id: '1', name: 'Updated Item', status: 'active', value: 150 },
      });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const editButtons = screen.getAllByLabelText('Edit item');
        fireEvent.click(editButtons[0]);
      });

      const nameInput = screen.getByLabelText('Item name');
      const valueInput = screen.getByLabelText('Item value');
      const submitButton = screen.getByText('Update');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Updated Item' } });
        fireEvent.change(valueInput, { target: { value: '150' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/1'),
          { name: 'Updated Item', status: 'active', value: 150 },
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item updated successfully',
          })
        );
        expect(screen.getByText('Updated Item')).toBeInTheDocument();
      });
    });

    it('should delete an item successfully', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText('Delete item');
        fireEvent.click(deleteButtons[0]);
      });

      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/1'), {
          headers: { Authorization: 'Bearer test-token' },
        });
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item deleted successfully',
          })
        );
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filter by status')).toHaveAttribute('aria-label');
        expect(screen.getByLabelText('Sort by value')).toHaveAttribute('aria-label');
        expect(screen.getByLabelText('Add new item')).toHaveAttribute('aria-label');
      });
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const addButton = screen.getByLabelText('Add new item');
        expect(addButton).toHaveFocus();

        userEvent.tab();
        expect(screen.getByLabelText('Filter by status')).toHaveFocus();

        userEvent.tab();
        expect(screen.getByLabelText('Sort by value')).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const items = screen.getAllByTestId('item-row');
        items.forEach(item => {
          expect(item).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
        });
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should not allow actions when user is not authenticated', async () => {
      const unauthMock = {
        ...mockAuthContext,
        isAuthenticated: false,
        user: null,
      };

      render(
        <AuthContext.Provider value={unauthMock}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <CoreFunctionality />
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.queryByLabelText('Add new item')).not.toBeInTheDocument();
        expect(screen.queryAllByLabelText('Edit item')).toHaveLength(0);
        expect(screen.queryAllByLabelText('Delete item')).toHaveLength(0);
      });
    });

    it('should show login prompt when unauthenticated user tries to access', async () => {
      const unauthMock = {
        ...mockAuthContext,
        isAuthenticated: false,
        user: null,
      };

      render(
        <AuthContext.Provider value={unauthMock}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <CoreFunctionality />
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            message: 'Please log in to access this feature',
          })
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle API response with malformed data', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [{ id: '1', name: null }] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Invalid data format received',
          })
        );
      });
    });

    it('should handle very large datasets without crashing', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        name: `Item ${i}`,
        status: i % 2 === 0 ? 'active' : 'inactive',
        value: i * 10,
      }));

      (axios.get as jest.Mock).mockResolvedValue({ data: largeData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 0')).toBeInTheDocument();
        expect(screen.getByText('Item 999')).toBeInTheDocument();
      });
    });

    it('should prevent duplicate form submissions', async () => {
      let resolveRequest: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      (axios.post as jest.Mock).mockReturnValue(promise);

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByLabelText('Add new item');
      fireEvent.click(addButton);

      const submitButton = screen.getByText('Create');
      fireEvent.click(submitButton);
      fireEvent.click(submitButton); // Second click

      expect(axios.post).toHaveBeenCalledTimes(1);

      act(() => {
        resolveRequest({ data: { id: '3', name: 'New Item' } });
      });

      await waitFor(() => {
        expect(screen.getByText('New Item')).toBeInTheDocument();
      });
    });
  });
});