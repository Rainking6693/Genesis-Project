import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust the import path as needed
import { useDesignArchitectureData } from '../hooks/useDesignArchitectureData'; // Adjust the import path as needed
import { mockDesignArchitectureData } from './mocks/mockDesignArchitectureData'; // Adjust the import path as needed
import '@testing-library/jest-dom';

// Mock the custom hook
jest.mock('../hooks/useDesignArchitectureData', () => ({
  useDesignArchitectureData: jest.fn(),
}));

// Mock external dependencies (e.g., API calls, other components)
const mockUpdateDesignArchitecture = jest.fn();
const mockDeleteDesignArchitecture = jest.fn();
const mockCreateDesignArchitecture = jest.fn();

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: mockDesignArchitectureData,
      isLoading: false,
      error: null,
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: mockCreateDesignArchitecture,
    });
  });

  it('renders the component with data', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText('Design Architecture')).toBeInTheDocument();
    expect(screen.getByText('Architecture 1')).toBeInTheDocument(); // Assuming mock data has this
  });

  it('renders loading state', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: mockCreateDesignArchitecture,
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to fetch data'),
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: mockCreateDesignArchitecture,
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
  });

  it('calls updateDesignArchitecture when the update button is clicked', async () => {
    render(<DesignArchitecture />);
    const updateButton = screen.getByText('Update'); // Assuming your button text is 'Update'
    fireEvent.click(updateButton);
    await waitFor(() => {
      expect(mockUpdateDesignArchitecture).toHaveBeenCalledTimes(1);
    });
  });

  it('calls deleteDesignArchitecture when the delete button is clicked', async () => {
    render(<DesignArchitecture />);
    const deleteButton = screen.getByText('Delete'); // Assuming your button text is 'Delete'
    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(mockDeleteDesignArchitecture).toHaveBeenCalledTimes(1);
    });
  });

  it('calls createDesignArchitecture when the create button is clicked', async () => {
    render(<DesignArchitecture />);
    const createButton = screen.getByText('Create'); // Assuming your button text is 'Create'
    fireEvent.click(createButton);
    await waitFor(() => {
      expect(mockCreateDesignArchitecture).toHaveBeenCalledTimes(1);
    });
  });

  it('handles edge case: empty data array', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: mockCreateDesignArchitecture,
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('No design architectures found.')).toBeInTheDocument();
  });

  it('handles edge case: null data', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: mockCreateDesignArchitecture,
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('No design architectures found.')).toBeInTheDocument();
  });

  it('should have accessible labels for all interactive elements', () => {
    render(<DesignArchitecture />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAccessibleName();
    });
  });

  it('should have appropriate ARIA attributes for accessibility', () => {
    render(<DesignArchitecture />);
    const heading = screen.getByText('Design Architecture');
    expect(heading).toHaveAttribute('aria-level');
  });

  it('updates the input field value and calls createDesignArchitecture on form submission', async () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: mockDesignArchitectureData,
      isLoading: false,
      error: null,
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: mockCreateDesignArchitecture,
    });

    render(<DesignArchitecture />);

    const inputElement = screen.getByPlaceholderText('Enter new architecture name');
    const submitButton = screen.getByText('Create');

    await userEvent.type(inputElement, 'New Architecture');
    expect(inputElement.value).toBe('New Architecture');

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateDesignArchitecture).toHaveBeenCalledTimes(1);
    });
  });

  it('displays a confirmation message after successful creation', async () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: mockDesignArchitectureData,
      isLoading: false,
      error: null,
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: mockCreateDesignArchitecture,
    });

    render(<DesignArchitecture />);

    const inputElement = screen.getByPlaceholderText('Enter new architecture name');
    const submitButton = screen.getByText('Create');

    await userEvent.type(inputElement, 'New Architecture');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('Architecture created successfully!')).toBeInTheDocument();
    });
  });

  it('displays an error message if createDesignArchitecture fails', async () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: mockDesignArchitectureData,
      isLoading: false,
      error: null,
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: jest.fn(() => Promise.reject(new Error('Failed to create architecture'))),
    });

    render(<DesignArchitecture />);

    const inputElement = screen.getByPlaceholderText('Enter new architecture name');
    const submitButton = screen.getByText('Create');

    await userEvent.type(inputElement, 'New Architecture');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('Error creating architecture: Failed to create architecture')).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust the import path as needed
