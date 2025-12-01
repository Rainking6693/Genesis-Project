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

const mockUseDesignTemplates = useDesignTemplates as jest.MockedFunction<typeof useDesignTemplates>;
const mockUseSaveDesign = useSaveDesign as jest.MockedFunction<typeof useSaveDesign>;
const mockUseLoadDesign = useLoadDesign as jest.MockedFunction<typeof useLoadDesign>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockTemplates: DesignTemplate[] = [
  {
    id: '1',
    name: 'Modern Store',
    thumbnail: 'modern-store-thumb.jpg',
    categories: ['electronics', 'fashion'],
    previewUrl: 'modern-store-preview.html',
    price: 49.99,
    rating: 4.5,
  },
  {
    id: '2',
    name: 'Minimalist Shop',
    thumbnail: 'minimalist-shop-thumb.jpg',
    categories: ['home', 'fashion'],
    previewUrl: 'minimalist-shop-preview.html',
    price: 39.99,
    rating: 4.2,
  },
];

const mockUser = {
  isAuthenticated: true,
  user: {
    id: 'user123',
    email: 'test@example.com',
    plan: 'premium',
  },
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(mockUser);
    mockUseToast.mockReturnValue({ showToast: jest.fn() });
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

    it('should render error message when failed to load templates', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: 'Failed to load templates',
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render template cards when templates are loaded successfully', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByText('Minimalist Shop')).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });
  });

  describe('Template Selection', () => {
    it('should allow user to select a template', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText('Modern Store').closest('article')!;
      await user.click(within(modernStoreCard).getByRole('radio'));

      expect(within(modernStoreCard).getByRole('radio')).toBeChecked();
      expect(screen.getByText(/selected: modern store/i)).toBeInTheDocument();
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

  describe('Filtering and Search', () => {
    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const electronicsCheckbox = screen.getByRole('checkbox', { name: /electronics/i });
      await user.click(electronicsCheckbox);

      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.queryByText('Minimalist Shop')).not.toBeInTheDocument();
    });

    it('should search templates by name', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'minimalist');

      expect(screen.queryByText('Modern Store')).not.toBeInTheDocument();
      expect(screen.getByText('Minimalist Shop')).toBeInTheDocument();
    });

    it('should show no results message when no templates match filters', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  describe('Design Actions', () => {
    it('should save selected design when clicking save button', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText('Modern Store').closest('article')!;
      await user.click(within(modernStoreCard).getByRole('radio'));

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await user.click(saveButton);

      expect(mockSaveDesign).toHaveBeenCalledWith('1');
      expect(screen.getByText(/design saved successfully/i)).toBeInTheDocument();
    });

    it('should show error when saving design fails', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: false, error: 'Save failed' });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: 'Save failed',
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText('Modern Store').closest('article')!;
      await user.click(within(modernStoreCard).getByRole('radio'));

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await user.click(saveButton);

      expect(screen.getByText(/failed to save design/i)).toBeInTheDocument();
    });

    it('should show loading state while saving design', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isSaving: true,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText('Modern Store').closest('article')!;
      await user.click(within(modernStoreCard).getByRole('radio'));

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await user.click(saveButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/saving design/i)).toBeInTheDocument();
    });

    it('should load existing design when clicking load button', async () => {
      const mockLoadDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const loadButton = screen.getByRole('button', { name: /load saved design/i });
      await user.click(loadButton);

      expect(mockLoadDesign).toHaveBeenCalled();
      expect(screen.getByText(/design loaded successfully/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for template cards', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      expect(templateCards).toHaveLength(2);

      templateCards.forEach(card => {
        expect(within(card).getByRole('img')).toHaveAccessibleName(/template preview/i);
        expect(within(card).getByRole('heading')).toBeInTheDocument();
        expect(within(card).getByRole('radio')).toHaveAccessibleName(/select template/i);
      });
    });

    it('should have proper keyboard navigation for template selection', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      // Focus the first template card
      const firstTemplate = screen.getByText('Modern Store').closest('article')!;
      firstTemplate.focus();

      // Press space to select
      await user.keyboard('{Space}');

      expect(within(firstTemplate).getByRole('radio')).toBeChecked();

      // Tab to the next template and select
      await user.keyboard('{Tab}');
      await user.keyboard('{Space}');

      const secondTemplate = screen.getByText('Minimalist Shop').closest('article')!;
      expect(within(secondTemplate).getByRole('radio')).toBeChecked();
    });

    it('should have proper focus management in preview modal', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();

      const closeButton = within(modal).getByRole('button', { name: /close/i });
      await user.tab();
      expect(closeButton).toHaveFocus();
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

    it('should disable save button when no template is selected', () => {
      render(<DesignArchitecture />);
      const saveButton = screen.getByRole('button', { name: /save design/i });
      expect(saveButton).toBeDisabled();
    });

    it('should show unauthorized message when user is not authenticated', () => {
      mockUseAuth.mockReturnValueOnce({
        isAuthenticated: false,
        user: null,
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/please log in to save designs/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save design/i })).toBeDisabled();
    });

    it('should show upgrade message when user plan doesn\'t support saving', () => {
      mockUseAuth.mockReturnValueOnce({
        isAuthenticated: true,
        user: {
          id: 'user123',
          email: 'test@example.com',
          plan: 'basic',
        },
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/upgrade your plan to save designs/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile view', () => {
      // Mock mobile viewport
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      render(<DesignArchitecture />);

      const grid = screen.getByRole('grid');
      expect(grid).toHaveStyle('grid-template-columns: 1fr');
    });

    it('should show mobile-friendly filters', async () => {
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/filter by category/i)).toBeInTheDocument();
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

const mockUseDesignTemplates = useDesignTemplates as jest.MockedFunction<typeof useDesignTemplates>;
const mockUseSaveDesign = useSaveDesign as jest.MockedFunction<typeof useSaveDesign>;
const mockUseLoadDesign = useLoadDesign as jest.MockedFunction<typeof useLoadDesign>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockTemplates: DesignTemplate[] = [
  {
    id: '1',
    name: 'Modern Store',
    thumbnail: 'modern-store-thumb.jpg',
    categories: ['electronics', 'fashion'],
    previewUrl: 'modern-store-preview.html',
    price: 49.99,
    rating: 4.5,
  },
  {
    id: '2',
    name: 'Minimalist Shop',
    thumbnail: 'minimalist-shop-thumb.jpg',
    categories: ['home', 'fashion'],
    previewUrl: 'minimalist-shop-preview.html',
    price: 39.99,
    rating: 4.2,
  },
];

const mockUser = {
  isAuthenticated: true,
  user: {
    id: 'user123',
    email: 'test@example.com',
    plan: 'premium',
  },
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(mockUser);
    mockUseToast.mockReturnValue({ showToast: jest.fn() });
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

    it('should render error message when failed to load templates', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: 'Failed to load templates',
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render template cards when templates are loaded successfully', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.getByText('Minimalist Shop')).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });
  });

  describe('Template Selection', () => {
    it('should allow user to select a template', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText('Modern Store').closest('article')!;
      await user.click(within(modernStoreCard).getByRole('radio'));

      expect(within(modernStoreCard).getByRole('radio')).toBeChecked();
      expect(screen.getByText(/selected: modern store/i)).toBeInTheDocument();
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

  describe('Filtering and Search', () => {
    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const electronicsCheckbox = screen.getByRole('checkbox', { name: /electronics/i });
      await user.click(electronicsCheckbox);

      expect(screen.getByText('Modern Store')).toBeInTheDocument();
      expect(screen.queryByText('Minimalist Shop')).not.toBeInTheDocument();
    });

    it('should search templates by name', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'minimalist');

      expect(screen.queryByText('Modern Store')).not.toBeInTheDocument();
      expect(screen.getByText('Minimalist Shop')).toBeInTheDocument();
    });

    it('should show no results message when no templates match filters', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  describe('Design Actions', () => {
    it('should save selected design when clicking save button', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText('Modern Store').closest('article')!;
      await user.click(within(modernStoreCard).getByRole('radio'));

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await user.click(saveButton);

      expect(mockSaveDesign).toHaveBeenCalledWith('1');
      expect(screen.getByText(/design saved successfully/i)).toBeInTheDocument();
    });

    it('should show error when saving design fails', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: false, error: 'Save failed' });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: 'Save failed',
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText('Modern Store').closest('article')!;
      await user.click(within(modernStoreCard).getByRole('radio'));

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await user.click(saveButton);

      expect(screen.getByText(/failed to save design/i)).toBeInTheDocument();
    });

    it('should show loading state while saving design', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isSaving: true,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const modernStoreCard = screen.getByText('Modern Store').closest('article')!;
      await user.click(within(modernStoreCard).getByRole('radio'));

      const saveButton = screen.getByRole('button', { name: /save design/i });
      await user.click(saveButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/saving design/i)).toBeInTheDocument();
    });

    it('should load existing design when clicking load button', async () => {
      const mockLoadDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoadDesign,
        isLoading: false,
        error: null,
      });

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const loadButton = screen.getByRole('button', { name: /load saved design/i });
      await user.click(loadButton);

      expect(mockLoadDesign).toHaveBeenCalled();
      expect(screen.getByText(/design loaded successfully/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for template cards', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      expect(templateCards).toHaveLength(2);

      templateCards.forEach(card => {
        expect(within(card).getByRole('img')).toHaveAccessibleName(/template preview/i);
        expect(within(card).getByRole('heading')).toBeInTheDocument();
        expect(within(card).getByRole('radio')).toHaveAccessibleName(/select template/i);
      });
    });

    it('should have proper keyboard navigation for template selection', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      // Focus the first template card
      const firstTemplate = screen.getByText('Modern Store').closest('article')!;
      firstTemplate.focus();

      // Press space to select
      await user.keyboard('{Space}');

      expect(within(firstTemplate).getByRole('radio')).toBeChecked();

      // Tab to the next template and select
      await user.keyboard('{Tab}');
      await user.keyboard('{Space}');

      const secondTemplate = screen.getByText('Minimalist Shop').closest('article')!;
      expect(within(secondTemplate).getByRole('radio')).toBeChecked();
    });

    it('should have proper focus management in preview modal', async () => {
      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();

      const closeButton = within(modal).getByRole('button', { name: /close/i });
      await user.tab();
      expect(closeButton).toHaveFocus();
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

    it('should disable save button when no template is selected', () => {
      render(<DesignArchitecture />);
      const saveButton = screen.getByRole('button', { name: /save design/i });
      expect(saveButton).toBeDisabled();
    });

    it('should show unauthorized message when user is not authenticated', () => {
      mockUseAuth.mockReturnValueOnce({
        isAuthenticated: false,
        user: null,
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/please log in to save designs/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save design/i })).toBeDisabled();
    });

    it('should show upgrade message when user plan doesn\'t support saving', () => {
      mockUseAuth.mockReturnValueOnce({
        isAuthenticated: true,
        user: {
          id: 'user123',
          email: 'test@example.com',
          plan: 'basic',
        },
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/upgrade your plan to save designs/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile view', () => {
      // Mock mobile viewport
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      render(<DesignArchitecture />);

      const grid = screen.getByRole('grid');
      expect(grid).toHaveStyle('grid-template-columns: 1fr');
    });

    it('should show mobile-friendly filters', async () => {
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));

      render(<DesignArchitecture />);
      const user = userEvent.setup();

      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/filter by category/i)).toBeInTheDocument();
    });
  });
});