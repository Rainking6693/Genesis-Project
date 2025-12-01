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
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithProviders = (
  ui: React.ReactElement,
  {
    authValue = { user: { id: '1', name: 'Test User', role: 'admin' }, token: 'test-token' },
    notificationValue = { showNotification: jest.fn() },
    route = '/',
  } = {}
) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <NotificationContext.Provider value={notificationValue}>
        <MemoryRouter initialEntries={[route]}>
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
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      mockedAxios.get.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(mockErrorResponse);
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should render main content when data is loaded successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
        expect(screen.getByText(mockData.description)).toBeInTheDocument();
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
    });

    it('should display all data items in a list', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const items = screen.getAllByRole('listitem');
        expect(items).toHaveLength(1);
        expect(within(items[0]).getByText(mockData.name)).toBeInTheDocument();
      });
    });

    it('should display empty state when no data is available', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no items found/i)).toBeInTheDocument();
      });
    });

    it('should display pagination controls when multiple pages exist', async () => {
      const mockPaginatedData = {
        data: Array(15).fill(mockData),
        total: 25,
        page: 1,
        limit: 10,
      };
      mockedAxios.get.mockResolvedValue({ data: mockPaginatedData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText(/page 1 of 3/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
    });

    it('should open details modal when view details is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /view details/i }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/item details/i)).toBeInTheDocument();
      });
    });

    it('should close details modal when close button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        fireEvent.click(screen.getByRole('button', { name: /view details/i }));
        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
      });
    });

    it('should navigate to edit page when edit button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />, { route: '/items' });

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit/i }));
        expect(mockNavigate).toHaveBeenCalledWith('/items/1/edit');
      });
    });

    it('should show confirmation dialog when delete button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });
    });

    it('should delete item when confirmed in dialog', async () => {
      mockedAxios.delete.mockResolvedValue({});
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
        fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

        await waitFor(() => {
          expect(mockedAxios.delete).toHaveBeenCalledWith(
            `/api/items/${mockData.id}`,
            { headers: { Authorization: 'Bearer test-token' } }
          );
          expect(screen.queryByText(mockData.name)).not.toBeInTheDocument();
        });
      });
    });

    it('should show error when delete fails', async () => {
      mockedAxios.delete.mockRejectedValue(mockErrorResponse);
      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, { notificationValue });

      await waitFor(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
        fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

        await waitFor(() => {
          expect(notificationValue.showNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'error',
              message: 'Failed to delete item: Server error occurred',
            })
          );
        });
      });
    });
  });

  describe('Form Interactions', () => {
    it('should validate form fields and show errors', async () => {
      renderWithProviders(<CoreFunctionality />);

      fireEvent.click(screen.getByRole('button', { name: /create new/i }));

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /submit/i });
        fireEvent.click(submitButton);

        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/description is required/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });

    it('should enable submit button when form is valid', async () => {
      renderWithProviders(<CoreFunctionality />);

      fireEvent.click(screen.getByRole('button', { name: /create new/i }));

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const descInput = screen.getByLabelText(/description/i);

        userEvent.type(nameInput, 'New Item');
        userEvent.type(descInput, 'New Description');

        const submitButton = screen.getByRole('button', { name: /submit/i });
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should submit form and show success notification', async () => {
      mockedAxios.post.mockResolvedValue({ data: { ...mockData, id: '2' } });
      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, { notificationValue });

      await waitFor(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create new/i }));

        const nameInput = screen.getByLabelText(/name/i);
        const descInput = screen.getByLabelText(/description/i);

        await act(async () => {
          userEvent.type(nameInput, 'New Item');
          userEvent.type(descInput, 'New Description');
          fireEvent.click(screen.getByRole('button', { name: /submit/i }));
        });

        await waitFor(() => {
          expect(mockedAxios.post).toHaveBeenCalledWith(
            '/api/items',
            expect.objectContaining({
              name: 'New Item',
              description: 'New Description',
            }),
            { headers: { Authorization: 'Bearer test-token' } }
          );

          expect(notificationValue.showNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'success',
              message: 'Item created successfully',
            })
          );
        });
      });
    });

    it('should handle form submission error', async () => {
      mockedAxios.post.mockRejectedValue(mockErrorResponse);
      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, { notificationValue });

      await waitFor(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create new/i }));

        const nameInput = screen.getByLabelText(/name/i);
        const descInput = screen.getByLabelText(/description/i);

        await act(async () => {
          userEvent.type(nameInput, 'New Item');
          userEvent.type(descInput, 'New Description');
          fireEvent.click(screen.getByRole('button', { name: /submit/i }));
        });

        await waitFor(() => {
          expect(notificationValue.showNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'error',
              message: 'Failed to create item: Server error occurred',
            })
          );
        });
      });
    });
  });

  describe('Search and Filter', () => {
    it('should filter items based on search input', async () => {
      const mockItems = [
        { ...mockData, id: '1', name: 'Test Item 1' },
        { ...mockData, id: '2', name: 'Test Item 2' },
      ];
      mockedAxios.get.mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search/i);
        userEvent.type(searchInput, 'Test Item 1');

        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
      });
    });

    it('should filter items by status', async () => {
      const mockItems = [
        { ...mockData, id: '1', status: 'active' },
        { ...mockData, id: '2', status: 'inactive' },
      ];
      mockedAxios.get.mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/filter by status/i);
        userEvent.selectOptions(statusFilter, 'active');

        expect(screen.getByText('Test Item')).toBeInTheDocument(); // First item
        expect(screen.queryByText('inactive')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view details/i })).toHaveAttribute(
          'aria-label',
          `View details for ${mockData.name}`
        );
        expect(screen.getByRole('button', { name: /edit/i })).toHaveAttribute(
          'aria-label',
          `Edit ${mockData.name}`
        );
        expect(screen.getByRole('button', { name: /delete/i })).toHaveAttribute(
          'aria-label',
          `Delete ${mockData.name}`
        );
      });
    });

    it('should have proper heading structure', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /items list/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: mockData.name, level: 3 })).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const viewDetailsBtn = screen.getByRole('button', { name: /view details/i });
        expect(viewDetailsBtn).toHaveFocus();

        userEvent.tab();
        expect(screen.getByRole('button', { name: /edit/i })).toHaveFocus();

        userEvent.tab();
        expect(screen.getByRole('button', { name: /delete/i })).toHaveFocus();
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should disable edit and delete buttons for non-admin users', async () => {
      const nonAdminUser = { user: { id: '2', name: 'Regular User', role: 'user' }, token: 'test-token' };
      mockedAxios.get.mockResolvedValue({ data: [mockData] });

      renderWithProviders(<CoreFunctionality />, { authValue: nonAdminUser });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /view details/i })).not.toBeDisabled();
      });
    });

    it('should show unauthorized message when token is invalid', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          data: { message: 'Unauthorized' },
          status: 401,
        },
      });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/you are not authorized to view this content/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should implement debounce on search input', async () => {
      jest.useFakeTimers();
      mockedAxios.get.mockResolvedValue({ data: [mockData] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search/i);
        userEvent.type(searchInput, 'test');

        // Fast typing shouldn't trigger API calls immediately
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        // Advance timers to trigger debounced search
        act(() => {
          jest.advanceTimersByTime(500);
        });

        // Now the API should be called with the search term
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('search=test'),
          expect.anything()
        );
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
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithProviders = (
  ui: React.ReactElement,
  {
    authValue = { user: { id: '1', name: 'Test User', role: 'admin' }, token: 'test-token' },
    notificationValue = { showNotification: jest.fn() },
    route = '/',
  } = {}
) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <NotificationContext.Provider value={notificationValue}>
        <MemoryRouter initialEntries={[route]}>
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
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      mockedAxios.get.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(mockErrorResponse);
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should render main content when data is loaded successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
        expect(screen.getByText(mockData.description)).toBeInTheDocument();
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
    });

    it('should display all data items in a list', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const items = screen.getAllByRole('listitem');
        expect(items).toHaveLength(1);
        expect(within(items[0]).getByText(mockData.name)).toBeInTheDocument();
      });
    });

    it('should display empty state when no data is available', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no items found/i)).toBeInTheDocument();
      });
    });

    it('should display pagination controls when multiple pages exist', async () => {
      const mockPaginatedData = {
        data: Array(15).fill(mockData),
        total: 25,
        page: 1,
        limit: 10,
      };
      mockedAxios.get.mockResolvedValue({ data: mockPaginatedData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText(/page 1 of 3/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
    });

    it('should open details modal when view details is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /view details/i }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/item details/i)).toBeInTheDocument();
      });
    });

    it('should close details modal when close button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        fireEvent.click(screen.getByRole('button', { name: /view details/i }));
        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
      });
    });

    it('should navigate to edit page when edit button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />, { route: '/items' });

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit/i }));
        expect(mockNavigate).toHaveBeenCalledWith('/items/1/edit');
      });
    });

    it('should show confirmation dialog when delete button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });
    });

    it('should delete item when confirmed in dialog', async () => {
      mockedAxios.delete.mockResolvedValue({});
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
        fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

        await waitFor(() => {
          expect(mockedAxios.delete).toHaveBeenCalledWith(
            `/api/items/${mockData.id}`,
            { headers: { Authorization: 'Bearer test-token' } }
          );
          expect(screen.queryByText(mockData.name)).not.toBeInTheDocument();
        });
      });
    });

    it('should show error when delete fails', async () => {
      mockedAxios.delete.mockRejectedValue(mockErrorResponse);
      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, { notificationValue });

      await waitFor(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
        fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

        await waitFor(() => {
          expect(notificationValue.showNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'error',
              message: 'Failed to delete item: Server error occurred',
            })
          );
        });
      });
    });
  });

  describe('Form Interactions', () => {
    it('should validate form fields and show errors', async () => {
      renderWithProviders(<CoreFunctionality />);

      fireEvent.click(screen.getByRole('button', { name: /create new/i }));

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /submit/i });
        fireEvent.click(submitButton);

        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/description is required/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });

    it('should enable submit button when form is valid', async () => {
      renderWithProviders(<CoreFunctionality />);

      fireEvent.click(screen.getByRole('button', { name: /create new/i }));

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const descInput = screen.getByLabelText(/description/i);

        userEvent.type(nameInput, 'New Item');
        userEvent.type(descInput, 'New Description');

        const submitButton = screen.getByRole('button', { name: /submit/i });
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should submit form and show success notification', async () => {
      mockedAxios.post.mockResolvedValue({ data: { ...mockData, id: '2' } });
      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, { notificationValue });

      await waitFor(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create new/i }));

        const nameInput = screen.getByLabelText(/name/i);
        const descInput = screen.getByLabelText(/description/i);

        await act(async () => {
          userEvent.type(nameInput, 'New Item');
          userEvent.type(descInput, 'New Description');
          fireEvent.click(screen.getByRole('button', { name: /submit/i }));
        });

        await waitFor(() => {
          expect(mockedAxios.post).toHaveBeenCalledWith(
            '/api/items',
            expect.objectContaining({
              name: 'New Item',
              description: 'New Description',
            }),
            { headers: { Authorization: 'Bearer test-token' } }
          );

          expect(notificationValue.showNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'success',
              message: 'Item created successfully',
            })
          );
        });
      });
    });

    it('should handle form submission error', async () => {
      mockedAxios.post.mockRejectedValue(mockErrorResponse);
      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, { notificationValue });

      await waitFor(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create new/i }));

        const nameInput = screen.getByLabelText(/name/i);
        const descInput = screen.getByLabelText(/description/i);

        await act(async () => {
          userEvent.type(nameInput, 'New Item');
          userEvent.type(descInput, 'New Description');
          fireEvent.click(screen.getByRole('button', { name: /submit/i }));
        });

        await waitFor(() => {
          expect(notificationValue.showNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'error',
              message: 'Failed to create item: Server error occurred',
            })
          );
        });
      });
    });
  });

  describe('Search and Filter', () => {
    it('should filter items based on search input', async () => {
      const mockItems = [
        { ...mockData, id: '1', name: 'Test Item 1' },
        { ...mockData, id: '2', name: 'Test Item 2' },
      ];
      mockedAxios.get.mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search/i);
        userEvent.type(searchInput, 'Test Item 1');

        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
      });
    });

    it('should filter items by status', async () => {
      const mockItems = [
        { ...mockData, id: '1', status: 'active' },
        { ...mockData, id: '2', status: 'inactive' },
      ];
      mockedAxios.get.mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/filter by status/i);
        userEvent.selectOptions(statusFilter, 'active');

        expect(screen.getByText('Test Item')).toBeInTheDocument(); // First item
        expect(screen.queryByText('inactive')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view details/i })).toHaveAttribute(
          'aria-label',
          `View details for ${mockData.name}`
        );
        expect(screen.getByRole('button', { name: /edit/i })).toHaveAttribute(
          'aria-label',
          `Edit ${mockData.name}`
        );
        expect(screen.getByRole('button', { name: /delete/i })).toHaveAttribute(
          'aria-label',
          `Delete ${mockData.name}`
        );
      });
    });

    it('should have proper heading structure', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /items list/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: mockData.name, level: 3 })).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const viewDetailsBtn = screen.getByRole('button', { name: /view details/i });
        expect(viewDetailsBtn).toHaveFocus();

        userEvent.tab();
        expect(screen.getByRole('button', { name: /edit/i })).toHaveFocus();

        userEvent.tab();
        expect(screen.getByRole('button', { name: /delete/i })).toHaveFocus();
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should disable edit and delete buttons for non-admin users', async () => {
      const nonAdminUser = { user: { id: '2', name: 'Regular User', role: 'user' }, token: 'test-token' };
      mockedAxios.get.mockResolvedValue({ data: [mockData] });

      renderWithProviders(<CoreFunctionality />, { authValue: nonAdminUser });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /view details/i })).not.toBeDisabled();
      });
    });

    it('should show unauthorized message when token is invalid', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          data: { message: 'Unauthorized' },
          status: 401,
        },
      });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/you are not authorized to view this content/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should implement debounce on search input', async () => {
      jest.useFakeTimers();
      mockedAxios.get.mockResolvedValue({ data: [mockData] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search/i);
        userEvent.type(searchInput, 'test');

        // Fast typing shouldn't trigger API calls immediately
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        // Advance timers to trigger debounced search
        act(() => {
          jest.advanceTimersByTime(500);
        });

        // Now the API should be called with the search term
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('search=test'),
          expect.anything()
        );
      });

      jest.useRealTimers();
    });
  });
});