import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from '../context/CartContext';
import { AuthProvider } from '../context/AuthContext';
import ProductListing from '../components/ProductListing';
import ProductDetail from '../components/ProductDetail';
import Cart from '../components/Cart';
import Checkout from '../components/Checkout';
import { act } from 'react-dom/test-utils';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockProducts = [
  {
    id: '1',
    name: 'Premium Headphones',
    price: 299.99,
    description: 'Noise cancelling wireless headphones',
    stock: 10,
    category: 'electronics',
    image: 'headphones.jpg',
    rating: 4.5
  },
  {
    id: '2',
    name: 'Smart Watch',
    price: 199.99,
    description: 'Fitness tracking smart watch',
    stock: 5,
    category: 'electronics',
    image: 'watch.jpg',
    rating: 4.2
  }
];

const mockUser = {
  id: 'user123',
  name: 'Test User',
  email: 'test@example.com',
  address: '123 Test St'
};

describe('Ecommerce Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Product Listing Component', () => {
    it('should display loading state while fetching products', async () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));
      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading products/i)).toBeInTheDocument();
    });

    it('should display products after successful fetch', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
      });
    });

    it('should display error message when product fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load products/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should filter products by category', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });

      const categoryFilter = screen.getByLabelText(/filter by category/i);
      userEvent.selectOptions(categoryFilter, 'electronics');

      expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      expect(screen.getByText('Smart Watch')).toBeInTheDocument();
    });

    it('should sort products by price', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/sort by/i);
      userEvent.selectOptions(sortSelect, 'price-desc');

      const productCards = screen.getAllByRole('article');
      expect(within(productCards[0]).getByText('Premium Headphones')).toBeInTheDocument();
      expect(within(productCards[1]).getByText('Smart Watch')).toBeInTheDocument();
    });

    it('should be accessible with proper ARIA attributes', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /products/i })).toBeInTheDocument();
        expect(screen.getAllByRole('article').length).toBe(2);
        expect(screen.getByLabelText(/filter by category/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
      });
    });
  });

  describe('Product Detail Component', () => {
    it('should display loading state while fetching product details', () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));
      render(
        <MemoryRouter initialEntries={['/products/1']}>
          <ProductDetail />
        </MemoryRouter>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display product details after successful fetch', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts[0] });

      render(
        <MemoryRouter initialEntries={['/products/1']}>
          <CartProvider>
            <ProductDetail />
          </CartProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('$299.99')).toBeInTheDocument();
        expect(screen.getByText(/noise cancelling wireless headphones/i)).toBeInTheDocument();
        expect(screen.getByText(/in stock/i)).toBeInTheDocument();
      });
    });

    it('should display error when product not found', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Product not found'));

      render(
        <MemoryRouter initialEntries={['/products/999']}>
          <ProductDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/product not found/i)).toBeInTheDocument();
      });
    });

    it('should allow adding product to cart', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts[0] });

      render(
        <MemoryRouter initialEntries={['/products/1']}>
          <CartProvider>
            <ProductDetail />
          </CartProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      userEvent.click(addToCartButton);

      await waitFor(() => {
        expect(screen.getByText(/added to cart/i)).toBeInTheDocument();
      });
    });

    it('should disable add to cart when product is out of stock', async () => {
      const outOfStockProduct = { ...mockProducts[0], stock: 0 };
      mockedAxios.get.mockResolvedValue({ data: outOfStockProduct });

      render(
        <MemoryRouter initialEntries={['/products/1']}>
          <CartProvider>
            <ProductDetail />
          </CartProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
      });
    });

    it('should be accessible with proper ARIA attributes', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts[0] });

      render(
        <MemoryRouter initialEntries={['/products/1']}>
          <CartProvider>
            <ProductDetail />
          </CartProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Premium Headphones' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: /premium headphones/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
      });
    });
  });

  describe('Cart Component', () => {
    it('should display empty cart message when no items are present', () => {
      render(
        <MemoryRouter>
          <CartProvider>
            <Cart />
          </CartProvider>
        </MemoryRouter>
      );

      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    });

    it('should display cart items and total', async () => {
      render(
        <MemoryRouter>
          <CartProvider>
            <Cart />
          </CartProvider>
        </MemoryRouter>
      );

      // Simulate adding items to cart
      const { addToCart } = require('../context/CartContext');
      act(() => {
        addToCart(mockProducts[0], 1);
        addToCart(mockProducts[1], 2);
      });

      expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      expect(screen.getByText('Smart Watch')).toBeInTheDocument();
      expect(screen.getByText('$299.99')).toBeInTheDocument();
      expect(screen.getByText('$399.98')).toBeInTheDocument(); // 2 * 199.99
      expect(screen.getByText(/total: \$699\.97/i)).toBeInTheDocument();
    });

    it('should allow updating item quantity', async () => {
      render(
        <MemoryRouter>
          <CartProvider>
            <Cart />
          </CartProvider>
        </MemoryRouter>
      );

      const { addToCart } = require('../context/CartContext');
      act(() => {
        addToCart(mockProducts[0], 1);
      });

      const quantityInput = screen.getByLabelText(/quantity for premium headphones/i);
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '3');

      await waitFor(() => {
        expect(screen.getByText('$899.97')).toBeInTheDocument(); // 3 * 299.99
      });
    });

    it('should allow removing items from cart', async () => {
      render(
        <MemoryRouter>
          <CartProvider>
            <Cart />
          </CartProvider>
        </MemoryRouter>
      );

      const { addToCart } = require('../context/CartContext');
      act(() => {
        addToCart(mockProducts[0], 1);
        addToCart(mockProducts[1], 1);
      });

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      userEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Premium Headphones')).not.toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
      });
    });

    it('should prevent quantity from exceeding available stock', async () => {
      render(
        <MemoryRouter>
          <CartProvider>
            <Cart />
          </CartProvider>
        </MemoryRouter>
      );

      const { addToCart } = require('../context/CartContext');
      act(() => {
        addToCart(mockProducts[0], 1);
      });

      const quantityInput = screen.getByLabelText(/quantity for premium headphones/i);
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '15');

      await waitFor(() => {
        expect(screen.getByText(/maximum quantity allowed is 10/i)).toBeInTheDocument();
        expect(quantityInput).toHaveValue(10);
      });
    });

    it('should be accessible with proper ARIA attributes', async () => {
      render(
        <MemoryRouter>
          <CartProvider>
            <Cart />
          </CartProvider>
        </MemoryRouter>
      );

      const { addToCart } = require('../context/CartContext');
      act(() => {
        addToCart(mockProducts[0], 1);
      });

      expect(screen.getByRole('heading', { name: /shopping cart/i })).toBeInTheDocument();
      expect(screen.getByRole('row', { name: /premium headphones/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/quantity for premium headphones/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /proceed to checkout/i })).toBeInTheDocument();
    });
  });

  describe('Checkout Component', () => {
    it('should display loading state while processing order', () => {
      mockedAxios.post.mockImplementation(() => new Promise(() => {}));

      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <Checkout />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/processing your order/i)).toBeInTheDocument();
    });

    it('should display order confirmation after successful checkout', async () => {
      mockedAxios.post.mockResolvedValue({ data: { orderId: 'order123', total: 299.99 } });

      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <Checkout />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/order confirmed/i)).toBeInTheDocument();
        expect(screen.getByText(/order #order123/i)).toBeInTheDocument();
        expect(screen.getByText(/\$299\.99/i)).toBeInTheDocument();
      });
    });

    it('should display error when checkout fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Payment failed'));

      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <Checkout />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should require authentication before checkout', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <Checkout />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/please sign in to complete your purchase/i)).toBeInTheDocument();
      });
    });

    it('should display shipping form when user is authenticated', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockUser });

      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <Checkout />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/shipping address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
      });
    });

    it('should validate form fields before submission', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockUser });
      mockedAxios.post.mockResolvedValue({ data: { orderId: 'order123' } });

      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <Checkout />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
      });

      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      userEvent.click(placeOrderButton);

      await waitFor(() => {
        expect(screen.getByText(/please fill in all required fields/i)).toBeInTheDocument();
      });
    });

    it('should be accessible with proper ARIA attributes', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockUser });

      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <Checkout />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /checkout/i })).toBeInTheDocument();
        expect(screen.getByRole('form')).toBeInTheDocument();
        expect(screen.getByLabelText(/shipping address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from '../context/CartContext';
import { AuthProvider } from '../context/AuthContext';
import ProductListing from '../components/ProductListing';
import ProductDetail from '../components/ProductDetail';
import Cart from '../components/Cart';
import Checkout from '../components/Checkout';
import { act } from 'react-dom/test-utils';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockProducts = [
  {
    id: '1',
    name: 'Premium Headphones',
    price: 299.99,
    description: 'Noise cancelling wireless headphones',
    stock: 10,
    category: 'electronics',
    image: 'headphones.jpg',
    rating: 4.5
  },
  {
    id: '2',
    name: 'Smart Watch',
    price: 199.99,
    description: 'Fitness tracking smart watch',
    stock: 5,
    category: 'electronics',
    image: 'watch.jpg',
    rating: 4.2
  }
];

const mockUser = {
  id: 'user123',
  name: 'Test User',
  email: 'test@example.com',
  address: '123 Test St'
};

describe('Ecommerce Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Product Listing Component', () => {
    it('should display loading state while fetching products', async () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));
      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading products/i)).toBeInTheDocument();
    });

    it('should display products after successful fetch', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
      });
    });

    it('should display error message when product fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load products/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should filter products by category', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });

      const categoryFilter = screen.getByLabelText(/filter by category/i);
      userEvent.selectOptions(categoryFilter, 'electronics');

      expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      expect(screen.getByText('Smart Watch')).toBeInTheDocument();
    });

    it('should sort products by price', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/sort by/i);
      userEvent.selectOptions(sortSelect, 'price-desc');

      const productCards = screen.getAllByRole('article');
      expect(within(productCards[0]).getByText('Premium Headphones')).toBeInTheDocument();
      expect(within(productCards[1]).getByText('Smart Watch')).toBeInTheDocument();
    });

    it('should be accessible with proper ARIA attributes', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /products/i })).toBeInTheDocument();
        expect(screen.getAllByRole('article').length).toBe(2);
        expect(screen.getByLabelText(/filter by category/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
      });
    });
  });

  describe('Product Detail Component', () => {
    it('should display loading state while fetching product details', () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));
      render(
        <MemoryRouter initialEntries={['/products/1']}>
          <ProductDetail />
        </MemoryRouter>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display product details after successful fetch', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts[0] });

      render(
        <MemoryRouter initialEntries={['/products/1']}>
          <CartProvider>
            <ProductDetail />
          </CartProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
        expect(screen.getByText('$299.99')).toBeInTheDocument();
        expect(screen.getByText(/noise cancelling wireless headphones/i)).toBeInTheDocument();
        expect(screen.getByText(/in stock/i)).toBeInTheDocument();
      });
    });

    it('should display error when product not found', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Product not found'));

      render(
        <MemoryRouter initialEntries={['/products/999']}>
          <ProductDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/product not found/i)).toBeInTheDocument();
      });
    });

    it('should allow adding product to cart', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts[0] });

      render(
        <MemoryRouter initialEntries={['/products/1']}>
          <CartProvider>
            <ProductDetail />
          </CartProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      });

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      userEvent.click(addToCartButton);

      await waitFor(() => {
        expect(screen.getByText(/added to cart/i)).toBeInTheDocument();
      });
    });

    it('should disable add to cart when product is out of stock', async () => {
      const outOfStockProduct = { ...mockProducts[0], stock: 0 };
      mockedAxios.get.mockResolvedValue({ data: outOfStockProduct });

      render(
        <MemoryRouter initialEntries={['/products/1']}>
          <CartProvider>
            <ProductDetail />
          </CartProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
      });
    });

    it('should be accessible with proper ARIA attributes', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts[0] });

      render(
        <MemoryRouter initialEntries={['/products/1']}>
          <CartProvider>
            <ProductDetail />
          </CartProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Premium Headphones' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: /premium headphones/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
      });
    });
  });

  describe('Cart Component', () => {
    it('should display empty cart message when no items are present', () => {
      render(
        <MemoryRouter>
          <CartProvider>
            <Cart />
          </CartProvider>
        </MemoryRouter>
      );

      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    });

    it('should display cart items and total', async () => {
      render(
        <MemoryRouter>
          <CartProvider>
            <Cart />
          </CartProvider>
        </MemoryRouter>
      );

      // Simulate adding items to cart
      const { addToCart } = require('../context/CartContext');
      act(() => {
        addToCart(mockProducts[0], 1);
        addToCart(mockProducts[1], 2);
      });

      expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      expect(screen.getByText('Smart Watch')).toBeInTheDocument();
      expect(screen.getByText('$299.99')).toBeInTheDocument();
      expect(screen.getByText('$399.98')).toBeInTheDocument(); // 2 * 199.99
      expect(screen.getByText(/total: \$699\.97/i)).toBeInTheDocument();
    });

    it('should allow updating item quantity', async () => {
      render(
        <MemoryRouter>
          <CartProvider>
            <Cart />
          </CartProvider>
        </MemoryRouter>
      );

      const { addToCart } = require('../context/CartContext');
      act(() => {
        addToCart(mockProducts[0], 1);
      });

      const quantityInput = screen.getByLabelText(/quantity for premium headphones/i);
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '3');

      await waitFor(() => {
        expect(screen.getByText('$899.97')).toBeInTheDocument(); // 3 * 299.99
      });
    });

    it('should allow removing items from cart', async () => {
      render(
        <MemoryRouter>
          <CartProvider>
            <Cart />
          </CartProvider>
        </MemoryRouter>
      );

      const { addToCart } = require('../context/CartContext');
      act(() => {
        addToCart(mockProducts[0], 1);
        addToCart(mockProducts[1], 1);
      });

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      userEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Premium Headphones')).not.toBeInTheDocument();
        expect(screen.getByText('Smart Watch')).toBeInTheDocument();
      });
    });

    it('should prevent quantity from exceeding available stock', async () => {
      render(
        <MemoryRouter>
          <CartProvider>
            <Cart />
          </CartProvider>
        </MemoryRouter>
      );

      const { addToCart } = require('../context/CartContext');
      act(() => {
        addToCart(mockProducts[0], 1);
      });

      const quantityInput = screen.getByLabelText(/quantity for premium headphones/i);
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '15');

      await waitFor(() => {
        expect(screen.getByText(/maximum quantity allowed is 10/i)).toBeInTheDocument();
        expect(quantityInput).toHaveValue(10);
      });
    });

    it('should be accessible with proper ARIA attributes', async () => {
      render(
        <MemoryRouter>
          <CartProvider>
            <Cart />
          </CartProvider>
        </MemoryRouter>
      );

      const { addToCart } = require('../context/CartContext');
      act(() => {
        addToCart(mockProducts[0], 1);
      });

      expect(screen.getByRole('heading', { name: /shopping cart/i })).toBeInTheDocument();
      expect(screen.getByRole('row', { name: /premium headphones/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/quantity for premium headphones/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /proceed to checkout/i })).toBeInTheDocument();
    });
  });

  describe('Checkout Component', () => {
    it('should display loading state while processing order', () => {
      mockedAxios.post.mockImplementation(() => new Promise(() => {}));

      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <Checkout />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/processing your order/i)).toBeInTheDocument();
    });

    it('should display order confirmation after successful checkout', async () => {
      mockedAxios.post.mockResolvedValue({ data: { orderId: 'order123', total: 299.99 } });

      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <Checkout />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/order confirmed/i)).toBeInTheDocument();
        expect(screen.getByText(/order #order123/i)).toBeInTheDocument();
        expect(screen.getByText(/\$299\.99/i)).toBeInTheDocument();
      });
    });

    it('should display error when checkout fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Payment failed'));

      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <Checkout />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should require authentication before checkout', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <Checkout />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/please sign in to complete your purchase/i)).toBeInTheDocument();
      });
    });

    it('should display shipping form when user is authenticated', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockUser });

      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <Checkout />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/shipping address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
      });
    });

    it('should validate form fields before submission', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockUser });
      mockedAxios.post.mockResolvedValue({ data: { orderId: 'order123' } });

      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <Checkout />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
      });

      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      userEvent.click(placeOrderButton);

      await waitFor(() => {
        expect(screen.getByText(/please fill in all required fields/i)).toBeInTheDocument();
      });
    });

    it('should be accessible with proper ARIA attributes', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockUser });

      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <Checkout />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /checkout/i })).toBeInTheDocument();
        expect(screen.getByRole('form')).toBeInTheDocument();
        expect(screen.getByLabelText(/shipping address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
      });
    });
  });
});