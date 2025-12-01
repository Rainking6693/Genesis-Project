import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useArchitectureData } from '../../hooks/useArchitectureData';
import { saveDesign } from '../../services/architectureService';
import { toast } from 'react-toastify';

// Mock external dependencies
jest.mock('../../hooks/useArchitectureData');
jest.mock('../../services/architectureService');
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseArchitectureData = useArchitectureData as jest.MockedFunction<typeof useArchitectureData>;
const mockSaveDesign = saveDesign as jest.MockedFunction<typeof saveDesign>;

const mockDesignData = {
  id: '1',
  name: 'Modern Villa',
  description: 'A contemporary villa design',
  blueprint: {
    url: 'modern-villa-blueprint.png',
    dimensions: { width: 2000, height: 1500 },
  },
  materials: ['concrete', 'glass', 'steel'],
  status: 'draft',
  lastModified: '2023-05-15T10:00:00Z',
};

const mockErrorData = {
  error: 'Failed to load design data',
};

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading States', () => {
    it('should display loading skeleton when data is being fetched', () => {
      mockUseArchitectureData.mockReturnValue({ loading: true, error: null, data: null });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByTestId('design-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('design-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('design-content')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: mockErrorData.error, data: null });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByTestId('design-error')).toHaveTextContent(mockErrorData.error);
      expect(screen.queryByTestId('design-skeleton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('design-content')).not.toBeInTheDocument();
    });

    it('should display error toast when save fails', async () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });
      mockSaveDesign.mockRejectedValue(new Error('Save failed'));

      render(<DesignArchitecture designId="1" />);

      await user.click(screen.getByRole('button', { name: /save design/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to save design: Save failed');
      });
    });
  });

  describe('Data Display', () => {
    it('should render design data correctly when loaded', () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByTestId('design-content')).toBeInTheDocument();
      expect(screen.getByText(mockDesignData.name)).toBeInTheDocument();
      expect(screen.getByText(mockDesignData.description)).toBeInTheDocument();
      expect(screen.getByAltText(/blueprint preview/i)).toHaveAttribute('src', mockDesignData.blueprint.url);

      const materialsList = screen.getByRole('list', { name: /materials used/i });
      mockDesignData.materials.forEach(material => {
        expect(within(materialsList).getByText(material)).toBeInTheDocument();
      });
    });

    it('should display "No materials specified" when materials array is empty', () => {
      const emptyMaterialsData = { ...mockDesignData, materials: [] };
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: emptyMaterialsData });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByText(/no materials specified/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });
    });

    it('should allow editing design name', async () => {
      render(<DesignArchitecture designId="1" />);

      const nameInput = screen.getByLabelText(/design name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Villa Name');

      expect(nameInput).toHaveValue('Updated Villa Name');
    });

    it('should allow editing design description', async () => {
      render(<DesignArchitecture designId="1" />);

      const descInput = screen.getByLabelText(/design description/i);
      await user.clear(descInput);
      await user.type(descInput, 'Updated description with more details');

      expect(descInput).toHaveValue('Updated description with more details');
    });

    it('should add new material when Add Material button is clicked', async () => {
      render(<DesignArchitecture designId="1" />);

      const addButton = screen.getByRole('button', { name: /add material/i });
      await user.click(addButton);

      const newMaterialInput = screen.getByLabelText(/new material/i);
      await user.type(newMaterialInput, 'wood');
      fireEvent.submit(newMaterialInput);

      expect(screen.getByText('wood')).toBeInTheDocument();
    });

    it('should remove material when remove button is clicked', async () => {
      render(<DesignArchitecture designId="1" />);

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      expect(screen.queryByText(mockDesignData.materials[0])).not.toBeInTheDocument();
    });

    it('should upload new blueprint when file is selected', async () => {
      const file = new File(['blueprint'], 'new-blueprint.png', { type: 'image/png' });
      render(<DesignArchitecture designId="1" />);

      const fileInput = screen.getByLabelText(/upload blueprint/i);
      await user.upload(fileInput, file);

      expect(fileInput).toHaveProperty('files', [file]);
    });

    it('should save design when Save button is clicked', async () => {
      mockSaveDesign.mockResolvedValue({ success: true });

      render(<DesignArchitecture designId="1" />);

      await user.click(screen.getByRole('button', { name: /save design/i }));

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalledWith(expect.objectContaining({
          id: mockDesignData.id,
        }));
        expect(toast.success).toHaveBeenCalledWith('Design saved successfully');
      });
    });

    it('should reset form to original values when Cancel button is clicked', async () => {
      render(<DesignArchitecture designId="1" />);

      const nameInput = screen.getByLabelText(/design name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Temporary Name');

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(nameInput).toHaveValue(mockDesignData.name);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByRole('button', { name: /save design/i })).toHaveAttribute('aria-label', 'Save design changes');
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveAttribute('aria-label', 'Cancel changes');
      expect(screen.getByRole('button', { name: /add material/i })).toHaveAttribute('aria-label', 'Add new material');
    });

    it('should have proper heading structure', () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByRole('heading', { name: /design architecture/i, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /blueprint preview/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /materials used/i, level: 2 })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });

      render(<DesignArchitecture designId="1" />);

      await user.tab();
      expect(screen.getByLabelText(/design name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/design description/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /save design/i })).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing blueprint data gracefully', () => {
      const noBlueprintData = { ...mockDesignData, blueprint: null };
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: noBlueprintData });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByText(/no blueprint available/i)).toBeInTheDocument();
    });

    it('should disable save button when no changes are made', () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByRole('button', { name: /save design/i })).toBeDisabled();
    });

    it('should show confirmation dialog when trying to navigate away with unsaved changes', async () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });

      render(<DesignArchitecture designId="1" />);

      const nameInput = screen.getByLabelText(/design name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Modified Name');

      // Simulate attempting to leave the page
      const leavePage = jest.fn();
      window.addEventListener('beforeunload', leavePage);

      fireEvent(window, new Event('beforeunload'));

      expect(leavePage).toHaveBeenCalled();
      expect(leavePage.mock.calls[0][0].returnValue).toBe('You have unsaved changes. Are you sure you want to leave?');
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useArchitectureData } from '../../hooks/useArchitectureData';
import { saveDesign } from '../../services/architectureService';
import { toast } from 'react-toastify';

