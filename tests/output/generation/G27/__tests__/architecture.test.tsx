import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignTemplates, useSaveDesign, useLoadDesign } from '../../hooks/designHooks';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DesignTemplate } from '../../types/designTypes';

// Mock hooks and context
jest.mock('../../hooks/designHooks');
jest.mock('../../context/AuthContext');
jest.mock('../../context/ToastContext');

const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseLoadDesign = useLoadDesign as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseToast = useToast as jest.Mock;

const mockTemplates: DesignTemplate[] = [
  {
    id: '1',
    name: 'Modern Store',
    thumbnail: 'modern-store.jpg',
    categories: ['electronics', 'fashion'],
    previewUrl: '/preview/modern-store',
  },
  {
    id: '2',
    name: 'Minimalist',
    thumbnail: 'minimalist.jpg',
    categories: ['home', 'fashion'],
    previewUrl: '/preview/minimalist',
  },
];

const mockUser = {
  isAuthenticated: true,
  user: { id: 'user123', email: 'test@example.com' },
};

const mockShowToast = jest.fn();

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(mockUser);
    mockUseToast.mockReturnValue({ showToast: mockShowToast });
    mockUseDesignTemplates.mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseSaveDesign.mockReturnValue({
      saveDesign: jest.fn().mockResolvedValue({ success: true }),
      isSaving: false,
      error: null,
    });
    mockUseLoadDesign.mockReturnValue({
      loadDesign: jest.fn().mockResolvedValue({ success: true }),
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when templates are loading', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading design templates/i)).toBeInTheDocument();
    });

    it('should render error state when templates fail to load', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: new Error('Failed to load templates'),
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/error loading design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render template list when templates are loaded successfully', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText(/modern store/i)).toBeInTheDocument();
      expect(screen.getByText(/minimalist/i)).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });
  });

  describe('Template Selection', () => {
    it('should allow user to select a template', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText(/modern store/i).closest('.design-template-card')!;
      await user.click(modernStoreCard);

      expect(modernStoreCard).toHaveClass('selected');
      expect(screen.getByRole('button', { name: /customize this design/i })).toBeEnabled();
    });

    it('should show preview when clicking preview button', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/modern store preview/i)).toBeInTheDocument();
    });

    it('should close preview modal when clicking close button', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Customization Flow', () => {
    it('should enable customize button only when a template is selected', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const customizeButton = screen.getByRole('button', { name: /customize this design/i });
      expect(customizeButton).toBeDisabled();

      const modernStoreCard = screen.getByText(/modern store/i).closest('.design-template-card')!;
      await user.click(modernStoreCard);

      expect(customizeButton).toBeEnabled();
    });

    it('should show loading state when saving design', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isSaving: true,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText(/modern store/i).closest('.design-template-card')!;
      await user.click(modernStoreCard);

      const customizeButton = screen.getByRole('button', { name: /customize this design/i });
      await user.click(customizeButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/saving your design/i)).toBeInTheDocument();
    });

    it('should show success message when design is saved successfully', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText(/modern store/i).closest('.design-template-card')!;
      await user.click(modernStoreCard);

      const customizeButton = screen.getByRole('button', { name: /customize this design/i });
      await user.click(customizeButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Design saved successfully! Redirecting to customization...',
        });
      });
    });

    it('should show error message when design fails to save', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockRejectedValue(new Error('Failed to save design')),
        isSaving: false,
        error: new Error('Failed to save design'),
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText(/modern store/i).closest('.design-template-card')!;
      await user.click(modernStoreCard);

      const customizeButton = screen.getByRole('button', { name: /customize this design/i });
      await user.click(customizeButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to save design. Please try again.',
        });
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const electronicsCheckbox = screen.getByRole('checkbox', { name: /electronics/i });
      await user.click(electronicsCheckbox);

      expect(screen.getByText(/modern store/i)).toBeInTheDocument();
      expect(screen.queryByText(/minimalist/i)).not.toBeInTheDocument();
    });

    it('should search templates by name', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'modern');

      expect(screen.getByText(/modern store/i)).toBeInTheDocument();
      expect(screen.queryByText(/minimalist/i)).not.toBeInTheDocument();
    });

    it('should show no results message when no templates match filters', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no design templates found/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for template cards', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      expect(templateCards).toHaveLength(2);

      templateCards.forEach(card => {
        expect(card).toHaveAttribute('aria-labelledby');
        expect(within(card).getByRole('heading')).toBeInTheDocument();
        expect(within(card).getByRole('img')).toHaveAttribute('alt', expect.stringContaining('preview'));
      });
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      // Focus should start on the search input
      expect(screen.getByRole('searchbox')).toHaveFocus();

      // Tab through elements
      await user.tab();
      expect(screen.getByRole('checkbox', { name: /electronics/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('checkbox', { name: /fashion/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('checkbox', { name: /home/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /preview/i })).toHaveFocus();
    });

    it('should have proper labels for all interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('searchbox')).toHaveAccessibleName(/search templates/i);
      expect(screen.getAllByRole('checkbox')[0]).toHaveAccessibleName(/electronics/i);
      expect(screen.getAllByRole('button', { name: /preview/i })[0]).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /customize this design/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty templates array gracefully', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/no design templates available/i)).toBeInTheDocument();
    });

    it('should disable customize button when user is not authenticated', () => {
      mockUseAuth.mockReturnValueOnce({
        isAuthenticated: false,
        user: null,
      });

      render(<DesignArchitecture />);
      const modernStoreCard = screen.getByText(/modern store/i).closest('.design-template-card')!;
      fireEvent.click(modernStoreCard);

      const customizeButton = screen.getByRole('button', { name: /customize this design/i });
      expect(customizeButton).toBeDisabled();
      expect(screen.getByText(/please log in to customize designs/i)).toBeInTheDocument();
    });

    it('should show loading state when loading existing design', async () => {
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isLoading: true,
        error: null,
      });

      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const loadButton = screen.getByRole('button', { name: /load my saved design/i });
      await user.click(loadButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading your design/i)).toBeInTheDocument();
    });
  });

  describe('Saved Designs', () => {
    it('should load saved design when requested', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const loadButton = screen.getByRole('button', { name: /load my saved design/i });
      await user.click(loadButton);

      await waitFor(() => {
        expect(mockUseLoadDesign().loadDesign).toHaveBeenCalledWith('user123');
        expect(mockShowToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Your saved design has been loaded',
        });
      });
    });

    it('should show error when loading saved design fails', async () => {
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: jest.fn().mockRejectedValue(new Error('Failed to load design')),
        isLoading: false,
        error: new Error('Failed to load design'),
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const loadButton = screen.getByRole('button', { name: /load my saved design/i });
      await user.click(loadButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to load your saved design. Please try again.',
        });
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignTemplates, useSaveDesign, useLoadDesign } from '../../hooks/designHooks';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DesignTemplate } from '../../types/designTypes';

