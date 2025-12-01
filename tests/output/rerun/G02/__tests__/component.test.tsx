import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoreFunctionality from '../components/CoreFunctionality'; // Adjust path as needed

// Mock external dependencies (e.g., API calls, context providers)
jest.mock('../utils/api', () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: 'mocked data' })),
  submitForm: jest.fn(() => Promise.resolve({ success: true })),
}));

const mockUseContext = jest.fn();
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: () => mockUseContext(),
}));

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContext.mockReturnValue({ theme: 'light' });
  });

  it('renders without crashing', () => {
    render(<CoreFunctionality />);
  });

  it('displays loading state initially', () => {
    render(<CoreFunctionality />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays data after loading', async () => {
    const { fetchData } = require('../utils/api');
    fetchData.mockResolvedValueOnce({ data: 'Test Data' });

    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/test data/i)).toBeInTheDocument();
    });
  });

  it('displays error message when data fetching fails', async () => {
    const { fetchData } = require('../utils/api');
    fetchData.mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('updates input field value on change', () => {
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });
    expect(inputElement.value).toBe('Test Name');
  });

  it('submits the form successfully', async () => {
    const { submitForm } = require('../utils/api');
    submitForm.mockResolvedValueOnce({ success: true });

    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitForm).toHaveBeenCalledWith({ name: 'Test Name' });
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });

  it('displays error message when form submission fails', async () => {
    const { submitForm } = require('../utils/api');
    submitForm.mockRejectedValueOnce(new Error('Submission failed'));

    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
    });
  });

  it('disables submit button while submitting', async () => {
    const { submitForm } = require('../utils/api');
    submitForm.mockResolvedValueOnce({ success: true });

    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
  });

  it('handles empty input field submission', async () => {
    render(<CoreFunctionality />);
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('renders with correct aria attributes', () => {
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/name/i);
    expect(inputElement).toHaveAttribute('aria-required', 'true');
  });

  it('updates state correctly on multiple input changes', () => {
    render(<CoreFunctionality />);
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });

    expect(nameInput.value).toBe('John Doe');
    expect(emailInput.value).toBe('john.doe@example.com');
  });

  it('resets the form after successful submission', async () => {
    const { submitForm } = require('../utils/api');
    submitForm.mockResolvedValueOnce({ success: true });

    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(inputElement.value).toBe('');
    });
  });

  it('renders different content based on a prop', () => {
    render(<CoreFunctionality showAlternativeContent={true} />);
    expect(screen.getByText(/alternative content/i)).toBeInTheDocument();

    render(<CoreFunctionality showAlternativeContent={false} />);
    expect(screen.queryByText(/alternative content/i)).not.toBeInTheDocument();
  });

  it('calls a callback function when a button is clicked', () => {
    const mockCallback = jest.fn();
    render(<CoreFunctionality onButtonClick={mockCallback} />);
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('renders with a specific theme from context', () => {
    mockUseContext.mockReturnValue({ theme: 'dark' });
    render(<CoreFunctionality />);
    expect(screen.getByTestId('core-functionality-container')).toHaveClass('dark');

    mockUseContext.mockReturnValue({ theme: 'light' });
    render(<CoreFunctionality />);
    expect(screen.getByTestId('core-functionality-container')).toHaveClass('light');
  });

  it('handles edge case of very long input', async () => {
    const { submitForm } = require('../utils/api');
    submitForm.mockResolvedValueOnce({ success: true });

    render(<CoreFunctionality />);
    const longName = 'a'.repeat(200);
    const inputElement = screen.getByLabelText(/name/i);
    fireEvent.change(inputElement, { target: { value: longName } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitForm).toHaveBeenCalledWith({ name: longName });
    });
  });

  it('renders correctly when no data is returned from API', async () => {
    const { fetchData } = require('../utils/api');
    fetchData.mockResolvedValueOnce(null);

    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.queryByText(/data/i)).not.toBeInTheDocument();
    });
  });

  it('handles multiple form submissions', async () => {
    const { submitForm } = require('../utils/api');
    submitForm.mockResolvedValue({ success: true });

    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/name/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    fireEvent.change(inputElement, { target: { value: 'First Submission' } });
    fireEvent.click(submitButton);
    await waitFor(() => expect(submitForm).toHaveBeenCalledTimes(1));

    fireEvent.change(inputElement, { target: { value: 'Second Submission' } });
    fireEvent.click(submitButton);
    await waitFor(() => expect(submitForm).toHaveBeenCalledTimes(2));
  });

  it('renders a custom error message when provided', async () => {
    const { fetchData } = require('../utils/api');
    fetchData.mockRejectedValueOnce(new Error('Custom Error'));

    render(<CoreFunctionality errorMessage="Custom Error Message" />);

    await waitFor(() => {
      expect(screen.getByText(/custom error message/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoreFunctionality from '../components/CoreFunctionality'; // Adjust path as needed

// Mock external dependencies (e.g., API calls, context providers)
jest.mock('../utils/api', () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: 'mocked data' })),
  submitForm: jest.fn(() => Promise.resolve({ success: true })),
}));

const mockUseContext = jest.fn();
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: () => mockUseContext(),
}));

