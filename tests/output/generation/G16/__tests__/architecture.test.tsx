import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { fetchDesignData, saveDesignConfiguration, exportDesign } from './api/designApi';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../ui/useToast';

// Mock external dependencies
jest.mock('./api/designApi');
jest.mock('../auth/AuthContext');
jest.mock('../ui/useToast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockFetchDesignData = fetchDesignData as jest.MockedFunction<typeof fetchDesignData>;
const mockSaveDesignConfiguration = saveDesignConfiguration as jest.MockedFunction<typeof saveDesignConfiguration>;
const mockExportDesign = exportDesign as jest.MockedFunction<typeof exportDesign>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockShowToast = jest.fn();
const mockNavigate = jest.fn();

beforeEach(() => {
  mockUseToast.mockReturnValue({ showToast: mockShowToast });
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', role: 'admin', permissions: ['design:edit', 'design:view'] },
    isAuthenticated: true,
  });

  jest.clearAllMocks();
});

describe('DesignArchitecture - Rendering', () => {
  it('should render loading state initially', () => {
    mockFetchDesignData.mockReturnValue(Promise.resolve({ data: {} }));
    render(<DesignArchitecture />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render main components after data loads', async () => {
    const mockData = {
      components: [{ id: 'comp1', name: 'Component 1', type: 'service' }],
      connections: [],
      metadata: { version: '1.0' }
    };
    mockFetchDesignData.mockResolvedValue({ data: mockData });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Design Architecture')).toBeInTheDocument();
      expect(screen.getByText('Component 1')).toBeInTheDocument();
      expect(screen.getByLabelText('design-canvas')).toBeInTheDocument();
    });
  });

  it('should render error state when data fetch fails', async () => {
    mockFetchDesignData.mockRejectedValue(new Error('Failed to fetch'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Error loading design data')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});

describe('DesignArchitecture - User Interactions', () => {
  const mockData = {
    components: [
      { id: 'comp1', name: 'Component 1', type: 'service', x: 100, y: 100 },
      { id: 'comp2', name: 'Component 2', type: 'database', x: 300, y: 200 }
    ],
    connections: [],
    metadata: { version: '1.0' }
  };

  beforeEach(() => {
    mockFetchDesignData.mockResolvedValue({ data: mockData });
  });

  it('should allow adding a new component', async () => {
    const user = userEvent.setup();
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add component/i }));
    await user.type(screen.getByLabelText('Component Name'), 'New Service');
    await user.selectOptions(screen.getByLabelText('Component Type'), 'service');
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(mockSaveDesignConfiguration).toHaveBeenCalled();
      expect(screen.getByText('New Service')).toBeInTheDocument();
    });
  });

  it('should allow connecting components', async () => {
    const user = userEvent.setup();
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });

    const comp1 = screen.getByText('Component 1').closest('button') as HTMLElement;
    const comp2 = screen.getByText('Component 2').closest('button') as HTMLElement;

    // Simulate drag connection
    fireEvent.mouseDown(comp1, { buttons: 1 });
    fireEvent.mouseMove(document.body, { clientX: 200, clientY: 150 });
    fireEvent.mouseUp(comp2);

    await waitFor(() => {
      expect(mockSaveDesignConfiguration).toHaveBeenCalled();
    });
  });

  it('should allow editing component properties', async () => {
    const user = userEvent.setup();
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });

    const editButton = within(screen.getByText('Component 1').closest('.component-node') as HTMLElement)
      .getByRole('button', { name: /edit/i });

    await user.click(editButton);
    await user.clear(screen.getByLabelText('Component Name'));
    await user.type(screen.getByLabelText('Component Name'), 'Updated Component');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockSaveDesignConfiguration).toHaveBeenCalled();
      expect(screen.getByText('Updated Component')).toBeInTheDocument();
    });
  });

  it('should allow deleting a component', async () => {
    const user = userEvent.setup();
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });

    const deleteButton = within(screen.getByText('Component 1').closest('.component-node') as HTMLElement)
      .getByRole('button', { name: /delete/i });

    await user.click(deleteButton);
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(mockSaveDesignConfiguration).toHaveBeenCalled();
      expect(screen.queryByText('Component 1')).not.toBeInTheDocument();
    });
  });

  it('should handle export functionality', async () => {
    const user = userEvent.setup();
    const mockExportData = { url: 'http://example.com/export' };
    mockExportDesign.mockResolvedValue({ data: mockExportData });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.selectOptions(screen.getByLabelText('Export Format'), 'png');
    await user.click(screen.getByRole('button', { name: /export/i }));

    await waitFor(() => {
      expect(mockExportDesign).toHaveBeenCalledWith('user-1', 'png');
      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Export Successful',
        message: 'Your design has been exported successfully',
        type: 'success'
      });
    });
  });
});

