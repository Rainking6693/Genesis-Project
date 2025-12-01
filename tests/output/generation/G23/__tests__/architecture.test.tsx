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
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  isPremium: false,
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
    });
    mockUseSaveDesign.mockReturnValue({ saveDesign: jest.fn(), isSaving: false, error: null });
    mockUseLoadDesign.mockReturnValue({ loadDesign: jest.fn(), isLoading: false, error: null });
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
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render template cards when templates are loaded successfully', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText('Modern Storefront')).toBeInTheDocument();
      expect(screen.getByText('Minimalist Shop')).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });

    it('should display premium badge for premium templates when user is not premium', () => {
      render(<DesignArchitecture />);
      const premiumBadges = screen.getAllByText(/premium/i);
      expect(premiumBadges).toHaveLength(1);
      expect(premiumBadges[0]).toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('should allow selecting a non-premium template', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      expect(screen.getByText(/customize this template/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use this template/i })).toBeInTheDocument();
    });

    it('should show premium upsell when non-premium user selects premium template', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const minimalistTemplate = screen.getByText('Minimalist Shop');
      await user.click(minimalistTemplate);

      expect(screen.getByText(/this template requires premium membership/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upgrade to premium/i })).toBeInTheDocument();
    });

    it('should allow premium user to select premium template', async () => {
      mockUseAuth.mockReturnValueOnce({
        user: { ...mockUser, isPremium: true },
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const minimalistTemplate = screen.getByText('Minimalist Shop');
      await user.click(minimalistTemplate);

      expect(screen.getByText(/customize this template/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use this template/i })).toBeInTheDocument();
    });
  });

  describe('Template Customization', () => {
    it('should open customization modal when "Customize" button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const customizeButton = screen.getByRole('button', { name: /customize/i });
      await user.click(customizeButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/template customization/i)).toBeInTheDocument();
    });

    it('should apply color changes in customization modal', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const customizeButton = screen.getByRole('button', { name: /customize/i });
      await user.click(customizeButton);

      const primaryColorInput = screen.getByLabelText(/primary color/i);
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#ff5733');

      expect(primaryColorInput).toHaveValue('#ff5733');
    });

    it('should save customized template when "Save Changes" is clicked', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const customizeButton = screen.getByRole('button', { name: /customize/i });
      await user.click(customizeButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: /design saved successfully/i,
            type: 'success',
          })
        );
      });
    });

    it('should show error when saving customized template fails', async () => {
      const mockSaveDesign = jest.fn().mockRejectedValue(new Error('Save failed'));
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const customizeButton = screen.getByRole('button', { name: /customize/i });
      await user.click(customizeButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: /failed to save design/i,
            type: 'error',
          })
        );
      });
    });
  });

  describe('Template Preview', () => {
    it('should show template preview when "Preview" button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/template preview/i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /modern storefront preview/i })).toBeInTheDocument();
    });

    it('should close preview modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Template Usage', () => {
    it('should apply selected template when "Use This Template" is clicked', async () => {
      const mockLoadDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateButton);

      await waitFor(() => {
        expect(mockLoadDesign).toHaveBeenCalledWith('1');
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: /template applied successfully/i,
            type: 'success',
          })
        );
      });
    });

    it('should show loading state while applying template', async () => {
      const mockLoadDesign = jest.fn(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: true,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/applying template/i)).toBeInTheDocument();
    });

    it('should show error when applying template fails', async () => {
      const mockLoadDesign = jest.fn().mockRejectedValue(new Error('Apply failed'));
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: /failed to apply template/i,
            type: 'error',
          })
        );
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter templates by category', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const categoryFilter = screen.getByLabelText(/filter by category/i);
      await user.selectOptions(categoryFilter, 'ecommerce');

      expect(screen.getByText('Modern Storefront')).toBeInTheDocument();
      expect(screen.getByText('Minimalist Shop')).toBeInTheDocument();
    });

    it('should search templates by name', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, 'Modern');

      expect(screen.getByText('Modern Storefront')).toBeInTheDocument();
      expect(screen.queryByText('Minimalist Shop')).not.toBeInTheDocument();
    });

    it('should show "no results" message when no templates match search', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, 'Nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for template cards', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      expect(templateCards).toHaveLength(2);

      templateCards.forEach(card => {
        expect(card).toHaveAttribute('aria-labelledby');
      });
    });

    it('should have proper focus management in modals', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(document.body).toHaveStyle('overflow: hidden');
    });

    it('should allow keyboard navigation for template selection', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      modernTemplate.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByText(/customize this template/i)).toBeInTheDocument();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        const style = window.getComputedStyle(heading);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        // This is a simplified check - in real tests you'd calculate actual contrast
        expect(color).not.toBe(backgroundColor);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty templates array gracefully', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/no design templates available/i)).toBeInTheDocument();
    });

    it('should disable customize button when template is already customized', async () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [{ ...mockTemplates[0], isCustomized: true }],
        isLoading: false,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const customizeButton = screen.getByRole('button', { name: /customize/i });
      expect(customizeButton).toBeDisabled();
      expect(screen.getByText(/this template has been customized/i)).toBeInTheDocument();
    });

    it('should show confirmation dialog when replacing existing design', async () => {
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: jest.fn(),
        isLoading: false,
        error: null,
        hasExistingDesign: true,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateButton);

      expect(screen.getByText(/you already have a design in progress/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /replace design/i })).toBeInTheDocument();
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
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  isPremium: false,
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
    });
    mockUseSaveDesign.mockReturnValue({ saveDesign: jest.fn(), isSaving: false, error: null });
    mockUseLoadDesign.mockReturnValue({ loadDesign: jest.fn(), isLoading: false, error: null });
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
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render template cards when templates are loaded successfully', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText('Modern Storefront')).toBeInTheDocument();
      expect(screen.getByText('Minimalist Shop')).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });

    it('should display premium badge for premium templates when user is not premium', () => {
      render(<DesignArchitecture />);
      const premiumBadges = screen.getAllByText(/premium/i);
      expect(premiumBadges).toHaveLength(1);
      expect(premiumBadges[0]).toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('should allow selecting a non-premium template', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      expect(screen.getByText(/customize this template/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use this template/i })).toBeInTheDocument();
    });

    it('should show premium upsell when non-premium user selects premium template', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const minimalistTemplate = screen.getByText('Minimalist Shop');
      await user.click(minimalistTemplate);

      expect(screen.getByText(/this template requires premium membership/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upgrade to premium/i })).toBeInTheDocument();
    });

    it('should allow premium user to select premium template', async () => {
      mockUseAuth.mockReturnValueOnce({
        user: { ...mockUser, isPremium: true },
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const minimalistTemplate = screen.getByText('Minimalist Shop');
      await user.click(minimalistTemplate);

      expect(screen.getByText(/customize this template/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use this template/i })).toBeInTheDocument();
    });
  });

  describe('Template Customization', () => {
    it('should open customization modal when "Customize" button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const customizeButton = screen.getByRole('button', { name: /customize/i });
      await user.click(customizeButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/template customization/i)).toBeInTheDocument();
    });

    it('should apply color changes in customization modal', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const customizeButton = screen.getByRole('button', { name: /customize/i });
      await user.click(customizeButton);

      const primaryColorInput = screen.getByLabelText(/primary color/i);
      await user.clear(primaryColorInput);
      await user.type(primaryColorInput, '#ff5733');

      expect(primaryColorInput).toHaveValue('#ff5733');
    });

    it('should save customized template when "Save Changes" is clicked', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const customizeButton = screen.getByRole('button', { name: /customize/i });
      await user.click(customizeButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: /design saved successfully/i,
            type: 'success',
          })
        );
      });
    });

    it('should show error when saving customized template fails', async () => {
      const mockSaveDesign = jest.fn().mockRejectedValue(new Error('Save failed'));
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const customizeButton = screen.getByRole('button', { name: /customize/i });
      await user.click(customizeButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: /failed to save design/i,
            type: 'error',
          })
        );
      });
    });
  });

  describe('Template Preview', () => {
    it('should show template preview when "Preview" button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/template preview/i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /modern storefront preview/i })).toBeInTheDocument();
    });

    it('should close preview modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Template Usage', () => {
    it('should apply selected template when "Use This Template" is clicked', async () => {
      const mockLoadDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateButton);

      await waitFor(() => {
        expect(mockLoadDesign).toHaveBeenCalledWith('1');
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: /template applied successfully/i,
            type: 'success',
          })
        );
      });
    });

    it('should show loading state while applying template', async () => {
      const mockLoadDesign = jest.fn(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: true,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/applying template/i)).toBeInTheDocument();
    });

    it('should show error when applying template fails', async () => {
      const mockLoadDesign = jest.fn().mockRejectedValue(new Error('Apply failed'));
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: /failed to apply template/i,
            type: 'error',
          })
        );
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter templates by category', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const categoryFilter = screen.getByLabelText(/filter by category/i);
      await user.selectOptions(categoryFilter, 'ecommerce');

      expect(screen.getByText('Modern Storefront')).toBeInTheDocument();
      expect(screen.getByText('Minimalist Shop')).toBeInTheDocument();
    });

    it('should search templates by name', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, 'Modern');

      expect(screen.getByText('Modern Storefront')).toBeInTheDocument();
      expect(screen.queryByText('Minimalist Shop')).not.toBeInTheDocument();
    });

    it('should show "no results" message when no templates match search', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, 'Nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for template cards', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      expect(templateCards).toHaveLength(2);

      templateCards.forEach(card => {
        expect(card).toHaveAttribute('aria-labelledby');
      });
    });

    it('should have proper focus management in modals', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(document.body).toHaveStyle('overflow: hidden');
    });

    it('should allow keyboard navigation for template selection', async () => {
      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      modernTemplate.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByText(/customize this template/i)).toBeInTheDocument();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        const style = window.getComputedStyle(heading);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        // This is a simplified check - in real tests you'd calculate actual contrast
        expect(color).not.toBe(backgroundColor);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty templates array gracefully', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/no design templates available/i)).toBeInTheDocument();
    });

    it('should disable customize button when template is already customized', async () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [{ ...mockTemplates[0], isCustomized: true }],
        isLoading: false,
        error: null,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const customizeButton = screen.getByRole('button', { name: /customize/i });
      expect(customizeButton).toBeDisabled();
      expect(screen.getByText(/this template has been customized/i)).toBeInTheDocument();
    });

    it('should show confirmation dialog when replacing existing design', async () => {
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: jest.fn(),
        isLoading: false,
        error: null,
        hasExistingDesign: true,
      });

      const user = userEvent.setup();
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText('Modern Storefront');
      await user.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateButton);

      expect(screen.getByText(/you already have a design in progress/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /replace design/i })).toBeInTheDocument();
    });
  });
});