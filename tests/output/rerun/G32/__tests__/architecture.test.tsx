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
const mockShowToast = useToast as jest.MockedFunction<typeof useToast>;

const mockContextValue = {
  currentProject: { id: 'proj-123', name: 'Test Project' },
  setCurrentProject: jest.fn(),
  architecture: {
    frontend: { framework: 'react', stateManagement: 'redux' },
    backend: { language: 'node', database: 'postgresql' },
    infrastructure: { cloud: 'aws', deployment: 'docker' }
  },
  setArchitecture: jest.fn(),
  isLoading: false,
  error: null
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
    mockShowToast.mockReturnValue({ showToast: jest.fn() });
  });

  describe('Initial Render', () => {
    it('should render loading state when data is being fetched', () => {
      mockContextValue.isLoading = true;
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture configuration/i)).toBeInTheDocument();
    });

    it('should render error state when fetch fails', () => {
      mockContextValue.error = new Error('Failed to load');
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    it('should render the component with all sections when data is loaded', () => {
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /design system architecture/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /frontend configuration/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /backend configuration/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /infrastructure setup/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
    });
  });

  describe('Frontend Configuration', () => {
    it('should allow selecting frontend framework', async () => {
      renderWithContext(<DesignArchitecture />);

      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frameworkSelect, 'vue');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ framework: 'vue' })
        })
      );
    });

    it('should allow selecting state management', async () => {
      renderWithContext(<DesignArchitecture />);

      const stateSelect = screen.getByLabelText(/state management/i);
      await userEvent.selectOptions(stateSelect, 'zustand');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ stateManagement: 'zustand' })
        })
      );
    });

    it('should show additional options when framework is selected', async () => {
      renderWithContext(<DesignArchitecture />);

      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frameworkSelect, 'react');

      expect(screen.getByLabelText(/react version/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/routing library/i)).toBeInTheDocument();
    });
  });

  describe('Backend Configuration', () => {
    it('should allow selecting backend language', async () => {
      renderWithContext(<DesignArchitecture />);

      const languageSelect = screen.getByLabelText(/backend language/i);
      await userEvent.selectOptions(languageSelect, 'python');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: expect.objectContaining({ language: 'python' })
        })
      );
    });

    it('should allow selecting database', async () => {
      renderWithContext(<DesignArchitecture />);

      const dbSelect = screen.getByLabelText(/database/i);
      await userEvent.selectOptions(dbSelect, 'mongodb');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: expect.objectContaining({ database: 'mongodb' })
        })
      );
    });

    it('should show API framework options when language is selected', async () => {
      renderWithContext(<DesignArchitecture />);

      const languageSelect = screen.getByLabelText(/backend language/i);
      await userEvent.selectOptions(languageSelect, 'node');

      expect(screen.getByLabelText(/api framework/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/node version/i)).toBeInTheDocument();
    });
  });

  describe('Infrastructure Configuration', () => {
    it('should allow selecting cloud provider', async () => {
      renderWithContext(<DesignArchitecture />);

      const cloudSelect = screen.getByLabelText(/cloud provider/i);
      await userEvent.selectOptions(cloudSelect, 'azure');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({ cloud: 'azure' })
        })
      );
    });

    it('should allow selecting deployment strategy', async () => {
      renderWithContext(<DesignArchitecture />);

      const deploymentSelect = screen.getByLabelText(/deployment strategy/i);
      await userEvent.selectOptions(deploymentSelect, 'kubernetes');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({ deployment: 'kubernetes' })
        })
      );
    });

    it('should show region options when cloud provider is selected', async () => {
      renderWithContext(<DesignArchitecture />);

      const cloudSelect = screen.getByLabelText(/cloud provider/i);
      await userEvent.selectOptions(cloudSelect, 'aws');

      expect(screen.getByLabelText(/aws region/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/availability zones/i)).toBeInTheDocument();
    });
  });

  describe('Validation and Error Handling', () => {
    it('should show validation errors when required fields are missing', async () => {
      renderWithContext(<DesignArchitecture />);

      // Clear required fields
      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frameworkSelect, '');

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      expect(await screen.findByText(/frontend framework is required/i)).toBeInTheDocument();
      expect(mockSaveArchitectureConfig).not.toHaveBeenCalled();
    });

    it('should show error when API call fails', async () => {
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));
      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save architecture configuration/i)).toBeInTheDocument();
      });
    });
  });

  describe('Save Configuration', () => {
    it('should call save API when form is valid', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });
      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          'proj-123',
          mockContextValue.architecture
        );
      });
    });

    it('should show success message when save is successful', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });
      const { showToast } = mockShowToast();
      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture configuration saved successfully',
            type: 'success'
          })
        );
      });
    });

    it('should disable save button during submission', async () => {
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
    it('should have proper ARIA attributes for form elements', () => {
      renderWithContext(<DesignArchitecture />);

      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      expect(frameworkSelect).toHaveAttribute('aria-required', 'true');
      expect(frameworkSelect).toHaveAccessibleName();

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      expect(saveButton).toHaveAccessibleName();
      expect(saveButton).not.toHaveAttribute('aria-disabled');
    });

    it('should have proper heading structure', () => {
      renderWithContext(<DesignArchitecture />);

      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(4);

      const [mainHeading, frontendHeading, backendHeading, infraHeading] = headings;
      expect(mainHeading).toHaveTextContent(/design system architecture/i);
      expect(mainHeading).toHaveAttribute('aria-level', '1');

      expect(frontendHeading).toHaveTextContent(/frontend configuration/i);
      expect(frontendHeading).toHaveAttribute('aria-level', '2');
    });

    it('should have proper keyboard navigation', async () => {
      renderWithContext(<DesignArchitecture />);

      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      frameworkSelect.focus();

      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{Enter}');

      expect(mockContextValue.setArchitecture).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project context', () => {
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

    it('should handle partial architecture data', () => {
      const partialContextValue = {
        ...mockContextValue,
        architecture: {
          frontend: { framework: 'react' },
          backend: {},
          infrastructure: {}
        }
      };

      render(
        <ArchitectureContext.Provider value={partialContextValue}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      expect(screen.getByLabelText(/frontend framework/i)).toHaveValue('react');
      expect(screen.getByLabelText(/backend language/i)).toHaveValue('');
    });

    it('should reset form when project changes', () => {
      const { rerender } = renderWithContext(<DesignArchitecture />);

      const newContextValue = {
        ...mockContextValue,
        currentProject: { id: 'proj-456', name: 'New Project' },
        architecture: {
          frontend: { framework: 'vue' },
          backend: { language: 'python' },
          infrastructure: { cloud: 'gcp' }
        }
      };

      rerender(
        <ArchitectureContext.Provider value={newContextValue}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      expect(screen.getByLabelText(/frontend framework/i)).toHaveValue('vue');
      expect(screen.getByLabelText(/backend language/i)).toHaveValue('python');
    });
  });

  describe('Visualization Section', () => {
    it('should render architecture diagram when data is complete', () => {
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByRole('img', { name: /architecture diagram/i })).toBeInTheDocument();
      expect(screen.getByText(/current architecture visualization/i)).toBeInTheDocument();
    });

    it('should show placeholder when diagram cannot be rendered', () => {
      const contextWithEmptyArch = {
        ...mockContextValue,
        architecture: {
          frontend: {},
          backend: {},
          infrastructure: {}
        }
      };

      render(
        <ArchitectureContext.Provider value={contextWithEmptyArch}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      expect(screen.getByText(/complete the configuration to see visualization/i)).toBeInTheDocument();
    });

    it('should update diagram when configuration changes', async () => {
      renderWithContext(<DesignArchitecture />);

      const initialDiagram = screen.getByRole('img', { name: /architecture diagram/i });
      const initialSrc = initialDiagram.getAttribute('src');

      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frameworkSelect, 'vue');

      const updatedDiagram = screen.getByRole('img', { name: /architecture diagram/i });
      const updatedSrc = updatedDiagram.getAttribute('src');

      expect(updatedSrc).not.toBe(initialSrc);
    });
  });

  describe('Advanced Options', () => {
    it('should toggle advanced options section', async () => {
      renderWithContext(<DesignArchitecture />);

      const advancedToggle = screen.getByRole('button', { name: /advanced options/i });
      await userEvent.click(advancedToggle);

      expect(screen.getByRole('heading', { name: /advanced configuration/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/caching strategy/i)).toBeInTheDocument();
    });

    it('should save advanced options with main configuration', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });
      renderWithContext(<DesignArchitecture />);

      const advancedToggle = screen.getByRole('button', { name: /advanced options/i });
      await userEvent.click(advancedToggle);

      const cachingSelect = screen.getByLabelText(/caching strategy/i);
      await userEvent.selectOptions(cachingSelect, 'redis');

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          'proj-123',
          expect.objectContaining({
            advanced: expect.objectContaining({ caching: 'redis' })
          })
        );
      });
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
const mockShowToast = useToast as jest.MockedFunction<typeof useToast>;

const mockContextValue = {
  currentProject: { id: 'proj-123', name: 'Test Project' },
  setCurrentProject: jest.fn(),
  architecture: {
    frontend: { framework: 'react', stateManagement: 'redux' },
    backend: { language: 'node', database: 'postgresql' },
    infrastructure: { cloud: 'aws', deployment: 'docker' }
  },
  setArchitecture: jest.fn(),
  isLoading: false,
  error: null
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
    mockShowToast.mockReturnValue({ showToast: jest.fn() });
  });

  describe('Initial Render', () => {
    it('should render loading state when data is being fetched', () => {
      mockContextValue.isLoading = true;
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture configuration/i)).toBeInTheDocument();
    });

    it('should render error state when fetch fails', () => {
      mockContextValue.error = new Error('Failed to load');
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByText(/error loading architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    it('should render the component with all sections when data is loaded', () => {
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /design system architecture/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /frontend configuration/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /backend configuration/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /infrastructure setup/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
    });
  });

  describe('Frontend Configuration', () => {
    it('should allow selecting frontend framework', async () => {
      renderWithContext(<DesignArchitecture />);

      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frameworkSelect, 'vue');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ framework: 'vue' })
        })
      );
    });

    it('should allow selecting state management', async () => {
      renderWithContext(<DesignArchitecture />);

      const stateSelect = screen.getByLabelText(/state management/i);
      await userEvent.selectOptions(stateSelect, 'zustand');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ stateManagement: 'zustand' })
        })
      );
    });

    it('should show additional options when framework is selected', async () => {
      renderWithContext(<DesignArchitecture />);

      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frameworkSelect, 'react');

      expect(screen.getByLabelText(/react version/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/routing library/i)).toBeInTheDocument();
    });
  });

  describe('Backend Configuration', () => {
    it('should allow selecting backend language', async () => {
      renderWithContext(<DesignArchitecture />);

      const languageSelect = screen.getByLabelText(/backend language/i);
      await userEvent.selectOptions(languageSelect, 'python');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: expect.objectContaining({ language: 'python' })
        })
      );
    });

    it('should allow selecting database', async () => {
      renderWithContext(<DesignArchitecture />);

      const dbSelect = screen.getByLabelText(/database/i);
      await userEvent.selectOptions(dbSelect, 'mongodb');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: expect.objectContaining({ database: 'mongodb' })
        })
      );
    });

    it('should show API framework options when language is selected', async () => {
      renderWithContext(<DesignArchitecture />);

      const languageSelect = screen.getByLabelText(/backend language/i);
      await userEvent.selectOptions(languageSelect, 'node');

      expect(screen.getByLabelText(/api framework/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/node version/i)).toBeInTheDocument();
    });
  });

  describe('Infrastructure Configuration', () => {
    it('should allow selecting cloud provider', async () => {
      renderWithContext(<DesignArchitecture />);

      const cloudSelect = screen.getByLabelText(/cloud provider/i);
      await userEvent.selectOptions(cloudSelect, 'azure');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({ cloud: 'azure' })
        })
      );
    });

    it('should allow selecting deployment strategy', async () => {
      renderWithContext(<DesignArchitecture />);

      const deploymentSelect = screen.getByLabelText(/deployment strategy/i);
      await userEvent.selectOptions(deploymentSelect, 'kubernetes');

      expect(mockContextValue.setArchitecture).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({ deployment: 'kubernetes' })
        })
      );
    });

    it('should show region options when cloud provider is selected', async () => {
      renderWithContext(<DesignArchitecture />);

      const cloudSelect = screen.getByLabelText(/cloud provider/i);
      await userEvent.selectOptions(cloudSelect, 'aws');

      expect(screen.getByLabelText(/aws region/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/availability zones/i)).toBeInTheDocument();
    });
  });

  describe('Validation and Error Handling', () => {
    it('should show validation errors when required fields are missing', async () => {
      renderWithContext(<DesignArchitecture />);

      // Clear required fields
      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frameworkSelect, '');

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      expect(await screen.findByText(/frontend framework is required/i)).toBeInTheDocument();
      expect(mockSaveArchitectureConfig).not.toHaveBeenCalled();
    });

    it('should show error when API call fails', async () => {
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));
      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save architecture configuration/i)).toBeInTheDocument();
      });
    });
  });

  describe('Save Configuration', () => {
    it('should call save API when form is valid', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });
      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          'proj-123',
          mockContextValue.architecture
        );
      });
    });

    it('should show success message when save is successful', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });
      const { showToast } = mockShowToast();
      renderWithContext(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture configuration saved successfully',
            type: 'success'
          })
        );
      });
    });

    it('should disable save button during submission', async () => {
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
    it('should have proper ARIA attributes for form elements', () => {
      renderWithContext(<DesignArchitecture />);

      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      expect(frameworkSelect).toHaveAttribute('aria-required', 'true');
      expect(frameworkSelect).toHaveAccessibleName();

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      expect(saveButton).toHaveAccessibleName();
      expect(saveButton).not.toHaveAttribute('aria-disabled');
    });

    it('should have proper heading structure', () => {
      renderWithContext(<DesignArchitecture />);

      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(4);

      const [mainHeading, frontendHeading, backendHeading, infraHeading] = headings;
      expect(mainHeading).toHaveTextContent(/design system architecture/i);
      expect(mainHeading).toHaveAttribute('aria-level', '1');

      expect(frontendHeading).toHaveTextContent(/frontend configuration/i);
      expect(frontendHeading).toHaveAttribute('aria-level', '2');
    });

    it('should have proper keyboard navigation', async () => {
      renderWithContext(<DesignArchitecture />);

      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      frameworkSelect.focus();

      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{Enter}');

      expect(mockContextValue.setArchitecture).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project context', () => {
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

    it('should handle partial architecture data', () => {
      const partialContextValue = {
        ...mockContextValue,
        architecture: {
          frontend: { framework: 'react' },
          backend: {},
          infrastructure: {}
        }
      };

      render(
        <ArchitectureContext.Provider value={partialContextValue}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      expect(screen.getByLabelText(/frontend framework/i)).toHaveValue('react');
      expect(screen.getByLabelText(/backend language/i)).toHaveValue('');
    });

    it('should reset form when project changes', () => {
      const { rerender } = renderWithContext(<DesignArchitecture />);

      const newContextValue = {
        ...mockContextValue,
        currentProject: { id: 'proj-456', name: 'New Project' },
        architecture: {
          frontend: { framework: 'vue' },
          backend: { language: 'python' },
          infrastructure: { cloud: 'gcp' }
        }
      };

      rerender(
        <ArchitectureContext.Provider value={newContextValue}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      expect(screen.getByLabelText(/frontend framework/i)).toHaveValue('vue');
      expect(screen.getByLabelText(/backend language/i)).toHaveValue('python');
    });
  });

  describe('Visualization Section', () => {
    it('should render architecture diagram when data is complete', () => {
      renderWithContext(<DesignArchitecture />);

      expect(screen.getByRole('img', { name: /architecture diagram/i })).toBeInTheDocument();
      expect(screen.getByText(/current architecture visualization/i)).toBeInTheDocument();
    });

    it('should show placeholder when diagram cannot be rendered', () => {
      const contextWithEmptyArch = {
        ...mockContextValue,
        architecture: {
          frontend: {},
          backend: {},
          infrastructure: {}
        }
      };

      render(
        <ArchitectureContext.Provider value={contextWithEmptyArch}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      expect(screen.getByText(/complete the configuration to see visualization/i)).toBeInTheDocument();
    });

    it('should update diagram when configuration changes', async () => {
      renderWithContext(<DesignArchitecture />);

      const initialDiagram = screen.getByRole('img', { name: /architecture diagram/i });
      const initialSrc = initialDiagram.getAttribute('src');

      const frameworkSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frameworkSelect, 'vue');

      const updatedDiagram = screen.getByRole('img', { name: /architecture diagram/i });
      const updatedSrc = updatedDiagram.getAttribute('src');

      expect(updatedSrc).not.toBe(initialSrc);
    });
  });

  describe('Advanced Options', () => {
    it('should toggle advanced options section', async () => {
      renderWithContext(<DesignArchitecture />);

      const advancedToggle = screen.getByRole('button', { name: /advanced options/i });
      await userEvent.click(advancedToggle);

      expect(screen.getByRole('heading', { name: /advanced configuration/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/caching strategy/i)).toBeInTheDocument();
    });

    it('should save advanced options with main configuration', async () => {
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });
      renderWithContext(<DesignArchitecture />);

      const advancedToggle = screen.getByRole('button', { name: /advanced options/i });
      await userEvent.click(advancedToggle);

      const cachingSelect = screen.getByLabelText(/caching strategy/i);
      await userEvent.selectOptions(cachingSelect, 'redis');

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          'proj-123',
          expect.objectContaining({
            advanced: expect.objectContaining({ caching: 'redis' })
          })
        );
      });
    });
  });
});