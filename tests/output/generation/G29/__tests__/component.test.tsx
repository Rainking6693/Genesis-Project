import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
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
    image: 'smartwatch.jpg',
    category: 'electronics',
  },
  {
    id: '3',
    name: 'Out of Stock Item',
    price: 99.99,
    description: 'Popular item currently unavailable',
    stock: 0,
    rating: 4.0,
    image: 'outofstock.jpg',
    category: 'accessories',
  },
];

const renderWithProviders = (ui: React.ReactElement, { route = '/', path = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <CartProvider>
          <Route path={path}>{ui}</Route>
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

  describe('Initial Load and Rendering', () => {
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

    it('should render all products after successful fetch', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
        expect(screen.getByText('Out of Stock Item')).toBeInTheDocument();
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

    it('should allow retrying after fetch failure', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ data: mockProducts });

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load products/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });
    });
  });

  describe('Product Card Interactions', () => {
    beforeEach(async () => {
      renderWithProviders(<ProductListing />);
      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });
    });

    it('should display product details in a modal when clicking "Quick View"', async () => {
      const quickViewButtons = screen.getAllByRole('button', { name: /quick view/i });
      fireEvent.click(quickViewButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Noise cancelling wireless headphones')).toBeInTheDocument();
        expect(screen.getByText('$199.99')).toBeInTheDocument();
      });
    });

    it('should close the modal when clicking the close button', async () => {
      const quickViewButtons = screen.getAllByRole('button', { name: /quick view/i });
      fireEvent.click(quickViewButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should add product to cart when clicking "Add to Cart"', async () => {
      const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
      fireEvent.click(addToCartButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/added to cart/i)).toBeInTheDocument();
      });
    });

    it('should show out of stock message for products with zero stock', () => {
      const outOfStockProduct = screen.getByText('Out of Stock Item').closest('.product-card');
      expect(within(outOfStockProduct!).getByText(/out of stock/i)).toBeInTheDocument();
      expect(within(outOfStockProduct!).queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
    });

    it('should disable add to cart button when product stock is low (≤ 3)', () => {
      const smartWatchCard = screen.getByText('Smart Watch').closest('.product-card');
      const addToCartButton = within(smartWatchCard!).getByRole('button', { name: /add to cart/i });

      expect(addToCartButton).toBeDisabled();
      expect(within(smartWatchCard!).getByText(/low stock/i)).toBeInTheDocument();
    });
  });

  describe('Filtering and Sorting', () => {
    beforeEach(async () => {
      renderWithProviders(<ProductListing />);
      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });
    });

    it('should filter products by category', async () => {
      const categoryFilter = screen.getByRole('combobox', { name: /category/i });
      await userEvent.selectOptions(categoryFilter, 'electronics');

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
        expect(screen.queryByText('Out of Stock Item')).not.toBeInTheDocument();
      });
    });

    it('should sort products by price (low to high)', async () => {
      const sortSelect = screen.getByRole('combobox', { name: /sort by/i });
      await userEvent.selectOptions(sortSelect, 'price-asc');

      const productPrices = screen.getAllByText(/\$\d+\.\d{2}/);
      const prices = productPrices.map(el => parseFloat(el.textContent!.replace('$', '')));

      expect(prices).toEqual([99.99, 199.99, 249.99]);
    });

    it('should sort products by rating (high to low)', async () => {
      const sortSelect = screen.getByRole('combobox', { name: /sort by/i });
      await userEvent.selectOptions(sortSelect, 'rating-desc');

      const productCards = screen.getAllByTestId('product-card');
      const ratings = productCards.map(card =>
        parseFloat(within(card).getByText(/\d\.\d/).textContent!)
      );

      expect(ratings).toEqual([4.5, 4.2, 4.0]);
    });

    it('should show "No products found" message when filters return no results', async () => {
      const categoryFilter = screen.getByRole('combobox', { name: /category/i });
      const priceFilter = screen.getByLabelText(/max price/i);

      await userEvent.selectOptions(categoryFilter, 'electronics');
      await userEvent.clear(priceFilter);
      await userEvent.type(priceFilter, '100');

      await waitFor(() => {
        expect(screen.getByText(/no products found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    const mockPaginatedProducts = {
      data: mockProducts,
      total: 12,
      page: 1,
      limit: 3,
      totalPages: 4,
    };

    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockPaginatedProducts });
    });

    it('should display pagination controls when there are multiple pages', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /page 1/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });

    it('should fetch new products when changing pages', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });

      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          ...mockPaginatedProducts,
          data: [
            {
              id: '4',
              name: 'Page 2 Product',
              price: 49.99,
              description: 'Product from page 2',
              stock: 8,
              rating: 3.8,
              image: 'page2.jpg',
              category: 'accessories',
            },
          ],
          page: 2,
        },
      });

      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText('Page 2 Product')).toBeInTheDocument();
        expect(screen.queryByText('Premium Headphones')).not.toBeInTheDocument();
      });
    });

    it('should disable previous button on first page', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      });
    });

    it('should disable next button on last page', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          ...mockPaginatedProducts,
          page: 4,
          totalPages: 4,
        },
      });

      renderWithProviders(<ProductListing />, { route: '/products?page=4' });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for product cards', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const productCards = screen.getAllByTestId('product-card');
        productCards.forEach(card => {
          expect(card).toHaveAttribute('role', 'article');
          expect(within(card).getByRole('heading')).toBeInTheDocument();
          expect(within(card).getByRole('img')).toHaveAccessibleName();
        });
      });
    });

    it('should have proper labels for form controls', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/min price/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/max price/i)).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const quickViewButtons = screen.getAllByRole('button', { name: /quick view/i });
        quickViewButtons.forEach(button => {
          expect(button).toHaveAttribute('tabindex', '0');
        });

        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        addToCartButtons.forEach(button => {
          expect(button).toHaveAttribute('tabindex', '0');
        });
      });
    });

    it('should announce loading states to screen readers', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockProducts }), 1000))
      );

      renderWithProviders(<ProductListing />);

      expect(screen.getByRole('status')).toHaveTextContent(/loading/i);

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const productGrid = screen.getByTestId('product-grid');
        expect(productGrid).toHaveClass('grid-cols-1');
      });

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });

    it('should show mobile filter button on small screens', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
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
import { MemoryRouter, Route } from 'react-router-dom';
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
    image: 'smartwatch.jpg',
    category: 'electronics',
  },
  {
    id: '3',
    name: 'Out of Stock Item',
    price: 99.99,
    description: 'Popular item currently unavailable',
    stock: 0,
    rating: 4.0,
    image: 'outofstock.jpg',
    category: 'accessories',
  },
];

