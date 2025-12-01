import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from '../../context/CartContext';
import { AuthProvider } from '../../context/AuthContext';
import ProductListing from '../../components/ecommerce/ProductListing';
import ProductDetail from '../../components/ecommerce/ProductDetail';
import Cart from '../../components/ecommerce/Cart';
import Checkout from '../../components/ecommerce/Checkout';
import { mockProducts, mockUser, mockCartItems } from '../../mocks/data';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Ecommerce Core Functionality', () => {
  describe('Product Listing Component', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should display loading state while fetching products', async () => {
      mockedAxios.get.mockImplementationOnce(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockProducts }), 1000))
      );

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    });

    it('should display products after successful API call', async () => {
      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockProducts[0].name)).toBeInTheDocument();
        expect(screen.getByText(mockProducts[1].name)).toBeInTheDocument();
      });
    });

    it('should display error message when API call fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load products/i)).toBeInTheDocument();
      });
    });

    it('should filter products based on search input', async () => {
      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search products/i);
        userEvent.type(searchInput, mockProducts[0].name.substring(0, 5));

        expect(screen.getByText(mockProducts[0].name)).toBeInTheDocument();
        expect(screen.queryByText(mockProducts[1].name)).not.toBeInTheDocument();
      });
    });

    it('should be accessible with proper ARIA attributes', async () => {
      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        const productCards = screen.getAllByRole('article');
        expect(productCards.length).toBeGreaterThan(0);

        productCards.forEach(card => {
          expect(card).toHaveAttribute('aria-labelledby');
          expect(within(card).getByRole('heading')).toBeInTheDocument();
          expect(within(card).getByRole('img')).toHaveAttribute('alt');
        });
      });
    });
  });

  describe('Product Detail Component', () => {
    const productId = '1';

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts[0] });
    });

    it('should display loading state while fetching product details', () => {
      mockedAxios.get.mockImplementationOnce(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockProducts[0] }), 1000))
      );

      render(
        <MemoryRouter initialEntries={[`/products/${productId}`]}>
          <ProductDetail />
        </MemoryRouter>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display product details after successful API call', async () => {
      render(
        <MemoryRouter initialEntries={[`/products/${productId}`]}>
          <ProductDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockProducts[0].name)).toBeInTheDocument();
        expect(screen.getByText(`$${mockProducts[0].price.toFixed(2)}`)).toBeInTheDocument();
        expect(screen.getByText(mockProducts[0].description)).toBeInTheDocument();
      });
    });

    it('should display error message when product is not found', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Product not found'));

      render(
        <MemoryRouter initialEntries={[`/products/${productId}`]}>
          <ProductDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/product not found/i)).toBeInTheDocument();
      });
    });

    it('should allow adding product to cart', async () => {
      const addToCartMock = jest.fn();
      jest.spyOn(React, 'useContext').mockImplementation(() => ({
        addToCart: addToCartMock,
        cartItems: [],
      }));

      render(
        <MemoryRouter initialEntries={[`/products/${productId}`]}>
          <CartProvider>
            <ProductDetail />
          </CartProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add to cart/i });
        userEvent.click(addButton);
        expect(addToCartMock).toHaveBeenCalledWith(mockProducts[0], 1);
      });
    });

    it('should have proper accessibility attributes', async () => {
      render(
        <MemoryRouter initialEntries={[`/products/${productId}`]}>
          <ProductDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: mockProducts[0].name })).toBeInTheDocument();
        expect(screen.getByRole('img')).toHaveAttribute('alt', mockProducts[0].name);
        expect(screen.getByRole('button', { name: /add to cart/i })).toBeEnabled();
      });
    });
  });

  describe('Cart Component', () => {
    it('should display empty cart message when no items are present', () => {
      render(
        <CartProvider>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      );

      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    });

    it('should display cart items and total', () => {
      render(
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      );

      mockCartItems.forEach(item => {
        expect(screen.getByText(item.product.name)).toBeInTheDocument();
        expect(screen.getByText(`$${item.product.price.toFixed(2)}`)).toBeInTheDocument();
      });

      const total = mockCartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
      expect(screen.getByText(`$${total.toFixed(2)}`)).toBeInTheDocument();
    });

    it('should allow updating item quantity', () => {
      const updateQuantityMock = jest.fn();
      jest.spyOn(React, 'useContext').mockImplementation(() => ({
        cartItems: mockCartItems,
        updateQuantity: updateQuantityMock,
        removeFromCart: jest.fn(),
      }));

      render(
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      );

      const incrementButton = screen.getAllByRole('button', { name: /+/i })[0];
      userEvent.click(incrementButton);
      expect(updateQuantityMock).toHaveBeenCalledWith(mockCartItems[0].product.id, 2);
    });

    it('should allow removing items from cart', () => {
      const removeFromCartMock = jest.fn();
      jest.spyOn(React, 'useContext').mockImplementation(() => ({
        cartItems: mockCartItems,
        updateQuantity: jest.fn(),
        removeFromCart: removeFromCartMock,
      }));

      render(
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      );

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      userEvent.click(removeButtons[0]);
      expect(removeFromCartMock).toHaveBeenCalledWith(mockCartItems[0].product.id);
    });

    it('should have proper accessibility attributes', () => {
      render(
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      );

      expect(screen.getByRole('heading', { name: /shopping cart/i })).toBeInTheDocument();
      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Shopping cart items');

      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(mockCartItems.length + 1); // +1 for header row
    });
  });

  describe('Checkout Component', () => {
    const mockOrderResponse = {
      id: 'order-123',
      total: 99.99,
      items: mockCartItems,
      status: 'pending',
    };

    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({ data: mockOrderResponse });
    });

    it('should display checkout form with user information', async () => {
      render(
        <AuthProvider initialUser={mockUser}>
          <CartProvider initialCart={mockCartItems}>
            <MemoryRouter>
              <Checkout />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toHaveValue(mockUser.name);
        expect(screen.getByLabelText(/email/i)).toHaveValue(mockUser.email);
        expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
      });
    });

    it('should show validation errors for empty required fields', async () => {
      render(
        <AuthProvider>
          <CartProvider initialCart={mockCartItems}>
            <MemoryRouter>
              <Checkout />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: /place order/i });
      userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/address is required/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during order submission', async () => {
      mockedAxios.post.mockImplementationOnce(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockOrderResponse }), 1000))
      );

      render(
        <AuthProvider initialUser={mockUser}>
          <CartProvider initialCart={mockCartItems}>
            <MemoryRouter>
              <Checkout />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: /place order/i });
      userEvent.click(submitButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    });

    it('should display success message after successful order submission', async () => {
      render(
        <AuthProvider initialUser={mockUser}>
          <CartProvider initialCart={mockCartItems}>
            <MemoryRouter>
              <Checkout />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: /place order/i });
      userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/order placed successfully/i)).toBeInTheDocument();
        expect(screen.getByText(`Order #${mockOrderResponse.id}`)).toBeInTheDocument();
      });
    });

    it('should display error message when order submission fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Payment failed'));

      render(
        <AuthProvider initialUser={mockUser}>
          <CartProvider initialCart={mockCartItems}>
            <MemoryRouter>
              <Checkout />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: /place order/i });
      userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to place order/i)).toBeInTheDocument();
      });
    });

    it('should have proper accessibility attributes', async () => {
      render(
        <AuthProvider initialUser={mockUser}>
          <CartProvider initialCart={mockCartItems}>
            <MemoryRouter>
              <Checkout />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );

      expect(screen.getByRole('heading', { name: /checkout/i })).toBeInTheDocument();
      expect(screen.getByRole('form')).toHaveAttribute('aria-label', 'Checkout form');

      const requiredFields = screen.getAllByText('*');
      expect(requiredFields.length).toBeGreaterThan(0);
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
import ProductListing from '../../components/ecommerce/ProductListing';
import ProductDetail from '../../components/ecommerce/ProductDetail';
import Cart from '../../components/ecommerce/Cart';
import Checkout from '../../components/ecommerce/Checkout';
import { mockProducts, mockUser, mockCartItems } from '../../mocks/data';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Ecommerce Core Functionality', () => {
  describe('Product Listing Component', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should display loading state while fetching products', async () => {
      mockedAxios.get.mockImplementationOnce(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockProducts }), 1000))
      );

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    });

    it('should display products after successful API call', async () => {
      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockProducts[0].name)).toBeInTheDocument();
        expect(screen.getByText(mockProducts[1].name)).toBeInTheDocument();
      });
    });

    it('should display error message when API call fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load products/i)).toBeInTheDocument();
      });
    });

    it('should filter products based on search input', async () => {
      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search products/i);
        userEvent.type(searchInput, mockProducts[0].name.substring(0, 5));

        expect(screen.getByText(mockProducts[0].name)).toBeInTheDocument();
        expect(screen.queryByText(mockProducts[1].name)).not.toBeInTheDocument();
      });
    });

    it('should be accessible with proper ARIA attributes', async () => {
      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        const productCards = screen.getAllByRole('article');
        expect(productCards.length).toBeGreaterThan(0);

        productCards.forEach(card => {
          expect(card).toHaveAttribute('aria-labelledby');
          expect(within(card).getByRole('heading')).toBeInTheDocument();
          expect(within(card).getByRole('img')).toHaveAttribute('alt');
        });
      });
    });
  });

  describe('Product Detail Component', () => {
    const productId = '1';

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts[0] });
    });

    it('should display loading state while fetching product details', () => {
      mockedAxios.get.mockImplementationOnce(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockProducts[0] }), 1000))
      );

      render(
        <MemoryRouter initialEntries={[`/products/${productId}`]}>
          <ProductDetail />
        </MemoryRouter>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display product details after successful API call', async () => {
      render(
        <MemoryRouter initialEntries={[`/products/${productId}`]}>
          <ProductDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockProducts[0].name)).toBeInTheDocument();
        expect(screen.getByText(`$${mockProducts[0].price.toFixed(2)}`)).toBeInTheDocument();
        expect(screen.getByText(mockProducts[0].description)).toBeInTheDocument();
      });
    });

    it('should display error message when product is not found', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Product not found'));

      render(
        <MemoryRouter initialEntries={[`/products/${productId}`]}>
          <ProductDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/product not found/i)).toBeInTheDocument();
      });
    });

    it('should allow adding product to cart', async () => {
      const addToCartMock = jest.fn();
      jest.spyOn(React, 'useContext').mockImplementation(() => ({
        addToCart: addToCartMock,
        cartItems: [],
      }));

      render(
        <MemoryRouter initialEntries={[`/products/${productId}`]}>
          <CartProvider>
            <ProductDetail />
          </CartProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add to cart/i });
        userEvent.click(addButton);
        expect(addToCartMock).toHaveBeenCalledWith(mockProducts[0], 1);
      });
    });

    it('should have proper accessibility attributes', async () => {
      render(
        <MemoryRouter initialEntries={[`/products/${productId}`]}>
          <ProductDetail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: mockProducts[0].name })).toBeInTheDocument();
        expect(screen.getByRole('img')).toHaveAttribute('alt', mockProducts[0].name);
        expect(screen.getByRole('button', { name: /add to cart/i })).toBeEnabled();
      });
    });
  });

  describe('Cart Component', () => {
    it('should display empty cart message when no items are present', () => {
      render(
        <CartProvider>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      );

      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    });

    it('should display cart items and total', () => {
      render(
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      );

      mockCartItems.forEach(item => {
        expect(screen.getByText(item.product.name)).toBeInTheDocument();
        expect(screen.getByText(`$${item.product.price.toFixed(2)}`)).toBeInTheDocument();
      });

      const total = mockCartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
      expect(screen.getByText(`$${total.toFixed(2)}`)).toBeInTheDocument();
    });

    it('should allow updating item quantity', () => {
      const updateQuantityMock = jest.fn();
      jest.spyOn(React, 'useContext').mockImplementation(() => ({
        cartItems: mockCartItems,
        updateQuantity: updateQuantityMock,
        removeFromCart: jest.fn(),
      }));

      render(
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      );

      const incrementButton = screen.getAllByRole('button', { name: /+/i })[0];
      userEvent.click(incrementButton);
      expect(updateQuantityMock).toHaveBeenCalledWith(mockCartItems[0].product.id, 2);
    });

    it('should allow removing items from cart', () => {
      const removeFromCartMock = jest.fn();
      jest.spyOn(React, 'useContext').mockImplementation(() => ({
        cartItems: mockCartItems,
        updateQuantity: jest.fn(),
        removeFromCart: removeFromCartMock,
      }));

      render(
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      );

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      userEvent.click(removeButtons[0]);
      expect(removeFromCartMock).toHaveBeenCalledWith(mockCartItems[0].product.id);
    });

    it('should have proper accessibility attributes', () => {
      render(
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      );

      expect(screen.getByRole('heading', { name: /shopping cart/i })).toBeInTheDocument();
      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Shopping cart items');

      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(mockCartItems.length + 1); // +1 for header row
    });
  });

  describe('Checkout Component', () => {
    const mockOrderResponse = {
      id: 'order-123',
      total: 99.99,
      items: mockCartItems,
      status: 'pending',
    };

    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({ data: mockOrderResponse });
    });

    it('should display checkout form with user information', async () => {
      render(
        <AuthProvider initialUser={mockUser}>
          <CartProvider initialCart={mockCartItems}>
            <MemoryRouter>
              <Checkout />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toHaveValue(mockUser.name);
        expect(screen.getByLabelText(/email/i)).toHaveValue(mockUser.email);
        expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
      });
    });

    it('should show validation errors for empty required fields', async () => {
      render(
        <AuthProvider>
          <CartProvider initialCart={mockCartItems}>
            <MemoryRouter>
              <Checkout />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: /place order/i });
      userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/address is required/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during order submission', async () => {
      mockedAxios.post.mockImplementationOnce(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockOrderResponse }), 1000))
      );

      render(
        <AuthProvider initialUser={mockUser}>
          <CartProvider initialCart={mockCartItems}>
            <MemoryRouter>
              <Checkout />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: /place order/i });
      userEvent.click(submitButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    });

    it('should display success message after successful order submission', async () => {
      render(
        <AuthProvider initialUser={mockUser}>
          <CartProvider initialCart={mockCartItems}>
            <MemoryRouter>
              <Checkout />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: /place order/i });
      userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/order placed successfully/i)).toBeInTheDocument();
        expect(screen.getByText(`Order #${mockOrderResponse.id}`)).toBeInTheDocument();
      });
    });

    it('should display error message when order submission fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Payment failed'));

      render(
        <AuthProvider initialUser={mockUser}>
          <CartProvider initialCart={mockCartItems}>
            <MemoryRouter>
              <Checkout />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: /place order/i });
      userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to place order/i)).toBeInTheDocument();
      });
    });

    it('should have proper accessibility attributes', async () => {
      render(
        <AuthProvider initialUser={mockUser}>
          <CartProvider initialCart={mockCartItems}>
            <MemoryRouter>
              <Checkout />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );

      expect(screen.getByRole('heading', { name: /checkout/i })).toBeInTheDocument();
      expect(screen.getByRole('form')).toHaveAttribute('aria-label', 'Checkout form');

      const requiredFields = screen.getAllByText('*');
      expect(requiredFields.length).toBeGreaterThan(0);
    });
  });
});