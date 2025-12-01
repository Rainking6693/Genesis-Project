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

const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseUserPreferences = useUserPreferences as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockUseAnalytics = useAnalytics as jest.Mock;

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Modern Ecommerce',
    thumbnail: 'modern-thumb.jpg',
    categories: ['ecommerce', 'modern'],
    previewUrl: 'modern-preview.html',
    isPremium: false
  },
  {
    id: '2',
    name: 'Minimalist Store',
    thumbnail: 'minimalist-thumb.jpg',
    categories: ['ecommerce', 'minimalist'],
    previewUrl: 'minimalist-preview.html',
    isPremium: true
  }
];

const mockUserPreferences = {
  preferredColorScheme: 'light',
  savedTemplates: ['1']
};

describe('DesignArchitecture Component', () => {
  const renderComponent = () => {
    mockUseDesignTemplates.mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    mockUseSaveDesign.mockReturnValue({
      saveDesign: jest.fn().mockResolvedValue({ success: true }),
      isSaving: false,
      error: null
    });

    mockUseUserPreferences.mockReturnValue({
      preferences: mockUserPreferences,
      isLoading: false,
      updatePreferences: jest.fn()
    });

    mockUseToast.mockReturnValue({
      showToast: jest.fn()
    });

    mockUseAnalytics.mockReturnValue({
      trackEvent: jest.fn()
    });

    return render(<DesignArchitecture />);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when templates are loading', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: true,
        error: null,
        refetch: jest.fn()
      });

      render(<DesignArchitecture />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading design templates/i)).toBeInTheDocument();
    });

    it('should render error message when templates fail to load', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: new Error('Failed to load templates'),
        refetch: jest.fn()
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render template categories and templates when loaded successfully', () => {
      renderComponent();
      expect(screen.getByText(/design your store/i)).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /ecommerce/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /premium/i })).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });
  });

  describe('Template Filtering', () => {
    it('should filter templates by category when tab is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const ecommerceTab = screen.getByRole('tab', { name: /ecommerce/i });
      await user.click(ecommerceTab);

      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);

      const minimalistTab = within(screen.getByRole('tabpanel')).getByRole('tab', { name: /minimalist/i });
      await user.click(minimalistTab);

      expect(screen.getByText(/minimalist store/i)).toBeInTheDocument();
      expect(screen.queryByText(/modern ecommerce/i)).not.toBeInTheDocument();
    });

    it('should show only premium templates when premium tab is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const premiumTab = screen.getByRole('tab', { name: /premium/i });
      await user.click(premiumTab);

      expect(screen.getByText(/minimalist store/i)).toBeInTheDocument();
      expect(screen.queryByText(/modern ecommerce/i)).not.toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('should show template details in preview panel when template is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const modernTemplate = screen.getByText(/modern ecommerce/i);
      await user.click(modernTemplate);

      expect(screen.getByText(/modern ecommerce/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /template preview/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /live preview/i })).toHaveAttribute('href', 'modern-preview.html');
    });

    it('should highlight saved templates', () => {
      renderComponent();
      const savedTemplate = screen.getByText(/modern ecommerce/i);
      expect(savedTemplate.closest('div')).toHaveClass('bg-blue-50');
    });

    it('should show premium badge for premium templates', () => {
      renderComponent();
      const premiumBadge = screen.getAllByText(/premium/i);
      expect(premiumBadge).toHaveLength(1);
      expect(premiumBadge[0]).toBeInTheDocument();
    });
  });

  describe('Template Actions', () => {
    it('should allow user to save a template', async () => {
      const user = userEvent.setup();
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null
      });

      renderComponent();

      const minimalistTemplate = screen.getByText(/minimalist store/i);
      await user.click(minimalistTemplate);

      const saveButton = screen.getByRole('button', { name: /save this design/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalledWith('2');
        expect(mockUseToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: /design saved successfully/i,
            type: 'success'
          })
        );
      });
    });

    it('should show error when saving template fails', async () => {
      const user = userEvent.setup();
      const mockSaveDesign = jest.fn().mockRejectedValue(new Error('Save failed'));
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null
      });

      renderComponent();

      const minimalistTemplate = screen.getByText(/minimalist store/i);
      await user.click(minimalistTemplate);

      const saveButton = screen.getByRole('button', { name: /save this design/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUseToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: /failed to save design/i,
            type: 'error'
          })
        );
      });
    });

    it('should show loading state while saving template', async () => {
      const user = userEvent.setup();
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(() => {})),
        isSaving: true,
        error: null
      });

      renderComponent();

      const minimalistTemplate = screen.getByText(/minimalist store/i);
      await user.click(minimalistTemplate);

      const saveButton = screen.getByRole('button', { name: /save this design/i });
      await user.click(saveButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/saving design/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for template cards', () => {
      renderComponent();
      const templateCards = screen.getAllByRole('article');
      expect(templateCards[0]).toHaveAttribute('aria-label', /modern ecommerce template/i);
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Tab to first template
      await user.tab();
      expect(screen.getByText(/modern ecommerce/i)).toHaveFocus();

      // Press enter to select
      await user.keyboard('{Enter}');
      expect(screen.getByRole('heading', { name: /template preview/i })).toBeInTheDocument();

      // Tab to save button
      await user.tab();
      await user.tab();
      expect(screen.getByRole('button', { name: /save this design/i })).toHaveFocus();
    });

    it('should have proper contrast for text elements', () => {
      renderComponent();
      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        expect(heading).toHaveStyle('color: rgb(17, 24, 39)'); // text-gray-900
      });
    });
  });

  describe('Color Scheme Preferences', () => {
    it('should apply dark mode when user prefers dark color scheme', () => {
      mockUseUserPreferences.mockReturnValueOnce({
        preferences: { ...mockUserPreferences, preferredColorScheme: 'dark' },
        isLoading: false,
        updatePreferences: jest.fn()
      });

      render(<DesignArchitecture />);
      expect(document.documentElement).toHaveClass('dark');
    });

    it('should allow user to toggle color scheme', async () => {
      const user = userEvent.setup();
      const mockUpdatePreferences = jest.fn();
      mockUseUserPreferences.mockReturnValueOnce({
        preferences: mockUserPreferences,
        isLoading: false,
        updatePreferences: mockUpdatePreferences
      });

      renderComponent();

      const themeToggle = screen.getByRole('button', { name: /toggle theme/i });
      await user.click(themeToggle);

      expect(mockUpdatePreferences).toHaveBeenCalledWith({
        ...mockUserPreferences,
        preferredColorScheme: 'dark'
      });
    });
  });

  describe('Analytics Tracking', () => {
    it('should track template preview clicks', async () => {
      const user = userEvent.setup();
      renderComponent();

      const modernTemplate = screen.getByText(/modern ecommerce/i);
      await user.click(modernTemplate);

      expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
        'template_preview',
        { templateId: '1', templateName: 'Modern Ecommerce' }
      );
    });

    it('should track template save actions', async () => {
      const user = userEvent.setup();
      renderComponent();

      const minimalistTemplate = screen.getByText(/minimalist store/i);
      await user.click(minimalistTemplate);

      const saveButton = screen.getByRole('button', { name: /save this design/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
          'template_save',
          { templateId: '2', templateName: 'Minimalist Store' }
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty template list gracefully', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/no design templates available/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should disable save button when template is already saved', async () => {
      const user = userEvent.setup();
      renderComponent();

      const modernTemplate = screen.getByText(/modern ecommerce/i);
      await user.click(modernTemplate);

      const saveButton = screen.getByRole('button', { name: /save this design/i });
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveTextContent(/already saved/i);
    });

    it('should show confirmation when trying to save over existing design', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn().mockReturnValue(true);

      renderComponent();

      const modernTemplate = screen.getByText(/modern ecommerce/i);
      await user.click(modernTemplate);

      const saveButton = screen.getByRole('button', { name: /already saved/i });
      await user.click(saveButton);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('overwrite your existing design')
      );
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

const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseUserPreferences = useUserPreferences as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockUseAnalytics = useAnalytics as jest.Mock;

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Modern Ecommerce',
    thumbnail: 'modern-thumb.jpg',
    categories: ['ecommerce', 'modern'],
    previewUrl: 'modern-preview.html',
    isPremium: false
  },
  {
    id: '2',
    name: 'Minimalist Store',
    thumbnail: 'minimalist-thumb.jpg',
    categories: ['ecommerce', 'minimalist'],
    previewUrl: 'minimalist-preview.html',
    isPremium: true
  }
];

const mockUserPreferences = {
  preferredColorScheme: 'light',
  savedTemplates: ['1']
};

describe('DesignArchitecture Component', () => {
  const renderComponent = () => {
    mockUseDesignTemplates.mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    mockUseSaveDesign.mockReturnValue({
      saveDesign: jest.fn().mockResolvedValue({ success: true }),
      isSaving: false,
      error: null
    });

    mockUseUserPreferences.mockReturnValue({
      preferences: mockUserPreferences,
      isLoading: false,
      updatePreferences: jest.fn()
    });

    mockUseToast.mockReturnValue({
      showToast: jest.fn()
    });

    mockUseAnalytics.mockReturnValue({
      trackEvent: jest.fn()
    });

    return render(<DesignArchitecture />);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when templates are loading', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: true,
        error: null,
        refetch: jest.fn()
      });

      render(<DesignArchitecture />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading design templates/i)).toBeInTheDocument();
    });

    it('should render error message when templates fail to load', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: new Error('Failed to load templates'),
        refetch: jest.fn()
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render template categories and templates when loaded successfully', () => {
      renderComponent();
      expect(screen.getByText(/design your store/i)).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /ecommerce/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /premium/i })).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });
  });

  describe('Template Filtering', () => {
    it('should filter templates by category when tab is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const ecommerceTab = screen.getByRole('tab', { name: /ecommerce/i });
      await user.click(ecommerceTab);

      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);

      const minimalistTab = within(screen.getByRole('tabpanel')).getByRole('tab', { name: /minimalist/i });
      await user.click(minimalistTab);

      expect(screen.getByText(/minimalist store/i)).toBeInTheDocument();
      expect(screen.queryByText(/modern ecommerce/i)).not.toBeInTheDocument();
    });

    it('should show only premium templates when premium tab is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const premiumTab = screen.getByRole('tab', { name: /premium/i });
      await user.click(premiumTab);

      expect(screen.getByText(/minimalist store/i)).toBeInTheDocument();
      expect(screen.queryByText(/modern ecommerce/i)).not.toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('should show template details in preview panel when template is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const modernTemplate = screen.getByText(/modern ecommerce/i);
      await user.click(modernTemplate);

      expect(screen.getByText(/modern ecommerce/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /template preview/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /live preview/i })).toHaveAttribute('href', 'modern-preview.html');
    });

    it('should highlight saved templates', () => {
      renderComponent();
      const savedTemplate = screen.getByText(/modern ecommerce/i);
      expect(savedTemplate.closest('div')).toHaveClass('bg-blue-50');
    });

    it('should show premium badge for premium templates', () => {
      renderComponent();
      const premiumBadge = screen.getAllByText(/premium/i);
      expect(premiumBadge).toHaveLength(1);
      expect(premiumBadge[0]).toBeInTheDocument();
    });
  });

  describe('Template Actions', () => {
    it('should allow user to save a template', async () => {
      const user = userEvent.setup();
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null
      });

      renderComponent();

      const minimalistTemplate = screen.getByText(/minimalist store/i);
      await user.click(minimalistTemplate);

      const saveButton = screen.getByRole('button', { name: /save this design/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalledWith('2');
        expect(mockUseToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: /design saved successfully/i,
            type: 'success'
          })
        );
      });
    });

    it('should show error when saving template fails', async () => {
      const user = userEvent.setup();
      const mockSaveDesign = jest.fn().mockRejectedValue(new Error('Save failed'));
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null
      });

      renderComponent();

      const minimalistTemplate = screen.getByText(/minimalist store/i);
      await user.click(minimalistTemplate);

      const saveButton = screen.getByRole('button', { name: /save this design/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUseToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: /failed to save design/i,
            type: 'error'
          })
        );
      });
    });

    it('should show loading state while saving template', async () => {
      const user = userEvent.setup();
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(() => {})),
        isSaving: true,
        error: null
      });

      renderComponent();

      const minimalistTemplate = screen.getByText(/minimalist store/i);
      await user.click(minimalistTemplate);

      const saveButton = screen.getByRole('button', { name: /save this design/i });
      await user.click(saveButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/saving design/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for template cards', () => {
      renderComponent();
      const templateCards = screen.getAllByRole('article');
      expect(templateCards[0]).toHaveAttribute('aria-label', /modern ecommerce template/i);
    });

    it('should be navigable via keyboard', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Tab to first template
      await user.tab();
      expect(screen.getByText(/modern ecommerce/i)).toHaveFocus();

      // Press enter to select
      await user.keyboard('{Enter}');
      expect(screen.getByRole('heading', { name: /template preview/i })).toBeInTheDocument();

      // Tab to save button
      await user.tab();
      await user.tab();
      expect(screen.getByRole('button', { name: /save this design/i })).toHaveFocus();
    });

    it('should have proper contrast for text elements', () => {
      renderComponent();
      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        expect(heading).toHaveStyle('color: rgb(17, 24, 39)'); // text-gray-900
      });
    });
  });

  describe('Color Scheme Preferences', () => {
    it('should apply dark mode when user prefers dark color scheme', () => {
      mockUseUserPreferences.mockReturnValueOnce({
        preferences: { ...mockUserPreferences, preferredColorScheme: 'dark' },
        isLoading: false,
        updatePreferences: jest.fn()
      });

      render(<DesignArchitecture />);
      expect(document.documentElement).toHaveClass('dark');
    });

    it('should allow user to toggle color scheme', async () => {
      const user = userEvent.setup();
      const mockUpdatePreferences = jest.fn();
      mockUseUserPreferences.mockReturnValueOnce({
        preferences: mockUserPreferences,
        isLoading: false,
        updatePreferences: mockUpdatePreferences
      });

      renderComponent();

      const themeToggle = screen.getByRole('button', { name: /toggle theme/i });
      await user.click(themeToggle);

      expect(mockUpdatePreferences).toHaveBeenCalledWith({
        ...mockUserPreferences,
        preferredColorScheme: 'dark'
      });
    });
  });

  describe('Analytics Tracking', () => {
    it('should track template preview clicks', async () => {
      const user = userEvent.setup();
      renderComponent();

      const modernTemplate = screen.getByText(/modern ecommerce/i);
      await user.click(modernTemplate);

      expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
        'template_preview',
        { templateId: '1', templateName: 'Modern Ecommerce' }
      );
    });

    it('should track template save actions', async () => {
      const user = userEvent.setup();
      renderComponent();

      const minimalistTemplate = screen.getByText(/minimalist store/i);
      await user.click(minimalistTemplate);

      const saveButton = screen.getByRole('button', { name: /save this design/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUseAnalytics().trackEvent).toHaveBeenCalledWith(
          'template_save',
          { templateId: '2', templateName: 'Minimalist Store' }
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty template list gracefully', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/no design templates available/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should disable save button when template is already saved', async () => {
      const user = userEvent.setup();
      renderComponent();

      const modernTemplate = screen.getByText(/modern ecommerce/i);
      await user.click(modernTemplate);

      const saveButton = screen.getByRole('button', { name: /save this design/i });
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveTextContent(/already saved/i);
    });

    it('should show confirmation when trying to save over existing design', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn().mockReturnValue(true);

      renderComponent();

      const modernTemplate = screen.getByText(/modern ecommerce/i);
      await user.click(modernTemplate);

      const saveButton = screen.getByRole('button', { name: /already saved/i });
      await user.click(saveButton);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('overwrite your existing design')
      );
    });
  });
});