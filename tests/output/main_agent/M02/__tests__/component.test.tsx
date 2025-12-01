import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act } from 'react-dom/test-utils';
import CoreFunctionality from './CoreFunctionality';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

// Mock external dependencies
jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('../../hooks/useAnalytics', () => ({
  trackEvent: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockAuthContext = {
  user: {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    token: 'test-token',
  },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
};

const mockNotificationContext = {
  showNotification: jest.fn(),
  clearNotification: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <NotificationContext.Provider value={mockNotificationContext}>
          {ui}
        </NotificationContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

const mockData = {
  id: 'item-1',
  name: 'Test Item',
  description: 'Test Description',
  status: 'active',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-02T00:00:00Z',
};

const mockErrorResponse = {
  response: {
    data: {
      message: 'Server error occurred',
      errors: [{ field: 'name', message: 'Name is required' }],
    },
    status: 500,
  },
};

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while data is being fetched', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: [mockData] }), 1000))
      );

      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument());
    });

    it('should display empty state when no data is available', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no items found/i)).toBeInTheDocument();
      });
    });

    it('should render the main content when data is loaded', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
        expect(screen.getByText(mockData.description)).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching and Error Handling', () => {
    it('should display error message when data fetching fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to load items. Server error occurred',
        });
      });
    });

    it('should handle network errors gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to load items. Network Error',
        });
      });
    });
  });

  describe('User Interactions', () => {
    it('should open the create item modal when "Add New" button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add new/i });
        fireEvent.click(addButton);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/create new item/i)).toBeInTheDocument();
      });
    });

    it('should create a new item when form is submitted with valid data', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { ...mockData, id: 'new-item' } });

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByRole('button', { name: /add new/i });
      fireEvent.click(addButton);

      const nameInput = screen.getByLabelText(/name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const submitButton = screen.getByRole('button', { name: /create/i });

      await act(async () => {
        await userEvent.type(nameInput, 'New Item');
        await userEvent.type(descriptionInput, 'New Description');
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          { name: 'New Item', description: 'New Description' },
          { headers: { Authorization: `Bearer ${mockAuthContext.user.token}` } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith({
          type: 'success',
          message: 'Item created successfully',
        });
      });
    });

    it('should display validation errors when form is submitted with invalid data', async () => {
      (axios.post as jest.Mock).mockRejectedValue(mockErrorResponse);

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByRole('button', { name: /add new/i });
      fireEvent.click(addButton);

      const submitButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('should edit an item when edit button is clicked and form is submitted', async () => {
      (axios.put as jest.Mock).mockResolvedValue({ data: { ...mockData, name: 'Updated Item' } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const editButtons = screen.getAllByLabelText(/edit/i);
        fireEvent.click(editButtons[0]);

        const nameInput = screen.getByDisplayValue(mockData.name);
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'Updated Item');

        const saveButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining(mockData.id),
          { name: 'Updated Item', description: mockData.description },
          { headers: { Authorization: `Bearer ${mockAuthContext.user.token}` } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith({
          type: 'success',
          message: 'Item updated successfully',
        });
      });
    });

    it('should delete an item when delete button is clicked and confirmed', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({ data: { success: true } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const deleteButtons = screen.getAllByLabelText(/delete/i);
        fireEvent.click(deleteButtons[0]);

        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining(mockData.id), {
          headers: { Authorization: `Bearer ${mockAuthContext.user.token}` },
        });
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith({
          type: 'success',
          message: 'Item deleted successfully',
        });
      });
    });

    it('should filter items based on search input', async () => {
      const mockItems = [
        { ...mockData, name: 'Test Item 1' },
        { ...mockData, id: 'item-2', name: 'Test Item 2' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search/i);
        fireEvent.change(searchInput, { target: { value: 'Test Item 1' } });
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Pagination and Sorting', () => {
    it('should handle pagination correctly', async () => {
      const mockPaginatedData = {
        data: Array(15).fill(mockData).map((item, index) => ({ ...item, id: `item-${index}` })),
        total: 25,
        page: 1,
        limit: 10,
      };
      (axios.get as jest.Mock).mockResolvedValue({ data: mockPaginatedData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
      });

      const nextPageButton = screen.getByLabelText(/next page/i);
      fireEvent.click(nextPageButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
          params: { page: 2, limit: 10 },
          headers: { Authorization: `Bearer ${mockAuthContext.user.token}` },
        });
      });
    });

    it('should sort items when column header is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const nameHeader = screen.getByRole('columnheader', { name: /name/i });
        fireEvent.click(nameHeader);

        expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
          params: { sortBy: 'name', sortOrder: 'asc' },
          headers: { Authorization: `Bearer ${mockAuthContext.user.token}` },
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText(/search items/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add new item/i)).toBeInTheDocument();
        expect(screen.getAllByLabelText(/edit item/i)[0]).toBeInTheDocument();
        expect(screen.getAllByLabelText(/delete item/i)[0]).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add new/i });
        expect(addButton).toHaveFocus();

        fireEvent.keyDown(addButton, { key: 'Tab', code: 'Tab' });
        expect(screen.getByPlaceholderText(/search/i)).toHaveFocus();

        fireEvent.keyDown(screen.getByPlaceholderText(/search/i), { key: 'Enter', code: 'Enter' });
        expect(axios.get).toHaveBeenCalled();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const headers = screen.getAllByRole('columnheader');
        headers.forEach(header => {
          expect(header).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
        });

        const bodyText = screen.getByText(mockData.name);
        expect(bodyText).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text without breaking layout', async () => {
      const longTextData = {
        ...mockData,
        name: 'A'.repeat(200),
        description: 'B'.repeat(1000),
      };
      (axios.get as jest.Mock).mockResolvedValue({ data: [longTextData] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const nameCell = screen.getByText(longTextData.name);
        expect(nameCell).toHaveStyle('text-overflow: ellipsis');

        fireEvent.click(nameCell);
        expect(screen.getByText(longTextData.name)).toBeInTheDocument();
      });
    });

    it('should handle concurrent requests properly', async () => {
      let resolveFirstRequest: (value: unknown) => void;
      const firstRequest = new Promise((resolve) => {
        resolveFirstRequest = resolve;
      });

      (axios.get as jest.Mock)
        .mockImplementationOnce(() => firstRequest)
        .mockResolvedValueOnce({ data: [mockData] });

      renderWithProviders(<CoreFunctionality />);

      // Trigger a second request before the first completes
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Resolve the first request
      act(() => {
        resolveFirstRequest!({ data: [mockData] });
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle unauthorized access by redirecting to login', async () => {
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

  describe('Route Integration', () => {
    it('should navigate to item details when item is clicked', async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={['/items']}>
          <Routes>
            <Route path="/items" element={<CoreFunctionality />} />
            <Route path="/items/:id" element={<div>Item Details</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        const itemRow = screen.getByText(mockData.name).closest('tr');
        if (itemRow) {
          fireEvent.click(itemRow);
          expect(mockNavigate).toHaveBeenCalledWith(`/items/${mockData.id}`);
        }
      });
    });

    it('should handle 404 when trying to access non-existent item', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: { status: 404, data: { message: 'Item not found' } },
      });

      renderWithProviders(
        <MemoryRouter initialEntries={['/items/non-existent']}>
          <Routes>
            <Route path="/items/:id" element={<CoreFunctionality />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith({
          type: 'error',
          message: 'Item not found',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/items');
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

// Mock external dependencies
jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('../../hooks/useAnalytics', () => ({
  trackEvent: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockAuthContext = {
  user: {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    token: 'test-token',
  },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
};

const mockNotificationContext = {
  showNotification: jest.fn(),
  clearNotification: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <NotificationContext.Provider value={mockNotificationContext}>
          {ui}
        </NotificationContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

const mockData = {
  id: 'item-1',
  name: 'Test Item',
  description: 'Test Description',
  status: 'active',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-02T00:00:00Z',
};

const mockErrorResponse = {
  response: {
    data: {
      message: 'Server error occurred',
      errors: [{ field: 'name', message: 'Name is required' }],
    },
    status: 500,
  },
};

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while data is being fetched', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: [mockData] }), 1000))
      );

      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument());
    });

    it('should display empty state when no data is available', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no items found/i)).toBeInTheDocument();
      });
    });

    it('should render the main content when data is loaded', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
        expect(screen.getByText(mockData.description)).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching and Error Handling', () => {
    it('should display error message when data fetching fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to load items. Server error occurred',
        });
      });
    });

    it('should handle network errors gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to load items. Network Error',
        });
      });
    });
  });

  describe('User Interactions', () => {
    it('should open the create item modal when "Add New" button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add new/i });
        fireEvent.click(addButton);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/create new item/i)).toBeInTheDocument();
      });
    });

    it('should create a new item when form is submitted with valid data', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { ...mockData, id: 'new-item' } });

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByRole('button', { name: /add new/i });
      fireEvent.click(addButton);

      const nameInput = screen.getByLabelText(/name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const submitButton = screen.getByRole('button', { name: /create/i });

      await act(async () => {
        await userEvent.type(nameInput, 'New Item');
        await userEvent.type(descriptionInput, 'New Description');
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          { name: 'New Item', description: 'New Description' },
          { headers: { Authorization: `Bearer ${mockAuthContext.user.token}` } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith({
          type: 'success',
          message: 'Item created successfully',
        });
      });
    });

    it('should display validation errors when form is submitted with invalid data', async () => {
      (axios.post as jest.Mock).mockRejectedValue(mockErrorResponse);

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByRole('button', { name: /add new/i });
      fireEvent.click(addButton);

      const submitButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('should edit an item when edit button is clicked and form is submitted', async () => {
      (axios.put as jest.Mock).mockResolvedValue({ data: { ...mockData, name: 'Updated Item' } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const editButtons = screen.getAllByLabelText(/edit/i);
        fireEvent.click(editButtons[0]);

        const nameInput = screen.getByDisplayValue(mockData.name);
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'Updated Item');

        const saveButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining(mockData.id),
          { name: 'Updated Item', description: mockData.description },
          { headers: { Authorization: `Bearer ${mockAuthContext.user.token}` } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith({
          type: 'success',
          message: 'Item updated successfully',
        });
      });
    });

    it('should delete an item when delete button is clicked and confirmed', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({ data: { success: true } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const deleteButtons = screen.getAllByLabelText(/delete/i);
        fireEvent.click(deleteButtons[0]);

        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining(mockData.id), {
          headers: { Authorization: `Bearer ${mockAuthContext.user.token}` },
        });
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith({
          type: 'success',
          message: 'Item deleted successfully',
        });
      });
    });

    it('should filter items based on search input', async () => {
      const mockItems = [
        { ...mockData, name: 'Test Item 1' },
        { ...mockData, id: 'item-2', name: 'Test Item 2' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search/i);
        fireEvent.change(searchInput, { target: { value: 'Test Item 1' } });
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Pagination and Sorting', () => {
    it('should handle pagination correctly', async () => {
      const mockPaginatedData = {
        data: Array(15).fill(mockData).map((item, index) => ({ ...item, id: `item-${index}` })),
        total: 25,
        page: 1,
        limit: 10,
      };
      (axios.get as jest.Mock).mockResolvedValue({ data: mockPaginatedData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
      });

      const nextPageButton = screen.getByLabelText(/next page/i);
      fireEvent.click(nextPageButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
          params: { page: 2, limit: 10 },
          headers: { Authorization: `Bearer ${mockAuthContext.user.token}` },
        });
      });
    });

    it('should sort items when column header is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const nameHeader = screen.getByRole('columnheader', { name: /name/i });
        fireEvent.click(nameHeader);

        expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
          params: { sortBy: 'name', sortOrder: 'asc' },
          headers: { Authorization: `Bearer ${mockAuthContext.user.token}` },
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText(/search items/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add new item/i)).toBeInTheDocument();
        expect(screen.getAllByLabelText(/edit item/i)[0]).toBeInTheDocument();
        expect(screen.getAllByLabelText(/delete item/i)[0]).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add new/i });
        expect(addButton).toHaveFocus();

        fireEvent.keyDown(addButton, { key: 'Tab', code: 'Tab' });
        expect(screen.getByPlaceholderText(/search/i)).toHaveFocus();

        fireEvent.keyDown(screen.getByPlaceholderText(/search/i), { key: 'Enter', code: 'Enter' });
        expect(axios.get).toHaveBeenCalled();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const headers = screen.getAllByRole('columnheader');
        headers.forEach(header => {
          expect(header).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
        });

        const bodyText = screen.getByText(mockData.name);
        expect(bodyText).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text without breaking layout', async () => {
      const longTextData = {
        ...mockData,
        name: 'A'.repeat(200),
        description: 'B'.repeat(1000),
      };
      (axios.get as jest.Mock).mockResolvedValue({ data: [longTextData] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const nameCell = screen.getByText(longTextData.name);
        expect(nameCell).toHaveStyle('text-overflow: ellipsis');

        fireEvent.click(nameCell);
        expect(screen.getByText(longTextData.name)).toBeInTheDocument();
      });
    });

    it('should handle concurrent requests properly', async () => {
      let resolveFirstRequest: (value: unknown) => void;
      const firstRequest = new Promise((resolve) => {
        resolveFirstRequest = resolve;
      });

      (axios.get as jest.Mock)
        .mockImplementationOnce(() => firstRequest)
        .mockResolvedValueOnce({ data: [mockData] });

      renderWithProviders(<CoreFunctionality />);

      // Trigger a second request before the first completes
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Resolve the first request
      act(() => {
        resolveFirstRequest!({ data: [mockData] });
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle unauthorized access by redirecting to login', async () => {
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

  describe('Route Integration', () => {
    it('should navigate to item details when item is clicked', async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={['/items']}>
          <Routes>
            <Route path="/items" element={<CoreFunctionality />} />
            <Route path="/items/:id" element={<div>Item Details</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        const itemRow = screen.getByText(mockData.name).closest('tr');
        if (itemRow) {
          fireEvent.click(itemRow);
          expect(mockNavigate).toHaveBeenCalledWith(`/items/${mockData.id}`);
        }
      });
    });

    it('should handle 404 when trying to access non-existent item', async () => {
      (axios.get as jest.Mock).mockRejectedValue({
        response: { status: 404, data: { message: 'Item not found' } },
      });

      renderWithProviders(
        <MemoryRouter initialEntries={['/items/non-existent']}>
          <Routes>
            <Route path="/items/:id" element={<CoreFunctionality />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith({
          type: 'error',
          message: 'Item not found',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/items');
      });
    });
  });
});