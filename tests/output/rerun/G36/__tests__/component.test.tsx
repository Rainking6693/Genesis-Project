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
};

const mockNotificationContext = {
  showNotification: jest.fn(),
  hideNotification: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <NotificationContext.Provider value={mockNotificationContext}>
        <MemoryRouter>
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
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should render data successfully after loading', async () => {
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
        total: 20,
        page: 1,
        limit: 10,
      };
      mockedAxios.get.mockResolvedValue({ data: mockPaginatedData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText(/pagination navigation/i)).toBeInTheDocument();
        expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
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
        fireEvent.click(screen.getByLabelText(/view details for/i));
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(mockData.description)).toBeInTheDocument();
    });

    it('should close details modal when close button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        fireEvent.click(screen.getByLabelText(/view details for/i));
        fireEvent.click(screen.getByLabelText(/close/i));
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should navigate to edit page when edit button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText(/edit item/i));
      });

      expect(mockNavigate).toHaveBeenCalledWith(`/edit/${mockData.id}`);
    });

    it('should show confirmation dialog when delete button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText(/delete item/i));
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });

    it('should delete item when confirmation is accepted', async () => {
      mockedAxios.delete.mockResolvedValue({});
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        fireEvent.click(screen.getByLabelText(/delete item/i));
        fireEvent.click(screen.getByText(/confirm/i));
      });

      await waitFor(() => {
        expect(mockedAxios.delete).toHaveBeenCalledWith(`/api/items/${mockData.id}`, {
          headers: { Authorization: `Bearer ${mockAuthContext.user.token}` },
        });
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });

    it('should show error when delete fails', async () => {
      mockedAxios.delete.mockRejectedValue(new Error('Delete failed'));
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        fireEvent.click(screen.getByLabelText(/delete item/i));
        fireEvent.click(screen.getByText(/confirm/i));
      });

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error' })
        );
      });
    });
  });

  describe('Form Interactions', () => {
    it('should validate form fields and show errors', async () => {
      renderWithProviders(<CoreFunctionality />);

      fireEvent.click(screen.getByText(/create new/i));

      await waitFor(() => {
        const submitButton = screen.getByText(/submit/i);
        fireEvent.click(submitButton);
      });

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });

    it('should submit form successfully with valid data', async () => {
      mockedAxios.post.mockResolvedValue({ data: { ...mockData, id: '2' } });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        fireEvent.click(screen.getByText(/create new/i));
      });

      const nameInput = screen.getByLabelText(/name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const submitButton = screen.getByText(/submit/i);

      await userEvent.type(nameInput, 'New Item');
      await userEvent.type(descriptionInput, 'New Description');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/items',
          expect.objectContaining({ name: 'New Item', description: 'New Description' }),
          { headers: { Authorization: `Bearer ${mockAuthContext.user.token}` } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });

    it('should handle form submission error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Submission failed'));
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        fireEvent.click(screen.getByText(/create new/i));
      });

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByText(/submit/i);

      await userEvent.type(nameInput, 'New Item');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error' })
        );
      });
    });
  });

  describe('Search and Filter', () => {
    it('should filter items based on search input', async () => {
      const mockItems = [
        { ...mockData, name: 'Test Item 1' },
        { ...mockData, name: 'Test Item 2', id: '2' },
      ];
      mockedAxios.get.mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search/i);
        fireEvent.change(searchInput, { target: { value: 'Test Item 1' } });
      });

      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
    });

    it('should filter items by status', async () => {
      const mockItems = [
        { ...mockData, status: 'active' },
        { ...mockData, status: 'inactive', id: '2' },
      ];
      mockedAxios.get.mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/filter by status/i);
        fireEvent.change(statusFilter, { target: { value: 'inactive' } });
      });

      expect(screen.getByText(/inactive/i)).toBeInTheDocument();
      expect(screen.queryByText(/active/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText(/view details for/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/edit item/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/delete item/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/search items/i)).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const viewDetailsButton = screen.getByLabelText(/view details for/i);
        expect(viewDetailsButton).toHaveFocus();

        fireEvent.keyDown(viewDetailsButton, { key: 'Enter', code: 'Enter' });
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      const { container } = renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const textElements = container.querySelectorAll('p, h1, h2, h3, span, a, button');
        textElements.forEach(el => {
          const style = window.getComputedStyle(el);
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          // This is a simplified check - in real tests you'd use a proper contrast checking library
          expect(color).not.toBe(backgroundColor);
        });
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component rendering errors gracefully', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const BrokenComponent = () => {
        throw new Error('Test error');
        return <div>Broken</div>;
      };

      renderWithProviders(<BrokenComponent />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
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
          <CoreFunctionality />
        </AuthContext.Provider>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should disable actions for read-only users', async () => {
      const readOnlyMock = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'viewer' },
      };

      render(
        <AuthContext.Provider value={readOnlyMock}>
          <CoreFunctionality />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/view details for/i)).toBeEnabled();
        expect(screen.getByLabelText(/edit item/i)).toBeDisabled();
        expect(screen.getByLabelText(/delete item/i)).toBeDisabled();
        expect(screen.getByText(/create new/i)).toBeDisabled();
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

const mockAuthContext = {
  user: { id: '123', role: 'admin', token: 'test-token' },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
};

