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

const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseLoadDesign = useLoadDesign as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockNavigate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

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
    loadDesign: jest.fn().mockResolvedValue({
      id: 'loaded-design-1',
      name: 'Loaded Design',
      config: {},
    }),
    isLoading: false,
    error: null,
  });

  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', isPremium: true },
    isAuthenticated: true,
  });

  mockUseToast.mockReturnValue({
    showToast: jest.fn(),
  });

  require('react-router-dom').useNavigate.mockImplementation(() => mockNavigate);
});

describe('DesignArchitecture Component', () => {
  describe('Template Selection', () => {
    it('should render loading state while templates are loading', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading templates/i)).toBeInTheDocument();
    });

    it('should display error message when template loading fails', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: new Error('Failed to load templates'),
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should display all available templates in a grid', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByText('Vintage Boutique')).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });

    it('should filter templates by category when category chip is clicked', async () => {
      render(<DesignArchitecture />);

      const fashionChip = screen.getByRole('button', { name: /fashion/i });
      await userEvent.click(fashionChip);

      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByText('Vintage Boutique')).toBeInTheDocument();
      expect(screen.queryByText(/no templates found/i)).not.toBeInTheDocument();
    });

    it('should show "no templates found" when filter returns no results', async () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [
          {
            id: '3',
            name: 'Tech Store',
            thumbnail: 'tech-thumb.jpg',
            categories: ['electronics'],
            previewUrl: 'tech-preview.jpg',
            isPremium: false,
          },
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      const homeChip = screen.getByRole('button', { name: /home/i });
      await userEvent.click(homeChip);

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });

    it('should show premium badge for premium templates when user is not premium', () => {
      mockUseAuth.mockReturnValueOnce({
        user: { id: 'user-1', isPremium: false },
        isAuthenticated: true,
      });

      render(<DesignArchitecture />);

      const premiumBadges = screen.getAllByText(/premium/i);
      expect(premiumBadges).toHaveLength(1);
      expect(premiumBadges[0]).toBeInTheDocument();
    });

    it('should not show premium badge for premium templates when user is premium', () => {
      render(<DesignArchitecture />);
      expect(screen.queryByText(/premium/i)).not.toBeInTheDocument();
    });
  });

  describe('Template Preview', () => {
    it('should open preview modal when template is clicked', async () => {
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('article');
      if (modernStoreCard) {
        await userEvent.click(modernStoreCard);
      }

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /modern store preview/i })).toBeInTheDocument();
    });

    it('should close preview modal when close button is clicked', async () => {
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('article');
      if (modernStoreCard) {
        await userEvent.click(modernStoreCard);
      }

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should navigate to template details when "Use this template" is clicked', async () => {
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('article');
      if (modernStoreCard) {
        await userEvent.click(modernStoreCard);
      }

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockNavigate).toHaveBeenCalledWith('/design/editor?templateId=1');
    });
  });

  describe('Design Management', () => {
    it('should load saved designs on component mount', () => {
      render(<DesignArchitecture />);
      expect(useLoadDesign).toHaveBeenCalled();
    });

    it('should display loading state while saving design', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isSaving: true,
        error: null,
      });

      render(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await userEvent.click(saveButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/saving design/i)).toBeInTheDocument();
    });

    it('should show success message when design is saved successfully', async () => {
      render(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUseToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Design saved successfully',
            type: 'success',
          })
        );
      });
    });

    it('should show error message when design save fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockRejectedValue(new Error('Save failed')),
        isSaving: false,
        error: new Error('Save failed'),
      });

      render(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUseToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to save design',
            type: 'error',
          })
        );
      });
    });

    it('should load saved design when "Load Design" is clicked', async () => {
      render(<DesignArchitecture />);

      const loadButton = screen.getByRole('button', { name: /load design/i });
      await userEvent.click(loadButton);

      await waitFor(() => {
        expect(useLoadDesign().loadDesign).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for template cards', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      templateCards.forEach(card => {
        expect(card).toHaveAttribute('aria-labelledby');
      });
    });

    it('should have proper focus management in preview modal', async () => {
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('article');
      if (modernStoreCard) {
        await userEvent.click(modernStoreCard);
      }

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();

      const closeButton = within(modal).getByRole('button', { name: /close/i });
      await userEvent.tab();
      expect(closeButton).toHaveFocus();
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      // Focus first template
      const firstTemplate = screen.getByText('Modern Store').closest('article');
      if (firstTemplate) {
        firstTemplate.focus();
        await userEvent.keyboard('{Enter}');
      }

      // Modal should open
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close modal with Escape
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
      expect(screen.getByText(/no templates available/i)).toBeInTheDocument();
    });

    it('should disable save button when there are no changes', () => {
      render(<DesignArchitecture />);

      // Assuming the component tracks changes internally
      // This would need to be adjusted based on actual implementation
      const saveButton = screen.getByRole('button', { name: /save design/i });
      expect(saveButton).toBeDisabled();
    });

    it('should show unauthorized message when non-premium user tries to use premium template', async () => {
      mockUseAuth.mockReturnValueOnce({
        user: { id: 'user-1', isPremium: false },
        isAuthenticated: true,
      });

      render(<DesignArchitecture />);

      const vintageCard = screen.getByText('Vintage Boutique').closest('article');
      if (vintageCard) {
        await userEvent.click(vintageCard);
      }

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockUseToast().showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('premium membership'),
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

const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
const mockUseSaveDesign = useSaveDesign as jest.Mock;
const mockUseLoadDesign = useLoadDesign as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockNavigate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

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
    loadDesign: jest.fn().mockResolvedValue({
      id: 'loaded-design-1',
      name: 'Loaded Design',
      config: {},
    }),
    isLoading: false,
    error: null,
  });

  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', isPremium: true },
    isAuthenticated: true,
  });

  mockUseToast.mockReturnValue({
    showToast: jest.fn(),
  });

  require('react-router-dom').useNavigate.mockImplementation(() => mockNavigate);
});

