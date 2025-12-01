import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import { DashboardContext } from '../../context/DashboardContext';
import { AuthContext } from '../../context/AuthContext';

jest.mock('axios');
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Line: () => <div data-testid="line-chart" />,
  Pie: () => <div data-testid="pie-chart" />,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockDashboardData = {
  metrics: {
    totalUsers: 1500,
    activeUsers: 1200,
    revenue: 45000,
    growthRate: 12.5,
  },
  charts: {
    userGrowth: [100, 200, 300, 400, 500],
    revenueTrend: [10000, 12000, 15000, 18000, 20000],
    productDistribution: [30, 25, 20, 15, 10],
  },
  recentActivities: [
    { id: 1, user: 'John Doe', action: 'purchase', item: 'Product A', time: '2 hours ago' },
    { id: 2, user: 'Jane Smith', action: 'login', item: null, time: '1 hour ago' },
  ],
};

const mockErrorResponse = {
  response: {
    status: 500,
    data: { message: 'Internal server error' },
  },
};

const renderDashboard = (ui: React.ReactElement, { route = '/', path = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: MemoryRouter });
};

describe('Dashboard Component', () => {
  const mockSetAuthState = jest.fn();
  const mockAuthState = {
    isAuthenticated: true,
    user: { name: 'Test User', role: 'admin' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockDashboardData });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while data is being fetched', async () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <DashboardContext.Provider value={{ loading: true, error: null, data: null, refetch: jest.fn() }}>
            <Dashboard />
          </DashboardContext.Provider>
        </AuthContext.Provider>
      );

      expect(screen.getByTestId('metrics-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('charts-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('activities-skeleton')).toBeInTheDocument();
    });

    it('should render dashboard with data after successful fetch', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeInTheDocument();
        expect(screen.getByText('$45,000')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);

      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
        expect(screen.getByText('Internal server error')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should allow retrying after error', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce({ data: mockDashboardData });

      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow filtering activities by action type', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const filterSelect = screen.getByLabelText(/filter activities/i);
        userEvent.selectOptions(filterSelect, 'purchase');
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    it('should allow searching activities by user name', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search activities/i);
        userEvent.type(searchInput, 'Jane');
      });

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });

    it('should navigate to user details when clicking on an activity', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>,
        { route: '/dashboard', path: '/dashboard' }
      );

      await waitFor(() => {
        fireEvent.click(screen.getByText('John Doe'));
      });

      expect(mockNavigate).toHaveBeenCalledWith('/users/1');
    });

    it('should update date range and refetch data', async () => {
      const mockRefetch = jest.fn();
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <DashboardContext.Provider value={{ loading: false, error: null, data: mockDashboardData, refetch: mockRefetch }}>
            <Dashboard />
          </DashboardContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const dateRangeInput = screen.getByLabelText(/date range/i);
        userEvent.clear(dateRangeInput);
        userEvent.type(dateRangeInput, '2023-01-01 - 2023-01-31');
        fireEvent.blur(dateRangeInput);
      });

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  describe('Chart Interactions', () => {
    it('should display tooltip when hovering over chart elements', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const chartContainer = screen.getByTestId('bar-chart').parentElement;
        if (chartContainer) {
          fireEvent.mouseMove(chartContainer);
          expect(screen.getByRole('tooltip')).toBeInTheDocument();
        }
      });
    });

    it('should allow switching between chart types', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const chartTypeSelect = screen.getByLabelText(/chart type/i);
        userEvent.selectOptions(chartTypeSelect, 'line');
      });

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for all interactive elements', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/filter activities/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/chart type/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const dateRangeInput = screen.getByLabelText(/date range/i);
        dateRangeInput.focus();
        expect(dateRangeInput).toHaveFocus();

        userEvent.tab();
        expect(screen.getByLabelText(/filter activities/i)).toHaveFocus();

        userEvent.tab();
        expect(screen.getByLabelText(/chart type/i)).toHaveFocus();

        userEvent.tab();
        expect(screen.getByRole('button', { name: /export data/i })).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const metricCards = screen.getAllByTestId('metric-card');
        metricCards.forEach(card => {
          const textElements = within(card).getAllByText(/[a-zA-Z0-9]/);
          textElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const color = style.color;
            const backgroundColor = style.backgroundColor;
            // This is a simplified check - in real tests you might want to use a proper contrast checking library
            expect(color).not.toBe(backgroundColor);
          });
        });
      });
    });
  });

  describe('Data Export', () => {
    it('should allow exporting dashboard data as CSV', async () => {
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      const mockUrl = 'blob:url';
      jest.spyOn(global, 'URL').mockImplementationOnce(() => ({
        createObjectURL: jest.fn(() => mockUrl),
      }) as any);
      jest.spyOn(document, 'createElement').mockImplementationOnce(() => ({
        setAttribute: jest.fn(),
        click: jest.fn(),
      }) as any);

      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /export data/i }));
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/dashboard/export', { responseType: 'blob' });
      });
    });

    it('should show error message when export fails', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce(mockErrorResponse);

      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /export data/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to export data')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should redirect to login when user is not authenticated', () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: { isAuthenticated: false }, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>,
        { route: '/dashboard', path: '/dashboard' }
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { from: '/dashboard' } });
    });

    it('should show restricted content message for non-admin users', async () => {
      const nonAdminAuthState = {
        isAuthenticated: true,
        user: { name: 'Test User', role: 'user' },
      };

      renderDashboard(
        <AuthContext.Provider value={{ authState: nonAdminAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/some features are restricted/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /export data/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsiveness', () => {
    it('should adapt layout for mobile view', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const metricCards = screen.getAllByTestId('metric-card');
        expect(metricCards[0]).toHaveStyle('width: 100%');
      });
    });

    it('should show mobile menu button on small screens', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import { DashboardContext } from '../../context/DashboardContext';
import { AuthContext } from '../../context/AuthContext';

jest.mock('axios');
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Line: () => <div data-testid="line-chart" />,
  Pie: () => <div data-testid="pie-chart" />,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockDashboardData = {
  metrics: {
    totalUsers: 1500,
    activeUsers: 1200,
    revenue: 45000,
    growthRate: 12.5,
  },
  charts: {
    userGrowth: [100, 200, 300, 400, 500],
    revenueTrend: [10000, 12000, 15000, 18000, 20000],
    productDistribution: [30, 25, 20, 15, 10],
  },
  recentActivities: [
    { id: 1, user: 'John Doe', action: 'purchase', item: 'Product A', time: '2 hours ago' },
    { id: 2, user: 'Jane Smith', action: 'login', item: null, time: '1 hour ago' },
  ],
};

const mockErrorResponse = {
  response: {
    status: 500,
    data: { message: 'Internal server error' },
  },
};

const renderDashboard = (ui: React.ReactElement, { route = '/', path = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: MemoryRouter });
};

describe('Dashboard Component', () => {
  const mockSetAuthState = jest.fn();
  const mockAuthState = {
    isAuthenticated: true,
    user: { name: 'Test User', role: 'admin' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockDashboardData });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while data is being fetched', async () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <DashboardContext.Provider value={{ loading: true, error: null, data: null, refetch: jest.fn() }}>
            <Dashboard />
          </DashboardContext.Provider>
        </AuthContext.Provider>
      );

      expect(screen.getByTestId('metrics-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('charts-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('activities-skeleton')).toBeInTheDocument();
    });

    it('should render dashboard with data after successful fetch', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeInTheDocument();
        expect(screen.getByText('$45,000')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);

      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
        expect(screen.getByText('Internal server error')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should allow retrying after error', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce({ data: mockDashboardData });

      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow filtering activities by action type', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const filterSelect = screen.getByLabelText(/filter activities/i);
        userEvent.selectOptions(filterSelect, 'purchase');
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    it('should allow searching activities by user name', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search activities/i);
        userEvent.type(searchInput, 'Jane');
      });

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });

    it('should navigate to user details when clicking on an activity', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>,
        { route: '/dashboard', path: '/dashboard' }
      );

      await waitFor(() => {
        fireEvent.click(screen.getByText('John Doe'));
      });

      expect(mockNavigate).toHaveBeenCalledWith('/users/1');
    });

    it('should update date range and refetch data', async () => {
      const mockRefetch = jest.fn();
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <DashboardContext.Provider value={{ loading: false, error: null, data: mockDashboardData, refetch: mockRefetch }}>
            <Dashboard />
          </DashboardContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const dateRangeInput = screen.getByLabelText(/date range/i);
        userEvent.clear(dateRangeInput);
        userEvent.type(dateRangeInput, '2023-01-01 - 2023-01-31');
        fireEvent.blur(dateRangeInput);
      });

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  describe('Chart Interactions', () => {
    it('should display tooltip when hovering over chart elements', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const chartContainer = screen.getByTestId('bar-chart').parentElement;
        if (chartContainer) {
          fireEvent.mouseMove(chartContainer);
          expect(screen.getByRole('tooltip')).toBeInTheDocument();
        }
      });
    });

    it('should allow switching between chart types', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const chartTypeSelect = screen.getByLabelText(/chart type/i);
        userEvent.selectOptions(chartTypeSelect, 'line');
      });

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for all interactive elements', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/filter activities/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/chart type/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const dateRangeInput = screen.getByLabelText(/date range/i);
        dateRangeInput.focus();
        expect(dateRangeInput).toHaveFocus();

        userEvent.tab();
        expect(screen.getByLabelText(/filter activities/i)).toHaveFocus();

        userEvent.tab();
        expect(screen.getByLabelText(/chart type/i)).toHaveFocus();

        userEvent.tab();
        expect(screen.getByRole('button', { name: /export data/i })).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const metricCards = screen.getAllByTestId('metric-card');
        metricCards.forEach(card => {
          const textElements = within(card).getAllByText(/[a-zA-Z0-9]/);
          textElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const color = style.color;
            const backgroundColor = style.backgroundColor;
            // This is a simplified check - in real tests you might want to use a proper contrast checking library
            expect(color).not.toBe(backgroundColor);
          });
        });
      });
    });
  });

  describe('Data Export', () => {
    it('should allow exporting dashboard data as CSV', async () => {
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      const mockUrl = 'blob:url';
      jest.spyOn(global, 'URL').mockImplementationOnce(() => ({
        createObjectURL: jest.fn(() => mockUrl),
      }) as any);
      jest.spyOn(document, 'createElement').mockImplementationOnce(() => ({
        setAttribute: jest.fn(),
        click: jest.fn(),
      }) as any);

      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /export data/i }));
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/dashboard/export', { responseType: 'blob' });
      });
    });

    it('should show error message when export fails', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce(mockErrorResponse);

      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /export data/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to export data')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should redirect to login when user is not authenticated', () => {
      renderDashboard(
        <AuthContext.Provider value={{ authState: { isAuthenticated: false }, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>,
        { route: '/dashboard', path: '/dashboard' }
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { from: '/dashboard' } });
    });

    it('should show restricted content message for non-admin users', async () => {
      const nonAdminAuthState = {
        isAuthenticated: true,
        user: { name: 'Test User', role: 'user' },
      };

      renderDashboard(
        <AuthContext.Provider value={{ authState: nonAdminAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/some features are restricted/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /export data/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsiveness', () => {
    it('should adapt layout for mobile view', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        const metricCards = screen.getAllByTestId('metric-card');
        expect(metricCards[0]).toHaveStyle('width: 100%');
      });
    });

    it('should show mobile menu button on small screens', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderDashboard(
        <AuthContext.Provider value={{ authState: mockAuthState, setAuthState: mockSetAuthState }}>
          <Dashboard />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
      });
    });
  });
});