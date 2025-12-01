import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust path as needed
import * as api from '../api/designArchitectureApi'; // Adjust path as needed
import { mockDesignArchitectureData } from './mocks/designArchitectureData'; // Adjust path as needed

jest.mock('../api/designArchitectureApi');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(null);
    render(<DesignArchitecture />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches and displays design architecture data on successful load', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1);
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
      expect(screen.getByText(mockDesignArchitectureData.description)).toBeInTheDocument();
    });
  });

  it('displays an error message when fetching data fails', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue({ title: '', description: '' });
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1);
      expect(screen.getByText('')).toBeInTheDocument(); // Check for empty title/description
    });
  });

  it('allows editing the design architecture', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    (api.updateDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);

    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    userEvent.clear(titleInput);
    userEvent.type(titleInput, 'New Title');
    userEvent.clear(descriptionInput);
    userEvent.type(descriptionInput, 'New Description');

    const saveButton = screen.getByRole('button', { name: /save/i });
    userEvent.click(saveButton);

    await waitFor(() => {
      expect(api.updateDesignArchitecture).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/new title/i)).toBeInTheDocument();
      expect(screen.getByText(/new description/i)).toBeInTheDocument();
    });
  });

  it('cancels editing the design architecture', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    userEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });
  });

  it('displays an error message when updating data fails', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    (api.updateDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Failed to update'));

    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    userEvent.type(titleInput, 'New Title');

    const saveButton = screen.getByRole('button', { name: /save/i });
    userEvent.click(saveButton);

    await waitFor(() => {
      expect(api.updateDesignArchitecture).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/error updating/i)).toBeInTheDocument();
    });
  });

  it('disables save button when title or description is empty during editing', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    userEvent.clear(titleInput);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });
  });

  it('enables save button when title and description are not empty during editing', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    userEvent.clear(titleInput);
    userEvent.type(titleInput, 'New Title');

    const descriptionInput = screen.getByLabelText(/description/i);
    userEvent.clear(descriptionInput);
    userEvent.type(descriptionInput, 'New Description');

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeEnabled();
    });
  });

  it('provides accessible labels and roles', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: mockDesignArchitectureData.title })).toBeInTheDocument();
      expect(screen.getByText(mockDesignArchitectureData.description)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('updates the UI after successful update', async () => {
    const updatedData = { ...mockDesignArchitectureData, title: 'Updated Title', description: 'Updated Description' };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    (api.updateDesignArchitecture as jest.Mock).mockResolvedValue(updatedData);

    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    userEvent.clear(titleInput);
    userEvent.type(titleInput, 'Updated Title');
    userEvent.clear(descriptionInput);
    userEvent.type(descriptionInput, 'Updated Description');

    const saveButton = screen.getByRole('button', { name: /save/i });
    userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/updated title/i)).toBeInTheDocument();
      expect(screen.getByText(/updated description/i)).toBeInTheDocument();
    });
  });

  it('shows loading indicator during update', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    (api.updateDesignArchitecture as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockDesignArchitectureData), 500)));

    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    userEvent.clear(titleInput);
    userEvent.type(titleInput, 'New Title');

    const saveButton = screen.getByRole('button', { name: /save/i });
    userEvent.click(saveButton);

    expect(screen.getByText(/saving/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/saving/i)).toBeNull();
    }, { timeout: 1000 });
  });

  it('handles long descriptions without breaking the layout', async () => {
    const longDescription = 'This is a very long description that should wrap correctly and not break the layout. It should be long enough to test the word wrapping and overflow behavior of the component. This is a very long description that should wrap correctly and not break the layout. It should be long enough to test the word wrapping and overflow behavior of the component.';
    const dataWithLongDescription = { ...mockDesignArchitectureData, description: longDescription };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(dataWithLongDescription);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  it('calls fetchDesignArchitecture on mount', () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1);
  });

  it('does not call updateDesignArchitecture if the form is not valid', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    userEvent.clear(titleInput);

    const saveButton = screen.getByRole('button', { name: /save/i });
    userEvent.click(saveButton);

    expect(api.updateDesignArchitecture).not.toHaveBeenCalled();
  });

  it('displays the correct data after canceling and editing again', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    userEvent.clear(titleInput);
    userEvent.type(titleInput, 'Modified Title');

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    userEvent.click(cancelButton);

    const editButtonAgain = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButtonAgain);

    const titleInputAgain = screen.getByLabelText(/title/i);
    expect(titleInputAgain.value).toBe(mockDesignArchitectureData.title);
  });

  it('focuses on the first input field when edit mode is enabled', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toHaveFocus();
  });
});

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust path as needed
import * as api from '../api/designArchitectureApi'; // Adjust path as needed
import { mockDesignArchitectureData } from './mocks/designArchitectureData'; // Adjust path as needed

