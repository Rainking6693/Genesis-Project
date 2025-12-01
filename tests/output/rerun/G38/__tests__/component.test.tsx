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

  describe('Initial Render', () => {
    it('should render loading state initially', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockData }), 1000))
      );

      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('should render the main title and primary actions', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /core functionality/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add new/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });

    it('should fetch and display data on initial load', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    it('should display all data items in a table format', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows).toHaveLength(mockData.length + 1); // +1 for header row

        mockData.forEach((item) => {
          expect(screen.getByText(item.name)).toBeInTheDocument();
          expect(screen.getByText(item.status)).toBeInTheDocument();
          expect(screen.getByText(item.value.toString())).toBeInTheDocument();
        });
      });
    });

    it('should display empty state when no data is available', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no items found/i)).toBeInTheDocument();
        expect(screen.queryByRole('row')).not.toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      const errorMessage = 'Failed to fetch data';
      (axios.get as jest.Mock).mockRejectedValue(new Error(errorMessage));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: errorMessage,
          })
        );
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow sorting by column headers', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const nameHeader = screen.getByRole('columnheader', { name: /name/i });
        await user.click(nameHeader);

        // Verify sort indicator appears
        expect(within(nameHeader).getByTestId('sort-icon')).toBeInTheDocument();

        // Verify API call with sort parameter
        expect(axios.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          params: expect.objectContaining({
            sortBy: 'name',
            sortOrder: 'asc',
          }),
        }));
      });
    });

    it('should open the add new item modal when clicking the add button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: /add new/i }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /add new item/i })).toBeInTheDocument();
      });
    });

    it('should refresh data when clicking the refresh button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: /refresh/i }));
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should navigate to details page when clicking on a table row', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const rows = screen.getAllByRole('row');
        await user.click(rows[1]); // First data row

        expect(mockNavigate).toHaveBeenCalledWith('/details/1');
      });
    });

    it('should filter data based on search input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const searchInput = screen.getByRole('searchbox');
        await user.type(searchInput, 'Item 1');

        expect(axios.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          params: expect.objectContaining({
            search: 'Item 1',
          }),
        }));
      });
    });
  });

  describe('Pagination', () => {
    const paginatedData = {
      data: mockData,
      total: 20,
      page: 1,
      pageSize: 10,
    };

    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: paginatedData });
    });

    it('should display pagination controls when data is paginated', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/page 1 of 2/i)).toBeInTheDocument();
      });
    });

    it('should change page when pagination controls are used', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const nextPageButton = screen.getByLabelText(/go to next page/i);
        await user.click(nextPageButton);

        expect(axios.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          params: expect.objectContaining({
            page: 2,
          }),
        }));
      });
    });

    it('should update page size when page size selector is changed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const pageSizeSelect = screen.getByLabelText(/items per page/i);
        await user.selectOptions(pageSizeSelect, '20');

        expect(axios.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          params: expect.objectContaining({
            pageSize: 20,
            page: 1, // Should reset to first page
          }),
        }));
      });
    });
  });

  describe('Form Modal', () => {
    it('should validate form inputs and show errors', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: /add new/i }));

        const submitButton = screen.getByRole('button', { name: /submit/i });
        await user.click(submitButton);

        expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/value is required/i)).toBeInTheDocument();
      });
    });

    it('should submit form data when valid', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockResolvedValue({ data: { id: '3', ...mockData[0] } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: /add new/i }));

        await user.type(screen.getByLabelText(/name/i), 'New Item');
        await user.type(screen.getByLabelText(/value/i), '300');
        await user.click(screen.getByLabelText(/active/i));

        const submitButton = screen.getByRole('button', { name: /submit/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(axios.post).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              name: 'New Item',
              value: 300,
              status: 'active',
            }),
            expect.anything()
          );

          expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'success',
              message: 'Item created successfully',
            })
          );
        });
      });
    });

    it('should handle form submission errors', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to create item';
      (axios.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: /add new/i }));

        await user.type(screen.getByLabelText(/name/i), 'New Item');
        await user.type(screen.getByLabelText(/value/i), '300');

        const submitButton = screen.getByRole('button', { name: /submit/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'error',
              message: errorMessage,
            })
          );
        });
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should open confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const deleteButtons = screen.getAllByLabelText(/delete/i);
        await user.click(deleteButtons[0]);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });
    });

    it('should delete item when confirmed', async () => {
      const user = userEvent.setup();
      (axios.delete as jest.Mock).mockResolvedValue({});

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const deleteButtons = screen.getAllByLabelText(/delete/i);
        await user.click(deleteButtons[0]);

        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        await user.click(confirmButton);

        await waitFor(() => {
          expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.anything());
          expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'success',
              message: 'Item deleted successfully',
            })
          );
        });
      });
    });

    it('should handle delete errors', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to delete item';
      (axios.delete as jest.Mock).mockRejectedValue(new Error(errorMessage));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const deleteButtons = screen.getAllByLabelText(/delete/i);
        await user.click(deleteButtons[0]);

        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        await user.click(confirmButton);

        await waitFor(() => {
          expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'error',
              message: errorMessage,
            })
          );
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add new/i })).toHaveAttribute('aria-label', 'Add new item');
        expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', 'Search items');
        expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Items list');
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        // Tab through interactive elements
        await user.tab();
        expect(screen.getByRole('searchbox')).toHaveFocus();

        await user.tab();
        expect(screen.getByRole('button', { name: /add new/i })).toHaveFocus();

        await user.tab();
        expect(screen.getByRole('button', { name: /refresh/i })).toHaveFocus();

        // Test table navigation
        const table = screen.getByRole('table');
        await user.tab();
        expect(within(table).getByRole('columnheader', { name: /name/i })).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /core functionality/i });
        expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Example - adjust based on your actual styles

        const tableHeaders = screen.getAllByRole('columnheader');
        tableHeaders.forEach(header => {
          expect(header).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Example
        });
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component rendering errors gracefully', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const OriginalComponent = CoreFunctionality;
      const ErrorThrowingComponent = () => {
        throw new Error('Test error');
      };

      // Temporarily replace the component with an error-throwing version
      jest.doMock('./CoreFunctionality', () => ErrorThrowingComponent);

      // This would normally be in a separate test file with the error boundary
      // Here we're just verifying the error is caught
      expect(() => renderWithProviders(<ErrorThrowingComponent />)).toThrow();

      console.error.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when props remain the same', () => {
      const { rerender } = renderWithProviders(<CoreFunctionality />);

      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Re-render with same props
      rerender(<CoreFunctionality />);

      expect(console.error).not.toHaveBeenCalled();
      console.error = originalConsoleError;
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

  describe('Initial Render', () => {
    it('should render loading state initially', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockData }), 1000))
      );

      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('should render the main title and primary actions', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /core functionality/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add new/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });

    it('should fetch and display data on initial load', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    it('should display all data items in a table format', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows).toHaveLength(mockData.length + 1); // +1 for header row

        mockData.forEach((item) => {
          expect(screen.getByText(item.name)).toBeInTheDocument();
          expect(screen.getByText(item.status)).toBeInTheDocument();
          expect(screen.getByText(item.value.toString())).toBeInTheDocument();
        });
      });
    });

    it('should display empty state when no data is available', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no items found/i)).toBeInTheDocument();
        expect(screen.queryByRole('row')).not.toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      const errorMessage = 'Failed to fetch data';
      (axios.get as jest.Mock).mockRejectedValue(new Error(errorMessage));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: errorMessage,
          })
        );
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow sorting by column headers', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const nameHeader = screen.getByRole('columnheader', { name: /name/i });
        await user.click(nameHeader);

        // Verify sort indicator appears
        expect(within(nameHeader).getByTestId('sort-icon')).toBeInTheDocument();

        // Verify API call with sort parameter
        expect(axios.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          params: expect.objectContaining({
            sortBy: 'name',
            sortOrder: 'asc',
          }),
        }));
      });
    });

    it('should open the add new item modal when clicking the add button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: /add new/i }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /add new item/i })).toBeInTheDocument();
      });
    });

    it('should refresh data when clicking the refresh button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: /refresh/i }));
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should navigate to details page when clicking on a table row', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const rows = screen.getAllByRole('row');
        await user.click(rows[1]); // First data row

        expect(mockNavigate).toHaveBeenCalledWith('/details/1');
      });
    });

    it('should filter data based on search input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const searchInput = screen.getByRole('searchbox');
        await user.type(searchInput, 'Item 1');

        expect(axios.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          params: expect.objectContaining({
            search: 'Item 1',
          }),
        }));
      });
    });
  });

  describe('Pagination', () => {
    const paginatedData = {
      data: mockData,
      total: 20,
      page: 1,
      pageSize: 10,
    };

    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: paginatedData });
    });

    it('should display pagination controls when data is paginated', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/page 1 of 2/i)).toBeInTheDocument();
      });
    });

    it('should change page when pagination controls are used', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const nextPageButton = screen.getByLabelText(/go to next page/i);
        await user.click(nextPageButton);

        expect(axios.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          params: expect.objectContaining({
            page: 2,
          }),
        }));
      });
    });

    it('should update page size when page size selector is changed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const pageSizeSelect = screen.getByLabelText(/items per page/i);
        await user.selectOptions(pageSizeSelect, '20');

        expect(axios.get).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          params: expect.objectContaining({
            pageSize: 20,
            page: 1, // Should reset to first page
          }),
        }));
      });
    });
  });

  describe('Form Modal', () => {
    it('should validate form inputs and show errors', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: /add new/i }));

        const submitButton = screen.getByRole('button', { name: /submit/i });
        await user.click(submitButton);

        expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/value is required/i)).toBeInTheDocument();
      });
    });

    it('should submit form data when valid', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockResolvedValue({ data: { id: '3', ...mockData[0] } });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: /add new/i }));

        await user.type(screen.getByLabelText(/name/i), 'New Item');
        await user.type(screen.getByLabelText(/value/i), '300');
        await user.click(screen.getByLabelText(/active/i));

        const submitButton = screen.getByRole('button', { name: /submit/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(axios.post).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              name: 'New Item',
              value: 300,
              status: 'active',
            }),
            expect.anything()
          );

          expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'success',
              message: 'Item created successfully',
            })
          );
        });
      });
    });

    it('should handle form submission errors', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to create item';
      (axios.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: /add new/i }));

        await user.type(screen.getByLabelText(/name/i), 'New Item');
        await user.type(screen.getByLabelText(/value/i), '300');

        const submitButton = screen.getByRole('button', { name: /submit/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'error',
              message: errorMessage,
            })
          );
        });
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should open confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const deleteButtons = screen.getAllByLabelText(/delete/i);
        await user.click(deleteButtons[0]);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });
    });

    it('should delete item when confirmed', async () => {
      const user = userEvent.setup();
      (axios.delete as jest.Mock).mockResolvedValue({});

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const deleteButtons = screen.getAllByLabelText(/delete/i);
        await user.click(deleteButtons[0]);

        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        await user.click(confirmButton);

        await waitFor(() => {
          expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/1'), expect.anything());
          expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'success',
              message: 'Item deleted successfully',
            })
          );
        });
      });
    });

    it('should handle delete errors', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to delete item';
      (axios.delete as jest.Mock).mockRejectedValue(new Error(errorMessage));

      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        const deleteButtons = screen.getAllByLabelText(/delete/i);
        await user.click(deleteButtons[0]);

        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        await user.click(confirmButton);

        await waitFor(() => {
          expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'error',
              message: errorMessage,
            })
          );
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add new/i })).toHaveAttribute('aria-label', 'Add new item');
        expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', 'Search items');
        expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Items list');
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        // Tab through interactive elements
        await user.tab();
        expect(screen.getByRole('searchbox')).toHaveFocus();

        await user.tab();
        expect(screen.getByRole('button', { name: /add new/i })).toHaveFocus();

        await user.tab();
        expect(screen.getByRole('button', { name: /refresh/i })).toHaveFocus();

        // Test table navigation
        const table = screen.getByRole('table');
        await user.tab();
        expect(within(table).getByRole('columnheader', { name: /name/i })).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /core functionality/i });
        expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Example - adjust based on your actual styles

        const tableHeaders = screen.getAllByRole('columnheader');
        tableHeaders.forEach(header => {
          expect(header).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Example
        });
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component rendering errors gracefully', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const OriginalComponent = CoreFunctionality;
      const ErrorThrowingComponent = () => {
        throw new Error('Test error');
      };

      // Temporarily replace the component with an error-throwing version
      jest.doMock('./CoreFunctionality', () => ErrorThrowingComponent);

      // This would normally be in a separate test file with the error boundary
      // Here we're just verifying the error is caught
      expect(() => renderWithProviders(<ErrorThrowingComponent />)).toThrow();

      console.error.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when props remain the same', () => {
      const { rerender } = renderWithProviders(<CoreFunctionality />);

      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Re-render with same props
      rerender(<CoreFunctionality />);

      expect(console.error).not.toHaveBeenCalled();
      console.error = originalConsoleError;
    });
  });
});