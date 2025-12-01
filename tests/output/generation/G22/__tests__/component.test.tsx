import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from '../../context/CartContext';
import { AuthProvider } from '../../context/AuthContext';
import ProductListing from './ProductListing';
import '@testing-library/jest-dom';

jest.mock('axios');
jest.mock('../../utils/analytics', () => ({
  trackProductView: jest.fn(),
  trackAddToCart: jest.fn(),
  trackPurchase: jest.fn(),
}));

const mockProducts = [
  {
    id: '1',
    name: 'Premium Headphones',
    price: 299.99,
    description: 'Noise cancelling wireless headphones',
    stock: 10,
    rating: 4.5,
    image: 'headphones.jpg',
    category: 'electronics',
  },
  {
    id: '2',
    name: 'Smart Watch',
    price: 199.99,
    description: 'Fitness tracking smart watch',
    stock: 5,
    rating: 4.2,
    image: 'smartwatch.jpg',
    category: 'electronics',
  },
  {
    id: '3',
    name: 'Out of Stock Item',
    price: 49.99,
    description: 'Popular item currently unavailable',
    stock: 0,
    rating: 4.0,
    image: 'outofstock.jpg',
    category: 'accessories',
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CartProvider>
          {ui}
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('ProductListing Component', () => {
  beforeEach(() => {
    (axios.get as jest.Mock).mockResolvedValue({ data: mockProducts });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching products', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockProducts }), 1000))
      );

      renderWithProviders(<ProductListing />);

      expect(screen.getByTestId('product-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Premium Headphones')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('product-skeleton')).not.toBeInTheDocument();
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });
    });

    it('should display error message when product fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load products/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should display empty state when no products are available', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText(/no products found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Product Display and Filtering', () => {
    it('should render all available products with correct information', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('$299.99')).toBeInTheDocument();
        expect(screen.getByText('Noise cancelling wireless headphones')).toBeInTheDocument();
        expect(screen.getByText('In Stock')).toBeInTheDocument();

        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
        expect(screen.getByText('$199.99')).toBeInTheDocument();

        expect(screen.getByText('Out of Stock Item')).toBeInTheDocument();
        expect(screen.getByText('Out of Stock')).toBeInTheDocument();
      });
    });

    it('should filter products by category when category filter is applied', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
      });

      const categorySelect = screen.getByLabelText(/filter by category/i);
      userEvent.selectOptions(categorySelect, 'electronics');

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
        expect(screen.queryByText('Out of Stock Item')).not.toBeInTheDocument();
      });
    });

    it('should sort products by price (low to high)', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const productNames = screen.getAllByTestId('product-name');
        expect(productNames[0]).toHaveTextContent('Premium Headphones');
        expect(productNames[1]).toHaveTextContent('Smart Watch');
      });

      const sortSelect = screen.getByLabelText(/sort by/i);
      userEvent.selectOptions(sortSelect, 'price-asc');

      await waitFor(() => {
        const productNames = screen.getAllByTestId('product-name');
        expect(productNames[0]).toHaveTextContent('Smart Watch');
        expect(productNames[1]).toHaveTextContent('Premium Headphones');
      });
    });

    it('should search products by name', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search products/i);
      userEvent.type(searchInput, 'headphones');

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.queryByText('Smart Watch')).not.toBeInTheDocument();
      });
    });
  });

  describe('Product Interactions', () => {
    it('should open product quick view modal when quick view button is clicked', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const quickViewButtons = screen.getAllByLabelText(/quick view/i);
        fireEvent.click(quickViewButtons[0]);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      expect(screen.getByText('Noise cancelling wireless headphones')).toBeInTheDocument();
    });

    it('should add product to cart when add to cart button is clicked', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        fireEvent.click(addToCartButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText(/item added to cart/i)).toBeInTheDocument();
      });
    });

    it('should not allow adding out of stock items to cart', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const outOfStockProduct = screen.getByText('Out of Stock Item').closest('.product-card');
        const addToCartButton = within(outOfStockProduct!).getByRole('button', { name: /add to cart/i });

        expect(addToCartButton).toBeDisabled();
        expect(addToCartButton).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('should show quantity selector when product is already in cart', async () => {
      // Mock cart context with existing item
      const mockCartContext = {
        items: [{ id: '1', name: 'Premium Headphones', price: 299.99, quantity: 2 }],
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
        isInCart: jest.fn().mockReturnValue(true),
        getItemQuantity: jest.fn().mockReturnValue(2),
      };

      jest.mock('../../context/CartContext', () => ({
        ...jest.requireActual('../../context/CartContext'),
        useCart: () => mockCartContext,
      }));

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const quantityInput = screen.getByLabelText(/quantity for premium headphones/i);
        expect(quantityInput).toBeInTheDocument();
        expect(quantityInput).toHaveValue(2);
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper aria labels for all interactive elements', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        expect(addToCartButtons[0]).toHaveAttribute('aria-label', 'Add Premium Headphones to cart');

        const quickViewButtons = screen.getAllByLabelText(/quick view/i);
        expect(quickViewButtons[0]).toHaveAttribute('aria-label', 'Quick view Premium Headphones');

        const productImages = screen.getAllByRole('img');
        expect(productImages[0]).toHaveAttribute('alt', 'Premium Headphones');
      });
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const firstProduct = screen.getByText('Premium Headphones').closest('.product-card');
        const addToCartButton = within(firstProduct!).getByRole('button', { name: /add to cart/i });

        // Simulate tab navigation
        addToCartButton.focus();
        expect(addToCartButton).toHaveFocus();

        // Simulate space key press
        fireEvent.keyDown(addToCartButton, { key: ' ', code: 'Space' });
        expect(screen.getByText(/item added to cart/i)).toBeInTheDocument();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const productName = screen.getByText('Premium Headphones');
        expect(productName).toHaveStyle('color: rgba(0, 0, 0, 0.87)');

        const productPrice = screen.getByText('$299.99');
        expect(productPrice).toHaveStyle('color: rgba(0, 0, 0, 0.6)');
      });
    });
  });

  describe('Pagination', () => {
    const mockPaginatedProducts = {
      data: Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Product ${i + 1}`,
        price: 99.99,
        description: `Description for product ${i + 1}`,
        stock: 10,
        rating: 4.0,
        image: `product${i + 1}.jpg`,
        category: 'electronics',
      })),
      total: 15,
      page: 1,
      limit: 10,
    };

    it('should display pagination controls when there are multiple pages', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockPaginatedProducts);

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByLabelText(/pagination navigation/i)).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      });
    });

    it('should load next page when next button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce(mockPaginatedProducts)
        .mockResolvedValueOnce({
          ...mockPaginatedProducts,
          data: mockPaginatedProducts.data.slice(10),
          page: 2,
        });

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.queryByText('Product 11')).not.toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next page/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
          params: { page: 2, limit: 10 }
        }));
        expect(screen.getByText('Product 11')).toBeInTheDocument();
        expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
      });
    });

    it('should disable previous button on first page', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockPaginatedProducts);

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous page/i });
        expect(prevButton).toBeDisabled();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adjust layout for mobile viewports', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const productCards = screen.getAllByTestId('product-card');
        expect(productCards[0]).toHaveStyle('width: 100%');

        const filterControls = screen.getByTestId('filter-controls');
        expect(filterControls).toHaveStyle('flex-direction: column');
      });

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from '../../context/CartContext';
import { AuthProvider } from '../../context/AuthContext';
import ProductListing from './ProductListing';
import '@testing-library/jest-dom';

jest.mock('axios');
jest.mock('../../utils/analytics', () => ({
  trackProductView: jest.fn(),
  trackAddToCart: jest.fn(),
  trackPurchase: jest.fn(),
}));

const mockProducts = [
  {
    id: '1',
    name: 'Premium Headphones',
    price: 299.99,
    description: 'Noise cancelling wireless headphones',
    stock: 10,
    rating: 4.5,
    image: 'headphones.jpg',
    category: 'electronics',
  },
  {
    id: '2',
    name: 'Smart Watch',
    price: 199.99,
    description: 'Fitness tracking smart watch',
    stock: 5,
    rating: 4.2,
    image: 'smartwatch.jpg',
    category: 'electronics',
  },
  {
    id: '3',
    name: 'Out of Stock Item',
    price: 49.99,
    description: 'Popular item currently unavailable',
    stock: 0,
    rating: 4.0,
    image: 'outofstock.jpg',
    category: 'accessories',
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CartProvider>
          {ui}
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('ProductListing Component', () => {
  beforeEach(() => {
    (axios.get as jest.Mock).mockResolvedValue({ data: mockProducts });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching products', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockProducts }), 1000))
      );

      renderWithProviders(<ProductListing />);

      expect(screen.getByTestId('product-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Premium Headphones')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('product-skeleton')).not.toBeInTheDocument();
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });
    });

    it('should display error message when product fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load products/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should display empty state when no products are available', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText(/no products found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Product Display and Filtering', () => {
    it('should render all available products with correct information', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('$299.99')).toBeInTheDocument();
        expect(screen.getByText('Noise cancelling wireless headphones')).toBeInTheDocument();
        expect(screen.getByText('In Stock')).toBeInTheDocument();

        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
        expect(screen.getByText('$199.99')).toBeInTheDocument();

        expect(screen.getByText('Out of Stock Item')).toBeInTheDocument();
        expect(screen.getByText('Out of Stock')).toBeInTheDocument();
      });
    });

    it('should filter products by category when category filter is applied', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
      });

      const categorySelect = screen.getByLabelText(/filter by category/i);
      userEvent.selectOptions(categorySelect, 'electronics');

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
        expect(screen.queryByText('Out of Stock Item')).not.toBeInTheDocument();
      });
    });

    it('should sort products by price (low to high)', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const productNames = screen.getAllByTestId('product-name');
        expect(productNames[0]).toHaveTextContent('Premium Headphones');
        expect(productNames[1]).toHaveTextContent('Smart Watch');
      });

      const sortSelect = screen.getByLabelText(/sort by/i);
      userEvent.selectOptions(sortSelect, 'price-asc');

      await waitFor(() => {
        const productNames = screen.getAllByTestId('product-name');
        expect(productNames[0]).toHaveTextContent('Smart Watch');
        expect(productNames[1]).toHaveTextContent('Premium Headphones');
      });
    });

    it('should search products by name', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search products/i);
      userEvent.type(searchInput, 'headphones');

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.queryByText('Smart Watch')).not.toBeInTheDocument();
      });
    });
  });

  describe('Product Interactions', () => {
    it('should open product quick view modal when quick view button is clicked', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const quickViewButtons = screen.getAllByLabelText(/quick view/i);
        fireEvent.click(quickViewButtons[0]);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      expect(screen.getByText('Noise cancelling wireless headphones')).toBeInTheDocument();
    });

    it('should add product to cart when add to cart button is clicked', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        fireEvent.click(addToCartButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText(/item added to cart/i)).toBeInTheDocument();
      });
    });

    it('should not allow adding out of stock items to cart', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const outOfStockProduct = screen.getByText('Out of Stock Item').closest('.product-card');
        const addToCartButton = within(outOfStockProduct!).getByRole('button', { name: /add to cart/i });

        expect(addToCartButton).toBeDisabled();
        expect(addToCartButton).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('should show quantity selector when product is already in cart', async () => {
      // Mock cart context with existing item
      const mockCartContext = {
        items: [{ id: '1', name: 'Premium Headphones', price: 299.99, quantity: 2 }],
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
        isInCart: jest.fn().mockReturnValue(true),
        getItemQuantity: jest.fn().mockReturnValue(2),
      };

      jest.mock('../../context/CartContext', () => ({
        ...jest.requireActual('../../context/CartContext'),
        useCart: () => mockCartContext,
      }));

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const quantityInput = screen.getByLabelText(/quantity for premium headphones/i);
        expect(quantityInput).toBeInTheDocument();
        expect(quantityInput).toHaveValue(2);
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper aria labels for all interactive elements', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        expect(addToCartButtons[0]).toHaveAttribute('aria-label', 'Add Premium Headphones to cart');

        const quickViewButtons = screen.getAllByLabelText(/quick view/i);
        expect(quickViewButtons[0]).toHaveAttribute('aria-label', 'Quick view Premium Headphones');

        const productImages = screen.getAllByRole('img');
        expect(productImages[0]).toHaveAttribute('alt', 'Premium Headphones');
      });
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const firstProduct = screen.getByText('Premium Headphones').closest('.product-card');
        const addToCartButton = within(firstProduct!).getByRole('button', { name: /add to cart/i });

        // Simulate tab navigation
        addToCartButton.focus();
        expect(addToCartButton).toHaveFocus();

        // Simulate space key press
        fireEvent.keyDown(addToCartButton, { key: ' ', code: 'Space' });
        expect(screen.getByText(/item added to cart/i)).toBeInTheDocument();
      });
    });

    it('should have proper contrast ratios for text elements', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const productName = screen.getByText('Premium Headphones');
        expect(productName).toHaveStyle('color: rgba(0, 0, 0, 0.87)');

        const productPrice = screen.getByText('$299.99');
        expect(productPrice).toHaveStyle('color: rgba(0, 0, 0, 0.6)');
      });
    });
  });

  describe('Pagination', () => {
    const mockPaginatedProducts = {
      data: Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Product ${i + 1}`,
        price: 99.99,
        description: `Description for product ${i + 1}`,
        stock: 10,
        rating: 4.0,
        image: `product${i + 1}.jpg`,
        category: 'electronics',
      })),
      total: 15,
      page: 1,
      limit: 10,
    };

    it('should display pagination controls when there are multiple pages', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockPaginatedProducts);

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByLabelText(/pagination navigation/i)).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      });
    });

    it('should load next page when next button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce(mockPaginatedProducts)
        .mockResolvedValueOnce({
          ...mockPaginatedProducts,
          data: mockPaginatedProducts.data.slice(10),
          page: 2,
        });

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.queryByText('Product 11')).not.toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next page/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
          params: { page: 2, limit: 10 }
        }));
        expect(screen.getByText('Product 11')).toBeInTheDocument();
        expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
      });
    });

    it('should disable previous button on first page', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockPaginatedProducts);

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous page/i });
        expect(prevButton).toBeDisabled();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adjust layout for mobile viewports', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const productCards = screen.getAllByTestId('product-card');
        expect(productCards[0]).toHaveStyle('width: 100%');

        const filterControls = screen.getByTestId('filter-controls');
        expect(filterControls).toHaveStyle('flex-direction: column');
      });

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });
  });
});