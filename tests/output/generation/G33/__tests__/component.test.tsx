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

const renderWithProviders = (
  ui: React.ReactElement,
  {
    authValue = { isAuthenticated: true, user: { id: '1', role: 'admin' } },
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

  const mockError = new Error('Failed to fetch data');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton when data is being fetched', () => {
      mockedAxios.get.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('should render error message when data fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(mockError);
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      });
    });

    it('should render data table when data is successfully fetched', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
    });
  });

  describe('Data Display and Interaction', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should display all data rows with correct content', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows).toHaveLength(mockData.length + 1); // +1 for header

        expect(within(rows[1]).getByText('Item 1')).toBeInTheDocument();
        expect(within(rows[1]).getByText('active')).toBeInTheDocument();
        expect(within(rows[1]).getByText('100')).toBeInTheDocument();

        expect(within(rows[2]).getByText('Item 2')).toBeInTheDocument();
        expect(within(rows[2]).getByText('inactive')).toBeInTheDocument();
      });
    });

    it('should sort data when column header is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const nameHeader = screen.getByText(/name/i);
      await user.click(nameHeader);

      // Verify sort indicator appears
      expect(screen.getByTestId('sort-indicator')).toBeInTheDocument();

      // Mock sorted data response
      const sortedData = [...mockData].reverse();
      mockedAxios.get.mockResolvedValueOnce({ data: sortedData });

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(within(rows[1]).getByText('Item 2')).toBeInTheDocument();
        expect(within(rows[2]).getByText('Item 1')).toBeInTheDocument();
      });
    });

    it('should filter data when search input is used', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Item 1');

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Item Actions', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should open edit modal when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit item/i);
      await user.click(editButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Item 1')).toBeInTheDocument();
    });

    it('should call update API and refresh data when form is submitted', async () => {
      const user = userEvent.setup();
      mockedAxios.put.mockResolvedValue({ data: { ...mockData[0], name: 'Updated Item' } });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit item/i);
      await user.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Item');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalledWith(
          expect.stringContaining('/items/1'),
          expect.objectContaining({ name: 'Updated Item' })
        );
        expect(screen.getByText('Updated Item')).toBeInTheDocument();
      });
    });

    it('should show error when update fails', async () => {
      const user = userEvent.setup();
      mockedAxios.put.mockRejectedValue(mockError);
      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, { notificationValue });

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit item/i);
      await user.click(editButtons[0]);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(notificationValue.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to update item',
          })
        );
      });
    });

    it('should delete item when delete button is clicked and confirmed', async () => {
      const user = userEvent.setup();
      mockedAxios.delete.mockResolvedValue({});
      window.confirm = jest.fn().mockReturnValue(true);
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/delete item/i);
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockedAxios.delete).toHaveBeenCalledWith(expect.stringContaining('/items/1'));
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      });
    });

    it('should navigate to details page when view details is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const detailButtons = screen.getAllByLabelText(/view details/i);
      await user.click(detailButtons[0]);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/details/1');
      });
    });
  });

  describe('Pagination', () => {
    const paginatedData = {
      data: mockData,
      total: 20,
      page: 1,
      limit: 10,
    };

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: paginatedData });
    });

    it('should display pagination controls when there are multiple pages', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/next page/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/previous page/i)).toBeDisabled();
      });
    });

    it('should fetch new data when page is changed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const nextPageButton = screen.getByLabelText(/next page/i);
      await user.click(nextPageButton);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        );
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText(/search items/i)).toBeInTheDocument();
        expect(screen.getAllByLabelText(/edit item/i)[0]).toBeInTheDocument();
        expect(screen.getAllByLabelText(/delete item/i)[0]).toBeInTheDocument();
        expect(screen.getAllByLabelText(/view details/i)[0]).toBeInTheDocument();
      });
    });

    it('should have proper table structure with aria attributes', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toHaveAccessibleName();
        expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
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
      expect(screen.getByLabelText(/search items/i)).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText(/edit item/i)[0]).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText(/delete item/i)[0]).toHaveFocus();
    });
  });

  describe('Authentication and Authorization', () => {
    it('should disable edit and delete buttons for non-admin users', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />, {
        authValue: { isAuthenticated: true, user: { id: '1', role: 'user' } },
      });

      await waitFor(() => {
        expect(screen.getAllByLabelText(/edit item/i)[0]).toBeDisabled();
        expect(screen.getAllByLabelText(/delete item/i)[0]).toBeDisabled();
      });
    });

    it('should show login prompt for unauthenticated users', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />, {
        authValue: { isAuthenticated: false },
      });

      await waitFor(() => {
        expect(screen.getByText(/please log in to view this content/i)).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data state gracefully', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no items found/i)).toBeInTheDocument();
        expect(screen.queryByRole('row')).not.toBeInTheDocument();
      });
    });

    it('should show validation errors when submitting invalid form data', async () => {
      const user = userEvent.setup();
      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit item/i);
      await user.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(mockedAxios.put).not.toHaveBeenCalled();
      });
    });

    it('should handle API timeout gracefully', async () => {
      mockedAxios.get.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 100)
        )
      );

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/request timed out/i)).toBeInTheDocument();
      });
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

