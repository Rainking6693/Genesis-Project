import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DesignArchitecture from './DesignArchitecture';
import { ArchitectureContext } from '../../context/ArchitectureContext';
import { AuthContext } from '../../context/AuthContext';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockArchitectureData = {
  id: '1',
  name: 'Modern Villa',
  description: 'A contemporary villa design with open spaces',
  blueprints: [
    { id: 'bp1', name: 'Floor Plan', url: '/floor-plan.png', type: 'floor' },
    { id: 'bp2', name: 'Elevation', url: '/elevation.png', type: 'elevation' },
  ],
  materials: ['Concrete', 'Glass', 'Steel'],
  status: 'approved',
  lastModified: '2023-05-15T10:00:00Z',
};

const mockUser = {
  id: 'user1',
  name: 'Test Architect',
  role: 'architect',
  permissions: ['edit', 'delete', 'approve'],
};

const renderWithProviders = (
  ui: React.ReactElement,
  {
    architectureValue = {
      architectures: [mockArchitectureData],
      loading: false,
      error: null,
      addArchitecture: jest.fn(),
      updateArchitecture: jest.fn(),
      deleteArchitecture: jest.fn(),
      fetchArchitectures: jest.fn(),
    },
    authValue = {
      user: mockUser,
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
    },
    route = '/architecture/1',
  } = {}
) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={authValue}>
        <ArchitectureContext.Provider value={architectureValue}>
          <Routes>
            <Route path="/architecture/:id" element={ui} />
          </Routes>
        </ArchitectureContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Initial State', () => {
    it('should render loading state when data is being fetched', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          loading: true,
          architectures: [],
        },
      });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture details/i)).toBeInTheDocument();
    });

    it('should render error message when fetch fails', () => {
      const errorMessage = 'Failed to load architecture data';
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          loading: false,
          error: errorMessage,
          architectures: [],
        },
      });

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render architecture details when data is available', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByText(mockArchitectureData.name)).toBeInTheDocument();
      expect(screen.getByText(mockArchitectureData.description)).toBeInTheDocument();
      expect(screen.getByText(/modern villa/i)).toBeInTheDocument();
      expect(screen.getByText(/contemporary villa design/i)).toBeInTheDocument();
    });

    it('should display all blueprints in the gallery', () => {
      renderWithProviders(<DesignArchitecture />);

      const blueprintSection = screen.getByRole('region', { name: /blueprints/i });
      mockArchitectureData.blueprints.forEach(blueprint => {
        expect(within(blueprintSection).getByText(blueprint.name)).toBeInTheDocument();
        expect(within(blueprintSection).getByRole('img', { name: blueprint.name })).toBeInTheDocument();
      });
    });

    it('should display materials list', () => {
      renderWithProviders(<DesignArchitecture />);

      const materialsSection = screen.getByRole('region', { name: /materials/i });
      mockArchitectureData.materials.forEach(material => {
        expect(within(materialsSection).getByText(material)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow editing architecture name and description', async () => {
      const user = userEvent.setup();
      const updateMock = jest.fn().mockResolvedValue({});

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const editButton = screen.getByRole('button', { name: /edit details/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/architecture name/i);
      const descInput = screen.getByLabelText(/description/i);

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Modern Villa');
      await user.clear(descInput);
      await user.type(descInput, 'Updated description with more details');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith({
          ...mockArchitectureData,
          name: 'Updated Modern Villa',
          description: 'Updated description with more details',
        });
      });
    });

    it('should handle edit cancellation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      const editButton = screen.getByRole('button', { name: /edit details/i });
      await user.click(editButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByLabelText(/architecture name/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/description/i)).not.toBeInTheDocument();
    });

    it('should allow adding new blueprints', async () => {
      const user = userEvent.setup();
      const file = new File(['(⌐□_□)'], 'new-blueprint.png', { type: 'image/png' });
      const updateMock = jest.fn().mockResolvedValue({});

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const addBlueprintButton = screen.getByRole('button', { name: /add blueprint/i });
      await user.click(addBlueprintButton);

      const fileInput = screen.getByLabelText(/upload blueprint/i);
      await user.upload(fileInput, file);

      const nameInput = screen.getByLabelText(/blueprint name/i);
      await user.type(nameInput, 'New Blueprint');

      const typeSelect = screen.getByLabelText(/blueprint type/i);
      await user.selectOptions(typeSelect, 'section');

      const saveButton = screen.getByRole('button', { name: /add blueprint/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            blueprints: expect.arrayContaining([
              expect.objectContaining({
                name: 'New Blueprint',
                type: 'section',
              }),
            ]),
          })
        );
      });
    });

    it('should allow deleting blueprints', async () => {
      const user = userEvent.setup();
      const updateMock = jest.fn().mockResolvedValue({});

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete blueprint/i });
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm deletion/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            blueprints: [mockArchitectureData.blueprints[1]],
          })
        );
      });
    });

    it('should allow adding new materials', async () => {
      const user = userEvent.setup();
      const updateMock = jest.fn().mockResolvedValue({});

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const addMaterialButton = screen.getByRole('button', { name: /add material/i });
      await user.click(addMaterialButton);

      const materialInput = screen.getByLabelText(/new material/i);
      await user.type(materialInput, 'Wood{enter}');

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            materials: [...mockArchitectureData.materials, 'Wood'],
          })
        );
      });
    });

    it('should allow removing materials', async () => {
      const user = userEvent.setup();
      const updateMock = jest.fn().mockResolvedValue({});

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            materials: ['Glass', 'Steel'],
          })
        );
      });
    });
  });

  describe('Status Management', () => {
    it('should allow changing status to "under review"', async () => {
      const user = userEvent.setup();
      const updateMock = jest.fn().mockResolvedValue({});

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const statusButton = screen.getByRole('button', { name: /approved/i });
      await user.click(statusButton);

      const reviewOption = screen.getByRole('menuitem', { name: /under review/i });
      await user.click(reviewOption);

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'under_review',
          })
        );
      });
    });

    it('should show confirmation dialog for deletion', async () => {
      const user = userEvent.setup();
      const deleteMock = jest.fn().mockResolvedValue({});
      const navigateMock = jest.fn();

      jest.requireMock('react-router-dom').useNavigate.mockReturnValue(navigateMock);

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          deleteArchitecture: deleteMock,
        },
      });

      const deleteButton = screen.getByRole('button', { name: /delete architecture/i });
      await user.click(deleteButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(deleteMock).toHaveBeenCalledWith('1');
        expect(navigateMock).toHaveBeenCalledWith('/architecture');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByRole('button', { name: /edit details/i })).toHaveAttribute('aria-label', 'Edit architecture details');
      expect(screen.getByRole('button', { name: /add blueprint/i })).toHaveAttribute('aria-label', 'Add new blueprint');
      expect(screen.getByRole('region', { name: /blueprints/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /materials/i })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /edit details/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /add blueprint/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /add material/i })).toHaveFocus();
    });

    it('should have proper contrast for text elements', () => {
      renderWithProviders(<DesignArchitecture />);

      const heading = screen.getByRole('heading', { name: mockArchitectureData.name });
      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');

      const description = screen.getByText(mockArchitectureData.description);
      expect(description).toHaveStyle('color: rgba(0, 0, 0, 0.6)');
    });
  });

  describe('Error Handling', () => {
    it('should show error when blueprint upload fails', async () => {
      const user = userEvent.setup();
      const file = new File(['(⌐□_□)'], 'invalid-blueprint.pdf', { type: 'application/pdf' });

      renderWithProviders(<DesignArchitecture />);

      const addBlueprintButton = screen.getByRole('button', { name: /add blueprint/i });
      await user.click(addBlueprintButton);

      const fileInput = screen.getByLabelText(/upload blueprint/i);
      await user.upload(fileInput, file);

      expect(screen.getByText(/only image files are allowed/i)).toBeInTheDocument();
    });

    it('should handle API errors when updating architecture', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to update architecture';
      const updateMock = jest.fn().mockRejectedValue(new Error(errorMessage));

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const editButton = screen.getByRole('button', { name: /edit details/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should disable buttons during loading states', async () => {
      const user = userEvent.setup();
      const updateMock = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const editButton = screen.getByRole('button', { name: /edit details/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(saveButton).toBeDisabled();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty blueprints array', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          architectures: [{
            ...mockArchitectureData,
            blueprints: [],
          }],
        },
      });

      expect(screen.getByText(/no blueprints available/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add blueprint/i })).toBeInTheDocument();
    });

    it('should handle empty materials array', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          architectures: [{
            ...mockArchitectureData,
            materials: [],
          }],
        },
      });

      expect(screen.getByText(/no materials specified/i)).toBeInTheDocument();
    });

    it('should show not found message when architecture ID is invalid', () => {
      renderWithProviders(<DesignArchitecture />, {
        route: '/architecture/invalid-id',
        architectureValue: {
          ...mockArchitectureData,
          architectures: [],
          loading: false,
          error: null,
        },
      });

      expect(screen.getByText(/architecture not found/i)).toBeInTheDocument();
    });
  });

  describe('Permission Handling', () => {
    it('should disable edit controls for viewers', () => {
      renderWithProviders(<DesignArchitecture />, {
        authValue: {
          ...mockUser,
          user: {
            ...mockUser,
            role: 'viewer',
            permissions: ['view'],
          },
        },
      });

      expect(screen.getByRole('button', { name: /edit details/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /add blueprint/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /add material/i })).toBeDisabled();
      expect(screen.queryByRole('button', { name: /delete architecture/i })).not.toBeInTheDocument();
    });

    it('should show permission denied message when trying to perform unauthorized actions', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, {
        authValue: {
          ...mockUser,
          user: {
            ...mockUser,
            permissions: ['view'],
          },
        },
      });

      const editButton = screen.getByRole('button', { name: /edit details/i });
      await user.click(editButton);

      expect(screen.getByText(/you don't have permission to edit this architecture/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DesignArchitecture from './DesignArchitecture';
import { ArchitectureContext } from '../../context/ArchitectureContext';
import { AuthContext } from '../../context/AuthContext';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockArchitectureData = {
  id: '1',
  name: 'Modern Villa',
  description: 'A contemporary villa design with open spaces',
  blueprints: [
    { id: 'bp1', name: 'Floor Plan', url: '/floor-plan.png', type: 'floor' },
    { id: 'bp2', name: 'Elevation', url: '/elevation.png', type: 'elevation' },
  ],
  materials: ['Concrete', 'Glass', 'Steel'],
  status: 'approved',
  lastModified: '2023-05-15T10:00:00Z',
};

const mockUser = {
  id: 'user1',
  name: 'Test Architect',
  role: 'architect',
  permissions: ['edit', 'delete', 'approve'],
};

const renderWithProviders = (
  ui: React.ReactElement,
  {
    architectureValue = {
      architectures: [mockArchitectureData],
      loading: false,
      error: null,
      addArchitecture: jest.fn(),
      updateArchitecture: jest.fn(),
      deleteArchitecture: jest.fn(),
      fetchArchitectures: jest.fn(),
    },
    authValue = {
      user: mockUser,
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
    },
    route = '/architecture/1',
  } = {}
) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={authValue}>
        <ArchitectureContext.Provider value={architectureValue}>
          <Routes>
            <Route path="/architecture/:id" element={ui} />
          </Routes>
        </ArchitectureContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Initial State', () => {
    it('should render loading state when data is being fetched', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          loading: true,
          architectures: [],
        },
      });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture details/i)).toBeInTheDocument();
    });

    it('should render error message when fetch fails', () => {
      const errorMessage = 'Failed to load architecture data';
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          loading: false,
          error: errorMessage,
          architectures: [],
        },
      });

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render architecture details when data is available', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByText(mockArchitectureData.name)).toBeInTheDocument();
      expect(screen.getByText(mockArchitectureData.description)).toBeInTheDocument();
      expect(screen.getByText(/modern villa/i)).toBeInTheDocument();
      expect(screen.getByText(/contemporary villa design/i)).toBeInTheDocument();
    });

    it('should display all blueprints in the gallery', () => {
      renderWithProviders(<DesignArchitecture />);

      const blueprintSection = screen.getByRole('region', { name: /blueprints/i });
      mockArchitectureData.blueprints.forEach(blueprint => {
        expect(within(blueprintSection).getByText(blueprint.name)).toBeInTheDocument();
        expect(within(blueprintSection).getByRole('img', { name: blueprint.name })).toBeInTheDocument();
      });
    });

    it('should display materials list', () => {
      renderWithProviders(<DesignArchitecture />);

      const materialsSection = screen.getByRole('region', { name: /materials/i });
      mockArchitectureData.materials.forEach(material => {
        expect(within(materialsSection).getByText(material)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow editing architecture name and description', async () => {
      const user = userEvent.setup();
      const updateMock = jest.fn().mockResolvedValue({});

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const editButton = screen.getByRole('button', { name: /edit details/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/architecture name/i);
      const descInput = screen.getByLabelText(/description/i);

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Modern Villa');
      await user.clear(descInput);
      await user.type(descInput, 'Updated description with more details');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith({
          ...mockArchitectureData,
          name: 'Updated Modern Villa',
          description: 'Updated description with more details',
        });
      });
    });

    it('should handle edit cancellation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      const editButton = screen.getByRole('button', { name: /edit details/i });
      await user.click(editButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByLabelText(/architecture name/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/description/i)).not.toBeInTheDocument();
    });

    it('should allow adding new blueprints', async () => {
      const user = userEvent.setup();
      const file = new File(['(⌐□_□)'], 'new-blueprint.png', { type: 'image/png' });
      const updateMock = jest.fn().mockResolvedValue({});

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const addBlueprintButton = screen.getByRole('button', { name: /add blueprint/i });
      await user.click(addBlueprintButton);

      const fileInput = screen.getByLabelText(/upload blueprint/i);
      await user.upload(fileInput, file);

      const nameInput = screen.getByLabelText(/blueprint name/i);
      await user.type(nameInput, 'New Blueprint');

      const typeSelect = screen.getByLabelText(/blueprint type/i);
      await user.selectOptions(typeSelect, 'section');

      const saveButton = screen.getByRole('button', { name: /add blueprint/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            blueprints: expect.arrayContaining([
              expect.objectContaining({
                name: 'New Blueprint',
                type: 'section',
              }),
            ]),
          })
        );
      });
    });

    it('should allow deleting blueprints', async () => {
      const user = userEvent.setup();
      const updateMock = jest.fn().mockResolvedValue({});

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete blueprint/i });
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm deletion/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            blueprints: [mockArchitectureData.blueprints[1]],
          })
        );
      });
    });

    it('should allow adding new materials', async () => {
      const user = userEvent.setup();
      const updateMock = jest.fn().mockResolvedValue({});

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const addMaterialButton = screen.getByRole('button', { name: /add material/i });
      await user.click(addMaterialButton);

      const materialInput = screen.getByLabelText(/new material/i);
      await user.type(materialInput, 'Wood{enter}');

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            materials: [...mockArchitectureData.materials, 'Wood'],
          })
        );
      });
    });

    it('should allow removing materials', async () => {
      const user = userEvent.setup();
      const updateMock = jest.fn().mockResolvedValue({});

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            materials: ['Glass', 'Steel'],
          })
        );
      });
    });
  });

  describe('Status Management', () => {
    it('should allow changing status to "under review"', async () => {
      const user = userEvent.setup();
      const updateMock = jest.fn().mockResolvedValue({});

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const statusButton = screen.getByRole('button', { name: /approved/i });
      await user.click(statusButton);

      const reviewOption = screen.getByRole('menuitem', { name: /under review/i });
      await user.click(reviewOption);

      await waitFor(() => {
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'under_review',
          })
        );
      });
    });

    it('should show confirmation dialog for deletion', async () => {
      const user = userEvent.setup();
      const deleteMock = jest.fn().mockResolvedValue({});
      const navigateMock = jest.fn();

      jest.requireMock('react-router-dom').useNavigate.mockReturnValue(navigateMock);

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          deleteArchitecture: deleteMock,
        },
      });

      const deleteButton = screen.getByRole('button', { name: /delete architecture/i });
      await user.click(deleteButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(deleteMock).toHaveBeenCalledWith('1');
        expect(navigateMock).toHaveBeenCalledWith('/architecture');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', () => {
      renderWithProviders(<DesignArchitecture />);

      expect(screen.getByRole('button', { name: /edit details/i })).toHaveAttribute('aria-label', 'Edit architecture details');
      expect(screen.getByRole('button', { name: /add blueprint/i })).toHaveAttribute('aria-label', 'Add new blueprint');
      expect(screen.getByRole('region', { name: /blueprints/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /materials/i })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /edit details/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /add blueprint/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /add material/i })).toHaveFocus();
    });

    it('should have proper contrast for text elements', () => {
      renderWithProviders(<DesignArchitecture />);

      const heading = screen.getByRole('heading', { name: mockArchitectureData.name });
      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');

      const description = screen.getByText(mockArchitectureData.description);
      expect(description).toHaveStyle('color: rgba(0, 0, 0, 0.6)');
    });
  });

  describe('Error Handling', () => {
    it('should show error when blueprint upload fails', async () => {
      const user = userEvent.setup();
      const file = new File(['(⌐□_□)'], 'invalid-blueprint.pdf', { type: 'application/pdf' });

      renderWithProviders(<DesignArchitecture />);

      const addBlueprintButton = screen.getByRole('button', { name: /add blueprint/i });
      await user.click(addBlueprintButton);

      const fileInput = screen.getByLabelText(/upload blueprint/i);
      await user.upload(fileInput, file);

      expect(screen.getByText(/only image files are allowed/i)).toBeInTheDocument();
    });

    it('should handle API errors when updating architecture', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to update architecture';
      const updateMock = jest.fn().mockRejectedValue(new Error(errorMessage));

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const editButton = screen.getByRole('button', { name: /edit details/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should disable buttons during loading states', async () => {
      const user = userEvent.setup();
      const updateMock = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));

      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          updateArchitecture: updateMock,
        },
      });

      const editButton = screen.getByRole('button', { name: /edit details/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(saveButton).toBeDisabled();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty blueprints array', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          architectures: [{
            ...mockArchitectureData,
            blueprints: [],
          }],
        },
      });

      expect(screen.getByText(/no blueprints available/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add blueprint/i })).toBeInTheDocument();
    });

    it('should handle empty materials array', () => {
      renderWithProviders(<DesignArchitecture />, {
        architectureValue: {
          ...mockArchitectureData,
          architectures: [{
            ...mockArchitectureData,
            materials: [],
          }],
        },
      });

      expect(screen.getByText(/no materials specified/i)).toBeInTheDocument();
    });

    it('should show not found message when architecture ID is invalid', () => {
      renderWithProviders(<DesignArchitecture />, {
        route: '/architecture/invalid-id',
        architectureValue: {
          ...mockArchitectureData,
          architectures: [],
          loading: false,
          error: null,
        },
      });

      expect(screen.getByText(/architecture not found/i)).toBeInTheDocument();
    });
  });

  describe('Permission Handling', () => {
    it('should disable edit controls for viewers', () => {
      renderWithProviders(<DesignArchitecture />, {
        authValue: {
          ...mockUser,
          user: {
            ...mockUser,
            role: 'viewer',
            permissions: ['view'],
          },
        },
      });

      expect(screen.getByRole('button', { name: /edit details/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /add blueprint/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /add material/i })).toBeDisabled();
      expect(screen.queryByRole('button', { name: /delete architecture/i })).not.toBeInTheDocument();
    });

    it('should show permission denied message when trying to perform unauthorized actions', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DesignArchitecture />, {
        authValue: {
          ...mockUser,
          user: {
            ...mockUser,
            permissions: ['view'],
          },
        },
      });

      const editButton = screen.getByRole('button', { name: /edit details/i });
      await user.click(editButton);

      expect(screen.getByText(/you don't have permission to edit this architecture/i)).toBeInTheDocument();
    });
  });
});