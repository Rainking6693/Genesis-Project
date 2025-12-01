import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust path as needed
import * as api from '../api/designArchitectureApi'; // Mock API
import { useDesignArchitectureData } from '../hooks/useDesignArchitectureData'; // Mock hook
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

jest.mock('../api/designArchitectureApi');
jest.mock('../hooks/useDesignArchitectureData');

describe('DesignArchitecture Component', () => {
  const mockData = {
    architectures: [
      { id: '1', name: 'Architecture 1', description: 'Description 1' },
      { id: '2', name: 'Architecture 2', description: 'Description 2' },
    ],
    isLoading: false,
    error: null,
    addArchitecture: jest.fn(),
    updateArchitecture: jest.fn(),
    deleteArchitecture: jest.fn(),
  };

  beforeEach(() => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue(mockData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText('Design Architectures')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({ ...mockData, isLoading: true });
    render(<DesignArchitecture />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error message', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({ ...mockData, error: 'An error occurred' });
    render(<DesignArchitecture />);
    expect(screen.getByText('Error: An error occurred')).toBeInTheDocument();
  });

  it('renders architecture list', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText('Architecture 1')).toBeInTheDocument();
    expect(screen.getByText('Architecture 2')).toBeInTheDocument();
  });

  it('opens and closes the add architecture modal', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add Architecture' });
    userEvent.click(addButton);
    expect(screen.getByText('Add New Architecture')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Close' });
    userEvent.click(closeButton);
    await waitFor(() => {
      expect(screen.queryByText('Add New Architecture')).not.toBeInTheDocument();
    });
  });

  it('adds a new architecture', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add Architecture' });
    userEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Add' });

    userEvent.type(nameInput, 'New Architecture');
    userEvent.type(descriptionInput, 'New Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockData.addArchitecture).toHaveBeenCalledWith({
        name: 'New Architecture',
        description: 'New Description',
      });
    });
  });

  it('displays validation errors when adding architecture with empty fields', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add Architecture' });
    userEvent.click(addButton);

    const submitButton = screen.getByRole('button', { name: 'Add' });
    userEvent.click(submitButton);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
  });

  it('opens and closes the edit architecture modal', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);
    expect(screen.getByText('Edit Architecture')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Close' });
    userEvent.click(closeButton);
    await waitFor(() => {
      expect(screen.queryByText('Edit Architecture')).not.toBeInTheDocument();
    });
  });

  it('updates an existing architecture', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Update' });

    userEvent.clear(nameInput);
    userEvent.type(nameInput, 'Updated Architecture');
    userEvent.clear(descriptionInput);
    userEvent.type(descriptionInput, 'Updated Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockData.updateArchitecture).toHaveBeenCalledWith({
        id: '1',
        name: 'Updated Architecture',
        description: 'Updated Description',
      });
    });
  });

  it('displays validation errors when updating architecture with empty fields', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Update' });

    userEvent.clear(nameInput);
    userEvent.clear(descriptionInput);
    userEvent.click(submitButton);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
  });

  it('deletes an architecture', async () => {
    render(<DesignArchitecture />);
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockData.deleteArchitecture).toHaveBeenCalledWith('1');
    });
  });

  it('handles API error when adding architecture', async () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockData,
      addArchitecture: jest.fn().mockRejectedValue(new Error('API Error')),
    });

    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add Architecture' });
    userEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Add' });

    userEvent.type(nameInput, 'New Architecture');
    userEvent.type(descriptionInput, 'New Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error adding architecture.')).toBeInTheDocument();
    });
  });

  it('handles API error when updating architecture', async () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockData,
      updateArchitecture: jest.fn().mockRejectedValue(new Error('API Error')),
    });

    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Update' });

    userEvent.clear(nameInput);
    userEvent.type(nameInput, 'Updated Architecture');
    userEvent.clear(descriptionInput);
    userEvent.type(descriptionInput, 'Updated Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error updating architecture.')).toBeInTheDocument();
    });
  });

  it('handles API error when deleting architecture', async () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockData,
      deleteArchitecture: jest.fn().mockRejectedValue(new Error('API Error')),
    });

    render(<DesignArchitecture />);
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Error deleting architecture.')).toBeInTheDocument();
    });
  });

  it('should pass accessibility tests', async () => {
    const { container } = render(<DesignArchitecture />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible labels for input fields', () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add Architecture' });
    userEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');

    expect(nameInput).toBeInTheDocument();
    expect(descriptionInput).toBeInTheDocument();
  });

  it('should focus on the first input field when the add modal is opened', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add Architecture' });
    userEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name:');
    await waitFor(() => {
      expect(nameInput).toHaveFocus();
    });
  });

  it('should focus on the first input field when the edit modal is opened', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const nameInput = screen.getByLabelText('Name:');
    await waitFor(() => {
      expect(nameInput).toHaveFocus();
    });
  });

  it('should close the modal when pressing the Escape key', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add Architecture' });
    userEvent.click(addButton);

    userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('Add New Architecture')).not.toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust path as needed
