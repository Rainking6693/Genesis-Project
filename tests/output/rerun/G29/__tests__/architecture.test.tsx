import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignTemplates, useSaveDesign, useUserPreferences } from '../../hooks/apiHooks';
import { useToast } from '../../context/ToastContext';
import { useAnalytics } from '../../context/AnalyticsContext';
import { Template } from '../../types/designTypes';

// Mock hooks and context
jest.mock('../../hooks/apiHooks');
jest.mock('../../context/ToastContext');
jest.mock('../../context/AnalyticsContext');

const mockUseDesignTemplates = useDesignTemplates as jest.MockedFunction<typeof useDesignTemplates>;
const mockUseSaveDesign = useSaveDesign as jest.MockedFunction<typeof useSaveDesign>;
const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Modern Ecommerce',
    thumbnail: 'modern-thumb.jpg',
    categories: ['ecommerce', 'modern'],
    previewUrl: 'modern-preview.jpg',
    isPremium: false,
  },
  {
    id: '2',
    name: 'Minimalist Store',
    thumbnail: 'minimalist-thumb.jpg',
    categories: ['ecommerce', 'minimalist'],
    previewUrl: 'minimalist-preview.jpg',
    isPremium: true,
  },
];

const mockUserPreferences = {
  preferredColorScheme: 'light',
  savedTemplates: ['1'],
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
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

    mockUseUserPreferences.mockReturnValue({
      preferences: mockUserPreferences,
      updatePreferences: jest.fn(),
      isLoading: false,
      error: null,
    });

    mockUseToast.mockReturnValue({
      showToast: jest.fn(),
    });

    mockUseAnalytics.mockReturnValue({
      trackEvent: jest.fn(),
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

    it('should render template cards when data is loaded successfully', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText('Modern Ecommerce')).toBeInTheDocument();
      expect(screen.getByText('Minimalist Store')).toBeInTheDocument();
    });

    it('should mark saved templates with a bookmark icon', () => {
      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      expect(within(modernCard).getByLabelText('Saved')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should open template preview modal when clicking on a template', async () => {
      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      await userEvent.click(modernCard);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modern Ecommerce')).toBeInTheDocument();
      expect(screen.getByAltText('Modern Ecommerce Preview')).toBeInTheDocument();
    });

    it('should close preview modal when clicking the close button', async () => {
      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      await userEvent.click(modernCard);

      const closeButton = screen.getByLabelText('Close preview');
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should toggle save template when clicking the bookmark button', async () => {
      const mockUpdatePreferences = jest.fn();
      mockUseUserPreferences.mockReturnValueOnce({
        preferences: mockUserPreferences,
        updatePreferences: mockUpdatePreferences,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const minimalistCard = screen.getByText('Minimalist Store').closest('.design-card') as HTMLElement;
      const bookmarkButton = within(minimalistCard).getByLabelText('Save template');

      await userEvent.click(bookmarkButton);
      expect(mockUpdatePreferences).toHaveBeenCalledWith({
        ...mockUserPreferences,
        savedTemplates: ['1', '2'],
      });
    });

    it('should show confirmation when trying to use a premium template without subscription', async () => {
      render(<DesignArchitecture />);
      const minimalistCard = screen.getByText('Minimalist Store').closest('.design-card') as HTMLElement;
      await userEvent.click(minimalistCard);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(screen.getByText(/premium template/i)).toBeInTheDocument();
      expect(screen.getByText(/upgrade your plan/i)).toBeInTheDocument();
    });

    it('should allow using free templates', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      await userEvent.click(modernCard);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockSaveDesign).toHaveBeenCalledWith('1');
      expect(screen.getByText(/template applied successfully/i)).toBeInTheDocument();
    });
  });

  describe('Filtering and Search', () => {
    it('should filter templates by search term', async () => {
      render(<DesignArchitecture />);
      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await userEvent.type(searchInput, 'modern');

      expect(screen.getByText('Modern Ecommerce')).toBeInTheDocument();
      expect(screen.queryByText('Minimalist Store')).not.toBeInTheDocument();
    });

    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);
      const categoryFilter = screen.getByLabelText(/filter by category/i);
      await userEvent.selectOptions(categoryFilter, 'ecommerce');

      expect(screen.getByText('Modern Ecommerce')).toBeInTheDocument();
      expect(screen.getByText('Minimalist Store')).toBeInTheDocument();
    });

    it('should show no results message when filters return no templates', async () => {
      render(<DesignArchitecture />);
      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await userEvent.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);
      expect(screen.getByLabelText('Search templates')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by category')).toBeInTheDocument();
      expect(screen.getAllByLabelText('View template details').length).toBeGreaterThan(0);
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);
      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await userEvent.tab();
      expect(searchInput).toHaveFocus();

      const categoryFilter = screen.getByLabelText(/filter by category/i);
      await userEvent.tab();
      expect(categoryFilter).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);
      const heading = screen.getByRole('heading', { name: /design templates/i });
      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
    });
  });

  describe('Error Handling', () => {
    it('should show error toast when template save fails', async () => {
      const mockShowToast = jest.fn();
      mockUseToast.mockReturnValueOnce({
        showToast: mockShowToast,
      });

      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockRejectedValue(new Error('Save failed')),
        isSaving: false,
        error: new Error('Save failed'),
      });

      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      await userEvent.click(modernCard);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Failed to apply template',
        })
      );
    });

    it('should show loading state during template save', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isSaving: true,
        error: null,
      });

      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      await userEvent.click(modernCard);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(screen.getByText(/applying template/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should retry failed template load when clicking retry button', () => {
      const mockRefetch = jest.fn();
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: new Error('Failed to load'),
        refetch: mockRefetch,
      });

      render(<DesignArchitecture />);
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Analytics Tracking', () => {
    it('should track template view event when opening preview', async () => {
      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      await userEvent.click(modernCard);

      expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
        'template_view',
        { templateId: '1', templateName: 'Modern Ecommerce' }
      );
    });

    it('should track template save event when using a template', async () => {
      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      await userEvent.click(modernCard);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
        'template_used',
        { templateId: '1', templateName: 'Modern Ecommerce' }
      );
    });

    it('should track template save event when saving a template', async () => {
      render(<DesignArchitecture />);
      const minimalistCard = screen.getByText('Minimalist Store').closest('.design-card') as HTMLElement;
      const bookmarkButton = within(minimalistCard).getByLabelText('Save template');
      await userEvent.click(bookmarkButton);

      expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
        'template_saved',
        { templateId: '2', templateName: 'Minimalist Store' }
      );
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));
      render(<DesignArchitecture />);

      const grid = screen.getByTestId('templates-grid');
      expect(grid).toHaveStyle('grid-template-columns: repeat(1, 1fr)');
    });

    it('should adjust layout for tablet viewports', () => {
      global.innerWidth = 800;
      global.dispatchEvent(new Event('resize'));
      render(<DesignArchitecture />);

      const grid = screen.getByTestId('templates-grid');
      expect(grid).toHaveStyle('grid-template-columns: repeat(2, 1fr)');
    });

    it('should adjust layout for desktop viewports', () => {
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));
      render(<DesignArchitecture />);

      const grid = screen.getByTestId('templates-grid');
      expect(grid).toHaveStyle('grid-template-columns: repeat(3, 1fr)');
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignTemplates, useSaveDesign, useUserPreferences } from '../../hooks/apiHooks';
import { useToast } from '../../context/ToastContext';
import { useAnalytics } from '../../context/AnalyticsContext';
import { Template } from '../../types/designTypes';

