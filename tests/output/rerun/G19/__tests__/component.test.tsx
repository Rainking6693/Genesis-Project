import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../src/DashboardComponent'; // Replace with the actual path
import { mockDashboardData, mockError, mockEmptyData } from './mocks'; // Replace with your mock data
import * as api from '../src/api'; // Replace with your actual API module
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

jest.mock('../src/api');

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
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
      expect(screen.getByText(mockDashboardData.items[0].name)).toBeInTheDocument();
    });
  });

  it('displays a loading state while fetching data', () => {
    (api.fetchDashboardData as jest.Mock).mockImplementation(() => new Promise(() => {}));
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

  it('displays a message when data is empty', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockEmptyData);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('No data available.')).toBeInTheDocument();
    });
  });

  it('handles item click and calls the onItemSelected prop', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const onItemSelected = jest.fn();
    render(<DashboardComponent onItemSelected={onItemSelected} />);
    await waitFor(() => {
      const itemElement = screen.getByText(mockDashboardData.items[0].name);
      fireEvent.click(itemElement);
      expect(onItemSelected).toHaveBeenCalledWith(mockDashboardData.items[0]);
    });
  });

  it('filters items based on search input', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search...');
      userEvent.type(searchInput, 'Item 1');
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    });
  });

  it('clears the search input when the clear button is clicked', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search...');
      userEvent.type(searchInput, 'Item 1');
      const clearButton = screen.getByRole('button', { name: 'Clear' });
      fireEvent.click(clearButton);
      expect(searchInput).toHaveValue('');
    });
  });

  it('renders the correct number of items after filtering', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search...');
      userEvent.type(searchInput, 'Item');
      const items = screen.getAllByRole('listitem');
      expect(items.length).toBe(2);
    });
  });

  it('renders the correct title', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });
  });

  it('displays "No results found" when no items match the search', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search...');
      userEvent.type(searchInput, 'NonExistentItem');
      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });

  it('passes accessibility checks', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const { container } = render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('handles re-fetching data on retry button click after error', async () => {
    (api.fetchDashboardData as jest.Mock)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(mockDashboardData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch dashboard data')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });

    expect(api.fetchDashboardData).toHaveBeenCalledTimes(2);
  });

  it('renders with custom styles', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const customStyles = {
      backgroundColor: 'red',
      color: 'white',
    };
    render(<DashboardComponent style={customStyles} />);
    await waitFor(() => {
      const dashboardElement = screen.getByText(mockDashboardData.title);
      expect(dashboardElement).toBeInTheDocument();
      expect(dashboardElement).toHaveStyle('color: white');
      expect(dashboardElement).toHaveStyle('background-color: red');
    });
  });

  it('updates data when refreshData function is called', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const { rerender } = render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });

    const newDashboardData = {
      title: 'Updated Dashboard',
      items: [{ id: '3', name: 'New Item' }],
    };
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(newDashboardData);

    act(() => {
      rerender(<DashboardComponent />);
    });

    await waitFor(() => {
      expect(screen.getByText('Updated Dashboard')).toBeInTheDocument();
      expect(screen.getByText('New Item')).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../src/DashboardComponent'; // Replace with the actual path
import { mockDashboardData, mockError, mockEmptyData } from './mocks'; // Replace with your mock data
import * as api from '../src/api'; // Replace with your actual API module
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

jest.mock('../src/api');

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
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
      expect(screen.getByText(mockDashboardData.items[0].name)).toBeInTheDocument();
    });
  });

  it('displays a loading state while fetching data', () => {
    (api.fetchDashboardData as jest.Mock).mockImplementation(() => new Promise(() => {}));
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

  it('displays a message when data is empty', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockEmptyData);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText('No data available.')).toBeInTheDocument();
    });
  });

  it('handles item click and calls the onItemSelected prop', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const onItemSelected = jest.fn();
    render(<DashboardComponent onItemSelected={onItemSelected} />);
    await waitFor(() => {
      const itemElement = screen.getByText(mockDashboardData.items[0].name);
      fireEvent.click(itemElement);
      expect(onItemSelected).toHaveBeenCalledWith(mockDashboardData.items[0]);
    });
  });

  it('filters items based on search input', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search...');
      userEvent.type(searchInput, 'Item 1');
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    });
  });

  it('clears the search input when the clear button is clicked', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search...');
      userEvent.type(searchInput, 'Item 1');
      const clearButton = screen.getByRole('button', { name: 'Clear' });
      fireEvent.click(clearButton);
      expect(searchInput).toHaveValue('');
    });
  });

  it('renders the correct number of items after filtering', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search...');
      userEvent.type(searchInput, 'Item');
      const items = screen.getAllByRole('listitem');
      expect(items.length).toBe(2);
    });
  });

  it('renders the correct title', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });
  });

  it('displays "No results found" when no items match the search', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    render(<DashboardComponent />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search...');
      userEvent.type(searchInput, 'NonExistentItem');
      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });

  it('passes accessibility checks', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const { container } = render(<DashboardComponent />);
    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('handles re-fetching data on retry button click after error', async () => {
    (api.fetchDashboardData as jest.Mock)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(mockDashboardData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch dashboard data')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });

    expect(api.fetchDashboardData).toHaveBeenCalledTimes(2);
  });

  it('renders with custom styles', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const customStyles = {
      backgroundColor: 'red',
      color: 'white',
    };
    render(<DashboardComponent style={customStyles} />);
    await waitFor(() => {
      const dashboardElement = screen.getByText(mockDashboardData.title);
      expect(dashboardElement).toBeInTheDocument();
      expect(dashboardElement).toHaveStyle('color: white');
      expect(dashboardElement).toHaveStyle('background-color: red');
    });
  });

  it('updates data when refreshData function is called', async () => {
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    const { rerender } = render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(mockDashboardData.title)).toBeInTheDocument();
    });

    const newDashboardData = {
      title: 'Updated Dashboard',
      items: [{ id: '3', name: 'New Item' }],
    };
    (api.fetchDashboardData as jest.Mock).mockResolvedValue(newDashboardData);

    act(() => {
      rerender(<DashboardComponent />);
    });

    await waitFor(() => {
      expect(screen.getByText('Updated Dashboard')).toBeInTheDocument();
      expect(screen.getByText('New Item')).toBeInTheDocument();
    });
  });
});