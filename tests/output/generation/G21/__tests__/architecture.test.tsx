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

const mockUser = {
  isAuthenticated: true,
  user: { id: 'user123', subscription: 'premium' },
};

const mockToast = {
  showToast: jest.fn(),
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue(mockUser);
    (useToast as jest.Mock).mockReturnValue(mockToast);
    (useDesignTemplates as jest.Mock).mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    (useSaveDesign as jest.Mock).mockReturnValue({
      saveDesign: jest.fn().mockResolvedValue({ success: true }),
      isSaving: false,
      error: null,
    });
    (useLoadDesign as jest.Mock).mockReturnValue({
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
      (useDesignTemplates as jest.Mock).mockReturnValueOnce({
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
      (useDesignTemplates as jest.Mock).mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: 'Failed to load templates',
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render template cards when loaded successfully', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText('Modern Ecommerce')).toBeInTheDocument();
      expect(screen.getByText('Minimalist Store')).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template thumbnail/i })).toHaveLength(2);
    });
  });

  describe('Template Selection', () => {
    it('should allow selecting a template', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernTemplate = screen.getByText('Modern Ecommerce');
      await user.click(modernTemplate);

      expect(screen.getByText(/template selected/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use this template/i })).toBeEnabled();
    });

    it('should show premium badge for premium templates', () => {
      render(<DesignArchitecture />);
      const premiumBadges = screen.getAllByText(/premium/i);
      expect(premiumBadges).toHaveLength(1);
      expect(premiumBadges[0]).toBeInTheDocument();
    });

    it('should disable "Use this template" button for premium templates when user has no premium subscription', () => {
      (useAuth as jest.Mock).mockReturnValueOnce({
        isAuthenticated: true,
        user: { id: 'user123', subscription: 'basic' },
      });

      render(<DesignArchitecture />);
      const minimalistTemplate = screen.getByText('Minimalist Store');
      fireEvent.click(minimalistTemplate);

      const useButton = screen.getByRole('button', { name: /use this template/i });
      expect(useButton).toBeDisabled();
      expect(screen.getByText(/upgrade to premium to use this template/i)).toBeInTheDocument();
    });
  });

  describe('Template Preview', () => {
    it('should open preview modal when clicking preview button', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/template preview/i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /template preview/i })).toHaveAttribute('src', 'modern-preview.jpg');
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

  describe('Template Actions', () => {
    it('should load selected template when clicking "Use this template"', async () => {
      const mockLoadDesign = jest.fn().mockResolvedValue({ success: true });
      (useLoadDesign as jest.Mock).mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernTemplate = screen.getByText('Modern Ecommerce');
      await user.click(modernTemplate);

      const useButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useButton);

      expect(mockLoadDesign).toHaveBeenCalledWith('1');
      expect(screen.getByText(/template loaded successfully/i)).toBeInTheDocument();
    });

    it('should show error when template fails to load', async () => {
      const mockLoadDesign = jest.fn().mockRejectedValue(new Error('Load failed'));
      (useLoadDesign as jest.Mock).mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernTemplate = screen.getByText('Modern Ecommerce');
      await user.click(modernTemplate);

      const useButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to load template/i)).toBeInTheDocument();
      });
    });

    it('should save current design when clicking "Save current design"', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      (useSaveDesign as jest.Mock).mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const saveButton = screen.getByRole('button', { name: /save current design/i });
      await user.click(saveButton);

      expect(mockSaveDesign).toHaveBeenCalled();
      expect(screen.getByText(/design saved successfully/i)).toBeInTheDocument();
    });

    it('should show error when design fails to save', async () => {
      const mockSaveDesign = jest.fn().mockRejectedValue(new Error('Save failed'));
      (useSaveDesign as jest.Mock).mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const saveButton = screen.getByRole('button', { name: /save current design/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save design/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter templates by search term', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'modern');

      expect(screen.getByText('Modern Ecommerce')).toBeInTheDocument();
      expect(screen.queryByText('Minimalist Store')).not.toBeInTheDocument();
    });

    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const categoryFilter = screen.getByRole('combobox', { name: /filter by category/i });
      await user.selectOptions(categoryFilter, 'ecommerce');

      expect(screen.getByText('Modern Ecommerce')).toBeInTheDocument();
      expect(screen.getByText('Minimalist Store')).toBeInTheDocument();
    });

    it('should show no results message when no templates match filters', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('searchbox')).toHaveAccessibleName(/search templates/i);
      expect(screen.getByRole('combobox', { name: /filter by category/i })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /preview/i })[0]).toBeInTheDocument();
    });

    it('should have proper keyboard navigation', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      // Focus should move to search input
      await user.tab();
      expect(screen.getByRole('searchbox')).toHaveFocus();

      // Focus should move to filter dropdown
      await user.tab();
      expect(screen.getByRole('combobox', { name: /filter by category/i })).toHaveFocus();

      // Focus should move to first template card
      await user.tab();
      const firstTemplate = screen.getByText('Modern Ecommerce').closest('article');
      expect(firstTemplate).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const templateNames = screen.getAllByTestId('template-name');
      templateNames.forEach(name => {
        expect(name).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Assuming dark text on light background
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty templates array gracefully', () => {
      (useDesignTemplates as jest.Mock).mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/no design templates available/i)).toBeInTheDocument();
    });

    it('should disable all actions when not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValueOnce({
        isAuthenticated: false,
        user: null,
      });

      render(<DesignArchitecture />);

      const useButtons = screen.queryAllByRole('button', { name: /use this template/i });
      useButtons.forEach(button => {
        expect(button).toBeDisabled();
      });

      expect(screen.getByRole('button', { name: /save current design/i })).toBeDisabled();
      expect(screen.getByText(/please log in to use these features/i)).toBeInTheDocument();
    });

    it('should show loading state during template load action', async () => {
      (useLoadDesign as jest.Mock).mockReturnValueOnce({
        loadDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isLoading: true,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernTemplate = screen.getByText('Modern Ecommerce');
      await user.click(modernTemplate);

      const useButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading template/i)).toBeInTheDocument();
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

const mockUser = {
  isAuthenticated: true,
  user: { id: 'user123', subscription: 'premium' },
};

const mockToast = {
  showToast: jest.fn(),
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue(mockUser);
    (useToast as jest.Mock).mockReturnValue(mockToast);
    (useDesignTemplates as jest.Mock).mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    (useSaveDesign as jest.Mock).mockReturnValue({
      saveDesign: jest.fn().mockResolvedValue({ success: true }),
      isSaving: false,
      error: null,
    });
    (useLoadDesign as jest.Mock).mockReturnValue({
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
      (useDesignTemplates as jest.Mock).mockReturnValueOnce({
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
      (useDesignTemplates as jest.Mock).mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: 'Failed to load templates',
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render template cards when loaded successfully', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText('Modern Ecommerce')).toBeInTheDocument();
      expect(screen.getByText('Minimalist Store')).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template thumbnail/i })).toHaveLength(2);
    });
  });

  describe('Template Selection', () => {
    it('should allow selecting a template', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernTemplate = screen.getByText('Modern Ecommerce');
      await user.click(modernTemplate);

      expect(screen.getByText(/template selected/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use this template/i })).toBeEnabled();
    });

    it('should show premium badge for premium templates', () => {
      render(<DesignArchitecture />);
      const premiumBadges = screen.getAllByText(/premium/i);
      expect(premiumBadges).toHaveLength(1);
      expect(premiumBadges[0]).toBeInTheDocument();
    });

    it('should disable "Use this template" button for premium templates when user has no premium subscription', () => {
      (useAuth as jest.Mock).mockReturnValueOnce({
        isAuthenticated: true,
        user: { id: 'user123', subscription: 'basic' },
      });

      render(<DesignArchitecture />);
      const minimalistTemplate = screen.getByText('Minimalist Store');
      fireEvent.click(minimalistTemplate);

      const useButton = screen.getByRole('button', { name: /use this template/i });
      expect(useButton).toBeDisabled();
      expect(screen.getByText(/upgrade to premium to use this template/i)).toBeInTheDocument();
    });
  });

  describe('Template Preview', () => {
    it('should open preview modal when clicking preview button', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/template preview/i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /template preview/i })).toHaveAttribute('src', 'modern-preview.jpg');
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

  describe('Template Actions', () => {
    it('should load selected template when clicking "Use this template"', async () => {
      const mockLoadDesign = jest.fn().mockResolvedValue({ success: true });
      (useLoadDesign as jest.Mock).mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernTemplate = screen.getByText('Modern Ecommerce');
      await user.click(modernTemplate);

      const useButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useButton);

      expect(mockLoadDesign).toHaveBeenCalledWith('1');
      expect(screen.getByText(/template loaded successfully/i)).toBeInTheDocument();
    });

    it('should show error when template fails to load', async () => {
      const mockLoadDesign = jest.fn().mockRejectedValue(new Error('Load failed'));
      (useLoadDesign as jest.Mock).mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernTemplate = screen.getByText('Modern Ecommerce');
      await user.click(modernTemplate);

      const useButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to load template/i)).toBeInTheDocument();
      });
    });

    it('should save current design when clicking "Save current design"', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      (useSaveDesign as jest.Mock).mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const saveButton = screen.getByRole('button', { name: /save current design/i });
      await user.click(saveButton);

      expect(mockSaveDesign).toHaveBeenCalled();
      expect(screen.getByText(/design saved successfully/i)).toBeInTheDocument();
    });

    it('should show error when design fails to save', async () => {
      const mockSaveDesign = jest.fn().mockRejectedValue(new Error('Save failed'));
      (useSaveDesign as jest.Mock).mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const saveButton = screen.getByRole('button', { name: /save current design/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save design/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter templates by search term', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'modern');

      expect(screen.getByText('Modern Ecommerce')).toBeInTheDocument();
      expect(screen.queryByText('Minimalist Store')).not.toBeInTheDocument();
    });

    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const categoryFilter = screen.getByRole('combobox', { name: /filter by category/i });
      await user.selectOptions(categoryFilter, 'ecommerce');

      expect(screen.getByText('Modern Ecommerce')).toBeInTheDocument();
      expect(screen.getByText('Minimalist Store')).toBeInTheDocument();
    });

    it('should show no results message when no templates match filters', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByRole('searchbox')).toHaveAccessibleName(/search templates/i);
      expect(screen.getByRole('combobox', { name: /filter by category/i })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /preview/i })[0]).toBeInTheDocument();
    });

    it('should have proper keyboard navigation', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      // Focus should move to search input
      await user.tab();
      expect(screen.getByRole('searchbox')).toHaveFocus();

      // Focus should move to filter dropdown
      await user.tab();
      expect(screen.getByRole('combobox', { name: /filter by category/i })).toHaveFocus();

      // Focus should move to first template card
      await user.tab();
      const firstTemplate = screen.getByText('Modern Ecommerce').closest('article');
      expect(firstTemplate).toHaveFocus();
    });

    it('should have proper contrast ratios for text elements', () => {
      render(<DesignArchitecture />);

      const templateNames = screen.getAllByTestId('template-name');
      templateNames.forEach(name => {
        expect(name).toHaveStyle('color: rgba(0, 0, 0, 0.87)'); // Assuming dark text on light background
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty templates array gracefully', () => {
      (useDesignTemplates as jest.Mock).mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/no design templates available/i)).toBeInTheDocument();
    });

    it('should disable all actions when not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValueOnce({
        isAuthenticated: false,
        user: null,
      });

      render(<DesignArchitecture />);

      const useButtons = screen.queryAllByRole('button', { name: /use this template/i });
      useButtons.forEach(button => {
        expect(button).toBeDisabled();
      });

      expect(screen.getByRole('button', { name: /save current design/i })).toBeDisabled();
      expect(screen.getByText(/please log in to use these features/i)).toBeInTheDocument();
    });

    it('should show loading state during template load action', async () => {
      (useLoadDesign as jest.Mock).mockReturnValueOnce({
        loadDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isLoading: true,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernTemplate = screen.getByText('Modern Ecommerce');
      await user.click(modernTemplate);

      const useButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading template/i)).toBeInTheDocument();
    });
  });
});