describe('CoreFunctionality Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContext.mockReturnValue({ theme: 'light' });
  });

  it('renders without crashing', () => {
    render(<CoreFunctionality />);
  });

  it('displays loading state initially', () => {
    render(<CoreFunctionality />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays data after loading', async () => {
    const { fetchData } = require('../utils/api');
    fetchData.mockResolvedValueOnce({ data: 'Test Data' });

    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/test data/i)).toBeInTheDocument();
    });
  });

  it('displays error message when data fetching fails', async () => {
    const { fetchData } = require('../utils/api');
    fetchData.mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('updates input field value on change', () => {
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });
    expect(inputElement.value).toBe('Test Name');
  });

  it('submits the form successfully', async () => {
    const { submitForm } = require('../utils/api');
    submitForm.mockResolvedValueOnce({ success: true });

    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitForm).toHaveBeenCalledWith({ name: 'Test Name' });
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });

  it('displays error message when form submission fails', async () => {
    const { submitForm } = require('../utils/api');
    submitForm.mockRejectedValueOnce(new Error('Submission failed'));

    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
    });
  });

  it('disables submit button while submitting', async () => {
    const { submitForm } = require('../utils/api');
    submitForm.mockResolvedValueOnce({ success: true });

    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
  });

  it('handles empty input field submission', async () => {
    render(<CoreFunctionality />);
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('renders with correct aria attributes', () => {
    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/name/i);
    expect(inputElement).toHaveAttribute('aria-required', 'true');
  });

  it('updates state correctly on multiple input changes', () => {
    render(<CoreFunctionality />);
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });

    expect(nameInput.value).toBe('John Doe');
    expect(emailInput.value).toBe('john.doe@example.com');
  });

  it('resets the form after successful submission', async () => {
    const { submitForm } = require('../utils/api');
    submitForm.mockResolvedValueOnce({ success: true });

    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/name/i);
    fireEvent.change(inputElement, { target: { value: 'Test Name' } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(inputElement.value).toBe('');
    });
  });

  it('renders different content based on a prop', () => {
    render(<CoreFunctionality showAlternativeContent={true} />);
    expect(screen.getByText(/alternative content/i)).toBeInTheDocument();

    render(<CoreFunctionality showAlternativeContent={false} />);
    expect(screen.queryByText(/alternative content/i)).not.toBeInTheDocument();
  });

  it('calls a callback function when a button is clicked', () => {
    const mockCallback = jest.fn();
    render(<CoreFunctionality onButtonClick={mockCallback} />);
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('renders with a specific theme from context', () => {
    mockUseContext.mockReturnValue({ theme: 'dark' });
    render(<CoreFunctionality />);
    expect(screen.getByTestId('core-functionality-container')).toHaveClass('dark');

    mockUseContext.mockReturnValue({ theme: 'light' });
    render(<CoreFunctionality />);
    expect(screen.getByTestId('core-functionality-container')).toHaveClass('light');
  });

  it('handles edge case of very long input', async () => {
    const { submitForm } = require('../utils/api');
    submitForm.mockResolvedValueOnce({ success: true });

    render(<CoreFunctionality />);
    const longName = 'a'.repeat(200);
    const inputElement = screen.getByLabelText(/name/i);
    fireEvent.change(inputElement, { target: { value: longName } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitForm).toHaveBeenCalledWith({ name: longName });
    });
  });

  it('renders correctly when no data is returned from API', async () => {
    const { fetchData } = require('../utils/api');
    fetchData.mockResolvedValueOnce(null);

    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.queryByText(/data/i)).not.toBeInTheDocument();
    });
  });

  it('handles multiple form submissions', async () => {
    const { submitForm } = require('../utils/api');
    submitForm.mockResolvedValue({ success: true });

    render(<CoreFunctionality />);
    const inputElement = screen.getByLabelText(/name/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    fireEvent.change(inputElement, { target: { value: 'First Submission' } });
    fireEvent.click(submitButton);
    await waitFor(() => expect(submitForm).toHaveBeenCalledTimes(1));

    fireEvent.change(inputElement, { target: { value: 'Second Submission' } });
    fireEvent.click(submitButton);
    await waitFor(() => expect(submitForm).toHaveBeenCalledTimes(2));
  });

  it('renders a custom error message when provided', async () => {
    const { fetchData } = require('../utils/api');
    fetchData.mockRejectedValueOnce(new Error('Custom Error'));

    render(<CoreFunctionality errorMessage="Custom Error Message" />);

    await waitFor(() => {
      expect(screen.getByText(/custom error message/i)).toBeInTheDocument();
    });
  });
});