// Mock hooks and context
jest.mock('../../hooks/apiHooks');
jest.mock('../../context/ToastContext');
jest.mock('../../context/AnalyticsContext');

const mockUseDesignTemplates = useDesignTemplates as jest.MockedFunction<typeof useDesignTemplates>;
const mockUseSaveDesign = useSaveDesign as jest.MockedFunction<typeof useSaveDesign>;
const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Modern Ecommerce',
    thumbnail: 'modern-thumb.jpg',
    categories: ['ecommerce', 'modern'],
    previewUrl: 'modern-preview.jpg',
    isPremium: false,
  },
  {
    id: '2',
    name: 'Minimalist Store',
    thumbnail: 'minimalist-thumb.jpg',
    categories: ['ecommerce', 'minimalist'],
    previewUrl: 'minimalist-preview.jpg',
    isPremium: true,
  },
];

const mockUserPreferences = {
  preferredColorScheme: 'light',
  savedTemplates: ['1'],
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
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

    mockUseUserPreferences.mockReturnValue({
      preferences: mockUserPreferences,
      updatePreferences: jest.fn(),
      isLoading: false,
      error: null,
    });

    mockUseToast.mockReturnValue({
      showToast: jest.fn(),
    });

    mockUseAnalytics.mockReturnValue({
      trackEvent: jest.fn(),
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

    it('should render template cards when data is loaded successfully', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText('Modern Ecommerce')).toBeInTheDocument();
      expect(screen.getByText('Minimalist Store')).toBeInTheDocument();
    });

    it('should mark saved templates with a bookmark icon', () => {
      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      expect(within(modernCard).getByLabelText('Saved')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should open template preview modal when clicking on a template', async () => {
      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      await userEvent.click(modernCard);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modern Ecommerce')).toBeInTheDocument();
      expect(screen.getByAltText('Modern Ecommerce Preview')).toBeInTheDocument();
    });

    it('should close preview modal when clicking the close button', async () => {
      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      await userEvent.click(modernCard);

      const closeButton = screen.getByLabelText('Close preview');
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should toggle save template when clicking the bookmark button', async () => {
      const mockUpdatePreferences = jest.fn();
      mockUseUserPreferences.mockReturnValueOnce({
        preferences: mockUserPreferences,
        updatePreferences: mockUpdatePreferences,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const minimalistCard = screen.getByText('Minimalist Store').closest('.design-card') as HTMLElement;
      const bookmarkButton = within(minimalistCard).getByLabelText('Save template');

      await userEvent.click(bookmarkButton);
      expect(mockUpdatePreferences).toHaveBeenCalledWith({
        ...mockUserPreferences,
        savedTemplates: ['1', '2'],
      });
    });

    it('should show confirmation when trying to use a premium template without subscription', async () => {
      render(<DesignArchitecture />);
      const minimalistCard = screen.getByText('Minimalist Store').closest('.design-card') as HTMLElement;
      await userEvent.click(minimalistCard);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(screen.getByText(/premium template/i)).toBeInTheDocument();
      expect(screen.getByText(/upgrade your plan/i)).toBeInTheDocument();
    });

    it('should allow using free templates', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      await userEvent.click(modernCard);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockSaveDesign).toHaveBeenCalledWith('1');
      expect(screen.getByText(/template applied successfully/i)).toBeInTheDocument();
    });
  });

  describe('Filtering and Search', () => {
    it('should filter templates by search term', async () => {
      render(<DesignArchitecture />);
      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await userEvent.type(searchInput, 'modern');

      expect(screen.getByText('Modern Ecommerce')).toBeInTheDocument();
      expect(screen.queryByText('Minimalist Store')).not.toBeInTheDocument();
    });

    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);
      const categoryFilter = screen.getByLabelText(/filter by category/i);
      await userEvent.selectOptions(categoryFilter, 'ecommerce');

      expect(screen.getByText('Modern Ecommerce')).toBeInTheDocument();
      expect(screen.getByText('Minimalist Store')).toBeInTheDocument();
    });

    it('should show no results message when filters return no templates', async () => {
      render(<DesignArchitecture />);
      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await userEvent.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);
      expect(screen.getByLabelText('Search templates')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by category')).toBeInTheDocument();
      expect(screen.getAllByLabelText('View template details').length).toBeGreaterThan(0);
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);
      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await userEvent.tab();
      expect(searchInput).toHaveFocus();

      const categoryFilter = screen.getByLabelText(/filter by category/i);
      await userEvent.tab();
      expect(categoryFilter).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);
      const heading = screen.getByRole('heading', { name: /design templates/i });
      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
    });
  });

  describe('Error Handling', () => {
    it('should show error toast when template save fails', async () => {
      const mockShowToast = jest.fn();
      mockUseToast.mockReturnValueOnce({
        showToast: mockShowToast,
      });

      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockRejectedValue(new Error('Save failed')),
        isSaving: false,
        error: new Error('Save failed'),
      });

      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      await userEvent.click(modernCard);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Failed to apply template',
        })
      );
    });

    it('should show loading state during template save', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isSaving: true,
        error: null,
      });

      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      await userEvent.click(modernCard);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(screen.getByText(/applying template/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should retry failed template load when clicking retry button', () => {
      const mockRefetch = jest.fn();
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: new Error('Failed to load'),
        refetch: mockRefetch,
      });

      render(<DesignArchitecture />);
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Analytics Tracking', () => {
    it('should track template view event when opening preview', async () => {
      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      await userEvent.click(modernCard);

      expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
        'template_view',
        { templateId: '1', templateName: 'Modern Ecommerce' }
      );
    });

    it('should track template save event when using a template', async () => {
      render(<DesignArchitecture />);
      const modernCard = screen.getByText('Modern Ecommerce').closest('.design-card') as HTMLElement;
      await userEvent.click(modernCard);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
        'template_used',
        { templateId: '1', templateName: 'Modern Ecommerce' }
      );
    });

    it('should track template save event when saving a template', async () => {
      render(<DesignArchitecture />);
      const minimalistCard = screen.getByText('Minimalist Store').closest('.design-card') as HTMLElement;
      const bookmarkButton = within(minimalistCard).getByLabelText('Save template');
      await userEvent.click(bookmarkButton);

      expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
        'template_saved',
        { templateId: '2', templateName: 'Minimalist Store' }
      );
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));
      render(<DesignArchitecture />);

      const grid = screen.getByTestId('templates-grid');
      expect(grid).toHaveStyle('grid-template-columns: repeat(1, 1fr)');
    });

    it('should adjust layout for tablet viewports', () => {
      global.innerWidth = 800;
      global.dispatchEvent(new Event('resize'));
      render(<DesignArchitecture />);

      const grid = screen.getByTestId('templates-grid');
      expect(grid).toHaveStyle('grid-template-columns: repeat(2, 1fr)');
    });

    it('should adjust layout for desktop viewports', () => {
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));
      render(<DesignArchitecture />);

      const grid = screen.getByTestId('templates-grid');
      expect(grid).toHaveStyle('grid-template-columns: repeat(3, 1fr)');
    });
  });
});