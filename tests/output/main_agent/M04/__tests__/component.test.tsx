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
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithProviders = (
  ui: React.ReactElement,
  {
    authValue = { user: { id: '1', name: 'Test User', email: 'test@example.com' }, isAuthenticated: true },
    notificationValue = { showNotification: jest.fn(), clearNotification: jest.fn() },
    route = '/dashboard',
  } = {}
) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <NotificationContext.Provider value={notificationValue}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/dashboard" element={ui} />
            <Route path="/settings" element={<div>Settings Page</div>} />
          </Routes>
        </MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

describe('CoreFunctionality Component', () => {
  const mockData = {
    id: '1',
    name: 'Test Project',
    status: 'active',
    metrics: { users: 100, revenue: 5000 },
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
        expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should render main content when data is loaded successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
        expect(screen.getByText(/active/i)).toBeInTheDocument();
        expect(screen.getByText(/100 users/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should allow user to refresh data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      mockedAxios.get.mockResolvedValueOnce({ data: { ...mockData, metrics: { users: 150, revenue: 7500 } } });

      await act(async () => {
        await user.click(refreshButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/150 users/i)).toBeInTheDocument();
      });
    });

    it('should show error notification when refresh fails', async () => {
      const showNotification = jest.fn();
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />, {
        notificationValue: { showNotification, clearNotification: jest.fn() },
      });

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      mockedAxios.get.mockRejectedValueOnce(mockErrorResponse);

      await act(async () => {
        await user.click(refreshButton);
      });

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to refresh data',
          })
        );
      });
    });

    it('should allow user to update project status', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/active/i)).toBeInTheDocument();
      });

      const statusDropdown = screen.getByRole('button', { name: /active/i });
      await user.click(statusDropdown);

      const pausedOption = screen.getByRole('option', { name: /paused/i });
      await user.click(pausedOption);

      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalledWith(
          expect.any(String),
          { status: 'paused' },
          expect.any(Object)
        );
      });
    });

    it('should show success notification after status update', async () => {
      const showNotification = jest.fn();
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />, {
        notificationValue: { showNotification, clearNotification: jest.fn() },
      });

      await waitFor(() => {
        expect(screen.getByText(/active/i)).toBeInTheDocument();
      });

      mockedAxios.put.mockResolvedValue({ data: { ...mockData, status: 'paused' } });

      const statusDropdown = screen.getByRole('button', { name: /active/i });
      await user.click(statusDropdown);

      const pausedOption = screen.getByRole('option', { name: /paused/i });
      await user.click(pausedOption);

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Project status updated successfully',
          })
        );
      });
    });

    it('should handle status update failure gracefully', async () => {
      const showNotification = jest.fn();
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />, {
        notificationValue: { showNotification, clearNotification: jest.fn() },
      });

      await waitFor(() => {
        expect(screen.getByText(/active/i)).toBeInTheDocument();
      });

      mockedAxios.put.mockRejectedValue(mockErrorResponse);

      const statusDropdown = screen.getByRole('button', { name: /active/i });
      await user.click(statusDropdown);

      const pausedOption = screen.getByRole('option', { name: /paused/i });
      await user.click(pausedOption);

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to update project status',
          })
        );
        // Should revert to previous status
        expect(screen.getByText(/active/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to settings when settings button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
      });

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /refresh/i })).toHaveAttribute(
        'aria-label',
        'Refresh data'
      );
      expect(screen.getByRole('button', { name: /settings/i })).toHaveAttribute(
        'aria-label',
        'Project settings'
      );
      expect(screen.getByRole('button', { name: /active/i })).toHaveAttribute(
        'aria-label',
        'Project status'
      );
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
      });

      // Tab to refresh button
      await user.tab();
      expect(screen.getByRole('button', { name: /refresh/i })).toHaveFocus();

      // Tab to status dropdown
      await user.tab();
      expect(screen.getByRole('button', { name: /active/i })).toHaveFocus();

      // Open dropdown with Enter
      await user.keyboard('{Enter}');
      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();

      // Navigate options with arrow keys
      await user.keyboard('{ArrowDown}');
      const pausedOption = within(listbox).getByRole('option', { name: /paused/i });
      expect(pausedOption).toHaveAttribute('aria-selected', 'true');

      // Close dropdown with Escape
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data response', async () => {
      mockedAxios.get.mockResolvedValue({ data: null });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no data available/i)).toBeInTheDocument();
      });
    });

    it('should handle unauthorized access', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          data: { message: 'Unauthorized' },
          status: 401,
        },
      });

      const showNotification = jest.fn();
      renderWithProviders(<CoreFunctionality />, {
        notificationValue: { showNotification, clearNotification: jest.fn() },
      });

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Session expired. Please log in again.',
          })
        );
      });
    });

    it('should disable actions when data is loading', async () => {
      mockedAxios.get.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      expect(settingsButton).toBeDisabled();
    });
  });

  describe('Performance', () => {
    it('should debounce rapid refresh clicks', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      // First click
      await user.click(refreshButton);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Rapid second click
      await user.click(refreshButton);
      await user.click(refreshButton);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Now it should allow another request
      await user.click(refreshButton);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);

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

// Mock external dependencies
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
    authValue = { user: { id: '1', name: 'Test User', email: 'test@example.com' }, isAuthenticated: true },
    notificationValue = { showNotification: jest.fn(), clearNotification: jest.fn() },
    route = '/dashboard',
  } = {}
) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <NotificationContext.Provider value={notificationValue}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/dashboard" element={ui} />
            <Route path="/settings" element={<div>Settings Page</div>} />
          </Routes>
        </MemoryRouter>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