describe('DesignArchitecture - Accessibility', () => {
  it('should have proper ARIA attributes for canvas', async () => {
    mockFetchDesignData.mockResolvedValue({ data: { components: [], connections: [], metadata: {} } });
    render(<DesignArchitecture />);

    await waitFor(() => {
      const canvas = screen.getByLabelText('design-canvas');
      expect(canvas).toHaveAttribute('role', 'application');
      expect(canvas).toHaveAttribute('aria-label', 'Design architecture canvas');
    });
  });

  it('should have keyboard navigable components', async () => {
    const mockData = {
      components: [
        { id: 'comp1', name: 'Component 1', type: 'service' },
        { id: 'comp2', name: 'Component 2', type: 'database' }
      ],
      connections: [],
      metadata: {}
    };
    mockFetchDesignData.mockResolvedValue({ data: mockData });

    render(<DesignArchitecture />);

    await waitFor(() => {
      const components = screen.getAllByRole('button', { name: /component/i });
      expect(components[0]).toHaveFocus(); // First component should have focus by default
    });
  });

  it('should announce changes for screen readers', async () => {
    const mockData = {
      components: [{ id: 'comp1', name: 'Component 1', type: 'service' }],
      connections: [],
      metadata: {}
    };
    mockFetchDesignData.mockResolvedValue({ data: mockData });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Design loaded with 1 component');
    });
  });
});

