import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Dashboard from './Dashboard';
import { DashboardProvider } from './DashboardContext';
import { mockDashboardData, mockErrorResponse, mockEmptyData } from './mocks/dashboardMocks';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('./api/dashboardApi', () => ({
  fetchDashboardData: jest.fn(),
  updateWidget: jest.fn(),
  deleteWidget: jest.fn(),
  addWidget: jest.fn(),
  exportDashboardData: jest.fn(),
}));

describe('Dashboard Component', () => {
  const renderDashboard = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <DashboardProvider>
          <Routes>
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </DashboardProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockDashboardData });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: mockDashboardData }), 1000))
      );

      renderDashboard();

      expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('widget-grid')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument();
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should display empty state when no widgets are available', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockEmptyData });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/no widgets available/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add your first widget/i })).toBeInTheDocument();
      });
    });
  });

  describe('Widget Interactions', () => {
    beforeEach(async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });
    });

    it('should allow adding a new widget', async () => {
      const user = userEvent.setup();
      const newWidget = { id: '3', type: 'chart', title: 'New Widget', config: {} };

      (axios.post as jest.Mock).mockResolvedValue({ data: newWidget });

      const addButton = screen.getByRole('button', { name: /add widget/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/add new widget/i)).toBeInTheDocument();

      const widgetTypeSelect = within(modal).getByLabelText(/widget type/i);
      await user.selectOptions(widgetTypeSelect, 'chart');

      const titleInput = within(modal).getByLabelText(/title/i);
      await user.type(titleInput, 'New Widget');

      const submitButton = within(modal).getByRole('button', { name: /add/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
          type: 'chart',
          title: 'New Widget'
        }));
        expect(screen.getByText('New Widget')).toBeInTheDocument();
      });
    });

    it('should show validation errors when adding widget with invalid data', async () => {
      const user = userEvent.setup();

      const addButton = screen.getByRole('button', { name: /add widget/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const submitButton = within(modal).getByRole('button', { name: /add/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(within(modal).getByText(/widget type is required/i)).toBeInTheDocument();
        expect(within(modal).getByText(/title is required/i)).toBeInTheDocument();
      });
    });

    it('should allow editing an existing widget', async () => {
      const user = userEvent.setup();
      const updatedWidget = { ...mockDashboardData.widgets[0], title: 'Updated Title' };

      (axios.put as jest.Mock).mockResolvedValue({ data: updatedWidget });

      const editButton = screen.getAllByLabelText(/edit widget/i)[0];
      await user.click(editButton);

      const modal = screen.getByRole('dialog');
      const titleInput = within(modal).getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      const submitButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ title: 'Updated Title' })
        );
        expect(screen.getByText('Updated Title')).toBeInTheDocument();
      });
    });

    it('should allow deleting a widget with confirmation', async () => {
      const user = userEvent.setup();

      (axios.delete as jest.Mock).mockResolvedValue({ data: { success: true } });

      const deleteButton = screen.getAllByLabelText(/delete widget/i)[0];
      await user.click(deleteButton);

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      const confirmButton = within(modal).getByRole('button', { name: /delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalled();
        expect(screen.queryByText(mockDashboardData.widgets[0].title)).not.toBeInTheDocument();
      });
    });

    it('should cancel widget deletion when user declines', async () => {
      const user = userEvent.setup();

      const deleteButton = screen.getAllByLabelText(/delete widget/i)[0];
      await user.click(deleteButton);

      const modal = screen.getByRole('dialog');
      const cancelButton = within(modal).getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(axios.delete).not.toHaveBeenCalled();
        expect(screen.getByText(mockDashboardData.widgets[0].title)).toBeInTheDocument();
      });
    });
  });

  describe('Widget Reordering', () => {
    it('should allow dragging and dropping widgets to reorder them', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });

      const widgets = screen.getAllByTestId(/widget-/);
      const firstWidget = widgets[0];
      const secondWidget = widgets[1];

      // Simulate drag and drop
      fireEvent.dragStart(firstWidget);
      fireEvent.dragEnter(secondWidget);
      fireEvent.dragOver(secondWidget);
      fireEvent.drop(secondWidget);
      fireEvent.dragEnd(firstWidget);

      // Verify the order has changed
      const updatedWidgets = screen.getAllByTestId(/widget-/);
      expect(updatedWidgets[0]).toHaveTextContent(mockDashboardData.widgets[1].title);
      expect(updatedWidgets[1]).toHaveTextContent(mockDashboardData.widgets[0].title);
    });
  });

  describe('Data Export', () => {
    it('should allow exporting dashboard data as JSON', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['dashboard data'], { type: 'application/json' });
      const mockUrl = 'blob:url';

      jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
      jest.spyOn(document, 'createElement').mockImplementation(() => ({
        click: jest.fn(),
        setAttribute: jest.fn(),
      }) as unknown as HTMLElement);

      (axios.post as jest.Mock).mockResolvedValue({
        data: { downloadUrl: mockUrl }
      });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(expect.any(String), {
          widgets: mockDashboardData.widgets,
          layout: mockDashboardData.layout
        });
        expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      });
    });

    it('should show error when export fails', async () => {
      const user = userEvent.setup();

      (axios.post as jest.Mock).mockRejectedValue(new Error('Export failed'));

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to export dashboard data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for widgets', async () => {
      renderDashboard();

      await waitFor(() => {
        const widgets = screen.getAllByTestId(/widget-/);
        widgets.forEach(widget => {
          expect(widget).toHaveAttribute('role', 'article');
          expect(widget).toHaveAttribute('aria-labelledby');
        });
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /add widget/i })).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText(/edit widget/i)[0]).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText(/delete widget/i)[0]).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderDashboard();

      await waitFor(() => {
        const textElements = screen.getAllByText(/widget/i);
        textElements.forEach(element => {
          const style = window.getComputedStyle(element);
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          // This is a simplified check - in real tests you'd use a proper contrast checking library
          expect(color).not.toBe(backgroundColor);
        });
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', async () => {
      // Mock mobile viewport
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      renderDashboard();

      await waitFor(() => {
        const grid = screen.getByTestId('widget-grid');
        expect(grid).toHaveStyle('grid-template-columns: 1fr');
      });
    });

    it('should adjust layout for desktop viewports', async () => {
      // Mock desktop viewport
      window.innerWidth = 1200;
      fireEvent(window, new Event('resize'));

      renderDashboard();

      await waitFor(() => {
        const grid = screen.getByTestId('widget-grid');
        expect(grid).toHaveStyle('grid-template-columns: repeat(3, 1fr)');
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should display error boundary when a widget crashes', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock a widget that throws an error
      jest.mock('./components/Widget', () => ({
        __esModule: true,
        default: () => {
          throw new Error('Widget crashed');
        }
      }));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/something went wrong with this widget/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reload widget/i })).toBeInTheDocument();
      });

      jest.unmock('./components/Widget');
    });
  });

  describe('Route Navigation', () => {
    it('should navigate to widget details when clicking on a widget', async () => {
      const user = userEvent.setup();
      require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });

      const widget = screen.getAllByTestId(/widget-/)[0];
      await user.click(widget);

      expect(mockNavigate).toHaveBeenCalledWith(`/widget/${mockDashboardData.widgets[0].id}`);
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Dashboard from './Dashboard';
import { DashboardProvider } from './DashboardContext';
import { mockDashboardData, mockErrorResponse, mockEmptyData } from './mocks/dashboardMocks';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('./api/dashboardApi', () => ({
  fetchDashboardData: jest.fn(),
  updateWidget: jest.fn(),
  deleteWidget: jest.fn(),
  addWidget: jest.fn(),
  exportDashboardData: jest.fn(),
}));

describe('Dashboard Component', () => {
  const renderDashboard = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <DashboardProvider>
          <Routes>
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </DashboardProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockDashboardData });
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: mockDashboardData }), 1000))
      );

      renderDashboard();

      expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('widget-grid')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument();
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });
    });

    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should display empty state when no widgets are available', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockEmptyData });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/no widgets available/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add your first widget/i })).toBeInTheDocument();
      });
    });
  });

  describe('Widget Interactions', () => {
    beforeEach(async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });
    });

    it('should allow adding a new widget', async () => {
      const user = userEvent.setup();
      const newWidget = { id: '3', type: 'chart', title: 'New Widget', config: {} };

      (axios.post as jest.Mock).mockResolvedValue({ data: newWidget });

      const addButton = screen.getByRole('button', { name: /add widget/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/add new widget/i)).toBeInTheDocument();

      const widgetTypeSelect = within(modal).getByLabelText(/widget type/i);
      await user.selectOptions(widgetTypeSelect, 'chart');

      const titleInput = within(modal).getByLabelText(/title/i);
      await user.type(titleInput, 'New Widget');

      const submitButton = within(modal).getByRole('button', { name: /add/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
          type: 'chart',
          title: 'New Widget'
        }));
        expect(screen.getByText('New Widget')).toBeInTheDocument();
      });
    });

    it('should show validation errors when adding widget with invalid data', async () => {
      const user = userEvent.setup();

      const addButton = screen.getByRole('button', { name: /add widget/i });
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const submitButton = within(modal).getByRole('button', { name: /add/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(within(modal).getByText(/widget type is required/i)).toBeInTheDocument();
        expect(within(modal).getByText(/title is required/i)).toBeInTheDocument();
      });
    });

    it('should allow editing an existing widget', async () => {
      const user = userEvent.setup();
      const updatedWidget = { ...mockDashboardData.widgets[0], title: 'Updated Title' };

      (axios.put as jest.Mock).mockResolvedValue({ data: updatedWidget });

      const editButton = screen.getAllByLabelText(/edit widget/i)[0];
      await user.click(editButton);

      const modal = screen.getByRole('dialog');
      const titleInput = within(modal).getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      const submitButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ title: 'Updated Title' })
        );
        expect(screen.getByText('Updated Title')).toBeInTheDocument();
      });
    });

    it('should allow deleting a widget with confirmation', async () => {
      const user = userEvent.setup();

      (axios.delete as jest.Mock).mockResolvedValue({ data: { success: true } });

      const deleteButton = screen.getAllByLabelText(/delete widget/i)[0];
      await user.click(deleteButton);

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      const confirmButton = within(modal).getByRole('button', { name: /delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalled();
        expect(screen.queryByText(mockDashboardData.widgets[0].title)).not.toBeInTheDocument();
      });
    });

    it('should cancel widget deletion when user declines', async () => {
      const user = userEvent.setup();

      const deleteButton = screen.getAllByLabelText(/delete widget/i)[0];
      await user.click(deleteButton);

      const modal = screen.getByRole('dialog');
      const cancelButton = within(modal).getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(axios.delete).not.toHaveBeenCalled();
        expect(screen.getByText(mockDashboardData.widgets[0].title)).toBeInTheDocument();
      });
    });
  });

  describe('Widget Reordering', () => {
    it('should allow dragging and dropping widgets to reorder them', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });

      const widgets = screen.getAllByTestId(/widget-/);
      const firstWidget = widgets[0];
      const secondWidget = widgets[1];

      // Simulate drag and drop
      fireEvent.dragStart(firstWidget);
      fireEvent.dragEnter(secondWidget);
      fireEvent.dragOver(secondWidget);
      fireEvent.drop(secondWidget);
      fireEvent.dragEnd(firstWidget);

      // Verify the order has changed
      const updatedWidgets = screen.getAllByTestId(/widget-/);
      expect(updatedWidgets[0]).toHaveTextContent(mockDashboardData.widgets[1].title);
      expect(updatedWidgets[1]).toHaveTextContent(mockDashboardData.widgets[0].title);
    });
  });

  describe('Data Export', () => {
    it('should allow exporting dashboard data as JSON', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['dashboard data'], { type: 'application/json' });
      const mockUrl = 'blob:url';

      jest.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
      jest.spyOn(document, 'createElement').mockImplementation(() => ({
        click: jest.fn(),
        setAttribute: jest.fn(),
      }) as unknown as HTMLElement);

      (axios.post as jest.Mock).mockResolvedValue({
        data: { downloadUrl: mockUrl }
      });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(expect.any(String), {
          widgets: mockDashboardData.widgets,
          layout: mockDashboardData.layout
        });
        expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      });
    });

    it('should show error when export fails', async () => {
      const user = userEvent.setup();

      (axios.post as jest.Mock).mockRejectedValue(new Error('Export failed'));

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to export dashboard data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for widgets', async () => {
      renderDashboard();

      await waitFor(() => {
        const widgets = screen.getAllByTestId(/widget-/);
        widgets.forEach(widget => {
          expect(widget).toHaveAttribute('role', 'article');
          expect(widget).toHaveAttribute('aria-labelledby');
        });
      });
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /add widget/i })).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText(/edit widget/i)[0]).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText(/delete widget/i)[0]).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderDashboard();

      await waitFor(() => {
        const textElements = screen.getAllByText(/widget/i);
        textElements.forEach(element => {
          const style = window.getComputedStyle(element);
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          // This is a simplified check - in real tests you'd use a proper contrast checking library
          expect(color).not.toBe(backgroundColor);
        });
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', async () => {
      // Mock mobile viewport
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      renderDashboard();

      await waitFor(() => {
        const grid = screen.getByTestId('widget-grid');
        expect(grid).toHaveStyle('grid-template-columns: 1fr');
      });
    });

    it('should adjust layout for desktop viewports', async () => {
      // Mock desktop viewport
      window.innerWidth = 1200;
      fireEvent(window, new Event('resize'));

      renderDashboard();

      await waitFor(() => {
        const grid = screen.getByTestId('widget-grid');
        expect(grid).toHaveStyle('grid-template-columns: repeat(3, 1fr)');
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should display error boundary when a widget crashes', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock a widget that throws an error
      jest.mock('./components/Widget', () => ({
        __esModule: true,
        default: () => {
          throw new Error('Widget crashed');
        }
      }));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/something went wrong with this widget/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reload widget/i })).toBeInTheDocument();
      });

      jest.unmock('./components/Widget');
    });
  });

  describe('Route Navigation', () => {
    it('should navigate to widget details when clicking on a widget', async () => {
      const user = userEvent.setup();
      require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });

      const widget = screen.getAllByTestId(/widget-/)[0];
      await user.click(widget);

      expect(mockNavigate).toHaveBeenCalledWith(`/widget/${mockDashboardData.widgets[0].id}`);
    });
  });
});