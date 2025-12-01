import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
import { CartProvider } from '../../context/CartContext';
import { AuthProvider } from '../../context/AuthContext';
import ProductListing from '../../components/core/ProductListing';
import ProductDetail from '../../components/core/ProductDetail';
import Cart from '../../components/core/Cart';
import Checkout from '../../components/core/Checkout';
import { act } from 'react-dom/test-utils';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ProductListing Component', () => {
  const mockProducts = [
    { id: 1, name: 'Product 1', price: 19.99, stock: 10, category: 'electronics' },
    { id: 2, name: 'Product 2', price: 29.99, stock: 5, category: 'electronics' },
    { id: 3, name: 'Product 3', price: 9.99, stock: 0, category: 'books' },
  ];

  beforeEach(() => {
    mockedAxios.get.mockResolvedValue({ data: mockProducts });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', async () => {
    render(
      <MemoryRouter>
        <ProductListing />
      </MemoryRouter>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display products after loading', async () => {
    render(
      <MemoryRouter>
        <ProductListing />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.getByText('$19.99')).toBeInTheDocument();
    });
  });

  it('should filter products by category', async () => {
    render(
      <MemoryRouter>
        <ProductListing />
      </MemoryRouter>
    );

    await waitFor(() => {
      const categoryFilter = screen.getByLabelText('Category');
      userEvent.selectOptions(categoryFilter, 'electronics');
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.queryByText('Product 3')).not.toBeInTheDocument();
    });
  });

  it('should show out of stock badge for products with zero stock', async () => {
    render(
      <MemoryRouter>
        <ProductListing />
      </MemoryRouter>
    );

    await waitFor(() => {
      const product3 = screen.getByText('Product 3').closest('.product-card');
      expect(within(product3!).getByText('Out of Stock')).toBeInTheDocument();
    });
  });

  it('should handle API error gracefully', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));
    render(
      <MemoryRouter>
        <ProductListing />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load products. Please try again later.')).toBeInTheDocument();
    });
  });

  it('should be accessible with proper ARIA attributes', async () => {
    render(
      <MemoryRouter>
        <ProductListing />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Our Products' })).toBeInTheDocument();
      expect(screen.getByLabelText('Search products')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
    });
  });
});

describe('ProductDetail Component', () => {
  const mockProduct = {
    id: 1,
    name: 'Premium Headphones',
    price: 199.99,
    description: 'High-quality noise cancelling headphones',
    stock: 5,
    category: 'electronics',
    images: ['headphones1.jpg', 'headphones2.jpg'],
    reviews: [
      { id: 1, user: 'John Doe', rating: 5, comment: 'Excellent quality!' },
      { id: 2, user: 'Jane Smith', rating: 4, comment: 'Great sound, comfortable fit' },
    ],
  };

  beforeEach(() => {
    mockedAxios.get.mockResolvedValue({ data: mockProduct });
  });

  it('should render loading state initially', () => {
    render(
      <MemoryRouter initialEntries={['/products/1']}>
        <Route path="/products/:id">
          <ProductDetail />
        </Route>
      </MemoryRouter>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display product details after loading', async () => {
    render(
      <CartProvider>
        <MemoryRouter initialEntries={['/products/1']}>
          <Route path="/products/:id">
            <ProductDetail />
          </Route>
        </MemoryRouter>
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      expect(screen.getByText('$199.99')).toBeInTheDocument();
      expect(screen.getByText('High-quality noise cancelling headphones')).toBeInTheDocument();
      expect(screen.getByText('In Stock')).toBeInTheDocument();
      expect(screen.getByText('Excellent quality!')).toBeInTheDocument();
    });
  });

  it('should allow adding product to cart', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <MemoryRouter initialEntries={['/products/1']}>
          <Route path="/products/:id">
            <ProductDetail />
          </Route>
        </MemoryRouter>
      </CartProvider>
    );

    await waitFor(async () => {
      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addToCartButton);
      expect(screen.getByText('Product added to cart!')).toBeInTheDocument();
    });
  });

  it('should show error when product is out of stock', async () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    mockedAxios.get.mockResolvedValueOnce({ data: outOfStockProduct });

    render(
      <CartProvider>
        <MemoryRouter initialEntries={['/products/1']}>
          <Route path="/products/:id">
            <ProductDetail />
          </Route>
        </MemoryRouter>
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
    });
  });

  it('should handle API error gracefully', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Product not found'));
    render(
      <MemoryRouter initialEntries={['/products/1']}>
        <Route path="/products/:id">
          <ProductDetail />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load product details. Please try again later.')).toBeInTheDocument();
    });
  });

  it('should be accessible with proper ARIA attributes', async () => {
    render(
      <MemoryRouter initialEntries={['/products/1']}>
        <Route path="/products/:id">
          <ProductDetail />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Premium Headphones' })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Premium Headphones' })).toBeInTheDocument();
      expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
    });
  });
});