// Mock external dependencies
jest.mock('../../hooks/useArchitectureData');
jest.mock('../../services/architectureService');
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseArchitectureData = useArchitectureData as jest.MockedFunction<typeof useArchitectureData>;
const mockSaveDesign = saveDesign as jest.MockedFunction<typeof saveDesign>;

const mockDesignData = {
  id: '1',
  name: 'Modern Villa',
  description: 'A contemporary villa design',
  blueprint: {
    url: 'modern-villa-blueprint.png',
    dimensions: { width: 2000, height: 1500 },
  },
  materials: ['concrete', 'glass', 'steel'],
  status: 'draft',
  lastModified: '2023-05-15T10:00:00Z',
};

const mockErrorData = {
  error: 'Failed to load design data',
};

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading States', () => {
    it('should display loading skeleton when data is being fetched', () => {
      mockUseArchitectureData.mockReturnValue({ loading: true, error: null, data: null });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByTestId('design-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('design-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('design-content')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: mockErrorData.error, data: null });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByTestId('design-error')).toHaveTextContent(mockErrorData.error);
      expect(screen.queryByTestId('design-skeleton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('design-content')).not.toBeInTheDocument();
    });

    it('should display error toast when save fails', async () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });
      mockSaveDesign.mockRejectedValue(new Error('Save failed'));

      render(<DesignArchitecture designId="1" />);

      await user.click(screen.getByRole('button', { name: /save design/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to save design: Save failed');
      });
    });
  });

  describe('Data Display', () => {
    it('should render design data correctly when loaded', () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByTestId('design-content')).toBeInTheDocument();
      expect(screen.getByText(mockDesignData.name)).toBeInTheDocument();
      expect(screen.getByText(mockDesignData.description)).toBeInTheDocument();
      expect(screen.getByAltText(/blueprint preview/i)).toHaveAttribute('src', mockDesignData.blueprint.url);

      const materialsList = screen.getByRole('list', { name: /materials used/i });
      mockDesignData.materials.forEach(material => {
        expect(within(materialsList).getByText(material)).toBeInTheDocument();
      });
    });

    it('should display "No materials specified" when materials array is empty', () => {
      const emptyMaterialsData = { ...mockDesignData, materials: [] };
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: emptyMaterialsData });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByText(/no materials specified/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });
    });

    it('should allow editing design name', async () => {
      render(<DesignArchitecture designId="1" />);

      const nameInput = screen.getByLabelText(/design name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Villa Name');

      expect(nameInput).toHaveValue('Updated Villa Name');
    });

    it('should allow editing design description', async () => {
      render(<DesignArchitecture designId="1" />);

      const descInput = screen.getByLabelText(/design description/i);
      await user.clear(descInput);
      await user.type(descInput, 'Updated description with more details');

      expect(descInput).toHaveValue('Updated description with more details');
    });

    it('should add new material when Add Material button is clicked', async () => {
      render(<DesignArchitecture designId="1" />);

      const addButton = screen.getByRole('button', { name: /add material/i });
      await user.click(addButton);

      const newMaterialInput = screen.getByLabelText(/new material/i);
      await user.type(newMaterialInput, 'wood');
      fireEvent.submit(newMaterialInput);

      expect(screen.getByText('wood')).toBeInTheDocument();
    });

    it('should remove material when remove button is clicked', async () => {
      render(<DesignArchitecture designId="1" />);

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      expect(screen.queryByText(mockDesignData.materials[0])).not.toBeInTheDocument();
    });

    it('should upload new blueprint when file is selected', async () => {
      const file = new File(['blueprint'], 'new-blueprint.png', { type: 'image/png' });
      render(<DesignArchitecture designId="1" />);

      const fileInput = screen.getByLabelText(/upload blueprint/i);
      await user.upload(fileInput, file);

      expect(fileInput).toHaveProperty('files', [file]);
    });

    it('should save design when Save button is clicked', async () => {
      mockSaveDesign.mockResolvedValue({ success: true });

      render(<DesignArchitecture designId="1" />);

      await user.click(screen.getByRole('button', { name: /save design/i }));

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalledWith(expect.objectContaining({
          id: mockDesignData.id,
        }));
        expect(toast.success).toHaveBeenCalledWith('Design saved successfully');
      });
    });

    it('should reset form to original values when Cancel button is clicked', async () => {
      render(<DesignArchitecture designId="1" />);

      const nameInput = screen.getByLabelText(/design name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Temporary Name');

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(nameInput).toHaveValue(mockDesignData.name);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByRole('button', { name: /save design/i })).toHaveAttribute('aria-label', 'Save design changes');
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveAttribute('aria-label', 'Cancel changes');
      expect(screen.getByRole('button', { name: /add material/i })).toHaveAttribute('aria-label', 'Add new material');
    });

    it('should have proper heading structure', () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByRole('heading', { name: /design architecture/i, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /blueprint preview/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /materials used/i, level: 2 })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });

      render(<DesignArchitecture designId="1" />);

      await user.tab();
      expect(screen.getByLabelText(/design name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/design description/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /save design/i })).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing blueprint data gracefully', () => {
      const noBlueprintData = { ...mockDesignData, blueprint: null };
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: noBlueprintData });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByText(/no blueprint available/i)).toBeInTheDocument();
    });

    it('should disable save button when no changes are made', () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });

      render(<DesignArchitecture designId="1" />);

      expect(screen.getByRole('button', { name: /save design/i })).toBeDisabled();
    });

    it('should show confirmation dialog when trying to navigate away with unsaved changes', async () => {
      mockUseArchitectureData.mockReturnValue({ loading: false, error: null, data: mockDesignData });

      render(<DesignArchitecture designId="1" />);

      const nameInput = screen.getByLabelText(/design name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Modified Name');

      // Simulate attempting to leave the page
      const leavePage = jest.fn();
      window.addEventListener('beforeunload', leavePage);

      fireEvent(window, new Event('beforeunload'));

      expect(leavePage).toHaveBeenCalled();
      expect(leavePage.mock.calls[0][0].returnValue).toBe('You have unsaved changes. Are you sure you want to leave?');
    });
  });
});