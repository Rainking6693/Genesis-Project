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
    isPremium: false
  },
  {
    id: '2',
    name: 'Vintage Boutique',
    thumbnail: 'vintage-boutique.jpg',
    categories: ['fashion', 'home'],
    previewUrl: '/preview/vintage-boutique',
    isPremium: true
  }
];

const mockSaveDesign = jest.fn();
const mockLoadDesign = jest.fn();

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();
  const mockShowToast = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { id: 'user123', isPremium: true } });
    mockUseToast.mockReturnValue({ showToast: mockShowToast });

    mockUseDesignTemplates.mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    mockUseSaveDesign.mockReturnValue({
      saveDesign: mockSaveDesign,
      isSaving: false,
      saveError: null
    });

    mockUseLoadDesign.mockReturnValue({
      loadDesign: mockLoadDesign,
      isLoading: false,
      loadError: null,
      loadedDesign: null
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

    it('should render template cards when loaded successfully', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByText('Vintage Boutique')).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });
  });

  describe('Template Selection', () => {
    it('should allow selecting a template', async () => {
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('.design-template-card') as HTMLElement;
      await user.click(modernStoreCard);

      expect(modernStoreCard).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('button', { name: /use this template/i })).toBeEnabled();
    });

    it('should show premium badge for premium templates when user is not premium', () => {
      mockUseAuth.mockReturnValueOnce({ user: { id: 'user123', isPremium: false } });
      render(<DesignArchitecture />);

      const premiumBadge = within(screen.getByText('Vintage Boutique').closest('.design-template-card') as HTMLElement)
        .getByText(/premium/i);
      expect(premiumBadge).toBeInTheDocument();
    });

    it('should disable premium templates for non-premium users', () => {
      mockUseAuth.mockReturnValueOnce({ user: { id: 'user123', isPremium: false } });
      render(<DesignArchitecture />);

      const vintageCard = screen.getByText('Vintage Boutique').closest('.design-template-card') as HTMLElement;
      expect(vintageCard).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Template Preview', () => {
    it('should open preview modal when clicking preview button', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/template preview/i)).toBeInTheDocument();
    });

    it('should close preview modal when clicking close button', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Template Actions', () => {
    it('should enable "Use this template" button when a template is selected', async () => {
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('.design-template-card') as HTMLElement;
      await user.click(modernStoreCard);

      expect(screen.getByRole('button', { name: /use this template/i })).toBeEnabled();
    });

    it('should call saveDesign when clicking "Use this template"', async () => {
      mockSaveDesign.mockResolvedValueOnce({ success: true });
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('.design-template-card') as HTMLElement;
      await user.click(modernStoreCard);

      await user.click(screen.getByRole('button', { name: /use this template/i }));

      expect(mockSaveDesign).toHaveBeenCalledWith('1');
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Design template applied successfully!',
        type: 'success'
      });
    });

    it('should show error when saving design fails', async () => {
      mockSaveDesign.mockRejectedValueOnce(new Error('Save failed'));
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('.design-template-card') as HTMLElement;
      await user.click(modernStoreCard);

      await user.click(screen.getByRole('button', { name: /use this template/i }));

      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Failed to apply design template',
        type: 'error'
      });
    });

    it('should show loading state while saving design', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: true,
        saveError: null
      });

      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('.design-template-card') as HTMLElement;
      await user.click(modernStoreCard);

      expect(screen.getByRole('button', { name: /use this template/i })).toBeDisabled();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Saved Designs', () => {
    it('should show saved designs section when user has saved designs', () => {
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        loadError: null,
        loadedDesign: {
          id: 'saved1',
          name: 'My Custom Design',
          thumbnail: 'custom-design.jpg',
          lastUpdated: '2023-01-01'
        }
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/your saved designs/i)).toBeInTheDocument();
      expect(screen.getByText('My Custom Design')).toBeInTheDocument();
    });

    it('should load saved design when clicking on it', async () => {
      mockLoadDesign.mockResolvedValueOnce({ success: true });
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        loadError: null,
        loadedDesign: {
          id: 'saved1',
          name: 'My Custom Design',
          thumbnail: 'custom-design.jpg',
          lastUpdated: '2023-01-01'
        }
      });

      render(<DesignArchitecture />);

      const savedDesignCard = screen.getByText('My Custom Design').closest('.saved-design-card') as HTMLElement;
      await user.click(within(savedDesignCard).getByRole('button', { name: /load/i }));

      expect(mockLoadDesign).toHaveBeenCalledWith('saved1');
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Design loaded successfully!',
        type: 'success'
      });
    });

    it('should show error when loading saved design fails', async () => {
      mockLoadDesign.mockRejectedValueOnce(new Error('Load failed'));
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        loadError: null,
        loadedDesign: {
          id: 'saved1',
          name: 'My Custom Design',
          thumbnail: 'custom-design.jpg',
          lastUpdated: '2023-01-01'
        }
      });

      render(<DesignArchitecture />);

      const savedDesignCard = screen.getByText('My Custom Design').closest('.saved-design-card') as HTMLElement;
      await user.click(within(savedDesignCard).getByRole('button', { name: /load/i }));

      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Failed to load design',
        type: 'error'
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);

      const fashionCheckbox = screen.getByRole('checkbox', { name: /fashion/i });
      await user.click(fashionCheckbox);

      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByText('Vintage Boutique')).toBeInTheDocument();
      expect(screen.queryByText(/no templates found/i)).not.toBeInTheDocument();
    });

    it('should show "no templates found" when filters return no results', async () => {
      render(<DesignArchitecture />);

      const homeCheckbox = screen.getByRole('checkbox', { name: /home/i });
      await user.click(homeCheckbox);

      const electronicsCheckbox = screen.getByRole('checkbox', { name: /electronics/i });
      await user.click(electronicsCheckbox);

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });

    it('should search templates by name', async () => {
      render(<DesignArchitecture />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'modern');

      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.queryByText('Vintage Boutique')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for template cards', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      expect(templateCards[0]).toHaveAttribute('aria-label', 'Modern Store template');
      expect(templateCards[1]).toHaveAttribute('aria-label', 'Vintage Boutique template');
    });

    it('should have proper keyboard navigation for template selection', async () => {
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('.design-template-card') as HTMLElement;
      modernStoreCard.focus();
      await user.keyboard('{Enter}');

      expect(modernStoreCard).toHaveAttribute('aria-selected', 'true');
    });

    it('should have proper contrast for all interactive elements', () => {
      render(<DesignArchitecture />);

      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        const style = window.getComputedStyle(element);
        const contrastRatio = getContrastRatio(style.color, style.backgroundColor);
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty templates array gracefully', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/no design templates available/i)).toBeInTheDocument();
    });

    it('should disable all actions when user is not authenticated', () => {
      mockUseAuth.mockReturnValueOnce({ user: null });
      render(<DesignArchitecture />);

      expect(screen.getByText(/please sign in to use design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use this template/i })).toBeDisabled();
    });

    it('should show skeleton loaders while templates are being fetched', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: true,
        error: null,
        refetch: jest.fn()
      });

      render(<DesignArchitecture />);
      expect(screen.getAllByTestId('template-skeleton').length).toBeGreaterThan(0);
    });
  });
});

