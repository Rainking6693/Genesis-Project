import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoreFunctionality } from '../CoreFunctionality'; // Adjust path as needed
import { ApiService } from '../../services/ApiService'; // Adjust path as needed
import { AuthContext } from '../../context/AuthContext'; // Adjust path as needed
import '@testing-library/jest-dom';

// Mock ApiService
jest.mock('../../services/ApiService');

// Mock AuthContext
const mockAuthContextValue = {
  user: { id: 'test-user-id', email: 'test@example.com' },
  login: jest.fn(),
  logout: jest.fn(),
};

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );
    expect(screen.getByText('Core Functionality')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    (ApiService.fetchData as jest.Mock).mockResolvedValue(null);
    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('fetches and displays data on mount', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(ApiService.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  it('displays error message when data fetching fails', async () => {
    (ApiService.fetchData as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
    });
  });

  it('allows adding a new item', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.createData as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    const addButton = screen.getByText('Add Item');

    await userEvent.type(inputElement, 'New Item');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(ApiService.createData).toHaveBeenCalledWith({ name: 'New Item', userId: 'test-user-id' });
      expect(screen.getByText('New Item')).toBeInTheDocument();
    });
  });

  it('displays error message when adding a new item fails', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.createData as jest.Mock).mockRejectedValue(new Error('Failed to add item'));

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    const addButton = screen.getByText('Add Item');

    await userEvent.type(inputElement, 'New Item');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to add item')).toBeInTheDocument();
    });
  });

  it('allows deleting an item', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.deleteData as jest.Mock).mockResolvedValue(undefined);

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(ApiService.deleteData).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.queryByText('Item 1')).toBeNull();
    });
  });

  it('displays error message when deleting an item fails', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.deleteData as jest.Mock).mockRejectedValue(new Error('Failed to delete item'));

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(ApiService.deleteData).toHaveBeenCalledWith(1);
      expect(screen.getByText('Error: Failed to delete item')).toBeInTheDocument();
    });
  });

  it('handles empty data state', async () => {
    (ApiService.fetchData as jest.Mock).mockResolvedValue([]);

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No data available.')).toBeInTheDocument();
    });
  });

  it('clears input field after adding an item', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.createData as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    const addButton = screen.getByText('Add Item');

    await userEvent.type(inputElement, 'New Item');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(ApiService.createData).toHaveBeenCalledWith({ name: 'New Item', userId: 'test-user-id' });
      expect(inputElement.value).toBe('');
    });
  });

  it('disables the add button when the input field is empty', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    const addButton = screen.getByText('Add Item');

    expect(addButton).toBeDisabled();

    await userEvent.type(inputElement, 'Test');
    expect(addButton).toBeEnabled();

    await userEvent.clear(inputElement);
    expect(addButton).toBeDisabled();
  });

  it('renders with accessible labels and roles', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    expect(inputElement).toHaveAccessibleName('Enter new item name');

    const addButton = screen.getByText('Add Item');
    expect(addButton).toHaveAttribute('type', 'button');

    const deleteButton = screen.getByText('Delete');
    expect(deleteButton).toHaveAttribute('type', 'button');
  });

  it('updates data correctly after adding and deleting items', async () => {
    const initialData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(initialData);
    (ApiService.createData as jest.Mock).mockImplementation((newItem) => Promise.resolve({ id: 2, name: newItem.name }));
    (ApiService.deleteData as jest.Mock).mockResolvedValue(undefined);

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    const addButton = screen.getByText('Add Item');

    await userEvent.type(inputElement, 'New Item');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('New Item')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByText('Delete')[1]; // Get the delete button for the "New Item"
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText('New Item')).toBeNull();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  it('handles adding an item with an empty name', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add Item');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(ApiService.createData).not.toHaveBeenCalled();
    });
  });

  it('shows a specific error message when the API returns a 400 status code for adding an item', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.createData as jest.Mock).mockRejectedValue({ response: { status: 400, data: { message: 'Invalid input' } } });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    const addButton = screen.getByText('Add Item');

    await userEvent.type(inputElement, 'New Item');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Invalid input')).toBeInTheDocument();
    });
  });

  it('shows a generic error message when the API returns a 500 status code for adding an item', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.createData as jest.Mock).mockRejectedValue({ response: { status: 500, data: { message: 'Server error' } } });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    const addButton = screen.getByText('Add Item');

    await userEvent.type(inputElement, 'New Item');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to add item')).toBeInTheDocument();
    });
  });

  it('shows a specific error message when the API returns a 404 status code for deleting an item', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.deleteData as jest.Mock).mockRejectedValue({ response: { status: 404, data: { message: 'Item not found' } } });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(ApiService.deleteData).toHaveBeenCalledWith(1);
      expect(screen.getByText('Error: Item not found')).toBeInTheDocument();
    });
  });

  it('shows a generic error message when the API returns a 500 status code for deleting an item', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.deleteData as jest.Mock).mockRejectedValue({ response: { status: 500, data: { message: 'Server error' } } });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(ApiService.deleteData).toHaveBeenCalledWith(1);
      expect(screen.getByText('Error: Failed to delete item')).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoreFunctionality } from '../CoreFunctionality'; // Adjust path as needed
