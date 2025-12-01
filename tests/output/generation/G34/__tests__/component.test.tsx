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
  user: { id: '1', role: 'admin', token: 'test-token' },
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      mockedAxios.get.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
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

    it('should render data table when fetch is successful', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
        expect(screen.getByText(mockData.description)).toBeInTheDocument();
      });
    });
  });

  describe('Data Table Interactions', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
    });

    it('should allow sorting by name column', async () => {
      renderWithProviders(<CoreFunctionality />);

      const nameHeader = await screen.findByText(/name/i);
      fireEvent.click(nameHeader);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { sortBy: 'name', sortOrder: 'asc' },
        })
      );
    });

    it('should open edit modal when edit button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      const editButtons = await screen.findAllByLabelText(/edit/i);
      fireEvent.click(editButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockData.name)).toBeInTheDocument();
    });

    it('should open delete confirmation when delete button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      const deleteButtons = await screen.findAllByLabelText(/delete/i);
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
    });
  });

  describe('Create Functionality', () => {
    it('should open create modal when create button is clicked', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      renderWithProviders(<CoreFunctionality />);

      const createButton = await screen.findByText(/create new/i);
      fireEvent.click(createButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/create new item/i)).toBeInTheDocument();
    });

    it('should validate form fields before submission', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      renderWithProviders(<CoreFunctionality />);

      const createButton = await screen.findByText(/create new/i);
      fireEvent.click(createButton);

      const submitButton = screen.getByText(/submit/i);
      fireEvent.click(submitButton);

      expect(await screen.findAllByText(/required/i)).toHaveLength(2);
    });

    it('should create new item successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      mockedAxios.post.mockResolvedValue({ data: { ...mockData, id: '2' } });
      renderWithProviders(<CoreFunctionality />);

      const createButton = await screen.findByText(/create new/i);
      fireEvent.click(createButton);

      const nameInput = screen.getByLabelText(/name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const submitButton = screen.getByText(/submit/i);

      await userEvent.type(nameInput, 'New Item');
      await userEvent.type(descriptionInput, 'New Description');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          {
            name: 'New Item',
            description: 'New Description',
            status: 'active',
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

    it('should show error when creation fails', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      mockedAxios.post.mockRejectedValue(new Error('Creation failed'));
      renderWithProviders(<CoreFunctionality />);

      const createButton = await screen.findByText(/create new/i);
      fireEvent.click(createButton);

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByText(/submit/i);

      await userEvent.type(nameInput, 'New Item');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to create item',
          })
        );
      });
    });
  });

  describe('Edit Functionality', () => {
    it('should update item successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      mockedAxios.put.mockResolvedValue({ data: { ...mockData, name: 'Updated Name' } });
      renderWithProviders(<CoreFunctionality />);

      const editButtons = await screen.findAllByLabelText(/edit/i);
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Name');

      const submitButton = screen.getByText(/update/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalledWith(
          expect.stringContaining(mockData.id),
          {
            ...mockData,
            name: 'Updated Name',
          },
          expect.any(Object)
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item updated successfully',
          })
        );
      });
    });

    it('should show error when update fails', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      mockedAxios.put.mockRejectedValue(new Error('Update failed'));
      renderWithProviders(<CoreFunctionality />);

      const editButtons = await screen.findAllByLabelText(/edit/i);
      fireEvent.click(editButtons[0]);

      const submitButton = screen.getByText(/update/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to update item',
          })
        );
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should delete item successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      mockedAxios.delete.mockResolvedValue({});
      renderWithProviders(<CoreFunctionality />);

      const deleteButtons = await screen.findAllByLabelText(/delete/i);
      fireEvent.click(deleteButtons[0]);

      const confirmButton = await screen.findByText(/confirm/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockedAxios.delete).toHaveBeenCalledWith(
          expect.stringContaining(mockData.id),
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

    it('should show error when deletion fails', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      mockedAxios.delete.mockRejectedValue(new Error('Deletion failed'));
      renderWithProviders(<CoreFunctionality />);

      const deleteButtons = await screen.findAllByLabelText(/delete/i);
      fireEvent.click(deleteButtons[0]);

      const confirmButton = await screen.findByText(/confirm/i);
      fireEvent.click(confirmButton);

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
    it('should load next page when pagination button is clicked', async () => {
      const mockPage1 = { data: [mockData], total: 2, page: 1, pageSize: 1 };
      const mockPage2 = { data: [{ ...mockData, id: '2', name: 'Second Item' }], total: 2, page: 2, pageSize: 1 };

      mockedAxios.get
        .mockImplementationOnce(() => Promise.resolve({ data: mockPage1 }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockPage2 }));

      renderWithProviders(<CoreFunctionality />);

      const nextPageButton = await screen.findByLabelText(/next page/i);
      fireEvent.click(nextPageButton);

      await waitFor(() => {
        expect(screen.getByText('Second Item')).toBeInTheDocument();
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            params: { page: 2, pageSize: 10 },
          })
        );
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter results based on search input', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      const searchInput = await screen.findByPlaceholderText(/search/i);
      await userEvent.type(searchInput, 'Test');

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            params: { search: 'Test' },
          })
        );
      });
    });

    it('should debounce search input', async () => {
      jest.useFakeTimers();
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      const searchInput = await screen.findByPlaceholderText(/search/i);
      await userEvent.type(searchInput, 'Test');

      // Fast-forward time
      act(() => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      });
      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      expect(await screen.findByLabelText(/sort by name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/search items/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/create new item/i)).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      const createButton = await screen.findByText(/create new/i);
      fireEvent.keyDown(createButton, { key: 'Enter', code: 'Enter' });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have proper contrast ratios', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      const { container } = renderWithProviders(<CoreFunctionality />);

      const buttons = await screen.findAllByRole('button');
      buttons.forEach(button => {
        const style = window.getComputedStyle(button);
        const backgroundColor = style.backgroundColor;
        const color = style.color;
        // This is a simplified check - in real tests you'd use a proper contrast checker
        expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(color).not.toBe('rgba(0, 0, 0, 0)');
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component errors gracefully', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = CoreFunctionality;

      const BrokenComponent = () => {
        throw new Error('Test error');
      };

      // Temporarily replace the component with a broken one
      jest.doMock('./CoreFunctionality', () => BrokenComponent);

      // Re-import the component to get the mocked version
      const { CoreFunctionality: BrokenCoreFunctionality } = require('./CoreFunctionality');

      renderWithProviders(<BrokenCoreFunctionality />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/test error/i)).toBeInTheDocument();

      jest.restoreAllMocks();
    });
  });

  describe('Authentication', () => {
    it('should redirect to login when not authenticated', () => {
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

    it('should show unauthorized message when API returns 403', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Not authorized' },
        },
      });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/not authorized/i)).toBeInTheDocument();
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Not authorized to perform this action',
          })
        );
      });
    });
  });

  describe('Performance', () => {
    it('should implement virtualization for large datasets', async () => {
      const largeDataset = Array(1000).fill(0).map((_, i) => ({
        ...mockData,
        id: `id-${i}`,
        name: `Item ${i}`,
      }));

      mockedAxios.get.mockResolvedValue({ data: largeDataset });
      renderWithProviders(<CoreFunctionality />);

      // Check that not all items are rendered at once
      const rows = await screen.findAllByRole('row');
      expect(rows.length).toBeLessThan(1000);
      expect(rows.length).toBeGreaterThan(1); // At least header row
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
  user: { id: '1', role: 'admin', token: 'test-token' },
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      mockedAxios.get.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
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

    it('should render data table when fetch is successful', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
        expect(screen.getByText(mockData.description)).toBeInTheDocument();
      });
    });
  });

  describe('Data Table Interactions', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
    });

    it('should allow sorting by name column', async () => {
      renderWithProviders(<CoreFunctionality />);

      const nameHeader = await screen.findByText(/name/i);
      fireEvent.click(nameHeader);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { sortBy: 'name', sortOrder: 'asc' },
        })
      );
    });

    it('should open edit modal when edit button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      const editButtons = await screen.findAllByLabelText(/edit/i);
      fireEvent.click(editButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockData.name)).toBeInTheDocument();
    });

    it('should open delete confirmation when delete button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      const deleteButtons = await screen.findAllByLabelText(/delete/i);
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
    });
  });

  describe('Create Functionality', () => {
    it('should open create modal when create button is clicked', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      renderWithProviders(<CoreFunctionality />);

      const createButton = await screen.findByText(/create new/i);
      fireEvent.click(createButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/create new item/i)).toBeInTheDocument();
    });

    it('should validate form fields before submission', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      renderWithProviders(<CoreFunctionality />);

      const createButton = await screen.findByText(/create new/i);
      fireEvent.click(createButton);

      const submitButton = screen.getByText(/submit/i);
      fireEvent.click(submitButton);

      expect(await screen.findAllByText(/required/i)).toHaveLength(2);
    });

    it('should create new item successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      mockedAxios.post.mockResolvedValue({ data: { ...mockData, id: '2' } });
      renderWithProviders(<CoreFunctionality />);

      const createButton = await screen.findByText(/create new/i);
      fireEvent.click(createButton);

      const nameInput = screen.getByLabelText(/name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const submitButton = screen.getByText(/submit/i);

      await userEvent.type(nameInput, 'New Item');
      await userEvent.type(descriptionInput, 'New Description');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          {
            name: 'New Item',
            description: 'New Description',
            status: 'active',
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

    it('should show error when creation fails', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      mockedAxios.post.mockRejectedValue(new Error('Creation failed'));
      renderWithProviders(<CoreFunctionality />);

      const createButton = await screen.findByText(/create new/i);
      fireEvent.click(createButton);

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByText(/submit/i);

      await userEvent.type(nameInput, 'New Item');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to create item',
          })
        );
      });
    });
  });

  describe('Edit Functionality', () => {
    it('should update item successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      mockedAxios.put.mockResolvedValue({ data: { ...mockData, name: 'Updated Name' } });
      renderWithProviders(<CoreFunctionality />);

      const editButtons = await screen.findAllByLabelText(/edit/i);
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Name');

      const submitButton = screen.getByText(/update/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalledWith(
          expect.stringContaining(mockData.id),
          {
            ...mockData,
            name: 'Updated Name',
          },
          expect.any(Object)
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Item updated successfully',
          })
        );
      });
    });

    it('should show error when update fails', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      mockedAxios.put.mockRejectedValue(new Error('Update failed'));
      renderWithProviders(<CoreFunctionality />);

      const editButtons = await screen.findAllByLabelText(/edit/i);
      fireEvent.click(editButtons[0]);

      const submitButton = screen.getByText(/update/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to update item',
          })
        );
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should delete item successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      mockedAxios.delete.mockResolvedValue({});
      renderWithProviders(<CoreFunctionality />);

      const deleteButtons = await screen.findAllByLabelText(/delete/i);
      fireEvent.click(deleteButtons[0]);

      const confirmButton = await screen.findByText(/confirm/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockedAxios.delete).toHaveBeenCalledWith(
          expect.stringContaining(mockData.id),
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

    it('should show error when deletion fails', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      mockedAxios.delete.mockRejectedValue(new Error('Deletion failed'));
      renderWithProviders(<CoreFunctionality />);

      const deleteButtons = await screen.findAllByLabelText(/delete/i);
      fireEvent.click(deleteButtons[0]);

      const confirmButton = await screen.findByText(/confirm/i);
      fireEvent.click(confirmButton);

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
    it('should load next page when pagination button is clicked', async () => {
      const mockPage1 = { data: [mockData], total: 2, page: 1, pageSize: 1 };
      const mockPage2 = { data: [{ ...mockData, id: '2', name: 'Second Item' }], total: 2, page: 2, pageSize: 1 };

      mockedAxios.get
        .mockImplementationOnce(() => Promise.resolve({ data: mockPage1 }))
        .mockImplementationOnce(() => Promise.resolve({ data: mockPage2 }));

      renderWithProviders(<CoreFunctionality />);

      const nextPageButton = await screen.findByLabelText(/next page/i);
      fireEvent.click(nextPageButton);

      await waitFor(() => {
        expect(screen.getByText('Second Item')).toBeInTheDocument();
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            params: { page: 2, pageSize: 10 },
          })
        );
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter results based on search input', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      const searchInput = await screen.findByPlaceholderText(/search/i);
      await userEvent.type(searchInput, 'Test');

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            params: { search: 'Test' },
          })
        );
      });
    });

    it('should debounce search input', async () => {
      jest.useFakeTimers();
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      const searchInput = await screen.findByPlaceholderText(/search/i);
      await userEvent.type(searchInput, 'Test');

      // Fast-forward time
      act(() => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      });
      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      expect(await screen.findByLabelText(/sort by name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/search items/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/create new item/i)).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      const createButton = await screen.findByText(/create new/i);
      fireEvent.keyDown(createButton, { key: 'Enter', code: 'Enter' });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have proper contrast ratios', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      const { container } = renderWithProviders(<CoreFunctionality />);

      const buttons = await screen.findAllByRole('button');
      buttons.forEach(button => {
        const style = window.getComputedStyle(button);
        const backgroundColor = style.backgroundColor;
        const color = style.color;
        // This is a simplified check - in real tests you'd use a proper contrast checker
        expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(color).not.toBe('rgba(0, 0, 0, 0)');
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component errors gracefully', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = CoreFunctionality;

      const BrokenComponent = () => {
        throw new Error('Test error');
      };

      // Temporarily replace the component with a broken one
      jest.doMock('./CoreFunctionality', () => BrokenComponent);

      // Re-import the component to get the mocked version
      const { CoreFunctionality: BrokenCoreFunctionality } = require('./CoreFunctionality');

      renderWithProviders(<BrokenCoreFunctionality />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/test error/i)).toBeInTheDocument();

      jest.restoreAllMocks();
    });
  });

  describe('Authentication', () => {
    it('should redirect to login when not authenticated', () => {
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

    it('should show unauthorized message when API returns 403', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Not authorized' },
        },
      });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/not authorized/i)).toBeInTheDocument();
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Not authorized to perform this action',
          })
        );
      });
    });
  });

  describe('Performance', () => {
    it('should implement virtualization for large datasets', async () => {
      const largeDataset = Array(1000).fill(0).map((_, i) => ({
        ...mockData,
        id: `id-${i}`,
        name: `Item ${i}`,
      }));

      mockedAxios.get.mockResolvedValue({ data: largeDataset });
      renderWithProviders(<CoreFunctionality />);

      // Check that not all items are rendered at once
      const rows = await screen.findAllByRole('row');
      expect(rows.length).toBeLessThan(1000);
      expect(rows.length).toBeGreaterThan(1); // At least header row
    });
  });
});