// Helper function for contrast ratio test
function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1) || { r: 0, g: 0, b: 0 };
  const rgb2 = hexToRgb(color2) || { r: 255, g: 255, b: 255 };

  const luminance1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const luminance2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

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
    isPremium: false
  },
  {
    id: '2',
    name: 'Vintage Boutique',
    thumbnail: 'vintage-boutique.jpg',
    categories: ['fashion', 'home'],
    previewUrl: '/preview/vintage-boutique',
    isPremium: true
  }
];

const mockSaveDesign = jest.fn();
const mockLoadDesign = jest.fn();

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();
  const mockShowToast = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { id: 'user123', isPremium: true } });
    mockUseToast.mockReturnValue({ showToast: mockShowToast });

    mockUseDesignTemplates.mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    mockUseSaveDesign.mockReturnValue({
      saveDesign: mockSaveDesign,
      isSaving: false,
      saveError: null
    });

    mockUseLoadDesign.mockReturnValue({
      loadDesign: mockLoadDesign,
      isLoading: false,
      loadError: null,
      loadedDesign: null
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

    it('should render template cards when loaded successfully', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByText('Vintage Boutique')).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });
  });

  describe('Template Selection', () => {
    it('should allow selecting a template', async () => {
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('.design-template-card') as HTMLElement;
      await user.click(modernStoreCard);

      expect(modernStoreCard).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('button', { name: /use this template/i })).toBeEnabled();
    });

    it('should show premium badge for premium templates when user is not premium', () => {
      mockUseAuth.mockReturnValueOnce({ user: { id: 'user123', isPremium: false } });
      render(<DesignArchitecture />);

      const premiumBadge = within(screen.getByText('Vintage Boutique').closest('.design-template-card') as HTMLElement)
        .getByText(/premium/i);
      expect(premiumBadge).toBeInTheDocument();
    });

    it('should disable premium templates for non-premium users', () => {
      mockUseAuth.mockReturnValueOnce({ user: { id: 'user123', isPremium: false } });
      render(<DesignArchitecture />);

      const vintageCard = screen.getByText('Vintage Boutique').closest('.design-template-card') as HTMLElement;
      expect(vintageCard).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Template Preview', () => {
    it('should open preview modal when clicking preview button', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/template preview/i)).toBeInTheDocument();
    });

    it('should close preview modal when clicking close button', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Template Actions', () => {
    it('should enable "Use this template" button when a template is selected', async () => {
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('.design-template-card') as HTMLElement;
      await user.click(modernStoreCard);

      expect(screen.getByRole('button', { name: /use this template/i })).toBeEnabled();
    });

    it('should call saveDesign when clicking "Use this template"', async () => {
      mockSaveDesign.mockResolvedValueOnce({ success: true });
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('.design-template-card') as HTMLElement;
      await user.click(modernStoreCard);

      await user.click(screen.getByRole('button', { name: /use this template/i }));

      expect(mockSaveDesign).toHaveBeenCalledWith('1');
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Design template applied successfully!',
        type: 'success'
      });
    });

    it('should show error when saving design fails', async () => {
      mockSaveDesign.mockRejectedValueOnce(new Error('Save failed'));
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('.design-template-card') as HTMLElement;
      await user.click(modernStoreCard);

      await user.click(screen.getByRole('button', { name: /use this template/i }));

      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Failed to apply design template',
        type: 'error'
      });
    });

    it('should show loading state while saving design', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: true,
        saveError: null
      });

      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('.design-template-card') as HTMLElement;
      await user.click(modernStoreCard);

      expect(screen.getByRole('button', { name: /use this template/i })).toBeDisabled();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Saved Designs', () => {
    it('should show saved designs section when user has saved designs', () => {
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        loadError: null,
        loadedDesign: {
          id: 'saved1',
          name: 'My Custom Design',
          thumbnail: 'custom-design.jpg',
          lastUpdated: '2023-01-01'
        }
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/your saved designs/i)).toBeInTheDocument();
      expect(screen.getByText('My Custom Design')).toBeInTheDocument();
    });

    it('should load saved design when clicking on it', async () => {
      mockLoadDesign.mockResolvedValueOnce({ success: true });
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        loadError: null,
        loadedDesign: {
          id: 'saved1',
          name: 'My Custom Design',
          thumbnail: 'custom-design.jpg',
          lastUpdated: '2023-01-01'
        }
      });

      render(<DesignArchitecture />);

      const savedDesignCard = screen.getByText('My Custom Design').closest('.saved-design-card') as HTMLElement;
      await user.click(within(savedDesignCard).getByRole('button', { name: /load/i }));

      expect(mockLoadDesign).toHaveBeenCalledWith('saved1');
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Design loaded successfully!',
        type: 'success'
      });
    });

    it('should show error when loading saved design fails', async () => {
      mockLoadDesign.mockRejectedValueOnce(new Error('Load failed'));
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        loadError: null,
        loadedDesign: {
          id: 'saved1',
          name: 'My Custom Design',
          thumbnail: 'custom-design.jpg',
          lastUpdated: '2023-01-01'
        }
      });

      render(<DesignArchitecture />);

      const savedDesignCard = screen.getByText('My Custom Design').closest('.saved-design-card') as HTMLElement;
      await user.click(within(savedDesignCard).getByRole('button', { name: /load/i }));

      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Failed to load design',
        type: 'error'
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);

      const fashionCheckbox = screen.getByRole('checkbox', { name: /fashion/i });
      await user.click(fashionCheckbox);

      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByText('Vintage Boutique')).toBeInTheDocument();
      expect(screen.queryByText(/no templates found/i)).not.toBeInTheDocument();
    });

    it('should show "no templates found" when filters return no results', async () => {
      render(<DesignArchitecture />);

      const homeCheckbox = screen.getByRole('checkbox', { name: /home/i });
      await user.click(homeCheckbox);

      const electronicsCheckbox = screen.getByRole('checkbox', { name: /electronics/i });
      await user.click(electronicsCheckbox);

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });

    it('should search templates by name', async () => {
      render(<DesignArchitecture />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'modern');

      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.queryByText('Vintage Boutique')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for template cards', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      expect(templateCards[0]).toHaveAttribute('aria-label', 'Modern Store template');
      expect(templateCards[1]).toHaveAttribute('aria-label', 'Vintage Boutique template');
    });

    it('should have proper keyboard navigation for template selection', async () => {
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('.design-template-card') as HTMLElement;
      modernStoreCard.focus();
      await user.keyboard('{Enter}');

      expect(modernStoreCard).toHaveAttribute('aria-selected', 'true');
    });

    it('should have proper contrast for all interactive elements', () => {
      render(<DesignArchitecture />);

      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        const style = window.getComputedStyle(element);
        const contrastRatio = getContrastRatio(style.color, style.backgroundColor);
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty templates array gracefully', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/no design templates available/i)).toBeInTheDocument();
    });

    it('should disable all actions when user is not authenticated', () => {
      mockUseAuth.mockReturnValueOnce({ user: null });
      render(<DesignArchitecture />);

      expect(screen.getByText(/please sign in to use design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use this template/i })).toBeDisabled();
    });

    it('should show skeleton loaders while templates are being fetched', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: true,
        error: null,
        refetch: jest.fn()
      });

      render(<DesignArchitecture />);
      expect(screen.getAllByTestId('template-skeleton').length).toBeGreaterThan(0);
    });
  });
});

// Helper function for contrast ratio test
function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1) || { r: 0, g: 0, b: 0 };
  const rgb2 = hexToRgb(color2) || { r: 255, g: 255, b: 255 };

  const luminance1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const luminance2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}