// Mock hooks and context
jest.mock('../../hooks/designHooks');
jest.mock('../../context/AuthContext');
jest.mock('../../context/ToastContext');

const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseLoadDesign = useLoadDesign as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseToast = useToast as jest.Mock;

const mockTemplates: DesignTemplate[] = [
  {
    id: '1',
    name: 'Modern Store',
    thumbnail: 'modern-store.jpg',
    categories: ['electronics', 'fashion'],
    previewUrl: '/preview/modern-store',
  },
  {
    id: '2',
    name: 'Minimalist',
    thumbnail: 'minimalist.jpg',
    categories: ['home', 'fashion'],
    previewUrl: '/preview/minimalist',
  },
];

const mockUser = {
  isAuthenticated: true,
  user: { id: 'user123', email: 'test@example.com' },
};

const mockShowToast = jest.fn();

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(mockUser);
    mockUseToast.mockReturnValue({ showToast: mockShowToast });
    mockUseDesignTemplates.mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseSaveDesign.mockReturnValue({
      saveDesign: jest.fn().mockResolvedValue({ success: true }),
      isSaving: false,
      error: null,
    });
    mockUseLoadDesign.mockReturnValue({
      loadDesign: jest.fn().mockResolvedValue({ success: true }),
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when templates are loading', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading design templates/i)).toBeInTheDocument();
    });

    it('should render error state when templates fail to load', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: new Error('Failed to load templates'),
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/error loading design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render template list when templates are loaded successfully', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText(/modern store/i)).toBeInTheDocument();
      expect(screen.getByText(/minimalist/i)).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });
  });

  describe('Template Selection', () => {
    it('should allow user to select a template', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText(/modern store/i).closest('.design-template-card')!;
      await user.click(modernStoreCard);

      expect(modernStoreCard).toHaveClass('selected');
      expect(screen.getByRole('button', { name: /customize this design/i })).toBeEnabled();
    });

    it('should show preview when clicking preview button', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/modern store preview/i)).toBeInTheDocument();
    });

    it('should close preview modal when clicking close button', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Customization Flow', () => {
    it('should enable customize button only when a template is selected', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const customizeButton = screen.getByRole('button', { name: /customize this design/i });
      expect(customizeButton).toBeDisabled();

      const modernStoreCard = screen.getByText(/modern store/i).closest('.design-template-card')!;
      await user.click(modernStoreCard);

      expect(customizeButton).toBeEnabled();
    });

    it('should show loading state when saving design', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isSaving: true,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText(/modern store/i).closest('.design-template-card')!;
      await user.click(modernStoreCard);

      const customizeButton = screen.getByRole('button', { name: /customize this design/i });
      await user.click(customizeButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/saving your design/i)).toBeInTheDocument();
    });

    it('should show success message when design is saved successfully', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText(/modern store/i).closest('.design-template-card')!;
      await user.click(modernStoreCard);

      const customizeButton = screen.getByRole('button', { name: /customize this design/i });
      await user.click(customizeButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Design saved successfully! Redirecting to customization...',
        });
      });
    });

    it('should show error message when design fails to save', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockRejectedValue(new Error('Failed to save design')),
        isSaving: false,
        error: new Error('Failed to save design'),
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText(/modern store/i).closest('.design-template-card')!;
      await user.click(modernStoreCard);

      const customizeButton = screen.getByRole('button', { name: /customize this design/i });
      await user.click(customizeButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to save design. Please try again.',
        });
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const electronicsCheckbox = screen.getByRole('checkbox', { name: /electronics/i });
      await user.click(electronicsCheckbox);

      expect(screen.getByText(/modern store/i)).toBeInTheDocument();
      expect(screen.queryByText(/minimalist/i)).not.toBeInTheDocument();
    });

    it('should search templates by name', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'modern');

      expect(screen.getByText(/modern store/i)).toBeInTheDocument();
      expect(screen.queryByText(/minimalist/i)).not.toBeInTheDocument();
    });

    it('should show no results message when no templates match filters', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no design templates found/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for template cards', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      expect(templateCards).toHaveLength(2);

      templateCards.forEach(card => {
        expect(card).toHaveAttribute('aria-labelledby');
        expect(within(card).getByRole('heading')).toBeInTheDocument();
        expect(within(card).getByRole('img')).toHaveAttribute('alt', expect.stringContaining('preview'));
      });
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      // Focus should start on the search input
      expect(screen.getByRole('searchbox')).toHaveFocus();

      // Tab through elements
      await user.tab();
      expect(screen.getByRole('checkbox', { name: /electronics/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('checkbox', { name: /fashion/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('checkbox', { name: /home/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /preview/i })).toHaveFocus();
    });

    it('should have proper labels for all interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('searchbox')).toHaveAccessibleName(/search templates/i);
      expect(screen.getAllByRole('checkbox')[0]).toHaveAccessibleName(/electronics/i);
      expect(screen.getAllByRole('button', { name: /preview/i })[0]).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /customize this design/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty templates array gracefully', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/no design templates available/i)).toBeInTheDocument();
    });

    it('should disable customize button when user is not authenticated', () => {
      mockUseAuth.mockReturnValueOnce({
        isAuthenticated: false,
        user: null,
      });

      render(<DesignArchitecture />);
      const modernStoreCard = screen.getByText(/modern store/i).closest('.design-template-card')!;
      fireEvent.click(modernStoreCard);

      const customizeButton = screen.getByRole('button', { name: /customize this design/i });
      expect(customizeButton).toBeDisabled();
      expect(screen.getByText(/please log in to customize designs/i)).toBeInTheDocument();
    });

    it('should show loading state when loading existing design', async () => {
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isLoading: true,
        error: null,
      });

      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const loadButton = screen.getByRole('button', { name: /load my saved design/i });
      await user.click(loadButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading your design/i)).toBeInTheDocument();
    });
  });

  describe('Saved Designs', () => {
    it('should load saved design when requested', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const loadButton = screen.getByRole('button', { name: /load my saved design/i });
      await user.click(loadButton);

      await waitFor(() => {
        expect(mockUseLoadDesign().loadDesign).toHaveBeenCalledWith('user123');
        expect(mockShowToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Your saved design has been loaded',
        });
      });
    });

    it('should show error when loading saved design fails', async () => {
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: jest.fn().mockRejectedValue(new Error('Failed to load design')),
        isLoading: false,
        error: new Error('Failed to load design'),
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const loadButton = screen.getByRole('button', { name: /load my saved design/i });
      await user.click(loadButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to load your saved design. Please try again.',
        });
      });
    });
  });
});