describe('Cart Component', () => {
  const mockCartItems = [
    { id: 1, name: 'Product 1', price: 19.99, quantity: 2, image: 'product1.jpg' },
    { id: 2, name: 'Product 2', price: 29.99, quantity: 1, image: 'product2.jpg' },
  ];

  it('should display empty cart message when no items', () => {
    render(
      <CartProvider>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </CartProvider>
    );

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('should display cart items with correct totals', () => {
    render(
      <CartProvider initialCart={mockCartItems}>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </CartProvider>
    );

    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByText('Subtotal: $69.97')).toBeInTheDocument();
    expect(screen.getByText('Tax (10%): $6.99')).toBeInTheDocument();
    expect(screen.getByText('Total: $76.96')).toBeInTheDocument();
  });

  it('should allow updating item quantity', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider initialCart={mockCartItems}>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </CartProvider>
    );

    const quantityInput = screen.getAllByLabelText('Quantity')[0];
    await user.clear(quantityInput);
    await user.type(quantityInput, '3');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Subtotal: $89.97')).toBeInTheDocument();
    });
  });

  it('should allow removing items from cart', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider initialCart={mockCartItems}>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </CartProvider>
    );

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
      expect(screen.getByText('Subtotal: $29.99')).toBeInTheDocument();
    });
  });

  it('should prevent quantity from going below 1', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider initialCart={mockCartItems}>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </CartProvider>
    );

    const quantityInput = screen.getAllByLabelText('Quantity')[0];
    await user.clear(quantityInput);
    await user.type(quantityInput, '0');
    await user.tab();

    await waitFor(() => {
      expect(quantityInput).toHaveValue(1);
    });
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(
      <CartProvider initialCart={mockCartItems}>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </CartProvider>
    );

    expect(screen.getByRole('heading', { name: 'Shopping Cart' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /proceed to checkout/i })).toBeInTheDocument();
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
  });
});

