import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Landing } from '../Landing'; // Replace with the actual path
import * as api from '../../api'; // Replace with the actual path to your API module

// Mock the API module
jest.mock('../../api', () => ({
  fetchData: jest.fn(),
  submitForm: jest.fn(),
}));

describe('Landing Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Landing />);
  });

  it('displays loading state initially', () => {
    (api.fetchData as jest.Mock).mockResolvedValue(null);
    render(<Landing />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data on successful API call', async () => {
    const mockData = { title: 'Test Title', description: 'Test Description' };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Test Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
    });
  });

  it('displays error message on failed API call', async () => {
    (api.fetchData as jest.Mock).mockRejectedValue(new Error('API Error'));
    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('renders form elements', () => {
    render(<Landing />);
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  it('updates input values on change', () => {
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });

    expect(nameInput).toHaveValue('John Doe');
    expect(emailInput).toHaveValue('john.doe@example.com');
  });

  it('submits the form with valid data', async () => {
    (api.submitForm as jest.Mock).mockResolvedValue({ success: true });
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.submitForm).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Form submitted successfully/i)).toBeInTheDocument();
    });
  });

  it('displays error message on form submission failure', async () => {
    (api.submitForm as jest.Mock).mockRejectedValue(new Error('Form submission failed'));
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Error submitting form/i)).toBeInTheDocument();
    });
  });

  it('displays validation error for invalid email', async () => {
    render(<Landing />);
    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid email format/i)).toBeInTheDocument();
    });
  });

  it('displays validation error for empty name', async () => {
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    });
  });

  it('clears form after successful submission', async () => {
    (api.submitForm as jest.Mock).mockResolvedValue({ success: true });
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Form submitted successfully/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(nameInput).toHaveValue('');
      expect(emailInput).toHaveValue('');
    });
  });

  it('handles edge case: long name', async () => {
    (api.submitForm as jest.Mock).mockResolvedValue({ success: true });
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    const longName = 'A'.repeat(101); // Exceeds the limit
    fireEvent.change(nameInput, { target: { value: longName } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Name must be less than 100 characters/i)).toBeInTheDocument();
    });
  });

  it('renders with accessible labels and roles', () => {
    render(<Landing />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toHaveAttribute('id');
    expect(screen.getByLabelText(/Email/i)).toHaveAttribute('id');
    expect(screen.getByRole('button', { name: /Submit/i })).toBeEnabled();
  });

  it('handles form submission when enter key is pressed in the email field', async () => {
    (api.submitForm as jest.Mock).mockResolvedValue({ success: true });
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    fireEvent.keyDown(emailInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(api.submitForm).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Form submitted successfully/i)).toBeInTheDocument();
    });
  });

  it('disables submit button while submitting', async () => {
    (api.submitForm as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 500)));
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(/Form submitted successfully/i)).toBeInTheDocument();
      expect(submitButton).toBeEnabled();
    }, {timeout: 1000});
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Landing } from '../Landing'; // Replace with the actual path
import * as api from '../../api'; // Replace with the actual path to your API module

// Mock the API module
jest.mock('../../api', () => ({
  fetchData: jest.fn(),
  submitForm: jest.fn(),
}));

describe('Landing Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Landing />);
  });

  it('displays loading state initially', () => {
    (api.fetchData as jest.Mock).mockResolvedValue(null);
    render(<Landing />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data on successful API call', async () => {
    const mockData = { title: 'Test Title', description: 'Test Description' };
    (api.fetchData as jest.Mock).mockResolvedValue(mockData);
    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Test Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
    });
  });

  it('displays error message on failed API call', async () => {
    (api.fetchData as jest.Mock).mockRejectedValue(new Error('API Error'));
    render(<Landing />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('renders form elements', () => {
    render(<Landing />);
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  it('updates input values on change', () => {
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });

    expect(nameInput).toHaveValue('John Doe');
    expect(emailInput).toHaveValue('john.doe@example.com');
  });

  it('submits the form with valid data', async () => {
    (api.submitForm as jest.Mock).mockResolvedValue({ success: true });
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.submitForm).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Form submitted successfully/i)).toBeInTheDocument();
    });
  });

  it('displays error message on form submission failure', async () => {
    (api.submitForm as jest.Mock).mockRejectedValue(new Error('Form submission failed'));
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Error submitting form/i)).toBeInTheDocument();
    });
  });

  it('displays validation error for invalid email', async () => {
    render(<Landing />);
    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid email format/i)).toBeInTheDocument();
    });
  });

  it('displays validation error for empty name', async () => {
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    });
  });

  it('clears form after successful submission', async () => {
    (api.submitForm as jest.Mock).mockResolvedValue({ success: true });
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Form submitted successfully/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(nameInput).toHaveValue('');
      expect(emailInput).toHaveValue('');
    });
  });

  it('handles edge case: long name', async () => {
    (api.submitForm as jest.Mock).mockResolvedValue({ success: true });
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    const longName = 'A'.repeat(101); // Exceeds the limit
    fireEvent.change(nameInput, { target: { value: longName } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Name must be less than 100 characters/i)).toBeInTheDocument();
    });
  });

  it('renders with accessible labels and roles', () => {
    render(<Landing />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toHaveAttribute('id');
    expect(screen.getByLabelText(/Email/i)).toHaveAttribute('id');
    expect(screen.getByRole('button', { name: /Submit/i })).toBeEnabled();
  });

  it('handles form submission when enter key is pressed in the email field', async () => {
    (api.submitForm as jest.Mock).mockResolvedValue({ success: true });
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    fireEvent.keyDown(emailInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(api.submitForm).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Form submitted successfully/i)).toBeInTheDocument();
    });
  });

  it('disables submit button while submitting', async () => {
    (api.submitForm as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 500)));
    render(<Landing />);
    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(/Form submitted successfully/i)).toBeInTheDocument();
      expect(submitButton).toBeEnabled();
    }, {timeout: 1000});
  });
});