import * as api from '../api/designArchitectureApi'; // Mock API
import { useDesignArchitectureData } from '../hooks/useDesignArchitectureData'; // Mock hook
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

jest.mock('../api/designArchitectureApi');
jest.mock('../hooks/useDesignArchitectureData');

describe('DesignArchitecture Component', () => {
  const mockData = {
    architectures: [
      { id: '1', name: 'Architecture 1', description: 'Description 1' },
      { id: '2', name: 'Architecture 2', description: 'Description 2' },
    ],
    isLoading: false,
    error: null,
    addArchitecture: jest.fn(),
    updateArchitecture: jest.fn(),
    deleteArchitecture: jest.fn(),
  };

  beforeEach(() => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue(mockData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText('Design Architectures')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({ ...mockData, isLoading: true });
    render(<DesignArchitecture />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error message', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({ ...mockData, error: 'An error occurred' });
    render(<DesignArchitecture />);
    expect(screen.getByText('Error: An error occurred')).toBeInTheDocument();
  });

  it('renders architecture list', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText('Architecture 1')).toBeInTheDocument();
    expect(screen.getByText('Architecture 2')).toBeInTheDocument();
  });

  it('opens and closes the add architecture modal', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add Architecture' });
    userEvent.click(addButton);
    expect(screen.getByText('Add New Architecture')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Close' });
    userEvent.click(closeButton);
    await waitFor(() => {
      expect(screen.queryByText('Add New Architecture')).not.toBeInTheDocument();
    });
  });

  it('adds a new architecture', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add Architecture' });
    userEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Add' });

    userEvent.type(nameInput, 'New Architecture');
    userEvent.type(descriptionInput, 'New Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockData.addArchitecture).toHaveBeenCalledWith({
        name: 'New Architecture',
        description: 'New Description',
      });
    });
  });

  it('displays validation errors when adding architecture with empty fields', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add Architecture' });
    userEvent.click(addButton);

    const submitButton = screen.getByRole('button', { name: 'Add' });
    userEvent.click(submitButton);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
  });

  it('opens and closes the edit architecture modal', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);
    expect(screen.getByText('Edit Architecture')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Close' });
    userEvent.click(closeButton);
    await waitFor(() => {
      expect(screen.queryByText('Edit Architecture')).not.toBeInTheDocument();
    });
  });

  it('updates an existing architecture', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Update' });

    userEvent.clear(nameInput);
    userEvent.type(nameInput, 'Updated Architecture');
    userEvent.clear(descriptionInput);
    userEvent.type(descriptionInput, 'Updated Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockData.updateArchitecture).toHaveBeenCalledWith({
        id: '1',
        name: 'Updated Architecture',
        description: 'Updated Description',
      });
    });
  });

  it('displays validation errors when updating architecture with empty fields', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Update' });

    userEvent.clear(nameInput);
    userEvent.clear(descriptionInput);
    userEvent.click(submitButton);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
  });

  it('deletes an architecture', async () => {
    render(<DesignArchitecture />);
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockData.deleteArchitecture).toHaveBeenCalledWith('1');
    });
  });

  it('handles API error when adding architecture', async () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockData,
      addArchitecture: jest.fn().mockRejectedValue(new Error('API Error')),
    });

    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add Architecture' });
    userEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Add' });

    userEvent.type(nameInput, 'New Architecture');
    userEvent.type(descriptionInput, 'New Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error adding architecture.')).toBeInTheDocument();
    });
  });

  it('handles API error when updating architecture', async () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockData,
      updateArchitecture: jest.fn().mockRejectedValue(new Error('API Error')),
    });

    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Update' });

    userEvent.clear(nameInput);
    userEvent.type(nameInput, 'Updated Architecture');
    userEvent.clear(descriptionInput);
    userEvent.type(descriptionInput, 'Updated Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error updating architecture.')).toBeInTheDocument();
    });
  });

  it('handles API error when deleting architecture', async () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue({
      ...mockData,
      deleteArchitecture: jest.fn().mockRejectedValue(new Error('API Error')),
    });

    render(<DesignArchitecture />);
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Error deleting architecture.')).toBeInTheDocument();
    });
  });

  it('should pass accessibility tests', async () => {
    const { container } = render(<DesignArchitecture />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible labels for input fields', () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add Architecture' });
    userEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');

    expect(nameInput).toBeInTheDocument();
    expect(descriptionInput).toBeInTheDocument();
  });

  it('should focus on the first input field when the add modal is opened', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add Architecture' });
    userEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name:');
    await waitFor(() => {
      expect(nameInput).toHaveFocus();
    });
  });

  it('should focus on the first input field when the edit modal is opened', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const nameInput = screen.getByLabelText('Name:');
    await waitFor(() => {
      expect(nameInput).toHaveFocus();
    });
  });

  it('should close the modal when pressing the Escape key', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add Architecture' });
    userEvent.click(addButton);

    userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('Add New Architecture')).not.toBeInTheDocument();
    });
  });
});