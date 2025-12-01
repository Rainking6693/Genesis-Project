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
    price: 199.99,
    description: 'Noise cancelling wireless headphones',
    stock: 10,
    rating: 4.5,
    image: 'headphones.jpg',
    category: 'electronics',
  },
  {
    id: '2',
    name: 'Smart Watch',
    price: 249.99,
    description: 'Fitness tracking smart watch',
    stock: 5,
    rating: 4.2,
    image: 'watch.jpg',
    category: 'electronics',
  },
  {
    id: '3',
    name: 'Out of Stock Item',
    price: 99.99,
    description: 'Popular item currently unavailable',
    stock: 0,
    rating: 4.7,
    image: 'soldout.jpg',
    category: 'accessories',
  },
];

const renderComponent = () => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CartProvider>
          <ProductListing />
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

  describe('Initial Load', () => {
    it('should display loading skeleton while fetching products', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockProducts }), 1000))
      );

      renderComponent();

      expect(screen.getByTestId('product-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Premium Headphones')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });
    });

    it('should display error message when product fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to load products. Please try again later.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should display empty state when no products are available', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No products found')).toBeInTheDocument();
        expect(screen.getByText('Check back later for new arrivals!')).toBeInTheDocument();
      });
    });
  });

  describe('Product Display', () => {
    it('should render all products with correct information', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
        expect(screen.getByText('Out of Stock Item')).toBeInTheDocument();

        expect(screen.getByText('$199.99')).toBeInTheDocument();
        expect(screen.getByText('$249.99')).toBeInTheDocument();
        expect(screen.getByText('$99.99')).toBeInTheDocument();

        expect(screen.getByText('Noise cancelling wireless headphones')).toBeInTheDocument();
        expect(screen.getByText('Fitness tracking smart watch')).toBeInTheDocument();
      });
    });

    it('should display stock availability correctly', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('In Stock (10)')).toBeInTheDocument();
        expect(screen.getByText('In Stock (5)')).toBeInTheDocument();
        expect(screen.getByText('Out of Stock')).toBeInTheDocument();
      });
    });

    it('should display rating stars correctly', async () => {
      renderComponent();

      await waitFor(() => {
        const headphonesRating = screen.getByTestId('rating-1');
        expect(within(headphonesRating).getAllByTestId('star-filled')).toHaveLength(4);
        expect(within(headphonesRating).getAllByTestId('star-half')).toHaveLength(1);

        const watchRating = screen.getByTestId('rating-2');
        expect(within(watchRating).getAllByTestId('star-filled')).toHaveLength(4);
        expect(within(watchRating).getAllByTestId('star-empty')).toHaveLength(1);
      });
    });

    it('should have proper aria labels for accessibility', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText('Premium Headphones product image')).toBeInTheDocument();
        expect(screen.getByLabelText('4.5 out of 5 stars')).toBeInTheDocument();
        expect(screen.getByLabelText('Add Premium Headphones to cart')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow adding in-stock products to cart', async () => {
      renderComponent();

      await waitFor(() => {
        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        fireEvent.click(addToCartButtons[0]);
      });

      expect(screen.getByText('Item added to cart!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view cart/i })).toBeInTheDocument();
    });

    it('should disable add to cart button for out of stock items', async () => {
      renderComponent();

      await waitFor(() => {
        const outOfStockButtons = screen.getAllByRole('button', { name: /add to cart/i });
        expect(outOfStockButtons[2]).toBeDisabled();
        expect(outOfStockButtons[2]).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('should show quantity selector when increasing quantity', async () => {
      renderComponent();

      await waitFor(async () => {
        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        const incrementButton = within(addToCartButtons[0].parentElement!).getByRole('button', { name: /increase quantity/i });

        await userEvent.click(incrementButton);
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });
    });

    it('should not allow quantity to exceed available stock', async () => {
      renderComponent();

      await waitFor(async () => {
        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        const incrementButton = within(addToCartButtons[1].parentElement!).getByRole('button', { name: /increase quantity/i });

        // Stock is 5, try to increment to 6
        for (let i = 0; i < 6; i++) {
          await userEvent.click(incrementButton);
        }

        expect(screen.getByDisplayValue('5')).toBeInTheDocument();
        expect(screen.getByText('Maximum stock reached')).toBeInTheDocument();
      });
    });

    it('should show product details modal when clicking on product', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.click(screen.getByText('Premium Headphones'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Noise cancelling wireless headphones')).toBeInTheDocument();
      });
    });

    it('should close modal when clicking close button', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.click(screen.getByText('Premium Headphones'));
        await userEvent.click(screen.getByRole('button', { name: /close/i }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter products by category', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.selectOptions(screen.getByLabelText('Category'), 'electronics');
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
        expect(screen.queryByText('Out of Stock Item')).not.toBeInTheDocument();
      });
    });

    it('should sort products by price low to high', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'price-asc');
        const productNames = screen.getAllByTestId('product-name');
        expect(productNames[0]).toHaveTextContent('Out of Stock Item');
        expect(productNames[1]).toHaveTextContent('Premium Headphones');
        expect(productNames[2]).toHaveTextContent('Smart Watch');
      });
    });

    it('should sort products by rating highest to lowest', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'rating-desc');
        const productNames = screen.getAllByTestId('product-name');
        expect(productNames[0]).toHaveTextContent('Out of Stock Item');
        expect(productNames[1]).toHaveTextContent('Premium Headphones');
        expect(productNames[2]).toHaveTextContent('Smart Watch');
      });
    });

    it('should show no results when filter excludes all products', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.selectOptions(screen.getByLabelText('Category'), 'books');
        expect(screen.getByText('No products match your filters')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter products based on search input', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.type(screen.getByPlaceholderText('Search products...'), 'watch');
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
        expect(screen.queryByText('Premium Headphones')).not.toBeInTheDocument();
      });
    });

    it('should show no results when search returns no matches', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.type(screen.getByPlaceholderText('Search products...'), 'nonexistent product');
        expect(screen.getByText('No products match your search')).toBeInTheDocument();
      });
    });

    it('should clear search when clicking clear button', async () => {
      renderComponent();

      await waitFor(async () => {
        const searchInput = screen.getByPlaceholderText('Search products...');
        await userEvent.type(searchInput, 'watch');
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /clear search/i }));
        expect(searchInput).toHaveValue('');
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
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
        rating: 4,
        image: 'product.jpg',
        category: 'electronics',
      })),
      total: 15,
      page: 1,
      limit: 10,
    };

    it('should display pagination controls when there are multiple pages', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockPaginatedProducts);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });
    });

    it('should load next page when clicking next button', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce(mockPaginatedProducts)
        .mockResolvedValueOnce({
          ...mockPaginatedProducts,
          data: mockPaginatedProducts.data.slice(10),
          page: 2,
        });

      renderComponent();

      await waitFor(async () => {
        await userEvent.click(screen.getByRole('button', { name: /next page/i }));
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('page=2'));
        expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      });
    });

    it('should disable previous button on first page', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockPaginatedProducts);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-live regions for dynamic content', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    it('should have proper keyboard navigation for modal', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.click(screen.getByText('Premium Headphones'));
        expect(document.body).toHaveStyle('overflow: hidden');

        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(document.body).not.toHaveStyle('overflow: hidden');
      });
    });

    it('should have proper focus management', async () => {
      renderComponent();

      await waitFor(async () => {
        const searchInput = screen.getByPlaceholderText('Search products...');
        searchInput.focus();
        await userEvent.tab();
        expect(screen.getByRole('button', { name: /search/i })).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text', async () => {
      renderComponent();

      await waitFor(() => {
        const productNames = screen.getAllByTestId('product-name');
        productNames.forEach(name => {
          expect(name).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
        });
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component errors gracefully', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = ProductListing;

      // Simulate a component that throws an error
      jest.doMock('./ProductListing', () => {
        const ErrorComponent = () => {
          throw new Error('Test error');
        };
        return ErrorComponent;
      });

      const { rerender } = renderComponent();

      // Reset the mock and re-render the original component
      jest.doMock('./ProductListing', () => OriginalComponent);
      rerender(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <OriginalComponent />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      jest.restoreAllMocks();
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
    price: 199.99,
    description: 'Noise cancelling wireless headphones',
    stock: 10,
    rating: 4.5,
    image: 'headphones.jpg',
    category: 'electronics',
  },
  {
    id: '2',
    name: 'Smart Watch',
    price: 249.99,
    description: 'Fitness tracking smart watch',
    stock: 5,
    rating: 4.2,
    image: 'watch.jpg',
    category: 'electronics',
  },
  {
    id: '3',
    name: 'Out of Stock Item',
    price: 99.99,
    description: 'Popular item currently unavailable',
    stock: 0,
    rating: 4.7,
    image: 'soldout.jpg',
    category: 'accessories',
  },
];

const renderComponent = () => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CartProvider>
          <ProductListing />
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

  describe('Initial Load', () => {
    it('should display loading skeleton while fetching products', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockProducts }), 1000))
      );

      renderComponent();

      expect(screen.getByTestId('product-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Premium Headphones')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });
    });

    it('should display error message when product fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to load products. Please try again later.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should display empty state when no products are available', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No products found')).toBeInTheDocument();
        expect(screen.getByText('Check back later for new arrivals!')).toBeInTheDocument();
      });
    });
  });

  describe('Product Display', () => {
    it('should render all products with correct information', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
        expect(screen.getByText('Out of Stock Item')).toBeInTheDocument();

        expect(screen.getByText('$199.99')).toBeInTheDocument();
        expect(screen.getByText('$249.99')).toBeInTheDocument();
        expect(screen.getByText('$99.99')).toBeInTheDocument();

        expect(screen.getByText('Noise cancelling wireless headphones')).toBeInTheDocument();
        expect(screen.getByText('Fitness tracking smart watch')).toBeInTheDocument();
      });
    });

    it('should display stock availability correctly', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('In Stock (10)')).toBeInTheDocument();
        expect(screen.getByText('In Stock (5)')).toBeInTheDocument();
        expect(screen.getByText('Out of Stock')).toBeInTheDocument();
      });
    });

    it('should display rating stars correctly', async () => {
      renderComponent();

      await waitFor(() => {
        const headphonesRating = screen.getByTestId('rating-1');
        expect(within(headphonesRating).getAllByTestId('star-filled')).toHaveLength(4);
        expect(within(headphonesRating).getAllByTestId('star-half')).toHaveLength(1);

        const watchRating = screen.getByTestId('rating-2');
        expect(within(watchRating).getAllByTestId('star-filled')).toHaveLength(4);
        expect(within(watchRating).getAllByTestId('star-empty')).toHaveLength(1);
      });
    });

    it('should have proper aria labels for accessibility', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText('Premium Headphones product image')).toBeInTheDocument();
        expect(screen.getByLabelText('4.5 out of 5 stars')).toBeInTheDocument();
        expect(screen.getByLabelText('Add Premium Headphones to cart')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow adding in-stock products to cart', async () => {
      renderComponent();

      await waitFor(() => {
        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        fireEvent.click(addToCartButtons[0]);
      });

      expect(screen.getByText('Item added to cart!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view cart/i })).toBeInTheDocument();
    });

    it('should disable add to cart button for out of stock items', async () => {
      renderComponent();

      await waitFor(() => {
        const outOfStockButtons = screen.getAllByRole('button', { name: /add to cart/i });
        expect(outOfStockButtons[2]).toBeDisabled();
        expect(outOfStockButtons[2]).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('should show quantity selector when increasing quantity', async () => {
      renderComponent();

      await waitFor(async () => {
        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        const incrementButton = within(addToCartButtons[0].parentElement!).getByRole('button', { name: /increase quantity/i });

        await userEvent.click(incrementButton);
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });
    });

    it('should not allow quantity to exceed available stock', async () => {
      renderComponent();

      await waitFor(async () => {
        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        const incrementButton = within(addToCartButtons[1].parentElement!).getByRole('button', { name: /increase quantity/i });

        // Stock is 5, try to increment to 6
        for (let i = 0; i < 6; i++) {
          await userEvent.click(incrementButton);
        }

        expect(screen.getByDisplayValue('5')).toBeInTheDocument();
        expect(screen.getByText('Maximum stock reached')).toBeInTheDocument();
      });
    });

    it('should show product details modal when clicking on product', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.click(screen.getByText('Premium Headphones'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Noise cancelling wireless headphones')).toBeInTheDocument();
      });
    });

    it('should close modal when clicking close button', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.click(screen.getByText('Premium Headphones'));
        await userEvent.click(screen.getByRole('button', { name: /close/i }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter products by category', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.selectOptions(screen.getByLabelText('Category'), 'electronics');
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
        expect(screen.queryByText('Out of Stock Item')).not.toBeInTheDocument();
      });
    });

    it('should sort products by price low to high', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'price-asc');
        const productNames = screen.getAllByTestId('product-name');
        expect(productNames[0]).toHaveTextContent('Out of Stock Item');
        expect(productNames[1]).toHaveTextContent('Premium Headphones');
        expect(productNames[2]).toHaveTextContent('Smart Watch');
      });
    });

    it('should sort products by rating highest to lowest', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'rating-desc');
        const productNames = screen.getAllByTestId('product-name');
        expect(productNames[0]).toHaveTextContent('Out of Stock Item');
        expect(productNames[1]).toHaveTextContent('Premium Headphones');
        expect(productNames[2]).toHaveTextContent('Smart Watch');
      });
    });

    it('should show no results when filter excludes all products', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.selectOptions(screen.getByLabelText('Category'), 'books');
        expect(screen.getByText('No products match your filters')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter products based on search input', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.type(screen.getByPlaceholderText('Search products...'), 'watch');
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
        expect(screen.queryByText('Premium Headphones')).not.toBeInTheDocument();
      });
    });

    it('should show no results when search returns no matches', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.type(screen.getByPlaceholderText('Search products...'), 'nonexistent product');
        expect(screen.getByText('No products match your search')).toBeInTheDocument();
      });
    });

    it('should clear search when clicking clear button', async () => {
      renderComponent();

      await waitFor(async () => {
        const searchInput = screen.getByPlaceholderText('Search products...');
        await userEvent.type(searchInput, 'watch');
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /clear search/i }));
        expect(searchInput).toHaveValue('');
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
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
        rating: 4,
        image: 'product.jpg',
        category: 'electronics',
      })),
      total: 15,
      page: 1,
      limit: 10,
    };

    it('should display pagination controls when there are multiple pages', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockPaginatedProducts);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });
    });

    it('should load next page when clicking next button', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce(mockPaginatedProducts)
        .mockResolvedValueOnce({
          ...mockPaginatedProducts,
          data: mockPaginatedProducts.data.slice(10),
          page: 2,
        });

      renderComponent();

      await waitFor(async () => {
        await userEvent.click(screen.getByRole('button', { name: /next page/i }));
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('page=2'));
        expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      });
    });

    it('should disable previous button on first page', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockPaginatedProducts);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-live regions for dynamic content', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    it('should have proper keyboard navigation for modal', async () => {
      renderComponent();

      await waitFor(async () => {
        await userEvent.click(screen.getByText('Premium Headphones'));
        expect(document.body).toHaveStyle('overflow: hidden');

        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(document.body).not.toHaveStyle('overflow: hidden');
      });
    });

    it('should have proper focus management', async () => {
      renderComponent();

      await waitFor(async () => {
        const searchInput = screen.getByPlaceholderText('Search products...');
        searchInput.focus();
        await userEvent.tab();
        expect(screen.getByRole('button', { name: /search/i })).toHaveFocus();
      });
    });

    it('should have proper contrast ratios for text', async () => {
      renderComponent();

      await waitFor(() => {
        const productNames = screen.getAllByTestId('product-name');
        productNames.forEach(name => {
          expect(name).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
        });
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component errors gracefully', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const OriginalComponent = ProductListing;

      // Simulate a component that throws an error
      jest.doMock('./ProductListing', () => {
        const ErrorComponent = () => {
          throw new Error('Test error');
        };
        return ErrorComponent;
      });

      const { rerender } = renderComponent();

      // Reset the mock and re-render the original component
      jest.doMock('./ProductListing', () => OriginalComponent);
      rerender(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <OriginalComponent />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      jest.restoreAllMocks();
    });
  });
});