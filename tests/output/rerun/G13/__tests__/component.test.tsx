import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../DashboardComponent'; // Replace with the actual path
import { mockDashboardData, mockError, mockEmptyDashboardData } from './mocks'; // Replace with your mock data
import * as api from '../api'; // Replace with the actual path to your API module
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

jest.mock('../api');

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
  });

  it('fetches and displays dashboard data on mount', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
      expect(screen.getByText('Data Point 1: Value 1')).toBeInTheDocument();
    });
  });

  it('displays loading state while fetching data', () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays an error message when data fetching fails', async () => {
    (api.fetchDashboardData as jest.Mock).mockRejectedValue(mockError);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch dashboard data')).toBeInTheDocument();
    });
  });

  it('displays a message when no data is available', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockEmptyDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('No data available.')).toBeInTheDocument();
    });
  });

  it('allows the user to refresh the data', async () => {
    (api.fetchDashboardData as jest.Mock)
      .mockResolvedValueOnce(mockDashboardData)
      .mockResolvedValueOnce({ ...mockDashboardData, title: 'Updated Dashboard Title' });

    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('Updated Dashboard Title')).toBeInTheDocument();
    });
  });

  it('handles errors when refreshing data', async () => {
    (api.fetchDashboardData as jest.Mock)
      .mockResolvedValueOnce(mockDashboardData)
      .mockRejectedValueOnce(mockError);

    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch dashboard data')).toBeInTheDocument();
    });
  });

  it('updates a data point when the update button is clicked', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    (api.updateDataPoint as jest.Mock).mockResolvedValue({ success: true });

    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: /update Data Point 1/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(api.updateDataPoint).toHaveBeenCalledWith('dataPoint1', expect.any(Number));
      expect(screen.getByText('Data point updated successfully!')).toBeInTheDocument();
    });
  });

  it('displays an error message when updating a data point fails', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    (api.updateDataPoint as jest.Mock).mockRejectedValue(mockError);

    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: /update Data Point 1/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('Error updating data point.')).toBeInTheDocument();
    });
  });

  it('should have no accessibility violations', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const { container } = render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('updates data point value on input change', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const inputElement = screen.getByRole('spinbutton', { name: /data point 1 value/i });
    userEvent.clear(inputElement);
    userEvent.type(inputElement, '123');

    expect((inputElement as HTMLInputElement).value).toBe('123');
  });

  it('calls updateDataPoint with the correct value after input change and update button click', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    (api.updateDataPoint as jest.Mock).mockResolvedValue({ success: true });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const inputElement = screen.getByRole('spinbutton', { name: /data point 1 value/i });
    userEvent.clear(inputElement);
    userEvent.type(inputElement, '123');

    const updateButton = screen.getByRole('button', { name: /update Data Point 1/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(api.updateDataPoint).toHaveBeenCalledWith('dataPoint1', 123);
    });
  });

  it('debounces the updateDataPoint call', async () => {
    jest.useFakeTimers();
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    (api.updateDataPoint as jest.Mock).mockResolvedValue({ success: true });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const inputElement = screen.getByRole('spinbutton', { name: /data point 1 value/i });
    userEvent.clear(inputElement);
    userEvent.type(inputElement, '123');
    userEvent.type(inputElement, '4');
    userEvent.type(inputElement, '5');

    const updateButton = screen.getByRole('button', { name: /update Data Point 1/i });
    fireEvent.click(updateButton);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(api.updateDataPoint).toHaveBeenCalledWith('dataPoint1', 1235);
    });
    jest.useRealTimers();
  });

  it('disables the update button while updating', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    (api.updateDataPoint as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 500)));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: /update Data Point 1/i });
    fireEvent.click(updateButton);

    expect(updateButton).toBeDisabled();

    await waitFor(() => {
      expect(updateButton).toBeEnabled();
    }, { timeout: 1000 });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../DashboardComponent'; // Replace with the actual path
import { mockDashboardData, mockError, mockEmptyDashboardData } from './mocks'; // Replace with your mock data
import * as api from '../api'; // Replace with the actual path to your API module
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

jest.mock('../api');

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
  });

  it('fetches and displays dashboard data on mount', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
      expect(screen.getByText('Data Point 1: Value 1')).toBeInTheDocument();
    });
  });

  it('displays loading state while fetching data', () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays an error message when data fetching fails', async () => {
    (api.fetchDashboardData as jest.Mock).mockRejectedValue(mockError);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch dashboard data')).toBeInTheDocument();
    });
  });

  it('displays a message when no data is available', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockEmptyDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('No data available.')).toBeInTheDocument();
    });
  });

  it('allows the user to refresh the data', async () => {
    (api.fetchDashboardData as jest.Mock)
      .mockResolvedValueOnce(mockDashboardData)
      .mockResolvedValueOnce({ ...mockDashboardData, title: 'Updated Dashboard Title' });

    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('Updated Dashboard Title')).toBeInTheDocument();
    });
  });

  it('handles errors when refreshing data', async () => {
    (api.fetchDashboardData as jest.Mock)
      .mockResolvedValueOnce(mockDashboardData)
      .mockRejectedValueOnce(mockError);

    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch dashboard data')).toBeInTheDocument();
    });
  });

  it('updates a data point when the update button is clicked', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    (api.updateDataPoint as jest.Mock).mockResolvedValue({ success: true });

    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: /update Data Point 1/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(api.updateDataPoint).toHaveBeenCalledWith('dataPoint1', expect.any(Number));
      expect(screen.getByText('Data point updated successfully!')).toBeInTheDocument();
    });
  });

  it('displays an error message when updating a data point fails', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    (api.updateDataPoint as jest.Mock).mockRejectedValue(mockError);

    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: /update Data Point 1/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('Error updating data point.')).toBeInTheDocument();
    });
  });

  it('should have no accessibility violations', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const { container } = render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('updates data point value on input change', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const inputElement = screen.getByRole('spinbutton', { name: /data point 1 value/i });
    userEvent.clear(inputElement);
    userEvent.type(inputElement, '123');

    expect((inputElement as HTMLInputElement).value).toBe('123');
  });

  it('calls updateDataPoint with the correct value after input change and update button click', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    (api.updateDataPoint as jest.Mock).mockResolvedValue({ success: true });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const inputElement = screen.getByRole('spinbutton', { name: /data point 1 value/i });
    userEvent.clear(inputElement);
    userEvent.type(inputElement, '123');

    const updateButton = screen.getByRole('button', { name: /update Data Point 1/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(api.updateDataPoint).toHaveBeenCalledWith('dataPoint1', 123);
    });
  });

  it('debounces the updateDataPoint call', async () => {
    jest.useFakeTimers();
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    (api.updateDataPoint as jest.Mock).mockResolvedValue({ success: true });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const inputElement = screen.getByRole('spinbutton', { name: /data point 1 value/i });
    userEvent.clear(inputElement);
    userEvent.type(inputElement, '123');
    userEvent.type(inputElement, '4');
    userEvent.type(inputElement, '5');

    const updateButton = screen.getByRole('button', { name: /update Data Point 1/i });
    fireEvent.click(updateButton);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(api.updateDataPoint).toHaveBeenCalledWith('dataPoint1', 1235);
    });
    jest.useRealTimers();
  });

  it('disables the update button while updating', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    (api.updateDataPoint as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 500)));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Title')).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: /update Data Point 1/i });
    fireEvent.click(updateButton);

    expect(updateButton).toBeDisabled();

    await waitFor(() => {
      expect(updateButton).toBeEnabled();
    }, { timeout: 1000 });
  });
});