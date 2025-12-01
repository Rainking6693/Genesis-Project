import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../DashboardComponent'; // Replace with the actual path
import * as api from '../api'; // Replace with the actual path to your API module

// Mock the API module
jest.mock('../api');

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component', () => {
    render(<DashboardComponent />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument(); // Replace with your actual title
  });

  it('displays loading state initially', () => {
    (api.fetchData as jest.Mock).mockResolvedValue(null);
    render(<DashboardComponent />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('fetches and displays data successfully', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  it('displays an error message when data fetching fails', async () => {
    (api.fetchData as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
    });
  });

  it('allows users to add a new item', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.addItem as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByPlaceholderText('Enter item name'); // Replace with your actual placeholder
    const addButton = screen.getByText('Add Item'); // Replace with your actual button text

    userEvent.type(inputElement, 'New Item');
    userEvent.click(addButton);

    await waitFor(() => {
      expect(api.addItem).toHaveBeenCalledWith('New Item');
      expect(screen.getByText('New Item')).toBeInTheDocument();
    });
  });

  it('displays an error message when adding an item fails', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.addItem as jest.Mock).mockRejectedValue(new Error('Failed to add item'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByPlaceholderText('Enter item name'); // Replace with your actual placeholder
    const addButton = screen.getByText('Add Item'); // Replace with your actual button text

    userEvent.type(inputElement, 'New Item');
    userEvent.click(addButton);

    await waitFor(() => {
      expect(api.addItem).toHaveBeenCalledWith('New Item');
      expect(screen.getByText('Error: Failed to add item')).toBeInTheDocument();
    });
  });

  it('allows users to delete an item', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.deleteItem as jest.Mock).mockResolvedValue(undefined);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const deleteButton = screen.getByText('Delete'); // Replace with your actual delete button text

    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.deleteItem).toHaveBeenCalledWith(1);
      expect(screen.queryByText('Item 1')).toBeNull();
    });
  });

  it('displays an error message when deleting an item fails', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.deleteItem as jest.Mock).mockRejectedValue(new Error('Failed to delete item'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const deleteButton = screen.getByText('Delete'); // Replace with your actual delete button text

    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.deleteItem).toHaveBeenCalledWith(1);
      expect(screen.getByText('Error: Failed to delete item')).toBeInTheDocument();
    });
  });

  it('updates the item list after a successful delete', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.deleteItem as jest.Mock).mockResolvedValue(undefined);
    (api.fetchData as jest.Mock).mockResolvedValue({ items: [{ id: 2, name: 'Item 2' }] });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const deleteButton = screen.getAllByText('Delete')[0]; // Replace with your actual delete button text

    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.deleteItem).toHaveBeenCalledWith(1);
      expect(api.fetchData).toHaveBeenCalledTimes(2);
      expect(screen.queryByText('Item 1')).toBeNull();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  it('is accessible', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    const { container } = render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    // Example accessibility check (replace with more specific checks)
    expect(container).toBeAccessible();
  });

  it('handles empty data gracefully', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue({ items: [] });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText('No items found.')).toBeInTheDocument(); // Replace with your actual message
    });
  });

  it('clears the input field after adding an item', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.addItem as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByPlaceholderText('Enter item name'); // Replace with your actual placeholder
    const addButton = screen.getByText('Add Item'); // Replace with your actual button text

    userEvent.type(inputElement, 'New Item');
    userEvent.click(addButton);

    await waitFor(() => {
      expect(api.addItem).toHaveBeenCalledWith('New Item');
      expect(inputElement.value).toBe('');
    });
  });

  it('disables the add button when the input field is empty', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByPlaceholderText('Enter item name'); // Replace with your actual placeholder
    const addButton = screen.getByText('Add Item'); // Replace with your actual button text

    expect(addButton).toBeDisabled();

    userEvent.type(inputElement, 'Test');
    expect(addButton).toBeEnabled();

    userEvent.clear(inputElement);
    expect(addButton).toBeDisabled();
  });

  it('handles concurrent add and delete operations', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.addItem as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });
    (api.deleteItem as jest.Mock).mockResolvedValue(undefined);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByPlaceholderText('Enter item name'); // Replace with your actual placeholder
    const addButton = screen.getByText('Add Item'); // Replace with your actual button text
    const deleteButton = screen.getByText('Delete'); // Replace with your actual delete button text

    // Simulate concurrent add and delete
    userEvent.type(inputElement, 'New Item');
    userEvent.click(addButton);
    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.addItem).toHaveBeenCalledWith('New Item');
      expect(api.deleteItem).toHaveBeenCalledWith(1);
    });
  });

  it('updates the item list after a successful add', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.addItem as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });
    (api.fetchData as jest.Mock).mockResolvedValue({ items: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'New Item' }] });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByPlaceholderText('Enter item name'); // Replace with your actual placeholder
    const addButton = screen.getByText('Add Item'); // Replace with your actual button text

    userEvent.type(inputElement, 'New Item');
    userEvent.click(addButton);

    await waitFor(() => {
      expect(api.addItem).toHaveBeenCalledWith('New Item');
      expect(api.fetchData).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('New Item')).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../DashboardComponent'; // Replace with the actual path
import * as api from '../api'; // Replace with the actual path to your API module

// Mock the API module
jest.mock('../api');

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component', () => {
    render(<DashboardComponent />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument(); // Replace with your actual title
  });

  it('displays loading state initially', () => {
    (api.fetchData as jest.Mock).mockResolvedValue(null);
    render(<DashboardComponent />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('fetches and displays data successfully', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  it('displays an error message when data fetching fails', async () => {
    (api.fetchData as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
    });
  });

  it('allows users to add a new item', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.addItem as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByPlaceholderText('Enter item name'); // Replace with your actual placeholder
    const addButton = screen.getByText('Add Item'); // Replace with your actual button text

    userEvent.type(inputElement, 'New Item');
    userEvent.click(addButton);

    await waitFor(() => {
      expect(api.addItem).toHaveBeenCalledWith('New Item');
      expect(screen.getByText('New Item')).toBeInTheDocument();
    });
  });

  it('displays an error message when adding an item fails', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.addItem as jest.Mock).mockRejectedValue(new Error('Failed to add item'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByPlaceholderText('Enter item name'); // Replace with your actual placeholder
    const addButton = screen.getByText('Add Item'); // Replace with your actual button text

    userEvent.type(inputElement, 'New Item');
    userEvent.click(addButton);

    await waitFor(() => {
      expect(api.addItem).toHaveBeenCalledWith('New Item');
      expect(screen.getByText('Error: Failed to add item')).toBeInTheDocument();
    });
  });

  it('allows users to delete an item', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.deleteItem as jest.Mock).mockResolvedValue(undefined);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const deleteButton = screen.getByText('Delete'); // Replace with your actual delete button text

    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.deleteItem).toHaveBeenCalledWith(1);
      expect(screen.queryByText('Item 1')).toBeNull();
    });
  });

  it('displays an error message when deleting an item fails', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.deleteItem as jest.Mock).mockRejectedValue(new Error('Failed to delete item'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const deleteButton = screen.getByText('Delete'); // Replace with your actual delete button text

    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.deleteItem).toHaveBeenCalledWith(1);
      expect(screen.getByText('Error: Failed to delete item')).toBeInTheDocument();
    });
  });

  it('updates the item list after a successful delete', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.deleteItem as jest.Mock).mockResolvedValue(undefined);
    (api.fetchData as jest.Mock).mockResolvedValue({ items: [{ id: 2, name: 'Item 2' }] });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const deleteButton = screen.getAllByText('Delete')[0]; // Replace with your actual delete button text

    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.deleteItem).toHaveBeenCalledWith(1);
      expect(api.fetchData).toHaveBeenCalledTimes(2);
      expect(screen.queryByText('Item 1')).toBeNull();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  it('is accessible', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    const { container } = render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    // Example accessibility check (replace with more specific checks)
    expect(container).toBeAccessible();
  });

  it('handles empty data gracefully', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue({ items: [] });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText('No items found.')).toBeInTheDocument(); // Replace with your actual message
    });
  });

  it('clears the input field after adding an item', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.addItem as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByPlaceholderText('Enter item name'); // Replace with your actual placeholder
    const addButton = screen.getByText('Add Item'); // Replace with your actual button text

    userEvent.type(inputElement, 'New Item');
    userEvent.click(addButton);

    await waitFor(() => {
      expect(api.addItem).toHaveBeenCalledWith('New Item');
      expect(inputElement.value).toBe('');
    });
  });

  it('disables the add button when the input field is empty', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByPlaceholderText('Enter item name'); // Replace with your actual placeholder
    const addButton = screen.getByText('Add Item'); // Replace with your actual button text

    expect(addButton).toBeDisabled();

    userEvent.type(inputElement, 'Test');
    expect(addButton).toBeEnabled();

    userEvent.clear(inputElement);
    expect(addButton).toBeDisabled();
  });

  it('handles concurrent add and delete operations', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.addItem as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });
    (api.deleteItem as jest.Mock).mockResolvedValue(undefined);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByPlaceholderText('Enter item name'); // Replace with your actual placeholder
    const addButton = screen.getByText('Add Item'); // Replace with your actual button text
    const deleteButton = screen.getByText('Delete'); // Replace with your actual delete button text

    // Simulate concurrent add and delete
    userEvent.type(inputElement, 'New Item');
    userEvent.click(addButton);
    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.addItem).toHaveBeenCalledWith('New Item');
      expect(api.deleteItem).toHaveBeenCalledWith(1);
    });
  });

  it('updates the item list after a successful add', async () => {
    const mockData = {
      items: [
        { id: 1, name: 'Item 1' },
      ],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.addItem as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });
    (api.fetchData as jest.Mock).mockResolvedValue({ items: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'New Item' }] });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByPlaceholderText('Enter item name'); // Replace with your actual placeholder
    const addButton = screen.getByText('Add Item'); // Replace with your actual button text

    userEvent.type(inputElement, 'New Item');
    userEvent.click(addButton);

    await waitFor(() => {
      expect(api.addItem).toHaveBeenCalledWith('New Item');
      expect(api.fetchData).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('New Item')).toBeInTheDocument();
    });
  });
});