describe('DesignArchitecture Component', () => {
  describe('Template Selection', () => {
    it('should render loading state while templates are loading', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading templates/i)).toBeInTheDocument();
    });

    it('should display error message when template loading fails', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: new Error('Failed to load templates'),
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should display all available templates in a grid', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByText('Vintage Boutique')).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });

    it('should filter templates by category when category chip is clicked', async () => {
      render(<DesignArchitecture />);

      const fashionChip = screen.getByRole('button', { name: /fashion/i });
      await userEvent.click(fashionChip);

      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByText('Vintage Boutique')).toBeInTheDocument();
      expect(screen.queryByText(/no templates found/i)).not.toBeInTheDocument();
    });

    it('should show "no templates found" when filter returns no results', async () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [
          {
            id: '3',
            name: 'Tech Store',
            thumbnail: 'tech-thumb.jpg',
            categories: ['electronics'],
            previewUrl: 'tech-preview.jpg',
            isPremium: false,
          },
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      const homeChip = screen.getByRole('button', { name: /home/i });
      await userEvent.click(homeChip);

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });

    it('should show premium badge for premium templates when user is not premium', () => {
      mockUseAuth.mockReturnValueOnce({
        user: { id: 'user-1', isPremium: false },
        isAuthenticated: true,
      });

      render(<DesignArchitecture />);

      const premiumBadges = screen.getAllByText(/premium/i);
      expect(premiumBadges).toHaveLength(1);
      expect(premiumBadges[0]).toBeInTheDocument();
    });

    it('should not show premium badge for premium templates when user is premium', () => {
      render(<DesignArchitecture />);
      expect(screen.queryByText(/premium/i)).not.toBeInTheDocument();
    });
  });

  describe('Template Preview', () => {
    it('should open preview modal when template is clicked', async () => {
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('article');
      if (modernStoreCard) {
        await userEvent.click(modernStoreCard);
      }

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /modern store preview/i })).toBeInTheDocument();
    });

    it('should close preview modal when close button is clicked', async () => {
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('article');
      if (modernStoreCard) {
        await userEvent.click(modernStoreCard);
      }

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should navigate to template details when "Use this template" is clicked', async () => {
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('article');
      if (modernStoreCard) {
        await userEvent.click(modernStoreCard);
      }

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockNavigate).toHaveBeenCalledWith('/design/editor?templateId=1');
    });
  });

  describe('Design Management', () => {
    it('should load saved designs on component mount', () => {
      render(<DesignArchitecture />);
      expect(useLoadDesign).toHaveBeenCalled();
    });

    it('should display loading state while saving design', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isSaving: true,
        error: null,
      });

      render(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await userEvent.click(saveButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/saving design/i)).toBeInTheDocument();
    });

    it('should show success message when design is saved successfully', async () => {
      render(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUseToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Design saved successfully',
            type: 'success',
          })
        );
      });
    });

    it('should show error message when design save fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockRejectedValue(new Error('Save failed')),
        isSaving: false,
        error: new Error('Save failed'),
      });

      render(<DesignArchitecture />);

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUseToast().showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to save design',
            type: 'error',
          })
        );
      });
    });

    it('should load saved design when "Load Design" is clicked', async () => {
      render(<DesignArchitecture />);

      const loadButton = screen.getByRole('button', { name: /load design/i });
      await userEvent.click(loadButton);

      await waitFor(() => {
        expect(useLoadDesign().loadDesign).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for template cards', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      templateCards.forEach(card => {
        expect(card).toHaveAttribute('aria-labelledby');
      });
    });

    it('should have proper focus management in preview modal', async () => {
      render(<DesignArchitecture />);

      const modernStoreCard = screen.getByText('Modern Store').closest('article');
      if (modernStoreCard) {
        await userEvent.click(modernStoreCard);
      }

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();

      const closeButton = within(modal).getByRole('button', { name: /close/i });
      await userEvent.tab();
      expect(closeButton).toHaveFocus();
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      // Focus first template
      const firstTemplate = screen.getByText('Modern Store').closest('article');
      if (firstTemplate) {
        firstTemplate.focus();
        await userEvent.keyboard('{Enter}');
      }

      // Modal should open
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close modal with Escape
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
      expect(screen.getByText(/no templates available/i)).toBeInTheDocument();
    });

    it('should disable save button when there are no changes', () => {
      render(<DesignArchitecture />);

      // Assuming the component tracks changes internally
      // This would need to be adjusted based on actual implementation
      const saveButton = screen.getByRole('button', { name: /save design/i });
      expect(saveButton).toBeDisabled();
    });

    it('should show unauthorized message when non-premium user tries to use premium template', async () => {
      mockUseAuth.mockReturnValueOnce({
        user: { id: 'user-1', isPremium: false },
        isAuthenticated: true,
      });

      render(<DesignArchitecture />);

      const vintageCard = screen.getByText('Vintage Boutique').closest('article');
      if (vintageCard) {
        await userEvent.click(vintageCard);
      }

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await userEvent.click(useTemplateButton);

      expect(mockUseToast().showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('premium membership'),
          type: 'error',
        })
      );
    });
  });
});