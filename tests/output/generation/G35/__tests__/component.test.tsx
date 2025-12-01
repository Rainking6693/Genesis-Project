import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act } from 'react-dom/test-utils';
import CoreFunctionality from './CoreFunctionality';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

// Mock axios
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

  const mockErrorResponse = {
    response: {
      data: {
        message: 'Server error occurred'
      },
      status: 500
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while data is being fetched', async () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('should render data after successful fetch', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(mockErrorResponse);
      const mockShowNotification = jest.fn();
      renderWithProviders(<CoreFunctionality />, {
        notificationValue: { showNotification: mockShowNotification }
      });

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to load data: Server error occurred'
          })
        );
      });
    });
  });

  describe('Data Display and Interaction', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should display all data items in a table format', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();

        expect(screen.getByText('Item 2')).toBeInTheDocument();
        expect(screen.getByText('inactive')).toBeInTheDocument();
        expect(screen.getByText('200')).toBeInTheDocument();
      });
    });

    it('should allow sorting by name column', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);

      // Verify sort indicator appears
      expect(within(nameHeader).getByTestId('sort-icon')).toBeInTheDocument();

      // Mock sorted data response
      mockedAxios.get.mockResolvedValueOnce({
        data: [...mockData].sort((a, b) => a.name.localeCompare(b.name))
      });

      // Click again to sort descending
      await user.click(nameHeader);
    });

    it('should filter items based on search input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search items...');
      await user.type(searchInput, 'Item 1');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { search: 'Item 1' }
        })
      );
    });
  });

  describe('Item Actions', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should navigate to details page when view details is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByLabelText('View details');
      await user.click(viewButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/details/1');
    });

    it('should open edit modal when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit item');
      await user.click(editButtons[0]);

      expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Item 1')).toBeInTheDocument();
    });

    it('should update item when edit form is submitted', async () => {
      const user = userEvent.setup();
      mockedAxios.put.mockResolvedValue({ data: { ...mockData[0], name: 'Updated Item 1' } });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit item');
      await user.click(editButtons[0]);

      const nameInput = screen.getByLabelText('Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Item 1');

      const submitButton = screen.getByText('Save Changes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalledWith(
          expect.stringContaining('/1'),
          { name: 'Updated Item 1', status: 'active', value: 100 }
        );
        expect(screen.getByText('Updated Item 1')).toBeInTheDocument();
      });
    });

    it('should show error when edit fails', async () => {
      const user = userEvent.setup();
      mockedAxios.put.mockRejectedValue(mockErrorResponse);
      const mockShowNotification = jest.fn();
      renderWithProviders(<CoreFunctionality />, {
        notificationValue: { showNotification: mockShowNotification }
      });

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit item');
      await user.click(editButtons[0]);

      const submitButton = screen.getByText('Save Changes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to update item: Server error occurred'
          })
        );
      });
    });

    it('should delete item when delete button is clicked and confirmed', async () => {
      const user = userEvent.setup();
      mockedAxios.delete.mockResolvedValue({});
      window.confirm = jest.fn().mockImplementation(() => true);

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete item');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockedAxios.delete).toHaveBeenCalledWith(expect.stringContaining('/1'));
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      });
    });

    it('should not delete item when confirmation is canceled', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn().mockImplementation(() => false);

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete item');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockedAxios.delete).not.toHaveBeenCalled();
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    const mockPaginatedData = {
      data: mockData,
      total: 20,
      page: 1,
      limit: 10
    };

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockPaginatedData });
    });

    it('should display pagination controls when there are multiple pages', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByLabelText('pagination-navigation')).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });
    });

    it('should fetch new data when page is changed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const nextPageButton = screen.getByLabelText('Go to next page');
      await user.click(nextPageButton);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { page: 2 }
        })
      );
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText('Search items...')).toBeInTheDocument();
        expect(screen.getAllByLabelText('View details')[0]).toBeInTheDocument();
        expect(screen.getAllByLabelText('Edit item')[0]).toBeInTheDocument();
        expect(screen.getAllByLabelText('Delete item')[0]).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByPlaceholderText('Search items...')).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText('View details')[0]).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText('Edit item')[0]).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText('Delete item')[0]).toHaveFocus();
    });

    it('should have proper table semantics for screen readers', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();

        const headers = within(table).getAllByRole('columnheader');
        expect(headers).toHaveLength(4); // Assuming 4 columns

        const rows = within(table).getAllByRole('row');
        expect(rows).toHaveLength(3); // Header + 2 data rows
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data state', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument();
      });
    });

    it('should disable actions for unauthorized users', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />, {
        authValue: { user: { id: '1', name: 'Test User', role: 'viewer' }, token: 'test-token' }
      });

      await waitFor(() => {
        expect(screen.getAllByLabelText('View details')[0]).toBeInTheDocument();
        expect(screen.queryByLabelText('Edit item')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Delete item')).not.toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue({ message: 'Network Error' });
      const mockShowNotification = jest.fn();
      renderWithProviders(<CoreFunctionality />, {
        notificationValue: { showNotification: mockShowNotification }
      });

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Network error occurred. Please check your connection.'
          })
        );
      });
    });
  });

  describe('Performance', () => {
    it('should not make unnecessary API calls when props change', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
      const { rerender } = renderWithProviders(<CoreFunctionality someProp="value" />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      // Rerender with different prop
      rerender(<CoreFunctionality someProp="new value" />);

      // Should not make another API call
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
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

// Mock axios
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

  const mockErrorResponse = {
    response: {
      data: {
        message: 'Server error occurred'
      },
      status: 500
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while data is being fetched', async () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('should render data after successful fetch', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(mockErrorResponse);
      const mockShowNotification = jest.fn();
      renderWithProviders(<CoreFunctionality />, {
        notificationValue: { showNotification: mockShowNotification }
      });

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to load data: Server error occurred'
          })
        );
      });
    });
  });

  describe('Data Display and Interaction', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should display all data items in a table format', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();

        expect(screen.getByText('Item 2')).toBeInTheDocument();
        expect(screen.getByText('inactive')).toBeInTheDocument();
        expect(screen.getByText('200')).toBeInTheDocument();
      });
    });

    it('should allow sorting by name column', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);

      // Verify sort indicator appears
      expect(within(nameHeader).getByTestId('sort-icon')).toBeInTheDocument();

      // Mock sorted data response
      mockedAxios.get.mockResolvedValueOnce({
        data: [...mockData].sort((a, b) => a.name.localeCompare(b.name))
      });

      // Click again to sort descending
      await user.click(nameHeader);
    });

    it('should filter items based on search input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search items...');
      await user.type(searchInput, 'Item 1');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { search: 'Item 1' }
        })
      );
    });
  });

  describe('Item Actions', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should navigate to details page when view details is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByLabelText('View details');
      await user.click(viewButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/details/1');
    });

    it('should open edit modal when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit item');
      await user.click(editButtons[0]);

      expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Item 1')).toBeInTheDocument();
    });

    it('should update item when edit form is submitted', async () => {
      const user = userEvent.setup();
      mockedAxios.put.mockResolvedValue({ data: { ...mockData[0], name: 'Updated Item 1' } });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit item');
      await user.click(editButtons[0]);

      const nameInput = screen.getByLabelText('Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Item 1');

      const submitButton = screen.getByText('Save Changes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalledWith(
          expect.stringContaining('/1'),
          { name: 'Updated Item 1', status: 'active', value: 100 }
        );
        expect(screen.getByText('Updated Item 1')).toBeInTheDocument();
      });
    });

    it('should show error when edit fails', async () => {
      const user = userEvent.setup();
      mockedAxios.put.mockRejectedValue(mockErrorResponse);
      const mockShowNotification = jest.fn();
      renderWithProviders(<CoreFunctionality />, {
        notificationValue: { showNotification: mockShowNotification }
      });

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit item');
      await user.click(editButtons[0]);

      const submitButton = screen.getByText('Save Changes');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to update item: Server error occurred'
          })
        );
      });
    });

    it('should delete item when delete button is clicked and confirmed', async () => {
      const user = userEvent.setup();
      mockedAxios.delete.mockResolvedValue({});
      window.confirm = jest.fn().mockImplementation(() => true);

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete item');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockedAxios.delete).toHaveBeenCalledWith(expect.stringContaining('/1'));
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      });
    });

    it('should not delete item when confirmation is canceled', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn().mockImplementation(() => false);

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete item');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockedAxios.delete).not.toHaveBeenCalled();
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    const mockPaginatedData = {
      data: mockData,
      total: 20,
      page: 1,
      limit: 10
    };

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockPaginatedData });
    });

    it('should display pagination controls when there are multiple pages', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByLabelText('pagination-navigation')).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });
    });

    it('should fetch new data when page is changed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const nextPageButton = screen.getByLabelText('Go to next page');
      await user.click(nextPageButton);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { page: 2 }
        })
      );
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText('Search items...')).toBeInTheDocument();
        expect(screen.getAllByLabelText('View details')[0]).toBeInTheDocument();
        expect(screen.getAllByLabelText('Edit item')[0]).toBeInTheDocument();
        expect(screen.getAllByLabelText('Delete item')[0]).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByPlaceholderText('Search items...')).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText('View details')[0]).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText('Edit item')[0]).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText('Delete item')[0]).toHaveFocus();
    });

    it('should have proper table semantics for screen readers', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();

        const headers = within(table).getAllByRole('columnheader');
        expect(headers).toHaveLength(4); // Assuming 4 columns

        const rows = within(table).getAllByRole('row');
        expect(rows).toHaveLength(3); // Header + 2 data rows
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data state', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument();
      });
    });

    it('should disable actions for unauthorized users', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />, {
        authValue: { user: { id: '1', name: 'Test User', role: 'viewer' }, token: 'test-token' }
      });

      await waitFor(() => {
        expect(screen.getAllByLabelText('View details')[0]).toBeInTheDocument();
        expect(screen.queryByLabelText('Edit item')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Delete item')).not.toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue({ message: 'Network Error' });
      const mockShowNotification = jest.fn();
      renderWithProviders(<CoreFunctionality />, {
        notificationValue: { showNotification: mockShowNotification }
      });

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Network error occurred. Please check your connection.'
          })
        );
      });
    });
  });

  describe('Performance', () => {
    it('should not make unnecessary API calls when props change', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
      const { rerender } = renderWithProviders(<CoreFunctionality someProp="value" />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      // Rerender with different prop
      rerender(<CoreFunctionality someProp="new value" />);

      // Should not make another API call
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });
});