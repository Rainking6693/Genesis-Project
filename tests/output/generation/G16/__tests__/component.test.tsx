import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
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
}));

describe('Dashboard Component', () => {
  const renderDashboard = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <DashboardProvider>
          <Route path="/" element={<Dashboard />} />
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
        new Promise((resolve) => setTimeout(() => resolve({ data: mockDashboardData }), 1000))
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
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should allow retry after fetch failure', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce({ data: mockDashboardData });

      renderDashboard();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });
    });
  });

  describe('Widget Interaction', () => {
    beforeEach(() => {
      renderDashboard();
    });

    it('should render all widgets with correct data', async () => {
      await waitFor(() => {
        mockDashboardData.widgets.forEach(widget => {
          expect(screen.getByText(widget.title)).toBeInTheDocument();
          expect(screen.getByText(widget.value.toString())).toBeInTheDocument();
        });
      });
    });

    it('should allow widget configuration through settings modal', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        const settingsButtons = screen.getAllByLabelText(/widget settings/i);
        fireEvent.click(settingsButtons[0]);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/widget title/i)).toHaveValue(mockDashboardData.widgets[0].title);

      await user.clear(screen.getByLabelText(/widget title/i));
      await user.type(screen.getByLabelText(/widget title/i), 'Updated Title');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Updated Title')).toBeInTheDocument();
      });
    });

    it('should handle widget configuration errors', async () => {
      (axios.put as jest.Mock).mockRejectedValue(mockErrorResponse);

      await waitFor(() => {
        const settingsButtons = screen.getAllByLabelText(/widget settings/i);
        fireEvent.click(settingsButtons[0]);
      });

      await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to update widget/i)).toBeInTheDocument();
      });
    });

    it('should allow widget deletion with confirmation', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});

      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText(/delete widget/i);
        fireEvent.click(deleteButtons[0]);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(screen.queryByText(mockDashboardData.widgets[0].title)).not.toBeInTheDocument();
      });
    });

    it('should cancel widget deletion when user declines', async () => {
      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText(/delete widget/i);
        fireEvent.click(deleteButtons[0]);
      });

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.getByText(mockDashboardData.widgets[0].title)).toBeInTheDocument();
      });
    });
  });

  describe('Widget Addition', () => {
    it('should open add widget modal and add new widget', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          ...mockDashboardData.widgets[0],
          id: 'new-widget-1',
          title: 'New Widget'
        }
      });

      renderDashboard();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /add widget/i }));
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await userEvent.selectOptions(screen.getByLabelText(/widget type/i), 'metric');
      await userEvent.type(screen.getByLabelText(/widget title/i), 'New Widget');
      await userEvent.click(screen.getByRole('button', { name: /add widget/i }));

      await waitFor(() => {
        expect(screen.getByText('New Widget')).toBeInTheDocument();
      });
    });

    it('should show validation errors when adding widget with invalid data', async () => {
      renderDashboard();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /add widget/i }));
      });

      await userEvent.click(screen.getByRole('button', { name: /add widget/i }));

      expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/widget type is required/i)).toBeInTheDocument();
    });
  });

  describe('Layout Management', () => {
    it('should allow widget reordering via drag and drop', async () => {
      renderDashboard();

      await waitFor(() => {
        const widgets = screen.getAllByTestId(/widget-/i);
        const dragHandle = within(widgets[0]).getByLabelText(/drag handle/i);
        const dropTarget = widgets[1];

        fireEvent.dragStart(dragHandle);
        fireEvent.dragEnter(dropTarget);
        fireEvent.dragOver(dropTarget);
        fireEvent.drop(dropTarget);
      });

      // Verify reordering by checking positions or API call
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalled();
      });
    });

    it('should persist layout changes after reordering', async () => {
      (axios.put as jest.Mock).mockResolvedValue({});

      renderDashboard();

      await waitFor(async () => {
        const widgets = screen.getAllByTestId(/widget-/i);
        const dragHandle = within(widgets[0]).getByLabelText(/drag handle/i);
        const dropTarget = widgets[1];

        fireEvent.dragStart(dragHandle);
        fireEvent.dragEnter(dropTarget);
        fireEvent.dragOver(dropTarget);
        fireEvent.drop(dropTarget);
      });

      await waitFor(() => {
        expect(screen.getByText(mockDashboardData.widgets[0].title)).toBeInTheDocument();
        expect(screen.getByText(mockDashboardData.widgets[1].title)).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no widgets exist', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockEmptyData });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/no widgets added yet/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add your first widget/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for widgets', async () => {
      renderDashboard();

      await waitFor(() => {
        const widgets = screen.getAllByTestId(/widget-/i);
        widgets.forEach(widget => {
          expect(widget).toHaveAttribute('role', 'article');
          expect(widget).toHaveAccessibleName();
        });
      });
    });

    it('should be navigable via keyboard', async () => {
      renderDashboard();

      await waitFor(() => {
        const addWidgetButton = screen.getByRole('button', { name: /add widget/i });
        expect(addWidgetButton).toHaveFocus();

        // Tab through interactive elements
        userEvent.tab();
        const firstWidgetSettings = screen.getAllByLabelText(/widget settings/i)[0];
        expect(firstWidgetSettings).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderDashboard();

      await waitFor(() => {
        const widgetTitles = screen.getAllByText(/revenue|users|conversion/i);
        widgetTitles.forEach(title => {
          expect(title).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // or your actual color
        });
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', async () => {
      global.innerWidth = 600;
      global.dispatchEvent(new Event('resize'));

      renderDashboard();

      await waitFor(() => {
        const widgetGrid = screen.getByTestId('widget-grid');
        expect(widgetGrid).toHaveStyle('grid-template-columns: 1fr');
      });

      // Reset
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });
  });

  describe('Data Refresh', () => {
    it('should refresh data when refresh button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDashboardData })
        .mockResolvedValueOnce({ data: { ...mockDashboardData, lastUpdated: new Date().toISOString() } });

      renderDashboard();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /refresh data/i }));
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should show loading state during refresh', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockDashboardData }), 1000))
      );

      renderDashboard();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /refresh data/i }));
        expect(screen.getByTestId('refresh-loading')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component errors gracefully', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalWidget = require('./Widget').default;

      jest.mock('./Widget', () => ({
        __esModule: true,
        default: function MockWidget() {
          throw new Error('Widget rendering error');
        }
      }));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
      });

      // Restore original component
      jest.unmock('./Widget');
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
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
}));

