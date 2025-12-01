import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../components/DashboardComponent'; // Replace with the actual path
import * as api from '../api'; // Replace with the actual path to your API module

// Mock the API module
jest.mock('../api');

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DashboardComponent />);
  });

  it('displays loading state initially', () => {
    render(<DashboardComponent />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data on successful API call', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }],
    });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
    });
  });

  it('displays error message on failed API call', async () => {
    (api.fetchDashboardData as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('handles empty data from API', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({ data: [] });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('simulates user interaction - button click', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    const { getByRole } = render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const button = screen.getByRole('button', { name: /Click Me/i }); // Replace with actual button name
    fireEvent.click(button);

    // Add assertions based on what should happen after the button click
    // Example:
    // expect(screen.getByText(/Button Clicked/i)).toBeInTheDocument();
  });

  it('simulates user interaction - input change', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    const { getByRole } = render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const input = screen.getByRole('textbox', { name: /Search/i }); // Replace with actual input name
    fireEvent.change(input, { target: { value: 'test' } });

    // Add assertions based on what should happen after the input change
    // Example:
    // expect(input.value).toBe('test');
  });

  it('tests accessibility - has proper ARIA attributes', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const elementWithRole = screen.getByRole('button', { name: /Click Me/i }); // Replace with actual role and name
    expect(elementWithRole).toHaveAttribute('aria-label');
  });

  it('tests accessibility - has proper tab order', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const firstFocusableElement = screen.getByRole('button', { name: /Click Me/i }); // Replace with actual role and name
    expect(firstFocusableElement).toHaveAttribute('tabindex');
  });

  it('handles re-fetching data on a specific event', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    const { rerender } = render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 2, name: 'Item 2' }],
    });

    // Simulate an event that triggers a re-fetch (e.g., prop change)
    rerender(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(2);
    });
  });

  it('handles long loading times', async () => {
    (api.fetchDashboardData as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ data: [{ id: 1, name: 'Item 1' }] });
        }, 2000); // Simulate a 2-second loading time
      });
    });

    render(<DashboardComponent />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    }, { timeout: 3000 }); // Adjust timeout as needed
  });

  it('displays a specific message when data is stale', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    // Simulate data becoming stale (e.g., after a certain time)
    // You might need to use a timer or mock a state update
    // For example, if the component has a state variable 'isDataStale':
    // rerender(<DashboardComponent isDataStale={true} />);

    // Then, add an assertion:
    // expect(screen.getByText(/Data may be outdated/i)).toBeInTheDocument();
  });

  it('updates data correctly after a user action', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    (api.updateDashboardItem as jest.Mock).mockResolvedValue({ id: 1, name: 'Updated Item' });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    // Simulate a user action that triggers an update (e.g., clicking an "Update" button)
    const updateButton = screen.getByRole('button', { name: /Update Item 1/i }); // Replace with actual button name
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(api.updateDashboardItem).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Updated Item/i)).toBeInTheDocument();
    });
  });

  it('handles errors during data update', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    (api.updateDashboardItem as jest.Mock).mockRejectedValue(new Error('Update Failed'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: /Update Item 1/i }); // Replace with actual button name
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(api.updateDashboardItem).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Error updating item/i)).toBeInTheDocument();
    });
  });

  it('displays data in a specific order', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 2, name: 'Item 2' }, { id: 1, name: 'Item 1' }],
    });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const items = screen.getAllByText(/Item/i);
    expect(items[0]).toHaveTextContent(/Item 2/i);
    expect(items[1]).toHaveTextContent(/Item 1/i);
  });

  it('filters data based on user input', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }, { id: 3, name: 'Another Item' }],
    });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByRole('textbox', { name: /Search/i }); // Replace with actual input name
    fireEvent.change(searchInput, { target: { value: 'Item' } });

    // Wait for the filter to apply (you might need to adjust the timeout)
    await waitFor(() => {
      expect(screen.queryByText(/Another Item/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('sorts data based on user selection', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 2, name: 'Item 2' }, { id: 1, name: 'Item 1' }],
    });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const sortSelect = screen.getByRole('combobox', { name: /Sort by/i }); // Replace with actual select name
    fireEvent.change(sortSelect, { target: { value: 'name' } }); // Replace 'name' with the actual value

    // Wait for the sort to apply (you might need to adjust the timeout)
    await waitFor(() => {
      const items = screen.getAllByText(/Item/i);
      expect(items[0]).toHaveTextContent(/Item 1/i);
      expect(items[1]).toHaveTextContent(/Item 2/i);
    }, { timeout: 1000 });
  });

  it('paginates data correctly', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` })),
    });

    render(<DashboardComponent itemsPerPage={10} />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    // Check that the first page is displayed
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByText(`Item ${i}`)).toBeInTheDocument();
    }
    for (let i = 11; i <= 25; i++) {
      expect(screen.queryByText(`Item ${i}`)).not.toBeInTheDocument();
    }

    // Go to the next page
    const nextPageButton = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextPageButton);

    // Check that the next page is displayed
    await waitFor(() => {
      for (let i = 1; i <= 10; i++) {
        expect(screen.queryByText(`Item ${i}`)).not.toBeInTheDocument();
      }
      for (let i = 11; i <= 20; i++) {
        expect(screen.getByText(`Item ${i}`)).toBeInTheDocument();
      }
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../components/DashboardComponent'; // Replace with the actual path
import * as api from '../api'; // Replace with the actual path to your API module

// Mock the API module
jest.mock('../api');

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DashboardComponent />);
  });

  it('displays loading state initially', () => {
    render(<DashboardComponent />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data on successful API call', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }],
    });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
    });
  });

  it('displays error message on failed API call', async () => {
    (api.fetchDashboardData as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('handles empty data from API', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({ data: [] });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('simulates user interaction - button click', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    const { getByRole } = render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const button = screen.getByRole('button', { name: /Click Me/i }); // Replace with actual button name
    fireEvent.click(button);

    // Add assertions based on what should happen after the button click
    // Example:
    // expect(screen.getByText(/Button Clicked/i)).toBeInTheDocument();
  });

  it('simulates user interaction - input change', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    const { getByRole } = render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const input = screen.getByRole('textbox', { name: /Search/i }); // Replace with actual input name
    fireEvent.change(input, { target: { value: 'test' } });

    // Add assertions based on what should happen after the input change
    // Example:
    // expect(input.value).toBe('test');
  });

  it('tests accessibility - has proper ARIA attributes', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const elementWithRole = screen.getByRole('button', { name: /Click Me/i }); // Replace with actual role and name
    expect(elementWithRole).toHaveAttribute('aria-label');
  });

  it('tests accessibility - has proper tab order', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const firstFocusableElement = screen.getByRole('button', { name: /Click Me/i }); // Replace with actual role and name
    expect(firstFocusableElement).toHaveAttribute('tabindex');
  });

  it('handles re-fetching data on a specific event', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    const { rerender } = render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 2, name: 'Item 2' }],
    });

    // Simulate an event that triggers a re-fetch (e.g., prop change)
    rerender(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(2);
    });
  });

  it('handles long loading times', async () => {
    (api.fetchDashboardData as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ data: [{ id: 1, name: 'Item 1' }] });
        }, 2000); // Simulate a 2-second loading time
      });
    });

    render(<DashboardComponent />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    }, { timeout: 3000 }); // Adjust timeout as needed
  });

  it('displays a specific message when data is stale', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    // Simulate data becoming stale (e.g., after a certain time)
    // You might need to use a timer or mock a state update
    // For example, if the component has a state variable 'isDataStale':
    // rerender(<DashboardComponent isDataStale={true} />);

    // Then, add an assertion:
    // expect(screen.getByText(/Data may be outdated/i)).toBeInTheDocument();
  });

  it('updates data correctly after a user action', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    (api.updateDashboardItem as jest.Mock).mockResolvedValue({ id: 1, name: 'Updated Item' });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    // Simulate a user action that triggers an update (e.g., clicking an "Update" button)
    const updateButton = screen.getByRole('button', { name: /Update Item 1/i }); // Replace with actual button name
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(api.updateDashboardItem).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Updated Item/i)).toBeInTheDocument();
    });
  });

  it('handles errors during data update', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
    });

    (api.updateDashboardItem as jest.Mock).mockRejectedValue(new Error('Update Failed'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: /Update Item 1/i }); // Replace with actual button name
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(api.updateDashboardItem).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Error updating item/i)).toBeInTheDocument();
    });
  });

  it('displays data in a specific order', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 2, name: 'Item 2' }, { id: 1, name: 'Item 1' }],
    });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const items = screen.getAllByText(/Item/i);
    expect(items[0]).toHaveTextContent(/Item 2/i);
    expect(items[1]).toHaveTextContent(/Item 1/i);
  });

  it('filters data based on user input', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }, { id: 3, name: 'Another Item' }],
    });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByRole('textbox', { name: /Search/i }); // Replace with actual input name
    fireEvent.change(searchInput, { target: { value: 'Item' } });

    // Wait for the filter to apply (you might need to adjust the timeout)
    await waitFor(() => {
      expect(screen.queryByText(/Another Item/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('sorts data based on user selection', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: [{ id: 2, name: 'Item 2' }, { id: 1, name: 'Item 1' }],
    });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    const sortSelect = screen.getByRole('combobox', { name: /Sort by/i }); // Replace with actual select name
    fireEvent.change(sortSelect, { target: { value: 'name' } }); // Replace 'name' with the actual value

    // Wait for the sort to apply (you might need to adjust the timeout)
    await waitFor(() => {
      const items = screen.getAllByText(/Item/i);
      expect(items[0]).toHaveTextContent(/Item 1/i);
      expect(items[1]).toHaveTextContent(/Item 2/i);
    }, { timeout: 1000 });
  });

  it('paginates data correctly', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue({
      data: Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` })),
    });

    render(<DashboardComponent itemsPerPage={10} />);

    await waitFor(() => {
      expect(api.fetchDashboardData).toHaveBeenCalledTimes(1);
    });

    // Check that the first page is displayed
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByText(`Item ${i}`)).toBeInTheDocument();
    }
    for (let i = 11; i <= 25; i++) {
      expect(screen.queryByText(`Item ${i}`)).not.toBeInTheDocument();
    }

    // Go to the next page
    const nextPageButton = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextPageButton);

    // Check that the next page is displayed
    await waitFor(() => {
      for (let i = 1; i <= 10; i++) {
        expect(screen.queryByText(`Item ${i}`)).not.toBeInTheDocument();
      }
      for (let i = 11; i <= 20; i++) {
        expect(screen.getByText(`Item ${i}`)).toBeInTheDocument();
      }
    });
  });
});