const renderWithProviders = (
  ui: React.ReactElement,
  {
    authValue = { isAuthenticated: true, user: { id: '1', role: 'admin' } },
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

  const mockError = new Error('Failed to fetch data');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton when data is being fetched', () => {
      mockedAxios.get.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('should render error message when data fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(mockError);
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      });
    });

    it('should render data table when data is successfully fetched', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
    });
  });

  describe('Data Display and Interaction', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should display all data rows with correct content', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows).toHaveLength(mockData.length + 1); // +1 for header

        expect(within(rows[1]).getByText('Item 1')).toBeInTheDocument();
        expect(within(rows[1]).getByText('active')).toBeInTheDocument();
        expect(within(rows[1]).getByText('100')).toBeInTheDocument();

        expect(within(rows[2]).getByText('Item 2')).toBeInTheDocument();
        expect(within(rows[2]).getByText('inactive')).toBeInTheDocument();
      });
    });

    it('should sort data when column header is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const nameHeader = screen.getByText(/name/i);
      await user.click(nameHeader);

      // Verify sort indicator appears
      expect(screen.getByTestId('sort-indicator')).toBeInTheDocument();

      // Mock sorted data response
      const sortedData = [...mockData].reverse();
      mockedAxios.get.mockResolvedValueOnce({ data: sortedData });

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(within(rows[1]).getByText('Item 2')).toBeInTheDocument();
        expect(within(rows[2]).getByText('Item 1')).toBeInTheDocument();
      });
    });

    it('should filter data when search input is used', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Item 1');

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Item Actions', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should open edit modal when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit item/i);
      await user.click(editButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Item 1')).toBeInTheDocument();
    });

    it('should call update API and refresh data when form is submitted', async () => {
      const user = userEvent.setup();
      mockedAxios.put.mockResolvedValue({ data: { ...mockData[0], name: 'Updated Item' } });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit item/i);
      await user.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Item');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalledWith(
          expect.stringContaining('/items/1'),
          expect.objectContaining({ name: 'Updated Item' })
        );
        expect(screen.getByText('Updated Item')).toBeInTheDocument();
      });
    });

    it('should show error when update fails', async () => {
      const user = userEvent.setup();
      mockedAxios.put.mockRejectedValue(mockError);
      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, { notificationValue });

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit item/i);
      await user.click(editButtons[0]);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(notificationValue.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to update item',
          })
        );
      });
    });

    it('should delete item when delete button is clicked and confirmed', async () => {
      const user = userEvent.setup();
      mockedAxios.delete.mockResolvedValue({});
      window.confirm = jest.fn().mockReturnValue(true);
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/delete item/i);
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockedAxios.delete).toHaveBeenCalledWith(expect.stringContaining('/items/1'));
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      });
    });

    it('should navigate to details page when view details is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const detailButtons = screen.getAllByLabelText(/view details/i);
      await user.click(detailButtons[0]);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/details/1');
      });
    });
  });

  describe('Pagination', () => {
    const paginatedData = {
      data: mockData,
      total: 20,
      page: 1,
      limit: 10,
    };

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: paginatedData });
    });

    it('should display pagination controls when there are multiple pages', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/next page/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/previous page/i)).toBeDisabled();
      });
    });

    it('should fetch new data when page is changed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const nextPageButton = screen.getByLabelText(/next page/i);
      await user.click(nextPageButton);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        );
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText(/search items/i)).toBeInTheDocument();
        expect(screen.getAllByLabelText(/edit item/i)[0]).toBeInTheDocument();
        expect(screen.getAllByLabelText(/delete item/i)[0]).toBeInTheDocument();
        expect(screen.getAllByLabelText(/view details/i)[0]).toBeInTheDocument();
      });
    });

    it('should have proper table structure with aria attributes', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toHaveAccessibleName();
        expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
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
      expect(screen.getByLabelText(/search items/i)).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText(/edit item/i)[0]).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText(/delete item/i)[0]).toHaveFocus();
    });
  });

  describe('Authentication and Authorization', () => {
    it('should disable edit and delete buttons for non-admin users', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />, {
        authValue: { isAuthenticated: true, user: { id: '1', role: 'user' } },
      });

      await waitFor(() => {
        expect(screen.getAllByLabelText(/edit item/i)[0]).toBeDisabled();
        expect(screen.getAllByLabelText(/delete item/i)[0]).toBeDisabled();
      });
    });

    it('should show login prompt for unauthenticated users', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />, {
        authValue: { isAuthenticated: false },
      });

      await waitFor(() => {
        expect(screen.getByText(/please log in to view this content/i)).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data state gracefully', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no items found/i)).toBeInTheDocument();
        expect(screen.queryByRole('row')).not.toBeInTheDocument();
      });
    });

    it('should show validation errors when submitting invalid form data', async () => {
      const user = userEvent.setup();
      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit item/i);
      await user.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(mockedAxios.put).not.toHaveBeenCalled();
      });
    });

    it('should handle API timeout gracefully', async () => {
      mockedAxios.get.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 100)
        )
      );

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/request timed out/i)).toBeInTheDocument();
      });
    });
  });
});