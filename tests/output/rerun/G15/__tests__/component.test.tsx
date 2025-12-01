import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoreFunctionality } from '../CoreFunctionality'; // Replace with the actual path
import { DashboardContext } from '../../context/DashboardContext'; // Replace with the actual path
import { mockDashboardData } from './mockDashboardData'; // Replace with the actual path and data
import { mockAnalyticsService } from './mockAnalyticsService'; // Replace with the actual path

jest.mock('../../services/analyticsService', () => ({
  useAnalyticsService: () => mockAnalyticsService,
}));

describe('CoreFunctionality Component', () => {
  const mockContextValue = {
    dashboardData: mockDashboardData,
    setDashboardData: jest.fn(),
    isLoading: false,
    error: null,
    fetchDashboardData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    expect(screen.getByTestId('core-functionality-container')).toBeInTheDocument();
  });

  it('displays loading state when isLoading is true', () => {
    const loadingContextValue = {
      ...mockContextValue,
      isLoading: true,
    };
    render(
      <DashboardContext.Provider value={loadingContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error message when error exists', () => {
    const errorContextValue = {
      ...mockContextValue,
      error: 'Failed to fetch data',
    };
    render(
      <DashboardContext.Provider value={errorContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
  });

  it('renders dashboard data correctly', () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    expect(screen.getByText('Metric 1: 100')).toBeInTheDocument();
  });

  it('calls fetchDashboardData when the refresh button is clicked', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    await waitFor(() => {
      expect(mockContextValue.fetchDashboardData).toHaveBeenCalledTimes(1);
    });
  });

  it('updates dashboard data when a form input changes', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement = screen.getByLabelText('Update Metric 1');
    userEvent.type(inputElement, '200');

    await waitFor(() => {
      expect((inputElement as HTMLInputElement).value).toBe('200');
    });
  });

  it('submits the form and updates dashboard data', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement = screen.getByLabelText('Update Metric 1');
    userEvent.type(inputElement, '200');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockContextValue.setDashboardData).toHaveBeenCalledTimes(1);
    });
  });

  it('displays a success message after submitting the form', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement = screen.getByLabelText('Update Metric 1');
    userEvent.type(inputElement, '200');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Dashboard data updated successfully!')).toBeInTheDocument();
    });
  });

  it('handles form submission errors', async () => {
    const errorMockContextValue = {
      ...mockContextValue,
      setDashboardData: jest.fn().mockRejectedValue(new Error('Failed to update data')),
    };

    render(
      <DashboardContext.Provider value={errorMockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement = screen.getByLabelText('Update Metric 1');
    userEvent.type(inputElement, '200');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error updating dashboard data: Failed to update data')).toBeInTheDocument();
    });
  });

  it('calls the analytics service on component mount', () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('CoreFunctionalityMounted');
  });

  it('calls the analytics service when refresh button is clicked', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    await waitFor(() => {
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('DashboardRefreshed');
    });
  });

  it('calls the analytics service when form is submitted', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement = screen.getByLabelText('Update Metric 1');
    userEvent.type(inputElement, '200');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('DashboardDataUpdated');
    });
  });

  it('renders with accessible labels and roles', () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Update Metric 1')).toBeInTheDocument();
  });

  it('handles empty input gracefully', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement = screen.getByLabelText('Update Metric 1');
    userEvent.clear(inputElement);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockContextValue.setDashboardData).toHaveBeenCalledTimes(1);
    });
  });

  it('displays default values when dashboardData is initially empty', () => {
    const emptyContextValue = {
      ...mockContextValue,
      dashboardData: null,
      isLoading: false,
      error: null,
    };

    render(
      <DashboardContext.Provider value={emptyContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    expect(screen.getByText('No data available.')).toBeInTheDocument();
  });

  it('handles very large input values without crashing', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement = screen.getByLabelText('Update Metric 1');
    userEvent.type(inputElement, '99999999999999999999999999999999999999');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockContextValue.setDashboardData).toHaveBeenCalledTimes(1);
    });
  });

  it('updates the dashboard data correctly when multiple metrics are updated', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement1 = screen.getByLabelText('Update Metric 1');
    userEvent.type(inputElement1, '200');

    const inputElement2 = screen.getByLabelText('Update Metric 2');
    userEvent.type(inputElement2, '300');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockContextValue.setDashboardData).toHaveBeenCalledTimes(1);
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoreFunctionality } from '../CoreFunctionality'; // Replace with the actual path
import { DashboardContext } from '../../context/DashboardContext'; // Replace with the actual path
import { mockDashboardData } from './mockDashboardData'; // Replace with the actual path and data
import { mockAnalyticsService } from './mockAnalyticsService'; // Replace with the actual path