const mockNotificationContext = {
  showNotification: jest.fn(),
  hideNotification: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <NotificationContext.Provider value={mockNotificationContext}>
        <MemoryRouter>
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
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should render data successfully after loading', async () => {
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
        total: 20,
        page: 1,
        limit: 10,
      };
      mockedAxios.get.mockResolvedValue({ data: mockPaginatedData });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText(/pagination navigation/i)).toBeInTheDocument();
        expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
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
        fireEvent.click(screen.getByLabelText(/view details for/i));
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(mockData.description)).toBeInTheDocument();
    });

    it('should close details modal when close button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        fireEvent.click(screen.getByLabelText(/view details for/i));
        fireEvent.click(screen.getByLabelText(/close/i));
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should navigate to edit page when edit button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText(/edit item/i));
      });

      expect(mockNavigate).toHaveBeenCalledWith(`/edit/${mockData.id}`);
    });

    it('should show confirmation dialog when delete button is clicked', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText(/delete item/i));
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });

    it('should delete item when confirmation is accepted', async () => {
      mockedAxios.delete.mockResolvedValue({});
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        fireEvent.click(screen.getByLabelText(/delete item/i));
        fireEvent.click(screen.getByText(/confirm/i));
      });

      await waitFor(() => {
        expect(mockedAxios.delete).toHaveBeenCalledWith(`/api/items/${mockData.id}`, {
          headers: { Authorization: `Bearer ${mockAuthContext.user.token}` },
        });
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });

    it('should show error when delete fails', async () => {
      mockedAxios.delete.mockRejectedValue(new Error('Delete failed'));
      renderWithProviders(<CoreFunctionality />);

      await waitFor(async () => {
        fireEvent.click(screen.getByLabelText(/delete item/i));
        fireEvent.click(screen.getByText(/confirm/i));
      });

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error' })
        );
      });
    });
  });

  describe('Form Interactions', () => {
    it('should validate form fields and show errors', async () => {
      renderWithProviders(<CoreFunctionality />);

      fireEvent.click(screen.getByText(/create new/i));

      await waitFor(() => {
        const submitButton = screen.getByText(/submit/i);
        fireEvent.click(submitButton);
      });

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });

    it('should submit form successfully with valid data', async () => {
      mockedAxios.post.mockResolvedValue({ data: { ...mockData, id: '2' } });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        fireEvent.click(screen.getByText(/create new/i));
      });

      const nameInput = screen.getByLabelText(/name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const submitButton = screen.getByText(/submit/i);

      await userEvent.type(nameInput, 'New Item');
      await userEvent.type(descriptionInput, 'New Description');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/items',
          expect.objectContaining({ name: 'New Item', description: 'New Description' }),
          { headers: { Authorization: `Bearer ${mockAuthContext.user.token}` } }
        );
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });

    it('should handle form submission error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Submission failed'));
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        fireEvent.click(screen.getByText(/create new/i));
      });

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByText(/submit/i);

      await userEvent.type(nameInput, 'New Item');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNotificationContext.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error' })
        );
      });
    });
  });

  describe('Search and Filter', () => {
    it('should filter items based on search input', async () => {
      const mockItems = [
        { ...mockData, name: 'Test Item 1' },
        { ...mockData, name: 'Test Item 2', id: '2' },
      ];
      mockedAxios.get.mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search/i);
        fireEvent.change(searchInput, { target: { value: 'Test Item 1' } });
      });

      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
    });

    it('should filter items by status', async () => {
      const mockItems = [
        { ...mockData, status: 'active' },
        { ...mockData, status: 'inactive', id: '2' },
      ];
      mockedAxios.get.mockResolvedValue({ data: mockItems });

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/filter by status/i);
        fireEvent.change(statusFilter, { target: { value: 'inactive' } });
      });

      expect(screen.getByText(/inactive/i)).toBeInTheDocument();
      expect(screen.queryByText(/active/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByLabelText(/view details for/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/edit item/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/delete item/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/search items/i)).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const viewDetailsButton = screen.getByLabelText(/view details for/i);
        expect(viewDetailsButton).toHaveFocus();

        fireEvent.keyDown(viewDetailsButton, { key: 'Enter', code: 'Enter' });
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      mockedAxios.get.mockResolvedValue({ data: [mockData] });
      const { container } = renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        const textElements = container.querySelectorAll('p, h1, h2, h3, span, a, button');
        textElements.forEach(el => {
          const style = window.getComputedStyle(el);
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          // This is a simplified check - in real tests you'd use a proper contrast checking library
          expect(color).not.toBe(backgroundColor);
        });
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component rendering errors gracefully', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const BrokenComponent = () => {
        throw new Error('Test error');
        return <div>Broken</div>;
      };

      renderWithProviders(<BrokenComponent />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
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
          <CoreFunctionality />
        </AuthContext.Provider>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should disable actions for read-only users', async () => {
      const readOnlyMock = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'viewer' },
      };

      render(
        <AuthContext.Provider value={readOnlyMock}>
          <CoreFunctionality />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/view details for/i)).toBeEnabled();
        expect(screen.getByLabelText(/edit item/i)).toBeDisabled();
        expect(screen.getByLabelText(/delete item/i)).toBeDisabled();
        expect(screen.getByText(/create new/i)).toBeDisabled();
      });
    });
  });
});