import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { DesignArchitecture } from './DesignArchitecture';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';

jest.mock('axios');
jest.mock('../../context/AuthContext');
jest.mock('../../hooks/useToast');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockDesignData = {
  id: '1',
  name: 'Modern Dashboard',
  components: [
    { id: 'comp1', type: 'header', position: { x: 0, y: 0 } },
    { id: 'comp2', type: 'chart', position: { x: 100, y: 100 } },
  ],
  lastUpdated: '2023-01-01T00:00:00Z',
};

const mockErrorResponse = {
  response: {
    data: {
      message: 'Failed to load design',
    },
    status: 500,
  },
};

describe('DesignArchitecture Component', () => {
  const mockSetToast = jest.fn();
  const mockUser = {
    id: 'user1',
    name: 'Test User',
    role: 'admin',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ setToast: mockSetToast });
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
  });

  describe('Initial Render and Loading States', () => {
    it('should show loading skeleton when data is being fetched', () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      render(<DesignArchitecture designId="1" />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('design-canvas')).not.toBeInTheDocument();
    });

    it('should render design canvas when data is successfully loaded', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockDesignData });
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
        expect(screen.getByText('Modern Dashboard')).toBeInTheDocument();
      });
    });

    it('should show error message when data fetching fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(mockSetToast).toHaveBeenCalledWith({
          message: 'Failed to load design',
          type: 'error',
        });
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockDesignData });
    });

    it('should allow adding new components to the design', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const addButton = screen.getByLabelText('Add component');
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const componentTypeSelect = within(modal).getByLabelText('Component type');
      await user.selectOptions(componentTypeSelect, 'card');

      const addComponentButton = within(modal).getByRole('button', { name: /add/i });
      await user.click(addComponentButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            type: 'card',
          }),
        );
      });
    });

    it('should allow dragging and dropping components', async () => {
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const component = screen.getByTestId('component-comp1');
      fireEvent.dragStart(component, {
        dataTransfer: { setData: jest.fn() },
      });

      fireEvent.dragOver(screen.getByTestId('design-canvas'));
      fireEvent.drop(screen.getByTestId('design-canvas'), {
        clientX: 200,
        clientY: 200,
      });

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({
                id: 'comp1',
                position: { x: 200, y: 200 },
              }),
            ]),
          }),
        );
      });
    });

    it('should allow deleting components', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByLabelText('Delete component')[0];
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            components: expect.not.arrayContaining([
              expect.objectContaining({ id: 'comp1' }),
            ]),
          }),
        );
      });
    });

    it('should handle component configuration changes', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const configButton = screen.getAllByLabelText('Configure component')[0];
      await user.click(configButton);

      const modal = screen.getByRole('dialog');
      const colorInput = within(modal).getByLabelText('Background color');
      await user.clear(colorInput);
      await user.type(colorInput, '#ffffff');

      const saveButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({
                id: 'comp1',
                config: expect.objectContaining({ backgroundColor: '#ffffff' }),
              }),
            ]),
          }),
        );
      });
    });
  });

  describe('Accessibility Features', () => {
    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockDesignData });
    });

    it('should have proper ARIA attributes for screen readers', async () => {
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      expect(screen.getByRole('region', { name: /design canvas/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Add component')).toHaveAttribute('aria-haspopup', 'dialog');
      expect(screen.getAllByLabelText('Delete component')[0]).toHaveAttribute('aria-label');
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      await user.tab();
      expect(screen.getByLabelText('Add component')).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText('Configure component')[0]).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText('Delete component')[0]).toHaveFocus();
    });

    it('should have proper contrast for accessibility', async () => {
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const component = screen.getByTestId('component-comp1');
      const computedStyle = window.getComputedStyle(component);
      const backgroundColor = computedStyle.backgroundColor;
      const textColor = computedStyle.color;

      // Convert RGB to luminance and check contrast ratio
      const getLuminance = (color: string) => {
        const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
        const [r, g, b] = rgb.map((c) => {
          c /= 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      const bgLum = getLuminance(backgroundColor);
      const textLum = getLuminance(textColor);
      const contrastRatio = (Math.max(bgLum, textLum) + 0.05) / (Math.min(bgLum, textLum) + 0.05);

      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty design data gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: { ...mockDesignData, components: [] } });
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByText(/no components added yet/i)).toBeInTheDocument();
      });
    });

    it('should show error when trying to add component with invalid data', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockRejectedValue({
        response: {
          data: { message: 'Invalid component type' },
          status: 400,
        },
      });

      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const addButton = screen.getByLabelText('Add component');
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const componentTypeSelect = within(modal).getByLabelText('Component type');
      await user.selectOptions(componentTypeSelect, 'invalid-type');

      const addComponentButton = within(modal).getByRole('button', { name: /add/i });
      await user.click(addComponentButton);

      await waitFor(() => {
        expect(mockSetToast).toHaveBeenCalledWith({
          message: 'Invalid component type',
          type: 'error',
        });
      });
    });

    it('should prevent unauthorized users from making changes', async () => {
      (useAuth as jest.Mock).mockReturnValue({ user: { ...mockUser, role: 'viewer' } });
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      expect(screen.queryByLabelText('Add component')).not.toBeInTheDocument();
      expect(screen.queryAllByLabelText('Delete component')).toHaveLength(0);
      expect(screen.queryAllByLabelText('Configure component')).toHaveLength(0);
    });

    it('should handle concurrent updates gracefully', async () => {
      let updateCount = 0;
      (axios.put as jest.Mock).mockImplementation(() => {
        updateCount++;
        if (updateCount === 1) {
          return Promise.reject({
            response: {
              data: { message: 'Conflict: Design was modified by another user' },
              status: 409,
            },
          });
        }
        return Promise.resolve({ data: mockDesignData });
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      // First update (will fail)
      const configButton = screen.getAllByLabelText('Configure component')[0];
      await user.click(configButton);

      const modal = screen.getByRole('dialog');
      const saveButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSetToast).toHaveBeenCalledWith({
          message: 'Conflict: Design was modified by another user. Refreshing...',
          type: 'warning',
        });
      });

      // Second update (should work after refresh)
      await user.click(configButton);
      await user.click(saveButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should debounce rapid component position updates', async () => {
      jest.useFakeTimers();
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const component = screen.getByTestId('component-comp1');

      // Simulate rapid drag events
      fireEvent.dragStart(component);
      fireEvent.dragOver(screen.getByTestId('design-canvas'));
      fireEvent.drop(screen.getByTestId('design-canvas'), { clientX: 150, clientY: 150 });

      fireEvent.dragStart(component);
      fireEvent.dragOver(screen.getByTestId('design-canvas'));
      fireEvent.drop(screen.getByTestId('design-canvas'), { clientX: 200, clientY: 200 });

      // Fast-forward time to flush debounce
      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledTimes(1);
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({
                id: 'comp1',
                position: { x: 200, y: 200 },
              }),
            ]),
          }),
        );
      });

      jest.useRealTimers();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { DesignArchitecture } from './DesignArchitecture';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';

