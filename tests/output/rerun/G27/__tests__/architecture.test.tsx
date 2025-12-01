import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignTemplates, useSaveDesign, useLoadDesign } from '../../hooks/designHooks';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { DesignTemplate } from '../../types/designTypes';

// Mock hooks and context
jest.mock('../../hooks/designHooks');
jest.mock('../../context/CartContext');
jest.mock('../../context/AuthContext');

const mockTemplates: DesignTemplate[] = [
  {
    id: '1',
    name: 'Modern Minimalist',
    thumbnail: 'modern-minimalist.jpg',
    categories: ['modern', 'minimal'],
    price: 49.99,
    rating: 4.5,
    isPremium: false
  },
  {
    id: '2',
    name: 'Vintage Elegance',
    thumbnail: 'vintage-elegance.jpg',
    categories: ['vintage', 'elegant'],
    price: 79.99,
    rating: 4.8,
    isPremium: true
  }
];

const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  isPremium: false
};

describe('DesignArchitecture Component', () => {
  const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
  const mockUseSaveDesign = useSaveDesign as jest.Mock;
  const mockUseLoadDesign = useLoadDesign as jest.Mock;
  const mockUseCart = useCart as jest.Mock;
  const mockUseAuth = useAuth as jest.Mock;

  beforeEach(() => {
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

    mockUseLoadDesign.mockReturnValue({
      loadDesign: jest.fn().mockResolvedValue(mockTemplates[0]),
      isLoading: false,
      error: null
    });

    mockUseCart.mockReturnValue({
      addToCart: jest.fn(),
      cartItems: [],
      isInCart: jest.fn().mockReturnValue(false)
    });

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true
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

    it('should render template list when templates are loaded successfully', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText(/modern minimalist/i)).toBeInTheDocument();
      expect(screen.getByText(/vintage elegance/i)).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });
  });

  describe('Template Selection', () => {
    it('should allow user to select a template', async () => {
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText(/modern minimalist/i);
      await userEvent.click(modernTemplate);

      expect(screen.getByText(/selected: modern minimalist/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /customize this design/i })).toBeEnabled();
    });

    it('should show template details when hovering over a template', async () => {
      render(<DesignArchitecture />);

      const templateCard = screen.getByText(/modern minimalist/i).closest('.design-template-card') as HTMLElement;
      fireEvent.mouseEnter(templateCard);

      await waitFor(() => {
        expect(screen.getByText(/\$49.99/i)).toBeInTheDocument();
        expect(screen.getByText(/rating: 4.5/i)).toBeInTheDocument();
      });
    });
  });

  describe('Design Customization', () => {
    it('should open customization modal when customize button is clicked', async () => {
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText(/modern minimalist/i);
      await userEvent.click(modernTemplate);

      const customizeButton = screen.getByRole('button', { name: /customize this design/i });
      await userEvent.click(customizeButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/customize your design/i)).toBeInTheDocument();
    });

    it('should allow color customization in the modal', async () => {
      render(<DesignArchitecture />);

      // Select template and open modal
      await userEvent.click(screen.getByText(/modern minimalist/i));
      await userEvent.click(screen.getByRole('button', { name: /customize this design/i }));

      const colorPicker = screen.getByLabelText(/primary color/i);
      await userEvent.clear(colorPicker);
      await userEvent.type(colorPicker, '#ff5733');

      expect(colorPicker).toHaveValue('#ff5733');
    });

    it('should show preview of customized design', async () => {
      render(<DesignArchitecture />);

      // Select template and open modal
      await userEvent.click(screen.getByText(/modern minimalist/i));
      await userEvent.click(screen.getByRole('button', { name: /customize this design/i }));

      // Change some options
      await userEvent.type(screen.getByLabelText(/primary color/i), '#ff5733');
      await userEvent.selectOptions(screen.getByLabelText(/layout style/i), 'grid');

      expect(screen.getByTestId('design-preview')).toHaveStyle('background-color: #ff5733');
    });
  });

  describe('Saving and Loading Designs', () => {
    it('should save customized design when save button is clicked', async () => {
      const mockSave = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSave,
        isSaving: false,
        error: null
      });

      render(<DesignArchitecture />);

      // Select template and open modal
      await userEvent.click(screen.getByText(/modern minimalist/i));
      await userEvent.click(screen.getByRole('button', { name: /customize this design/i }));

      // Make some changes
      await userEvent.type(screen.getByLabelText(/primary color/i), '#ff5733');

      // Save the design
      await userEvent.click(screen.getByRole('button', { name: /save design/i }));

      expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
        templateId: '1',
        customizations: expect.objectContaining({
          primaryColor: '#ff5733'
        })
      }));
    });

    it('should show loading state while saving', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))),
        isSaving: true,
        error: null
      });

      render(<DesignArchitecture />);

      // Select template and open modal
      await userEvent.click(screen.getByText(/modern minimalist/i));
      await userEvent.click(screen.getByRole('button', { name: /customize this design/i }));

      // Attempt to save
      await userEvent.click(screen.getByRole('button', { name: /save design/i }));

      expect(screen.getByText(/saving your design/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save design/i })).toBeDisabled();
    });

    it('should show error when save fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockRejectedValue(new Error('Save failed')),
        isSaving: false,
        error: new Error('Save failed')
      });

      render(<DesignArchitecture />);

      // Select template and open modal
      await userEvent.click(screen.getByText(/modern minimalist/i));
      await userEvent.click(screen.getByRole('button', { name: /customize this design/i }));

      // Attempt to save
      await userEvent.click(screen.getByRole('button', { name: /save design/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to save design/i)).toBeInTheDocument();
      });
    });

    it('should load saved design when load button is clicked', async () => {
      const mockLoad = jest.fn().mockResolvedValue({
        ...mockTemplates[0],
        customizations: { primaryColor: '#ff5733' }
      });
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoad,
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /load saved design/i }));

      await waitFor(() => {
        expect(mockLoad).toHaveBeenCalled();
        expect(screen.getByText(/modern minimalist/i)).toBeInTheDocument();
        expect(screen.getByTestId('design-preview')).toHaveStyle('background-color: #ff5733');
      });
    });
  });

  describe('Cart Integration', () => {
    it('should add selected template to cart', async () => {
      const mockAddToCart = jest.fn();
      mockUseCart.mockReturnValueOnce({
        addToCart: mockAddToCart,
        cartItems: [],
        isInCart: jest.fn().mockReturnValue(false)
      });

      render(<DesignArchitecture />);

      await userEvent.click(screen.getByText(/modern minimalist/i));
      await userEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      expect(mockAddToCart).toHaveBeenCalledWith({
        id: '1',
        name: 'Modern Minimalist',
        price: 49.99,
        type: 'design-template',
        quantity: 1
      });
    });

    it('should show "in cart" badge when item is already in cart', () => {
      mockUseCart.mockReturnValueOnce({
        addToCart: jest.fn(),
        cartItems: [],
        isInCart: jest.fn().mockReturnValue(true)
      });

      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText(/modern minimalist/i).closest('.design-template-card') as HTMLElement;
      expect(within(modernTemplate).getByText(/in cart/i)).toBeInTheDocument();
    });

    it('should show cart confirmation when item is added', async () => {
      render(<DesignArchitecture />);

      await userEvent.click(screen.getByText(/modern minimalist/i));
      await userEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      expect(screen.getByText(/added to cart/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view cart/i })).toBeInTheDocument();
    });
  });

  describe('Premium Features', () => {
    it('should show premium badge for premium templates', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText(/vintage elegance/i).closest('.design-template-card'))
        .toContainElement(screen.getByText(/premium/i));
    });

    it('should disable premium templates for non-premium users', async () => {
      render(<DesignArchitecture />);

      const premiumTemplate = screen.getByText(/vintage elegance/i).closest('.design-template-card') as HTMLElement;
      expect(within(premiumTemplate).getByText(/premium feature/i)).toBeInTheDocument();
      expect(within(premiumTemplate).getByRole('button', { name: /select/i })).toBeDisabled();
    });

    it('should enable premium templates for premium users', () => {
      mockUseAuth.mockReturnValueOnce({
        user: { ...mockUser, isPremium: true },
        isAuthenticated: true
      });

      render(<DesignArchitecture />);

      const premiumTemplate = screen.getByText(/vintage elegance/i).closest('.design-template-card') as HTMLElement;
      expect(within(premiumTemplate).getByRole('button', { name: /select/i })).toBeEnabled();
    });
  });

  describe('Filtering and Search', () => {
    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);

      await userEvent.selectOptions(screen.getByLabelText(/filter by category/i), 'modern');

      expect(screen.getByText(/modern minimalist/i)).toBeInTheDocument();
      expect(screen.queryByText(/vintage elegance/i)).not.toBeInTheDocument();
    });

    it('should search templates by name', async () => {
      render(<DesignArchitecture />);

      await userEvent.type(screen.getByPlaceholderText(/search templates/i), 'vintage');

      expect(screen.queryByText(/modern minimalist/i)).not.toBeInTheDocument();
      expect(screen.getByText(/vintage elegance/i)).toBeInTheDocument();
    });

    it('should show no results message when no templates match', async () => {
      render(<DesignArchitecture />);

      await userEvent.type(screen.getByPlaceholderText(/search templates/i), 'nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByLabelText(/search templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /customize this design/i })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      // Tab to first template
      await userEvent.tab();
      await userEvent.tab();

      // Select the template
      await userEvent.keyboard('{Enter}');

      expect(screen.getByText(/selected: modern minimalist/i)).toBeInTheDocument();
    });

    it('should have proper contrast for text elements', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      templateCards.forEach(card => {
        expect(card).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
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
    });

    it('should disable customize button when no template is selected', () => {
      render(<DesignArchitecture />);
      expect(screen.getByRole('button', { name: /customize this design/i })).toBeDisabled();
    });

    it('should show authentication prompt when not logged in', () => {
      mockUseAuth.mockReturnValueOnce({
        user: null,
        isAuthenticated: false
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/please log in to save designs/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save design/i })).toBeDisabled();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignTemplates, useSaveDesign, useLoadDesign } from '../../hooks/designHooks';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { DesignTemplate } from '../../types/designTypes';

// Mock hooks and context
jest.mock('../../hooks/designHooks');
jest.mock('../../context/CartContext');
jest.mock('../../context/AuthContext');

const mockTemplates: DesignTemplate[] = [
  {
    id: '1',
    name: 'Modern Minimalist',
    thumbnail: 'modern-minimalist.jpg',
    categories: ['modern', 'minimal'],
    price: 49.99,
    rating: 4.5,
    isPremium: false
  },
  {
    id: '2',
    name: 'Vintage Elegance',
    thumbnail: 'vintage-elegance.jpg',
    categories: ['vintage', 'elegant'],
    price: 79.99,
    rating: 4.8,
    isPremium: true
  }
];

const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  isPremium: false
};

describe('DesignArchitecture Component', () => {
  const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
  const mockUseSaveDesign = useSaveDesign as jest.Mock;
  const mockUseLoadDesign = useLoadDesign as jest.Mock;
  const mockUseCart = useCart as jest.Mock;
  const mockUseAuth = useAuth as jest.Mock;

  beforeEach(() => {
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

    mockUseLoadDesign.mockReturnValue({
      loadDesign: jest.fn().mockResolvedValue(mockTemplates[0]),
      isLoading: false,
      error: null
    });

    mockUseCart.mockReturnValue({
      addToCart: jest.fn(),
      cartItems: [],
      isInCart: jest.fn().mockReturnValue(false)
    });

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true
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

    it('should render template list when templates are loaded successfully', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText(/modern minimalist/i)).toBeInTheDocument();
      expect(screen.getByText(/vintage elegance/i)).toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /template preview/i })).toHaveLength(2);
    });
  });

  describe('Template Selection', () => {
    it('should allow user to select a template', async () => {
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText(/modern minimalist/i);
      await userEvent.click(modernTemplate);

      expect(screen.getByText(/selected: modern minimalist/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /customize this design/i })).toBeEnabled();
    });

    it('should show template details when hovering over a template', async () => {
      render(<DesignArchitecture />);

      const templateCard = screen.getByText(/modern minimalist/i).closest('.design-template-card') as HTMLElement;
      fireEvent.mouseEnter(templateCard);

      await waitFor(() => {
        expect(screen.getByText(/\$49.99/i)).toBeInTheDocument();
        expect(screen.getByText(/rating: 4.5/i)).toBeInTheDocument();
      });
    });
  });

  describe('Design Customization', () => {
    it('should open customization modal when customize button is clicked', async () => {
      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText(/modern minimalist/i);
      await userEvent.click(modernTemplate);

      const customizeButton = screen.getByRole('button', { name: /customize this design/i });
      await userEvent.click(customizeButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/customize your design/i)).toBeInTheDocument();
    });

    it('should allow color customization in the modal', async () => {
      render(<DesignArchitecture />);

      // Select template and open modal
      await userEvent.click(screen.getByText(/modern minimalist/i));
      await userEvent.click(screen.getByRole('button', { name: /customize this design/i }));

      const colorPicker = screen.getByLabelText(/primary color/i);
      await userEvent.clear(colorPicker);
      await userEvent.type(colorPicker, '#ff5733');

      expect(colorPicker).toHaveValue('#ff5733');
    });

    it('should show preview of customized design', async () => {
      render(<DesignArchitecture />);

      // Select template and open modal
      await userEvent.click(screen.getByText(/modern minimalist/i));
      await userEvent.click(screen.getByRole('button', { name: /customize this design/i }));

      // Change some options
      await userEvent.type(screen.getByLabelText(/primary color/i), '#ff5733');
      await userEvent.selectOptions(screen.getByLabelText(/layout style/i), 'grid');

      expect(screen.getByTestId('design-preview')).toHaveStyle('background-color: #ff5733');
    });
  });

  describe('Saving and Loading Designs', () => {
    it('should save customized design when save button is clicked', async () => {
      const mockSave = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSave,
        isSaving: false,
        error: null
      });

      render(<DesignArchitecture />);

      // Select template and open modal
      await userEvent.click(screen.getByText(/modern minimalist/i));
      await userEvent.click(screen.getByRole('button', { name: /customize this design/i }));

      // Make some changes
      await userEvent.type(screen.getByLabelText(/primary color/i), '#ff5733');

      // Save the design
      await userEvent.click(screen.getByRole('button', { name: /save design/i }));

      expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
        templateId: '1',
        customizations: expect.objectContaining({
          primaryColor: '#ff5733'
        })
      }));
    });

    it('should show loading state while saving', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))),
        isSaving: true,
        error: null
      });

      render(<DesignArchitecture />);

      // Select template and open modal
      await userEvent.click(screen.getByText(/modern minimalist/i));
      await userEvent.click(screen.getByRole('button', { name: /customize this design/i }));

      // Attempt to save
      await userEvent.click(screen.getByRole('button', { name: /save design/i }));

      expect(screen.getByText(/saving your design/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save design/i })).toBeDisabled();
    });

    it('should show error when save fails', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockRejectedValue(new Error('Save failed')),
        isSaving: false,
        error: new Error('Save failed')
      });

      render(<DesignArchitecture />);

      // Select template and open modal
      await userEvent.click(screen.getByText(/modern minimalist/i));
      await userEvent.click(screen.getByRole('button', { name: /customize this design/i }));

      // Attempt to save
      await userEvent.click(screen.getByRole('button', { name: /save design/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to save design/i)).toBeInTheDocument();
      });
    });

    it('should load saved design when load button is clicked', async () => {
      const mockLoad = jest.fn().mockResolvedValue({
        ...mockTemplates[0],
        customizations: { primaryColor: '#ff5733' }
      });
      mockUseLoadDesign.mockReturnValueOnce({
        loadDesign: mockLoad,
        isLoading: false,
        error: null
      });

      render(<DesignArchitecture />);

      await userEvent.click(screen.getByRole('button', { name: /load saved design/i }));

      await waitFor(() => {
        expect(mockLoad).toHaveBeenCalled();
        expect(screen.getByText(/modern minimalist/i)).toBeInTheDocument();
        expect(screen.getByTestId('design-preview')).toHaveStyle('background-color: #ff5733');
      });
    });
  });

  describe('Cart Integration', () => {
    it('should add selected template to cart', async () => {
      const mockAddToCart = jest.fn();
      mockUseCart.mockReturnValueOnce({
        addToCart: mockAddToCart,
        cartItems: [],
        isInCart: jest.fn().mockReturnValue(false)
      });

      render(<DesignArchitecture />);

      await userEvent.click(screen.getByText(/modern minimalist/i));
      await userEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      expect(mockAddToCart).toHaveBeenCalledWith({
        id: '1',
        name: 'Modern Minimalist',
        price: 49.99,
        type: 'design-template',
        quantity: 1
      });
    });

    it('should show "in cart" badge when item is already in cart', () => {
      mockUseCart.mockReturnValueOnce({
        addToCart: jest.fn(),
        cartItems: [],
        isInCart: jest.fn().mockReturnValue(true)
      });

      render(<DesignArchitecture />);

      const modernTemplate = screen.getByText(/modern minimalist/i).closest('.design-template-card') as HTMLElement;
      expect(within(modernTemplate).getByText(/in cart/i)).toBeInTheDocument();
    });

    it('should show cart confirmation when item is added', async () => {
      render(<DesignArchitecture />);

      await userEvent.click(screen.getByText(/modern minimalist/i));
      await userEvent.click(screen.getByRole('button', { name: /add to cart/i }));

      expect(screen.getByText(/added to cart/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view cart/i })).toBeInTheDocument();
    });
  });

  describe('Premium Features', () => {
    it('should show premium badge for premium templates', () => {
      render(<DesignArchitecture />);
      expect(screen.getByText(/vintage elegance/i).closest('.design-template-card'))
        .toContainElement(screen.getByText(/premium/i));
    });

    it('should disable premium templates for non-premium users', async () => {
      render(<DesignArchitecture />);

      const premiumTemplate = screen.getByText(/vintage elegance/i).closest('.design-template-card') as HTMLElement;
      expect(within(premiumTemplate).getByText(/premium feature/i)).toBeInTheDocument();
      expect(within(premiumTemplate).getByRole('button', { name: /select/i })).toBeDisabled();
    });

    it('should enable premium templates for premium users', () => {
      mockUseAuth.mockReturnValueOnce({
        user: { ...mockUser, isPremium: true },
        isAuthenticated: true
      });

      render(<DesignArchitecture />);

      const premiumTemplate = screen.getByText(/vintage elegance/i).closest('.design-template-card') as HTMLElement;
      expect(within(premiumTemplate).getByRole('button', { name: /select/i })).toBeEnabled();
    });
  });

  describe('Filtering and Search', () => {
    it('should filter templates by category', async () => {
      render(<DesignArchitecture />);

      await userEvent.selectOptions(screen.getByLabelText(/filter by category/i), 'modern');

      expect(screen.getByText(/modern minimalist/i)).toBeInTheDocument();
      expect(screen.queryByText(/vintage elegance/i)).not.toBeInTheDocument();
    });

    it('should search templates by name', async () => {
      render(<DesignArchitecture />);

      await userEvent.type(screen.getByPlaceholderText(/search templates/i), 'vintage');

      expect(screen.queryByText(/modern minimalist/i)).not.toBeInTheDocument();
      expect(screen.getByText(/vintage elegance/i)).toBeInTheDocument();
    });

    it('should show no results message when no templates match', async () => {
      render(<DesignArchitecture />);

      await userEvent.type(screen.getByPlaceholderText(/search templates/i), 'nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', () => {
      render(<DesignArchitecture />);

      expect(screen.getByLabelText(/search templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /customize this design/i })).toBeInTheDocument();
    });

    it('should be navigable via keyboard', async () => {
      render(<DesignArchitecture />);

      // Tab to first template
      await userEvent.tab();
      await userEvent.tab();

      // Select the template
      await userEvent.keyboard('{Enter}');

      expect(screen.getByText(/selected: modern minimalist/i)).toBeInTheDocument();
    });

    it('should have proper contrast for text elements', () => {
      render(<DesignArchitecture />);

      const templateCards = screen.getAllByRole('article');
      templateCards.forEach(card => {
        expect(card).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
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
    });

    it('should disable customize button when no template is selected', () => {
      render(<DesignArchitecture />);
      expect(screen.getByRole('button', { name: /customize this design/i })).toBeDisabled();
    });

    it('should show authentication prompt when not logged in', () => {
      mockUseAuth.mockReturnValueOnce({
        user: null,
        isAuthenticated: false
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/please log in to save designs/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save design/i })).toBeDisabled();
    });
  });
});