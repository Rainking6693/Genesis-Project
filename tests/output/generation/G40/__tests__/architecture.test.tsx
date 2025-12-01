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

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast.mockReturnValue({ showToast: jest.fn() });
  });

  const renderComponent = (overrides = {}) => {
    const contextValue = { ...mockContextValue, ...overrides };

    return render(
      <ArchitectureContext.Provider value={contextValue}>
        <DesignArchitecture />
      </ArchitectureContext.Provider>
    );
  };

  describe('Initial Render', () => {
    it('should render the component with loading state when data is being fetched', () => {
      renderComponent({ isLoading: true });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture configuration/i)).toBeInTheDocument();
    });

    it('should render all major sections when data is loaded', () => {
      renderComponent();

      expect(screen.getByText(/frontend configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/backend configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/database configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/infrastructure setup/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
    });

    it('should display the current project name in the header', () => {
      renderComponent();

      expect(screen.getByText(/architecture design for test project/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow selecting a different frontend framework', async () => {
      const user = userEvent.setup();
      renderComponent();

      const frontendSection = screen.getByText(/frontend configuration/i).closest('section');
      const frameworkSelect = within(frontendSection!).getByLabelText(/framework/i);

      await user.click(frameworkSelect);
      await user.selectOptions(frameworkSelect, 'vue');

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ framework: 'vue' })
        })
      );
    });

    it('should allow adding infrastructure services', async () => {
      const user = userEvent.setup();
      renderComponent();

      const infraSection = screen.getByText(/infrastructure setup/i).closest('section');
      const serviceInput = within(infraSection!).getByLabelText(/add service/i);
      const addButton = within(infraSection!).getByRole('button', { name: /add/i });

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

    it('should allow removing infrastructure services', async () => {
      const user = userEvent.setup();
      renderComponent();

      const infraSection = screen.getByText(/infrastructure setup/i).closest('section');
      const removeButtons = within(infraSection!).getAllByRole('button', { name: /remove/i });

      await user.click(removeButtons[0]);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({
            services: ['s3']
          })
        })
      );
    });

    it('should validate form before submission', async () => {
      const user = userEvent.setup();
      renderComponent({
        architectureConfig: {
          ...mockContextValue.architectureConfig,
          frontend: { framework: '', version: '' }
        }
      });

      await user.click(screen.getByRole('button', { name: /save configuration/i }));

      expect(await screen.findByText(/frontend framework is required/i)).toBeInTheDocument();
      expect(mockSaveArchitectureConfig).not.toHaveBeenCalled();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch architecture data on mount', () => {
      renderComponent();

      expect(mockFetchArchitectureData).toHaveBeenCalledWith('proj-123');
    });

    it('should handle data fetching error', async () => {
      const errorMessage = 'Failed to fetch architecture data';
      mockFetchArchitectureData.mockRejectedValueOnce(new Error(errorMessage));
      const mockShowToastReturn = { showToast: jest.fn() };
      mockShowToast.mockReturnValue(mockShowToastReturn);

      renderComponent({ isLoading: true });

      await waitFor(() => {
        expect(mockShowToastReturn.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: errorMessage,
            type: 'error'
          })
        );
      });
    });

    it('should update context with fetched data', async () => {
      const mockData = {
        frontend: { framework: 'nextjs', version: '13.4.0' },
        backend: { framework: 'nestjs', version: '10.0.0' }
      };
      mockFetchArchitectureData.mockResolvedValueOnce(mockData);

      renderComponent();

      await waitFor(() => {
        expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
          expect.objectContaining(mockData)
        );
      });
    });
  });

  describe('Form Submission', () => {
    it('should save configuration when form is valid', async () => {
      const user = userEvent.setup();
      mockSaveArchitectureConfig.mockResolvedValueOnce({ success: true });
      const mockShowToastReturn = { showToast: jest.fn() };
      mockShowToast.mockReturnValue(mockShowToastReturn);

      renderComponent();

      await user.click(screen.getByRole('button', { name: /save configuration/i }));

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          'proj-123',
          mockContextValue.architectureConfig
        );
        expect(mockShowToastReturn.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: /configuration saved successfully/i,
            type: 'success'
          })
        );
      });
    });

    it('should handle save error', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to save configuration';
      mockSaveArchitectureConfig.mockRejectedValueOnce(new Error(errorMessage));
      const mockShowToastReturn = { showToast: jest.fn() };
      mockShowToast.mockReturnValue(mockShowToastReturn);

      renderComponent();

      await user.click(screen.getByRole('button', { name: /save configuration/i }));

      await waitFor(() => {
        expect(mockShowToastReturn.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: errorMessage,
            type: 'error'
          })
        );
      });
    });

    it('should disable save button during submission', async () => {
      const user = userEvent.setup();
      mockSaveArchitectureConfig.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      expect(saveButton).toBeDisabled();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderComponent();

      expect(screen.getByLabelText(/frontend framework/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/backend framework/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/database type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/infrastructure provider/i)).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      renderComponent();

      expect(screen.getByRole('heading', { name: /architecture design for test project/i, level: 1 })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4);
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.tab();
      expect(screen.getByLabelText(/frontend framework/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/frontend version/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /save configuration/i })).toHaveFocus();
    });

    it('should have proper contrast ratios', () => {
      renderComponent();

      const heading = screen.getByRole('heading', { name: /frontend configuration/i });
      expect(heading).toHaveStyle('color: rgb(30, 41, 59)'); // Assuming dark text on light background
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture config', () => {
      renderComponent({ architectureConfig: {} });

      expect(screen.getByText(/no frontend configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/no backend configuration/i)).toBeInTheDocument();
    });

    it('should handle missing project context', () => {
      renderComponent({ currentProject: null });

      expect(screen.getByText(/no project selected/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save configuration/i })).not.toBeInTheDocument();
    });

    it('should prevent duplicate infrastructure services', async () => {
      const user = userEvent.setup();
      renderComponent();

      const infraSection = screen.getByText(/infrastructure setup/i).closest('section');
      const serviceInput = within(infraSection!).getByLabelText(/add service/i);
      const addButton = within(infraSection!).getByRole('button', { name: /add/i });

      await user.type(serviceInput, 'ec2');
      await user.click(addButton);

      expect(mockContextValue.setArchitectureConfig).not.toHaveBeenCalled();
      expect(screen.getByText(/service already exists/i)).toBeInTheDocument();
    });

    it('should handle version format validation', async () => {
      const user = userEvent.setup();
      renderComponent();

      const frontendSection = screen.getByText(/frontend configuration/i).closest('section');
      const versionInput = within(frontendSection!).getByLabelText(/version/i);

      await user.clear(versionInput);
      await user.type(versionInput, 'invalid');
      await user.tab(); // Trigger blur

      expect(screen.getByText(/please enter a valid semantic version/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when context changes', () => {
      const { rerender } = renderComponent();

      const originalSetArchitectureConfig = mockContextValue.setArchitectureConfig;
      mockContextValue.setArchitectureConfig = jest.fn();

      rerender(
        <ArchitectureContext.Provider value={{ ...mockContextValue, isLoading: false }}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      expect(mockContextValue.setArchitectureConfig).not.toHaveBeenCalled();
      mockContextValue.setArchitectureConfig = originalSetArchitectureConfig;
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

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast.mockReturnValue({ showToast: jest.fn() });
  });

  const renderComponent = (overrides = {}) => {
    const contextValue = { ...mockContextValue, ...overrides };

    return render(
      <ArchitectureContext.Provider value={contextValue}>
        <DesignArchitecture />
      </ArchitectureContext.Provider>
    );
  };

  describe('Initial Render', () => {
    it('should render the component with loading state when data is being fetched', () => {
      renderComponent({ isLoading: true });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture configuration/i)).toBeInTheDocument();
    });

    it('should render all major sections when data is loaded', () => {
      renderComponent();

      expect(screen.getByText(/frontend configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/backend configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/database configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/infrastructure setup/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
    });

    it('should display the current project name in the header', () => {
      renderComponent();

      expect(screen.getByText(/architecture design for test project/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow selecting a different frontend framework', async () => {
      const user = userEvent.setup();
      renderComponent();

      const frontendSection = screen.getByText(/frontend configuration/i).closest('section');
      const frameworkSelect = within(frontendSection!).getByLabelText(/framework/i);

      await user.click(frameworkSelect);
      await user.selectOptions(frameworkSelect, 'vue');

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ framework: 'vue' })
        })
      );
    });

    it('should allow adding infrastructure services', async () => {
      const user = userEvent.setup();
      renderComponent();

      const infraSection = screen.getByText(/infrastructure setup/i).closest('section');
      const serviceInput = within(infraSection!).getByLabelText(/add service/i);
      const addButton = within(infraSection!).getByRole('button', { name: /add/i });

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

    it('should allow removing infrastructure services', async () => {
      const user = userEvent.setup();
      renderComponent();

      const infraSection = screen.getByText(/infrastructure setup/i).closest('section');
      const removeButtons = within(infraSection!).getAllByRole('button', { name: /remove/i });

      await user.click(removeButtons[0]);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({
            services: ['s3']
          })
        })
      );
    });

    it('should validate form before submission', async () => {
      const user = userEvent.setup();
      renderComponent({
        architectureConfig: {
          ...mockContextValue.architectureConfig,
          frontend: { framework: '', version: '' }
        }
      });

      await user.click(screen.getByRole('button', { name: /save configuration/i }));

      expect(await screen.findByText(/frontend framework is required/i)).toBeInTheDocument();
      expect(mockSaveArchitectureConfig).not.toHaveBeenCalled();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch architecture data on mount', () => {
      renderComponent();

      expect(mockFetchArchitectureData).toHaveBeenCalledWith('proj-123');
    });

    it('should handle data fetching error', async () => {
      const errorMessage = 'Failed to fetch architecture data';
      mockFetchArchitectureData.mockRejectedValueOnce(new Error(errorMessage));
      const mockShowToastReturn = { showToast: jest.fn() };
      mockShowToast.mockReturnValue(mockShowToastReturn);

      renderComponent({ isLoading: true });

      await waitFor(() => {
        expect(mockShowToastReturn.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: errorMessage,
            type: 'error'
          })
        );
      });
    });

    it('should update context with fetched data', async () => {
      const mockData = {
        frontend: { framework: 'nextjs', version: '13.4.0' },
        backend: { framework: 'nestjs', version: '10.0.0' }
      };
      mockFetchArchitectureData.mockResolvedValueOnce(mockData);

      renderComponent();

      await waitFor(() => {
        expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
          expect.objectContaining(mockData)
        );
      });
    });
  });

  describe('Form Submission', () => {
    it('should save configuration when form is valid', async () => {
      const user = userEvent.setup();
      mockSaveArchitectureConfig.mockResolvedValueOnce({ success: true });
      const mockShowToastReturn = { showToast: jest.fn() };
      mockShowToast.mockReturnValue(mockShowToastReturn);

      renderComponent();

      await user.click(screen.getByRole('button', { name: /save configuration/i }));

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          'proj-123',
          mockContextValue.architectureConfig
        );
        expect(mockShowToastReturn.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: /configuration saved successfully/i,
            type: 'success'
          })
        );
      });
    });

    it('should handle save error', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to save configuration';
      mockSaveArchitectureConfig.mockRejectedValueOnce(new Error(errorMessage));
      const mockShowToastReturn = { showToast: jest.fn() };
      mockShowToast.mockReturnValue(mockShowToastReturn);

      renderComponent();

      await user.click(screen.getByRole('button', { name: /save configuration/i }));

      await waitFor(() => {
        expect(mockShowToastReturn.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: errorMessage,
            type: 'error'
          })
        );
      });
    });

    it('should disable save button during submission', async () => {
      const user = userEvent.setup();
      mockSaveArchitectureConfig.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      expect(saveButton).toBeDisabled();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      renderComponent();

      expect(screen.getByLabelText(/frontend framework/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/backend framework/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/database type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/infrastructure provider/i)).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      renderComponent();

      expect(screen.getByRole('heading', { name: /architecture design for test project/i, level: 1 })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4);
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.tab();
      expect(screen.getByLabelText(/frontend framework/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/frontend version/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /save configuration/i })).toHaveFocus();
    });

    it('should have proper contrast ratios', () => {
      renderComponent();

      const heading = screen.getByRole('heading', { name: /frontend configuration/i });
      expect(heading).toHaveStyle('color: rgb(30, 41, 59)'); // Assuming dark text on light background
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture config', () => {
      renderComponent({ architectureConfig: {} });

      expect(screen.getByText(/no frontend configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/no backend configuration/i)).toBeInTheDocument();
    });

    it('should handle missing project context', () => {
      renderComponent({ currentProject: null });

      expect(screen.getByText(/no project selected/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save configuration/i })).not.toBeInTheDocument();
    });

    it('should prevent duplicate infrastructure services', async () => {
      const user = userEvent.setup();
      renderComponent();

      const infraSection = screen.getByText(/infrastructure setup/i).closest('section');
      const serviceInput = within(infraSection!).getByLabelText(/add service/i);
      const addButton = within(infraSection!).getByRole('button', { name: /add/i });

      await user.type(serviceInput, 'ec2');
      await user.click(addButton);

      expect(mockContextValue.setArchitectureConfig).not.toHaveBeenCalled();
      expect(screen.getByText(/service already exists/i)).toBeInTheDocument();
    });

    it('should handle version format validation', async () => {
      const user = userEvent.setup();
      renderComponent();

      const frontendSection = screen.getByText(/frontend configuration/i).closest('section');
      const versionInput = within(frontendSection!).getByLabelText(/version/i);

      await user.clear(versionInput);
      await user.type(versionInput, 'invalid');
      await user.tab(); // Trigger blur

      expect(screen.getByText(/please enter a valid semantic version/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when context changes', () => {
      const { rerender } = renderComponent();

      const originalSetArchitectureConfig = mockContextValue.setArchitectureConfig;
      mockContextValue.setArchitectureConfig = jest.fn();

      rerender(
        <ArchitectureContext.Provider value={{ ...mockContextValue, isLoading: false }}>
          <DesignArchitecture />
        </ArchitectureContext.Provider>
      );

      expect(mockContextValue.setArchitectureConfig).not.toHaveBeenCalled();
      mockContextValue.setArchitectureConfig = originalSetArchitectureConfig;
    });
  });
});