describe('DesignArchitecture - Edge Cases', () => {
  it('should handle empty design state', async () => {
    mockFetchDesignData.mockResolvedValue({ data: { components: [], connections: [], metadata: {} } });
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('No components in design')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add your first component/i })).toBeInTheDocument();
    });
  });

  it('should prevent unauthorized edits', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', role: 'viewer', permissions: ['design:view'] },
      isAuthenticated: true,
    });

    const mockData = {
      components: [{ id: 'comp1', name: 'Component 1', type: 'service' }],
      connections: [],
      metadata: {}
    };
    mockFetchDesignData.mockResolvedValue({ data: mockData });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /add component/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });
  });

  it('should handle API rate limiting', async () => {
    mockSaveDesignConfiguration.mockRejectedValue({
      response: { status: 429, data: { message: 'Too many requests' } }
    });

    const mockData = {
      components: [{ id: 'comp1', name: 'Component 1', type: 'service' }],
      connections: [],
      metadata: {}
    };
    mockFetchDesignData.mockResolvedValue({ data: mockData });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /add component/i }));
    await user.type(screen.getByLabelText('Component Name'), 'New Component');
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Request Limit Exceeded',
        message: 'Too many requests. Please try again later.',
        type: 'error'
      });
    });
  });

  it('should handle network errors gracefully', async () => {
    mockFetchDesignData.mockRejectedValue(new Error('Network Error'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});

describe('DesignArchitecture - Performance', () => {
  it('should not re-render unnecessarily when unrelated state changes', async () => {
    const mockData = {
      components: [
        { id: 'comp1', name: 'Component 1', type: 'service' },
        { id: 'comp2', name: 'Component 2', type: 'database' }
      ],
      connections: [],
      metadata: {}
    };
    mockFetchDesignData.mockResolvedValue({ data: mockData });

    const { rerender } = render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });

    const initialRender = screen.getByText('Component 1');
    mockFetchDesignData.mockResolvedValue({ data: { ...mockData, metadata: { version: '1.1' } } });

    rerender(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
      expect(screen.getByText('Component 1')).toBe(initialRender); // Should be same reference
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { fetchDesignData, saveDesignConfiguration, exportDesign } from './api/designApi';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../ui/useToast';

// Mock external dependencies
jest.mock('./api/designApi');
jest.mock('../auth/AuthContext');
jest.mock('../ui/useToast');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockFetchDesignData = fetchDesignData as jest.MockedFunction<typeof fetchDesignData>;
const mockSaveDesignConfiguration = saveDesignConfiguration as jest.MockedFunction<typeof saveDesignConfiguration>;
const mockExportDesign = exportDesign as jest.MockedFunction<typeof exportDesign>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockShowToast = jest.fn();
const mockNavigate = jest.fn();

beforeEach(() => {
  mockUseToast.mockReturnValue({ showToast: mockShowToast });
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', role: 'admin', permissions: ['design:edit', 'design:view'] },
    isAuthenticated: true,
  });

  jest.clearAllMocks();
});

describe('DesignArchitecture - Rendering', () => {
  it('should render loading state initially', () => {
    mockFetchDesignData.mockReturnValue(Promise.resolve({ data: {} }));
    render(<DesignArchitecture />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render main components after data loads', async () => {
    const mockData = {
      components: [{ id: 'comp1', name: 'Component 1', type: 'service' }],
      connections: [],
      metadata: { version: '1.0' }
    };
    mockFetchDesignData.mockResolvedValue({ data: mockData });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Design Architecture')).toBeInTheDocument();
      expect(screen.getByText('Component 1')).toBeInTheDocument();
      expect(screen.getByLabelText('design-canvas')).toBeInTheDocument();
    });
  });

  it('should render error state when data fetch fails', async () => {
    mockFetchDesignData.mockRejectedValue(new Error('Failed to fetch'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Error loading design data')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});

describe('DesignArchitecture - User Interactions', () => {
  const mockData = {
    components: [
      { id: 'comp1', name: 'Component 1', type: 'service', x: 100, y: 100 },
      { id: 'comp2', name: 'Component 2', type: 'database', x: 300, y: 200 }
    ],
    connections: [],
    metadata: { version: '1.0' }
  };

  beforeEach(() => {
    mockFetchDesignData.mockResolvedValue({ data: mockData });
  });

  it('should allow adding a new component', async () => {
    const user = userEvent.setup();
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add component/i }));
    await user.type(screen.getByLabelText('Component Name'), 'New Service');
    await user.selectOptions(screen.getByLabelText('Component Type'), 'service');
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(mockSaveDesignConfiguration).toHaveBeenCalled();
      expect(screen.getByText('New Service')).toBeInTheDocument();
    });
  });

  it('should allow connecting components', async () => {
    const user = userEvent.setup();
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });

    const comp1 = screen.getByText('Component 1').closest('button') as HTMLElement;
    const comp2 = screen.getByText('Component 2').closest('button') as HTMLElement;

    // Simulate drag connection
    fireEvent.mouseDown(comp1, { buttons: 1 });
    fireEvent.mouseMove(document.body, { clientX: 200, clientY: 150 });
    fireEvent.mouseUp(comp2);

    await waitFor(() => {
      expect(mockSaveDesignConfiguration).toHaveBeenCalled();
    });
  });

  it('should allow editing component properties', async () => {
    const user = userEvent.setup();
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });

    const editButton = within(screen.getByText('Component 1').closest('.component-node') as HTMLElement)
      .getByRole('button', { name: /edit/i });

    await user.click(editButton);
    await user.clear(screen.getByLabelText('Component Name'));
    await user.type(screen.getByLabelText('Component Name'), 'Updated Component');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockSaveDesignConfiguration).toHaveBeenCalled();
      expect(screen.getByText('Updated Component')).toBeInTheDocument();
    });
  });

  it('should allow deleting a component', async () => {
    const user = userEvent.setup();
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });

    const deleteButton = within(screen.getByText('Component 1').closest('.component-node') as HTMLElement)
      .getByRole('button', { name: /delete/i });

    await user.click(deleteButton);
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(mockSaveDesignConfiguration).toHaveBeenCalled();
      expect(screen.queryByText('Component 1')).not.toBeInTheDocument();
    });
  });

  it('should handle export functionality', async () => {
    const user = userEvent.setup();
    const mockExportData = { url: 'http://example.com/export' };
    mockExportDesign.mockResolvedValue({ data: mockExportData });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.selectOptions(screen.getByLabelText('Export Format'), 'png');
    await user.click(screen.getByRole('button', { name: /export/i }));

    await waitFor(() => {
      expect(mockExportDesign).toHaveBeenCalledWith('user-1', 'png');
      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Export Successful',
        message: 'Your design has been exported successfully',
        type: 'success'
      });
    });
  });
});

