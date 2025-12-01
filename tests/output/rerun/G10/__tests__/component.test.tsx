import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CoreFunctionality from '../components/CoreFunctionality'; // Adjust path as needed

// Mock external dependencies (e.g., API calls)
jest.mock('../api/landingApi', () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: 'Mocked data' })),
  submitForm: jest.fn(() => Promise.resolve({ success: true, message: 'Form submitted successfully' })),
}));

import { fetchData, submitForm } from '../api/landingApi';

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    (fetchData as jest.Mock).mockClear();
    (submitForm as jest.Mock).mockClear();
  });

  it('renders without crashing', () => {
    render(<CoreFunctionality />);
  });

  it('displays loading state initially', () => {
    render(<CoreFunctionality />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data on mount', async () => {
    (fetchData as jest.Mock).mockResolvedValueOnce({ data: 'Fetched Data' });
    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/Fetched Data/i)).toBeInTheDocument();
    });
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it('displays error message if data fetching fails', async () => {
    (fetchData as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));
    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('updates input field value on change', () => {
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/Name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });
    expect(inputElement.value).toBe('Test Name');
  });

  it('submits the form successfully', async () => {
    (submitForm as jest.Mock).mockResolvedValueOnce({ success: true, message: 'Form submitted successfully' });
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/Name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Form submitted successfully/i)).toBeInTheDocument();
    });
    expect(submitForm).toHaveBeenCalledTimes(1);
  });

  it('displays error message if form submission fails', async () => {
    (submitForm as jest.Mock).mockRejectedValueOnce(new Error('Form submission failed'));
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/Name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Form submission failed/i)).toBeInTheDocument();
    });
  });

  it('handles empty input fields during form submission', async () => {
    render(<CoreFunctionality />);
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please fill in all required fields/i)).toBeInTheDocument();
    });
    expect(submitForm).not.toHaveBeenCalled();
  });

  it('clears the form after successful submission', async () => {
    (submitForm as jest.Mock).mockResolvedValueOnce({ success: true, message: 'Form submitted successfully' });
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/Name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Form submitted successfully/i)).toBeInTheDocument();
    });

    expect(inputElement.value).toBe('');
  });

  it('renders with accessible labels and roles', () => {
    render(<CoreFunctionality />);
    const nameInput = screen.getByLabelText(/Name/i);
    expect(nameInput).toHaveAttribute('type', 'text');
    expect(nameInput).toHaveAccessibleName(/Name/i);

    const submitButton = screen.getByRole('button', { name: /Submit/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('displays a custom message when no data is available', async () => {
    (fetchData as jest.Mock).mockResolvedValueOnce({ data: null });
    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('handles edge case: very long input string', () => {
    render(<CoreFunctionality />);
    const longString = 'a'.repeat(200);
    const inputElement = screen.getByLabelText(/Name/i);
    fireEvent.change(inputElement, { target: { value: longString } });
    expect(inputElement.value).toBe(longString);
  });

  it('handles edge case: special characters in input', () => {
    render(<CoreFunctionality />);
    const specialChars = '!@#$%^&*()_+=-`~[]\{}|;\':",./<>?';
    const inputElement = screen.getByLabelText(/Name/i);
    fireEvent.change(inputElement, { target: { value: specialChars } });
    expect(inputElement.value).toBe(specialChars);
  });

  it('submits the form with userEvent', async () => {
    (submitForm as jest.Mock).mockResolvedValueOnce({ success: true, message: 'Form submitted successfully' });
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/Name/i);
    await userEvent.type(inputElement, 'Test Name');
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Form submitted successfully/i)).toBeInTheDocument();
    });
    expect(submitForm).toHaveBeenCalledTimes(1);
  });

  it('displays a specific error message when submitForm returns an error', async () => {
    (submitForm as jest.Mock).mockResolvedValueOnce({ success: false, message: 'Specific error message' });
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/Name/i);
    await userEvent.type(inputElement, 'Test Name');
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Specific error message/i)).toBeInTheDocument();
    });
  });

  it('renders with a specific aria-label on the form', () => {
    render(<CoreFunctionality />);
    const formElement = screen.getByRole('form');
    expect(formElement).toHaveAttribute('aria-label', 'Core Functionality Form');
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CoreFunctionality from '../components/CoreFunctionality'; // Adjust path as needed

// Mock external dependencies (e.g., API calls)
jest.mock('../api/landingApi', () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: 'Mocked data' })),
  submitForm: jest.fn(() => Promise.resolve({ success: true, message: 'Form submitted successfully' })),
}));