jest.mock('axios');
jest.mock('../../context/AuthContext');
jest.mock('../../hooks/useToast');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockDesignData = {
  id: '1',
  name: 'Modern Dashboard',
  components: [
    { id: 'comp1', type: 'header', position: { x: 0, y: 0 } },
    { id: 'comp2', type: 'chart', position: { x: 100, y: 100 } },
  ],
  lastUpdated: '2023-01-01T00:00:00Z',
};

const mockErrorResponse = {
  response: {
    data: {
      message: 'Failed to load design',
    },
    status: 500,
  },
};

describe('DesignArchitecture Component', () => {
  const mockSetToast = jest.fn();
  const mockUser = {
    id: 'user1',
    name: 'Test User',
    role: 'admin',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ setToast: mockSetToast });
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
  });

  describe('Initial Render and Loading States', () => {
    it('should show loading skeleton when data is being fetched', () => {
      (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
      render(<DesignArchitecture designId="1" />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('design-canvas')).not.toBeInTheDocument();
    });

    it('should render design canvas when data is successfully loaded', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockDesignData });
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
        expect(screen.getByText('Modern Dashboard')).toBeInTheDocument();
      });
    });

    it('should show error message when data fetching fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(mockSetToast).toHaveBeenCalledWith({
          message: 'Failed to load design',
          type: 'error',
        });
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockDesignData });
    });

    it('should allow adding new components to the design', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const addButton = screen.getByLabelText('Add component');
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const componentTypeSelect = within(modal).getByLabelText('Component type');
      await user.selectOptions(componentTypeSelect, 'card');

      const addComponentButton = within(modal).getByRole('button', { name: /add/i });
      await user.click(addComponentButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            type: 'card',
          }),
        );
      });
    });

    it('should allow dragging and dropping components', async () => {
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const component = screen.getByTestId('component-comp1');
      fireEvent.dragStart(component, {
        dataTransfer: { setData: jest.fn() },
      });

      fireEvent.dragOver(screen.getByTestId('design-canvas'));
      fireEvent.drop(screen.getByTestId('design-canvas'), {
        clientX: 200,
        clientY: 200,
      });

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({
                id: 'comp1',
                position: { x: 200, y: 200 },
              }),
            ]),
          }),
        );
      });
    });

    it('should allow deleting components', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByLabelText('Delete component')[0];
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            components: expect.not.arrayContaining([
              expect.objectContaining({ id: 'comp1' }),
            ]),
          }),
        );
      });
    });

    it('should handle component configuration changes', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const configButton = screen.getAllByLabelText('Configure component')[0];
      await user.click(configButton);

      const modal = screen.getByRole('dialog');
      const colorInput = within(modal).getByLabelText('Background color');
      await user.clear(colorInput);
      await user.type(colorInput, '#ffffff');

      const saveButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({
                id: 'comp1',
                config: expect.objectContaining({ backgroundColor: '#ffffff' }),
              }),
            ]),
          }),
        );
      });
    });
  });

  describe('Accessibility Features', () => {
    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockDesignData });
    });

    it('should have proper ARIA attributes for screen readers', async () => {
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      expect(screen.getByRole('region', { name: /design canvas/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Add component')).toHaveAttribute('aria-haspopup', 'dialog');
      expect(screen.getAllByLabelText('Delete component')[0]).toHaveAttribute('aria-label');
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      await user.tab();
      expect(screen.getByLabelText('Add component')).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText('Configure component')[0]).toHaveFocus();

      await user.tab();
      expect(screen.getAllByLabelText('Delete component')[0]).toHaveFocus();
    });

    it('should have proper contrast for accessibility', async () => {
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const component = screen.getByTestId('component-comp1');
      const computedStyle = window.getComputedStyle(component);
      const backgroundColor = computedStyle.backgroundColor;
      const textColor = computedStyle.color;

      // Convert RGB to luminance and check contrast ratio
      const getLuminance = (color: string) => {
        const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
        const [r, g, b] = rgb.map((c) => {
          c /= 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      const bgLum = getLuminance(backgroundColor);
      const textLum = getLuminance(textColor);
      const contrastRatio = (Math.max(bgLum, textLum) + 0.05) / (Math.min(bgLum, textLum) + 0.05);

      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty design data gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: { ...mockDesignData, components: [] } });
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByText(/no components added yet/i)).toBeInTheDocument();
      });
    });

    it('should show error when trying to add component with invalid data', async () => {
      const user = userEvent.setup();
      (axios.post as jest.Mock).mockRejectedValue({
        response: {
          data: { message: 'Invalid component type' },
          status: 400,
        },
      });

      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const addButton = screen.getByLabelText('Add component');
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const componentTypeSelect = within(modal).getByLabelText('Component type');
      await user.selectOptions(componentTypeSelect, 'invalid-type');

      const addComponentButton = within(modal).getByRole('button', { name: /add/i });
      await user.click(addComponentButton);

      await waitFor(() => {
        expect(mockSetToast).toHaveBeenCalledWith({
          message: 'Invalid component type',
          type: 'error',
        });
      });
    });

    it('should prevent unauthorized users from making changes', async () => {
      (useAuth as jest.Mock).mockReturnValue({ user: { ...mockUser, role: 'viewer' } });
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      expect(screen.queryByLabelText('Add component')).not.toBeInTheDocument();
      expect(screen.queryAllByLabelText('Delete component')).toHaveLength(0);
      expect(screen.queryAllByLabelText('Configure component')).toHaveLength(0);
    });

    it('should handle concurrent updates gracefully', async () => {
      let updateCount = 0;
      (axios.put as jest.Mock).mockImplementation(() => {
        updateCount++;
        if (updateCount === 1) {
          return Promise.reject({
            response: {
              data: { message: 'Conflict: Design was modified by another user' },
              status: 409,
            },
          });
        }
        return Promise.resolve({ data: mockDesignData });
      });

      const user = userEvent.setup();
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      // First update (will fail)
      const configButton = screen.getAllByLabelText('Configure component')[0];
      await user.click(configButton);

      const modal = screen.getByRole('dialog');
      const saveButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSetToast).toHaveBeenCalledWith({
          message: 'Conflict: Design was modified by another user. Refreshing...',
          type: 'warning',
        });
      });

      // Second update (should work after refresh)
      await user.click(configButton);
      await user.click(saveButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should debounce rapid component position updates', async () => {
      jest.useFakeTimers();
      render(<DesignArchitecture designId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
      });

      const component = screen.getByTestId('component-comp1');

      // Simulate rapid drag events
      fireEvent.dragStart(component);
      fireEvent.dragOver(screen.getByTestId('design-canvas'));
      fireEvent.drop(screen.getByTestId('design-canvas'), { clientX: 150, clientY: 150 });

      fireEvent.dragStart(component);
      fireEvent.dragOver(screen.getByTestId('design-canvas'));
      fireEvent.drop(screen.getByTestId('design-canvas'), { clientX: 200, clientY: 200 });

      // Fast-forward time to flush debounce
      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledTimes(1);
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({
                id: 'comp1',
                position: { x: 200, y: 200 },
              }),
            ]),
          }),
        );
      });

      jest.useRealTimers();
    });
  });
});