import { ApiService } from '../../services/ApiService'; // Adjust path as needed
import { AuthContext } from '../../context/AuthContext'; // Adjust path as needed
import '@testing-library/jest-dom';

// Mock ApiService
jest.mock('../../services/ApiService');

// Mock AuthContext
const mockAuthContextValue = {
  user: { id: 'test-user-id', email: 'test@example.com' },
  login: jest.fn(),
  logout: jest.fn(),
};

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );
    expect(screen.getByText('Core Functionality')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    (ApiService.fetchData as jest.Mock).mockResolvedValue(null);
    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('fetches and displays data on mount', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(ApiService.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  it('displays error message when data fetching fails', async () => {
    (ApiService.fetchData as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
    });
  });

  it('allows adding a new item', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.createData as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    const addButton = screen.getByText('Add Item');

    await userEvent.type(inputElement, 'New Item');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(ApiService.createData).toHaveBeenCalledWith({ name: 'New Item', userId: 'test-user-id' });
      expect(screen.getByText('New Item')).toBeInTheDocument();
    });
  });

  it('displays error message when adding a new item fails', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.createData as jest.Mock).mockRejectedValue(new Error('Failed to add item'));

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    const addButton = screen.getByText('Add Item');

    await userEvent.type(inputElement, 'New Item');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to add item')).toBeInTheDocument();
    });
  });

  it('allows deleting an item', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.deleteData as jest.Mock).mockResolvedValue(undefined);

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(ApiService.deleteData).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.queryByText('Item 1')).toBeNull();
    });
  });

  it('displays error message when deleting an item fails', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.deleteData as jest.Mock).mockRejectedValue(new Error('Failed to delete item'));

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(ApiService.deleteData).toHaveBeenCalledWith(1);
      expect(screen.getByText('Error: Failed to delete item')).toBeInTheDocument();
    });
  });

  it('handles empty data state', async () => {
    (ApiService.fetchData as jest.Mock).mockResolvedValue([]);

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No data available.')).toBeInTheDocument();
    });
  });

  it('clears input field after adding an item', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.createData as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    const addButton = screen.getByText('Add Item');

    await userEvent.type(inputElement, 'New Item');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(ApiService.createData).toHaveBeenCalledWith({ name: 'New Item', userId: 'test-user-id' });
      expect(inputElement.value).toBe('');
    });
  });

  it('disables the add button when the input field is empty', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    const addButton = screen.getByText('Add Item');

    expect(addButton).toBeDisabled();

    await userEvent.type(inputElement, 'Test');
    expect(addButton).toBeEnabled();

    await userEvent.clear(inputElement);
    expect(addButton).toBeDisabled();
  });

  it('renders with accessible labels and roles', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    expect(inputElement).toHaveAccessibleName('Enter new item name');

    const addButton = screen.getByText('Add Item');
    expect(addButton).toHaveAttribute('type', 'button');

    const deleteButton = screen.getByText('Delete');
    expect(deleteButton).toHaveAttribute('type', 'button');
  });

  it('updates data correctly after adding and deleting items', async () => {
    const initialData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(initialData);
    (ApiService.createData as jest.Mock).mockImplementation((newItem) => Promise.resolve({ id: 2, name: newItem.name }));
    (ApiService.deleteData as jest.Mock).mockResolvedValue(undefined);

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    const addButton = screen.getByText('Add Item');

    await userEvent.type(inputElement, 'New Item');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('New Item')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByText('Delete')[1]; // Get the delete button for the "New Item"
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText('New Item')).toBeNull();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  it('handles adding an item with an empty name', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add Item');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(ApiService.createData).not.toHaveBeenCalled();
    });
  });

  it('shows a specific error message when the API returns a 400 status code for adding an item', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.createData as jest.Mock).mockRejectedValue({ response: { status: 400, data: { message: 'Invalid input' } } });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    const addButton = screen.getByText('Add Item');

    await userEvent.type(inputElement, 'New Item');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Invalid input')).toBeInTheDocument();
    });
  });

  it('shows a generic error message when the API returns a 500 status code for adding an item', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.createData as jest.Mock).mockRejectedValue({ response: { status: 500, data: { message: 'Server error' } } });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const inputElement = screen.getByPlaceholderText('Enter new item name');
    const addButton = screen.getByText('Add Item');

    await userEvent.type(inputElement, 'New Item');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to add item')).toBeInTheDocument();
    });
  });

  it('shows a specific error message when the API returns a 404 status code for deleting an item', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.deleteData as jest.Mock).mockRejectedValue({ response: { status: 404, data: { message: 'Item not found' } } });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(ApiService.deleteData).toHaveBeenCalledWith(1);
      expect(screen.getByText('Error: Item not found')).toBeInTheDocument();
    });
  });

  it('shows a generic error message when the API returns a 500 status code for deleting an item', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (ApiService.fetchData as jest.Mock).mockResolvedValue(mockData);
    (ApiService.deleteData as jest.Mock).mockRejectedValue({ response: { status: 500, data: { message: 'Server error' } } });

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <CoreFunctionality />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(ApiService.deleteData).toHaveBeenCalledWith(1);
      expect(screen.getByText('Error: Failed to delete item')).toBeInTheDocument();
    });
  });
});