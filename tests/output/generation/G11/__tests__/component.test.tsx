import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import { DashboardProvider } from './DashboardContext';
import { mockDashboardData, mockErrorResponse, mockEmptyData } from './mocks/dashboardMocks';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

describe('Dashboard Component', () => {
  const renderDashboard = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <DashboardProvider>
          <Route path="/" element={<Dashboard />} />
        </DashboardProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({ data: mockDashboardData });
  });

  describe('Initial Load', () => {
    it('should display loading skeleton while fetching data', async () => {
      mockedAxios.get.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockDashboardData }), 1000))
      );

      renderDashboard();

      expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-content')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument();
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should display empty state when no data is available', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockEmptyData });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/no data available/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });
  });

  describe('Data Visualization', () => {
    it('should render all main metrics cards with correct values', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/total revenue/i)).toBeInTheDocument();
        expect(screen.getByText(/\$125,000/i)).toBeInTheDocument();
        expect(screen.getByText(/active users/i)).toBeInTheDocument();
        expect(screen.getByText(/1,250/i)).toBeInTheDocument();
        expect(screen.getByText(/conversion rate/i)).toBeInTheDocument();
        expect(screen.getByText(/42.5%/i)).toBeInTheDocument();
      });
    });

    it('should render the main chart with proper aria labels', async () => {
      renderDashboard();

      await waitFor(() => {
        const chart = screen.getByRole('img', { name: /revenue trend over time/i });
        expect(chart).toBeInTheDocument();
        expect(chart).toHaveAttribute('aria-label', 'Revenue trend over time');
      });
    });

    it('should render data table with correct columns and rows', async () => {
      renderDashboard();

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();

        const headers = within(table).getAllByRole('columnheader');
        expect(headers).toHaveLength(5);
        expect(headers[0]).toHaveTextContent(/date/i);
        expect(headers[1]).toHaveTextContent(/revenue/i);
        expect(headers[2]).toHaveTextContent(/users/i);
        expect(headers[3]).toHaveTextContent(/conversion/i);
        expect(headers[4]).toHaveTextContent(/status/i);

        const rows = within(table).getAllByRole('row');
        expect(rows).toHaveLength(6); // 5 data rows + header
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow date range selection and trigger data refresh', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/jan 1 - jan 31, 2023/i)).toBeInTheDocument();
      });

      const dateRangeButton = screen.getByRole('button', { name: /jan 1 - jan 31, 2023/i });
      await user.click(dateRangeButton);

      const customRangeOption = await screen.findByText(/custom range/i);
      await user.click(customRangeOption);

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await user.clear(startDateInput);
      await user.type(startDateInput, '2023-02-01');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2023-02-28');

      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('startDate=2023-02-01&endDate=2023-02-28')
        );
        expect(screen.getByText(/feb 1 - feb 28, 2023/i)).toBeInTheDocument();
      });
    });

    it('should allow filtering by status', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/all statuses/i)).toBeInTheDocument();
      });

      const statusFilter = screen.getByRole('button', { name: /all statuses/i });
      await user.click(statusFilter);

      const completedOption = await screen.findByText(/completed/i);
      await user.click(completedOption);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('status=completed')
        );
        expect(screen.getByText(/completed/i)).toBeInTheDocument();
      });
    });

    it('should allow sorting of table columns', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      const revenueHeader = screen.getByRole('columnheader', { name: /revenue/i });
      await user.click(revenueHeader);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('sort=revenue&order=desc')
        );
      });

      await user.click(revenueHeader);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('sort=revenue&order=asc')
        );
      });
    });

    it('should allow exporting data as CSV', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      const mockUrl = 'blob:url';
      jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

      mockedAxios.get.mockResolvedValueOnce({ data: mockBlob });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/export'),
          { responseType: 'blob' }
        );
        expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast when export fails', async () => {
      const user = userEvent.setup();
      mockedAxios.get.mockRejectedValueOnce(new Error('Export failed'));

      renderDashboard();

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to export data/i)).toBeInTheDocument();
      });
    });

    it('should handle invalid date range selection', async () => {
      const user = userEvent.setup();
      renderDashboard();

      const dateRangeButton = screen.getByRole('button', { name: /jan 1 - jan 31, 2023/i });
      await user.click(dateRangeButton);

      const customRangeOption = await screen.findByText(/custom range/i);
      await user.click(customRangeOption);

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await user.clear(startDateInput);
      await user.type(startDateInput, '2023-02-01');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2023-01-31'); // Invalid range

      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);

      expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
      expect(mockedAxios.get).not.toHaveBeenCalledWith(
        expect.stringContaining('startDate=2023-02-01')
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /jan 1 - jan 31, 2023/i })).toHaveAttribute(
          'aria-label',
          'Select date range'
        );
        expect(screen.getByRole('button', { name: /all statuses/i })).toHaveAttribute(
          'aria-label',
          'Filter by status'
        );
        expect(screen.getByRole('button', { name: /export/i })).toHaveAttribute(
          'aria-label',
          'Export data as CSV'
        );
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(document.body).toHaveFocus();
      });

      await user.tab();
      expect(screen.getByRole('button', { name: /jan 1 - jan 31, 2023/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /all statuses/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /export/i })).toHaveFocus();

      await user.tab();
      const revenueHeader = screen.getByRole('columnheader', { name: /revenue/i });
      expect(revenueHeader).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderDashboard();

      await waitFor(() => {
        const metrics = screen.getAllByTestId('metric-value');
        metrics.forEach(metric => {
          const style = window.getComputedStyle(metric);
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          // This is a simplified check - in real tests you'd use a proper contrast checking library
          expect(color).not.toBe(backgroundColor);
        });
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile-friendly layout on small screens', async () => {
      // Mock small screen
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('mobile-metrics-grid')).toBeInTheDocument();
        expect(screen.queryByTestId('desktop-metrics-grid')).not.toBeInTheDocument();
      });
    });

    it('should render desktop layout on large screens', async () => {
      // Mock large screen
      window.innerWidth = 1200;
      fireEvent(window, new Event('resize'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('desktop-metrics-grid')).toBeInTheDocument();
        expect(screen.queryByTestId('mobile-metrics-grid')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to details page when row is clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      const firstRow = screen.getAllByRole('row')[1]; // First data row
      await user.click(firstRow);

      await waitFor(() => {
        expect(mockedNavigate).toHaveBeenCalledWith('/details/1');
      });
    });

    it('should not navigate when clicking on table header', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      const headerRow = screen.getAllByRole('row')[0]; // Header row
      await user.click(headerRow);

      expect(mockedNavigate).not.toHaveBeenCalled();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import { DashboardProvider } from './DashboardContext';
import { mockDashboardData, mockErrorResponse, mockEmptyData } from './mocks/dashboardMocks';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

describe('Dashboard Component', () => {
  const renderDashboard = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <DashboardProvider>
          <Route path="/" element={<Dashboard />} />
        </DashboardProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({ data: mockDashboardData });
  });

  describe('Initial Load', () => {
    it('should display loading skeleton while fetching data', async () => {
      mockedAxios.get.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockDashboardData }), 1000))
      );

      renderDashboard();

      expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-content')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument();
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should display empty state when no data is available', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockEmptyData });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/no data available/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });
  });

  describe('Data Visualization', () => {
    it('should render all main metrics cards with correct values', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/total revenue/i)).toBeInTheDocument();
        expect(screen.getByText(/\$125,000/i)).toBeInTheDocument();
        expect(screen.getByText(/active users/i)).toBeInTheDocument();
        expect(screen.getByText(/1,250/i)).toBeInTheDocument();
        expect(screen.getByText(/conversion rate/i)).toBeInTheDocument();
        expect(screen.getByText(/42.5%/i)).toBeInTheDocument();
      });
    });

    it('should render the main chart with proper aria labels', async () => {
      renderDashboard();

      await waitFor(() => {
        const chart = screen.getByRole('img', { name: /revenue trend over time/i });
        expect(chart).toBeInTheDocument();
        expect(chart).toHaveAttribute('aria-label', 'Revenue trend over time');
      });
    });

    it('should render data table with correct columns and rows', async () => {
      renderDashboard();

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();

        const headers = within(table).getAllByRole('columnheader');
        expect(headers).toHaveLength(5);
        expect(headers[0]).toHaveTextContent(/date/i);
        expect(headers[1]).toHaveTextContent(/revenue/i);
        expect(headers[2]).toHaveTextContent(/users/i);
        expect(headers[3]).toHaveTextContent(/conversion/i);
        expect(headers[4]).toHaveTextContent(/status/i);

        const rows = within(table).getAllByRole('row');
        expect(rows).toHaveLength(6); // 5 data rows + header
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow date range selection and trigger data refresh', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/jan 1 - jan 31, 2023/i)).toBeInTheDocument();
      });

      const dateRangeButton = screen.getByRole('button', { name: /jan 1 - jan 31, 2023/i });
      await user.click(dateRangeButton);

      const customRangeOption = await screen.findByText(/custom range/i);
      await user.click(customRangeOption);

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await user.clear(startDateInput);
      await user.type(startDateInput, '2023-02-01');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2023-02-28');

      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('startDate=2023-02-01&endDate=2023-02-28')
        );
        expect(screen.getByText(/feb 1 - feb 28, 2023/i)).toBeInTheDocument();
      });
    });

    it('should allow filtering by status', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/all statuses/i)).toBeInTheDocument();
      });

      const statusFilter = screen.getByRole('button', { name: /all statuses/i });
      await user.click(statusFilter);

      const completedOption = await screen.findByText(/completed/i);
      await user.click(completedOption);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('status=completed')
        );
        expect(screen.getByText(/completed/i)).toBeInTheDocument();
      });
    });

    it('should allow sorting of table columns', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      const revenueHeader = screen.getByRole('columnheader', { name: /revenue/i });
      await user.click(revenueHeader);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('sort=revenue&order=desc')
        );
      });

      await user.click(revenueHeader);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('sort=revenue&order=asc')
        );
      });
    });

    it('should allow exporting data as CSV', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      const mockUrl = 'blob:url';
      jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

      mockedAxios.get.mockResolvedValueOnce({ data: mockBlob });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/export'),
          { responseType: 'blob' }
        );
        expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast when export fails', async () => {
      const user = userEvent.setup();
      mockedAxios.get.mockRejectedValueOnce(new Error('Export failed'));

      renderDashboard();

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to export data/i)).toBeInTheDocument();
      });
    });

    it('should handle invalid date range selection', async () => {
      const user = userEvent.setup();
      renderDashboard();

      const dateRangeButton = screen.getByRole('button', { name: /jan 1 - jan 31, 2023/i });
      await user.click(dateRangeButton);

      const customRangeOption = await screen.findByText(/custom range/i);
      await user.click(customRangeOption);

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await user.clear(startDateInput);
      await user.type(startDateInput, '2023-02-01');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2023-01-31'); // Invalid range

      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);

      expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
      expect(mockedAxios.get).not.toHaveBeenCalledWith(
        expect.stringContaining('startDate=2023-02-01')
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /jan 1 - jan 31, 2023/i })).toHaveAttribute(
          'aria-label',
          'Select date range'
        );
        expect(screen.getByRole('button', { name: /all statuses/i })).toHaveAttribute(
          'aria-label',
          'Filter by status'
        );
        expect(screen.getByRole('button', { name: /export/i })).toHaveAttribute(
          'aria-label',
          'Export data as CSV'
        );
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(document.body).toHaveFocus();
      });

      await user.tab();
      expect(screen.getByRole('button', { name: /jan 1 - jan 31, 2023/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /all statuses/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /export/i })).toHaveFocus();

      await user.tab();
      const revenueHeader = screen.getByRole('columnheader', { name: /revenue/i });
      expect(revenueHeader).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderDashboard();

      await waitFor(() => {
        const metrics = screen.getAllByTestId('metric-value');
        metrics.forEach(metric => {
          const style = window.getComputedStyle(metric);
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          // This is a simplified check - in real tests you'd use a proper contrast checking library
          expect(color).not.toBe(backgroundColor);
        });
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile-friendly layout on small screens', async () => {
      // Mock small screen
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('mobile-metrics-grid')).toBeInTheDocument();
        expect(screen.queryByTestId('desktop-metrics-grid')).not.toBeInTheDocument();
      });
    });

    it('should render desktop layout on large screens', async () => {
      // Mock large screen
      window.innerWidth = 1200;
      fireEvent(window, new Event('resize'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('desktop-metrics-grid')).toBeInTheDocument();
        expect(screen.queryByTestId('mobile-metrics-grid')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to details page when row is clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      const firstRow = screen.getAllByRole('row')[1]; // First data row
      await user.click(firstRow);

      await waitFor(() => {
        expect(mockedNavigate).toHaveBeenCalledWith('/details/1');
      });
    });

    it('should not navigate when clicking on table header', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      const headerRow = screen.getAllByRole('row')[0]; // Header row
      await user.click(headerRow);

      expect(mockedNavigate).not.toHaveBeenCalled();
    });
  });
});