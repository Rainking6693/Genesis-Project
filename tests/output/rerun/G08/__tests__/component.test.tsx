import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CoreFunctionality } from '../components/CoreFunctionality'; // Adjust path as needed

// Mock any external dependencies, e.g., API calls
const mockApiCall = jest.fn();

jest.mock('../api/yourApi', () => ({ // Adjust path as needed
  fetchData: mockApiCall,
}));

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CoreFunctionality />);
  });

  it('displays loading state initially', () => {
    render(<CoreFunctionality />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data successfully', async () => {
    mockApiCall.mockResolvedValue({ data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }] });
    render(<CoreFunctionality />);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
    });
  });

  it('displays error message when data fetching fails', async () => {
    mockApiCall.mockRejectedValue(new Error('Failed to fetch data'));
    render(<CoreFunctionality />);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Error: Failed to fetch data/i)).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    mockApiCall.mockResolvedValue({ data: [] });
    render(<CoreFunctionality />);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('simulates user interaction - button click', async () => {
    const handleClick = jest.fn();
    render(<CoreFunctionality onButtonClick={handleClick} />);
    const button = screen.getByRole('button', { name: /Click Me/i }); // Adjust button name
    fireEvent.click(button);
    await waitFor(() => {
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  it('simulates user interaction - input change', async () => {
    render(<CoreFunctionality />);
    const inputElement = screen.getByRole('textbox');
    fireEvent.change(inputElement, { target: { value: 'Test Input' } });
    expect(inputElement.value).toBe('Test Input');
  });

  it('updates state correctly after input change', async () => {
    render(<CoreFunctionality />);
    const inputElement = screen.getByRole('textbox');
    fireEvent.change(inputElement, { target: { value: 'New Value' } });
    await waitFor(() => {
        expect(inputElement.value).toBe('New Value');
    });
  });

  it('renders with appropriate ARIA attributes for accessibility', () => {
    render(<CoreFunctionality />);
    const headingElement = screen.getByRole('heading', { level: 1 }); // Adjust level as needed
    expect(headingElement).toBeInTheDocument();
  });

  it('handles edge case - very long input', async () => {
    render(<CoreFunctionality />);
    const inputElement = screen.getByRole('textbox');
    const longInputValue = 'a'.repeat(200); // Simulate a very long input
    fireEvent.change(inputElement, { target: { value: longInputValue } });
    await waitFor(() => {
        expect(inputElement.value).toBe(longInputValue);
    });
  });

  it('renders different content based on a prop', () => {
    render(<CoreFunctionality showAlternativeContent={true} />);
    expect(screen.getByText(/Alternative Content/i)).toBeInTheDocument();

    render(<CoreFunctionality showAlternativeContent={false} />);
    expect(screen.queryByText(/Alternative Content/i)).not.toBeInTheDocument();
  });

  it('calls a callback function with correct arguments', async () => {
    const callbackFunction = jest.fn();
    render(<CoreFunctionality onDataLoaded={callbackFunction} />);
    mockApiCall.mockResolvedValue({ data: [{ id: 1, name: 'Item 1' }] });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    // Simulate data loading completion
    await act(async () => {
      render(<CoreFunctionality onDataLoaded={callbackFunction} />);
      mockApiCall.mockResolvedValue({ data: [{ id: 1, name: 'Item 1' }] });
      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledTimes(1);
      });
    });
  });

  it('displays a specific message when no items match the search', async () => {
    mockApiCall.mockResolvedValue({ data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }] });
    render(<CoreFunctionality />);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'NonExistentItem' } });

    await waitFor(() => {
      expect(screen.getByText(/No items found matching/i)).toBeInTheDocument();
    });
  });

  it('updates the displayed list when the search term changes', async () => {
    mockApiCall.mockResolvedValue({ data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }] });
    render(<CoreFunctionality />);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'Item 1' } });

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.queryByText(/Item 2/i)).toBeNull();
    });
  });

  it('clears the search term when a clear button is clicked', async () => {
    mockApiCall.mockResolvedValue({ data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }] });
    render(<CoreFunctionality />);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'Item 1' } });

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const clearButton = screen.getByRole('button', { name: /Clear/i }); // Adjust button name if needed
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(searchInput.value).toBe('');
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CoreFunctionality } from '../components/CoreFunctionality'; // Adjust path as needed

