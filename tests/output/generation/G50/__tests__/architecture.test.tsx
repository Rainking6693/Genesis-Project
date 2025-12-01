import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DesignArchitecture from './DesignArchitecture';
import { ArchitectureContext } from '../../context/ArchitectureContext';
import { ToastContainer } from 'react-toastify';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '123', role: 'architect' } }),
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockDesignData = {
  id: '1',
  name: 'Modern Villa',
  description: 'A contemporary villa design',
  blueprints: ['floor1.png', 'floor2.png'],
  materials: ['concrete', 'glass', 'steel'],
  status: 'draft',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-02T00:00:00Z',
  architectId: '123',
};

const mockContextValue = {
  designs: [mockDesignData],
  loading: false,
  error: null,
  addDesign: jest.fn(),
  updateDesign: jest.fn(),
  deleteDesign: jest.fn(),
  fetchDesigns: jest.fn(),
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: [mockDesignData] });
  });

  const renderComponent = (ui: React.ReactElement, route = '/designs') => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <ArchitectureContext.Provider value={mockContextValue}>
          <ToastContainer />
          <Routes>
            <Route path="/designs" element={ui} />
            <Route path="/designs/:id" element={<div>Design Detail</div>} />
            <Route path="/designs/new" element={<div>New Design</div>} />
          </Routes>
        </ArchitectureContext.Provider>
      </MemoryRouter>
    );
  };

  describe('Rendering and Initial State', () => {
    it('should render the component with loading state initially', async () => {
      mockContextValue.loading = true;
      renderComponent(<DesignArchitecture />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading designs/i)).toBeInTheDocument();
    });

    it('should render the design list when data is loaded', async () => {
      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText('Modern Villa')).toBeInTheDocument();
        expect(screen.getByText('A contemporary villa design')).toBeInTheDocument();
        expect(screen.getByText('Draft')).toBeInTheDocument();
      });
    });

    it('should display error message when fetch fails', async () => {
      mockContextValue.error = 'Failed to fetch designs';
      renderComponent(<DesignArchitecture />);

      expect(screen.getByText(/failed to fetch designs/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should navigate to design detail when clicking on a design card', async () => {
      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Modern Villa'));
      });

      expect(mockNavigate).toHaveBeenCalledWith('/designs/1');
    });

    it('should open the new design modal when clicking the add button', async () => {
      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /add new design/i }));
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/design name/i)).toBeInTheDocument();
    });

    it('should filter designs based on search input', async () => {
      renderComponent(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search designs/i);
      await userEvent.type(searchInput, 'villa');

      expect(screen.getByText('Modern Villa')).toBeInTheDocument();
    });

    it('should filter designs by status', async () => {
      renderComponent(<DesignArchitecture />);

      const statusFilter = screen.getByLabelText(/filter by status/i);
      await userEvent.selectOptions(statusFilter, 'draft');

      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('should sort designs by date', async () => {
      renderComponent(<DesignArchitecture />);

      const sortButton = screen.getByRole('button', { name: /sort by/i });
      await userEvent.click(sortButton);

      const menuItem = screen.getByRole('menuitem', { name: /newest first/i });
      await userEvent.click(menuItem);

      expect(mockContextValue.fetchDesigns).toHaveBeenCalledWith({ sort: 'newest' });
    });
  });

  describe('Design Management', () => {
    it('should create a new design when form is submitted', async () => {
      mockContextValue.addDesign.mockResolvedValue({ ...mockDesignData, id: '2' });
      renderComponent(<DesignArchitecture />);

      fireEvent.click(screen.getByRole('button', { name: /add new design/i }));

      await userEvent.type(screen.getByLabelText(/design name/i), 'New Design');
      await userEvent.type(screen.getByLabelText(/description/i), 'New description');
      await userEvent.click(screen.getByLabelText(/concrete/i));
      await userEvent.upload(screen.getByLabelText(/upload blueprints/i), new File([''], 'test.png', { type: 'image/png' }));

      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockContextValue.addDesign).toHaveBeenCalledWith({
          name: 'New Design',
          description: 'New description',
          materials: expect.arrayContaining(['concrete']),
          blueprints: expect.any(Array),
        });
      });
    });

    it('should show validation errors when form is submitted with invalid data', async () => {
      renderComponent(<DesignArchitecture />);

      fireEvent.click(screen.getByRole('button', { name: /add new design/i }));
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      expect(await screen.findByText(/design name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });

    it('should delete a design when delete button is clicked', async () => {
      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText(/delete design/i);
        fireEvent.click(deleteButtons[0]);
      });

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(mockContextValue.deleteDesign).toHaveBeenCalledWith('1');
      });
    });

    it('should update design status when status is changed', async () => {
      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        const statusSelect = screen.getAllByLabelText(/change status/i)[0];
        fireEvent.change(statusSelect, { target: { value: 'approved' } });
      });

      await waitFor(() => {
        expect(mockContextValue.updateDesign).toHaveBeenCalledWith('1', { status: 'approved' });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderComponent(<DesignArchitecture />);

      expect(screen.getByLabelText(/search designs/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add new design/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sort by/i })).toBeInTheDocument();
    });

    it('should have proper heading structure', async () => {
      renderComponent(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /design portfolio/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /modern villa/i })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add new design/i });
        expect(addButton).toHaveFocus();

        fireEvent.keyDown(addButton, { key: 'Enter', code: 'Enter' });
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should have proper contrast ratios for text', async () => {
      renderComponent(<DesignArchitecture />);

      const heading = screen.getByRole('heading', { name: /design portfolio/i });
      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');

      const cardTitle = screen.getByText('Modern Villa');
      expect(cardTitle).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design list', async () => {
      mockContextValue.designs = [];
      renderComponent(<DesignArchitecture />);

      expect(screen.getByText(/no designs found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add new design/i })).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));
      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should disable actions for non-architect users', async () => {
      jest.mock('../../hooks/useAuth', () => ({
        useAuth: () => ({ user: { id: '456', role: 'client' } }),
      }));

      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /add new design/i })).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/delete design/i)).not.toBeInTheDocument();
      });
    });

    it('should handle large file uploads with appropriate feedback', async () => {
      renderComponent(<DesignArchitecture />);

      fireEvent.click(screen.getByRole('button', { name: /add new design/i }));

      const largeFile = new File(['a'.repeat(1024 * 1024 * 10)], 'large.png', { type: 'image/png' });
      const fileInput = screen.getByLabelText(/upload blueprints/i);

      await userEvent.upload(fileInput, largeFile);

      expect(await screen.findByText(/file size exceeds 5mb limit/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should implement virtualization for large design lists', async () => {
      const largeDesignList = Array(100).fill(null).map((_, i) => ({
        ...mockDesignData,
        id: `${i}`,
        name: `Design ${i}`,
      }));

      mockContextValue.designs = largeDesignList;
      renderComponent(<DesignArchitecture />);

      // Check that not all items are rendered initially (virtualization)
      expect(screen.queryByText('Design 99')).not.toBeInTheDocument();

      // Simulate scrolling
      const container = screen.getByTestId('design-list-container');
      fireEvent.scroll(container, { target: { scrollTop: 10000 } });

      await waitFor(() => {
        expect(screen.getByText('Design 50')).toBeInTheDocument();
      });
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
import { ToastContainer } from 'react-toastify';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '123', role: 'architect' } }),
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockDesignData = {
  id: '1',
  name: 'Modern Villa',
  description: 'A contemporary villa design',
  blueprints: ['floor1.png', 'floor2.png'],
  materials: ['concrete', 'glass', 'steel'],
  status: 'draft',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-02T00:00:00Z',
  architectId: '123',
};

const mockContextValue = {
  designs: [mockDesignData],
  loading: false,
  error: null,
  addDesign: jest.fn(),
  updateDesign: jest.fn(),
  deleteDesign: jest.fn(),
  fetchDesigns: jest.fn(),
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: [mockDesignData] });
  });

  const renderComponent = (ui: React.ReactElement, route = '/designs') => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <ArchitectureContext.Provider value={mockContextValue}>
          <ToastContainer />
          <Routes>
            <Route path="/designs" element={ui} />
            <Route path="/designs/:id" element={<div>Design Detail</div>} />
            <Route path="/designs/new" element={<div>New Design</div>} />
          </Routes>
        </ArchitectureContext.Provider>
      </MemoryRouter>
    );
  };

  describe('Rendering and Initial State', () => {
    it('should render the component with loading state initially', async () => {
      mockContextValue.loading = true;
      renderComponent(<DesignArchitecture />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading designs/i)).toBeInTheDocument();
    });

    it('should render the design list when data is loaded', async () => {
      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText('Modern Villa')).toBeInTheDocument();
        expect(screen.getByText('A contemporary villa design')).toBeInTheDocument();
        expect(screen.getByText('Draft')).toBeInTheDocument();
      });
    });

    it('should display error message when fetch fails', async () => {
      mockContextValue.error = 'Failed to fetch designs';
      renderComponent(<DesignArchitecture />);

      expect(screen.getByText(/failed to fetch designs/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should navigate to design detail when clicking on a design card', async () => {
      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Modern Villa'));
      });

      expect(mockNavigate).toHaveBeenCalledWith('/designs/1');
    });

    it('should open the new design modal when clicking the add button', async () => {
      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /add new design/i }));
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/design name/i)).toBeInTheDocument();
    });

    it('should filter designs based on search input', async () => {
      renderComponent(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search designs/i);
      await userEvent.type(searchInput, 'villa');

      expect(screen.getByText('Modern Villa')).toBeInTheDocument();
    });

    it('should filter designs by status', async () => {
      renderComponent(<DesignArchitecture />);

      const statusFilter = screen.getByLabelText(/filter by status/i);
      await userEvent.selectOptions(statusFilter, 'draft');

      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('should sort designs by date', async () => {
      renderComponent(<DesignArchitecture />);

      const sortButton = screen.getByRole('button', { name: /sort by/i });
      await userEvent.click(sortButton);

      const menuItem = screen.getByRole('menuitem', { name: /newest first/i });
      await userEvent.click(menuItem);

      expect(mockContextValue.fetchDesigns).toHaveBeenCalledWith({ sort: 'newest' });
    });
  });

  describe('Design Management', () => {
    it('should create a new design when form is submitted', async () => {
      mockContextValue.addDesign.mockResolvedValue({ ...mockDesignData, id: '2' });
      renderComponent(<DesignArchitecture />);

      fireEvent.click(screen.getByRole('button', { name: /add new design/i }));

      await userEvent.type(screen.getByLabelText(/design name/i), 'New Design');
      await userEvent.type(screen.getByLabelText(/description/i), 'New description');
      await userEvent.click(screen.getByLabelText(/concrete/i));
      await userEvent.upload(screen.getByLabelText(/upload blueprints/i), new File([''], 'test.png', { type: 'image/png' }));

      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockContextValue.addDesign).toHaveBeenCalledWith({
          name: 'New Design',
          description: 'New description',
          materials: expect.arrayContaining(['concrete']),
          blueprints: expect.any(Array),
        });
      });
    });

    it('should show validation errors when form is submitted with invalid data', async () => {
      renderComponent(<DesignArchitecture />);

      fireEvent.click(screen.getByRole('button', { name: /add new design/i }));
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      expect(await screen.findByText(/design name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });

    it('should delete a design when delete button is clicked', async () => {
      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText(/delete design/i);
        fireEvent.click(deleteButtons[0]);
      });

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(mockContextValue.deleteDesign).toHaveBeenCalledWith('1');
      });
    });

    it('should update design status when status is changed', async () => {
      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        const statusSelect = screen.getAllByLabelText(/change status/i)[0];
        fireEvent.change(statusSelect, { target: { value: 'approved' } });
      });

      await waitFor(() => {
        expect(mockContextValue.updateDesign).toHaveBeenCalledWith('1', { status: 'approved' });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderComponent(<DesignArchitecture />);

      expect(screen.getByLabelText(/search designs/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add new design/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sort by/i })).toBeInTheDocument();
    });

    it('should have proper heading structure', async () => {
      renderComponent(<DesignArchitecture />);

      expect(screen.getByRole('heading', { name: /design portfolio/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /modern villa/i })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add new design/i });
        expect(addButton).toHaveFocus();

        fireEvent.keyDown(addButton, { key: 'Enter', code: 'Enter' });
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should have proper contrast ratios for text', async () => {
      renderComponent(<DesignArchitecture />);

      const heading = screen.getByRole('heading', { name: /design portfolio/i });
      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');

      const cardTitle = screen.getByText('Modern Villa');
      expect(cardTitle).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty design list', async () => {
      mockContextValue.designs = [];
      renderComponent(<DesignArchitecture />);

      expect(screen.getByText(/no designs found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add new design/i })).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));
      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should disable actions for non-architect users', async () => {
      jest.mock('../../hooks/useAuth', () => ({
        useAuth: () => ({ user: { id: '456', role: 'client' } }),
      }));

      renderComponent(<DesignArchitecture />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /add new design/i })).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/delete design/i)).not.toBeInTheDocument();
      });
    });

    it('should handle large file uploads with appropriate feedback', async () => {
      renderComponent(<DesignArchitecture />);

      fireEvent.click(screen.getByRole('button', { name: /add new design/i }));

      const largeFile = new File(['a'.repeat(1024 * 1024 * 10)], 'large.png', { type: 'image/png' });
      const fileInput = screen.getByLabelText(/upload blueprints/i);

      await userEvent.upload(fileInput, largeFile);

      expect(await screen.findByText(/file size exceeds 5mb limit/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should implement virtualization for large design lists', async () => {
      const largeDesignList = Array(100).fill(null).map((_, i) => ({
        ...mockDesignData,
        id: `${i}`,
        name: `Design ${i}`,
      }));

      mockContextValue.designs = largeDesignList;
      renderComponent(<DesignArchitecture />);

      // Check that not all items are rendered initially (virtualization)
      expect(screen.queryByText('Design 99')).not.toBeInTheDocument();

      // Simulate scrolling
      const container = screen.getByTestId('design-list-container');
      fireEvent.scroll(container, { target: { scrollTop: 10000 } });

      await waitFor(() => {
        expect(screen.getByText('Design 50')).toBeInTheDocument();
      });
    });
  });
});