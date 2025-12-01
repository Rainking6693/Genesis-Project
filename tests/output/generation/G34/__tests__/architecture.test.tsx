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
    it('should render loading state initially when data is being fetched', () => {
      mockContextValue.isLoading = true;
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture configuration/i)).toBeInTheDocument();
    });

    it('should render the component with existing architecture data', () => {
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByText(/design your fullstack architecture/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/frontend framework/i)).toHaveValue('react');
      expect(screen.getByLabelText(/backend framework/i)).toHaveValue('express');
    });

    it('should have proper aria labels for accessibility', () => {
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByLabelText(/frontend framework/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/backend framework/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/database type/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow changing frontend framework', async () => {
      renderWithContext(<DesignArchitecture />);
      const frontendSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frontendSelect, 'vue');
      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ framework: 'vue' })
        })
      );
    });

    it('should allow changing backend framework', async () => {
      renderWithContext(<DesignArchitecture />);
      const backendSelect = screen.getByLabelText(/backend framework/i);
      await userEvent.selectOptions(backendSelect, 'nestjs');
      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: expect.objectContaining({ framework: 'nestjs' })
        })
      );
    });

    it('should allow adding infrastructure services', async () => {
      renderWithContext(<DesignArchitecture />);
      const serviceInput = screen.getByLabelText(/add infrastructure service/i);
      const addButton = screen.getByRole('button', { name: /add service/i });

      await userEvent.type(serviceInput, 'lambda');
      await userEvent.click(addButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({
            services: expect.arrayContaining(['ec2', 's3', 'lambda'])
          })
        })
      );
    });

    it('should allow removing infrastructure services', async () => {
      renderWithContext(<DesignArchitecture />);
      const s3Chip = screen.getByText('s3');
      const removeButton = within(s3Chip).getByRole('button', { name: /remove/i });

      await userEvent.click(removeButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({
            services: ['ec2']
          })
        })
      );
    });

    it('should show version selector when framework is changed', async () => {
      mockFetchArchitectureData.mockResolvedValueOnce({
        frontend: {
          frameworks: {
            react: ['18.2.0', '17.0.2'],
            vue: ['3.3.4', '3.2.47']
          }
        }
      });

      renderWithContext(<DesignArchitecture />);
      const frontendSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frontendSelect, 'vue');

      await waitFor(() => {
        expect(screen.getByLabelText(/frontend version/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should show validation errors when required fields are missing', async () => {
      mockContextValue.architectureConfig = {
        frontend: { framework: '', version: '' },
        backend: { framework: '', version: '' },
        database: { type: '', version: '' },
        infrastructure: { provider: '', services: [] }
      };

      renderWithContext(<DesignArchitecture />);
      await userEvent.click(screen.getByRole('button', { name: /save configuration/i }));

      expect(await screen.findByText(/frontend framework is required/i)).toBeInTheDocument();
      expect(screen.getByText(/backend framework is required/i)).toBeInTheDocument();
      expect(screen.getByText(/database type is required/i)).toBeInTheDocument();
      expect(screen.getByText(/infrastructure provider is required/i)).toBeInTheDocument();
    });

    it('should successfully save valid configuration', async () => {
      mockSaveArchitectureConfig.mockResolvedValueOnce({ success: true });

      renderWithContext(<DesignArchitecture />);
      await userEvent.click(screen.getByRole('button', { name: /save configuration/i }));

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          'proj-123',
          mockContextValue.architectureConfig
        );
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture configuration saved successfully',
            type: 'success'
          })
        );
      });
    });

    it('should handle save error gracefully', async () => {
      mockSaveArchitectureConfig.mockRejectedValueOnce(new Error('Save failed'));

      renderWithContext(<DesignArchitecture />);
      await userEvent.click(screen.getByRole('button', { name: /save configuration/i }));

      await waitFor(() => {
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to save architecture configuration',
            type: 'error'
          })
        );
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch architecture data on mount', () => {
      renderWithContext(<DesignArchitecture />);
      expect(mockFetchArchitectureData).toHaveBeenCalledWith('proj-123');
    });

    it('should handle data fetching error', async () => {
      mockFetchArchitectureData.mockRejectedValueOnce(new Error('Fetch failed'));
      mockContextValue.isLoading = true;

      renderWithContext(<DesignArchitecture />);

      await waitFor(() => {
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to load architecture data',
            type: 'error'
          })
        );
        expect(mockContextValue.setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should update context with fetched data', async () => {
      const mockData = {
        frontend: {
          frameworks: { react: ['18.2.0'], vue: ['3.3.4'] },
          selected: { framework: 'react', version: '18.2.0' }
        },
        backend: {
          frameworks: { express: ['4.18.2'], nestjs: ['10.0.0'] },
          selected: { framework: 'express', version: '4.18.2' }
        }
      };

      mockFetchArchitectureData.mockResolvedValueOnce(mockData);
      mockContextValue.isLoading = true;

      renderWithContext(<DesignArchitecture />);

      await waitFor(() => {
        expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            frontend: mockData.frontend.selected,
            backend: mockData.backend.selected
          })
        );
        expect(mockContextValue.setIsLoading).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper focus management', async () => {
      renderWithContext(<DesignArchitecture />);
      const frontendSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.tab();
      expect(frontendSelect).toHaveFocus();
    });

    it('should have proper aria-live regions for dynamic content', () => {
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should announce loading states to screen readers', () => {
      mockContextValue.isLoading = true;
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByText(/loading architecture configuration/i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty infrastructure services array', async () => {
      mockContextValue.architectureConfig.infrastructure.services = [];
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByText(/no infrastructure services added/i)).toBeInTheDocument();
    });

    it('should prevent duplicate infrastructure services', async () => {
      renderWithContext(<DesignArchitecture />);
      const serviceInput = screen.getByLabelText(/add infrastructure service/i);
      const addButton = screen.getByRole('button', { name: /add service/i });

      await userEvent.type(serviceInput, 'ec2');
      await userEvent.click(addButton);

      expect(mockShowToast().showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Service already exists in the configuration',
          type: 'warning'
        })
      );
    });

    it('should handle very long service names', async () => {
      renderWithContext(<DesignArchitecture />);
      const serviceInput = screen.getByLabelText(/add infrastructure service/i);
      const longServiceName = 'a-very-long-service-name-that-might-cause-overflow-issues';

      await userEvent.type(serviceInput, longServiceName);
      await userEvent.click(screen.getByRole('button', { name: /add service/i }));

      expect(screen.getByText(longServiceName)).toBeInTheDocument();
      expect(screen.getByText(longServiceName)).toHaveStyle('max-width: 200px');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow form submission with Enter key', async () => {
      mockSaveArchitectureConfig.mockResolvedValueOnce({ success: true });
      renderWithContext(<DesignArchitecture />);

      fireEvent.keyDown(screen.getByRole('button', { name: /save configuration/i }), {
        key: 'Enter',
        code: 'Enter',
        charCode: 13
      });

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalled();
      });
    });

    it('should allow removing services with keyboard', async () => {
      renderWithContext(<DesignArchitecture />);
      const s3Chip = screen.getByText('s3');
      const removeButton = within(s3Chip).getByRole('button', { name: /remove/i });

      removeButton.focus();
      fireEvent.keyDown(removeButton, {
        key: 'Enter',
        code: 'Enter',
        charCode: 13
      });

      await waitFor(() => {
        expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            infrastructure: expect.objectContaining({
              services: ['ec2']
            })
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
    it('should render loading state initially when data is being fetched', () => {
      mockContextValue.isLoading = true;
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture configuration/i)).toBeInTheDocument();
    });

    it('should render the component with existing architecture data', () => {
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByText(/design your fullstack architecture/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/frontend framework/i)).toHaveValue('react');
      expect(screen.getByLabelText(/backend framework/i)).toHaveValue('express');
    });

    it('should have proper aria labels for accessibility', () => {
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByLabelText(/frontend framework/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/backend framework/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/database type/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow changing frontend framework', async () => {
      renderWithContext(<DesignArchitecture />);
      const frontendSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frontendSelect, 'vue');
      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          frontend: expect.objectContaining({ framework: 'vue' })
        })
      );
    });

    it('should allow changing backend framework', async () => {
      renderWithContext(<DesignArchitecture />);
      const backendSelect = screen.getByLabelText(/backend framework/i);
      await userEvent.selectOptions(backendSelect, 'nestjs');
      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: expect.objectContaining({ framework: 'nestjs' })
        })
      );
    });

    it('should allow adding infrastructure services', async () => {
      renderWithContext(<DesignArchitecture />);
      const serviceInput = screen.getByLabelText(/add infrastructure service/i);
      const addButton = screen.getByRole('button', { name: /add service/i });

      await userEvent.type(serviceInput, 'lambda');
      await userEvent.click(addButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({
            services: expect.arrayContaining(['ec2', 's3', 'lambda'])
          })
        })
      );
    });

    it('should allow removing infrastructure services', async () => {
      renderWithContext(<DesignArchitecture />);
      const s3Chip = screen.getByText('s3');
      const removeButton = within(s3Chip).getByRole('button', { name: /remove/i });

      await userEvent.click(removeButton);

      expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          infrastructure: expect.objectContaining({
            services: ['ec2']
          })
        })
      );
    });

    it('should show version selector when framework is changed', async () => {
      mockFetchArchitectureData.mockResolvedValueOnce({
        frontend: {
          frameworks: {
            react: ['18.2.0', '17.0.2'],
            vue: ['3.3.4', '3.2.47']
          }
        }
      });

      renderWithContext(<DesignArchitecture />);
      const frontendSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.selectOptions(frontendSelect, 'vue');

      await waitFor(() => {
        expect(screen.getByLabelText(/frontend version/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should show validation errors when required fields are missing', async () => {
      mockContextValue.architectureConfig = {
        frontend: { framework: '', version: '' },
        backend: { framework: '', version: '' },
        database: { type: '', version: '' },
        infrastructure: { provider: '', services: [] }
      };

      renderWithContext(<DesignArchitecture />);
      await userEvent.click(screen.getByRole('button', { name: /save configuration/i }));

      expect(await screen.findByText(/frontend framework is required/i)).toBeInTheDocument();
      expect(screen.getByText(/backend framework is required/i)).toBeInTheDocument();
      expect(screen.getByText(/database type is required/i)).toBeInTheDocument();
      expect(screen.getByText(/infrastructure provider is required/i)).toBeInTheDocument();
    });

    it('should successfully save valid configuration', async () => {
      mockSaveArchitectureConfig.mockResolvedValueOnce({ success: true });

      renderWithContext(<DesignArchitecture />);
      await userEvent.click(screen.getByRole('button', { name: /save configuration/i }));

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalledWith(
          'proj-123',
          mockContextValue.architectureConfig
        );
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture configuration saved successfully',
            type: 'success'
          })
        );
      });
    });

    it('should handle save error gracefully', async () => {
      mockSaveArchitectureConfig.mockRejectedValueOnce(new Error('Save failed'));

      renderWithContext(<DesignArchitecture />);
      await userEvent.click(screen.getByRole('button', { name: /save configuration/i }));

      await waitFor(() => {
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to save architecture configuration',
            type: 'error'
          })
        );
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch architecture data on mount', () => {
      renderWithContext(<DesignArchitecture />);
      expect(mockFetchArchitectureData).toHaveBeenCalledWith('proj-123');
    });

    it('should handle data fetching error', async () => {
      mockFetchArchitectureData.mockRejectedValueOnce(new Error('Fetch failed'));
      mockContextValue.isLoading = true;

      renderWithContext(<DesignArchitecture />);

      await waitFor(() => {
        expect(mockShowToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to load architecture data',
            type: 'error'
          })
        );
        expect(mockContextValue.setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should update context with fetched data', async () => {
      const mockData = {
        frontend: {
          frameworks: { react: ['18.2.0'], vue: ['3.3.4'] },
          selected: { framework: 'react', version: '18.2.0' }
        },
        backend: {
          frameworks: { express: ['4.18.2'], nestjs: ['10.0.0'] },
          selected: { framework: 'express', version: '4.18.2' }
        }
      };

      mockFetchArchitectureData.mockResolvedValueOnce(mockData);
      mockContextValue.isLoading = true;

      renderWithContext(<DesignArchitecture />);

      await waitFor(() => {
        expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            frontend: mockData.frontend.selected,
            backend: mockData.backend.selected
          })
        );
        expect(mockContextValue.setIsLoading).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper focus management', async () => {
      renderWithContext(<DesignArchitecture />);
      const frontendSelect = screen.getByLabelText(/frontend framework/i);
      await userEvent.tab();
      expect(frontendSelect).toHaveFocus();
    });

    it('should have proper aria-live regions for dynamic content', () => {
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should announce loading states to screen readers', () => {
      mockContextValue.isLoading = true;
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByText(/loading architecture configuration/i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty infrastructure services array', async () => {
      mockContextValue.architectureConfig.infrastructure.services = [];
      renderWithContext(<DesignArchitecture />);
      expect(screen.getByText(/no infrastructure services added/i)).toBeInTheDocument();
    });

    it('should prevent duplicate infrastructure services', async () => {
      renderWithContext(<DesignArchitecture />);
      const serviceInput = screen.getByLabelText(/add infrastructure service/i);
      const addButton = screen.getByRole('button', { name: /add service/i });

      await userEvent.type(serviceInput, 'ec2');
      await userEvent.click(addButton);

      expect(mockShowToast().showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Service already exists in the configuration',
          type: 'warning'
        })
      );
    });

    it('should handle very long service names', async () => {
      renderWithContext(<DesignArchitecture />);
      const serviceInput = screen.getByLabelText(/add infrastructure service/i);
      const longServiceName = 'a-very-long-service-name-that-might-cause-overflow-issues';

      await userEvent.type(serviceInput, longServiceName);
      await userEvent.click(screen.getByRole('button', { name: /add service/i }));

      expect(screen.getByText(longServiceName)).toBeInTheDocument();
      expect(screen.getByText(longServiceName)).toHaveStyle('max-width: 200px');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow form submission with Enter key', async () => {
      mockSaveArchitectureConfig.mockResolvedValueOnce({ success: true });
      renderWithContext(<DesignArchitecture />);

      fireEvent.keyDown(screen.getByRole('button', { name: /save configuration/i }), {
        key: 'Enter',
        code: 'Enter',
        charCode: 13
      });

      await waitFor(() => {
        expect(mockSaveArchitectureConfig).toHaveBeenCalled();
      });
    });

    it('should allow removing services with keyboard', async () => {
      renderWithContext(<DesignArchitecture />);
      const s3Chip = screen.getByText('s3');
      const removeButton = within(s3Chip).getByRole('button', { name: /remove/i });

      removeButton.focus();
      fireEvent.keyDown(removeButton, {
        key: 'Enter',
        code: 'Enter',
        charCode: 13
      });

      await waitFor(() => {
        expect(mockContextValue.setArchitectureConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            infrastructure: expect.objectContaining({
              services: ['ec2']
            })
          })
        );
      });
    });
  });
});