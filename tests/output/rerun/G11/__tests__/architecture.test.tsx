import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust the import path as needed
import * as api from '../api/designArchitectureApi'; // Adjust the import path as needed
import { useAuth } from '../contexts/AuthContext'; // Adjust the import path as needed

jest.mock('../api/designArchitectureApi');
jest.mock('../contexts/AuthContext');

describe('DesignArchitecture Component', () => {
  const mockDesignArchitectures = [
    { id: '1', name: 'Architecture 1', description: 'Description 1' },
    { id: '2', name: 'Architecture 2', description: 'Description 2' },
  ];

  const mockAuthContextValue = {
    user: { id: 'user123', role: 'admin' },
    logout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue(mockAuthContextValue);
  });

  it('renders loading state initially', () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(null);
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders design architectures after loading', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    expect(screen.getByText(/Architecture 2/i)).toBeInTheDocument();
  });

  it('displays error message when fetching design architectures fails', async () => {
    (api.getDesignArchitectures as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Error fetching design architectures/i)).toBeInTheDocument());
  });

  it('opens the create design architecture modal when "Create New" button is clicked', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    const createButton = screen.getByRole('button', { name: /Create New/i });
    fireEvent.click(createButton);
    expect(screen.getByText(/Create Design Architecture/i)).toBeInTheDocument();
  });

  it('creates a new design architecture successfully', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    (api.createDesignArchitecture as jest.Mock).mockResolvedValue({ id: '3', name: 'New Architecture', description: 'New Description' });
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Create New/i }));
    await userEvent.type(screen.getByLabelText(/Name/i), 'New Architecture');
    await userEvent.type(screen.getByLabelText(/Description/i), 'New Description');
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(api.createDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/New Architecture/i)).toBeInTheDocument());
  });

  it('displays error message when creating a new design architecture fails', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    (api.createDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Failed to create'));
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Create New/i }));
    await userEvent.type(screen.getByLabelText(/Name/i), 'New Architecture');
    await userEvent.type(screen.getByLabelText(/Description/i), 'New Description');
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(api.createDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/Error creating design architecture/i)).toBeInTheDocument());
  });

  it('opens the edit design architecture modal when "Edit" button is clicked', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    const editButton = screen.getByTestId('edit-design-architecture-1');
    fireEvent.click(editButton);
    expect(screen.getByText(/Edit Design Architecture/i)).toBeInTheDocument();
  });

  it('updates a design architecture successfully', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    (api.updateDesignArchitecture as jest.Mock).mockResolvedValue({ id: '1', name: 'Updated Architecture', description: 'Updated Description' });
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('edit-design-architecture-1'));
    await userEvent.clear(screen.getByLabelText(/Name/i));
    await userEvent.type(screen.getByLabelText(/Name/i), 'Updated Architecture');
    await userEvent.clear(screen.getByLabelText(/Description/i));
    await userEvent.type(screen.getByLabelText(/Description/i), 'Updated Description');
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(api.updateDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/Updated Architecture/i)).toBeInTheDocument());
  });

  it('displays error message when updating a design architecture fails', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    (api.updateDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Failed to update'));
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('edit-design-architecture-1'));
    await userEvent.clear(screen.getByLabelText(/Name/i));
    await userEvent.type(screen.getByLabelText(/Name/i), 'Updated Architecture');
    await userEvent.clear(screen.getByLabelText(/Description/i));
    await userEvent.type(screen.getByLabelText(/Description/i), 'Updated Description');
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(api.updateDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/Error updating design architecture/i)).toBeInTheDocument());
  });

  it('deletes a design architecture successfully', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    (api.deleteDesignArchitecture as jest.Mock).mockResolvedValue(undefined);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('delete-design-architecture-1'));

    await waitFor(() => expect(api.deleteDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText(/Architecture 1/i)).not.toBeInTheDocument());
  });

  it('displays error message when deleting a design architecture fails', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    (api.deleteDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Failed to delete'));
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('delete-design-architecture-1'));

    await waitFor(() => expect(api.deleteDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/Error deleting design architecture/i)).toBeInTheDocument());
  });

  it('closes the modal when the "Cancel" button is clicked in create modal', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Create New/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByText(/Create Design Architecture/i)).not.toBeInTheDocument();
  });

  it('closes the modal when the "Cancel" button is clicked in edit modal', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('edit-design-architecture-1'));
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByText(/Edit Design Architecture/i)).not.toBeInTheDocument();
  });

  it('renders the component with accessibility features', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Create New/i })).toBeInTheDocument();
    expect(screen.getByTestId('edit-design-architecture-1')).toBeInTheDocument();
    expect(screen.getByTestId('delete-design-architecture-1')).toBeInTheDocument();
  });

  it('handles empty design architectures list gracefully', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue([]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.queryByText(/Architecture 1/i)).not.toBeInTheDocument());
    expect(screen.getByText(/No design architectures found./i)).toBeInTheDocument();
  });

  it('displays validation errors when creating a new design architecture with empty fields', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Create New/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
    });
  });

  it('displays validation errors when updating a design architecture with empty fields', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('edit-design-architecture-1'));
    await userEvent.clear(screen.getByLabelText(/Name/i));
    await userEvent.clear(screen.getByLabelText(/Description/i));
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
    });
  });

  it('calls the getDesignArchitectures API again after successful create, update, or delete', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    (api.createDesignArchitecture as jest.Mock).mockResolvedValue({ id: '3', name: 'New Architecture', description: 'New Description' });
    (api.updateDesignArchitecture as jest.Mock).mockResolvedValue({ id: '1', name: 'Updated Architecture', description: 'Updated Description' });
    (api.deleteDesignArchitecture as jest.Mock).mockResolvedValue(undefined);

    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());

    // Create
    fireEvent.click(screen.getByRole('button', { name: /Create New/i }));
    await userEvent.type(screen.getByLabelText(/Name/i), 'New Architecture');
    await userEvent.type(screen.getByLabelText(/Description/i), 'New Description');
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => expect(api.getDesignArchitectures).toHaveBeenCalledTimes(2));

    // Update
    fireEvent.click(screen.getByTestId('edit-design-architecture-1'));
    await userEvent.clear(screen.getByLabelText(/Name/i));
    await userEvent.type(screen.getByLabelText(/Name/i), 'Updated Architecture');
    await userEvent.clear(screen.getByLabelText(/Description/i));
    await userEvent.type(screen.getByLabelText(/Description/i), 'Updated Description');
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => expect(api.getDesignArchitectures).toHaveBeenCalledTimes(3));

    // Delete
    fireEvent.click(screen.getByTestId('delete-design-architecture-1'));
    await waitFor(() => expect(api.getDesignArchitectures).toHaveBeenCalledTimes(4));
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust the import path as needed
import * as api from '../api/designArchitectureApi'; // Adjust the import path as needed
import { useAuth } from '../contexts/AuthContext'; // Adjust the import path as needed

