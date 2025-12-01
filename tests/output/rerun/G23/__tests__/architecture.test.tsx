import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust the import path as needed
import { useDesignArchitectureData } from '../hooks/useDesignArchitectureData'; // Adjust the import path as needed
import { DesignArchitectureService } from '../services/DesignArchitectureService'; // Adjust the import path as needed
import '@testing-library/jest-dom';

// Mock the external dependencies
jest.mock('../hooks/useDesignArchitectureData');
jest.mock('../services/DesignArchitectureService');

describe('DesignArchitecture Component', () => {
  const mockDesignArchitectureData = {
    data: [
      { id: 1, name: 'Architecture 1', description: 'Description 1' },
      { id: 2, name: 'Architecture 2', description: 'Description 2' },
    ],
    isLoading: false,
    error: null,
  };

  const mockEmptyDesignArchitectureData = {
    data: [],
    isLoading: false,
    error: null,
  };

  const mockLoadingDesignArchitectureData = {
    data: [],
    isLoading: true,
    error: null,
  };

  const mockErrorDesignArchitectureData = {
    data: [],
    isLoading: false,
    error: new Error('Failed to fetch data'),
  };

  const mockCreateDesignArchitecture = jest.fn();
  const mockUpdateDesignArchitecture = jest.fn();
  const mockDeleteDesignArchitecture = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDesignArchitectureData as jest.Mock).mockReturnValue(mockDesignArchitectureData);
    (DesignArchitectureService.createDesignArchitecture as jest.Mock).mockImplementation(mockCreateDesignArchitecture);
    (DesignArchitectureService.updateDesignArchitecture as jest.Mock).mockImplementation(mockUpdateDesignArchitecture);
    (DesignArchitectureService.deleteDesignArchitecture as jest.Mock).mockImplementation(mockDeleteDesignArchitecture);
  });

  it('should render the component with data', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText('Architecture 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Architecture 2')).toBeInTheDocument();
    expect(screen.getByText('Description 2')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue(mockLoadingDesignArchitectureData);
    render(<DesignArchitecture />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue(mockErrorDesignArchitectureData);
    render(<DesignArchitecture />);
    expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
  });

  it('should render "No data available" when data is empty', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue(mockEmptyDesignArchitectureData);
    render(<DesignArchitecture />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should open the create modal when "Add New Architecture" button is clicked', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add New Architecture' });
    userEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByText('Create New Architecture')).toBeInTheDocument();
    });
  });

  it('should create a new architecture', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add New Architecture' });
    userEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Create' });

    userEvent.type(nameInput, 'New Architecture');
    userEvent.type(descriptionInput, 'New Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateDesignArchitecture).toHaveBeenCalledWith({ name: 'New Architecture', description: 'New Description' });
    });
  });

  it('should close the create modal when the close button is clicked', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add New Architecture' });
    userEvent.click(addButton);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    userEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Create New Architecture')).not.toBeInTheDocument();
    });
  });

  it('should open the edit modal when the edit button is clicked', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Update Architecture')).toBeInTheDocument();
    });
  });

  it('should update an existing architecture', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Update' });

    userEvent.type(nameInput, 'Updated Architecture');
    userEvent.type(descriptionInput, 'Updated Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateDesignArchitecture).toHaveBeenCalled();
    });
  });

  it('should close the edit modal when the close button is clicked', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    userEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Update Architecture')).not.toBeInTheDocument();
    });
  });

  it('should open the delete confirmation modal when the delete button is clicked', async () => {
    render(<DesignArchitecture />);
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });
  });

  it('should delete an architecture', async () => {
    render(<DesignArchitecture />);
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    userEvent.click(deleteButton);

    const confirmDeleteButton = screen.getByRole('button', { name: 'Confirm' });
    userEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(mockDeleteDesignArchitecture).toHaveBeenCalled();
    });
  });

  it('should close the delete confirmation modal when the cancel button is clicked', async () => {
    render(<DesignArchitecture />);
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    userEvent.click(deleteButton);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    userEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    });
  });

  it('should handle create error', async () => {
    (DesignArchitectureService.createDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Create failed'));
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add New Architecture' });
    userEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Create' });

    userEvent.type(nameInput, 'New Architecture');
    userEvent.type(descriptionInput, 'New Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Create failed')).toBeInTheDocument();
    });
  });

  it('should handle update error', async () => {
    (DesignArchitectureService.updateDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Update failed'));
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Update' });

    userEvent.type(nameInput, 'Updated Architecture');
    userEvent.type(descriptionInput, 'Updated Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Update failed')).toBeInTheDocument();
    });
  });

  it('should handle delete error', async () => {
    (DesignArchitectureService.deleteDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Delete failed'));
    render(<DesignArchitecture />);
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    userEvent.click(deleteButton);

    const confirmDeleteButton = screen.getByRole('button', { name: 'Confirm' });
    userEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Delete failed')).toBeInTheDocument();
    });
  });

  it('should have accessible labels and roles', () => {
    render(<DesignArchitecture />);
    expect(screen.getByRole('button', { name: 'Add New Architecture' })).toBeInTheDocument();
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    expect(editButtons.length).toBeGreaterThan(0);
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('should display validation errors in the create modal', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add New Architecture' });
    userEvent.click(addButton);

    const submitButton = screen.getByRole('button', { name: 'Create' });
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });
  });

  it('should display validation errors in the update modal', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const submitButton = screen.getByRole('button', { name: 'Update' });
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });
  });

  it('should close the modal on Escape key press', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add New Architecture' });
    userEvent.click(addButton);

    act(() => {
      fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    });

    await waitFor(() => {
      expect(screen.queryByText('Create New Architecture')).not.toBeInTheDocument();
    });
  });

  it('should focus on the first input field in the create modal when it opens', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add New Architecture' });
    userEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Name:')).toHaveFocus();
    });
  });

  it('should focus on the first input field in the update modal when it opens', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Name:')).toHaveFocus();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust the import path as needed
import { useDesignArchitectureData } from '../hooks/useDesignArchitectureData'; // Adjust the import path as needed
import { DesignArchitectureService } from '../services/DesignArchitectureService'; // Adjust the import path as needed
import '@testing-library/jest-dom';

// Mock the external dependencies
jest.mock('../hooks/useDesignArchitectureData');
jest.mock('../services/DesignArchitectureService');

describe('DesignArchitecture Component', () => {
  const mockDesignArchitectureData = {
    data: [
      { id: 1, name: 'Architecture 1', description: 'Description 1' },
      { id: 2, name: 'Architecture 2', description: 'Description 2' },
    ],
    isLoading: false,
    error: null,
  };

  const mockEmptyDesignArchitectureData = {
    data: [],
    isLoading: false,
    error: null,
  };

  const mockLoadingDesignArchitectureData = {
    data: [],
    isLoading: true,
    error: null,
  };

  const mockErrorDesignArchitectureData = {
    data: [],
    isLoading: false,
    error: new Error('Failed to fetch data'),
  };

  const mockCreateDesignArchitecture = jest.fn();
  const mockUpdateDesignArchitecture = jest.fn();
  const mockDeleteDesignArchitecture = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDesignArchitectureData as jest.Mock).mockReturnValue(mockDesignArchitectureData);
    (DesignArchitectureService.createDesignArchitecture as jest.Mock).mockImplementation(mockCreateDesignArchitecture);
    (DesignArchitectureService.updateDesignArchitecture as jest.Mock).mockImplementation(mockUpdateDesignArchitecture);
    (DesignArchitectureService.deleteDesignArchitecture as jest.Mock).mockImplementation(mockDeleteDesignArchitecture);
  });

  it('should render the component with data', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText('Architecture 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Architecture 2')).toBeInTheDocument();
    expect(screen.getByText('Description 2')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue(mockLoadingDesignArchitectureData);
    render(<DesignArchitecture />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue(mockErrorDesignArchitectureData);
    render(<DesignArchitecture />);
    expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
  });

  it('should render "No data available" when data is empty', () => {
    (useDesignArchitectureData as jest.Mock).mockReturnValue(mockEmptyDesignArchitectureData);
    render(<DesignArchitecture />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should open the create modal when "Add New Architecture" button is clicked', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add New Architecture' });
    userEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByText('Create New Architecture')).toBeInTheDocument();
    });
  });

  it('should create a new architecture', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add New Architecture' });
    userEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Create' });

    userEvent.type(nameInput, 'New Architecture');
    userEvent.type(descriptionInput, 'New Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateDesignArchitecture).toHaveBeenCalledWith({ name: 'New Architecture', description: 'New Description' });
    });
  });

  it('should close the create modal when the close button is clicked', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add New Architecture' });
    userEvent.click(addButton);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    userEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Create New Architecture')).not.toBeInTheDocument();
    });
  });

  it('should open the edit modal when the edit button is clicked', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Update Architecture')).toBeInTheDocument();
    });
  });

  it('should update an existing architecture', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Update' });

    userEvent.type(nameInput, 'Updated Architecture');
    userEvent.type(descriptionInput, 'Updated Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateDesignArchitecture).toHaveBeenCalled();
    });
  });

  it('should close the edit modal when the close button is clicked', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    userEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Update Architecture')).not.toBeInTheDocument();
    });
  });

  it('should open the delete confirmation modal when the delete button is clicked', async () => {
    render(<DesignArchitecture />);
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });
  });

  it('should delete an architecture', async () => {
    render(<DesignArchitecture />);
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    userEvent.click(deleteButton);

    const confirmDeleteButton = screen.getByRole('button', { name: 'Confirm' });
    userEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(mockDeleteDesignArchitecture).toHaveBeenCalled();
    });
  });

  it('should close the delete confirmation modal when the cancel button is clicked', async () => {
    render(<DesignArchitecture />);
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    userEvent.click(deleteButton);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    userEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    });
  });

  it('should handle create error', async () => {
    (DesignArchitectureService.createDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Create failed'));
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add New Architecture' });
    userEvent.click(addButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Create' });

    userEvent.type(nameInput, 'New Architecture');
    userEvent.type(descriptionInput, 'New Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Create failed')).toBeInTheDocument();
    });
  });

  it('should handle update error', async () => {
    (DesignArchitectureService.updateDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Update failed'));
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const nameInput = screen.getByLabelText('Name:');
    const descriptionInput = screen.getByLabelText('Description:');
    const submitButton = screen.getByRole('button', { name: 'Update' });

    userEvent.type(nameInput, 'Updated Architecture');
    userEvent.type(descriptionInput, 'Updated Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Update failed')).toBeInTheDocument();
    });
  });

  it('should handle delete error', async () => {
    (DesignArchitectureService.deleteDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Delete failed'));
    render(<DesignArchitecture />);
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
    userEvent.click(deleteButton);

    const confirmDeleteButton = screen.getByRole('button', { name: 'Confirm' });
    userEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Delete failed')).toBeInTheDocument();
    });
  });

  it('should have accessible labels and roles', () => {
    render(<DesignArchitecture />);
    expect(screen.getByRole('button', { name: 'Add New Architecture' })).toBeInTheDocument();
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    expect(editButtons.length).toBeGreaterThan(0);
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('should display validation errors in the create modal', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add New Architecture' });
    userEvent.click(addButton);

    const submitButton = screen.getByRole('button', { name: 'Create' });
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });
  });

  it('should display validation errors in the update modal', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    const submitButton = screen.getByRole('button', { name: 'Update' });
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });
  });

  it('should close the modal on Escape key press', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add New Architecture' });
    userEvent.click(addButton);

    act(() => {
      fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    });

    await waitFor(() => {
      expect(screen.queryByText('Create New Architecture')).not.toBeInTheDocument();
    });
  });

  it('should focus on the first input field in the create modal when it opens', async () => {
    render(<DesignArchitecture />);
    const addButton = screen.getByRole('button', { name: 'Add New Architecture' });
    userEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Name:')).toHaveFocus();
    });
  });

  it('should focus on the first input field in the update modal when it opens', async () => {
    render(<DesignArchitecture />);
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    userEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Name:')).toHaveFocus();
    });
  });
});