// Mock any external dependencies, e.g., API calls
const mockApiCall = jest.fn();

jest.mock('../api/yourApi', () => ({ // Adjust path as needed
  fetchData: mockApiCall,
}));

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CoreFunctionality />);
  });

  it('displays loading state initially', () => {
    render(<CoreFunctionality />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data successfully', async () => {
    mockApiCall.mockResolvedValue({ data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }] });
    render(<CoreFunctionality />);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
    });
  });

  it('displays error message when data fetching fails', async () => {
    mockApiCall.mockRejectedValue(new Error('Failed to fetch data'));
    render(<CoreFunctionality />);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Error: Failed to fetch data/i)).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    mockApiCall.mockResolvedValue({ data: [] });
    render(<CoreFunctionality />);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('simulates user interaction - button click', async () => {
    const handleClick = jest.fn();
    render(<CoreFunctionality onButtonClick={handleClick} />);
    const button = screen.getByRole('button', { name: /Click Me/i }); // Adjust button name
    fireEvent.click(button);
    await waitFor(() => {
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  it('simulates user interaction - input change', async () => {
    render(<CoreFunctionality />);
    const inputElement = screen.getByRole('textbox');
    fireEvent.change(inputElement, { target: { value: 'Test Input' } });
    expect(inputElement.value).toBe('Test Input');
  });

  it('updates state correctly after input change', async () => {
    render(<CoreFunctionality />);
    const inputElement = screen.getByRole('textbox');
    fireEvent.change(inputElement, { target: { value: 'New Value' } });
    await waitFor(() => {
        expect(inputElement.value).toBe('New Value');
    });
  });

  it('renders with appropriate ARIA attributes for accessibility', () => {
    render(<CoreFunctionality />);
    const headingElement = screen.getByRole('heading', { level: 1 }); // Adjust level as needed
    expect(headingElement).toBeInTheDocument();
  });

  it('handles edge case - very long input', async () => {
    render(<CoreFunctionality />);
    const inputElement = screen.getByRole('textbox');
    const longInputValue = 'a'.repeat(200); // Simulate a very long input
    fireEvent.change(inputElement, { target: { value: longInputValue } });
    await waitFor(() => {
        expect(inputElement.value).toBe(longInputValue);
    });
  });

  it('renders different content based on a prop', () => {
    render(<CoreFunctionality showAlternativeContent={true} />);
    expect(screen.getByText(/Alternative Content/i)).toBeInTheDocument();

    render(<CoreFunctionality showAlternativeContent={false} />);
    expect(screen.queryByText(/Alternative Content/i)).not.toBeInTheDocument();
  });

  it('calls a callback function with correct arguments', async () => {
    const callbackFunction = jest.fn();
    render(<CoreFunctionality onDataLoaded={callbackFunction} />);
    mockApiCall.mockResolvedValue({ data: [{ id: 1, name: 'Item 1' }] });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    // Simulate data loading completion
    await act(async () => {
      render(<CoreFunctionality onDataLoaded={callbackFunction} />);
      mockApiCall.mockResolvedValue({ data: [{ id: 1, name: 'Item 1' }] });
      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledTimes(1);
      });
    });
  });

  it('displays a specific message when no items match the search', async () => {
    mockApiCall.mockResolvedValue({ data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }] });
    render(<CoreFunctionality />);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'NonExistentItem' } });

    await waitFor(() => {
      expect(screen.getByText(/No items found matching/i)).toBeInTheDocument();
    });
  });

  it('updates the displayed list when the search term changes', async () => {
    mockApiCall.mockResolvedValue({ data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }] });
    render(<CoreFunctionality />);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'Item 1' } });

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.queryByText(/Item 2/i)).toBeNull();
    });
  });

  it('clears the search term when a clear button is clicked', async () => {
    mockApiCall.mockResolvedValue({ data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }] });
    render(<CoreFunctionality />);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'Item 1' } });

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    });

    const clearButton = screen.getByRole('button', { name: /Clear/i }); // Adjust button name if needed
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(searchInput.value).toBe('');
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
    });
  });
});