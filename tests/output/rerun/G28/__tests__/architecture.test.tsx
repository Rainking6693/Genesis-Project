import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignTemplates, useSaveDesign, useUserPreferences } from '../../hooks/api';
import { useToast } from '../../hooks/ui';
import { Template } from '../../types/design';
import { act } from 'react-dom/test-utils';

// Mock hooks
jest.mock('../../hooks/api');
jest.mock('../../hooks/ui');

const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseUserPreferences = useUserPreferences as jest.Mock;
const mockUseToast = useToast as jest.Mock;

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Modern Elegance',
    thumbnail: 'modern-thumb.jpg',
    categories: ['electronics', 'fashion'],
    previewUrl: 'modern-preview.jpg',
    isPremium: false
  },
  {
    id: '2',
    name: 'Vintage Chic',
    thumbnail: 'vintage-thumb.jpg',
    categories: ['home', 'fashion'],
    previewUrl: 'vintage-preview.jpg',
    isPremium: true
  }
];

const mockUserPreferences = {
  preferredCategories: ['electronics'],
  colorScheme: 'dark',
  savedDesigns: ['1']
};

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();
  const mockShowToast = jest.fn();
  const mockSaveDesign = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseToast.mockReturnValue({
      showToast: mockShowToast
    });

    mockUseDesignTemplates.mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    mockUseSaveDesign.mockReturnValue({
      saveDesign: mockSaveDesign,
      isSaving: false,
      error: null
    });

    mockUseUserPreferences.mockReturnValue({
      preferences: mockUserPreferences,
      isLoading: false,
      updatePreferences: jest.fn()
    });
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

    it('should render error state when templates fail to load', () => {
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

      expect(screen.getByText('Modern Elegance')).toBeInTheDocument();
      expect(screen.getByText('Vintage Chic')).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template thumbnail/i })).toHaveLength(2);
    });

    it('should apply user color scheme preference', () => {
      render(<DesignArchitecture />);

      const container = screen.getByTestId('design-architecture-container');
      expect(container).toHaveClass('dark-theme');
    });
  });

  describe('Template Filtering', () => {
    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);

      const categoryFilter = screen.getByRole('combobox', { name: /filter by category/i });
      await user.selectOptions(categoryFilter, 'electronics');

      expect(screen.getByText('Modern Elegance')).toBeInTheDocument();
      expect(screen.queryByText('Vintage Chic')).not.toBeInTheDocument();
    });

    it('should show all templates when "All Categories" is selected', async () => {
      render(<DesignArchitecture />);

      const categoryFilter = screen.getByRole('combobox', { name: /filter by category/i });
      await user.selectOptions(categoryFilter, 'electronics');
      await user.selectOptions(categoryFilter, 'all');

      expect(screen.getByText('Modern Elegance')).toBeInTheDocument();
      expect(screen.getByText('Vintage Chic')).toBeInTheDocument();
    });

    it('should filter premium templates when toggle is activated', async () => {
      render(<DesignArchitecture />);

      const premiumToggle = screen.getByRole('checkbox', { name: /show premium only/i });
      await user.click(premiumToggle);

      expect(screen.queryByText('Modern Elegance')).not.toBeInTheDocument();
      expect(screen.getByText('Vintage Chic')).toBeInTheDocument();
    });
  });

  describe('Template Interaction', () => {
    it('should open template preview modal when clicking on a template', async () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modern Elegance')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /template preview/i })).toHaveAttribute('src', 'modern-preview.jpg');
    });

    it('should close preview modal when clicking the close button', async () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should close preview modal when clicking outside the modal', async () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      const modalOverlay = screen.getByTestId('modal-overlay');
      await user.click(modalOverlay);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should navigate between templates in preview modal', async () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      const nextButton = screen.getByRole('button', { name: /next template/i });
      await user.click(nextButton);

      expect(screen.getByText('Vintage Chic')).toBeInTheDocument();

      const prevButton = screen.getByRole('button', { name: /previous template/i });
      await user.click(prevButton);

      expect(screen.getByText('Modern Elegance')).toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('should select a template for use', async () => {
      mockSaveDesign.mockResolvedValueOnce({ success: true });

      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      const useThisTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useThisTemplateButton);

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalledWith('1');
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Template selected successfully!',
          type: 'success'
        });
      });
    });

    it('should show error when template selection fails', async () => {
      mockSaveDesign.mockRejectedValueOnce(new Error('Selection failed'));

      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      const useThisTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useThisTemplateButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Failed to select template. Please try again.',
          type: 'error'
        });
      });
    });

    it('should show loading state during template selection', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: true,
        error: null
      });

      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      const useThisTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useThisTemplateButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/selecting template/i)).toBeInTheDocument();
    });

    it('should mark saved templates as selected', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      const selectedCard = within(templateCards[0]).getByLabelText(/selected template/i);
      const unselectedCard = within(templateCards[1]).queryByLabelText(/selected template/i);

      expect(selectedCard).toBeInTheDocument();
      expect(unselectedCard).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for template cards', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      templateCards.forEach(card => {
        expect(card).toHaveAttribute('aria-labelledby');
        expect(within(card).getByRole('heading')).toBeInTheDocument();
        expect(within(card).getByRole('img')).toHaveAttribute('alt', expect.stringContaining('thumbnail'));
      });
    });

    it('should have proper ARIA attributes for modal dialog', async () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      // Focus should start on the first template
      await user.tab();
      expect(screen.getByText('Modern Elegance')).toHaveFocus();

      // Navigate to filter controls
      await user.tab();
      await user.tab();
      expect(screen.getByRole('combobox', { name: /filter by category/i })).toHaveFocus();

      // Open modal and navigate inside
      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      await user.tab();
      expect(screen.getByRole('button', { name: /previous template/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /next template/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /use this template/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        const style = window.getComputedStyle(heading);
        const color = style.color;
        const backgroundColor = style.backgroundColor;

        // This is a simplified check - in real tests you'd use a proper contrast checking library
        expect(color).not.toEqual(backgroundColor);
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

    it('should disable premium filter when no premium templates exist', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [mockTemplates[0]],
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<DesignArchitecture />);

      const premiumToggle = screen.getByRole('checkbox', { name: /show premium only/i });
      expect(premiumToggle).toBeDisabled();
    });

    it('should show skeleton loaders while images are loading', () => {
      render(<DesignArchitecture />);

      const skeletonLoaders = screen.getAllByTestId('image-skeleton');
      expect(skeletonLoaders).toHaveLength(2);
    });

    it('should handle image loading errors gracefully', () => {
      // Mock image load error
      const originalImage = window.Image;
      window.Image = class MockImage {
        onerror: () => void = () => {};
        src = '';
      } as any;

      render(<DesignArchitecture />);

      // Trigger image load error
      act(() => {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          if (img.onerror) img.onerror(new Event('error') as any);
        });
      });

      expect(screen.getAllByAltText(/image failed to load/i)).toHaveLength(2);

      // Restore original Image
      window.Image = originalImage;
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', () => {
      // Mock mobile viewport
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      render(<DesignArchitecture />);

      const gridContainer = screen.getByTestId('templates-grid');
      expect(gridContainer).toHaveClass('mobile-grid');
    });

    it('should show mobile-specific filters', async () => {
      // Mock mobile viewport
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      render(<DesignArchitecture />);

      expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /filter/i }));

      expect(screen.getByRole('dialog', { name: /filters/i })).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignTemplates, useSaveDesign, useUserPreferences } from '../../hooks/api';