jest.mock('../api/designArchitectureApi');
jest.mock('../contexts/AuthContext');

describe('DesignArchitecture Component', () => {
  const mockDesignArchitectures = [
    { id: '1', name: 'Architecture 1', description: 'Description 1' },
    { id: '2', name: 'Architecture 2', description: 'Description 2' },
  ];

  const mockAuthContextValue = {
    user: { id: 'user123', role: 'admin' },
    logout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue(mockAuthContextValue);
  });

  it('renders loading state initially', () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(null);
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders design architectures after loading', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    expect(screen.getByText(/Architecture 2/i)).toBeInTheDocument();
  });

  it('displays error message when fetching design architectures fails', async () => {
    (api.getDesignArchitectures as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Error fetching design architectures/i)).toBeInTheDocument());
  });

  it('opens the create design architecture modal when "Create New" button is clicked', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    const createButton = screen.getByRole('button', { name: /Create New/i });
    fireEvent.click(createButton);
    expect(screen.getByText(/Create Design Architecture/i)).toBeInTheDocument();
  });

  it('creates a new design architecture successfully', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    (api.createDesignArchitecture as jest.Mock).mockResolvedValue({ id: '3', name: 'New Architecture', description: 'New Description' });
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Create New/i }));
    await userEvent.type(screen.getByLabelText(/Name/i), 'New Architecture');
    await userEvent.type(screen.getByLabelText(/Description/i), 'New Description');
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(api.createDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/New Architecture/i)).toBeInTheDocument());
  });

  it('displays error message when creating a new design architecture fails', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    (api.createDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Failed to create'));
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Create New/i }));
    await userEvent.type(screen.getByLabelText(/Name/i), 'New Architecture');
    await userEvent.type(screen.getByLabelText(/Description/i), 'New Description');
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(api.createDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/Error creating design architecture/i)).toBeInTheDocument());
  });

  it('opens the edit design architecture modal when "Edit" button is clicked', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    const editButton = screen.getByTestId('edit-design-architecture-1');
    fireEvent.click(editButton);
    expect(screen.getByText(/Edit Design Architecture/i)).toBeInTheDocument();
  });

  it('updates a design architecture successfully', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    (api.updateDesignArchitecture as jest.Mock).mockResolvedValue({ id: '1', name: 'Updated Architecture', description: 'Updated Description' });
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('edit-design-architecture-1'));
    await userEvent.clear(screen.getByLabelText(/Name/i));
    await userEvent.type(screen.getByLabelText(/Name/i), 'Updated Architecture');
    await userEvent.clear(screen.getByLabelText(/Description/i));
    await userEvent.type(screen.getByLabelText(/Description/i), 'Updated Description');
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(api.updateDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/Updated Architecture/i)).toBeInTheDocument());
  });

  it('displays error message when updating a design architecture fails', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    (api.updateDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Failed to update'));
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('edit-design-architecture-1'));
    await userEvent.clear(screen.getByLabelText(/Name/i));
    await userEvent.type(screen.getByLabelText(/Name/i), 'Updated Architecture');
    await userEvent.clear(screen.getByLabelText(/Description/i));
    await userEvent.type(screen.getByLabelText(/Description/i), 'Updated Description');
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(api.updateDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/Error updating design architecture/i)).toBeInTheDocument());
  });

  it('deletes a design architecture successfully', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    (api.deleteDesignArchitecture as jest.Mock).mockResolvedValue(undefined);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('delete-design-architecture-1'));

    await waitFor(() => expect(api.deleteDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText(/Architecture 1/i)).not.toBeInTheDocument());
  });

  it('displays error message when deleting a design architecture fails', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    (api.deleteDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Failed to delete'));
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('delete-design-architecture-1'));

    await waitFor(() => expect(api.deleteDesignArchitecture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/Error deleting design architecture/i)).toBeInTheDocument());
  });

  it('closes the modal when the "Cancel" button is clicked in create modal', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Create New/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByText(/Create Design Architecture/i)).not.toBeInTheDocument();
  });

  it('closes the modal when the "Cancel" button is clicked in edit modal', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('edit-design-architecture-1'));
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByText(/Edit Design Architecture/i)).not.toBeInTheDocument();
  });

  it('renders the component with accessibility features', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Create New/i })).toBeInTheDocument();
    expect(screen.getByTestId('edit-design-architecture-1')).toBeInTheDocument();
    expect(screen.getByTestId('delete-design-architecture-1')).toBeInTheDocument();
  });

  it('handles empty design architectures list gracefully', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue([]);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.queryByText(/Architecture 1/i)).not.toBeInTheDocument());
    expect(screen.getByText(/No design architectures found./i)).toBeInTheDocument();
  });

  it('displays validation errors when creating a new design architecture with empty fields', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Create New/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
    });
  });

  it('displays validation errors when updating a design architecture with empty fields', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('edit-design-architecture-1'));
    await userEvent.clear(screen.getByLabelText(/Name/i));
    await userEvent.clear(screen.getByLabelText(/Description/i));
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
    });
  });

  it('calls the getDesignArchitectures API again after successful create, update, or delete', async () => {
    (api.getDesignArchitectures as jest.Mock).mockResolvedValue(mockDesignArchitectures);
    (api.createDesignArchitecture as jest.Mock).mockResolvedValue({ id: '3', name: 'New Architecture', description: 'New Description' });
    (api.updateDesignArchitecture as jest.Mock).mockResolvedValue({ id: '1', name: 'Updated Architecture', description: 'Updated Description' });
    (api.deleteDesignArchitecture as jest.Mock).mockResolvedValue(undefined);

    render(<DesignArchitecture />);
    await waitFor(() => expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument());

    // Create
    fireEvent.click(screen.getByRole('button', { name: /Create New/i }));
    await userEvent.type(screen.getByLabelText(/Name/i), 'New Architecture');
    await userEvent.type(screen.getByLabelText(/Description/i), 'New Description');
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => expect(api.getDesignArchitectures).toHaveBeenCalledTimes(2));

    // Update
    fireEvent.click(screen.getByTestId('edit-design-architecture-1'));
    await userEvent.clear(screen.getByLabelText(/Name/i));
    await userEvent.type(screen.getByLabelText(/Name/i), 'Updated Architecture');
    await userEvent.clear(screen.getByLabelText(/Description/i));
    await userEvent.type(screen.getByLabelText(/Description/i), 'Updated Description');
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => expect(api.getDesignArchitectures).toHaveBeenCalledTimes(3));

    // Delete
    fireEvent.click(screen.getByTestId('delete-design-architecture-1'));
    await waitFor(() => expect(api.getDesignArchitectures).toHaveBeenCalledTimes(4));
  });
});