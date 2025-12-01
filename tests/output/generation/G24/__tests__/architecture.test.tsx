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
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockTemplates: DesignTemplate[] = [
  {
    id: '1',
    name: 'Modern Store',
    thumbnail: 'modern-store-thumb.jpg',
    categories: ['electronics', 'fashion'],
    previewUrl: 'modern-store-preview.jpg',
    isPremium: false,
  },
  {
    id: '2',
    name: 'Vintage Boutique',
    thumbnail: 'vintage-boutique-thumb.jpg',
    categories: ['fashion', 'home'],
    previewUrl: 'vintage-boutique-preview.jpg',
    isPremium: true,
  },
];

const mockUser = {
  isAuthenticated: true,
  user: {
    id: 'user123',
    subscription: { isPremium: false },
  },
};

const mockToast = {
  showToast: jest.fn(),
};

describe('DesignArchitecture Component', () => {
  const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
  const mockUseSaveDesign = useSaveDesign as jest.Mock;
  const mockUseLoadDesign = useLoadDesign as jest.Mock;
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseToast = useToast as jest.Mock;

  beforeEach(() => {
    mockUseAuth.mockReturnValue(mockUser);
    mockUseToast.mockReturnValue(mockToast);
    mockUseDesignTemplates.mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
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
      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByText('Vintage Boutique')).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });
  });

  describe('Template Filtering', () => {
    it('should filter templates by search term', async () => {
      render(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await userEvent.type(searchInput, 'modern');

      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.queryByText('Vintage Boutique')).not.toBeInTheDocument();
    });

    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);

      const categoryFilter = screen.getByLabelText(/filter by category/i);
      await userEvent.selectOptions(categoryFilter, 'fashion');

      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByText('Vintage Boutique')).toBeInTheDocument();
    });

    it('should show no results message when no templates match filters', async () => {
      render(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await userEvent.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  describe('Template Preview', () => {
    it('should open preview modal when clicking on a template', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByLabelText(/preview template/i);
      await userEvent.click(previewButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /modern store preview/i })).toBeInTheDocument();
    });

    it('should close preview modal when clicking close button', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByLabelText(/preview template/i);
      await userEvent.click(previewButtons[0]);

      const closeButton = screen.getByLabelText(/close preview/i);
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should show premium badge for premium templates', () => {
      render(<DesignArchitecture />);

      const premiumBadges = screen.getAllByText(/premium/i);
      expect(premiumBadges).toHaveLength(1);
      expect(premiumBadges[0]).toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('should allow selecting a free template', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const useTemplateButtons = screen.getAllByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButtons[0]);

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalledWith('1');
        expect(mockToast.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Template applied successfully!',
            type: 'success',
          })
        );
      });
    });

    it('should prevent non-premium users from selecting premium templates', async () => {
      render(<DesignArchitecture />);

      const useTemplateButtons = screen.getAllByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButtons[1]);

      expect(mockToast.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'This template requires a premium subscription',
          type: 'error',
        })
      );
    });

    it('should show loading state when saving template', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isSaving: true,
        error: null,
      });

      render(<DesignArchitecture />);

      const useTemplateButtons = screen.getAllByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButtons[0]);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/applying template/i)).toBeInTheDocument();
    });

    it('should show error when template selection fails', async () => {
      const mockSaveDesign = jest.fn().mockRejectedValue(new Error('Failed to save'));
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: new Error('Failed to save'),
      });

      render(<DesignArchitecture />);

      const useTemplateButtons = screen.getAllByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButtons[0]);

      await waitFor(() => {
        expect(mockToast.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to apply template',
            type: 'error',
          })
        );
      });
    });
  });

  describe('Saved Designs', () => {
    it('should load saved designs on component mount', () => {
      render(<DesignArchitecture />);
      expect(useLoadDesign).toHaveBeenCalled();
    });

    it('should display saved designs in the saved tab', () => {
      const mockLoadDesign = jest.fn().mockResolvedValue({
        savedDesigns: [
          { id: 'saved1', name: 'My Custom Design', thumbnail: 'custom-thumb.jpg' },
        ],
      });

      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const savedTab = screen.getByRole('tab', { name: /saved designs/i });
      fireEvent.click(savedTab);

      expect(screen.getByText('My Custom Design')).toBeInTheDocument();
    });

    it('should allow loading a saved design', async () => {
      const mockLoadDesign = jest.fn().mockResolvedValue({
        savedDesigns: [
          { id: 'saved1', name: 'My Custom Design', thumbnail: 'custom-thumb.jpg' },
        ],
      });

      const mockApplyDesign = jest.fn().mockResolvedValue({ success: true });

      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        error: null,
      });

      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockApplyDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const savedTab = screen.getByRole('tab', { name: /saved designs/i });
      fireEvent.click(savedTab);

      const loadButtons = screen.getAllByRole('button', { name: /load design/i });
      await userEvent.click(loadButtons[0]);

      expect(mockApplyDesign).toHaveBeenCalledWith('saved1');
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

    it('should have proper keyboard navigation for modal', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByLabelText(/preview template/i);
      await userEvent.click(previewButtons[0]);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');

      // Test escape key closes modal
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should have proper focus management when opening/closing modal', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByLabelText(/preview template/i);
      const firstButton = previewButtons[0];
      firstButton.focus();

      await userEvent.click(firstButton);

      const modal = screen.getByRole('dialog');
      const closeButton = within(modal).getByLabelText(/close preview/i);
      expect(closeButton).toHaveFocus();

      await userEvent.click(closeButton);
      expect(firstButton).toHaveFocus();
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

    it('should disable use template button when not authenticated', () => {
      mockUseAuth.mockReturnValueOnce({
        isAuthenticated: false,
        user: null,
      });

      render(<DesignArchitecture />);

      const useTemplateButtons = screen.getAllByRole('button', { name: /use this template/i });
      useTemplateButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should show login prompt when unauthenticated user tries to use template', async () => {
      mockUseAuth.mockReturnValueOnce({
        isAuthenticated: false,
        user: null,
      });

      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByLabelText(/preview template/i);
      await userEvent.click(previewButtons[0]);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockToast.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Please log in to use this template',
          type: 'error',
        })
      );
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
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockTemplates: DesignTemplate[] = [
  {
    id: '1',
    name: 'Modern Store',
    thumbnail: 'modern-store-thumb.jpg',
    categories: ['electronics', 'fashion'],
    previewUrl: 'modern-store-preview.jpg',
    isPremium: false,
  },
  {
    id: '2',
    name: 'Vintage Boutique',
    thumbnail: 'vintage-boutique-thumb.jpg',
    categories: ['fashion', 'home'],
    previewUrl: 'vintage-boutique-preview.jpg',
    isPremium: true,
  },
];

const mockUser = {
  isAuthenticated: true,
  user: {
    id: 'user123',
    subscription: { isPremium: false },
  },
};

const mockToast = {
  showToast: jest.fn(),
};

describe('DesignArchitecture Component', () => {
  const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
  const mockUseSaveDesign = useSaveDesign as jest.Mock;
  const mockUseLoadDesign = useLoadDesign as jest.Mock;
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseToast = useToast as jest.Mock;

  beforeEach(() => {
    mockUseAuth.mockReturnValue(mockUser);
    mockUseToast.mockReturnValue(mockToast);
    mockUseDesignTemplates.mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
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
      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByText('Vintage Boutique')).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });
  });

  describe('Template Filtering', () => {
    it('should filter templates by search term', async () => {
      render(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await userEvent.type(searchInput, 'modern');

      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.queryByText('Vintage Boutique')).not.toBeInTheDocument();
    });

    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);

      const categoryFilter = screen.getByLabelText(/filter by category/i);
      await userEvent.selectOptions(categoryFilter, 'fashion');

      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByText('Vintage Boutique')).toBeInTheDocument();
    });

    it('should show no results message when no templates match filters', async () => {
      render(<DesignArchitecture />);

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await userEvent.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  describe('Template Preview', () => {
    it('should open preview modal when clicking on a template', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByLabelText(/preview template/i);
      await userEvent.click(previewButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /modern store preview/i })).toBeInTheDocument();
    });

    it('should close preview modal when clicking close button', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByLabelText(/preview template/i);
      await userEvent.click(previewButtons[0]);

      const closeButton = screen.getByLabelText(/close preview/i);
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should show premium badge for premium templates', () => {
      render(<DesignArchitecture />);

      const premiumBadges = screen.getAllByText(/premium/i);
      expect(premiumBadges).toHaveLength(1);
      expect(premiumBadges[0]).toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('should allow selecting a free template', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const useTemplateButtons = screen.getAllByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButtons[0]);

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalledWith('1');
        expect(mockToast.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Template applied successfully!',
            type: 'success',
          })
        );
      });
    });

    it('should prevent non-premium users from selecting premium templates', async () => {
      render(<DesignArchitecture />);

      const useTemplateButtons = screen.getAllByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButtons[1]);

      expect(mockToast.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'This template requires a premium subscription',
          type: 'error',
        })
      );
    });

    it('should show loading state when saving template', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isSaving: true,
        error: null,
      });

      render(<DesignArchitecture />);

      const useTemplateButtons = screen.getAllByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButtons[0]);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/applying template/i)).toBeInTheDocument();
    });

    it('should show error when template selection fails', async () => {
      const mockSaveDesign = jest.fn().mockRejectedValue(new Error('Failed to save'));
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: new Error('Failed to save'),
      });

      render(<DesignArchitecture />);

      const useTemplateButtons = screen.getAllByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButtons[0]);

      await waitFor(() => {
        expect(mockToast.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to apply template',
            type: 'error',
          })
        );
      });
    });
  });

  describe('Saved Designs', () => {
    it('should load saved designs on component mount', () => {
      render(<DesignArchitecture />);
      expect(useLoadDesign).toHaveBeenCalled();
    });

    it('should display saved designs in the saved tab', () => {
      const mockLoadDesign = jest.fn().mockResolvedValue({
        savedDesigns: [
          { id: 'saved1', name: 'My Custom Design', thumbnail: 'custom-thumb.jpg' },
        ],
      });

      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const savedTab = screen.getByRole('tab', { name: /saved designs/i });
      fireEvent.click(savedTab);

      expect(screen.getByText('My Custom Design')).toBeInTheDocument();
    });

    it('should allow loading a saved design', async () => {
      const mockLoadDesign = jest.fn().mockResolvedValue({
        savedDesigns: [
          { id: 'saved1', name: 'My Custom Design', thumbnail: 'custom-thumb.jpg' },
        ],
      });

      const mockApplyDesign = jest.fn().mockResolvedValue({ success: true });

      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        error: null,
      });

      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockApplyDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const savedTab = screen.getByRole('tab', { name: /saved designs/i });
      fireEvent.click(savedTab);

      const loadButtons = screen.getAllByRole('button', { name: /load design/i });
      await userEvent.click(loadButtons[0]);

      expect(mockApplyDesign).toHaveBeenCalledWith('saved1');
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

    it('should have proper keyboard navigation for modal', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByLabelText(/preview template/i);
      await userEvent.click(previewButtons[0]);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');

      // Test escape key closes modal
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should have proper focus management when opening/closing modal', async () => {
      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByLabelText(/preview template/i);
      const firstButton = previewButtons[0];
      firstButton.focus();

      await userEvent.click(firstButton);

      const modal = screen.getByRole('dialog');
      const closeButton = within(modal).getByLabelText(/close preview/i);
      expect(closeButton).toHaveFocus();

      await userEvent.click(closeButton);
      expect(firstButton).toHaveFocus();
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

    it('should disable use template button when not authenticated', () => {
      mockUseAuth.mockReturnValueOnce({
        isAuthenticated: false,
        user: null,
      });

      render(<DesignArchitecture />);

      const useTemplateButtons = screen.getAllByRole('button', { name: /use this template/i });
      useTemplateButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should show login prompt when unauthenticated user tries to use template', async () => {
      mockUseAuth.mockReturnValueOnce({
        isAuthenticated: false,
        user: null,
      });

      render(<DesignArchitecture />);

      const previewButtons = screen.getAllByLabelText(/preview template/i);
      await userEvent.click(previewButtons[0]);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockToast.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Please log in to use this template',
          type: 'error',
        })
      );
    });
  });
});