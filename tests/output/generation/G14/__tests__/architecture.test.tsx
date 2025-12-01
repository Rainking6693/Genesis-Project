import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { ArchitectureData, NodeType } from '../../types/architecture';

jest.mock('axios');
jest.mock('../../context/AuthContext');
jest.mock('../../hooks/useToast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockArchitectureData: ArchitectureData = {
  id: '1',
  name: 'E-commerce Platform',
  description: 'Modern e-commerce architecture',
  nodes: [
    { id: '1', type: NodeType.Service, name: 'Frontend', position: { x: 100, y: 100 } },
    { id: '2', type: NodeType.Database, name: 'PostgreSQL', position: { x: 300, y: 200 } },
    { id: '3', type: NodeType.External, name: 'Payment Gateway', position: { x: 200, y: 300 } },
  ],
  connections: [
    { id: '1', source: '1', target: '2' },
    { id: '2', source: '1', target: '3' },
  ],
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-02T00:00:00Z',
};

const mockEmptyArchitectureData: ArchitectureData = {
  id: '2',
  name: 'New Architecture',
  description: '',
  nodes: [],
  connections: [],
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const renderComponent = (initialData: ArchitectureData | null = null) => {
  (useAuth as jest.Mock).mockReturnValue({
    user: { id: 'user1', name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
  });

  const mockToast = {
    show: jest.fn(),
    hide: jest.fn(),
  };
  (useToast as jest.Mock).mockReturnValue(mockToast);

  return render(
    <MemoryRouter initialEntries={['/architectures/1']}>
      <Routes>
        <Route path="/architectures/:id" element={<DesignArchitecture initialData={initialData} />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render loading state when data is being fetched', () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture/i)).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to load architecture/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should render the architecture diagram when data is loaded', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
        expect(screen.getByText('Modern e-commerce architecture')).toBeInTheDocument();
        expect(screen.getByText('Frontend')).toBeInTheDocument();
        expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
      });
    });

    it('should render empty state when no nodes exist', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockEmptyArchitectureData });
      renderComponent(mockEmptyArchitectureData);

      await waitFor(() => {
        expect(screen.getByText(/no nodes in this architecture/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add your first node/i })).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      (axios.put as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      (axios.post as jest.Mock).mockResolvedValue({ data: { ...mockArchitectureData, id: 'new-id' } });
    });

    it('should allow editing architecture name and description', async () => {
      const user = userEvent.setup();
      renderComponent();

      const editButton = await screen.findByRole('button', { name: /edit/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/architecture name/i);
      const descInput = screen.getByLabelText(/description/i);

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated E-commerce Platform');
      await user.clear(descInput);
      await user.type(descInput, 'Updated description');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            name: 'Updated E-commerce Platform',
            description: 'Updated description',
          })
        );
      });
    });

    it('should add a new node to the architecture', async () => {
      const user = userEvent.setup();
      renderComponent();

      const addNodeButton = await screen.findByRole('button', { name: /add node/i });
      await user.click(addNodeButton);

      const nodeTypeSelect = screen.getByLabelText(/node type/i);
      await user.selectOptions(nodeTypeSelect, 'service');

      const nodeNameInput = screen.getByLabelText(/node name/i);
      await user.type(nodeNameInput, 'New Service');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            nodes: expect.arrayContaining([
              expect.objectContaining({ name: 'New Service', type: 'service' })
            ])
          })
        );
      });
    });

    it('should delete a node from the architecture', async () => {
      const user = userEvent.setup();
      renderComponent();

      const node = await screen.findByText('Frontend');
      const deleteButton = within(node.closest('div')!).getByRole('button', { name: /delete/i });

      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            nodes: expect.not.arrayContaining([
              expect.objectContaining({ name: 'Frontend' })
            ]),
            connections: []
          })
        );
      });
    });

    it('should create a connection between nodes', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Mock the connection creation logic
      const frontendNode = await screen.findByText('Frontend');
      const postgresNode = screen.getByText('PostgreSQL');

      // Simulate drag and drop connection
      fireEvent.mouseDown(frontendNode);
      fireEvent.mouseMove(postgresNode);
      fireEvent.mouseUp(postgresNode);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            connections: expect.arrayContaining([
              expect.objectContaining({
                source: expect.any(String),
                target: expect.any(String)
              })
            ])
          })
        );
      });
    });

    it('should delete a connection between nodes', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Find connection line (mock implementation)
      const connectionLine = await screen.findByTestId('connection-1');
      await user.click(connectionLine);

      const deleteButton = screen.getByRole('button', { name: /delete connection/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            connections: []
          })
        );
      });
    });

    it('should save the architecture', async () => {
      const user = userEvent.setup();
      renderComponent();

      const saveButton = await screen.findByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalled();
        expect(useToast().show).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture saved successfully',
            type: 'success',
          })
        );
      });
    });

    it('should handle save errors gracefully', async () => {
      (axios.put as jest.Mock).mockRejectedValue(new Error('Save failed'));
      const user = userEvent.setup();
      renderComponent();

      const saveButton = await screen.findByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(useToast().show).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to save architecture',
            type: 'error',
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/architecture diagram/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add node/i })).toHaveAccessibleName();
        expect(screen.getByRole('button', { name: /save architecture/i })).toHaveAccessibleName();
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      renderComponent();

      await waitFor(async () => {
        await user.tab();
        expect(screen.getByRole('button', { name: /add node/i })).toHaveFocus();

        await user.tab();
        expect(screen.getByRole('button', { name: /save architecture/i })).toHaveFocus();

        await user.tab();
        expect(screen.getByRole('button', { name: /edit/i })).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      renderComponent();

      await waitFor(() => {
        const title = screen.getByText('E-commerce Platform');
        expect(title).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Example - adjust based on your actual styles

        const node = screen.getByText('Frontend');
        expect(node).toHaveStyle('color: white'); // Example - adjust based on your actual styles
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture name validation', async () => {
      const user = userEvent.setup();
      renderComponent();

      const editButton = await screen.findByRole('button', { name: /edit/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/architecture name/i);
      await user.clear(nameInput);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(await screen.findByText(/architecture name is required/i)).toBeInTheDocument();
      expect(axios.put).not.toHaveBeenCalled();
    });

    it('should prevent duplicate node names', async () => {
      const user = userEvent.setup();
      renderComponent();

      const addNodeButton = await screen.findByRole('button', { name: /add node/i });
      await user.click(addNodeButton);

      const nodeNameInput = screen.getByLabelText(/node name/i);
      await user.type(nodeNameInput, 'Frontend');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      expect(await screen.findByText(/a node with this name already exists/i)).toBeInTheDocument();
      expect(axios.put).not.toHaveBeenCalled();
    });

    it('should handle connection to same node', async () => {
      const user = userEvent.setup();
      renderComponent();

      const frontendNode = await screen.findByText('Frontend');

      // Simulate attempting to connect node to itself
      fireEvent.mouseDown(frontendNode);
      fireEvent.mouseMove(frontendNode);
      fireEvent.mouseUp(frontendNode);

      expect(await screen.findByText(/cannot connect a node to itself/i)).toBeInTheDocument();
      expect(axios.put).not.toHaveBeenCalled();
    });

    it('should handle rapid successive saves', async () => {
      const user = userEvent.setup();
      (axios.put as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: mockArchitectureData }), 1000))
      );

      renderComponent();

      const saveButton = await screen.findByRole('button', { name: /save architecture/i });

      // Rapid clicks
      await user.click(saveButton);
      await user.click(saveButton);
      await user.click(saveButton);

      // Should only make one request
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Routing and Navigation', () => {
    it('should navigate back to architectures list when clicking back button', async () => {
      const user = userEvent.setup();
      const mockNavigate = jest.fn();
      require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);

      (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      renderComponent();

      const backButton = await screen.findByRole('button', { name: /back to architectures/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/architectures');
    });

    it('should show confirmation when navigating away with unsaved changes', async () => {
      const user = userEvent.setup();
      const mockNavigate = jest.fn();
      require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);

      (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      renderComponent();

      // Make a change
      const addNodeButton = await screen.findByRole('button', { name: /add node/i });
      await user.click(addNodeButton);

      // Try to navigate away
      const backButton = screen.getByRole('button', { name: /back to architectures/i });
      await user.click(backButton);

      expect(await screen.findByText(/you have unsaved changes/i)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { ArchitectureData, NodeType } from '../../types/architecture';

jest.mock('axios');
jest.mock('../../context/AuthContext');
jest.mock('../../hooks/useToast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockArchitectureData: ArchitectureData = {
  id: '1',
  name: 'E-commerce Platform',
  description: 'Modern e-commerce architecture',
  nodes: [
    { id: '1', type: NodeType.Service, name: 'Frontend', position: { x: 100, y: 100 } },
    { id: '2', type: NodeType.Database, name: 'PostgreSQL', position: { x: 300, y: 200 } },
    { id: '3', type: NodeType.External, name: 'Payment Gateway', position: { x: 200, y: 300 } },
  ],
  connections: [
    { id: '1', source: '1', target: '2' },
    { id: '2', source: '1', target: '3' },
  ],
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-02T00:00:00Z',
};

const mockEmptyArchitectureData: ArchitectureData = {
  id: '2',
  name: 'New Architecture',
  description: '',
  nodes: [],
  connections: [],
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const renderComponent = (initialData: ArchitectureData | null = null) => {
  (useAuth as jest.Mock).mockReturnValue({
    user: { id: 'user1', name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
  });

  const mockToast = {
    show: jest.fn(),
    hide: jest.fn(),
  };
  (useToast as jest.Mock).mockReturnValue(mockToast);

  return render(
    <MemoryRouter initialEntries={['/architectures/1']}>
      <Routes>
        <Route path="/architectures/:id" element={<DesignArchitecture initialData={initialData} />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render loading state when data is being fetched', () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading architecture/i)).toBeInTheDocument();
    });

    it('should render error state when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to load architecture/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should render the architecture diagram when data is loaded', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
        expect(screen.getByText('Modern e-commerce architecture')).toBeInTheDocument();
        expect(screen.getByText('Frontend')).toBeInTheDocument();
        expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
      });
    });

    it('should render empty state when no nodes exist', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockEmptyArchitectureData });
      renderComponent(mockEmptyArchitectureData);

      await waitFor(() => {
        expect(screen.getByText(/no nodes in this architecture/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add your first node/i })).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      (axios.put as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      (axios.post as jest.Mock).mockResolvedValue({ data: { ...mockArchitectureData, id: 'new-id' } });
    });

    it('should allow editing architecture name and description', async () => {
      const user = userEvent.setup();
      renderComponent();

      const editButton = await screen.findByRole('button', { name: /edit/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/architecture name/i);
      const descInput = screen.getByLabelText(/description/i);

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated E-commerce Platform');
      await user.clear(descInput);
      await user.type(descInput, 'Updated description');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            name: 'Updated E-commerce Platform',
            description: 'Updated description',
          })
        );
      });
    });

    it('should add a new node to the architecture', async () => {
      const user = userEvent.setup();
      renderComponent();

      const addNodeButton = await screen.findByRole('button', { name: /add node/i });
      await user.click(addNodeButton);

      const nodeTypeSelect = screen.getByLabelText(/node type/i);
      await user.selectOptions(nodeTypeSelect, 'service');

      const nodeNameInput = screen.getByLabelText(/node name/i);
      await user.type(nodeNameInput, 'New Service');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            nodes: expect.arrayContaining([
              expect.objectContaining({ name: 'New Service', type: 'service' })
            ])
          })
        );
      });
    });

    it('should delete a node from the architecture', async () => {
      const user = userEvent.setup();
      renderComponent();

      const node = await screen.findByText('Frontend');
      const deleteButton = within(node.closest('div')!).getByRole('button', { name: /delete/i });

      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            nodes: expect.not.arrayContaining([
              expect.objectContaining({ name: 'Frontend' })
            ]),
            connections: []
          })
        );
      });
    });

    it('should create a connection between nodes', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Mock the connection creation logic
      const frontendNode = await screen.findByText('Frontend');
      const postgresNode = screen.getByText('PostgreSQL');

      // Simulate drag and drop connection
      fireEvent.mouseDown(frontendNode);
      fireEvent.mouseMove(postgresNode);
      fireEvent.mouseUp(postgresNode);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            connections: expect.arrayContaining([
              expect.objectContaining({
                source: expect.any(String),
                target: expect.any(String)
              })
            ])
          })
        );
      });
    });

    it('should delete a connection between nodes', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Find connection line (mock implementation)
      const connectionLine = await screen.findByTestId('connection-1');
      await user.click(connectionLine);

      const deleteButton = screen.getByRole('button', { name: /delete connection/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            connections: []
          })
        );
      });
    });

    it('should save the architecture', async () => {
      const user = userEvent.setup();
      renderComponent();

      const saveButton = await screen.findByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalled();
        expect(useToast().show).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Architecture saved successfully',
            type: 'success',
          })
        );
      });
    });

    it('should handle save errors gracefully', async () => {
      (axios.put as jest.Mock).mockRejectedValue(new Error('Save failed'));
      const user = userEvent.setup();
      renderComponent();

      const saveButton = await screen.findByRole('button', { name: /save architecture/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(useToast().show).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to save architecture',
            type: 'error',
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/architecture diagram/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add node/i })).toHaveAccessibleName();
        expect(screen.getByRole('button', { name: /save architecture/i })).toHaveAccessibleName();
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      renderComponent();

      await waitFor(async () => {
        await user.tab();
        expect(screen.getByRole('button', { name: /add node/i })).toHaveFocus();

        await user.tab();
        expect(screen.getByRole('button', { name: /save architecture/i })).toHaveFocus();

        await user.tab();
        expect(screen.getByRole('button', { name: /edit/i })).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      renderComponent();

      await waitFor(() => {
        const title = screen.getByText('E-commerce Platform');
        expect(title).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Example - adjust based on your actual styles

        const node = screen.getByText('Frontend');
        expect(node).toHaveStyle('color: white'); // Example - adjust based on your actual styles
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty architecture name validation', async () => {
      const user = userEvent.setup();
      renderComponent();

      const editButton = await screen.findByRole('button', { name: /edit/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/architecture name/i);
      await user.clear(nameInput);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(await screen.findByText(/architecture name is required/i)).toBeInTheDocument();
      expect(axios.put).not.toHaveBeenCalled();
    });

    it('should prevent duplicate node names', async () => {
      const user = userEvent.setup();
      renderComponent();

      const addNodeButton = await screen.findByRole('button', { name: /add node/i });
      await user.click(addNodeButton);

      const nodeNameInput = screen.getByLabelText(/node name/i);
      await user.type(nodeNameInput, 'Frontend');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      expect(await screen.findByText(/a node with this name already exists/i)).toBeInTheDocument();
      expect(axios.put).not.toHaveBeenCalled();
    });

    it('should handle connection to same node', async () => {
      const user = userEvent.setup();
      renderComponent();

      const frontendNode = await screen.findByText('Frontend');

      // Simulate attempting to connect node to itself
      fireEvent.mouseDown(frontendNode);
      fireEvent.mouseMove(frontendNode);
      fireEvent.mouseUp(frontendNode);

      expect(await screen.findByText(/cannot connect a node to itself/i)).toBeInTheDocument();
      expect(axios.put).not.toHaveBeenCalled();
    });

    it('should handle rapid successive saves', async () => {
      const user = userEvent.setup();
      (axios.put as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: mockArchitectureData }), 1000))
      );

      renderComponent();

      const saveButton = await screen.findByRole('button', { name: /save architecture/i });

      // Rapid clicks
      await user.click(saveButton);
      await user.click(saveButton);
      await user.click(saveButton);

      // Should only make one request
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Routing and Navigation', () => {
    it('should navigate back to architectures list when clicking back button', async () => {
      const user = userEvent.setup();
      const mockNavigate = jest.fn();
      require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);

      (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      renderComponent();

      const backButton = await screen.findByRole('button', { name: /back to architectures/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/architectures');
    });

    it('should show confirmation when navigating away with unsaved changes', async () => {
      const user = userEvent.setup();
      const mockNavigate = jest.fn();
      require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);

      (axios.get as jest.Mock).mockResolvedValue({ data: mockArchitectureData });
      renderComponent();

      // Make a change
      const addNodeButton = await screen.findByRole('button', { name: /add node/i });
      await user.click(addNodeButton);

      // Try to navigate away
      const backButton = screen.getByRole('button', { name: /back to architectures/i });
      await user.click(backButton);

      expect(await screen.findByText(/you have unsaved changes/i)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});