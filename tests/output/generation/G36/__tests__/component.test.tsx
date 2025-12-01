import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CoreFunctionality from './CoreFunctionality';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
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
  loading: false,
};

const mockNotificationContext = {
  showNotification: jest.fn(),
  clearNotification: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <NotificationContext.Provider value={mockNotificationContext}>
        <MemoryRouter>{ui}</MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Initial Render', () => {
    it('should render loading state initially when data is being fetched', () => {
      mockedAxios.get.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should render error message when data fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));
      renderWithProviders(<CoreFunctionality />);

      const errorMessage = await screen.findByText(/failed to load data/i);
      expect(errorMessage).toBeInTheDocument();
      expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Failed to load data',
        })
      );
    });

    it('should render main content when data is successfully loaded', async () => {
      const mockData = {
        items: [
          { id: '1', name: 'Item 1', status: 'active' },
          { id: '2', name: 'Item 2', status: 'inactive' },
        ],
        stats: { total: 2, active: 1 },
      };

      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
        expect(screen.getByText('Total: 2')).toBeInTheDocument();
        expect(screen.getByText('Active: 1')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    const mockData = {
      items: [
        { id: '1', name: 'Item 1', status: 'active', description: 'Test description' },
        { id: '2', name: 'Item 2', status: 'inactive', description: 'Another description' },
      ],
      stats: { total: 2, active: 1 },
    };

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should allow searching items by name', async () => {
      renderWithProviders(<CoreFunctionality />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await userEvent.type(searchInput, 'Item 1');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { search: 'Item 1' },
        })
      );
    });

    it('should filter items by status', async () => {
      renderWithProviders(<CoreFunctionality />);

      const filterSelect = screen.getByLabelText(/filter by status/i);
      await userEvent.selectOptions(filterSelect, 'active');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { status: 'active' },
        })
      );
    });

    it('should sort items by name in ascending order', async () => {
      renderWithProviders(<CoreFunctionality />);

      const sortButton = screen.getByLabelText(/sort by name/i);
      await userEvent.click(sortButton);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { sort: 'name', order: 'asc' },
        })
      );
    });

    it('should open item details modal when clicking on an item', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const itemCards = screen.getAllByTestId('item-card');
        expect(itemCards.length).toBe(2);
      });

      const firstItem = screen.getByText('Item 1');
      await userEvent.click(firstItem);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should close item details modal when clicking the close button', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const firstItem = screen.getByText('Item 1');
        fireEvent.click(firstItem);
      });

      const closeButton = screen.getByLabelText(/close/i);
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should navigate to edit page when edit button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const firstItem = screen.getByText('Item 1');
        fireEvent.click(firstItem);
      });

      const editButton = screen.getByText(/edit/i);
      await userEvent.click(editButton);

      expect(mockNavigate).toHaveBeenCalledWith('/items/1/edit');
    });
  });

  describe('Item Management', () => {
    const mockData = {
      items: [
        { id: '1', name: 'Item 1', status: 'active' },
      ],
      stats: { total: 1, active: 1 },
    };

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should open create item form when clicking add new button', async () => {
      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByText(/add new/i);
      await userEvent.click(addButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/create new item/i)).toBeInTheDocument();
    });

    it('should create a new item when form is submitted', async () => {
      mockedAxios.post.mockResolvedValue({ data: { id: '3', name: 'New Item', status: 'active' } });

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByText(/add new/i);
      await userEvent.click(addButton);

      await userEvent.type(screen.getByLabelText(/name/i), 'New Item');
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'active');
      await userEvent.type(screen.getByLabelText(/description/i), 'New description');

      const submitButton = within(screen.getByRole('dialog')).getByText(/create/i);
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          {
            name: 'New Item',
            status: 'active',
            description: 'New description',
          },
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

    it('should show error when item creation fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Creation failed'));

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByText(/add new/i);
      await userEvent.click(addButton);

      await userEvent.type(screen.getByLabelText(/name/i), 'New Item');
      const submitButton = within(screen.getByRole('dialog')).getByText(/create/i);
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

    it('should delete an item when delete button is clicked and confirmed', async () => {
      mockedAxios.delete.mockResolvedValue({});

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const firstItem = screen.getByText('Item 1');
        fireEvent.click(firstItem);
      });

      const deleteButton = screen.getByText(/delete/i);
      await userEvent.click(deleteButton);

      const confirmButton = screen.getByText(/confirm/i);
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockedAxios.delete).toHaveBeenCalledWith(
          expect.stringContaining('/items/1'),
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

    it('should show error when item deletion fails', async () => {
      mockedAxios.delete.mockRejectedValue(new Error('Deletion failed'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const firstItem = screen.getByText('Item 1');
        fireEvent.click(firstItem);
      });

      const deleteButton = screen.getByText(/delete/i);
      await userEvent.click(deleteButton);

      const confirmButton = screen.getByText(/confirm/i);
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to delete item',
          })
        );
      });
    });
  });

  describe('Pagination', () => {
    const mockData = {
      items: Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Item ${i + 1}`,
        status: i % 2 === 0 ? 'active' : 'inactive',
      })),
      stats: { total: 15, active: 8 },
      pagination: {
        totalPages: 3,
        currentPage: 1,
        pageSize: 5,
      },
    };

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should render pagination controls when there are multiple pages', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const pagination = screen.getByRole('navigation', { name: /pagination/i });
        expect(pagination).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      });
    });

    it('should navigate to next page when next button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const nextButton = screen.getByLabelText(/next page/i);
        fireEvent.click(nextButton);
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { page: 2 },
        })
      );
    });

    it('should navigate to previous page when previous button is clicked', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { ...mockData, pagination: { ...mockData.pagination, currentPage: 2 } } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const prevButton = screen.getByLabelText(/previous page/i);
        fireEvent.click(prevButton);
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { page: 1 },
        })
      );
    });

    it('should disable previous button on first page', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const prevButton = screen.getByLabelText(/previous page/i);
        expect(prevButton).toBeDisabled();
      });
    });

    it('should disable next button on last page', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { ...mockData, pagination: { ...mockData.pagination, currentPage: 3 } } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const nextButton = screen.getByLabelText(/next page/i);
        expect(nextButton).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      const mockData = {
        items: [
          { id: '1', name: 'Item 1', status: 'active' },
        ],
        stats: { total: 1, active: 1 },
      };

      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText(/search items/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/sort by name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add new item/i)).toBeInTheDocument();
      });
    });

    it('should have proper heading structure', async () => {
      const mockData = {
        items: [
          { id: '1', name: 'Item 1', status: 'active' },
        ],
        stats: { total: 1, active: 1 },
      };

      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /item management/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /statistics/i })).toBeInTheDocument();
      });
    });

    it('should have proper focus management in modal dialogs', async () => {
      const mockData = {
        items: [
          { id: '1', name: 'Item 1', status: 'active' },
        ],
        stats: { total: 1, active: 1 },
      };

      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const firstItem = screen.getByText('Item 1');
        fireEvent.click(firstItem);
      });

      const closeButton = screen.getByLabelText(/close/i);
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Authentication and Authorization', () => {
    it('should redirect to login when user is not authenticated', () => {
      const unauthenticatedContext = {
        ...mockAuthContext,
        isAuthenticated: false,
      };

      render(
        <AuthContext.Provider value={unauthenticatedContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <MemoryRouter>
              <CoreFunctionality />
            </MemoryRouter>
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should disable admin-only features for non-admin users', async () => {
      const nonAdminContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'user' },
      };

      const mockData = {
        items: [
          { id: '1', name: 'Item 1', status: 'active' },
        ],
        stats: { total: 1, active: 1 },
      };

      mockedAxios.get.mockResolvedValue({ data: mockData });

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
        expect(screen.queryByText(/add new/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component rendering errors gracefully', () => {
      const OriginalComponent = CoreFunctionality;

      jest.spyOn(console, 'error').mockImplementation(() => {});

      const ErrorThrowingComponent = () => {
        throw new Error('Test error');
        return <OriginalComponent />;
      };

      renderWithProviders(<ErrorThrowingComponent />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'An unexpected error occurred',
        })
      );

      jest.restoreAllMocks();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CoreFunctionality from './CoreFunctionality';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
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
  loading: false,
};

const mockNotificationContext = {
  showNotification: jest.fn(),
  clearNotification: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <NotificationContext.Provider value={mockNotificationContext}>
        <MemoryRouter>{ui}</MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Initial Render', () => {
    it('should render loading state initially when data is being fetched', () => {
      mockedAxios.get.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should render error message when data fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));
      renderWithProviders(<CoreFunctionality />);

      const errorMessage = await screen.findByText(/failed to load data/i);
      expect(errorMessage).toBeInTheDocument();
      expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Failed to load data',
        })
      );
    });

    it('should render main content when data is successfully loaded', async () => {
      const mockData = {
        items: [
          { id: '1', name: 'Item 1', status: 'active' },
          { id: '2', name: 'Item 2', status: 'inactive' },
        ],
        stats: { total: 2, active: 1 },
      };

      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
        expect(screen.getByText('Total: 2')).toBeInTheDocument();
        expect(screen.getByText('Active: 1')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    const mockData = {
      items: [
        { id: '1', name: 'Item 1', status: 'active', description: 'Test description' },
        { id: '2', name: 'Item 2', status: 'inactive', description: 'Another description' },
      ],
      stats: { total: 2, active: 1 },
    };

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should allow searching items by name', async () => {
      renderWithProviders(<CoreFunctionality />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await userEvent.type(searchInput, 'Item 1');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { search: 'Item 1' },
        })
      );
    });

    it('should filter items by status', async () => {
      renderWithProviders(<CoreFunctionality />);

      const filterSelect = screen.getByLabelText(/filter by status/i);
      await userEvent.selectOptions(filterSelect, 'active');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { status: 'active' },
        })
      );
    });

    it('should sort items by name in ascending order', async () => {
      renderWithProviders(<CoreFunctionality />);

      const sortButton = screen.getByLabelText(/sort by name/i);
      await userEvent.click(sortButton);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { sort: 'name', order: 'asc' },
        })
      );
    });

    it('should open item details modal when clicking on an item', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const itemCards = screen.getAllByTestId('item-card');
        expect(itemCards.length).toBe(2);
      });

      const firstItem = screen.getByText('Item 1');
      await userEvent.click(firstItem);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should close item details modal when clicking the close button', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const firstItem = screen.getByText('Item 1');
        fireEvent.click(firstItem);
      });

      const closeButton = screen.getByLabelText(/close/i);
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should navigate to edit page when edit button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const firstItem = screen.getByText('Item 1');
        fireEvent.click(firstItem);
      });

      const editButton = screen.getByText(/edit/i);
      await userEvent.click(editButton);

      expect(mockNavigate).toHaveBeenCalledWith('/items/1/edit');
    });
  });

  describe('Item Management', () => {
    const mockData = {
      items: [
        { id: '1', name: 'Item 1', status: 'active' },
      ],
      stats: { total: 1, active: 1 },
    };

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should open create item form when clicking add new button', async () => {
      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByText(/add new/i);
      await userEvent.click(addButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/create new item/i)).toBeInTheDocument();
    });

    it('should create a new item when form is submitted', async () => {
      mockedAxios.post.mockResolvedValue({ data: { id: '3', name: 'New Item', status: 'active' } });

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByText(/add new/i);
      await userEvent.click(addButton);

      await userEvent.type(screen.getByLabelText(/name/i), 'New Item');
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'active');
      await userEvent.type(screen.getByLabelText(/description/i), 'New description');

      const submitButton = within(screen.getByRole('dialog')).getByText(/create/i);
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          {
            name: 'New Item',
            status: 'active',
            description: 'New description',
          },
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

    it('should show error when item creation fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Creation failed'));

      renderWithProviders(<CoreFunctionality />);

      const addButton = screen.getByText(/add new/i);
      await userEvent.click(addButton);

      await userEvent.type(screen.getByLabelText(/name/i), 'New Item');
      const submitButton = within(screen.getByRole('dialog')).getByText(/create/i);
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

    it('should delete an item when delete button is clicked and confirmed', async () => {
      mockedAxios.delete.mockResolvedValue({});

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const firstItem = screen.getByText('Item 1');
        fireEvent.click(firstItem);
      });

      const deleteButton = screen.getByText(/delete/i);
      await userEvent.click(deleteButton);

      const confirmButton = screen.getByText(/confirm/i);
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockedAxios.delete).toHaveBeenCalledWith(
          expect.stringContaining('/items/1'),
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

    it('should show error when item deletion fails', async () => {
      mockedAxios.delete.mockRejectedValue(new Error('Deletion failed'));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const firstItem = screen.getByText('Item 1');
        fireEvent.click(firstItem);
      });

      const deleteButton = screen.getByText(/delete/i);
      await userEvent.click(deleteButton);

      const confirmButton = screen.getByText(/confirm/i);
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to delete item',
          })
        );
      });
    });
  });

  describe('Pagination', () => {
    const mockData = {
      items: Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Item ${i + 1}`,
        status: i % 2 === 0 ? 'active' : 'inactive',
      })),
      stats: { total: 15, active: 8 },
      pagination: {
        totalPages: 3,
        currentPage: 1,
        pageSize: 5,
      },
    };

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should render pagination controls when there are multiple pages', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const pagination = screen.getByRole('navigation', { name: /pagination/i });
        expect(pagination).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      });
    });

    it('should navigate to next page when next button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const nextButton = screen.getByLabelText(/next page/i);
        fireEvent.click(nextButton);
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { page: 2 },
        })
      );
    });

    it('should navigate to previous page when previous button is clicked', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { ...mockData, pagination: { ...mockData.pagination, currentPage: 2 } } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const prevButton = screen.getByLabelText(/previous page/i);
        fireEvent.click(prevButton);
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { page: 1 },
        })
      );
    });

    it('should disable previous button on first page', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const prevButton = screen.getByLabelText(/previous page/i);
        expect(prevButton).toBeDisabled();
      });
    });

    it('should disable next button on last page', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { ...mockData, pagination: { ...mockData.pagination, currentPage: 3 } } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const nextButton = screen.getByLabelText(/next page/i);
        expect(nextButton).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      const mockData = {
        items: [
          { id: '1', name: 'Item 1', status: 'active' },
        ],
        stats: { total: 1, active: 1 },
      };

      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText(/search items/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/sort by name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/add new item/i)).toBeInTheDocument();
      });
    });

    it('should have proper heading structure', async () => {
      const mockData = {
        items: [
          { id: '1', name: 'Item 1', status: 'active' },
        ],
        stats: { total: 1, active: 1 },
      };

      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /item management/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /statistics/i })).toBeInTheDocument();
      });
    });

    it('should have proper focus management in modal dialogs', async () => {
      const mockData = {
        items: [
          { id: '1', name: 'Item 1', status: 'active' },
        ],
        stats: { total: 1, active: 1 },
      };

      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const firstItem = screen.getByText('Item 1');
        fireEvent.click(firstItem);
      });

      const closeButton = screen.getByLabelText(/close/i);
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Authentication and Authorization', () => {
    it('should redirect to login when user is not authenticated', () => {
      const unauthenticatedContext = {
        ...mockAuthContext,
        isAuthenticated: false,
      };

      render(
        <AuthContext.Provider value={unauthenticatedContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            <MemoryRouter>
              <CoreFunctionality />
            </MemoryRouter>
          </NotificationContext.Provider>
        </AuthContext.Provider>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should disable admin-only features for non-admin users', async () => {
      const nonAdminContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'user' },
      };

      const mockData = {
        items: [
          { id: '1', name: 'Item 1', status: 'active' },
        ],
        stats: { total: 1, active: 1 },
      };

      mockedAxios.get.mockResolvedValue({ data: mockData });

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
        expect(screen.queryByText(/add new/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component rendering errors gracefully', () => {
      const OriginalComponent = CoreFunctionality;

      jest.spyOn(console, 'error').mockImplementation(() => {});

      const ErrorThrowingComponent = () => {
        throw new Error('Test error');
        return <OriginalComponent />;
      };

      renderWithProviders(<ErrorThrowingComponent />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'An unexpected error occurred',
        })
      );

      jest.restoreAllMocks();
    });
  });
});