describe('Checkout Component', () => {
  const mockCartItems = [
    { id: 1, name: 'Product 1', price: 19.99, quantity: 2 },
    { id: 2, name: 'Product 2', price: 29.99, quantity: 1 },
  ];

  const mockUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    addresses: [
      { id: 1, street: '123 Main St', city: 'New York', state: 'NY', zip: '10001', country: 'US' },
    ],
    paymentMethods: [
      { id: 1, cardNumber: '****1234', expiry: '12/25', type: 'visa' },
    ],
  };

  beforeEach(() => {
    mockedAxios.post.mockResolvedValue({ data: { orderId: 'ORD12345', success: true } });
  });

  it('should render checkout form with cart summary', () => {
    render(
      <AuthProvider initialUser={mockUser}>
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Checkout />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
    expect(screen.getByText('$69.97')).toBeInTheDocument();
    expect(screen.getByLabelText('Shipping Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Payment Method')).toBeInTheDocument();
  });

  it('should show validation errors for empty form submission', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider initialUser={mockUser}>
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Checkout />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    );

    await user.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => {
      expect(screen.getByText('Shipping address is required')).toBeInTheDocument();
      expect(screen.getByText('Payment method is required')).toBeInTheDocument();
    });
  });

  it('should process order successfully with valid data', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider initialUser={mockUser}>
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Checkout />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    );

    await user.selectOptions(screen.getByLabelText('Shipping Address'), '123 Main St, New York, NY 10001, US');
    await user.selectOptions(screen.getByLabelText('Payment Method'), '****1234');
    await user.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalled();
      expect(screen.getByText('Order placed successfully!')).toBeInTheDocument();
      expect(screen.getByText('Order ID: ORD12345')).toBeInTheDocument();
    });
  });

  it('should handle payment failure gracefully', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Payment failed'));
    const user = userEvent.setup();

    render(
      <AuthProvider initialUser={mockUser}>
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Checkout />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    );

    await user.selectOptions(screen.getByLabelText('Shipping Address'), '123 Main St, New York, NY 10001, US');
    await user.selectOptions(screen.getByLabelText('Payment Method'), '****1234');
    await user.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => {
      expect(screen.getByText('Payment failed. Please try again or use a different payment method.')).toBeInTheDocument();
    });
  });

  it('should show loading state during order processing', async () => {
    mockedAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { orderId: 'ORD12345', success: true } }), 1000)));

    const user = userEvent.setup();
    render(
      <AuthProvider initialUser={mockUser}>
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Checkout />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    );

    await user.selectOptions(screen.getByLabelText('Shipping Address'), '123 Main St, New York, NY 10001, US');
    await user.selectOptions(screen.getByLabelText('Payment Method'), '****1234');
    await user.click(screen.getByRole('button', { name: /place order/i }));

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(
      <AuthProvider initialUser={mockUser}>
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Checkout />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Order Summary' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Shipping Information' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Payment Information' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route } from 'react-router-dom';
import { CartProvider } from '../../context/CartContext';
import { AuthProvider } from '../../context/AuthContext';
import ProductListing from '../../components/core/ProductListing';
import ProductDetail from '../../components/core/ProductDetail';
import Cart from '../../components/core/Cart';
import Checkout from '../../components/core/Checkout';
import { act } from 'react-dom/test-utils';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ProductListing Component', () => {
  const mockProducts = [
    { id: 1, name: 'Product 1', price: 19.99, stock: 10, category: 'electronics' },
    { id: 2, name: 'Product 2', price: 29.99, stock: 5, category: 'electronics' },
    { id: 3, name: 'Product 3', price: 9.99, stock: 0, category: 'books' },
  ];

  beforeEach(() => {
    mockedAxios.get.mockResolvedValue({ data: mockProducts });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', async () => {
    render(
      <MemoryRouter>
        <ProductListing />
      </MemoryRouter>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display products after loading', async () => {
    render(
      <MemoryRouter>
        <ProductListing />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.getByText('$19.99')).toBeInTheDocument();
    });
  });

  it('should filter products by category', async () => {
    render(
      <MemoryRouter>
        <ProductListing />
      </MemoryRouter>
    );

    await waitFor(() => {
      const categoryFilter = screen.getByLabelText('Category');
      userEvent.selectOptions(categoryFilter, 'electronics');
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.queryByText('Product 3')).not.toBeInTheDocument();
    });
  });

  it('should show out of stock badge for products with zero stock', async () => {
    render(
      <MemoryRouter>
        <ProductListing />
      </MemoryRouter>
    );

    await waitFor(() => {
      const product3 = screen.getByText('Product 3').closest('.product-card');
      expect(within(product3!).getByText('Out of Stock')).toBeInTheDocument();
    });
  });

  it('should handle API error gracefully', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));
    render(
      <MemoryRouter>
        <ProductListing />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load products. Please try again later.')).toBeInTheDocument();
    });
  });

  it('should be accessible with proper ARIA attributes', async () => {
    render(
      <MemoryRouter>
        <ProductListing />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Our Products' })).toBeInTheDocument();
      expect(screen.getByLabelText('Search products')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
    });
  });
});