describe('Dashboard Component', () => {
  const renderDashboard = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <DashboardProvider>
          <Route path="/" element={<Dashboard />} />
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
        new Promise((resolve) => setTimeout(() => resolve({ data: mockDashboardData }), 1000))
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
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should allow retry after fetch failure', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce({ data: mockDashboardData });

      renderDashboard();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
      });
    });
  });

  describe('Widget Interaction', () => {
    beforeEach(() => {
      renderDashboard();
    });

    it('should render all widgets with correct data', async () => {
      await waitFor(() => {
        mockDashboardData.widgets.forEach(widget => {
          expect(screen.getByText(widget.title)).toBeInTheDocument();
          expect(screen.getByText(widget.value.toString())).toBeInTheDocument();
        });
      });
    });

    it('should allow widget configuration through settings modal', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        const settingsButtons = screen.getAllByLabelText(/widget settings/i);
        fireEvent.click(settingsButtons[0]);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/widget title/i)).toHaveValue(mockDashboardData.widgets[0].title);

      await user.clear(screen.getByLabelText(/widget title/i));
      await user.type(screen.getByLabelText(/widget title/i), 'Updated Title');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Updated Title')).toBeInTheDocument();
      });
    });

    it('should handle widget configuration errors', async () => {
      (axios.put as jest.Mock).mockRejectedValue(mockErrorResponse);

      await waitFor(() => {
        const settingsButtons = screen.getAllByLabelText(/widget settings/i);
        fireEvent.click(settingsButtons[0]);
      });

      await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to update widget/i)).toBeInTheDocument();
      });
    });

    it('should allow widget deletion with confirmation', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});

      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText(/delete widget/i);
        fireEvent.click(deleteButtons[0]);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(screen.queryByText(mockDashboardData.widgets[0].title)).not.toBeInTheDocument();
      });
    });

    it('should cancel widget deletion when user declines', async () => {
      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText(/delete widget/i);
        fireEvent.click(deleteButtons[0]);
      });

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.getByText(mockDashboardData.widgets[0].title)).toBeInTheDocument();
      });
    });
  });

  describe('Widget Addition', () => {
    it('should open add widget modal and add new widget', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          ...mockDashboardData.widgets[0],
          id: 'new-widget-1',
          title: 'New Widget'
        }
      });

      renderDashboard();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /add widget/i }));
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await userEvent.selectOptions(screen.getByLabelText(/widget type/i), 'metric');
      await userEvent.type(screen.getByLabelText(/widget title/i), 'New Widget');
      await userEvent.click(screen.getByRole('button', { name: /add widget/i }));

      await waitFor(() => {
        expect(screen.getByText('New Widget')).toBeInTheDocument();
      });
    });

    it('should show validation errors when adding widget with invalid data', async () => {
      renderDashboard();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /add widget/i }));
      });

      await userEvent.click(screen.getByRole('button', { name: /add widget/i }));

      expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/widget type is required/i)).toBeInTheDocument();
    });
  });

  describe('Layout Management', () => {
    it('should allow widget reordering via drag and drop', async () => {
      renderDashboard();

      await waitFor(() => {
        const widgets = screen.getAllByTestId(/widget-/i);
        const dragHandle = within(widgets[0]).getByLabelText(/drag handle/i);
        const dropTarget = widgets[1];

        fireEvent.dragStart(dragHandle);
        fireEvent.dragEnter(dropTarget);
        fireEvent.dragOver(dropTarget);
        fireEvent.drop(dropTarget);
      });

      // Verify reordering by checking positions or API call
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalled();
      });
    });

    it('should persist layout changes after reordering', async () => {
      (axios.put as jest.Mock).mockResolvedValue({});

      renderDashboard();

      await waitFor(async () => {
        const widgets = screen.getAllByTestId(/widget-/i);
        const dragHandle = within(widgets[0]).getByLabelText(/drag handle/i);
        const dropTarget = widgets[1];

        fireEvent.dragStart(dragHandle);
        fireEvent.dragEnter(dropTarget);
        fireEvent.dragOver(dropTarget);
        fireEvent.drop(dropTarget);
      });

      await waitFor(() => {
        expect(screen.getByText(mockDashboardData.widgets[0].title)).toBeInTheDocument();
        expect(screen.getByText(mockDashboardData.widgets[1].title)).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no widgets exist', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockEmptyData });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/no widgets added yet/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add your first widget/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for widgets', async () => {
      renderDashboard();

      await waitFor(() => {
        const widgets = screen.getAllByTestId(/widget-/i);
        widgets.forEach(widget => {
          expect(widget).toHaveAttribute('role', 'article');
          expect(widget).toHaveAccessibleName();
        });
      });
    });

    it('should be navigable via keyboard', async () => {
      renderDashboard();

      await waitFor(() => {
        const addWidgetButton = screen.getByRole('button', { name: /add widget/i });
        expect(addWidgetButton).toHaveFocus();

        // Tab through interactive elements
        userEvent.tab();
        const firstWidgetSettings = screen.getAllByLabelText(/widget settings/i)[0];
        expect(firstWidgetSettings).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderDashboard();

      await waitFor(() => {
        const widgetTitles = screen.getAllByText(/revenue|users|conversion/i);
        widgetTitles.forEach(title => {
          expect(title).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // or your actual color
        });
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', async () => {
      global.innerWidth = 600;
      global.dispatchEvent(new Event('resize'));

      renderDashboard();

      await waitFor(() => {
        const widgetGrid = screen.getByTestId('widget-grid');
        expect(widgetGrid).toHaveStyle('grid-template-columns: 1fr');
      });

      // Reset
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });
  });

  describe('Data Refresh', () => {
    it('should refresh data when refresh button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDashboardData })
        .mockResolvedValueOnce({ data: { ...mockDashboardData, lastUpdated: new Date().toISOString() } });

      renderDashboard();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /refresh data/i }));
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should show loading state during refresh', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockDashboardData }), 1000))
      );

      renderDashboard();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /refresh data/i }));
        expect(screen.getByTestId('refresh-loading')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component errors gracefully', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalWidget = require('./Widget').default;

      jest.mock('./Widget', () => ({
        __esModule: true,
        default: function MockWidget() {
          throw new Error('Widget rendering error');
        }
      }));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
      });

      // Restore original component
      jest.unmock('./Widget');
    });
  });
});