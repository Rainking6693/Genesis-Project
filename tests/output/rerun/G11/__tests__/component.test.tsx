import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../src/DashboardComponent'; // Replace with the actual path
import * as api from '../src/api'; // Replace with the actual path to your API module

jest.mock('../src/api'); // Mock the API module

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.fetchData as jest.Mock).mockResolvedValue(null);
    render(<DashboardComponent />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data on successful API call', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Test Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
    });
  });

  it('displays error message on failed API call', async () => {
    (api.fetchData as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('handles empty data from API', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue({ title: 'Empty Dashboard', items: [] });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Empty Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/No items found/i)).toBeInTheDocument();
    });
  });

  it('allows adding a new item', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.addItem as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Add Item/i });
    fireEvent.click(addButton);

    const inputElement = screen.getByPlaceholderText(/Enter item name/i);
    fireEvent.change(inputElement, { target: { value: 'New Item' } });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.addItem).toHaveBeenCalledWith('New Item');
      expect(screen.getByText(/New Item/i)).toBeInTheDocument();
    });
  });

  it('displays error message when adding an item fails', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.addItem as jest.Mock).mockRejectedValue(new Error('Add Item Error'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Add Item/i });
    fireEvent.click(addButton);

    const inputElement = screen.getByPlaceholderText(/Enter item name/i);
    fireEvent.change(inputElement, { target: { value: 'New Item' } });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Error adding item/i)).toBeInTheDocument();
    });
  });

  it('allows deleting an item', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.deleteItem as jest.Mock).mockResolvedValue(undefined);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.deleteItem).toHaveBeenCalledWith(1);
      expect(screen.queryByText(/Item 1/i)).toBeNull();
    });
  });

  it('displays error message when deleting an item fails', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.deleteItem as jest.Mock).mockRejectedValue(new Error('Delete Item Error'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/Error deleting item/i)).toBeInTheDocument();
    });
  });

  it('closes the add item modal on cancel', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Add Item/i });
    fireEvent.click(addButton);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Enter item name/i)).toBeNull();
    });
  });

  it('handles adding an item with an empty name', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Add Item/i });
    fireEvent.click(addButton);

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Item name cannot be empty/i)).toBeInTheDocument();
    });
  });

  it('renders with accessible labels and roles', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Test Dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getByRole('listitem')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
    });
  });

  it('updates data after adding and deleting an item', async () => {
    const initialMockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    const addedItemMockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'New Item' }],
    };
    const deletedItemMockData = {
      title: 'Test Dashboard',
      items: [],
    };

    (api.fetchData as jest.Mock).mockResolvedValue(initialMockData);
    (api.addItem as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });
    (api.deleteItem as jest.Mock).mockResolvedValue(undefined);
    (api.fetchData as jest.Mock).mockResolvedValueOnce(initialMockData).mockResolvedValueOnce(addedItemMockData).mockResolvedValueOnce(deletedItemMockData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    // Add Item
    const addButton = screen.getByRole('button', { name: /Add Item/i });
    fireEvent.click(addButton);

    const inputElement = screen.getByPlaceholderText(/Enter item name/i);
    fireEvent.change(inputElement, { target: { value: 'New Item' } });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/New Item/i)).toBeInTheDocument();
    });

    // Delete Item
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText(/Item 1/i)).toBeNull();
      expect(screen.queryByText(/New Item/i)).toBeNull();
      expect(screen.getByText(/No items found/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardComponent } from '../src/DashboardComponent'; // Replace with the actual path
import * as api from '../src/api'; // Replace with the actual path to your API module

jest.mock('../src/api'); // Mock the API module

describe('DashboardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.fetchData as jest.Mock).mockResolvedValue(null);
    render(<DashboardComponent />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data on successful API call', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Test Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
    });
  });

  it('displays error message on failed API call', async () => {
    (api.fetchData as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('handles empty data from API', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue({ title: 'Empty Dashboard', items: [] });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Empty Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/No items found/i)).toBeInTheDocument();
    });
  });

  it('allows adding a new item', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.addItem as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Add Item/i });
    fireEvent.click(addButton);

    const inputElement = screen.getByPlaceholderText(/Enter item name/i);
    fireEvent.change(inputElement, { target: { value: 'New Item' } });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.addItem).toHaveBeenCalledWith('New Item');
      expect(screen.getByText(/New Item/i)).toBeInTheDocument();
    });
  });

  it('displays error message when adding an item fails', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.addItem as jest.Mock).mockRejectedValue(new Error('Add Item Error'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Add Item/i });
    fireEvent.click(addButton);

    const inputElement = screen.getByPlaceholderText(/Enter item name/i);
    fireEvent.change(inputElement, { target: { value: 'New Item' } });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Error adding item/i)).toBeInTheDocument();
    });
  });

  it('allows deleting an item', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.deleteItem as jest.Mock).mockResolvedValue(undefined);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.deleteItem).toHaveBeenCalledWith(1);
      expect(screen.queryByText(/Item 1/i)).toBeNull();
    });
  });

  it('displays error message when deleting an item fails', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    (api.deleteItem as jest.Mock).mockRejectedValue(new Error('Delete Item Error'));

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/Error deleting item/i)).toBeInTheDocument();
    });
  });

  it('closes the add item modal on cancel', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Add Item/i });
    fireEvent.click(addButton);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Enter item name/i)).toBeNull();
    });
  });

  it('handles adding an item with an empty name', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Add Item/i });
    fireEvent.click(addButton);

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Item name cannot be empty/i)).toBeInTheDocument();
    });
  });

  it('renders with accessible labels and roles', async () => {
    const mockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Test Dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getByRole('listitem')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
    });
  });

  it('updates data after adding and deleting an item', async () => {
    const initialMockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }],
    };
    const addedItemMockData = {
      title: 'Test Dashboard',
      items: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'New Item' }],
    };
    const deletedItemMockData = {
      title: 'Test Dashboard',
      items: [],
    };

    (api.fetchData as jest.Mock).mockResolvedValue(initialMockData);
    (api.addItem as jest.Mock).mockResolvedValue({ id: 2, name: 'New Item' });
    (api.deleteItem as jest.Mock).mockResolvedValue(undefined);
    (api.fetchData as jest.Mock).mockResolvedValueOnce(initialMockData).mockResolvedValueOnce(addedItemMockData).mockResolvedValueOnce(deletedItemMockData);

    render(<DashboardComponent />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    // Add Item
    const addButton = screen.getByRole('button', { name: /Add Item/i });
    fireEvent.click(addButton);

    const inputElement = screen.getByPlaceholderText(/Enter item name/i);
    fireEvent.change(inputElement, { target: { value: 'New Item' } });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/New Item/i)).toBeInTheDocument();
    });

    // Delete Item
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText(/Item 1/i)).toBeNull();
      expect(screen.queryByText(/New Item/i)).toBeNull();
      expect(screen.getByText(/No items found/i)).toBeInTheDocument();
    });
  });
});