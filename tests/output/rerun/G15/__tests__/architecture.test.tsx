import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust the import path as needed
import * as api from '../api/designArchitectureApi'; // Mock API calls
import { useAuth } from '../contexts/AuthContext'; // Mock Auth Context

jest.mock('../api/designArchitectureApi');
jest.mock('../contexts/AuthContext');

const mockDesignData = [
  { id: '1', name: 'Design 1', description: 'Description 1' },
  { id: '2', name: 'Design 2', description: 'Description 2' },
];

const mockError = new Error('Failed to fetch data');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user' },
      logout: jest.fn(),
    });
  });

  it('renders loading state initially', () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    render(<DesignArchitecture />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches and displays design data on successful API call', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/design 1/i)).toBeInTheDocument();
      expect(screen.getByText(/design 2/i)).toBeInTheDocument();
    });
  });

  it('displays error message on failed API call', async () => {
    (api.fetchDesigns as jest.Mock).mockRejectedValue(mockError);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('allows creating a new design', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.createDesign as jest.Mock).mockResolvedValue({ id: '3', name: 'New Design', description: 'New Description' });

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    userEvent.click(screen.getByRole('button', { name: /create design/i }));

    const nameInput = screen.getByLabelText(/name/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    userEvent.type(nameInput, 'New Design');
    userEvent.type(descriptionInput, 'New Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(api.createDesign).toHaveBeenCalledWith({ name: 'New Design', description: 'New Description', userId: 'test-user' });
    });
  });

  it('displays error message when creating a design fails', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.createDesign as jest.Mock).mockRejectedValue(mockError);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    userEvent.click(screen.getByRole('button', { name: /create design/i }));

    const nameInput = screen.getByLabelText(/name/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    userEvent.type(nameInput, 'New Design');
    userEvent.type(descriptionInput, 'New Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error creating design/i)).toBeInTheDocument();
    });
  });

  it('allows deleting a design', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.deleteDesign as jest.Mock).mockResolvedValue(undefined);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.deleteDesign).toHaveBeenCalledWith('1');
    });
  });

  it('displays error message when deleting a design fails', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.deleteDesign as jest.Mock).mockRejectedValue(mockError);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/error deleting design/i)).toBeInTheDocument();
    });
  });

  it('updates design list after successful create', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.createDesign as jest.Mock).mockResolvedValue({ id: '3', name: 'New Design', description: 'New Description' });
    (api.fetchDesigns as jest.Mock).mockResolvedValue([...mockDesignData, { id: '3', name: 'New Design', description: 'New Description' }]);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    userEvent.click(screen.getByRole('button', { name: /create design/i }));

    const nameInput = screen.getByLabelText(/name/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    userEvent.type(nameInput, 'New Design');
    userEvent.type(descriptionInput, 'New Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/new design/i)).toBeInTheDocument();
    });
  });

  it('updates design list after successful delete', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.deleteDesign as jest.Mock).mockResolvedValue(undefined);
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData[1]]);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText(/design 1/i)).not.toBeInTheDocument();
    });
  });

  it('renders the component with correct aria attributes', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/design 1/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /create design/i })).toHaveAttribute('aria-label', 'Create new design');
  });

  it('handles empty design list gracefully', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([]);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/no designs found/i)).toBeInTheDocument();
    });
  });

  it('closes the modal on cancel', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    userEvent.click(screen.getByRole('button', { name: /create design/i }));

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    userEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
    });
  });

  it('validates input fields when creating a new design', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    userEvent.click(screen.getByRole('button', { name: /create design/i }));

    const submitButton = screen.getByRole('button', { name: /submit/i });

    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });
  });

  it('shows a confirmation dialog before deleting a design', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.deleteDesign as jest.Mock).mockResolvedValue(undefined);

    const mockConfirm = jest.spyOn(window, 'confirm');
    mockConfirm.mockImplementation(() => true);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    userEvent.click(deleteButton);

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this design?');

    mockConfirm.mockRestore();
  });

  it('does not delete a design if the user cancels the confirmation dialog', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.deleteDesign as jest.Mock).mockResolvedValue(undefined);

    const mockConfirm = jest.spyOn(window, 'confirm');
    mockConfirm.mockImplementation(() => false);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    userEvent.click(deleteButton);

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this design?');
    expect(api.deleteDesign).not.toHaveBeenCalled();

    mockConfirm.mockRestore();
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust the import path as needed
import * as api from '../api/designArchitectureApi'; // Mock API calls
import { useAuth } from '../contexts/AuthContext'; // Mock Auth Context

