import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Replace with the actual path
import * as api from '../api/designArchitectureApi'; // Replace with the actual path
import { useDesignArchitectureData } from '../hooks/useDesignArchitectureData'; // Replace with the actual path

jest.mock('../api/designArchitectureApi');
jest.mock('../hooks/useDesignArchitectureData');

const mockDesignArchitectureData = {
  data: {
    architectureDiagram: 'mock-diagram-url',
    components: [
      { id: '1', name: 'Component A', description: 'Description A' },
      { id: '2', name: 'Component B', description: 'Description B' },
    ],
  },
  isLoading: false,
  error: null,
  refetch: jest.fn(),
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDesignArchitectureData as jest.Mock).mockReturnValue(mockDesignArchitectureData);
  });

  it('renders the component without crashing', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText('Design Architecture')).toBeInTheDocument();
  });

  it('displays loading state when data is loading', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockDesignArchitectureData,
      isLoading: true,
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error message when there is an error', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockDesignArchitectureData,
      error: new Error('Failed to fetch data'),
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
  });

  it('renders the architecture diagram', () => {
    render(<DesignArchitecture />);
    const imgElement = screen.getByAltText('Architecture Diagram');
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute('src', 'mock-diagram-url');
  });

  it('renders the component list', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText('Component A')).toBeInTheDocument();
    expect(screen.getByText('Description A')).toBeInTheDocument();
    expect(screen.getByText('Component B')).toBeInTheDocument();
    expect(screen.getByText('Description B')).toBeInTheDocument();
  });

  it('calls refetch on refresh button click', async () => {
    render(<DesignArchitecture />);
    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    fireEvent.click(refreshButton);
    await waitFor(() => {
      expect(mockDesignArchitectureData.refetch).toHaveBeenCalledTimes(1);
    });
  });

  it('allows adding a new component', async () => {
    const mockCreateComponent = jest.fn().mockResolvedValue({ id: '3', name: 'Component C', description: 'Description C' });
    (api.createComponent as jest.Mock).mockImplementation(mockCreateComponent);

    render(<DesignArchitecture />);

    const addButton = screen.getByRole('button', { name: 'Add Component' });
    fireEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name');
    const descriptionInput = screen.getByLabelText('Description');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    userEvent.type(nameInput, 'Component C');
    userEvent.type(descriptionInput, 'Description C');

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateComponent).toHaveBeenCalledWith({ name: 'Component C', description: 'Description C' });
    });

    // Simulate successful data update and re-render
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockDesignArchitectureData,
      data: {
        ...mockDesignArchitectureData.data,
        components: [
          ...mockDesignArchitectureData.data.components,
          { id: '3', name: 'Component C', description: 'Description C' },
        ],
      },
    });

    // Re-render the component to reflect the updated data
    render(<DesignArchitecture />);
    expect(screen.getByText('Component C')).toBeInTheDocument();
    expect(screen.getByText('Description C')).toBeInTheDocument();
  });

  it('handles errors when adding a new component', async () => {
    const mockCreateComponent = jest.fn().mockRejectedValue(new Error('Failed to create component'));
    (api.createComponent as jest.Mock).mockImplementation(mockCreateComponent);

    render(<DesignArchitecture />);

    const addButton = screen.getByRole('button', { name: 'Add Component' });
    fireEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name');
    const descriptionInput = screen.getByLabelText('Description');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    userEvent.type(nameInput, 'Component C');
    userEvent.type(descriptionInput, 'Description C');

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateComponent).toHaveBeenCalledWith({ name: 'Component C', description: 'Description C' });
    });

    await waitFor(() => {
      expect(screen.getByText('Error creating component: Failed to create component')).toBeInTheDocument();
    });
  });

  it('allows deleting a component', async () => {
    const mockDeleteComponent = jest.fn().mockResolvedValue(undefined);
    (api.deleteComponent as jest.Mock).mockImplementation(mockDeleteComponent);

    render(<DesignArchitecture />);

    const deleteButton = screen.getByRole('button', { name: 'Delete Component A' });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteComponent).toHaveBeenCalledWith('1');
    });

    // Simulate successful data update and re-render
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockDesignArchitectureData,
      data: {
        ...mockDesignArchitectureData.data,
        components: [
          { id: '2', name: 'Component B', description: 'Description B' },
        ],
      },
    });

    // Re-render the component to reflect the updated data
    render(<DesignArchitecture />);
    expect(screen.queryByText('Component A')).not.toBeInTheDocument();
  });

  it('handles errors when deleting a component', async () => {
    const mockDeleteComponent = jest.fn().mockRejectedValue(new Error('Failed to delete component'));
    (api.deleteComponent as jest.Mock).mockImplementation(mockDeleteComponent);

    render(<DesignArchitecture />);

    const deleteButton = screen.getByRole('button', { name: 'Delete Component A' });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteComponent).toHaveBeenCalledWith('1');
    });

    await waitFor(() => {
      expect(screen.getByText('Error deleting component: Failed to delete component')).toBeInTheDocument();
    });
  });

  it('is accessible', async () => {
    const { container } = render(<DesignArchitecture />);
    await expect(container).toBeAccessible();
  });

  it('has proper aria labels', () => {
    render(<DesignArchitecture />);
    expect(screen.getByRole('button', { name: 'Refresh' })).toHaveAttribute('aria-label', 'Refresh Data');
    expect(screen.getByRole('button', { name: 'Add Component' })).toHaveAttribute('aria-label', 'Add New Component');
  });

  it('displays a message when there are no components', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockDesignArchitectureData,
      data: {
        ...mockDesignArchitectureData.data,
        components: [],
      },
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('No components available.')).toBeInTheDocument();
  });

  it('clears the form after successful submission', async () => {
    const mockCreateComponent = jest.fn().mockResolvedValue({ id: '3', name: 'Component C', description: 'Description C' });
    (api.createComponent as jest.Mock).mockImplementation(mockCreateComponent);

    render(<DesignArchitecture />);

    const addButton = screen.getByRole('button', { name: 'Add Component' });
    fireEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name');
    const descriptionInput = screen.getByLabelText('Description');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    userEvent.type(nameInput, 'Component C');
    userEvent.type(descriptionInput, 'Description C');

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateComponent).toHaveBeenCalledWith({ name: 'Component C', description: 'Description C' });
    });

    await waitFor(() => {
      expect(nameInput.value).toBe('');
      expect(descriptionInput.value).toBe('');
    });
  });

  it('disables the submit button while creating a component', async () => {
    const mockCreateComponent = jest.fn().mockResolvedValue({ id: '3', name: 'Component C', description: 'Description C' });
    (api.createComponent as jest.Mock).mockImplementation(mockCreateComponent);

    render(<DesignArchitecture />);

    const addButton = screen.getByRole('button', { name: 'Add Component' });
    fireEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name');
    const descriptionInput = screen.getByLabelText('Description');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    userEvent.type(nameInput, 'Component C');
    userEvent.type(descriptionInput, 'Description C');

    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(mockCreateComponent).toHaveBeenCalledWith({ name: 'Component C', description: 'Description C' });
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Replace with the actual path
import * as api from '../api/designArchitectureApi'; // Replace with the actual path
import { useDesignArchitectureData } from '../hooks/useDesignArchitectureData'; // Replace with the actual path

jest.mock('../api/designArchitectureApi');
jest.mock('../hooks/useDesignArchitectureData');

const mockDesignArchitectureData = {
  data: {
    architectureDiagram: 'mock-diagram-url',
    components: [
      { id: '1', name: 'Component A', description: 'Description A' },
      { id: '2', name: 'Component B', description: 'Description B' },
    ],
  },
  isLoading: false,
  error: null,
  refetch: jest.fn(),
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDesignArchitectureData as jest.Mock).mockReturnValue(mockDesignArchitectureData);
  });

  it('renders the component without crashing', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText('Design Architecture')).toBeInTheDocument();
  });

  it('displays loading state when data is loading', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockDesignArchitectureData,
      isLoading: true,
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error message when there is an error', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockDesignArchitectureData,
      error: new Error('Failed to fetch data'),
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
  });

  it('renders the architecture diagram', () => {
    render(<DesignArchitecture />);
    const imgElement = screen.getByAltText('Architecture Diagram');
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute('src', 'mock-diagram-url');
  });

  it('renders the component list', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText('Component A')).toBeInTheDocument();
    expect(screen.getByText('Description A')).toBeInTheDocument();
    expect(screen.getByText('Component B')).toBeInTheDocument();
    expect(screen.getByText('Description B')).toBeInTheDocument();
  });

  it('calls refetch on refresh button click', async () => {
    render(<DesignArchitecture />);
    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    fireEvent.click(refreshButton);
    await waitFor(() => {
      expect(mockDesignArchitectureData.refetch).toHaveBeenCalledTimes(1);
    });
  });

  it('allows adding a new component', async () => {
    const mockCreateComponent = jest.fn().mockResolvedValue({ id: '3', name: 'Component C', description: 'Description C' });
    (api.createComponent as jest.Mock).mockImplementation(mockCreateComponent);

    render(<DesignArchitecture />);

    const addButton = screen.getByRole('button', { name: 'Add Component' });
    fireEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name');
    const descriptionInput = screen.getByLabelText('Description');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    userEvent.type(nameInput, 'Component C');
    userEvent.type(descriptionInput, 'Description C');

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateComponent).toHaveBeenCalledWith({ name: 'Component C', description: 'Description C' });
    });

    // Simulate successful data update and re-render
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockDesignArchitectureData,
      data: {
        ...mockDesignArchitectureData.data,
        components: [
          ...mockDesignArchitectureData.data.components,
          { id: '3', name: 'Component C', description: 'Description C' },
        ],
      },
    });

    // Re-render the component to reflect the updated data
    render(<DesignArchitecture />);
    expect(screen.getByText('Component C')).toBeInTheDocument();
    expect(screen.getByText('Description C')).toBeInTheDocument();
  });

  it('handles errors when adding a new component', async () => {
    const mockCreateComponent = jest.fn().mockRejectedValue(new Error('Failed to create component'));
    (api.createComponent as jest.Mock).mockImplementation(mockCreateComponent);

    render(<DesignArchitecture />);

    const addButton = screen.getByRole('button', { name: 'Add Component' });
    fireEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name');
    const descriptionInput = screen.getByLabelText('Description');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    userEvent.type(nameInput, 'Component C');
    userEvent.type(descriptionInput, 'Description C');

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateComponent).toHaveBeenCalledWith({ name: 'Component C', description: 'Description C' });
    });

    await waitFor(() => {
      expect(screen.getByText('Error creating component: Failed to create component')).toBeInTheDocument();
    });
  });

  it('allows deleting a component', async () => {
    const mockDeleteComponent = jest.fn().mockResolvedValue(undefined);
    (api.deleteComponent as jest.Mock).mockImplementation(mockDeleteComponent);

    render(<DesignArchitecture />);

    const deleteButton = screen.getByRole('button', { name: 'Delete Component A' });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteComponent).toHaveBeenCalledWith('1');
    });

    // Simulate successful data update and re-render
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockDesignArchitectureData,
      data: {
        ...mockDesignArchitectureData.data,
        components: [
          { id: '2', name: 'Component B', description: 'Description B' },
        ],
      },
    });

    // Re-render the component to reflect the updated data
    render(<DesignArchitecture />);
    expect(screen.queryByText('Component A')).not.toBeInTheDocument();
  });

  it('handles errors when deleting a component', async () => {
    const mockDeleteComponent = jest.fn().mockRejectedValue(new Error('Failed to delete component'));
    (api.deleteComponent as jest.Mock).mockImplementation(mockDeleteComponent);

    render(<DesignArchitecture />);

    const deleteButton = screen.getByRole('button', { name: 'Delete Component A' });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteComponent).toHaveBeenCalledWith('1');
    });

    await waitFor(() => {
      expect(screen.getByText('Error deleting component: Failed to delete component')).toBeInTheDocument();
    });
  });

  it('is accessible', async () => {
    const { container } = render(<DesignArchitecture />);
    await expect(container).toBeAccessible();
  });

  it('has proper aria labels', () => {
    render(<DesignArchitecture />);
    expect(screen.getByRole('button', { name: 'Refresh' })).toHaveAttribute('aria-label', 'Refresh Data');
    expect(screen.getByRole('button', { name: 'Add Component' })).toHaveAttribute('aria-label', 'Add New Component');
  });

  it('displays a message when there are no components', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockDesignArchitectureData,
      data: {
        ...mockDesignArchitectureData.data,
        components: [],
      },
    });
    render(<DesignArchitecture />);
    expect(screen.getByText('No components available.')).toBeInTheDocument();
  });

  it('clears the form after successful submission', async () => {
    const mockCreateComponent = jest.fn().mockResolvedValue({ id: '3', name: 'Component C', description: 'Description C' });
    (api.createComponent as jest.Mock).mockImplementation(mockCreateComponent);

    render(<DesignArchitecture />);

    const addButton = screen.getByRole('button', { name: 'Add Component' });
    fireEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name');
    const descriptionInput = screen.getByLabelText('Description');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    userEvent.type(nameInput, 'Component C');
    userEvent.type(descriptionInput, 'Description C');

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateComponent).toHaveBeenCalledWith({ name: 'Component C', description: 'Description C' });
    });

    await waitFor(() => {
      expect(nameInput.value).toBe('');
      expect(descriptionInput.value).toBe('');
    });
  });

  it('disables the submit button while creating a component', async () => {
    const mockCreateComponent = jest.fn().mockResolvedValue({ id: '3', name: 'Component C', description: 'Description C' });
    (api.createComponent as jest.Mock).mockImplementation(mockCreateComponent);

    render(<DesignArchitecture />);

    const addButton = screen.getByRole('button', { name: 'Add Component' });
    fireEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name');
    const descriptionInput = screen.getByLabelText('Description');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    userEvent.type(nameInput, 'Component C');
    userEvent.type(descriptionInput, 'Description C');

    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(mockCreateComponent).toHaveBeenCalledWith({ name: 'Component C', description: 'Description C' });
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});