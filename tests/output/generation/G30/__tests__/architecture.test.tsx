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
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

const mockTemplates: DesignTemplate[] = [
  {
    id: '1',
    name: 'Modern Storefront',
    thumbnail: 'modern-thumb.jpg',
    categories: ['ecommerce', 'modern'],
    previewUrl: 'modern-preview.jpg',
    isPremium: false,
  },
  {
    id: '2',
    name: 'Minimalist Shop',
    thumbnail: 'minimalist-thumb.jpg',
    categories: ['ecommerce', 'minimalist'],
    previewUrl: 'minimalist-preview.jpg',
    isPremium: true,
  },
];

const mockUser = {
  id: 'user123',
  subscription: { tier: 'premium', expiresAt: '2025-12-31' },
  isAuthenticated: true,
};

describe('DesignArchitecture Component', () => {
  const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
  const mockUseSaveDesign = useSaveDesign as jest.Mock;
  const mockUseLoadDesign = useLoadDesign as jest.Mock;
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseToast = useToast as jest.Mock;
  const mockShowToast = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: mockUser });
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

    it('should render error message when template loading fails', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: { message: 'Failed to load templates' },
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render template categories and templates when loaded successfully', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText(/design architecture/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /choose a template/i })).toBeInTheDocument();

      // Check categories
      const ecommerceTab = screen.getByRole('tab', { name: /ecommerce/i });
      expect(ecommerceTab).toBeInTheDocument();
      expect(ecommerceTab).toHaveAttribute('aria-selected', 'true');

      // Check templates
      expect(screen.getByText(/modern storefront/i)).toBeInTheDocument();
      expect(screen.getByText(/minimalist shop/i)).toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('should allow selecting a template', async () => {
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText(/modern storefront/i);
      await userEvent.click(modernTemplate);

      expect(screen.getByText(/template selected/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use this template/i })).toBeEnabled();
    });

    it('should show premium badge for premium templates', () => {
      render(<DesignArchitecture />);

      const premiumBadges = screen.getAllByText(/premium/i);
      expect(premiumBadges).toHaveLength(1);
      expect(premiumBadges[0]).toBeInTheDocument();
    });

    it('should disable "Use this template" button when no template is selected', () => {
      render(<DesignArchitecture />);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      expect(useTemplateButton).toBeDisabled();
    });
  });

  describe('Template Preview', () => {
    it('should open preview modal when clicking preview button', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await userEvent.click(previewButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/modern storefront preview/i)).toBeInTheDocument();
    });

    it('should close preview modal when clicking close button', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await userEvent.click(previewButtons[0]);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Template Actions', () => {
    it('should save selected template when clicking "Use this template"', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText(/modern storefront/i);
      await userEvent.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockSaveDesign).toHaveBeenCalledWith('1');
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: 'Template applied successfully!',
        })
      );
    });

    it('should show error when template save fails', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({
        success: false,
        error: { message: 'Failed to save template' },
      });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText(/modern storefront/i);
      await userEvent.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Failed to save template',
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

      const modernTemplate = screen.getByText(/modern storefront/i);
      await userEvent.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/applying template/i)).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('should filter templates by category when clicking category tabs', async () => {
      render(<DesignArchitecture />);

      const minimalistTab = screen.getByRole('tab', { name: /minimalist/i });
      await userEvent.click(minimalistTab);

      expect(minimalistTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText(/minimalist shop/i)).toBeInTheDocument();
      expect(screen.queryByText(/modern storefront/i)).not.toBeInTheDocument();
    });

    it('should show all templates when "All" category is selected', async () => {
      render(<DesignArchitecture />);

      const allTab = screen.getByRole('tab', { name: /all/i });
      await userEvent.click(allTab);

      expect(allTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText(/modern storefront/i)).toBeInTheDocument();
      expect(screen.getByText(/minimalist shop/i)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter templates based on search input', async () => {
      render(<DesignArchitecture />);

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'modern');

      expect(screen.getByText(/modern storefront/i)).toBeInTheDocument();
      expect(screen.queryByText(/minimalist shop/i)).not.toBeInTheDocument();
    });

    it('should show "no results" message when search yields no matches', async () => {
      render(<DesignArchitecture />);

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
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
        expect(within(card).getByRole('img')).toHaveAccessibleName();
      });
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      // Tab to first template
      await userEvent.tab();
      await userEvent.tab();

      const firstTemplate = screen.getByText(/modern storefront/i);
      expect(firstTemplate).toHaveFocus();

      // Select template with Enter
      await userEvent.type(firstTemplate, '{enter}');
      expect(screen.getByText(/template selected/i)).toBeInTheDocument();
    });

    it('should have proper focus management in preview modal', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await userEvent.click(previewButtons[0]);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty templates list gracefully', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no design templates available/i)).toBeInTheDocument();
    });

    it('should disable premium templates for non-premium users', () => {
      mockUseAuth.mockReturnValueOnce({
        user: { ...mockUser, subscription: { tier: 'free', expiresAt: '2023-01-01' } },
      });

      render(<DesignArchitecture />);

      const premiumTemplate = screen.getByText(/minimalist shop/i);
      const useTemplateButton = within(premiumTemplate.closest('article')!).getByRole('button', { name: /use this template/i });

      expect(useTemplateButton).toBeDisabled();
      expect(screen.getByText(/upgrade to premium to use this template/i)).toBeInTheDocument();
    });

    it('should show expired subscription warning for expired premium users', () => {
      mockUseAuth.mockReturnValueOnce({
        user: { ...mockUser, subscription: { tier: 'premium', expiresAt: '2020-01-01' } },
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/your premium subscription has expired/i)).toBeInTheDocument();
    });
  });

  describe('Saved Designs', () => {
    it('should load saved designs on component mount', () => {
      render(<DesignArchitecture />);
      expect(useLoadDesign).toHaveBeenCalled();
    });

    it('should show saved design indicator when a design is already saved', () => {
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: jest.fn().mockResolvedValue({
          success: true,
          data: { templateId: '1', customizations: {} },
        }),
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText(/modern storefront/i);
      expect(within(modernTemplate.closest('article')!).getByText(/currently applied/i)).toBeInTheDocument();
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
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

const mockTemplates: DesignTemplate[] = [
  {
    id: '1',
    name: 'Modern Storefront',
    thumbnail: 'modern-thumb.jpg',
    categories: ['ecommerce', 'modern'],
    previewUrl: 'modern-preview.jpg',
    isPremium: false,
  },
  {
    id: '2',
    name: 'Minimalist Shop',
    thumbnail: 'minimalist-thumb.jpg',
    categories: ['ecommerce', 'minimalist'],
    previewUrl: 'minimalist-preview.jpg',
    isPremium: true,
  },
];

const mockUser = {
  id: 'user123',
  subscription: { tier: 'premium', expiresAt: '2025-12-31' },
  isAuthenticated: true,
};

describe('DesignArchitecture Component', () => {
  const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
  const mockUseSaveDesign = useSaveDesign as jest.Mock;
  const mockUseLoadDesign = useLoadDesign as jest.Mock;
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseToast = useToast as jest.Mock;
  const mockShowToast = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: mockUser });
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

    it('should render error message when template loading fails', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: { message: 'Failed to load templates' },
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render template categories and templates when loaded successfully', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText(/design architecture/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /choose a template/i })).toBeInTheDocument();

      // Check categories
      const ecommerceTab = screen.getByRole('tab', { name: /ecommerce/i });
      expect(ecommerceTab).toBeInTheDocument();
      expect(ecommerceTab).toHaveAttribute('aria-selected', 'true');

      // Check templates
      expect(screen.getByText(/modern storefront/i)).toBeInTheDocument();
      expect(screen.getByText(/minimalist shop/i)).toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('should allow selecting a template', async () => {
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText(/modern storefront/i);
      await userEvent.click(modernTemplate);

      expect(screen.getByText(/template selected/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use this template/i })).toBeEnabled();
    });

    it('should show premium badge for premium templates', () => {
      render(<DesignArchitecture />);

      const premiumBadges = screen.getAllByText(/premium/i);
      expect(premiumBadges).toHaveLength(1);
      expect(premiumBadges[0]).toBeInTheDocument();
    });

    it('should disable "Use this template" button when no template is selected', () => {
      render(<DesignArchitecture />);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      expect(useTemplateButton).toBeDisabled();
    });
  });

  describe('Template Preview', () => {
    it('should open preview modal when clicking preview button', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await userEvent.click(previewButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/modern storefront preview/i)).toBeInTheDocument();
    });

    it('should close preview modal when clicking close button', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await userEvent.click(previewButtons[0]);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Template Actions', () => {
    it('should save selected template when clicking "Use this template"', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText(/modern storefront/i);
      await userEvent.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockSaveDesign).toHaveBeenCalledWith('1');
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: 'Template applied successfully!',
        })
      );
    });

    it('should show error when template save fails', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({
        success: false,
        error: { message: 'Failed to save template' },
      });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText(/modern storefront/i);
      await userEvent.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Failed to save template',
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

      const modernTemplate = screen.getByText(/modern storefront/i);
      await userEvent.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/applying template/i)).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('should filter templates by category when clicking category tabs', async () => {
      render(<DesignArchitecture />);

      const minimalistTab = screen.getByRole('tab', { name: /minimalist/i });
      await userEvent.click(minimalistTab);

      expect(minimalistTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText(/minimalist shop/i)).toBeInTheDocument();
      expect(screen.queryByText(/modern storefront/i)).not.toBeInTheDocument();
    });

    it('should show all templates when "All" category is selected', async () => {
      render(<DesignArchitecture />);

      const allTab = screen.getByRole('tab', { name: /all/i });
      await userEvent.click(allTab);

      expect(allTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText(/modern storefront/i)).toBeInTheDocument();
      expect(screen.getByText(/minimalist shop/i)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter templates based on search input', async () => {
      render(<DesignArchitecture />);

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'modern');

      expect(screen.getByText(/modern storefront/i)).toBeInTheDocument();
      expect(screen.queryByText(/minimalist shop/i)).not.toBeInTheDocument();
    });

    it('should show "no results" message when search yields no matches', async () => {
      render(<DesignArchitecture />);

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
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
        expect(within(card).getByRole('img')).toHaveAccessibleName();
      });
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      // Tab to first template
      await userEvent.tab();
      await userEvent.tab();

      const firstTemplate = screen.getByText(/modern storefront/i);
      expect(firstTemplate).toHaveFocus();

      // Select template with Enter
      await userEvent.type(firstTemplate, '{enter}');
      expect(screen.getByText(/template selected/i)).toBeInTheDocument();
    });

    it('should have proper focus management in preview modal', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await userEvent.click(previewButtons[0]);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty templates list gracefully', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no design templates available/i)).toBeInTheDocument();
    });

    it('should disable premium templates for non-premium users', () => {
      mockUseAuth.mockReturnValueOnce({
        user: { ...mockUser, subscription: { tier: 'free', expiresAt: '2023-01-01' } },
      });

      render(<DesignArchitecture />);

      const premiumTemplate = screen.getByText(/minimalist shop/i);
      const useTemplateButton = within(premiumTemplate.closest('article')!).getByRole('button', { name: /use this template/i });

      expect(useTemplateButton).toBeDisabled();
      expect(screen.getByText(/upgrade to premium to use this template/i)).toBeInTheDocument();
    });

    it('should show expired subscription warning for expired premium users', () => {
      mockUseAuth.mockReturnValueOnce({
        user: { ...mockUser, subscription: { tier: 'premium', expiresAt: '2020-01-01' } },
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/your premium subscription has expired/i)).toBeInTheDocument();
    });
  });

  describe('Saved Designs', () => {
    it('should load saved designs on component mount', () => {
      render(<DesignArchitecture />);
      expect(useLoadDesign).toHaveBeenCalled();
    });

    it('should show saved design indicator when a design is already saved', () => {
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: jest.fn().mockResolvedValue({
          success: true,
          data: { templateId: '1', customizations: {} },
        }),
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText(/modern storefront/i);
      expect(within(modernTemplate.closest('article')!).getByText(/currently applied/i)).toBeInTheDocument();
    });
  });
});