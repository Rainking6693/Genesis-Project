import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useDesign } from '../../hooks/useDesign';

// Mock external dependencies
jest.mock('axios');
jest.mock('../../context/AuthContext');
jest.mock('../../context/CartContext');
jest.mock('../../hooks/useDesign');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockUseDesign = useDesign as jest.MockedFunction<typeof useDesign>;
const mockNavigate = jest.fn();

describe('DesignArchitecture Component', () => {
  const mockDesignData = {
    id: '123',
    name: 'Modern Living Room',
    description: 'A sleek modern design for your living space',
    price: 99.99,
    categories: ['living-room', 'modern'],
    images: ['image1.jpg', 'image2.jpg'],
    rating: 4.5,
    reviewsCount: 120,
    isPremium: true,
    customizationOptions: [
      { id: 'color', label: 'Color Scheme', options: ['light', 'dark', 'neutral'] },
      { id: 'layout', label: 'Layout Style', options: ['open', 'compact', 'spacious'] },
    ],
  };

  const mockUser = {
    id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    isPremium: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      loading: false,
    });

    mockUseCart.mockReturnValue({
      cartItems: [],
      addToCart: jest.fn(),
      removeFromCart: jest.fn(),
      clearCart: jest.fn(),
      isInCart: jest.fn().mockReturnValue(false),
    });

    mockUseDesign.mockReturnValue({
      designs: [mockDesignData],
      loading: false,
      error: null,
      fetchDesigns: jest.fn(),
      fetchDesignById: jest.fn().mockResolvedValue(mockDesignData),
      createDesign: jest.fn(),
      updateDesign: jest.fn(),
      deleteDesign: jest.fn(),
    });

    require('react-router-dom').useNavigate.mockImplementation(() => mockNavigate);
  });

  const renderComponent = (route = '/design/123') => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <Route path="/design/:id">
          <DesignArchitecture />
        </Route>
      </MemoryRouter>
    );
  };

  describe('Rendering and Initial State', () => {
    it('should render loading state when data is being fetched', () => {
      mockUseDesign.mockReturnValueOnce({
        ...mockUseDesign(),
        loading: true,
        fetchDesignById: jest.fn().mockImplementation(() => new Promise(() => {})),
      });

      renderComponent();

      expect(screen.getByTestId('design-loading')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render error message when fetch fails', async () => {
      const errorMessage = 'Failed to fetch design';
      mockUseDesign.mockReturnValueOnce({
        ...mockUseDesign(),
        error: errorMessage,
        loading: false,
        fetchDesignById: jest.fn().mockRejectedValue(new Error(errorMessage)),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/error loading design/i)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should render design details when data is loaded', async () => {
      renderComponent();

      expect(await screen.findByText(mockDesignData.name)).toBeInTheDocument();
      expect(screen.getByText(mockDesignData.description)).toBeInTheDocument();
      expect(screen.getByText(`$${mockDesignData.price.toFixed(2)}`)).toBeInTheDocument();
      expect(screen.getByText(`Rating: ${mockDesignData.rating}`)).toBeInTheDocument();
      expect(screen.getByText(`(${mockDesignData.reviewsCount} reviews)`)).toBeInTheDocument();
    });

    it('should display premium badge for premium designs', async () => {
      renderComponent();

      const premiumBadge = await screen.findByText(/premium/i);
      expect(premiumBadge).toBeInTheDocument();
      expect(premiumBadge).toHaveClass('premium-badge');
    });

    it('should render all images in the gallery', async () => {
      renderComponent();

      const images = await screen.findAllByRole('img');
      expect(images).toHaveLength(mockDesignData.images.length);

      mockDesignData.images.forEach((img, index) => {
        expect(images[index]).toHaveAttribute('src', img);
      });
    });

    it('should render customization options', async () => {
      renderComponent();

      for (const option of mockDesignData.customizationOptions) {
        expect(await screen.findByLabelText(option.label)).toBeInTheDocument();

        for (const opt of option.options) {
          expect(screen.getByText(opt)).toBeInTheDocument();
        }
      }
    });
  });

  describe('User Interactions', () => {
    it('should allow selecting customization options', async () => {
      renderComponent();

      const colorSelect = screen.getByLabelText(/color scheme/i);
      await userEvent.selectOptions(colorSelect, 'dark');

      expect(colorSelect).toHaveValue('dark');

      const layoutSelect = screen.getByLabelText(/layout style/i);
      await userEvent.selectOptions(layoutSelect, 'spacious');

      expect(layoutSelect).toHaveValue('spacious');
    });

    it('should update preview when customization options change', async () => {
      renderComponent();

      const colorSelect = screen.getByLabelText(/color scheme/i);
      const previewImage = screen.getByTestId('design-preview');

      await userEvent.selectOptions(colorSelect, 'dark');

      expect(previewImage).toHaveStyle('background-color: #333');
    });

    it('should add design to cart when "Add to Cart" is clicked', async () => {
      const mockAddToCart = jest.fn();
      mockUseCart.mockReturnValueOnce({
        ...mockUseCart(),
        addToCart: mockAddToCart,
      });

      renderComponent();

      const addToCartButton = await screen.findByRole('button', { name: /add to cart/i });
      await userEvent.click(addToCartButton);

      expect(mockAddToCart).toHaveBeenCalledWith({
        ...mockDesignData,
        quantity: 1,
        selectedOptions: {
          color: expect.any(String),
          layout: expect.any(String),
        },
      });
    });

    it('should navigate to checkout when "Buy Now" is clicked', async () => {
      renderComponent();

      const buyNowButton = await screen.findByRole('button', { name: /buy now/i });
      await userEvent.click(buyNowButton);

      expect(mockNavigate).toHaveBeenCalledWith('/checkout', {
        state: {
          design: mockDesignData,
          quantity: 1,
          selectedOptions: expect.any(Object),
        },
      });
    });

    it('should show login prompt when unauthenticated user tries to add to cart', async () => {
      mockUseAuth.mockReturnValueOnce({
        ...mockUseAuth(),
        isAuthenticated: false,
      });

      renderComponent();

      const addToCartButton = await screen.findByRole('button', { name: /add to cart/i });
      await userEvent.click(addToCartButton);

      expect(screen.getByText(/please log in to add items to your cart/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('should toggle favorite status when heart icon is clicked', async () => {
      const mockUpdateDesign = jest.fn();
      mockUseDesign.mockReturnValueOnce({
        ...mockUseDesign(),
        updateDesign: mockUpdateDesign,
      });

      renderComponent();

      const favoriteButton = await screen.findByLabelText(/add to favorites/i);
      await userEvent.click(favoriteButton);

      expect(mockUpdateDesign).toHaveBeenCalledWith(mockDesignData.id, {
        isFavorite: true,
      });

      await userEvent.click(favoriteButton);
      expect(mockUpdateDesign).toHaveBeenCalledWith(mockDesignData.id, {
        isFavorite: false,
      });
    });

    it('should open image gallery modal when image is clicked', async () => {
      renderComponent();

      const images = await screen.findAllByRole('img');
      await userEvent.click(images[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/image gallery/i)).toBeInTheDocument();
    });

    it('should close image gallery modal when close button is clicked', async () => {
      renderComponent();

      const images = await screen.findAllByRole('img');
      await userEvent.click(images[0]);

      const closeButton = screen.getByLabelText(/close gallery/i);
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should navigate to reviews section when "See Reviews" is clicked', async () => {
      renderComponent();

      const seeReviewsButton = await screen.findByRole('button', { name: /see reviews/i });
      await userEvent.click(seeReviewsButton);

      expect(screen.getByTestId('reviews-section')).toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith('#reviews');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderComponent();

      expect(await screen.findByLabelText(/add to cart/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add to favorites/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/design preview/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/color scheme/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/layout style/i)).toBeInTheDocument();
    });

    it('should have proper heading structure', async () => {
      renderComponent();

      expect(await screen.findByRole('heading', { name: mockDesignData.name, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /customization options/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /customer reviews/i, level: 2 })).toBeInTheDocument();
    });

    it('should have proper contrast ratios for text', async () => {
      renderComponent();

      const heading = await screen.findByRole('heading', { name: mockDesignData.name });
      const description = screen.getByText(mockDesignData.description);
      const price = screen.getByText(`$${mockDesignData.price.toFixed(2)}`);

      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      expect(description).toHaveStyle('color: rgba(0, 0, 0, 0.6)');
      expect(price).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      const addToCartButton = await screen.findByRole('button', { name: /add to cart/i });
      const buyNowButton = screen.getByRole('button', { name: /buy now/i });
      const favoriteButton = screen.getByLabelText(/add to favorites/i);

      // Tab through interactive elements
      await userEvent.tab();
      expect(addToCartButton).toHaveFocus();

      await userEvent.tab();
      expect(buyNowButton).toHaveFocus();

      await userEvent.tab();
      expect(favoriteButton).toHaveFocus();

      // Activate buttons with Enter key
      await userEvent.type(favoriteButton, '{enter}');
      expect(mockUseDesign().updateDesign).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing design data gracefully', async () => {
      mockUseDesign.mockReturnValueOnce({
        ...mockUseDesign(),
        fetchDesignById: jest.fn().mockResolvedValue(null),
      });

      renderComponent();

      expect(await screen.findByText(/design not found/i)).toBeInTheDocument();
    });

    it('should disable add to cart for out of stock items', async () => {
      const outOfStockDesign = {
        ...mockDesignData,
        stock: 0,
      };

      mockUseDesign.mockReturnValueOnce({
        ...mockUseDesign(),
        fetchDesignById: jest.fn().mockResolvedValue(outOfStockDesign),
      });

      renderComponent();

      const addToCartButton = await screen.findByRole('button', { name: /add to cart/i });
      expect(addToCartButton).toBeDisabled();
      expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
    });

    it('should show limited customization options for non-premium users', async () => {
      mockUseAuth.mockReturnValueOnce({
        ...mockUseAuth(),
        user: { ...mockUser, isPremium: false },
      });

      renderComponent();

      const premiumOptions = await screen.findAllByText(/premium option/i);
      premiumOptions.forEach(option => {
        expect(option).toHaveAttribute('disabled');
      });

      expect(screen.getByText(/upgrade to premium for more customization options/i)).toBeInTheDocument();
    });

    it('should handle API errors when adding to cart', async () => {
      const mockAddToCart = jest.fn().mockRejectedValue(new Error('Failed to add to cart'));
      mockUseCart.mockReturnValueOnce({
        ...mockUseCart(),
        addToCart: mockAddToCart,
      });

      renderComponent();

      const addToCartButton = await screen.findByRole('button', { name: /add to cart/i });
      await userEvent.click(addToCartButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to add to cart/i)).toBeInTheDocument();
      });
    });

    it('should prevent rapid multiple submissions', async () => {
      let resolvePromise;
      const mockAddToCart = jest.fn().mockImplementation(() => new Promise((resolve) => {
        resolvePromise = resolve;
      }));

      mockUseCart.mockReturnValueOnce({
        ...mockUseCart(),
        addToCart: mockAddToCart,
      });

      renderComponent();

      const addToCartButton = await screen.findByRole('button', { name: /add to cart/i });

      // First click
      await userEvent.click(addToCartButton);
      expect(addToCartButton).toBeDisabled();

      // Second click while first is processing
      await userEvent.click(addToCartButton);
      expect(mockAddToCart).toHaveBeenCalledTimes(1);

      // Resolve first promise
      resolvePromise();
      await waitFor(() => {
        expect(addToCartButton).not.toBeDisabled();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile viewports', async () => {
      // Mock mobile viewport
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderComponent();

      const container = await screen.findByTestId('design-container');
      expect(container).toHaveClass('mobile-layout');

      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveClass('mobile-image');
    });

    it('should show mobile-specific navigation', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderComponent();

      expect(await screen.findByLabelText(/mobile menu/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/back button/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useDesign } from '../../hooks/useDesign';

// Mock external dependencies
jest.mock('axios');
jest.mock('../../context/AuthContext');
jest.mock('../../context/CartContext');
jest.mock('../../hooks/useDesign');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockUseDesign = useDesign as jest.MockedFunction<typeof useDesign>;
const mockNavigate = jest.fn();

describe('DesignArchitecture Component', () => {
  const mockDesignData = {
    id: '123',
    name: 'Modern Living Room',
    description: 'A sleek modern design for your living space',
    price: 99.99,
    categories: ['living-room', 'modern'],
    images: ['image1.jpg', 'image2.jpg'],
    rating: 4.5,
    reviewsCount: 120,
    isPremium: true,
    customizationOptions: [
      { id: 'color', label: 'Color Scheme', options: ['light', 'dark', 'neutral'] },
      { id: 'layout', label: 'Layout Style', options: ['open', 'compact', 'spacious'] },
    ],
  };

  const mockUser = {
    id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    isPremium: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      loading: false,
    });

    mockUseCart.mockReturnValue({
      cartItems: [],
      addToCart: jest.fn(),
      removeFromCart: jest.fn(),
      clearCart: jest.fn(),
      isInCart: jest.fn().mockReturnValue(false),
    });

    mockUseDesign.mockReturnValue({
      designs: [mockDesignData],
      loading: false,
      error: null,
      fetchDesigns: jest.fn(),
      fetchDesignById: jest.fn().mockResolvedValue(mockDesignData),
      createDesign: jest.fn(),
      updateDesign: jest.fn(),
      deleteDesign: jest.fn(),
    });

    require('react-router-dom').useNavigate.mockImplementation(() => mockNavigate);
  });

  const renderComponent = (route = '/design/123') => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <Route path="/design/:id">
          <DesignArchitecture />
        </Route>
      </MemoryRouter>
    );
  };

  describe('Rendering and Initial State', () => {
    it('should render loading state when data is being fetched', () => {
      mockUseDesign.mockReturnValueOnce({
        ...mockUseDesign(),
        loading: true,
        fetchDesignById: jest.fn().mockImplementation(() => new Promise(() => {})),
      });

      renderComponent();

      expect(screen.getByTestId('design-loading')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render error message when fetch fails', async () => {
      const errorMessage = 'Failed to fetch design';
      mockUseDesign.mockReturnValueOnce({
        ...mockUseDesign(),
        error: errorMessage,
        loading: false,
        fetchDesignById: jest.fn().mockRejectedValue(new Error(errorMessage)),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/error loading design/i)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should render design details when data is loaded', async () => {
      renderComponent();

      expect(await screen.findByText(mockDesignData.name)).toBeInTheDocument();
      expect(screen.getByText(mockDesignData.description)).toBeInTheDocument();
      expect(screen.getByText(`$${mockDesignData.price.toFixed(2)}`)).toBeInTheDocument();
      expect(screen.getByText(`Rating: ${mockDesignData.rating}`)).toBeInTheDocument();
      expect(screen.getByText(`(${mockDesignData.reviewsCount} reviews)`)).toBeInTheDocument();
    });

    it('should display premium badge for premium designs', async () => {
      renderComponent();

      const premiumBadge = await screen.findByText(/premium/i);
      expect(premiumBadge).toBeInTheDocument();
      expect(premiumBadge).toHaveClass('premium-badge');
    });

    it('should render all images in the gallery', async () => {
      renderComponent();

      const images = await screen.findAllByRole('img');
      expect(images).toHaveLength(mockDesignData.images.length);

      mockDesignData.images.forEach((img, index) => {
        expect(images[index]).toHaveAttribute('src', img);
      });
    });

    it('should render customization options', async () => {
      renderComponent();

      for (const option of mockDesignData.customizationOptions) {
        expect(await screen.findByLabelText(option.label)).toBeInTheDocument();

        for (const opt of option.options) {
          expect(screen.getByText(opt)).toBeInTheDocument();
        }
      }
    });
  });

  describe('User Interactions', () => {
    it('should allow selecting customization options', async () => {
      renderComponent();

      const colorSelect = screen.getByLabelText(/color scheme/i);
      await userEvent.selectOptions(colorSelect, 'dark');

      expect(colorSelect).toHaveValue('dark');

      const layoutSelect = screen.getByLabelText(/layout style/i);
      await userEvent.selectOptions(layoutSelect, 'spacious');

      expect(layoutSelect).toHaveValue('spacious');
    });

    it('should update preview when customization options change', async () => {
      renderComponent();

      const colorSelect = screen.getByLabelText(/color scheme/i);
      const previewImage = screen.getByTestId('design-preview');

      await userEvent.selectOptions(colorSelect, 'dark');

      expect(previewImage).toHaveStyle('background-color: #333');
    });

    it('should add design to cart when "Add to Cart" is clicked', async () => {
      const mockAddToCart = jest.fn();
      mockUseCart.mockReturnValueOnce({
        ...mockUseCart(),
        addToCart: mockAddToCart,
      });

      renderComponent();

      const addToCartButton = await screen.findByRole('button', { name: /add to cart/i });
      await userEvent.click(addToCartButton);

      expect(mockAddToCart).toHaveBeenCalledWith({
        ...mockDesignData,
        quantity: 1,
        selectedOptions: {
          color: expect.any(String),
          layout: expect.any(String),
        },
      });
    });

    it('should navigate to checkout when "Buy Now" is clicked', async () => {
      renderComponent();

      const buyNowButton = await screen.findByRole('button', { name: /buy now/i });
      await userEvent.click(buyNowButton);

      expect(mockNavigate).toHaveBeenCalledWith('/checkout', {
        state: {
          design: mockDesignData,
          quantity: 1,
          selectedOptions: expect.any(Object),
        },
      });
    });

    it('should show login prompt when unauthenticated user tries to add to cart', async () => {
      mockUseAuth.mockReturnValueOnce({
        ...mockUseAuth(),
        isAuthenticated: false,
      });

      renderComponent();

      const addToCartButton = await screen.findByRole('button', { name: /add to cart/i });
      await userEvent.click(addToCartButton);

      expect(screen.getByText(/please log in to add items to your cart/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('should toggle favorite status when heart icon is clicked', async () => {
      const mockUpdateDesign = jest.fn();
      mockUseDesign.mockReturnValueOnce({
        ...mockUseDesign(),
        updateDesign: mockUpdateDesign,
      });

      renderComponent();

      const favoriteButton = await screen.findByLabelText(/add to favorites/i);
      await userEvent.click(favoriteButton);

      expect(mockUpdateDesign).toHaveBeenCalledWith(mockDesignData.id, {
        isFavorite: true,
      });

      await userEvent.click(favoriteButton);
      expect(mockUpdateDesign).toHaveBeenCalledWith(mockDesignData.id, {
        isFavorite: false,
      });
    });

    it('should open image gallery modal when image is clicked', async () => {
      renderComponent();

      const images = await screen.findAllByRole('img');
      await userEvent.click(images[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/image gallery/i)).toBeInTheDocument();
    });

    it('should close image gallery modal when close button is clicked', async () => {
      renderComponent();

      const images = await screen.findAllByRole('img');
      await userEvent.click(images[0]);

      const closeButton = screen.getByLabelText(/close gallery/i);
      await userEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should navigate to reviews section when "See Reviews" is clicked', async () => {
      renderComponent();

      const seeReviewsButton = await screen.findByRole('button', { name: /see reviews/i });
      await userEvent.click(seeReviewsButton);

      expect(screen.getByTestId('reviews-section')).toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith('#reviews');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for interactive elements', async () => {
      renderComponent();

      expect(await screen.findByLabelText(/add to cart/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add to favorites/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/design preview/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/color scheme/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/layout style/i)).toBeInTheDocument();
    });

    it('should have proper heading structure', async () => {
      renderComponent();

      expect(await screen.findByRole('heading', { name: mockDesignData.name, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /customization options/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /customer reviews/i, level: 2 })).toBeInTheDocument();
    });

    it('should have proper contrast ratios for text', async () => {
      renderComponent();

      const heading = await screen.findByRole('heading', { name: mockDesignData.name });
      const description = screen.getByText(mockDesignData.description);
      const price = screen.getByText(`$${mockDesignData.price.toFixed(2)}`);

      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
      expect(description).toHaveStyle('color: rgba(0, 0, 0, 0.6)');
      expect(price).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
    });

    it('should be navigable via keyboard', async () => {
      renderComponent();

      const addToCartButton = await screen.findByRole('button', { name: /add to cart/i });
      const buyNowButton = screen.getByRole('button', { name: /buy now/i });
      const favoriteButton = screen.getByLabelText(/add to favorites/i);

      // Tab through interactive elements
      await userEvent.tab();
      expect(addToCartButton).toHaveFocus();

      await userEvent.tab();
      expect(buyNowButton).toHaveFocus();

      await userEvent.tab();
      expect(favoriteButton).toHaveFocus();

      // Activate buttons with Enter key
      await userEvent.type(favoriteButton, '{enter}');
      expect(mockUseDesign().updateDesign).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing design data gracefully', async () => {
      mockUseDesign.mockReturnValueOnce({
        ...mockUseDesign(),
        fetchDesignById: jest.fn().mockResolvedValue(null),
      });

      renderComponent();

      expect(await screen.findByText(/design not found/i)).toBeInTheDocument();
    });

    it('should disable add to cart for out of stock items', async () => {
      const outOfStockDesign = {
        ...mockDesignData,
        stock: 0,
      };

      mockUseDesign.mockReturnValueOnce({
        ...mockUseDesign(),
        fetchDesignById: jest.fn().mockResolvedValue(outOfStockDesign),
      });

      renderComponent();

      const addToCartButton = await screen.findByRole('button', { name: /add to cart/i });
      expect(addToCartButton).toBeDisabled();
      expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
    });

    it('should show limited customization options for non-premium users', async () => {
      mockUseAuth.mockReturnValueOnce({
        ...mockUseAuth(),
        user: { ...mockUser, isPremium: false },
      });

      renderComponent();

      const premiumOptions = await screen.findAllByText(/premium option/i);
      premiumOptions.forEach(option => {
        expect(option).toHaveAttribute('disabled');
      });

      expect(screen.getByText(/upgrade to premium for more customization options/i)).toBeInTheDocument();
    });

    it('should handle API errors when adding to cart', async () => {
      const mockAddToCart = jest.fn().mockRejectedValue(new Error('Failed to add to cart'));
      mockUseCart.mockReturnValueOnce({
        ...mockUseCart(),
        addToCart: mockAddToCart,
      });

      renderComponent();

      const addToCartButton = await screen.findByRole('button', { name: /add to cart/i });
      await userEvent.click(addToCartButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to add to cart/i)).toBeInTheDocument();
      });
    });

    it('should prevent rapid multiple submissions', async () => {
      let resolvePromise;
      const mockAddToCart = jest.fn().mockImplementation(() => new Promise((resolve) => {
        resolvePromise = resolve;
      }));

      mockUseCart.mockReturnValueOnce({
        ...mockUseCart(),
        addToCart: mockAddToCart,
      });

      renderComponent();

      const addToCartButton = await screen.findByRole('button', { name: /add to cart/i });

      // First click
      await userEvent.click(addToCartButton);
      expect(addToCartButton).toBeDisabled();

      // Second click while first is processing
      await userEvent.click(addToCartButton);
      expect(mockAddToCart).toHaveBeenCalledTimes(1);

      // Resolve first promise
      resolvePromise();
      await waitFor(() => {
        expect(addToCartButton).not.toBeDisabled();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile viewports', async () => {
      // Mock mobile viewport
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderComponent();

      const container = await screen.findByTestId('design-container');
      expect(container).toHaveClass('mobile-layout');

      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveClass('mobile-image');
    });

    it('should show mobile-specific navigation', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderComponent();

      expect(await screen.findByLabelText(/mobile menu/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/back button/i)).toBeInTheDocument();
    });
  });
});