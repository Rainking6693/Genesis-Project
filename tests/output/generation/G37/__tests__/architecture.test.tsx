import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData, useSaveDesign, useExportDesign } from '../../hooks/designHooks';
import { DesignContext } from '../../context/DesignContext';
import { toast } from 'react-hot-toast';
import { axe } from 'jest-axe';

// Mock hooks and context
jest.mock('../../hooks/designHooks');
jest.mock('react-hot-toast');
jest.mock('../../context/DesignContext');

const mockUseDesignData = useDesignData as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseExportDesign = useExportDesign as jest.Mock;
const mockToast = toast as jest.Mock;
const mockDesignContext = DesignContext as unknown as jest.Mock;

const mockDesignData = {
  components: [
    { id: '1', type: 'database', name: 'PostgreSQL', position: { x: 100, y: 100 } },
    { id: '2', type: 'service', name: 'Auth Service', position: { x: 200, y: 200 } }
  ],
  connections: [
    { id: 'conn1', source: '1', target: '2', type: 'rest' }
  ],
  loading: false,
  error: null
};

const mockLoadingData = {
  ...mockDesignData,
  loading: true
};

const mockErrorData = {
  ...mockDesignData,
  error: new Error('Failed to load design')
};

describe('DesignArchitecture Component', () => {
  const renderComponent = (overrides = {}) => {
    mockUseDesignData.mockReturnValue({ ...mockDesignData, ...overrides });
    mockUseSaveDesign.mockReturnValue({ saveDesign: jest.fn(), isSaving: false });
    mockUseExportDesign.mockReturnValue({ exportDesign: jest.fn(), isExporting: false });
    mockDesignContext.mockReturnValue({
      selectedComponent: null,
      setSelectedComponent: jest.fn(),
      theme: 'light'
    });

    return render(<DesignArchitecture projectId="123" />);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Accessibility Tests', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderComponent();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels for interactive elements', () => {
      renderComponent();
      expect(screen.getByLabelText('Add Component')).toBeInTheDocument();
      expect(screen.getByLabelText('Design Canvas')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when data is loading', () => {
      renderComponent({ loading: true });
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('design-canvas')).not.toBeInTheDocument();
    });

    it('should show error message when data fails to load', () => {
      renderComponent({ error: new Error('Load failed') });
      expect(screen.getByText(/failed to load design/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Component Rendering', () => {
    it('should render all components and connections', () => {
      renderComponent();
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
      expect(screen.getByText('Auth Service')).toBeInTheDocument();
      expect(screen.getAllByTestId('connection-line').length).toBe(1);
    });

    it('should render empty state when no components exist', () => {
      renderComponent({ components: [], connections: [] });
      expect(screen.getByText(/no components added yet/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add your first component/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should open component modal when add component button is clicked', async () => {
      renderComponent();
      const user = userEvent.setup();
      await user.click(screen.getByLabelText('Add Component'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/add new component/i)).toBeInTheDocument();
    });

    it('should allow dragging components on the canvas', async () => {
      renderComponent();
      const component = screen.getByText('PostgreSQL').closest('div') as HTMLElement;
      const initialPosition = component.getBoundingClientRect();

      const user = userEvent.setup();
      await user.pointer({
        keys: '[MouseLeft>]',
        target: component,
        coords: { x: initialPosition.x + 5, y: initialPosition.y + 5 }
      });
      await user.pointer({
        target: component,
        coords: { x: initialPosition.x + 50, y: initialPosition.y + 50 }
      });
      await user.pointer('[/MouseLeft]');

      // Verify position changed (implementation would track this)
      expect(mockUseDesignData.mock.results[0].value.components[0].position).toEqual(
        expect.objectContaining({ x: expect.not.number(initialPosition.x), y: expect.not.number(initialPosition.y) })
      );
    });

    it('should select a component when clicked', async () => {
      const setSelectedComponent = jest.fn();
      mockDesignContext.mockReturnValue({
        selectedComponent: null,
        setSelectedComponent,
        theme: 'light'
      });

      renderComponent();
      const user = userEvent.setup();
      await user.click(screen.getByText('PostgreSQL'));

      expect(setSelectedComponent).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', type: 'database' })
      );
    });

    it('should show component details in sidebar when selected', async () => {
      mockDesignContext.mockReturnValue({
        selectedComponent: mockDesignData.components[0],
        setSelectedComponent: jest.fn(),
        theme: 'light'
      });

      renderComponent();
      expect(screen.getByText(/component details/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('PostgreSQL')).toBeInTheDocument();
    });

    it('should create connection between components when dragged', async () => {
      renderComponent();
      const source = screen.getByText('PostgreSQL').closest('div') as HTMLElement;
      const target = screen.getByText('Auth Service').closest('div') as HTMLElement;

      // Mock connection start
      const sourceConnector = within(source).getByTestId('connector');
      const user = userEvent.setup();
      await user.pointer({
        keys: '[MouseLeft>]',
        target: sourceConnector,
        coords: { x: 0, y: 0 }
      });

      // Mock connection end
      const targetConnector = within(target).getByTestId('connector');
      await user.pointer({
        target: targetConnector,
        coords: { x: 0, y: 0 }
      });
      await user.pointer('[/MouseLeft]');

      // Verify new connection was created
      expect(mockUseDesignData.mock.results[0].value.connections.length).toBe(2);
    });
  });

  describe('Component Management', () => {
    it('should add new component when form is submitted', async () => {
      renderComponent();
      const user = userEvent.setup();

      await user.click(screen.getByLabelText('Add Component'));
      await user.selectOptions(screen.getByLabelText('Component Type'), 'service');
      await user.type(screen.getByLabelText('Component Name'), 'Payment Service');
      await user.click(screen.getByRole('button', { name: /add component/i }));

      expect(mockUseDesignData.mock.results[0].value.components.length).toBe(3);
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('added successfully'),
        expect.anything()
      );
    });

    it('should update component details when edited', async () => {
      mockDesignContext.mockReturnValue({
        selectedComponent: mockDesignData.components[0],
        setSelectedComponent: jest.fn(),
        theme: 'light'
      });

      renderComponent();
      const user = userEvent.setup();

      const nameInput = screen.getByDisplayValue('PostgreSQL');
      await user.clear(nameInput);
      await user.type(nameInput, 'MySQL');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(mockUseDesignData.mock.results[0].value.components[0].name).toBe('MySQL');
    });

    it('should delete component when confirmed', async () => {
      mockDesignContext.mockReturnValue({
        selectedComponent: mockDesignData.components[0],
        setSelectedComponent: jest.fn(),
        theme: 'light'
      });

      window.confirm = jest.fn(() => true);
      renderComponent();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /delete component/i }));

      expect(mockUseDesignData.mock.results[0].value.components.length).toBe(1);
      expect(window.confirm).toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    it('should update connection type when edited', async () => {
      mockDesignContext.mockReturnValue({
        selectedComponent: null,
        setSelectedComponent: jest.fn(),
        theme: 'light'
      });

      renderComponent();
      const user = userEvent.setup();

      // Click on connection to select it
      const connection = screen.getAllByTestId('connection-line')[0];
      fireEvent.click(connection);

      // Update connection type
      await user.selectOptions(screen.getByLabelText('Connection Type'), 'grpc');
      await user.click(screen.getByRole('button', { name: /save connection/i }));

      expect(mockUseDesignData.mock.results[0].value.connections[0].type).toBe('grpc');
    });

    it('should delete connection when confirmed', async () => {
      window.confirm = jest.fn(() => true);
      renderComponent();
      const user = userEvent.setup();

      // Click on connection to select it
      const connection = screen.getAllByTestId('connection-line')[0];
      fireEvent.click(connection);

      await user.click(screen.getByRole('button', { name: /delete connection/i }));

      expect(mockUseDesignData.mock.results[0].value.connections.length).toBe(0);
    });
  });

  describe('Save and Export Functionality', () => {
    it('should save design when save button is clicked', async () => {
      const saveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValue({ saveDesign, isSaving: false });

      renderComponent();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /save design/i }));

      expect(saveDesign).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: '123',
          designData: mockDesignData
        })
      );
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('saved successfully'),
        expect.anything()
      );
    });

    it('should show error when save fails', async () => {
      const saveDesign = jest.fn().mockRejectedValue(new Error('Save failed'));
      mockUseSaveDesign.mockReturnValue({ saveDesign, isSaving: false });

      renderComponent();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /save design/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.stringContaining('failed to save'),
          expect.anything()
        );
      });
    });

    it('should show loading state during save', async () => {
      const saveDesign = jest.fn(() => new Promise(res => setTimeout(res, 100)));
      mockUseSaveDesign.mockReturnValue({ saveDesign, isSaving: true });

      renderComponent();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /save design/i }));

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    });

    it('should export design when export button is clicked', async () => {
      const exportDesign = jest.fn().mockResolvedValue({ data: 'exported-data' });
      mockUseExportDesign.mockReturnValue({ exportDesign, isExporting: false });

      renderComponent();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /export design/i }));

      expect(exportDesign).toHaveBeenCalledWith('123');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow keyboard navigation between components', async () => {
      renderComponent();
      const user = userEvent.setup();

      // Focus first component
      await user.tab();
      expect(screen.getByText('PostgreSQL')).toHaveFocus();

      // Navigate to next component
      await user.tab();
      expect(screen.getByText('Auth Service')).toHaveFocus();
    });

    it('should allow deleting component with keyboard', async () => {
      mockDesignContext.mockReturnValue({
        selectedComponent: mockDesignData.components[0],
        setSelectedComponent: jest.fn(),
        theme: 'light'
      });

      window.confirm = jest.fn(() => true);
      renderComponent();
      const user = userEvent.setup();

      await user.tab();
      await user.keyboard('{Delete}');

      expect(mockUseDesignData.mock.results[0].value.components.length).toBe(1);
    });
  });

  describe('Theme Support', () => {
    it('should apply dark theme classes when theme is dark', () => {
      mockDesignContext.mockReturnValue({
        selectedComponent: null,
        setSelectedComponent: jest.fn(),
        theme: 'dark'
      });

      renderComponent();
      expect(screen.getByTestId('design-canvas')).toHaveClass('dark-theme');
    });

    it('should apply light theme classes when theme is light', () => {
      renderComponent();
      expect(screen.getByTestId('design-canvas')).toHaveClass('light-theme');
    });
  });

  describe('Error Boundaries', () => {
    it('should show error boundary when component rendering fails', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = DesignArchitecture;

      // Simulate error in component
      jest.doMock('./DesignArchitecture', () => {
        const ErrorComponent = () => {
          throw new Error('Render error');
        };
        return { __esModule: true, default: ErrorComponent };
      });

      const { DesignArchitecture: ErrorComponent } = require('./DesignArchitecture');
      render(<ErrorComponent projectId="123" />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      jest.doMock('./DesignArchitecture', () => ({
        __esModule: true,
        default: OriginalComponent
      }));
      jest.restoreAllMocks();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignData, useSaveDesign, useExportDesign } from '../../hooks/designHooks';
import { DesignContext } from '../../context/DesignContext';
import { toast } from 'react-hot-toast';
import { axe } from 'jest-axe';

// Mock hooks and context
jest.mock('../../hooks/designHooks');
jest.mock('react-hot-toast');
jest.mock('../../context/DesignContext');

const mockUseDesignData = useDesignData as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseExportDesign = useExportDesign as jest.Mock;
const mockToast = toast as jest.Mock;
const mockDesignContext = DesignContext as unknown as jest.Mock;

const mockDesignData = {
  components: [
    { id: '1', type: 'database', name: 'PostgreSQL', position: { x: 100, y: 100 } },
    { id: '2', type: 'service', name: 'Auth Service', position: { x: 200, y: 200 } }
  ],
  connections: [
    { id: 'conn1', source: '1', target: '2', type: 'rest' }
  ],
  loading: false,
  error: null
};

const mockLoadingData = {
  ...mockDesignData,
  loading: true
};

const mockErrorData = {
  ...mockDesignData,
  error: new Error('Failed to load design')
};

describe('DesignArchitecture Component', () => {
  const renderComponent = (overrides = {}) => {
    mockUseDesignData.mockReturnValue({ ...mockDesignData, ...overrides });
    mockUseSaveDesign.mockReturnValue({ saveDesign: jest.fn(), isSaving: false });
    mockUseExportDesign.mockReturnValue({ exportDesign: jest.fn(), isExporting: false });
    mockDesignContext.mockReturnValue({
      selectedComponent: null,
      setSelectedComponent: jest.fn(),
      theme: 'light'
    });

    return render(<DesignArchitecture projectId="123" />);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Accessibility Tests', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderComponent();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels for interactive elements', () => {
      renderComponent();
      expect(screen.getByLabelText('Add Component')).toBeInTheDocument();
      expect(screen.getByLabelText('Design Canvas')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when data is loading', () => {
      renderComponent({ loading: true });
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('design-canvas')).not.toBeInTheDocument();
    });

    it('should show error message when data fails to load', () => {
      renderComponent({ error: new Error('Load failed') });
      expect(screen.getByText(/failed to load design/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Component Rendering', () => {
    it('should render all components and connections', () => {
      renderComponent();
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
      expect(screen.getByText('Auth Service')).toBeInTheDocument();
      expect(screen.getAllByTestId('connection-line').length).toBe(1);
    });

    it('should render empty state when no components exist', () => {
      renderComponent({ components: [], connections: [] });
      expect(screen.getByText(/no components added yet/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add your first component/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should open component modal when add component button is clicked', async () => {
      renderComponent();
      const user = userEvent.setup();
      await user.click(screen.getByLabelText('Add Component'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/add new component/i)).toBeInTheDocument();
    });

    it('should allow dragging components on the canvas', async () => {
      renderComponent();
      const component = screen.getByText('PostgreSQL').closest('div') as HTMLElement;
      const initialPosition = component.getBoundingClientRect();

      const user = userEvent.setup();
      await user.pointer({
        keys: '[MouseLeft>]',
        target: component,
        coords: { x: initialPosition.x + 5, y: initialPosition.y + 5 }
      });
      await user.pointer({
        target: component,
        coords: { x: initialPosition.x + 50, y: initialPosition.y + 50 }
      });
      await user.pointer('[/MouseLeft]');

      // Verify position changed (implementation would track this)
      expect(mockUseDesignData.mock.results[0].value.components[0].position).toEqual(
        expect.objectContaining({ x: expect.not.number(initialPosition.x), y: expect.not.number(initialPosition.y) })
      );
    });

    it('should select a component when clicked', async () => {
      const setSelectedComponent = jest.fn();
      mockDesignContext.mockReturnValue({
        selectedComponent: null,
        setSelectedComponent,
        theme: 'light'
      });

      renderComponent();
      const user = userEvent.setup();
      await user.click(screen.getByText('PostgreSQL'));

      expect(setSelectedComponent).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', type: 'database' })
      );
    });

    it('should show component details in sidebar when selected', async () => {
      mockDesignContext.mockReturnValue({
        selectedComponent: mockDesignData.components[0],
        setSelectedComponent: jest.fn(),
        theme: 'light'
      });

      renderComponent();
      expect(screen.getByText(/component details/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('PostgreSQL')).toBeInTheDocument();
    });

    it('should create connection between components when dragged', async () => {
      renderComponent();
      const source = screen.getByText('PostgreSQL').closest('div') as HTMLElement;
      const target = screen.getByText('Auth Service').closest('div') as HTMLElement;

      // Mock connection start
      const sourceConnector = within(source).getByTestId('connector');
      const user = userEvent.setup();
      await user.pointer({
        keys: '[MouseLeft>]',
        target: sourceConnector,
        coords: { x: 0, y: 0 }
      });

      // Mock connection end
      const targetConnector = within(target).getByTestId('connector');
      await user.pointer({
        target: targetConnector,
        coords: { x: 0, y: 0 }
      });
      await user.pointer('[/MouseLeft]');

      // Verify new connection was created
      expect(mockUseDesignData.mock.results[0].value.connections.length).toBe(2);
    });
  });

  describe('Component Management', () => {
    it('should add new component when form is submitted', async () => {
      renderComponent();
      const user = userEvent.setup();

      await user.click(screen.getByLabelText('Add Component'));
      await user.selectOptions(screen.getByLabelText('Component Type'), 'service');
      await user.type(screen.getByLabelText('Component Name'), 'Payment Service');
      await user.click(screen.getByRole('button', { name: /add component/i }));

      expect(mockUseDesignData.mock.results[0].value.components.length).toBe(3);
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('added successfully'),
        expect.anything()
      );
    });

    it('should update component details when edited', async () => {
      mockDesignContext.mockReturnValue({
        selectedComponent: mockDesignData.components[0],
        setSelectedComponent: jest.fn(),
        theme: 'light'
      });

      renderComponent();
      const user = userEvent.setup();

      const nameInput = screen.getByDisplayValue('PostgreSQL');
      await user.clear(nameInput);
      await user.type(nameInput, 'MySQL');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(mockUseDesignData.mock.results[0].value.components[0].name).toBe('MySQL');
    });

    it('should delete component when confirmed', async () => {
      mockDesignContext.mockReturnValue({
        selectedComponent: mockDesignData.components[0],
        setSelectedComponent: jest.fn(),
        theme: 'light'
      });

      window.confirm = jest.fn(() => true);
      renderComponent();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /delete component/i }));

      expect(mockUseDesignData.mock.results[0].value.components.length).toBe(1);
      expect(window.confirm).toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    it('should update connection type when edited', async () => {
      mockDesignContext.mockReturnValue({
        selectedComponent: null,
        setSelectedComponent: jest.fn(),
        theme: 'light'
      });

      renderComponent();
      const user = userEvent.setup();

      // Click on connection to select it
      const connection = screen.getAllByTestId('connection-line')[0];
      fireEvent.click(connection);

      // Update connection type
      await user.selectOptions(screen.getByLabelText('Connection Type'), 'grpc');
      await user.click(screen.getByRole('button', { name: /save connection/i }));

      expect(mockUseDesignData.mock.results[0].value.connections[0].type).toBe('grpc');
    });

    it('should delete connection when confirmed', async () => {
      window.confirm = jest.fn(() => true);
      renderComponent();
      const user = userEvent.setup();

      // Click on connection to select it
      const connection = screen.getAllByTestId('connection-line')[0];
      fireEvent.click(connection);

      await user.click(screen.getByRole('button', { name: /delete connection/i }));

      expect(mockUseDesignData.mock.results[0].value.connections.length).toBe(0);
    });
  });

  describe('Save and Export Functionality', () => {
    it('should save design when save button is clicked', async () => {
      const saveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValue({ saveDesign, isSaving: false });

      renderComponent();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /save design/i }));

      expect(saveDesign).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: '123',
          designData: mockDesignData
        })
      );
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('saved successfully'),
        expect.anything()
      );
    });

    it('should show error when save fails', async () => {
      const saveDesign = jest.fn().mockRejectedValue(new Error('Save failed'));
      mockUseSaveDesign.mockReturnValue({ saveDesign, isSaving: false });

      renderComponent();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /save design/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.stringContaining('failed to save'),
          expect.anything()
        );
      });
    });

    it('should show loading state during save', async () => {
      const saveDesign = jest.fn(() => new Promise(res => setTimeout(res, 100)));
      mockUseSaveDesign.mockReturnValue({ saveDesign, isSaving: true });

      renderComponent();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /save design/i }));

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    });

    it('should export design when export button is clicked', async () => {
      const exportDesign = jest.fn().mockResolvedValue({ data: 'exported-data' });
      mockUseExportDesign.mockReturnValue({ exportDesign, isExporting: false });

      renderComponent();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /export design/i }));

      expect(exportDesign).toHaveBeenCalledWith('123');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow keyboard navigation between components', async () => {
      renderComponent();
      const user = userEvent.setup();

      // Focus first component
      await user.tab();
      expect(screen.getByText('PostgreSQL')).toHaveFocus();

      // Navigate to next component
      await user.tab();
      expect(screen.getByText('Auth Service')).toHaveFocus();
    });

    it('should allow deleting component with keyboard', async () => {
      mockDesignContext.mockReturnValue({
        selectedComponent: mockDesignData.components[0],
        setSelectedComponent: jest.fn(),
        theme: 'light'
      });

      window.confirm = jest.fn(() => true);
      renderComponent();
      const user = userEvent.setup();

      await user.tab();
      await user.keyboard('{Delete}');

      expect(mockUseDesignData.mock.results[0].value.components.length).toBe(1);
    });
  });

  describe('Theme Support', () => {
    it('should apply dark theme classes when theme is dark', () => {
      mockDesignContext.mockReturnValue({
        selectedComponent: null,
        setSelectedComponent: jest.fn(),
        theme: 'dark'
      });

      renderComponent();
      expect(screen.getByTestId('design-canvas')).toHaveClass('dark-theme');
    });

    it('should apply light theme classes when theme is light', () => {
      renderComponent();
      expect(screen.getByTestId('design-canvas')).toHaveClass('light-theme');
    });
  });

  describe('Error Boundaries', () => {
    it('should show error boundary when component rendering fails', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = DesignArchitecture;

      // Simulate error in component
      jest.doMock('./DesignArchitecture', () => {
        const ErrorComponent = () => {
          throw new Error('Render error');
        };
        return { __esModule: true, default: ErrorComponent };
      });

      const { DesignArchitecture: ErrorComponent } = require('./DesignArchitecture');
      render(<ErrorComponent projectId="123" />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      jest.doMock('./DesignArchitecture', () => ({
        __esModule: true,
        default: OriginalComponent
      }));
      jest.restoreAllMocks();
    });
  });
});