import { useToast } from '../../hooks/ui';
import { Template } from '../../types/design';
import { act } from 'react-dom/test-utils';

// Mock hooks
jest.mock('../../hooks/api');
jest.mock('../../hooks/ui');

const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseUserPreferences = useUserPreferences as jest.Mock;
const mockUseToast = useToast as jest.Mock;

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Modern Elegance',
    thumbnail: 'modern-thumb.jpg',
    categories: ['electronics', 'fashion'],
    previewUrl: 'modern-preview.jpg',
    isPremium: false
  },
  {
    id: '2',
    name: 'Vintage Chic',
    thumbnail: 'vintage-thumb.jpg',
    categories: ['home', 'fashion'],
    previewUrl: 'vintage-preview.jpg',
    isPremium: true
  }
];

const mockUserPreferences = {
  preferredCategories: ['electronics'],
  colorScheme: 'dark',
  savedDesigns: ['1']
};

describe('DesignArchitecture Component', () => {
  const user = userEvent.setup();
  const mockShowToast = jest.fn();
  const mockSaveDesign = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseToast.mockReturnValue({
      showToast: mockShowToast
    });

    mockUseDesignTemplates.mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    mockUseSaveDesign.mockReturnValue({
      saveDesign: mockSaveDesign,
      isSaving: false,
      error: null
    });

    mockUseUserPreferences.mockReturnValue({
      preferences: mockUserPreferences,
      isLoading: false,
      updatePreferences: jest.fn()
    });
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

    it('should render error state when templates fail to load', () => {
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

      expect(screen.getByText('Modern Elegance')).toBeInTheDocument();
      expect(screen.getByText('Vintage Chic')).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template thumbnail/i })).toHaveLength(2);
    });

    it('should apply user color scheme preference', () => {
      render(<DesignArchitecture />);

      const container = screen.getByTestId('design-architecture-container');
      expect(container).toHaveClass('dark-theme');
    });
  });

  describe('Template Filtering', () => {
    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);

      const categoryFilter = screen.getByRole('combobox', { name: /filter by category/i });
      await user.selectOptions(categoryFilter, 'electronics');

      expect(screen.getByText('Modern Elegance')).toBeInTheDocument();
      expect(screen.queryByText('Vintage Chic')).not.toBeInTheDocument();
    });

    it('should show all templates when "All Categories" is selected', async () => {
      render(<DesignArchitecture />);

      const categoryFilter = screen.getByRole('combobox', { name: /filter by category/i });
      await user.selectOptions(categoryFilter, 'electronics');
      await user.selectOptions(categoryFilter, 'all');

      expect(screen.getByText('Modern Elegance')).toBeInTheDocument();
      expect(screen.getByText('Vintage Chic')).toBeInTheDocument();
    });

    it('should filter premium templates when toggle is activated', async () => {
      render(<DesignArchitecture />);

      const premiumToggle = screen.getByRole('checkbox', { name: /show premium only/i });
      await user.click(premiumToggle);

      expect(screen.queryByText('Modern Elegance')).not.toBeInTheDocument();
      expect(screen.getByText('Vintage Chic')).toBeInTheDocument();
    });
  });

  describe('Template Interaction', () => {
    it('should open template preview modal when clicking on a template', async () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modern Elegance')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /template preview/i })).toHaveAttribute('src', 'modern-preview.jpg');
    });

    it('should close preview modal when clicking the close button', async () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should close preview modal when clicking outside the modal', async () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      const modalOverlay = screen.getByTestId('modal-overlay');
      await user.click(modalOverlay);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should navigate between templates in preview modal', async () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      const nextButton = screen.getByRole('button', { name: /next template/i });
      await user.click(nextButton);

      expect(screen.getByText('Vintage Chic')).toBeInTheDocument();

      const prevButton = screen.getByRole('button', { name: /previous template/i });
      await user.click(prevButton);

      expect(screen.getByText('Modern Elegance')).toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('should select a template for use', async () => {
      mockSaveDesign.mockResolvedValueOnce({ success: true });

      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      const useThisTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useThisTemplateButton);

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalledWith('1');
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Template selected successfully!',
          type: 'success'
        });
      });
    });

    it('should show error when template selection fails', async () => {
      mockSaveDesign.mockRejectedValueOnce(new Error('Selection failed'));

      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      const useThisTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useThisTemplateButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Failed to select template. Please try again.',
          type: 'error'
        });
      });
    });

    it('should show loading state during template selection', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: true,
        error: null
      });

      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      const useThisTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useThisTemplateButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/selecting template/i)).toBeInTheDocument();
    });

    it('should mark saved templates as selected', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      const selectedCard = within(templateCards[0]).getByLabelText(/selected template/i);
      const unselectedCard = within(templateCards[1]).queryByLabelText(/selected template/i);

      expect(selectedCard).toBeInTheDocument();
      expect(unselectedCard).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for template cards', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      templateCards.forEach(card => {
        expect(card).toHaveAttribute('aria-labelledby');
        expect(within(card).getByRole('heading')).toBeInTheDocument();
        expect(within(card).getByRole('img')).toHaveAttribute('alt', expect.stringContaining('thumbnail'));
      });
    });

    it('should have proper ARIA attributes for modal dialog', async () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      // Focus should start on the first template
      await user.tab();
      expect(screen.getByText('Modern Elegance')).toHaveFocus();

      // Navigate to filter controls
      await user.tab();
      await user.tab();
      expect(screen.getByRole('combobox', { name: /filter by category/i })).toHaveFocus();

      // Open modal and navigate inside
      const templateCards = screen.getAllByRole('article');
      await user.click(templateCards[0]);

      await user.tab();
      expect(screen.getByRole('button', { name: /previous template/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /next template/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /use this template/i })).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        const style = window.getComputedStyle(heading);
        const color = style.color;
        const backgroundColor = style.backgroundColor;

        // This is a simplified check - in real tests you'd use a proper contrast checking library
        expect(color).not.toEqual(backgroundColor);
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

    it('should disable premium filter when no premium templates exist', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [mockTemplates[0]],
        isLoading: false,
        error: null,
        refetch: jest.fn()
      });

      render(<DesignArchitecture />);

      const premiumToggle = screen.getByRole('checkbox', { name: /show premium only/i });
      expect(premiumToggle).toBeDisabled();
    });

    it('should show skeleton loaders while images are loading', () => {
      render(<DesignArchitecture />);

      const skeletonLoaders = screen.getAllByTestId('image-skeleton');
      expect(skeletonLoaders).toHaveLength(2);
    });

    it('should handle image loading errors gracefully', () => {
      // Mock image load error
      const originalImage = window.Image;
      window.Image = class MockImage {
        onerror: () => void = () => {};
        src = '';
      } as any;

      render(<DesignArchitecture />);

      // Trigger image load error
      act(() => {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          if (img.onerror) img.onerror(new Event('error') as any);
        });
      });

      expect(screen.getAllByAltText(/image failed to load/i)).toHaveLength(2);

      // Restore original Image
      window.Image = originalImage;
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', () => {
      // Mock mobile viewport
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      render(<DesignArchitecture />);

      const gridContainer = screen.getByTestId('templates-grid');
      expect(gridContainer).toHaveClass('mobile-grid');
    });

    it('should show mobile-specific filters', async () => {
      // Mock mobile viewport
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      render(<DesignArchitecture />);

      expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /filter/i }));

      expect(screen.getByRole('dialog', { name: /filters/i })).toBeInTheDocument();
    });
  });
});