jest.mock('../../services/analyticsService', () => ({
  useAnalyticsService: () => mockAnalyticsService,
}));

describe('CoreFunctionality Component', () => {
  const mockContextValue = {
    dashboardData: mockDashboardData,
    setDashboardData: jest.fn(),
    isLoading: false,
    error: null,
    fetchDashboardData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    expect(screen.getByTestId('core-functionality-container')).toBeInTheDocument();
  });

  it('displays loading state when isLoading is true', () => {
    const loadingContextValue = {
      ...mockContextValue,
      isLoading: true,
    };
    render(
      <DashboardContext.Provider value={loadingContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error message when error exists', () => {
    const errorContextValue = {
      ...mockContextValue,
      error: 'Failed to fetch data',
    };
    render(
      <DashboardContext.Provider value={errorContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
  });

  it('renders dashboard data correctly', () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    expect(screen.getByText('Metric 1: 100')).toBeInTheDocument();
  });

  it('calls fetchDashboardData when the refresh button is clicked', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    await waitFor(() => {
      expect(mockContextValue.fetchDashboardData).toHaveBeenCalledTimes(1);
    });
  });

  it('updates dashboard data when a form input changes', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement = screen.getByLabelText('Update Metric 1');
    userEvent.type(inputElement, '200');

    await waitFor(() => {
      expect((inputElement as HTMLInputElement).value).toBe('200');
    });
  });

  it('submits the form and updates dashboard data', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement = screen.getByLabelText('Update Metric 1');
    userEvent.type(inputElement, '200');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockContextValue.setDashboardData).toHaveBeenCalledTimes(1);
    });
  });

  it('displays a success message after submitting the form', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement = screen.getByLabelText('Update Metric 1');
    userEvent.type(inputElement, '200');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Dashboard data updated successfully!')).toBeInTheDocument();
    });
  });

  it('handles form submission errors', async () => {
    const errorMockContextValue = {
      ...mockContextValue,
      setDashboardData: jest.fn().mockRejectedValue(new Error('Failed to update data')),
    };

    render(
      <DashboardContext.Provider value={errorMockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement = screen.getByLabelText('Update Metric 1');
    userEvent.type(inputElement, '200');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error updating dashboard data: Failed to update data')).toBeInTheDocument();
    });
  });

  it('calls the analytics service on component mount', () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('CoreFunctionalityMounted');
  });

  it('calls the analytics service when refresh button is clicked', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    await waitFor(() => {
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('DashboardRefreshed');
    });
  });

  it('calls the analytics service when form is submitted', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement = screen.getByLabelText('Update Metric 1');
    userEvent.type(inputElement, '200');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('DashboardDataUpdated');
    });
  });

  it('renders with accessible labels and roles', () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Update Metric 1')).toBeInTheDocument();
  });

  it('handles empty input gracefully', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement = screen.getByLabelText('Update Metric 1');
    userEvent.clear(inputElement);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockContextValue.setDashboardData).toHaveBeenCalledTimes(1);
    });
  });

  it('displays default values when dashboardData is initially empty', () => {
    const emptyContextValue = {
      ...mockContextValue,
      dashboardData: null,
      isLoading: false,
      error: null,
    };

    render(
      <DashboardContext.Provider value={emptyContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    expect(screen.getByText('No data available.')).toBeInTheDocument();
  });

  it('handles very large input values without crashing', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement = screen.getByLabelText('Update Metric 1');
    userEvent.type(inputElement, '99999999999999999999999999999999999999');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockContextValue.setDashboardData).toHaveBeenCalledTimes(1);
    });
  });

  it('updates the dashboard data correctly when multiple metrics are updated', async () => {
    render(
      <DashboardContext.Provider value={mockContextValue}>
        <CoreFunctionality />
      </DashboardContext.Provider>
    );

    const inputElement1 = screen.getByLabelText('Update Metric 1');
    userEvent.type(inputElement1, '200');

    const inputElement2 = screen.getByLabelText('Update Metric 2');
    userEvent.type(inputElement2, '300');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockContextValue.setDashboardData).toHaveBeenCalledTimes(1);
    });
  });
});