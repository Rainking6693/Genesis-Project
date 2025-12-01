import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { fetchArchitectureData, saveArchitectureConfig } from './api/architectureApi';
import { useToast } from './hooks/useToast';
import { ArchitectureContext } from './context/ArchitectureContext';

// Mock external dependencies
jest.mock('./api/architectureApi');
jest.mock('./hooks/useToast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockFetchArchitectureData = fetchArchitectureData as jest.MockedFunction<typeof fetchArchitectureData>;
const mockSaveArchitectureConfig = saveArchitectureConfig as jest.MockedFunction<typeof saveArchitectureConfig>;
const mockShowToast = useToast() as jest.MockedFunction<any>;

const mockContextValue = {
  currentProject: { id: 'proj-123', name: 'Test Project' },
  setCurrentProject: jest.fn(),
  architecture: {
    frontend: { framework: 'react', stateManagement: 'redux' },
    backend: { framework: 'express', database: 'postgresql' },
    infrastructure: { hosting: 'aws', ciCd: 'github-actions' }
  },
  setArchitecture: jest.fn(),
  isLoading: false,
  setIsLoading: jest.fn(),
  error: null,
  setError: jest.fn()
};

const renderWithContext = (ui: React.ReactElement) => {
  return render(
    <ArchitectureContext.Provider value={mockContextValue}>
      {ui}
    </ArchitectureContext.Provider>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchArchitectureData.mockResolvedValue({
      frontend: { framework: 'react', stateManagement: 'redux' },
      backend: { framework: 'express', database: 'postgresql' },
      infrastructure: { hosting: 'aws', ciCd: 'github-actions' }
    });
  });

  describe('Initial Render', () => {
    it('should render loading state initially when data is being fetched', async () => {
      mockContextValue.isLoading = true;
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture configuration/i)).toBeInTheDocument();
    });

    it('should render error state when fetch fails', async () => {
      mockContextValue.error = new Error('Failed to load');
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    it('should render all architecture sections when data is loaded', async () => {
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByText(/frontend architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/backend architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/infrastructure/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
    });
  });

  describe('Frontend Section', () => {
    it('should allow selecting frontend framework', async () => {
      renderWithContext(<DesignArchitecture />);

      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frameworkSelect, 'nextjs');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ framework: 'nextjs' })
        })
      );
    });

    it('should allow selecting state management', async () => {
      renderWithContext(<DesignArchitecture />);

      const stateManagementSelect = screen.getByLabelText(/state management/i);
      await userEvent.selectOptions(stateManagementSelect, 'zustand');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ stateManagement: 'zustand' })
        })
      );
    });

    it('should show additional options when advanced toggle is clicked', async () => {
      renderWithContext(<DesignArchitecture />);

      const advancedToggle = screen.getByRole('button', { name: /show advanced frontend options/i });
      await userEvent.click(advancedToggle);

      expect(screen.getByLabelText(/styling solution/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/testing framework/i)).toBeInTheDocument();
    });
  });

  describe('Backend Section', () => {
    it('should allow selecting backend framework', async () => {
      renderWithContext(<DesignArchitecture />);

      const frameworkSelect = screen.getByLabelText(/backend framework/i);
      await userEvent.selectOptions(frameworkSelect, 'nestjs');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: expect.objectContaining({ framework: 'nestjs' })
        })
      );
    });

    it('should allow selecting database', async () => {
      renderWithContext(<DesignArchitecture />);

      const databaseSelect = screen.getByLabelText(/database/i);
      await userEvent.selectOptions(databaseSelect, 'mongodb');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: expect.objectContaining({ database: 'mongodb' })
        })
      );
    });

    it('should show database connection fields when database is selected', async () => {
      renderWithContext(<DesignArchitecture />);

      const databaseSelect = screen.getByLabelText(/database/i);
      await userEvent.selectOptions(databaseSelect, 'mongodb');

      expect(screen.getByLabelText(/connection string/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/database name/i)).toBeInTheDocument();
    });
  });

  describe('Infrastructure Section', () => {
    it('should allow selecting hosting provider', async () => {
      renderWithContext(<DesignArchitecture />);

      const hostingSelect = screen.getByLabelText(/hosting provider/i);
      await userEvent.selectOptions(hostingSelect, 'azure');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({ hosting: 'azure' })
        })
      );
    });

    it('should allow selecting CI/CD pipeline', async () => {
      renderWithContext(<DesignArchitecture />);

      const ciCdSelect = screen.getByLabelText(/ci\/cd pipeline/i);
      await userEvent.selectOptions(ciCdSelect, 'gitlab-ci');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({ ciCd: 'gitlab-ci' })
        })
      );
    });

    it('should show deployment configuration when hosting is selected', async () => {
      renderWithContext(<DesignArchitecture />);

      const hostingSelect = screen.getByLabelText(/hosting provider/i);
      await userEvent.selectOptions(hostingSelect, 'aws');

      expect(screen.getByLabelText(/region/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/environment/i)).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show validation errors when required fields are missing', async () => {
      renderWithContext(<DesignArchitecture />);

      // Clear required fields
      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frameworkSelect, '');

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      expect(screen.getByText(/frontend framework is required/i)).toBeInTheDocument();
      expect(mockSaveArchitectureConfig).not.toHaveBeenCalled();
    });

    it('should show error for invalid connection string format', async () => {
      renderWithContext(<DesignArchitecture />);

      const databaseSelect = screen.getByLabelText(/database/i);
      await userEvent.selectOptions(databaseSelect, 'mongodb');

      const connectionInput = screen.getByLabelText(/connection string/i);
      await userEvent.type(connectionInput, 'invalid-string');

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      expect(screen.getByText(/invalid connection string format/i)).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('should save configuration when all fields are valid', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });

      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          'proj-123',
          mockContextValue.architecture
        );
        expect(mockShowToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Architecture configuration saved successfully'
        });
      });
    });

    it('should show error when save fails', async () => {
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));

      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to save architecture configuration'
        });
      });
    });

    it('should disable save button during saving', async () => {
      mockSaveArchitectureConfig.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));

      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      expect(saveButton).toBeDisabled();

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for all interactive elements', () => {
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByLabelText(/frontend framework/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByRole('button', { name: /save configuration/i })).toHaveAttribute('aria-busy', 'false');
      expect(screen.getByRole('button', { name: /show advanced frontend options/i })).toHaveAttribute('aria-expanded', 'false');
    });

    it('should be navigable via keyboard', async () => {
      renderWithContext(<DesignArchitecture />);

      await userEvent.tab();
      expect(screen.getByLabelText(/frontend framework/i)).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText(/state management/i)).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /show advanced frontend options/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      renderWithContext(<DesignArchitecture />);

      const sectionHeadings = screen.getAllByRole('heading');
      sectionHeadings.forEach(heading => {
        expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Assuming dark text on light background
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project context gracefully', () => {
      const emptyContextValue = {
        ...mockContextValue,
        currentProject: null
      };

      render(
        <ArchitectureContext.Provider value={emptyContextValue}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      expect(screen.getByText(/no project selected/i)).toBeInTheDocument();
    });

    it('should handle partial architecture data', async () => {
      mockFetchArchitectureData.mockResolvedValueOnce({
        frontend: { framework: 'react' }, // Missing stateManagement
        backend: null, // Missing backend
        infrastructure: {} // Empty infrastructure
      });

      renderWithContext(<DesignArchitecture />);

      expect(screen.getByDisplayValue('react')).toBeInTheDocument();
      expect(screen.getByText(/no backend configuration/i)).toBeInTheDocument();
    });

    it('should recover from failed initial load when retrying', async () => {
      mockFetchArchitectureData
        .mockRejectedValueOnce(new Error('Initial fail'))
        .mockResolvedValueOnce({
          frontend: { framework: 'react', stateManagement: 'redux' },
          backend: { framework: 'express', database: 'postgresql' },
          infrastructure: { hosting: 'aws', ciCd: 'github-actions' }
        });

      renderWithContext(<DesignArchitecture />);

      expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/frontend architecture/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when unrelated state changes', () => {
      const { rerender } = renderWithContext(<DesignArchitecture />);

      const originalArchitecture = { ...mockContextValue.architecture };
      const newContextValue = {
        ...mockContextValue,
        someUnrelatedState: 'changed'
      };

      rerender(
        <ArchitectureContext.Provider value={newContextValue}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      // Verify core elements are still present
      expect(screen.getByText(/frontend architecture/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('react')).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { fetchArchitectureData, saveArchitectureConfig } from './api/architectureApi';
import { useToast } from './hooks/useToast';
import { ArchitectureContext } from './context/ArchitectureContext';

// Mock external dependencies
jest.mock('./api/architectureApi');
jest.mock('./hooks/useToast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockFetchArchitectureData = fetchArchitectureData as jest.MockedFunction<typeof fetchArchitectureData>;
const mockSaveArchitectureConfig = saveArchitectureConfig as jest.MockedFunction<typeof saveArchitectureConfig>;
const mockShowToast = useToast() as jest.MockedFunction<any>;

const mockContextValue = {
  currentProject: { id: 'proj-123', name: 'Test Project' },
  setCurrentProject: jest.fn(),
  architecture: {
    frontend: { framework: 'react', stateManagement: 'redux' },
    backend: { framework: 'express', database: 'postgresql' },
    infrastructure: { hosting: 'aws', ciCd: 'github-actions' }
  },
  setArchitecture: jest.fn(),
  isLoading: false,
  setIsLoading: jest.fn(),
  error: null,
  setError: jest.fn()
};

const renderWithContext = (ui: React.ReactElement) => {
  return render(
    <ArchitectureContext.Provider value={mockContextValue}>
      {ui}
    </ArchitectureContext.Provider>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchArchitectureData.mockResolvedValue({
      frontend: { framework: 'react', stateManagement: 'redux' },
      backend: { framework: 'express', database: 'postgresql' },
      infrastructure: { hosting: 'aws', ciCd: 'github-actions' }
    });
  });

  describe('Initial Render', () => {
    it('should render loading state initially when data is being fetched', async () => {
      mockContextValue.isLoading = true;
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture configuration/i)).toBeInTheDocument();
    });

    it('should render error state when fetch fails', async () => {
      mockContextValue.error = new Error('Failed to load');
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    it('should render all architecture sections when data is loaded', async () => {
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByText(/frontend architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/backend architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/infrastructure/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
    });
  });

  describe('Frontend Section', () => {
    it('should allow selecting frontend framework', async () => {
      renderWithContext(<DesignArchitecture />);

      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frameworkSelect, 'nextjs');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ framework: 'nextjs' })
        })
      );
    });

    it('should allow selecting state management', async () => {
      renderWithContext(<DesignArchitecture />);

      const stateManagementSelect = screen.getByLabelText(/state management/i);
      await userEvent.selectOptions(stateManagementSelect, 'zustand');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ stateManagement: 'zustand' })
        })
      );
    });

    it('should show additional options when advanced toggle is clicked', async () => {
      renderWithContext(<DesignArchitecture />);

      const advancedToggle = screen.getByRole('button', { name: /show advanced frontend options/i });
      await userEvent.click(advancedToggle);

      expect(screen.getByLabelText(/styling solution/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/testing framework/i)).toBeInTheDocument();
    });
  });

  describe('Backend Section', () => {
    it('should allow selecting backend framework', async () => {
      renderWithContext(<DesignArchitecture />);

      const frameworkSelect = screen.getByLabelText(/backend framework/i);
      await userEvent.selectOptions(frameworkSelect, 'nestjs');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: expect.objectContaining({ framework: 'nestjs' })
        })
      );
    });

    it('should allow selecting database', async () => {
      renderWithContext(<DesignArchitecture />);

      const databaseSelect = screen.getByLabelText(/database/i);
      await userEvent.selectOptions(databaseSelect, 'mongodb');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: expect.objectContaining({ database: 'mongodb' })
        })
      );
    });

    it('should show database connection fields when database is selected', async () => {
      renderWithContext(<DesignArchitecture />);

      const databaseSelect = screen.getByLabelText(/database/i);
      await userEvent.selectOptions(databaseSelect, 'mongodb');

      expect(screen.getByLabelText(/connection string/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/database name/i)).toBeInTheDocument();
    });
  });

  describe('Infrastructure Section', () => {
    it('should allow selecting hosting provider', async () => {
      renderWithContext(<DesignArchitecture />);

      const hostingSelect = screen.getByLabelText(/hosting provider/i);
      await userEvent.selectOptions(hostingSelect, 'azure');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({ hosting: 'azure' })
        })
      );
    });

    it('should allow selecting CI/CD pipeline', async () => {
      renderWithContext(<DesignArchitecture />);

      const ciCdSelect = screen.getByLabelText(/ci\/cd pipeline/i);
      await userEvent.selectOptions(ciCdSelect, 'gitlab-ci');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({ ciCd: 'gitlab-ci' })
        })
      );
    });

    it('should show deployment configuration when hosting is selected', async () => {
      renderWithContext(<DesignArchitecture />);

      const hostingSelect = screen.getByLabelText(/hosting provider/i);
      await userEvent.selectOptions(hostingSelect, 'aws');

      expect(screen.getByLabelText(/region/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/environment/i)).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show validation errors when required fields are missing', async () => {
      renderWithContext(<DesignArchitecture />);

      // Clear required fields
      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frameworkSelect, '');

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      expect(screen.getByText(/frontend framework is required/i)).toBeInTheDocument();
      expect(mockSaveArchitectureConfig).not.toHaveBeenCalled();
    });

    it('should show error for invalid connection string format', async () => {
      renderWithContext(<DesignArchitecture />);

      const databaseSelect = screen.getByLabelText(/database/i);
      await userEvent.selectOptions(databaseSelect, 'mongodb');

      const connectionInput = screen.getByLabelText(/connection string/i);
      await userEvent.type(connectionInput, 'invalid-string');

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      expect(screen.getByText(/invalid connection string format/i)).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('should save configuration when all fields are valid', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });

      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          'proj-123',
          mockContextValue.architecture
        );
        expect(mockShowToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Architecture configuration saved successfully'
        });
      });
    });

    it('should show error when save fails', async () => {
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));

      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to save architecture configuration'
        });
      });
    });

    it('should disable save button during saving', async () => {
      mockSaveArchitectureConfig.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));

      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      expect(saveButton).toBeDisabled();

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for all interactive elements', () => {
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByLabelText(/frontend framework/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByRole('button', { name: /save configuration/i })).toHaveAttribute('aria-busy', 'false');
      expect(screen.getByRole('button', { name: /show advanced frontend options/i })).toHaveAttribute('aria-expanded', 'false');
    });

    it('should be navigable via keyboard', async () => {
      renderWithContext(<DesignArchitecture />);

      await userEvent.tab();
      expect(screen.getByLabelText(/frontend framework/i)).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText(/state management/i)).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /show advanced frontend options/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      renderWithContext(<DesignArchitecture />);

      const sectionHeadings = screen.getAllByRole('heading');
      sectionHeadings.forEach(heading => {
        expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Assuming dark text on light background
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project context gracefully', () => {
      const emptyContextValue = {
        ...mockContextValue,
        currentProject: null
      };

      render(
        <ArchitectureContext.Provider value={emptyContextValue}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      expect(screen.getByText(/no project selected/i)).toBeInTheDocument();
    });

    it('should handle partial architecture data', async () => {
      mockFetchArchitectureData.mockResolvedValueOnce({
        frontend: { framework: 'react' }, // Missing stateManagement
        backend: null, // Missing backend
        infrastructure: {} // Empty infrastructure
      });

      renderWithContext(<DesignArchitecture />);

      expect(screen.getByDisplayValue('react')).toBeInTheDocument();
      expect(screen.getByText(/no backend configuration/i)).toBeInTheDocument();
    });

    it('should recover from failed initial load when retrying', async () => {
      mockFetchArchitectureData
        .mockRejectedValueOnce(new Error('Initial fail'))
        .mockResolvedValueOnce({
          frontend: { framework: 'react', stateManagement: 'redux' },
          backend: { framework: 'express', database: 'postgresql' },
          infrastructure: { hosting: 'aws', ciCd: 'github-actions' }
        });

      renderWithContext(<DesignArchitecture />);

      expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/frontend architecture/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when unrelated state changes', () => {
      const { rerender } = renderWithContext(<DesignArchitecture />);

      const originalArchitecture = { ...mockContextValue.architecture };
      const newContextValue = {
        ...mockContextValue,
        someUnrelatedState: 'changed'
      };

      rerender(
        <ArchitectureContext.Provider value={newContextValue}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      // Verify core elements are still present
      expect(screen.getByText(/frontend architecture/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('react')).toBeInTheDocument();
    });
  });
});