describe('CoreFunctionality Component', () => {
  const mockData = {
    id: '1',
    name: 'Test Project',
    status: 'active',
    metrics: { users: 100, revenue: 5000 },
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
        expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should render main content when data is loaded successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
        expect(screen.getByText(/active/i)).toBeInTheDocument();
        expect(screen.getByText(/100 users/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockData });
    });

    it('should allow user to refresh data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      mockedAxios.get.mockResolvedValueOnce({ data: { ...mockData, metrics: { users: 150, revenue: 7500 } } });

      await act(async () => {
        await user.click(refreshButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/150 users/i)).toBeInTheDocument();
      });
    });

    it('should show error notification when refresh fails', async () => {
      const showNotification = jest.fn();
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />, {
        notificationValue: { showNotification, clearNotification: jest.fn() },
      });

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      mockedAxios.get.mockRejectedValueOnce(mockErrorResponse);

      await act(async () => {
        await user.click(refreshButton);
      });

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to refresh data',
          })
        );
      });
    });

    it('should allow user to update project status', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/active/i)).toBeInTheDocument();
      });

      const statusDropdown = screen.getByRole('button', { name: /active/i });
      await user.click(statusDropdown);

      const pausedOption = screen.getByRole('option', { name: /paused/i });
      await user.click(pausedOption);

      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalledWith(
          expect.any(String),
          { status: 'paused' },
          expect.any(Object)
        );
      });
    });

    it('should show success notification after status update', async () => {
      const showNotification = jest.fn();
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />, {
        notificationValue: { showNotification, clearNotification: jest.fn() },
      });

      await waitFor(() => {
        expect(screen.getByText(/active/i)).toBeInTheDocument();
      });

      mockedAxios.put.mockResolvedValue({ data: { ...mockData, status: 'paused' } });

      const statusDropdown = screen.getByRole('button', { name: /active/i });
      await user.click(statusDropdown);

      const pausedOption = screen.getByRole('option', { name: /paused/i });
      await user.click(pausedOption);

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            message: 'Project status updated successfully',
          })
        );
      });
    });

    it('should handle status update failure gracefully', async () => {
      const showNotification = jest.fn();
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />, {
        notificationValue: { showNotification, clearNotification: jest.fn() },
      });

      await waitFor(() => {
        expect(screen.getByText(/active/i)).toBeInTheDocument();
      });

      mockedAxios.put.mockRejectedValue(mockErrorResponse);

      const statusDropdown = screen.getByRole('button', { name: /active/i });
      await user.click(statusDropdown);

      const pausedOption = screen.getByRole('option', { name: /paused/i });
      await user.click(pausedOption);

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to update project status',
          })
        );
        // Should revert to previous status
        expect(screen.getByText(/active/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to settings when settings button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
      });

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /refresh/i })).toHaveAttribute(
        'aria-label',
        'Refresh data'
      );
      expect(screen.getByRole('button', { name: /settings/i })).toHaveAttribute(
        'aria-label',
        'Project settings'
      );
      expect(screen.getByRole('button', { name: /active/i })).toHaveAttribute(
        'aria-label',
        'Project status'
      );
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
      });

      // Tab to refresh button
      await user.tab();
      expect(screen.getByRole('button', { name: /refresh/i })).toHaveFocus();

      // Tab to status dropdown
      await user.tab();
      expect(screen.getByRole('button', { name: /active/i })).toHaveFocus();

      // Open dropdown with Enter
      await user.keyboard('{Enter}');
      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();

      // Navigate options with arrow keys
      await user.keyboard('{ArrowDown}');
      const pausedOption = within(listbox).getByRole('option', { name: /paused/i });
      expect(pausedOption).toHaveAttribute('aria-selected', 'true');

      // Close dropdown with Escape
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data response', async () => {
      mockedAxios.get.mockResolvedValue({ data: null });
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no data available/i)).toBeInTheDocument();
      });
    });

    it('should handle unauthorized access', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          data: { message: 'Unauthorized' },
          status: 401,
        },
      });

      const showNotification = jest.fn();
      renderWithProviders(<CoreFunctionality />, {
        notificationValue: { showNotification, clearNotification: jest.fn() },
      });

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Session expired. Please log in again.',
          })
        );
      });
    });

    it('should disable actions when data is loading', async () => {
      mockedAxios.get.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<CoreFunctionality />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      expect(settingsButton).toBeDisabled();
    });
  });

  describe('Performance', () => {
    it('should debounce rapid refresh clicks', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(mockData.name)).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      // First click
      await user.click(refreshButton);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Rapid second click
      await user.click(refreshButton);
      await user.click(refreshButton);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Now it should allow another request
      await user.click(refreshButton);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });
});