import { fetchData, submitForm } from '../api/landingApi';

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    (fetchData as jest.Mock).mockClear();
    (submitForm as jest.Mock).mockClear();
  });

  it('renders without crashing', () => {
    render(<CoreFunctionality />);
  });

  it('displays loading state initially', () => {
    render(<CoreFunctionality />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays data on mount', async () => {
    (fetchData as jest.Mock).mockResolvedValueOnce({ data: 'Fetched Data' });
    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/Fetched Data/i)).toBeInTheDocument();
    });
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it('displays error message if data fetching fails', async () => {
    (fetchData as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));
    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/Error fetching data/i)).toBeInTheDocument();
    });
  });

  it('updates input field value on change', () => {
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/Name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });
    expect(inputElement.value).toBe('Test Name');
  });

  it('submits the form successfully', async () => {
    (submitForm as jest.Mock).mockResolvedValueOnce({ success: true, message: 'Form submitted successfully' });
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/Name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Form submitted successfully/i)).toBeInTheDocument();
    });
    expect(submitForm).toHaveBeenCalledTimes(1);
  });

  it('displays error message if form submission fails', async () => {
    (submitForm as jest.Mock).mockRejectedValueOnce(new Error('Form submission failed'));
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/Name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Form submission failed/i)).toBeInTheDocument();
    });
  });

  it('handles empty input fields during form submission', async () => {
    render(<CoreFunctionality />);
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please fill in all required fields/i)).toBeInTheDocument();
    });
    expect(submitForm).not.toHaveBeenCalled();
  });

  it('clears the form after successful submission', async () => {
    (submitForm as jest.Mock).mockResolvedValueOnce({ success: true, message: 'Form submitted successfully' });
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/Name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Form submitted successfully/i)).toBeInTheDocument();
    });

    expect(inputElement.value).toBe('');
  });

  it('renders with accessible labels and roles', () => {
    render(<CoreFunctionality />);
    const nameInput = screen.getByLabelText(/Name/i);
    expect(nameInput).toHaveAttribute('type', 'text');
    expect(nameInput).toHaveAccessibleName(/Name/i);

    const submitButton = screen.getByRole('button', { name: /Submit/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('displays a custom message when no data is available', async () => {
    (fetchData as jest.Mock).mockResolvedValueOnce({ data: null });
    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('handles edge case: very long input string', () => {
    render(<CoreFunctionality />);
    const longString = 'a'.repeat(200);
    const inputElement = screen.getByLabelText(/Name/i);
    fireEvent.change(inputElement, { target: { value: longString } });
    expect(inputElement.value).toBe(longString);
  });

  it('handles edge case: special characters in input', () => {
    render(<CoreFunctionality />);
    const specialChars = '!@#$%^&*()_+=-`~[]\{}|;\':",./<>?';
    const inputElement = screen.getByLabelText(/Name/i);
    fireEvent.change(inputElement, { target: { value: specialChars } });
    expect(inputElement.value).toBe(specialChars);
  });

  it('submits the form with userEvent', async () => {
    (submitForm as jest.Mock).mockResolvedValueOnce({ success: true, message: 'Form submitted successfully' });
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/Name/i);
    await userEvent.type(inputElement, 'Test Name');
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Form submitted successfully/i)).toBeInTheDocument();
    });
    expect(submitForm).toHaveBeenCalledTimes(1);
  });

  it('displays a specific error message when submitForm returns an error', async () => {
    (submitForm as jest.Mock).mockResolvedValueOnce({ success: false, message: 'Specific error message' });
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/Name/i);
    await userEvent.type(inputElement, 'Test Name');
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Specific error message/i)).toBeInTheDocument();
    });
  });

  it('renders with a specific aria-label on the form', () => {
    render(<CoreFunctionality />);
    const formElement = screen.getByRole('form');
    expect(formElement).toHaveAttribute('aria-label', 'Core Functionality Form');
  });
});