jest.mock('../api/designArchitectureApi');
jest.mock('../contexts/AuthContext');

const mockDesignData = [
  { id: '1', name: 'Design 1', description: 'Description 1' },
  { id: '2', name: 'Design 2', description: 'Description 2' },
];

const mockError = new Error('Failed to fetch data');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user' },
      logout: jest.fn(),
    });
  });

  it('renders loading state initially', () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    render(<DesignArchitecture />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches and displays design data on successful API call', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/design 1/i)).toBeInTheDocument();
      expect(screen.getByText(/design 2/i)).toBeInTheDocument();
    });
  });

  it('displays error message on failed API call', async () => {
    (api.fetchDesigns as jest.Mock).mockRejectedValue(mockError);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('allows creating a new design', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.createDesign as jest.Mock).mockResolvedValue({ id: '3', name: 'New Design', description: 'New Description' });

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    userEvent.click(screen.getByRole('button', { name: /create design/i }));

    const nameInput = screen.getByLabelText(/name/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    userEvent.type(nameInput, 'New Design');
    userEvent.type(descriptionInput, 'New Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(api.createDesign).toHaveBeenCalledWith({ name: 'New Design', description: 'New Description', userId: 'test-user' });
    });
  });

  it('displays error message when creating a design fails', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.createDesign as jest.Mock).mockRejectedValue(mockError);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    userEvent.click(screen.getByRole('button', { name: /create design/i }));

    const nameInput = screen.getByLabelText(/name/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    userEvent.type(nameInput, 'New Design');
    userEvent.type(descriptionInput, 'New Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error creating design/i)).toBeInTheDocument();
    });
  });

  it('allows deleting a design', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.deleteDesign as jest.Mock).mockResolvedValue(undefined);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.deleteDesign).toHaveBeenCalledWith('1');
    });
  });

  it('displays error message when deleting a design fails', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.deleteDesign as jest.Mock).mockRejectedValue(mockError);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/error deleting design/i)).toBeInTheDocument();
    });
  });

  it('updates design list after successful create', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.createDesign as jest.Mock).mockResolvedValue({ id: '3', name: 'New Design', description: 'New Description' });
    (api.fetchDesigns as jest.Mock).mockResolvedValue([...mockDesignData, { id: '3', name: 'New Design', description: 'New Description' }]);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    userEvent.click(screen.getByRole('button', { name: /create design/i }));

    const nameInput = screen.getByLabelText(/name/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    userEvent.type(nameInput, 'New Design');
    userEvent.type(descriptionInput, 'New Description');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/new design/i)).toBeInTheDocument();
    });
  });

  it('updates design list after successful delete', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.deleteDesign as jest.Mock).mockResolvedValue(undefined);
    (api.fetchDesigns as jest.Mock).mockResolvedValue([mockDesignData[1]]);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    userEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText(/design 1/i)).not.toBeInTheDocument();
    });
  });

  it('renders the component with correct aria attributes', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/design 1/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /create design/i })).toHaveAttribute('aria-label', 'Create new design');
  });

  it('handles empty design list gracefully', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue([]);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(/no designs found/i)).toBeInTheDocument();
    });
  });

  it('closes the modal on cancel', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    userEvent.click(screen.getByRole('button', { name: /create design/i }));

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    userEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
    });
  });

  it('validates input fields when creating a new design', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    userEvent.click(screen.getByRole('button', { name: /create design/i }));

    const submitButton = screen.getByRole('button', { name: /submit/i });

    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });
  });

  it('shows a confirmation dialog before deleting a design', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.deleteDesign as jest.Mock).mockResolvedValue(undefined);

    const mockConfirm = jest.spyOn(window, 'confirm');
    mockConfirm.mockImplementation(() => true);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    userEvent.click(deleteButton);

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this design?');

    mockConfirm.mockRestore();
  });

  it('does not delete a design if the user cancels the confirmation dialog', async () => {
    (api.fetchDesigns as jest.Mock).mockResolvedValue(mockDesignData);
    (api.deleteDesign as jest.Mock).mockResolvedValue(undefined);

    const mockConfirm = jest.spyOn(window, 'confirm');
    mockConfirm.mockImplementation(() => false);

    render(<DesignArchitecture />);

    await waitFor(() => expect(screen.getByText(/design 1/i)).toBeInTheDocument());

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    userEvent.click(deleteButton);

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this design?');
    expect(api.deleteDesign).not.toHaveBeenCalled();

    mockConfirm.mockRestore();
  });
});