jest.mock('../api/designArchitectureApi');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(null);
    render(<DesignArchitecture />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches and displays design architecture data on successful load', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1);
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
      expect(screen.getByText(mockDesignArchitectureData.description)).toBeInTheDocument();
    });
  });

  it('displays an error message when fetching data fails', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue({ title: '', description: '' });
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1);
      expect(screen.getByText('')).toBeInTheDocument(); // Check for empty title/description
    });
  });

  it('allows editing the design architecture', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    (api.updateDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);

    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    userEvent.clear(titleInput);
    userEvent.type(titleInput, 'New Title');
    userEvent.clear(descriptionInput);
    userEvent.type(descriptionInput, 'New Description');

    const saveButton = screen.getByRole('button', { name: /save/i });
    userEvent.click(saveButton);

    await waitFor(() => {
      expect(api.updateDesignArchitecture).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/new title/i)).toBeInTheDocument();
      expect(screen.getByText(/new description/i)).toBeInTheDocument();
    });
  });

  it('cancels editing the design architecture', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    userEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });
  });

  it('displays an error message when updating data fails', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    (api.updateDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Failed to update'));

    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    userEvent.type(titleInput, 'New Title');

    const saveButton = screen.getByRole('button', { name: /save/i });
    userEvent.click(saveButton);

    await waitFor(() => {
      expect(api.updateDesignArchitecture).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/error updating/i)).toBeInTheDocument();
    });
  });

  it('disables save button when title or description is empty during editing', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    userEvent.clear(titleInput);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });
  });

  it('enables save button when title and description are not empty during editing', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    userEvent.clear(titleInput);
    userEvent.type(titleInput, 'New Title');

    const descriptionInput = screen.getByLabelText(/description/i);
    userEvent.clear(descriptionInput);
    userEvent.type(descriptionInput, 'New Description');

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeEnabled();
    });
  });

  it('provides accessible labels and roles', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: mockDesignArchitectureData.title })).toBeInTheDocument();
      expect(screen.getByText(mockDesignArchitectureData.description)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('updates the UI after successful update', async () => {
    const updatedData = { ...mockDesignArchitectureData, title: 'Updated Title', description: 'Updated Description' };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    (api.updateDesignArchitecture as jest.Mock).mockResolvedValue(updatedData);

    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    userEvent.clear(titleInput);
    userEvent.type(titleInput, 'Updated Title');
    userEvent.clear(descriptionInput);
    userEvent.type(descriptionInput, 'Updated Description');

    const saveButton = screen.getByRole('button', { name: /save/i });
    userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/updated title/i)).toBeInTheDocument();
      expect(screen.getByText(/updated description/i)).toBeInTheDocument();
    });
  });

  it('shows loading indicator during update', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    (api.updateDesignArchitecture as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockDesignArchitectureData), 500)));

    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    userEvent.clear(titleInput);
    userEvent.type(titleInput, 'New Title');

    const saveButton = screen.getByRole('button', { name: /save/i });
    userEvent.click(saveButton);

    expect(screen.getByText(/saving/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/saving/i)).toBeNull();
    }, { timeout: 1000 });
  });

  it('handles long descriptions without breaking the layout', async () => {
    const longDescription = 'This is a very long description that should wrap correctly and not break the layout. It should be long enough to test the word wrapping and overflow behavior of the component. This is a very long description that should wrap correctly and not break the layout. It should be long enough to test the word wrapping and overflow behavior of the component.';
    const dataWithLongDescription = { ...mockDesignArchitectureData, description: longDescription };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(dataWithLongDescription);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  it('calls fetchDesignArchitecture on mount', () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    expect(api.fetchDesignArchitecture).toHaveBeenCalledTimes(1);
  });

  it('does not call updateDesignArchitecture if the form is not valid', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    userEvent.clear(titleInput);

    const saveButton = screen.getByRole('button', { name: /save/i });
    userEvent.click(saveButton);

    expect(api.updateDesignArchitecture).not.toHaveBeenCalled();
  });

  it('displays the correct data after canceling and editing again', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    userEvent.clear(titleInput);
    userEvent.type(titleInput, 'Modified Title');

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    userEvent.click(cancelButton);

    const editButtonAgain = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButtonAgain);

    const titleInputAgain = screen.getByLabelText(/title/i);
    expect(titleInputAgain.value).toBe(mockDesignArchitectureData.title);
  });

  it('focuses on the first input field when edit mode is enabled', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    userEvent.click(editButton);

    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toHaveFocus();
  });
});