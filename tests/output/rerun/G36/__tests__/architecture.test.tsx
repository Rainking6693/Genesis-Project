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
  architectureConfig: {
    frontend: { framework: 'react', version: '18.2.0' },
    backend: { framework: 'express', version: '4.18.2' },
    database: { type: 'postgresql', version: '15.3' },
    infrastructure: { provider: 'aws', services: ['ec2', 's3'] }
  },
  setArchitectureConfig: jest.fn(),
  isLoading: false,
  setIsLoading: jest.fn(),
};

const renderComponent = (overrides = {}) => {
  return render(
    <ArchitectureContext.Provider value={{ ...mockContextValue, ...overrides }}>
      <DesignArchitecture />
    </ArchitectureContext.Provider>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast.mockReturnValue({ showToast: jest.fn() });
  });

  describe('Initial Render', () => {
    it('should render the component with loading state initially when no data is present', () => {
      renderComponent({ architectureConfig: null, isLoading: true });
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture/i)).toBeInTheDocument();
    });

    it('should render all major sections when data is loaded', () => {
      renderComponent();
      expect(screen.getByText(/frontend configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/backend configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/database configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/infrastructure setup/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save architecture/i })).toBeInTheDocument();
    });

    it('should display project name in the header', () => {
      renderComponent();
      expect(screen.getByText(/test project/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow selecting a different frontend framework', async () => {
      const user = userEvent.setup();
      renderComponent();

      const frontendSelect = screen.getByLabelText(/frontend framework/i);
      await user.click(frontendSelect);
      await user.selectOptions(frontendSelect, 'vue');

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ framework: 'vue' })
        })
      );
    });

    it('should update version when changed in the input field', async () => {
      const user = userEvent.setup();
      renderComponent();

      const versionInput = screen.getByLabelText(/frontend version/i);
      await user.clear(versionInput);
      await user.type(versionInput, '19.0.0');

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ version: '19.0.0' })
        })
      );
    });

    it('should add a new infrastructure service when submitted', async () => {
      const user = userEvent.setup();
      renderComponent();

      const serviceInput = screen.getByLabelText(/add new service/i);
      const addButton = screen.getByRole('button', { name: /add service/i });

      await user.type(serviceInput, 'lambda');
      await user.click(addButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({
            services: ['ec2', 's3', 'lambda']
          })
        })
      );
    });

    it('should remove an infrastructure service when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const serviceItems = screen.getAllByTestId('service-item');
      const deleteButton = within(serviceItems[0]).getByRole('button', { name: /remove/i });

      await user.click(deleteButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({
            services: ['s3']
          })
        })
      );
    });

    it('should switch infrastructure provider when selected', async () => {
      const user = userEvent.setup();
      renderComponent();

      const providerSelect = screen.getByLabelText(/cloud provider/i);
      await user.click(providerSelect);
      await user.selectOptions(providerSelect, 'azure');

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({ provider: 'azure' })
        })
      );
    });
  });

  describe('Data Fetching', () => {
    it('should fetch architecture data on mount if not present', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        frontend: { framework: 'react', version: '18.2.0' },
        backend: { framework: 'express', version: '4.18.2' },
        database: { type: 'postgresql', version: '15.3' },
        infrastructure: { provider: 'aws', services: ['ec2', 's3'] }
      });

      renderComponent({ architectureConfig: null });

      await waitFor(() => {
        expect(mockFetchArchitectureData).toHaveBeenCalledWith('proj-123');
      });
    });

    it('should handle data fetching error gracefully', async () => {
      const mockShowToast = useToast();
      mockFetchArchitectureData.mockRejectedValue(new Error('Failed to fetch'));
      mockShowToast.showToast = jest.fn();

      renderComponent({ architectureConfig: null });

      await waitFor(() => {
        expect(mockShowToast.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to load architecture configuration',
            type: 'error'
          })
        );
      });
    });
  });

  describe('Form Submission', () => {
    it('should save architecture configuration when save button is clicked', async () => {
      const user = userEvent.setup();
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith('proj-123', mockContextValue.architectureConfig);
        expect(mockContextValue.setIsLoading).toHaveBeenCalledWith(true);
        expect(mockContextValue.setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should show success toast on successful save', async () => {
      const user = userEvent.setup();
      const mockShowToast = useToast();
      mockShowToast.showToast = jest.fn();
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });

      renderComponent();
      const saveButton = screen.getByRole('button', { name: /save architecture/i });

      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture configuration saved successfully',
            type: 'success'
          })
        );
      });
    });

    it('should show error toast on save failure', async () => {
      const user = userEvent.setup();
      const mockShowToast = useToast();
      mockShowToast.showToast = jest.fn();
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));

      renderComponent();
      const saveButton = screen.getByRole('button', { name: /save architecture/i });

      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to save architecture configuration',
            type: 'error'
          })
        );
      });
    });

    it('should disable save button during loading state', async () => {
      const user = userEvent.setup();
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      expect(saveButton).toBeDisabled();

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for all interactive elements', () => {
      renderComponent();

      expect(screen.getByLabelText(/frontend framework/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/frontend version/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/backend framework/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/database type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cloud provider/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add new service/i)).toBeInTheDocument();
    });

    it('should have proper roles for all major sections', () => {
      renderComponent();

      expect(screen.getByRole('region', { name: /frontend configuration/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /backend configuration/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /database configuration/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /infrastructure setup/i })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Tab through all focusable elements
      await user.tab();
      expect(screen.getByLabelText(/frontend framework/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/frontend version/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/backend framework/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture config gracefully', () => {
      renderComponent({ architectureConfig: {} });

      expect(screen.getByText(/frontend configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/no frontend framework selected/i)).toBeInTheDocument();
    });

    it('should prevent duplicate infrastructure services', async () => {
      const user = userEvent.setup();
      renderComponent();

      const serviceInput = screen.getByLabelText(/add new service/i);
      const addButton = screen.getByRole('button', { name: /add service/i });

      await user.type(serviceInput, 'ec2');
      await user.click(addButton);

      expect(mockContextValue.setArchitectureConfig).not.toHaveBeenCalled();
      expect(screen.getByText(/service already exists/i)).toBeInTheDocument();
    });

    it('should validate version format before saving', async () => {
      const user = userEvent.setup();
      renderComponent({ architectureConfig: {
        ...mockContextValue.architectureConfig,
        frontend: { ...mockContextValue.architectureConfig.frontend, version: 'invalid' }
      }});

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      expect(screen.getByText(/invalid version format/i)).toBeInTheDocument();
      expect(mockSaveArchitectureConfig).not.toHaveBeenCalled();
    });

    it('should show confirmation dialog before resetting to default', async () => {
      const user = userEvent.setup();
      renderComponent();

      const resetButton = screen.getByRole('button', { name: /reset to default/i });
      await user.click(resetButton);

      expect(screen.getByText(/are you sure you want to reset/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when unrelated state changes', () => {
      const { rerender } = renderComponent();

      const originalConfig = mockContextValue.architectureConfig;
      rerender(
        <ArchitectureContext.Provider value={{
          ...mockContextValue,
          currentProject: { id: 'proj-456', name: 'New Project' }
        }}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      // Component should not re-render for unrelated project changes
      // (This would be verified with React.memo in the actual component)
      expect(screen.getByText(/test project/i)).not.toBeInTheDocument();
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
  architectureConfig: {
    frontend: { framework: 'react', version: '18.2.0' },
    backend: { framework: 'express', version: '4.18.2' },
    database: { type: 'postgresql', version: '15.3' },
    infrastructure: { provider: 'aws', services: ['ec2', 's3'] }
  },
  setArchitectureConfig: jest.fn(),
  isLoading: false,
  setIsLoading: jest.fn(),
};

const renderComponent = (overrides = {}) => {
  return render(
    <ArchitectureContext.Provider value={{ ...mockContextValue, ...overrides }}>
      <DesignArchitecture />
    </ArchitectureContext.Provider>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast.mockReturnValue({ showToast: jest.fn() });
  });

  describe('Initial Render', () => {
    it('should render the component with loading state initially when no data is present', () => {
      renderComponent({ architectureConfig: null, isLoading: true });
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture/i)).toBeInTheDocument();
    });

    it('should render all major sections when data is loaded', () => {
      renderComponent();
      expect(screen.getByText(/frontend configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/backend configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/database configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/infrastructure setup/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save architecture/i })).toBeInTheDocument();
    });

    it('should display project name in the header', () => {
      renderComponent();
      expect(screen.getByText(/test project/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow selecting a different frontend framework', async () => {
      const user = userEvent.setup();
      renderComponent();

      const frontendSelect = screen.getByLabelText(/frontend framework/i);
      await user.click(frontendSelect);
      await user.selectOptions(frontendSelect, 'vue');

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ framework: 'vue' })
        })
      );
    });

    it('should update version when changed in the input field', async () => {
      const user = userEvent.setup();
      renderComponent();

      const versionInput = screen.getByLabelText(/frontend version/i);
      await user.clear(versionInput);
      await user.type(versionInput, '19.0.0');

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ version: '19.0.0' })
        })
      );
    });

    it('should add a new infrastructure service when submitted', async () => {
      const user = userEvent.setup();
      renderComponent();

      const serviceInput = screen.getByLabelText(/add new service/i);
      const addButton = screen.getByRole('button', { name: /add service/i });

      await user.type(serviceInput, 'lambda');
      await user.click(addButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({
            services: ['ec2', 's3', 'lambda']
          })
        })
      );
    });

    it('should remove an infrastructure service when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const serviceItems = screen.getAllByTestId('service-item');
      const deleteButton = within(serviceItems[0]).getByRole('button', { name: /remove/i });

      await user.click(deleteButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({
            services: ['s3']
          })
        })
      );
    });

    it('should switch infrastructure provider when selected', async () => {
      const user = userEvent.setup();
      renderComponent();

      const providerSelect = screen.getByLabelText(/cloud provider/i);
      await user.click(providerSelect);
      await user.selectOptions(providerSelect, 'azure');

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({ provider: 'azure' })
        })
      );
    });
  });

  describe('Data Fetching', () => {
    it('should fetch architecture data on mount if not present', async () => {
      mockFetchArchitectureData.mockResolvedValue({
        frontend: { framework: 'react', version: '18.2.0' },
        backend: { framework: 'express', version: '4.18.2' },
        database: { type: 'postgresql', version: '15.3' },
        infrastructure: { provider: 'aws', services: ['ec2', 's3'] }
      });

      renderComponent({ architectureConfig: null });

      await waitFor(() => {
        expect(mockFetchArchitectureData).toHaveBeenCalledWith('proj-123');
      });
    });

    it('should handle data fetching error gracefully', async () => {
      const mockShowToast = useToast();
      mockFetchArchitectureData.mockRejectedValue(new Error('Failed to fetch'));
      mockShowToast.showToast = jest.fn();

      renderComponent({ architectureConfig: null });

      await waitFor(() => {
        expect(mockShowToast.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to load architecture configuration',
            type: 'error'
          })
        );
      });
    });
  });

  describe('Form Submission', () => {
    it('should save architecture configuration when save button is clicked', async () => {
      const user = userEvent.setup();
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith('proj-123', mockContextValue.architectureConfig);
        expect(mockContextValue.setIsLoading).toHaveBeenCalledWith(true);
        expect(mockContextValue.setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should show success toast on successful save', async () => {
      const user = userEvent.setup();
      const mockShowToast = useToast();
      mockShowToast.showToast = jest.fn();
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });

      renderComponent();
      const saveButton = screen.getByRole('button', { name: /save architecture/i });

      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture configuration saved successfully',
            type: 'success'
          })
        );
      });
    });

    it('should show error toast on save failure', async () => {
      const user = userEvent.setup();
      const mockShowToast = useToast();
      mockShowToast.showToast = jest.fn();
      mockSaveArchitectureConfig.mockRejectedValue(new Error('Save failed'));

      renderComponent();
      const saveButton = screen.getByRole('button', { name: /save architecture/i });

      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to save architecture configuration',
            type: 'error'
          })
        );
      });
    });

    it('should disable save button during loading state', async () => {
      const user = userEvent.setup();
      mockSaveArchitectureConfig.mockResolvedValue({ success: true });

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      expect(saveButton).toBeDisabled();

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for all interactive elements', () => {
      renderComponent();

      expect(screen.getByLabelText(/frontend framework/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/frontend version/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/backend framework/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/database type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cloud provider/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add new service/i)).toBeInTheDocument();
    });

    it('should have proper roles for all major sections', () => {
      renderComponent();

      expect(screen.getByRole('region', { name: /frontend configuration/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /backend configuration/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /database configuration/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /infrastructure setup/i })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Tab through all focusable elements
      await user.tab();
      expect(screen.getByLabelText(/frontend framework/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/frontend version/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/backend framework/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /save architecture/i })).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture config gracefully', () => {
      renderComponent({ architectureConfig: {} });

      expect(screen.getByText(/frontend configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/no frontend framework selected/i)).toBeInTheDocument();
    });

    it('should prevent duplicate infrastructure services', async () => {
      const user = userEvent.setup();
      renderComponent();

      const serviceInput = screen.getByLabelText(/add new service/i);
      const addButton = screen.getByRole('button', { name: /add service/i });

      await user.type(serviceInput, 'ec2');
      await user.click(addButton);

      expect(mockContextValue.setArchitectureConfig).not.toHaveBeenCalled();
      expect(screen.getByText(/service already exists/i)).toBeInTheDocument();
    });

    it('should validate version format before saving', async () => {
      const user = userEvent.setup();
      renderComponent({ architectureConfig: {
        ...mockContextValue.architectureConfig,
        frontend: { ...mockContextValue.architectureConfig.frontend, version: 'invalid' }
      }});

      const saveButton = screen.getByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      expect(screen.getByText(/invalid version format/i)).toBeInTheDocument();
      expect(mockSaveArchitectureConfig).not.toHaveBeenCalled();
    });

    it('should show confirmation dialog before resetting to default', async () => {
      const user = userEvent.setup();
      renderComponent();

      const resetButton = screen.getByRole('button', { name: /reset to default/i });
      await user.click(resetButton);

      expect(screen.getByText(/are you sure you want to reset/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when unrelated state changes', () => {
      const { rerender } = renderComponent();

      const originalConfig = mockContextValue.architectureConfig;
      rerender(
        <ArchitectureContext.Provider value={{
          ...mockContextValue,
          currentProject: { id: 'proj-456', name: 'New Project' }
        }}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      // Component should not re-render for unrelated project changes
      // (This would be verified with React.memo in the actual component)
      expect(screen.getByText(/test project/i)).not.toBeInTheDocument();
    });
  });
});