describe('ProductDetail Component', () => {
  const mockProduct = {
    id: 1,
    name: 'Premium Headphones',
    price: 199.99,
    description: 'High-quality noise cancelling headphones',
    stock: 5,
    category: 'electronics',
    images: ['headphones1.jpg', 'headphones2.jpg'],
    reviews: [
      { id: 1, user: 'John Doe', rating: 5, comment: 'Excellent quality!' },
      { id: 2, user: 'Jane Smith', rating: 4, comment: 'Great sound, comfortable fit' },
    ],
  };

  beforeEach(() => {
    mockedAxios.get.mockResolvedValue({ data: mockProduct });
  });

  it('should render loading state initially', () => {
    render(
      <MemoryRouter initialEntries={['/products/1']}>
        <Route path="/products/:id">
          <ProductDetail />
        </Route>
      </MemoryRouter>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display product details after loading', async () => {
    render(
      <CartProvider>
        <MemoryRouter initialEntries={['/products/1']}>
          <Route path="/products/:id">
            <ProductDetail />
          </Route>
        </MemoryRouter>
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      expect(screen.getByText('$199.99')).toBeInTheDocument();
      expect(screen.getByText('High-quality noise cancelling headphones')).toBeInTheDocument();
      expect(screen.getByText('In Stock')).toBeInTheDocument();
      expect(screen.getByText('Excellent quality!')).toBeInTheDocument();
    });
  });

  it('should allow adding product to cart', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <MemoryRouter initialEntries={['/products/1']}>
          <Route path="/products/:id">
            <ProductDetail />
          </Route>
        </MemoryRouter>
      </CartProvider>
    );

    await waitFor(async () => {
      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addToCartButton);
      expect(screen.getByText('Product added to cart!')).toBeInTheDocument();
    });
  });

  it('should show error when product is out of stock', async () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    mockedAxios.get.mockResolvedValueOnce({ data: outOfStockProduct });

    render(
      <CartProvider>
        <MemoryRouter initialEntries={['/products/1']}>
          <Route path="/products/:id">
            <ProductDetail />
          </Route>
        </MemoryRouter>
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
    });
  });

  it('should handle API error gracefully', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Product not found'));
    render(
      <MemoryRouter initialEntries={['/products/1']}>
        <Route path="/products/:id">
          <ProductDetail />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load product details. Please try again later.')).toBeInTheDocument();
    });
  });

  it('should be accessible with proper ARIA attributes', async () => {
    render(
      <MemoryRouter initialEntries={['/products/1']}>
        <Route path="/products/:id">
          <ProductDetail />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Premium Headphones' })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Premium Headphones' })).toBeInTheDocument();
      expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
    });
  });
});

describe('Cart Component', () => {
  const mockCartItems = [
    { id: 1, name: 'Product 1', price: 19.99, quantity: 2, image: 'product1.jpg' },
    { id: 2, name: 'Product 2', price: 29.99, quantity: 1, image: 'product2.jpg' },
  ];

  it('should display empty cart message when no items', () => {
    render(
      <CartProvider>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </CartProvider>
    );

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('should display cart items with correct totals', () => {
    render(
      <CartProvider initialCart={mockCartItems}>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </CartProvider>
    );

    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByText('Subtotal: $69.97')).toBeInTheDocument();
    expect(screen.getByText('Tax (10%): $6.99')).toBeInTheDocument();
    expect(screen.getByText('Total: $76.96')).toBeInTheDocument();
  });

  it('should allow updating item quantity', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider initialCart={mockCartItems}>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </CartProvider>
    );

    const quantityInput = screen.getAllByLabelText('Quantity')[0];
    await user.clear(quantityInput);
    await user.type(quantityInput, '3');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Subtotal: $89.97')).toBeInTheDocument();
    });
  });

  it('should allow removing items from cart', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider initialCart={mockCartItems}>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </CartProvider>
    );

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
      expect(screen.getByText('Subtotal: $29.99')).toBeInTheDocument();
    });
  });

  it('should prevent quantity from going below 1', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider initialCart={mockCartItems}>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </CartProvider>
    );

    const quantityInput = screen.getAllByLabelText('Quantity')[0];
    await user.clear(quantityInput);
    await user.type(quantityInput, '0');
    await user.tab();

    await waitFor(() => {
      expect(quantityInput).toHaveValue(1);
    });
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(
      <CartProvider initialCart={mockCartItems}>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </CartProvider>
    );

    expect(screen.getByRole('heading', { name: 'Shopping Cart' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /proceed to checkout/i })).toBeInTheDocument();
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
  });
});

