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

const renderWithProviders = (ui, { route = '/', path = '/' } = {}) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <NotificationContext.Provider value={mockNotificationContext}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

describe('CoreFunctionality Component', () => {
  const mockData = {
    id: '1',
    name: 'Test Item',
    description: 'Test Description',
    status: 'active',
    createdAt: '2023-01-01T00:00:00Z',
  };

  const mockErrorResponse = {
    response: {
      data: {
        message: 'Server error occurred',
      },
      status: 500,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Test Item')).not.toBeInTheDocument();
    });

    it('should render data after successful fetch', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to load data: Server error occurred',
          })
        );
      });
    });
  });

  describe('Data Display and Interaction', () => {
    it('should display all data items in a list', async () => {
      const mockItems = [
        { ...mockData, id: '1', name: 'Item 1' },
        { ...mockData, id: '2', name: 'Item 2' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
    });

    it('should allow sorting by name', async () => {
      const mockItems = [
        { ...mockData, id: '1', name: 'Beta' },
        { ...mockData, id: '2', name: 'Alpha' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      const nameHeader = screen.getByText('Name');
      await userEvent.click(nameHeader);

      const items = await screen.findAllByRole('row');
      expect(within(items[1]).getByText('Alpha')).toBeInTheDocument();
      expect(within(items[2]).getByText('Beta')).toBeInTheDocument();
    });

    it('should filter items based on search input', async () => {
      const mockItems = [
        { ...mockData, id: '1', name: 'Apple' },
        { ...mockData, id: '2', name: 'Banana' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      const searchInput = screen.getByPlaceholderText('Search...');
      await userEvent.type(searchInput, 'Apple');

      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.queryByText('Banana')).not.toBeInTheDocument();
    });
  });

  describe('CRUD Operations', () => {
    it('should open create modal when "Add New" button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByRole('button', { name: /add new/i });
      await userEvent.click(addButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create New Item')).toBeInTheDocument();
    });

    it('should create new item when form is submitted', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { ...mockData, id: '3', name: 'New Item' } });

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByRole('button', { name: /add new/i });
      await userEvent.click(addButton);

      const nameInput = screen.getByLabelText('Name');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /create/i });

      await userEvent.type(nameInput, 'New Item');
      await userEvent.type(descriptionInput, 'New Description');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          { name: 'New Item', description: 'New Description' },
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item created successfully',
          })
        );
      });
    });

    it('should show error when item creation fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(mockErrorResponse);

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByRole('button', { name: /add new/i });
      await userEvent.click(addButton);

      const nameInput = screen.getByLabelText('Name');
      const submitButton = screen.getByRole('button', { name: /create/i });

      await userEvent.type(nameInput, 'New Item');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to create item: Server error occurred',
          })
        );
      });
    });

    it('should open edit modal when edit button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i });
        userEvent.click(editButtons[0]);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Item')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Item')).toBeInTheDocument();
    });

    it('should update item when edit form is submitted', async () => {
      (axios.put as jest.Mock).mockResolvedValue({ data: { ...mockData, name: 'Updated Item' } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i });
        await userEvent.click(editButtons[0]);
      });

      const nameInput = screen.getByLabelText('Name');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Item');

      const submitButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/1'),
          { ...mockData, name: 'Updated Item' },
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item updated successfully',
          })
        );
      });
    });

    it('should delete item when delete button is clicked and confirmed', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({ data: { success: true } });
      window.confirm = jest.fn(() => true);

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        await userEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          expect.stringContaining('/1'),
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item deleted successfully',
          })
        );
      });
    });

    it('should not delete item when confirmation is canceled', async () => {
      window.confirm = jest.fn(() => false);

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        await userEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        expect(axios.delete).not.toHaveBeenCalled();
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls when there are multiple pages', async () => {
      const mockItems = new Array(15).fill(0).map((_, i) => ({
        ...mockData,
        id: `${i}`,
        name: `Item ${i}`,
      }));
      (axios.get as jest.Mock).mockResolvedValue({
        data: mockItems,
        headers: { 'x-total-count': '25' },
      });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });
    });

    it('should fetch next page when next button is clicked', async () => {
      const mockItems = new Array(10).fill(0).map((_, i) => ({
        ...mockData,
        id: `${i}`,
        name: `Item ${i}`,
      }));
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: mockItems.slice(0, 5),
          headers: { 'x-total-count': '10' },
        })
        .mockResolvedValueOnce({
          data: mockItems.slice(5),
          headers: { 'x-total-count': '10' },
        });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 0')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
          params: { _page: 2, _limit: 10 },
          headers: { Authorization: 'Bearer test-token' },
        });
        expect(screen.getByText('Item 5')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add new/i })).toHaveAttribute('aria-label', 'Add new item');
        expect(screen.getAllByRole('button', { name: /edit/i })[0]).toHaveAttribute('aria-label', 'Edit item');
        expect(screen.getAllByRole('button', { name: /delete/i })[0]).toHaveAttribute('aria-label', 'Delete item');
      });
    });

    it('should have proper table headers with scope', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const headers = screen.getAllByRole('columnheader');
        headers.forEach(header => {
          expect(header).toHaveAttribute('scope', 'col');
        });
      });
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add new/i });
        expect(addButton).toHaveFocus();

        fireEvent.keyDown(addButton, { key: 'Tab', code: 'Tab' });
        expect(screen.getAllByRole('button', { name: /edit/i })[0]).toHaveFocus();

        fireEvent.keyDown(screen.getAllByRole('button', { name: /edit/i })[0], { key: 'Enter', code: 'Enter' });
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    it('should handle empty data state gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument();
        expect(screen.queryByRole('row')).not.toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Network error occurred. Please check your connection.',
          })
        );
      });
    });

    it('should handle unauthorized access by redirecting to login', async () => {
      const mockUnauthorizedResponse = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };
      (axios.get as jest.Mock).mockRejectedValue(mockUnauthorizedResponse);

      renderWithProviders(<CoreFunctionality />, { path: '/dashboard' });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { from: '/dashboard' } });
      });
    });
  });

  describe('Route Protection', () => {
    it('should redirect to login when user is not authenticated', () => {
      const unauthenticatedContext = {
        ...mockAuthContext,
        isAuthenticated: false,
        user: null,
      };

      render(
        <AuthContext.Provider value={unauthenticatedContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <MemoryRouter initialEntries={['/dashboard']}>
              <Routes>
                <Route path="/dashboard" element={<CoreFunctionality />} />
                <Route path="/login" element={<div>Login Page</div>} />
              </Routes>
            </MemoryRouter>
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    it('should allow access when user is authenticated', async () => {
      renderWithProviders(<CoreFunctionality />, { path: '/dashboard' });

      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument();
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

const renderWithProviders = (ui, { route = '/', path = '/' } = {}) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <NotificationContext.Provider value={mockNotificationContext}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

describe('CoreFunctionality Component', () => {
  const mockData = {
    id: '1',
    name: 'Test Item',
    description: 'Test Description',
    status: 'active',
    createdAt: '2023-01-01T00:00:00Z',
  };

  const mockErrorResponse = {
    response: {
      data: {
        message: 'Server error occurred',
      },
      status: 500,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: [mockData] });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Test Item')).not.toBeInTheDocument();
    });

    it('should render data after successful fetch', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to load data: Server error occurred',
          })
        );
      });
    });
  });

  describe('Data Display and Interaction', () => {
    it('should display all data items in a list', async () => {
      const mockItems = [
        { ...mockData, id: '1', name: 'Item 1' },
        { ...mockData, id: '2', name: 'Item 2' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
    });

    it('should allow sorting by name', async () => {
      const mockItems = [
        { ...mockData, id: '1', name: 'Beta' },
        { ...mockData, id: '2', name: 'Alpha' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      const nameHeader = screen.getByText('Name');
      await userEvent.click(nameHeader);

      const items = await screen.findAllByRole('row');
      expect(within(items[1]).getByText('Alpha')).toBeInTheDocument();
      expect(within(items[2]).getByText('Beta')).toBeInTheDocument();
    });

    it('should filter items based on search input', async () => {
      const mockItems = [
        { ...mockData, id: '1', name: 'Apple' },
        { ...mockData, id: '2', name: 'Banana' },
      ];
      (axios.get as jest.Mock).mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      const searchInput = screen.getByPlaceholderText('Search...');
      await userEvent.type(searchInput, 'Apple');

      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.queryByText('Banana')).not.toBeInTheDocument();
    });
  });

  describe('CRUD Operations', () => {
    it('should open create modal when "Add New" button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByRole('button', { name: /add new/i });
      await userEvent.click(addButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create New Item')).toBeInTheDocument();
    });

    it('should create new item when form is submitted', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { ...mockData, id: '3', name: 'New Item' } });

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByRole('button', { name: /add new/i });
      await userEvent.click(addButton);

      const nameInput = screen.getByLabelText('Name');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /create/i });

      await userEvent.type(nameInput, 'New Item');
      await userEvent.type(descriptionInput, 'New Description');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          { name: 'New Item', description: 'New Description' },
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item created successfully',
          })
        );
      });
    });

    it('should show error when item creation fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(mockErrorResponse);

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByRole('button', { name: /add new/i });
      await userEvent.click(addButton);

      const nameInput = screen.getByLabelText('Name');
      const submitButton = screen.getByRole('button', { name: /create/i });

      await userEvent.type(nameInput, 'New Item');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to create item: Server error occurred',
          })
        );
      });
    });

    it('should open edit modal when edit button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i });
        userEvent.click(editButtons[0]);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Item')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Item')).toBeInTheDocument();
    });

    it('should update item when edit form is submitted', async () => {
      (axios.put as jest.Mock).mockResolvedValue({ data: { ...mockData, name: 'Updated Item' } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i });
        await userEvent.click(editButtons[0]);
      });

      const nameInput = screen.getByLabelText('Name');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Item');

      const submitButton = screen.getByRole('button', { name: /update/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/1'),
          { ...mockData, name: 'Updated Item' },
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item updated successfully',
          })
        );
      });
    });

    it('should delete item when delete button is clicked and confirmed', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({ data: { success: true } });
      window.confirm = jest.fn(() => true);

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        await userEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          expect.stringContaining('/1'),
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item deleted successfully',
          })
        );
      });
    });

    it('should not delete item when confirmation is canceled', async () => {
      window.confirm = jest.fn(() => false);

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        await userEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        expect(axios.delete).not.toHaveBeenCalled();
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls when there are multiple pages', async () => {
      const mockItems = new Array(15).fill(0).map((_, i) => ({
        ...mockData,
        id: `${i}`,
        name: `Item ${i}`,
      }));
      (axios.get as jest.Mock).mockResolvedValue({
        data: mockItems,
        headers: { 'x-total-count': '25' },
      });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });
    });

    it('should fetch next page when next button is clicked', async () => {
      const mockItems = new Array(10).fill(0).map((_, i) => ({
        ...mockData,
        id: `${i}`,
        name: `Item ${i}`,
      }));
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: mockItems.slice(0, 5),
          headers: { 'x-total-count': '10' },
        })
        .mockResolvedValueOnce({
          data: mockItems.slice(5),
          headers: { 'x-total-count': '10' },
        });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 0')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
          params: { _page: 2, _limit: 10 },
          headers: { Authorization: 'Bearer test-token' },
        });
        expect(screen.getByText('Item 5')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add new/i })).toHaveAttribute('aria-label', 'Add new item');
        expect(screen.getAllByRole('button', { name: /edit/i })[0]).toHaveAttribute('aria-label', 'Edit item');
        expect(screen.getAllByRole('button', { name: /delete/i })[0]).toHaveAttribute('aria-label', 'Delete item');
      });
    });

    it('should have proper table headers with scope', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const headers = screen.getAllByRole('columnheader');
        headers.forEach(header => {
          expect(header).toHaveAttribute('scope', 'col');
        });
      });
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add new/i });
        expect(addButton).toHaveFocus();

        fireEvent.keyDown(addButton, { key: 'Tab', code: 'Tab' });
        expect(screen.getAllByRole('button', { name: /edit/i })[0]).toHaveFocus();

        fireEvent.keyDown(screen.getAllByRole('button', { name: /edit/i })[0], { key: 'Enter', code: 'Enter' });
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    it('should handle empty data state gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument();
        expect(screen.queryByRole('row')).not.toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Network error occurred. Please check your connection.',
          })
        );
      });
    });

    it('should handle unauthorized access by redirecting to login', async () => {
      const mockUnauthorizedResponse = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };
      (axios.get as jest.Mock).mockRejectedValue(mockUnauthorizedResponse);

      renderWithProviders(<CoreFunctionality />, { path: '/dashboard' });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { from: '/dashboard' } });
      });
    });
  });

  describe('Route Protection', () => {
    it('should redirect to login when user is not authenticated', () => {
      const unauthenticatedContext = {
        ...mockAuthContext,
        isAuthenticated: false,
        user: null,
      };

      render(
        <AuthContext.Provider value={unauthenticatedContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <MemoryRouter initialEntries={['/dashboard']}>
              <Routes>
                <Route path="/dashboard" element={<CoreFunctionality />} />
                <Route path="/login" element={<div>Login Page</div>} />
              </Routes>
            </MemoryRouter>
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    it('should allow access when user is authenticated', async () => {
      renderWithProviders(<CoreFunctionality />, { path: '/dashboard' });

      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument();
      });
    });
  });
});