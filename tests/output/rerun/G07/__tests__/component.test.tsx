import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Landing } from '../Landing'; // Replace with the actual path to your component
import * as api from '../api'; // Replace with the actual path to your API module

// Mock the API module
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
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
    });
  });

  it('displays error message on failed API call', async () => {
    (api.fetchData as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<Landing />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('handles empty data from API', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue([]);

    render(<Landing />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('calls the submit function when the form is submitted', async () => {
    const mockSubmit = jest.fn();
    (api.fetchData as jest.Mock).mockResolvedValue([]);

    render(<Landing onSubmit={mockSubmit} />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByLabelText(/Name/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    userEvent.type(inputElement, 'Test Name');
    fireEvent.click(submitButton);

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Test Name' }));
  });

  it('updates input value on change', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue([]);
    render(<Landing />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByLabelText(/Name/i);
    userEvent.type(inputElement, 'Test Input');

    expect(inputElement).toHaveValue('Test Input');
  });

  it('displays validation errors when input is invalid', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue([]);
    render(<Landing />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    });
  });

  it('clears input field after successful submission', async () => {
    const mockSubmit = jest.fn();
    (api.fetchData as jest.Mock).mockResolvedValue([]);

    render(<Landing onSubmit={mockSubmit} />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByLabelText(/Name/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    userEvent.type(inputElement, 'Test Name');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(inputElement).toHaveValue('');
    });
  });

  it('renders with accessible labels and roles', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue([]);
    render(<Landing />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByLabelText(/Name/i);
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveAttribute('type', 'text');

    const submitButton = screen.getByRole('button', { name: /Submit/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('handles long loading times gracefully', async () => {
    (api.fetchData as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([{ id: 1, name: 'Item 1' }]), 5000))
    );

    render(<Landing />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    }, { timeout: 6000 });
  });

  it('retries API call on error after a delay', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (api.fetchData as jest.Mock)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockData);

    render(<Landing />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    }, { timeout: 6000 });
  });

  it('does not retry API call if retry is disabled', async () => {
    (api.fetchData as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<Landing retry={false} />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('displays a custom loading message', () => {
    render(<Landing loadingMessage="Fetching data..." />);
    expect(screen.getByText(/Fetching data.../i)).toBeInTheDocument();
  });

  it('displays a custom error message', async () => {
    (api.fetchData as jest.Mock).mockRejectedValue(new Error('Custom Error'));

    render(<Landing errorMessage="Something went wrong!" />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Something went wrong!/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Landing } from '../Landing'; // Replace with the actual path to your component
import * as api from '../api'; // Replace with the actual path to your API module

// Mock the API module
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
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/i)).toBeInTheDocument();
    });
  });

  it('displays error message on failed API call', async () => {
    (api.fetchData as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<Landing />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('handles empty data from API', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue([]);

    render(<Landing />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('calls the submit function when the form is submitted', async () => {
    const mockSubmit = jest.fn();
    (api.fetchData as jest.Mock).mockResolvedValue([]);

    render(<Landing onSubmit={mockSubmit} />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByLabelText(/Name/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    userEvent.type(inputElement, 'Test Name');
    fireEvent.click(submitButton);

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Test Name' }));
  });

  it('updates input value on change', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue([]);
    render(<Landing />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByLabelText(/Name/i);
    userEvent.type(inputElement, 'Test Input');

    expect(inputElement).toHaveValue('Test Input');
  });

  it('displays validation errors when input is invalid', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue([]);
    render(<Landing />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    });
  });

  it('clears input field after successful submission', async () => {
    const mockSubmit = jest.fn();
    (api.fetchData as jest.Mock).mockResolvedValue([]);

    render(<Landing onSubmit={mockSubmit} />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByLabelText(/Name/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    userEvent.type(inputElement, 'Test Name');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(inputElement).toHaveValue('');
    });
  });

  it('renders with accessible labels and roles', async () => {
    (api.fetchData as jest.Mock).mockResolvedValue([]);
    render(<Landing />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
    });

    const inputElement = screen.getByLabelText(/Name/i);
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveAttribute('type', 'text');

    const submitButton = screen.getByRole('button', { name: /Submit/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('handles long loading times gracefully', async () => {
    (api.fetchData as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([{ id: 1, name: 'Item 1' }]), 5000))
    );

    render(<Landing />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    }, { timeout: 6000 });
  });

  it('retries API call on error after a delay', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    (api.fetchData as jest.Mock)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockData);

    render(<Landing />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    }, { timeout: 6000 });
  });

  it('does not retry API call if retry is disabled', async () => {
    (api.fetchData as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<Landing retry={false} />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('displays a custom loading message', () => {
    render(<Landing loadingMessage="Fetching data..." />);
    expect(screen.getByText(/Fetching data.../i)).toBeInTheDocument();
  });

  it('displays a custom error message', async () => {
    (api.fetchData as jest.Mock).mockRejectedValue(new Error('Custom Error'));

    render(<Landing errorMessage="Something went wrong!" />);

    await waitFor(() => {
      expect(api.fetchData).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Something went wrong!/i)).toBeInTheDocument();
    });
  });
});