const renderWithProviders = (ui: React.ReactElement, { route = '/', path = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <CartProvider>
          <Route path={path}>{ui}</Route>
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

  describe('Initial Load and Rendering', () => {
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

    it('should render all products after successful fetch', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
        expect(screen.getByText('Out of Stock Item')).toBeInTheDocument();
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

    it('should allow retrying after fetch failure', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ data: mockProducts });

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load products/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });
    });
  });

  describe('Product Card Interactions', () => {
    beforeEach(async () => {
      renderWithProviders(<ProductListing />);
      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });
    });

    it('should display product details in a modal when clicking "Quick View"', async () => {
      const quickViewButtons = screen.getAllByRole('button', { name: /quick view/i });
      fireEvent.click(quickViewButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Noise cancelling wireless headphones')).toBeInTheDocument();
        expect(screen.getByText('$199.99')).toBeInTheDocument();
      });
    });

    it('should close the modal when clicking the close button', async () => {
      const quickViewButtons = screen.getAllByRole('button', { name: /quick view/i });
      fireEvent.click(quickViewButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should add product to cart when clicking "Add to Cart"', async () => {
      const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
      fireEvent.click(addToCartButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/added to cart/i)).toBeInTheDocument();
      });
    });

    it('should show out of stock message for products with zero stock', () => {
      const outOfStockProduct = screen.getByText('Out of Stock Item').closest('.product-card');
      expect(within(outOfStockProduct!).getByText(/out of stock/i)).toBeInTheDocument();
      expect(within(outOfStockProduct!).queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
    });

    it('should disable add to cart button when product stock is low (≤ 3)', () => {
      const smartWatchCard = screen.getByText('Smart Watch').closest('.product-card');
      const addToCartButton = within(smartWatchCard!).getByRole('button', { name: /add to cart/i });

      expect(addToCartButton).toBeDisabled();
      expect(within(smartWatchCard!).getByText(/low stock/i)).toBeInTheDocument();
    });
  });

  describe('Filtering and Sorting', () => {
    beforeEach(async () => {
      renderWithProviders(<ProductListing />);
      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });
    });

    it('should filter products by category', async () => {
      const categoryFilter = screen.getByRole('combobox', { name: /category/i });
      await userEvent.selectOptions(categoryFilter, 'electronics');

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
        expect(screen.queryByText('Out of Stock Item')).not.toBeInTheDocument();
      });
    });

    it('should sort products by price (low to high)', async () => {
      const sortSelect = screen.getByRole('combobox', { name: /sort by/i });
      await userEvent.selectOptions(sortSelect, 'price-asc');

      const productPrices = screen.getAllByText(/\$\d+\.\d{2}/);
      const prices = productPrices.map(el => parseFloat(el.textContent!.replace('$', '')));

      expect(prices).toEqual([99.99, 199.99, 249.99]);
    });

    it('should sort products by rating (high to low)', async () => {
      const sortSelect = screen.getByRole('combobox', { name: /sort by/i });
      await userEvent.selectOptions(sortSelect, 'rating-desc');

      const productCards = screen.getAllByTestId('product-card');
      const ratings = productCards.map(card =>
        parseFloat(within(card).getByText(/\d\.\d/).textContent!)
      );

      expect(ratings).toEqual([4.5, 4.2, 4.0]);
    });

    it('should show "No products found" message when filters return no results', async () => {
      const categoryFilter = screen.getByRole('combobox', { name: /category/i });
      const priceFilter = screen.getByLabelText(/max price/i);

      await userEvent.selectOptions(categoryFilter, 'electronics');
      await userEvent.clear(priceFilter);
      await userEvent.type(priceFilter, '100');

      await waitFor(() => {
        expect(screen.getByText(/no products found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    const mockPaginatedProducts = {
      data: mockProducts,
      total: 12,
      page: 1,
      limit: 3,
      totalPages: 4,
    };

    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockPaginatedProducts });
    });

    it('should display pagination controls when there are multiple pages', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /page 1/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });

    it('should fetch new products when changing pages', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });

      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          ...mockPaginatedProducts,
          data: [
            {
              id: '4',
              name: 'Page 2 Product',
              price: 49.99,
              description: 'Product from page 2',
              stock: 8,
              rating: 3.8,
              image: 'page2.jpg',
              category: 'accessories',
            },
          ],
          page: 2,
        },
      });

      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText('Page 2 Product')).toBeInTheDocument();
        expect(screen.queryByText('Premium Headphones')).not.toBeInTheDocument();
      });
    });

    it('should disable previous button on first page', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      });
    });

    it('should disable next button on last page', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          ...mockPaginatedProducts,
          page: 4,
          totalPages: 4,
        },
      });

      renderWithProviders(<ProductListing />, { route: '/products?page=4' });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for product cards', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const productCards = screen.getAllByTestId('product-card');
        productCards.forEach(card => {
          expect(card).toHaveAttribute('role', 'article');
          expect(within(card).getByRole('heading')).toBeInTheDocument();
          expect(within(card).getByRole('img')).toHaveAccessibleName();
        });
      });
    });

    it('should have proper labels for form controls', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/min price/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/max price/i)).toBeInTheDocument();
      });
    });

    it('should be navigable via keyboard', async () => {
      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const quickViewButtons = screen.getAllByRole('button', { name: /quick view/i });
        quickViewButtons.forEach(button => {
          expect(button).toHaveAttribute('tabindex', '0');
        });

        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        addToCartButtons.forEach(button => {
          expect(button).toHaveAttribute('tabindex', '0');
        });
      });
    });

    it('should announce loading states to screen readers', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockProducts }), 1000))
      );

      renderWithProviders(<ProductListing />);

      expect(screen.getByRole('status')).toHaveTextContent(/loading/i);

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        const productGrid = screen.getByTestId('product-grid');
        expect(productGrid).toHaveClass('grid-cols-1');
      });

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });

    it('should show mobile filter button on small screens', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<ProductListing />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
      });

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });
  });
});