describe('Checkout Component', () => {
  const mockCartItems = [
    { id: 1, name: 'Product 1', price: 19.99, quantity: 2 },
    { id: 2, name: 'Product 2', price: 29.99, quantity: 1 },
  ];

  const mockUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    addresses: [
      { id: 1, street: '123 Main St', city: 'New York', state: 'NY', zip: '10001', country: 'US' },
    ],
    paymentMethods: [
      { id: 1, cardNumber: '****1234', expiry: '12/25', type: 'visa' },
    ],
  };

  beforeEach(() => {
    mockedAxios.post.mockResolvedValue({ data: { orderId: 'ORD12345', success: true } });
  });

  it('should render checkout form with cart summary', () => {
    render(
      <AuthProvider initialUser={mockUser}>
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Checkout />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
    expect(screen.getByText('$69.97')).toBeInTheDocument();
    expect(screen.getByLabelText('Shipping Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Payment Method')).toBeInTheDocument();
  });

  it('should show validation errors for empty form submission', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider initialUser={mockUser}>
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Checkout />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    );

    await user.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => {
      expect(screen.getByText('Shipping address is required')).toBeInTheDocument();
      expect(screen.getByText('Payment method is required')).toBeInTheDocument();
    });
  });

  it('should process order successfully with valid data', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider initialUser={mockUser}>
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Checkout />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    );

    await user.selectOptions(screen.getByLabelText('Shipping Address'), '123 Main St, New York, NY 10001, US');
    await user.selectOptions(screen.getByLabelText('Payment Method'), '****1234');
    await user.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalled();
      expect(screen.getByText('Order placed successfully!')).toBeInTheDocument();
      expect(screen.getByText('Order ID: ORD12345')).toBeInTheDocument();
    });
  });

  it('should handle payment failure gracefully', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Payment failed'));
    const user = userEvent.setup();

    render(
      <AuthProvider initialUser={mockUser}>
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Checkout />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    );

    await user.selectOptions(screen.getByLabelText('Shipping Address'), '123 Main St, New York, NY 10001, US');
    await user.selectOptions(screen.getByLabelText('Payment Method'), '****1234');
    await user.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => {
      expect(screen.getByText('Payment failed. Please try again or use a different payment method.')).toBeInTheDocument();
    });
  });

  it('should show loading state during order processing', async () => {
    mockedAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { orderId: 'ORD12345', success: true } }), 1000)));

    const user = userEvent.setup();
    render(
      <AuthProvider initialUser={mockUser}>
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Checkout />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    );

    await user.selectOptions(screen.getByLabelText('Shipping Address'), '123 Main St, New York, NY 10001, US');
    await user.selectOptions(screen.getByLabelText('Payment Method'), '****1234');
    await user.click(screen.getByRole('button', { name: /place order/i }));

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(
      <AuthProvider initialUser={mockUser}>
        <CartProvider initialCart={mockCartItems}>
          <MemoryRouter>
            <Checkout />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Order Summary' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Shipping Information' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Payment Information' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
  });
});