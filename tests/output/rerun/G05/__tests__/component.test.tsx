import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landing } from '../Landing'; // Assuming your component is named Landing and in Landing.tsx/jsx
import * as api from '../api'; // Assuming you have an api.ts/js file for API calls

jest.mock('../api');

describe('Landing Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Landing />);
  });

  it('displays loading state initially', () => {
    render(<Landing />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data on successful API call', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
    });
  });

  it('displays error message on failed API call', async () => {
    (api.fetchData as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('handles empty data from API', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue([]);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('simulates user interaction - button click', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /Click Me/i }); // Adjust name if needed
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Button Clicked/i)).toBeInTheDocument(); // Adjust text if needed
    });
  });

  it('simulates user interaction - input change', async () => {
    render(<Landing />);

    const inputElement = screen.getByRole('textbox', { name: /Search/i }); // Adjust name if needed
    userEvent.type(inputElement, 'test');

    expect(inputElement).toHaveValue('test');
  });

  it('updates state based on user input', async () => {
    render(<Landing />);
    const inputElement = screen.getByRole('textbox', { name: /Search/i });
    userEvent.type(inputElement, 'example');
    expect(inputElement).toHaveValue('example');
  });

  it('renders with accessibility features - ARIA roles', () => {
    render(<Landing />);
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
  });

  it('renders with accessibility features - proper labels', () => {
    render(<Landing />);
    const inputElement = screen.getByRole('textbox', { name: /Search/i });
    expect(inputElement).toBeInTheDocument();
  });

  it('handles edge case - very long input', async () => {
    render(<Landing />);
    const longInput = 'a'.repeat(200);
    const inputElement = screen.getByRole('textbox', { name: /Search/i });
    userEvent.type(inputElement, longInput);
    expect(inputElement).toHaveValue(longInput);
  });

  it('handles edge case - special characters in input', async () => {
    render(<Landing />);
    const specialChars = '!@#$%^&*()_+=-`~[]\{}|;\':",./<>?';
    const inputElement = screen.getByRole('textbox', { name: /Search/i });
    userEvent.type(inputElement, specialChars);
    expect(inputElement).toHaveValue(specialChars);
  });

  it('displays a specific message when no data matches the search term', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const inputElement = screen.getByRole('textbox', { name: /Search/i });
    userEvent.type(inputElement, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText(/No items found matching/i)).toBeInTheDocument();
    });
  });

  it('correctly filters data based on search input', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }, { id: 3, name: 'Another Item' }];
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const inputElement = screen.getByRole('textbox', { name: /Search/i });
    userEvent.type(inputElement, 'Item 1');

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.queryByText(/Item 2/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Another Item/i)).not.toBeInTheDocument();
    });
  });

  it('calls API only once on initial render', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<Landing />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });
  });

  it('updates data after a specific action (e.g., refresh button click)', async () => {
    const mockData1 = [{ id: 1, name: 'Item 1' }];
    const mockData2 = [{ id: 2, name: 'Item 2' }];
    (api.fetchData as jest.Mock)
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i }); // Adjust name if needed
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
      expect(screen.queryByText(/Item 1/i)).not.toBeInTheDocument();
    });
  });

  it('renders with correct initial state', () => {
    render(<Landing />);
    const inputElement = screen.getByRole('textbox', { name: /Search/i });
    expect(inputElement).toHaveValue('');
  });

  it('displays a message when the API returns null', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue(null);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('displays a message when the API returns undefined', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue(undefined);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landing } from '../Landing'; // Assuming your component is named Landing and in Landing.tsx/jsx
import * as api from '../api'; // Assuming you have an api.ts/js file for API calls

jest.mock('../api');

describe('Landing Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Landing />);
  });

  it('displays loading state initially', () => {
    render(<Landing />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data on successful API call', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
    });
  });

  it('displays error message on failed API call', async () => {
    (api.fetchData as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('handles empty data from API', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue([]);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('simulates user interaction - button click', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /Click Me/i }); // Adjust name if needed
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Button Clicked/i)).toBeInTheDocument(); // Adjust text if needed
    });
  });

  it('simulates user interaction - input change', async () => {
    render(<Landing />);

    const inputElement = screen.getByRole('textbox', { name: /Search/i }); // Adjust name if needed
    userEvent.type(inputElement, 'test');

    expect(inputElement).toHaveValue('test');
  });

  it('updates state based on user input', async () => {
    render(<Landing />);
    const inputElement = screen.getByRole('textbox', { name: /Search/i });
    userEvent.type(inputElement, 'example');
    expect(inputElement).toHaveValue('example');
  });

  it('renders with accessibility features - ARIA roles', () => {
    render(<Landing />);
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
  });

  it('renders with accessibility features - proper labels', () => {
    render(<Landing />);
    const inputElement = screen.getByRole('textbox', { name: /Search/i });
    expect(inputElement).toBeInTheDocument();
  });

  it('handles edge case - very long input', async () => {
    render(<Landing />);
    const longInput = 'a'.repeat(200);
    const inputElement = screen.getByRole('textbox', { name: /Search/i });
    userEvent.type(inputElement, longInput);
    expect(inputElement).toHaveValue(longInput);
  });

  it('handles edge case - special characters in input', async () => {
    render(<Landing />);
    const specialChars = '!@#$%^&*()_+=-`~[]\{}|;\':",./<>?';
    const inputElement = screen.getByRole('textbox', { name: /Search/i });
    userEvent.type(inputElement, specialChars);
    expect(inputElement).toHaveValue(specialChars);
  });

  it('displays a specific message when no data matches the search term', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const inputElement = screen.getByRole('textbox', { name: /Search/i });
    userEvent.type(inputElement, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText(/No items found matching/i)).toBeInTheDocument();
    });
  });

  it('correctly filters data based on search input', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }, { id: 3, name: 'Another Item' }];
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const inputElement = screen.getByRole('textbox', { name: /Search/i });
    userEvent.type(inputElement, 'Item 1');

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.queryByText(/Item 2/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Another Item/i)).not.toBeInTheDocument();
    });
  });

  it('calls API only once on initial render', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);

    render(<Landing />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });
  });

  it('updates data after a specific action (e.g., refresh button click)', async () => {
    const mockData1 = [{ id: 1, name: 'Item 1' }];
    const mockData2 = [{ id: 2, name: 'Item 2' }];
    (api.fetchData as jest.Mock)
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i }); // Adjust name if needed
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
      expect(screen.queryByText(/Item 1/i)).not.toBeInTheDocument();
    });
  });

  it('renders with correct initial state', () => {
    render(<Landing />);
    const inputElement = screen.getByRole('textbox', { name: /Search/i });
    expect(inputElement).toHaveValue('');
  });

  it('displays a message when the API returns null', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue(null);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('displays a message when the API returns undefined', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue(undefined);

    render(<Landing />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });
});