import { useDesignArchitectureData } from '../hooks/useDesignArchitectureData'; // Adjust the import path as needed
import { mockDesignArchitectureData } from './mocks/mockDesignArchitectureData'; // Adjust the import path as needed
import '@testing-library/jest-dom';

// Mock the custom hook
jest.mock('../hooks/useDesignArchitectureData', () => ({
  useDesignArchitectureData: jest.fn(),
}));

// Mock external dependencies (e.g., API calls, other components)
const mockUpdateDesignArchitecture = jest.fn();
const mockDeleteDesignArchitecture = jest.fn();
const mockCreateDesignArchitecture = jest.fn();

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: mockDesignArchitectureData,
      isLoading: false,
      error: null,
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: mockCreateDesignArchitecture,
    });
  });

  it('renders the component with data', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText('Design Architecture')).toBeInTheDocument();
    expect(screen.getByText('Architecture 1')).toBeInTheDocument(); // Assuming mock data has this
  });

  it('renders loading state', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: mockCreateDesignArchitecture,
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to fetch data'),
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: mockCreateDesignArchitecture,
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
  });

  it('calls updateDesignArchitecture when the update button is clicked', async () => {
    render(<DesignArchitecture />);
    const updateButton = screen.getByText('Update'); // Assuming your button text is 'Update'
    fireEvent.click(updateButton);
    await waitFor(() => {
      expect(mockUpdateDesignArchitecture).toHaveBeenCalledTimes(1);
    });
  });

  it('calls deleteDesignArchitecture when the delete button is clicked', async () => {
    render(<DesignArchitecture />);
    const deleteButton = screen.getByText('Delete'); // Assuming your button text is 'Delete'
    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(mockDeleteDesignArchitecture).toHaveBeenCalledTimes(1);
    });
  });

  it('calls createDesignArchitecture when the create button is clicked', async () => {
    render(<DesignArchitecture />);
    const createButton = screen.getByText('Create'); // Assuming your button text is 'Create'
    fireEvent.click(createButton);
    await waitFor(() => {
      expect(mockCreateDesignArchitecture).toHaveBeenCalledTimes(1);
    });
  });

  it('handles edge case: empty data array', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: mockCreateDesignArchitecture,
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('No design architectures found.')).toBeInTheDocument();
  });

  it('handles edge case: null data', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: mockCreateDesignArchitecture,
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('No design architectures found.')).toBeInTheDocument();
  });

  it('should have accessible labels for all interactive elements', () => {
    render(<DesignArchitecture />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAccessibleName();
    });
  });

  it('should have appropriate ARIA attributes for accessibility', () => {
    render(<DesignArchitecture />);
    const heading = screen.getByText('Design Architecture');
    expect(heading).toHaveAttribute('aria-level');
  });

  it('updates the input field value and calls createDesignArchitecture on form submission', async () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: mockDesignArchitectureData,
      isLoading: false,
      error: null,
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: mockCreateDesignArchitecture,
    });

    render(<DesignArchitecture />);

    const inputElement = screen.getByPlaceholderText('Enter new architecture name');
    const submitButton = screen.getByText('Create');

    await userEvent.type(inputElement, 'New Architecture');
    expect(inputElement.value).toBe('New Architecture');

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateDesignArchitecture).toHaveBeenCalledTimes(1);
    });
  });

  it('displays a confirmation message after successful creation', async () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: mockDesignArchitectureData,
      isLoading: false,
      error: null,
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: mockCreateDesignArchitecture,
    });

    render(<DesignArchitecture />);

    const inputElement = screen.getByPlaceholderText('Enter new architecture name');
    const submitButton = screen.getByText('Create');

    await userEvent.type(inputElement, 'New Architecture');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('Architecture created successfully!')).toBeInTheDocument();
    });
  });

  it('displays an error message if createDesignArchitecture fails', async () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      data: mockDesignArchitectureData,
      isLoading: false,
      error: null,
      updateDesignArchitecture: mockUpdateDesignArchitecture,
      deleteDesignArchitecture: mockDeleteDesignArchitecture,
      createDesignArchitecture: jest.fn(() => Promise.reject(new Error('Failed to create architecture'))),
    });

    render(<DesignArchitecture />);

    const inputElement = screen.getByPlaceholderText('Enter new architecture name');
    const submitButton = screen.getByText('Create');

    await userEvent.type(inputElement, 'New Architecture');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('Error creating architecture: Failed to create architecture')).toBeInTheDocument();
    });
  });
});