describe('DesignArchitecture - Accessibility', () => {
  it('should have proper ARIA attributes for canvas', async () => {
    mockFetchDesignData.mockResolvedValue({ data: { components: [], connections: [], metadata: {} } });
    render(<DesignArchitecture />);

    await waitFor(() => {
      const canvas = screen.getByLabelText('design-canvas');
      expect(canvas).toHaveAttribute('role', 'application');
      expect(canvas).toHaveAttribute('aria-label', 'Design architecture canvas');
    });
  });

  it('should have keyboard navigable components', async () => {
    const mockData = {
      components: [
        { id: 'comp1', name: 'Component 1', type: 'service' },
        { id: 'comp2', name: 'Component 2', type: 'database' }
      ],
      connections: [],
      metadata: {}
    };
    mockFetchDesignData.mockResolvedValue({ data: mockData });

    render(<DesignArchitecture />);

    await waitFor(() => {
      const components = screen.getAllByRole('button', { name: /component/i });
      expect(components[0]).toHaveFocus(); // First component should have focus by default
    });
  });

  it('should announce changes for screen readers', async () => {
    const mockData = {
      components: [{ id: 'comp1', name: 'Component 1', type: 'service' }],
      connections: [],
      metadata: {}
    };
    mockFetchDesignData.mockResolvedValue({ data: mockData });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Design loaded with 1 component');
    });
  });
});

describe('DesignArchitecture - Edge Cases', () => {
  it('should handle empty design state', async () => {
    mockFetchDesignData.mockResolvedValue({ data: { components: [], connections: [], metadata: {} } });
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('No components in design')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add your first component/i })).toBeInTheDocument();
    });
  });

  it('should prevent unauthorized edits', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', role: 'viewer', permissions: ['design:view'] },
      isAuthenticated: true,
    });

    const mockData = {
      components: [{ id: 'comp1', name: 'Component 1', type: 'service' }],
      connections: [],
      metadata: {}
    };
    mockFetchDesignData.mockResolvedValue({ data: mockData });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /add component/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });
  });

  it('should handle API rate limiting', async () => {
    mockSaveDesignConfiguration.mockRejectedValue({
      response: { status: 429, data: { message: 'Too many requests' } }
    });

    const mockData = {
      components: [{ id: 'comp1', name: 'Component 1', type: 'service' }],
      connections: [],
      metadata: {}
    };
    mockFetchDesignData.mockResolvedValue({ data: mockData });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /add component/i }));
    await user.type(screen.getByLabelText('Component Name'), 'New Component');
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Request Limit Exceeded',
        message: 'Too many requests. Please try again later.',
        type: 'error'
      });
    });
  });

  it('should handle network errors gracefully', async () => {
    mockFetchDesignData.mockRejectedValue(new Error('Network Error'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});

describe('DesignArchitecture - Performance', () => {
  it('should not re-render unnecessarily when unrelated state changes', async () => {
    const mockData = {
      components: [
        { id: 'comp1', name: 'Component 1', type: 'service' },
        { id: 'comp2', name: 'Component 2', type: 'database' }
      ],
      connections: [],
      metadata: {}
    };
    mockFetchDesignData.mockResolvedValue({ data: mockData });

    const { rerender } = render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
    });

    const initialRender = screen.getByText('Component 1');
    mockFetchDesignData.mockResolvedValue({ data: { ...mockData, metadata: { version: '1.1' } } });

    rerender(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Component 1')).toBeInTheDocument();
      expect(screen.getByText('Component 1')).toBe(initialRender); // Should be same reference
    });
  });
});