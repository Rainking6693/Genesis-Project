import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
import { CartProvider } from '../../context/CartContext';
import { AuthProvider } from '../../context/AuthContext';
import ProductListing from '../../components/ProductListing';
import ProductDetail from '../../components/ProductDetail';
import Checkout from '../../components/Checkout';
import { mockProducts, mockProductDetail, mockUser } from '../../mocks/data';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Ecommerce Core Functionality', () => {
  beforeEach(() => {
    mockedAxios.get.mockClear();
    mockedAxios.post.mockClear();
    mockedAxios.put.mockClear();
    mockedAxios.delete.mockClear();
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

    it('should display products after successful API call', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        mockProducts.forEach(product => {
          expect(screen.getByText(product.name)).toBeInTheDocument();
          expect(screen.getByText(`$${product.price.toFixed(2)}`)).toBeInTheDocument();
        });
      });
    });

    it('should display error message when API call fails', async () => {
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

    it('should filter products based on search input', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockProducts[0].name)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search products/i);
      await userEvent.type(searchInput, mockProducts[0].name.substring(0, 5));

      expect(screen.getByText(mockProducts[0].name)).toBeInTheDocument();
      expect(screen.queryByText(mockProducts[1].name)).not.toBeInTheDocument();
    });

    it('should be accessible with proper ARIA attributes', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        const productCards = screen.getAllByRole('article');
        expect(productCards.length).toBe(mockProducts.length);

        productCards.forEach(card => {
          expect(card).toHaveAttribute('aria-labelledby');
          expect(within(card).getByRole('heading')).toBeInTheDocument();
          expect(within(card).getByRole('img')).toHaveAccessibleName();
        });
      });
    });
  });

  describe('Product Detail Component', () => {
    it('should display loading state while fetching product details', () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));
      render(
        <MemoryRouter initialEntries={[`/products/${mockProductDetail.id}`]}>
          <Route path="/products/:id">
            <ProductDetail />
          </Route>
        </MemoryRouter>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display product details after successful API call', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProductDetail });

      render(
        <CartProvider>
          <MemoryRouter initialEntries={[`/products/${mockProductDetail.id}`]}>
            <Route path="/products/:id">
              <ProductDetail />
            </Route>
          </MemoryRouter>
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(mockProductDetail.name)).toBeInTheDocument();
        expect(screen.getByText(`$${mockProductDetail.price.toFixed(2)}`)).toBeInTheDocument();
        expect(screen.getByText(mockProductDetail.description)).toBeInTheDocument();
        expect(screen.getByAltText(mockProductDetail.name)).toBeInTheDocument();
      });
    });

    it('should display error message when product is not found', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Product not found'));

      render(
        <MemoryRouter initialEntries={['/products/9999']}>
          <Route path="/products/:id">
            <ProductDetail />
          </Route>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/product not found/i)).toBeInTheDocument();
      });
    });

    it('should allow adding product to cart', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProductDetail });

      render(
        <CartProvider>
          <MemoryRouter initialEntries={[`/products/${mockProductDetail.id}`]}>
            <Route path="/products/:id">
              <ProductDetail />
            </Route>
          </MemoryRouter>
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/add to cart/i)).toBeInTheDocument();
      });

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      await userEvent.click(addToCartButton);

      await waitFor(() => {
        expect(screen.getByText(/item added to cart/i)).toBeInTheDocument();
      });
    });

    it('should show out of stock message when quantity is 0', async () => {
      const outOfStockProduct = { ...mockProductDetail, stock: 0 };
      mockedAxios.get.mockResolvedValue({ data: outOfStockProduct });

      render(
        <CartProvider>
          <MemoryRouter initialEntries={[`/products/${outOfStockProduct.id}`]}>
            <Route path="/products/:id">
              <ProductDetail />
            </Route>
          </MemoryRouter>
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
      });
    });
  });

  describe('Checkout Component', () => {
    const renderCheckout = () => {
      return render(
        <AuthProvider initialUser={mockUser}>
          <CartProvider initialCart={{ items: [mockProductDetail], total: mockProductDetail.price }}>
            <MemoryRouter initialEntries={['/checkout']}>
              <Route path="/checkout">
                <Checkout />
              </Route>
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );
    };

    it('should display cart items in checkout', async () => {
      renderCheckout();

      await waitFor(() => {
        expect(screen.getByText(mockProductDetail.name)).toBeInTheDocument();
        expect(screen.getByText(`$${mockProductDetail.price.toFixed(2)}`)).toBeInTheDocument();
      });
    });

    it('should show login prompt when user is not authenticated', () => {
      render(
        <AuthProvider>
          <CartProvider initialCart={{ items: [mockProductDetail], total: mockProductDetail.price }}>
            <MemoryRouter initialEntries={['/checkout']}>
              <Route path="/checkout">
                <Checkout />
              </Route>
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/please log in to checkout/i)).toBeInTheDocument();
    });

    it('should validate form fields before submission', async () => {
      renderCheckout();

      const submitButton = screen.getByRole('button', { name: /place order/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/shipping address is required/i)).toBeInTheDocument();
        expect(screen.getByText(/payment method is required/i)).toBeInTheDocument();
      });
    });

    it('should handle successful order submission', async () => {
      mockedAxios.post.mockResolvedValue({ data: { orderId: '12345' } });
      renderCheckout();

      // Fill out form
      await userEvent.type(screen.getByLabelText(/shipping address/i), '123 Test St');
      await userEvent.type(screen.getByLabelText(/city/i), 'Testville');
      await userEvent.selectOptions(screen.getByLabelText(/payment method/i), 'credit_card');
      await userEvent.type(screen.getByLabelText(/card number/i), '4111111111111111');

      const submitButton = screen.getByRole('button', { name: /place order/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/orders'),
          expect.any(Object)
        );
        expect(screen.getByText(/order placed successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/order #12345/i)).toBeInTheDocument();
      });
    });

    it('should handle order submission failure', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Payment failed'));
      renderCheckout();

      // Fill out form
      await userEvent.type(screen.getByLabelText(/shipping address/i), '123 Test St');
      await userEvent.selectOptions(screen.getByLabelText(/payment method/i), 'credit_card');

      const submitButton = screen.getByRole('button', { name: /place order/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to place order/i)).toBeInTheDocument();
        expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during order submission', async () => {
      mockedAxios.post.mockImplementation(() => new Promise(() => {}));
      renderCheckout();

      // Fill out form
      await userEvent.type(screen.getByLabelText(/shipping address/i), '123 Test St');
      await userEvent.selectOptions(screen.getByLabelText(/payment method/i), 'credit_card');

      const submitButton = screen.getByRole('button', { name: /place order/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Cart Functionality', () => {
    it('should update cart quantity when incrementing', async () => {
      render(
        <CartProvider initialCart={{ items: [{ ...mockProductDetail, quantity: 1 }], total: mockProductDetail.price }}>
          <MemoryRouter>
            <ProductDetail product={mockProductDetail} />
          </MemoryRouter>
        </CartProvider>
      );

      const incrementButton = screen.getByRole('button', { name: /increase quantity/i });
      await userEvent.click(incrementButton);

      await waitFor(() => {
        expect(screen.getByText(/2/i)).toBeInTheDocument();
      });
    });

    it('should not allow quantity to go below 1', async () => {
      render(
        <CartProvider initialCart={{ items: [{ ...mockProductDetail, quantity: 1 }], total: mockProductDetail.price }}>
          <MemoryRouter>
            <ProductDetail product={mockProductDetail} />
          </MemoryRouter>
        </CartProvider>
      );

      const decrementButton = screen.getByRole('button', { name: /decrease quantity/i });
      await userEvent.click(decrementButton);

      await waitFor(() => {
        expect(screen.getByText(/1/i)).toBeInTheDocument();
      });
    });

    it('should remove item from cart', async () => {
      render(
        <CartProvider initialCart={{ items: [mockProductDetail], total: mockProductDetail.price }}>
          <MemoryRouter>
            <Checkout />
          </MemoryRouter>
        </CartProvider>
      );

      const removeButton = screen.getByRole('button', { name: /remove/i });
      await userEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText(mockProductDetail.name)).not.toBeInTheDocument();
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('should have proper ARIA labels for interactive elements', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });
      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        addToCartButtons.forEach(button => {
          expect(button).toHaveAttribute('aria-label', expect.stringContaining('Add to cart'));
        });

        expect(screen.getByRole('searchbox')).toHaveAccessibleName();
      });
    });

    it('should have proper focus management', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });
      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search products/i);
        searchInput.focus();
        expect(searchInput).toHaveFocus();

        const firstProduct = screen.getByText(mockProducts[0].name);
        firstProduct.focus();
        expect(firstProduct).toHaveFocus();
      });
    });

    it('should have proper keyboard navigation', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });
      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        addToCartButtons[0].focus();
        fireEvent.keyDown(addToCartButtons[0], { key: 'Enter', code: 'Enter' });

        // Verify the button was clicked (would need to mock the click handler)
        expect(addToCartButtons[0]).toHaveFocus();
      });
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
import ProductListing from '../../components/ProductListing';
import ProductDetail from '../../components/ProductDetail';
import Checkout from '../../components/Checkout';
import { mockProducts, mockProductDetail, mockUser } from '../../mocks/data';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Ecommerce Core Functionality', () => {
  beforeEach(() => {
    mockedAxios.get.mockClear();
    mockedAxios.post.mockClear();
    mockedAxios.put.mockClear();
    mockedAxios.delete.mockClear();
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

    it('should display products after successful API call', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        mockProducts.forEach(product => {
          expect(screen.getByText(product.name)).toBeInTheDocument();
          expect(screen.getByText(`$${product.price.toFixed(2)}`)).toBeInTheDocument();
        });
      });
    });

    it('should display error message when API call fails', async () => {
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

    it('should filter products based on search input', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockProducts[0].name)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search products/i);
      await userEvent.type(searchInput, mockProducts[0].name.substring(0, 5));

      expect(screen.getByText(mockProducts[0].name)).toBeInTheDocument();
      expect(screen.queryByText(mockProducts[1].name)).not.toBeInTheDocument();
    });

    it('should be accessible with proper ARIA attributes', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });

      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        const productCards = screen.getAllByRole('article');
        expect(productCards.length).toBe(mockProducts.length);

        productCards.forEach(card => {
          expect(card).toHaveAttribute('aria-labelledby');
          expect(within(card).getByRole('heading')).toBeInTheDocument();
          expect(within(card).getByRole('img')).toHaveAccessibleName();
        });
      });
    });
  });

  describe('Product Detail Component', () => {
    it('should display loading state while fetching product details', () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));
      render(
        <MemoryRouter initialEntries={[`/products/${mockProductDetail.id}`]}>
          <Route path="/products/:id">
            <ProductDetail />
          </Route>
        </MemoryRouter>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display product details after successful API call', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProductDetail });

      render(
        <CartProvider>
          <MemoryRouter initialEntries={[`/products/${mockProductDetail.id}`]}>
            <Route path="/products/:id">
              <ProductDetail />
            </Route>
          </MemoryRouter>
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(mockProductDetail.name)).toBeInTheDocument();
        expect(screen.getByText(`$${mockProductDetail.price.toFixed(2)}`)).toBeInTheDocument();
        expect(screen.getByText(mockProductDetail.description)).toBeInTheDocument();
        expect(screen.getByAltText(mockProductDetail.name)).toBeInTheDocument();
      });
    });

    it('should display error message when product is not found', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Product not found'));

      render(
        <MemoryRouter initialEntries={['/products/9999']}>
          <Route path="/products/:id">
            <ProductDetail />
          </Route>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/product not found/i)).toBeInTheDocument();
      });
    });

    it('should allow adding product to cart', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProductDetail });

      render(
        <CartProvider>
          <MemoryRouter initialEntries={[`/products/${mockProductDetail.id}`]}>
            <Route path="/products/:id">
              <ProductDetail />
            </Route>
          </MemoryRouter>
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/add to cart/i)).toBeInTheDocument();
      });

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      await userEvent.click(addToCartButton);

      await waitFor(() => {
        expect(screen.getByText(/item added to cart/i)).toBeInTheDocument();
      });
    });

    it('should show out of stock message when quantity is 0', async () => {
      const outOfStockProduct = { ...mockProductDetail, stock: 0 };
      mockedAxios.get.mockResolvedValue({ data: outOfStockProduct });

      render(
        <CartProvider>
          <MemoryRouter initialEntries={[`/products/${outOfStockProduct.id}`]}>
            <Route path="/products/:id">
              <ProductDetail />
            </Route>
          </MemoryRouter>
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
      });
    });
  });

  describe('Checkout Component', () => {
    const renderCheckout = () => {
      return render(
        <AuthProvider initialUser={mockUser}>
          <CartProvider initialCart={{ items: [mockProductDetail], total: mockProductDetail.price }}>
            <MemoryRouter initialEntries={['/checkout']}>
              <Route path="/checkout">
                <Checkout />
              </Route>
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );
    };

    it('should display cart items in checkout', async () => {
      renderCheckout();

      await waitFor(() => {
        expect(screen.getByText(mockProductDetail.name)).toBeInTheDocument();
        expect(screen.getByText(`$${mockProductDetail.price.toFixed(2)}`)).toBeInTheDocument();
      });
    });

    it('should show login prompt when user is not authenticated', () => {
      render(
        <AuthProvider>
          <CartProvider initialCart={{ items: [mockProductDetail], total: mockProductDetail.price }}>
            <MemoryRouter initialEntries={['/checkout']}>
              <Route path="/checkout">
                <Checkout />
              </Route>
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/please log in to checkout/i)).toBeInTheDocument();
    });

    it('should validate form fields before submission', async () => {
      renderCheckout();

      const submitButton = screen.getByRole('button', { name: /place order/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/shipping address is required/i)).toBeInTheDocument();
        expect(screen.getByText(/payment method is required/i)).toBeInTheDocument();
      });
    });

    it('should handle successful order submission', async () => {
      mockedAxios.post.mockResolvedValue({ data: { orderId: '12345' } });
      renderCheckout();

      // Fill out form
      await userEvent.type(screen.getByLabelText(/shipping address/i), '123 Test St');
      await userEvent.type(screen.getByLabelText(/city/i), 'Testville');
      await userEvent.selectOptions(screen.getByLabelText(/payment method/i), 'credit_card');
      await userEvent.type(screen.getByLabelText(/card number/i), '4111111111111111');

      const submitButton = screen.getByRole('button', { name: /place order/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/orders'),
          expect.any(Object)
        );
        expect(screen.getByText(/order placed successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/order #12345/i)).toBeInTheDocument();
      });
    });

    it('should handle order submission failure', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Payment failed'));
      renderCheckout();

      // Fill out form
      await userEvent.type(screen.getByLabelText(/shipping address/i), '123 Test St');
      await userEvent.selectOptions(screen.getByLabelText(/payment method/i), 'credit_card');

      const submitButton = screen.getByRole('button', { name: /place order/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to place order/i)).toBeInTheDocument();
        expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during order submission', async () => {
      mockedAxios.post.mockImplementation(() => new Promise(() => {}));
      renderCheckout();

      // Fill out form
      await userEvent.type(screen.getByLabelText(/shipping address/i), '123 Test St');
      await userEvent.selectOptions(screen.getByLabelText(/payment method/i), 'credit_card');

      const submitButton = screen.getByRole('button', { name: /place order/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Cart Functionality', () => {
    it('should update cart quantity when incrementing', async () => {
      render(
        <CartProvider initialCart={{ items: [{ ...mockProductDetail, quantity: 1 }], total: mockProductDetail.price }}>
          <MemoryRouter>
            <ProductDetail product={mockProductDetail} />
          </MemoryRouter>
        </CartProvider>
      );

      const incrementButton = screen.getByRole('button', { name: /increase quantity/i });
      await userEvent.click(incrementButton);

      await waitFor(() => {
        expect(screen.getByText(/2/i)).toBeInTheDocument();
      });
    });

    it('should not allow quantity to go below 1', async () => {
      render(
        <CartProvider initialCart={{ items: [{ ...mockProductDetail, quantity: 1 }], total: mockProductDetail.price }}>
          <MemoryRouter>
            <ProductDetail product={mockProductDetail} />
          </MemoryRouter>
        </CartProvider>
      );

      const decrementButton = screen.getByRole('button', { name: /decrease quantity/i });
      await userEvent.click(decrementButton);

      await waitFor(() => {
        expect(screen.getByText(/1/i)).toBeInTheDocument();
      });
    });

    it('should remove item from cart', async () => {
      render(
        <CartProvider initialCart={{ items: [mockProductDetail], total: mockProductDetail.price }}>
          <MemoryRouter>
            <Checkout />
          </MemoryRouter>
        </CartProvider>
      );

      const removeButton = screen.getByRole('button', { name: /remove/i });
      await userEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText(mockProductDetail.name)).not.toBeInTheDocument();
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('should have proper ARIA labels for interactive elements', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });
      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        addToCartButtons.forEach(button => {
          expect(button).toHaveAttribute('aria-label', expect.stringContaining('Add to cart'));
        });

        expect(screen.getByRole('searchbox')).toHaveAccessibleName();
      });
    });

    it('should have proper focus management', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });
      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search products/i);
        searchInput.focus();
        expect(searchInput).toHaveFocus();

        const firstProduct = screen.getByText(mockProducts[0].name);
        firstProduct.focus();
        expect(firstProduct).toHaveFocus();
      });
    });

    it('should have proper keyboard navigation', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockProducts });
      render(
        <MemoryRouter>
          <ProductListing />
        </MemoryRouter>
      );

      await waitFor(() => {
        const addToCartButtons = screen.getAllByRole('button', { name: /add to cart/i });
        addToCartButtons[0].focus();
        fireEvent.keyDown(addToCartButtons[0], { key: 'Enter', code: 'Enter' });

        // Verify the button was clicked (would need to mock the click handler)
        expect(addToCartButtons[0]).toHaveFocus();
      });
    });
  });
});