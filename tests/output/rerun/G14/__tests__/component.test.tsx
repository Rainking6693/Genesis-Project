import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../src/components/DashboardComponent'; // Replace with the actual path
import { mockDashboardData, mockError, mockEmptyData } from './mocks'; // Replace with your mock data and error objects

// Mock external dependencies (e.g., API calls)
jest.mock('../src/api/dashboardApi', () => ({
  fetchDashboardData: jest.fn(),
}));

import { fetchDashboardData } from '../src/api/dashboardApi';

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays dashboard data on successful API call', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/Dashboard Title/i);
    expect(screen.getByText(/Dashboard Title/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Point 1: Value 1/i)).toBeInTheDocument();
  });

  it('displays error message when API call fails', async () => {
    (fetchDashboardData as jest.Mock).mockRejectedValue(mockError);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/Error fetching data/i);
    expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
  });

  it('displays "No data available" message when API returns empty data', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockEmptyData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/No data available/i);
    expect(screen.getByText(/No data available/i)).toBeInTheDocument();
  });

  it('re-fetches data when the "Refresh" button is clicked', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(2);
    });
  });

  it('updates a data point when the update button is clicked', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const updateButton = screen.getByRole('button', { name: /Update Data Point 1/i });
    fireEvent.click(updateButton);

    // Assuming the update triggers another API call or state update
    await waitFor(() => {
      // Check if the data point has been updated (mock the update logic)
      expect(screen.getByText(/Data Point 1: Updated Value/i)).toBeInTheDocument();
    });
  });

  it('renders with accessible labels and roles', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).toHaveAttribute('aria-label', 'Refresh Dashboard Data');

    // Add more accessibility checks as needed for other elements
  });

  it('handles edge case: API returns null data', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(null);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/No data available/i);
    expect(screen.getByText(/No data available/i)).toBeInTheDocument();
  });

  it('handles edge case: API returns undefined data', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(undefined);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/No data available/i);
    expect(screen.getByText(/No data available/i)).toBeInTheDocument();
  });

  it('displays a custom error message when a specific error code is returned', async () => {
    const customError = { message: 'Custom Error Message', code: 403 };
    (fetchDashboardData as jest.Mock).mockRejectedValue(customError);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/Custom Error Message/i);
    expect(screen.getByText(/Custom Error Message/i)).toBeInTheDocument();
  });

  it('displays a generic error message when an unknown error occurs', async () => {
    const unknownError = { message: 'Unknown Error', code: 500 };
    (fetchDashboardData as jest.Mock).mockRejectedValue(unknownError);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/Error fetching data/i);
    expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
  });

  it('allows user to filter data by a specific criteria', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const filterInput = screen.getByRole('textbox', { name: /Filter/i });
    userEvent.type(filterInput, 'Value 1');

    await waitFor(() => {
      // Assuming the filter updates the displayed data
      expect(screen.getByText(/Data Point 1: Value 1/i)).toBeInTheDocument();
      // Add assertions to check that other data points are filtered out
    });
  });

  it('clears the filter when the clear filter button is clicked', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const filterInput = screen.getByRole('textbox', { name: /Filter/i });
    userEvent.type(filterInput, 'Value 1');

    const clearFilterButton = screen.getByRole('button', { name: /Clear Filter/i });
    fireEvent.click(clearFilterButton);

    await waitFor(() => {
      expect(filterInput.value).toBe('');
      // Add assertions to check that all data points are displayed again
    });
  });

  it('displays a message when no data matches the filter criteria', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const filterInput = screen.getByRole('textbox', { name: /Filter/i });
    userEvent.type(filterInput, 'NonExistentValue');

    await waitFor(() => {
      expect(screen.getByText(/No data matches the filter criteria/i)).toBeInTheDocument();
    });
  });

  it('navigates to a different page when a navigation link is clicked', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const navigationLink = screen.getByRole('link', { name: /Go to Details/i });
    fireEvent.click(navigationLink);

    expect(mockNavigate).toHaveBeenCalledWith('/details');
  });

  it('updates the dashboard title when the user submits a new title', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const editTitleButton = screen.getByRole('button', { name: /Edit Title/i });
    fireEvent.click(editTitleButton);

    const titleInput = screen.getByRole('textbox', { name: /New Title/i });
    userEvent.type(titleInput, 'Updated Dashboard Title');

    const submitTitleButton = screen.getByRole('button', { name: /Submit Title/i });
    fireEvent.click(submitTitleButton);

    await waitFor(() => {
      expect(screen.getByText(/Updated Dashboard Title/i)).toBeInTheDocument();
    });
  });

  it('cancels the title update when the user clicks the cancel button', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const editTitleButton = screen.getByRole('button', { name: /Edit Title/i });
    fireEvent.click(editTitleButton);

    const titleInput = screen.getByRole('textbox', { name: /New Title/i });
    userEvent.type(titleInput, 'Updated Dashboard Title');

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.getByText(/Dashboard Title/i)).toBeInTheDocument();
  });

  it('displays a validation error if the title input is empty', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const editTitleButton = screen.getByRole('button', { name: /Edit Title/i });
    fireEvent.click(editTitleButton);

    const submitTitleButton = screen.getByRole('button', { name: /Submit Title/i });
    fireEvent.click(submitTitleButton);

    await waitFor(() => {
      expect(screen.getByText(/Title cannot be empty/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../src/components/DashboardComponent'; // Replace with the actual path
import { mockDashboardData, mockError, mockEmptyData } from './mocks'; // Replace with your mock data and error objects

// Mock external dependencies (e.g., API calls)
jest.mock('../src/api/dashboardApi', () => ({
  fetchDashboardData: jest.fn(),
}));

import { fetchDashboardData } from '../src/api/dashboardApi';

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays dashboard data on successful API call', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/Dashboard Title/i);
    expect(screen.getByText(/Dashboard Title/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Point 1: Value 1/i)).toBeInTheDocument();
  });

  it('displays error message when API call fails', async () => {
    (fetchDashboardData as jest.Mock).mockRejectedValue(mockError);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/Error fetching data/i);
    expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
  });

  it('displays "No data available" message when API returns empty data', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockEmptyData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/No data available/i);
    expect(screen.getByText(/No data available/i)).toBeInTheDocument();
  });

  it('re-fetches data when the "Refresh" button is clicked', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(2);
    });
  });

  it('updates a data point when the update button is clicked', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const updateButton = screen.getByRole('button', { name: /Update Data Point 1/i });
    fireEvent.click(updateButton);

    // Assuming the update triggers another API call or state update
    await waitFor(() => {
      // Check if the data point has been updated (mock the update logic)
      expect(screen.getByText(/Data Point 1: Updated Value/i)).toBeInTheDocument();
    });
  });

  it('renders with accessible labels and roles', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).toHaveAttribute('aria-label', 'Refresh Dashboard Data');

    // Add more accessibility checks as needed for other elements
  });

  it('handles edge case: API returns null data', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(null);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/No data available/i);
    expect(screen.getByText(/No data available/i)).toBeInTheDocument();
  });

  it('handles edge case: API returns undefined data', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(undefined);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/No data available/i);
    expect(screen.getByText(/No data available/i)).toBeInTheDocument();
  });

  it('displays a custom error message when a specific error code is returned', async () => {
    const customError = { message: 'Custom Error Message', code: 403 };
    (fetchDashboardData as jest.Mock).mockRejectedValue(customError);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/Custom Error Message/i);
    expect(screen.getByText(/Custom Error Message/i)).toBeInTheDocument();
  });

  it('displays a generic error message when an unknown error occurs', async () => {
    const unknownError = { message: 'Unknown Error', code: 500 };
    (fetchDashboardData as jest.Mock).mockRejectedValue(unknownError);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/Error fetching data/i);
    expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
  });

  it('allows user to filter data by a specific criteria', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const filterInput = screen.getByRole('textbox', { name: /Filter/i });
    userEvent.type(filterInput, 'Value 1');

    await waitFor(() => {
      // Assuming the filter updates the displayed data
      expect(screen.getByText(/Data Point 1: Value 1/i)).toBeInTheDocument();
      // Add assertions to check that other data points are filtered out
    });
  });

  it('clears the filter when the clear filter button is clicked', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const filterInput = screen.getByRole('textbox', { name: /Filter/i });
    userEvent.type(filterInput, 'Value 1');

    const clearFilterButton = screen.getByRole('button', { name: /Clear Filter/i });
    fireEvent.click(clearFilterButton);

    await waitFor(() => {
      expect(filterInput.value).toBe('');
      // Add assertions to check that all data points are displayed again
    });
  });

  it('displays a message when no data matches the filter criteria', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const filterInput = screen.getByRole('textbox', { name: /Filter/i });
    userEvent.type(filterInput, 'NonExistentValue');

    await waitFor(() => {
      expect(screen.getByText(/No data matches the filter criteria/i)).toBeInTheDocument();
    });
  });

  it('navigates to a different page when a navigation link is clicked', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const navigationLink = screen.getByRole('link', { name: /Go to Details/i });
    fireEvent.click(navigationLink);

    expect(mockNavigate).toHaveBeenCalledWith('/details');
  });

  it('updates the dashboard title when the user submits a new title', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const editTitleButton = screen.getByRole('button', { name: /Edit Title/i });
    fireEvent.click(editTitleButton);

    const titleInput = screen.getByRole('textbox', { name: /New Title/i });
    userEvent.type(titleInput, 'Updated Dashboard Title');

    const submitTitleButton = screen.getByRole('button', { name: /Submit Title/i });
    fireEvent.click(submitTitleButton);

    await waitFor(() => {
      expect(screen.getByText(/Updated Dashboard Title/i)).toBeInTheDocument();
    });
  });

  it('cancels the title update when the user clicks the cancel button', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const editTitleButton = screen.getByRole('button', { name: /Edit Title/i });
    fireEvent.click(editTitleButton);

    const titleInput = screen.getByRole('textbox', { name: /New Title/i });
    userEvent.type(titleInput, 'Updated Dashboard Title');

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.getByText(/Dashboard Title/i)).toBeInTheDocument();
  });

  it('displays a validation error if the title input is empty', async () => {
    (fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);

    await waitFor(() => {
      expect(fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const editTitleButton = screen.getByRole('button', { name: /Edit Title/i });
    fireEvent.click(editTitleButton);

    const submitTitleButton = screen.getByRole('button', { name: /Submit Title/i });
    fireEvent.click(submitTitleButton);

    await waitFor(() => {
      expect(screen.getByText(/Title cannot be empty/i)).toBeInTheDocument();
    });
  });
});