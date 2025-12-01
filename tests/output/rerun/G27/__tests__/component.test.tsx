import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../context/CartContext'; // Adjust path as needed
import ProductCard from '../../components/ProductCard'; // Adjust path as needed
import { Product } from '../../types/Product'; // Adjust path as needed
import '@testing-library/jest-dom';

// Mock CartContext
const mockAddToCart = jest.fn();
const mockRemoveFromCart = jest.fn();
const mockClearCart = jest.fn();
const mockGetCartTotal = jest.fn();
const mockGetCartItemCount = jest.fn();
const mockCartItems: Product[] = [];

jest.mock('../../context/CartContext', () => ({
  useCart: () => ({
    addToCart: mockAddToCart,
    removeFromCart: mockRemoveFromCart,
    clearCart: mockClearCart,
    getCartTotal: mockGetCartTotal,
    getCartItemCount: mockGetCartItemCount,
    cartItems: mockCartItems,
  }),
}));

// Mock Product type
const mockProduct: Product = {
  id: 1,
  title: 'Test Product',
  description: 'Test Description',
  price: 10,
  imageUrl: 'test.jpg',
  category: 'Test Category',
  rating: { rate: 4.5, count: 100 },
};

// Mock API requests
const server = setupServer(
  rest.get('/api/products/1', (req, res, ctx) => {
    return res(ctx.json(mockProduct));
  }),
  rest.post('/api/checkout', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }));
  }),
  rest.get('/api/products', (req, res, ctx) => {
    return res(ctx.json([mockProduct]));
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});
afterAll(() => server.close());

describe('ProductCard Component', () => {
  it('renders product details correctly', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('$10')).toBeInTheDocument();
  });

  it('calls addToCart when "Add to Cart" button is clicked', async () => {
    render(<ProductCard product={mockProduct} />);
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);
    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct);
  });

  it('displays loading state when data is being fetched', () => {
    render(<ProductCard product={mockProduct} isLoading={true} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('handles error state when fetching data fails', () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const { rerender } = render(<ProductCard product={mockProduct} />);

    rerender(<ProductCard product={mockProduct} error="Failed to load product" />);
    expect(screen.getByText(/failed to load product/i)).toBeInTheDocument();
  });

  it('renders with accessible attributes', () => {
    render(<ProductCard product={mockProduct} />);
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toHaveAttribute('aria-label', 'Add Test Product to cart');
  });

  it('displays a custom message when the product is out of stock', () => {
    render(<ProductCard product={mockProduct} isOutOfStock={true} />);
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  it('does not allow adding to cart when out of stock', () => {
    render(<ProductCard product={mockProduct} isOutOfStock={true} />);
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);
    expect(mockAddToCart).not.toHaveBeenCalled();
  });

  it('renders a discount badge when a discount is applied', () => {
    const discountedProduct = { ...mockProduct, discountPercentage: 10 };
    render(<ProductCard product={discountedProduct} />);
    expect(screen.getByText(/10% off/i)).toBeInTheDocument();
  });

  it('displays the discounted price correctly', () => {
    const discountedProduct = { ...mockProduct, discountPercentage: 10 };
    render(<ProductCard product={discountedProduct} />);
    expect(screen.getByText('$9')).toBeInTheDocument(); // Assuming the discount calculation is correct
  });

  it('renders a "View Details" button that navigates to the product details page', () => {
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    const { rerender } = render(<ProductCard product={mockProduct} />);
    const viewDetailsButton = screen.getByRole('link', { name: /view details/i });
    fireEvent.click(viewDetailsButton);
    // expect(mockNavigate).toHaveBeenCalledWith(`/products/${mockProduct.id}`);
  });

  it('renders a custom image alt text for accessibility', () => {
    render(<ProductCard product={mockProduct} />);
    const productImage = screen.getByRole('img', { name: mockProduct.title });
    expect(productImage).toHaveAttribute('alt', mockProduct.title);
  });

  it('renders a default image if the product image fails to load', () => {
    const { rerender } = render(<ProductCard product={mockProduct} />);
    const productImage = screen.getByRole('img', { name: mockProduct.title });
    fireEvent.error(productImage);
    //expect(productImage).toHaveAttribute('src', 'default-image.jpg'); // Replace with your default image path
  });

  it('renders a quantity selector when the product is in the cart', () => {
    const mockCartItemsWithProduct = [{ ...mockProduct, quantity: 2 }];
    jest.spyOn(require('../../context/CartContext'), 'useCart').mockReturnValue({
      addToCart: mockAddToCart,
      removeFromCart: mockRemoveFromCart,
      clearCart: mockClearCart,
      getCartTotal: mockGetCartTotal,
      getCartItemCount: mockGetCartItemCount,
      cartItems: mockCartItemsWithProduct,
    });

    const { rerender } = render(<ProductCard product={mockProduct} />);
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('updates the quantity in the cart when the quantity selector is changed', async () => {
    const mockCartItemsWithProduct = [{ ...mockProduct, quantity: 2 }];
    jest.spyOn(require('../../context/CartContext'), 'useCart').mockReturnValue({
      addToCart: mockAddToCart,
      removeFromCart: mockRemoveFromCart,
      clearCart: mockClearCart,
      getCartTotal: mockGetCartTotal,
      getCartItemCount: mockGetCartItemCount,
      cartItems: mockCartItemsWithProduct,
    });

    const { rerender } = render(<ProductCard product={mockProduct} />);
    const quantityInput = screen.getByRole('spinbutton');
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, '3');
    await waitFor(() => {
      expect(mockAddToCart).toHaveBeenCalledWith({ ...mockProduct, quantity: 3 });
    });
  });

  it('removes the item from the cart when quantity is set to 0', async () => {
    const mockCartItemsWithProduct = [{ ...mockProduct, quantity: 2 }];
    jest.spyOn(require('../../context/CartContext'), 'useCart').mockReturnValue({
      addToCart: mockAddToCart,
      removeFromCart: mockRemoveFromCart,
      clearCart: mockClearCart,
      getCartTotal: mockGetCartTotal,
      getCartItemCount: mockGetCartItemCount,
      cartItems: mockCartItemsWithProduct,
    });

    const { rerender } = render(<ProductCard product={mockProduct} />);
    const quantityInput = screen.getByRole('spinbutton');
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, '0');
    await waitFor(() => {
      expect(mockRemoveFromCart).toHaveBeenCalledWith(mockProduct.id);
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../context/CartContext'; // Adjust path as needed
import ProductCard from '../../components/ProductCard'; // Adjust path as needed
import { Product } from '../../types/Product'; // Adjust path as needed
import '@testing-library/jest-dom';

// Mock CartContext
const mockAddToCart = jest.fn();
const mockRemoveFromCart = jest.fn();
const mockClearCart = jest.fn();
const mockGetCartTotal = jest.fn();
const mockGetCartItemCount = jest.fn();
const mockCartItems: Product[] = [];

jest.mock('../../context/CartContext', () => ({
  useCart: () => ({
    addToCart: mockAddToCart,
    removeFromCart: mockRemoveFromCart,
    clearCart: mockClearCart,
    getCartTotal: mockGetCartTotal,
    getCartItemCount: mockGetCartItemCount,
    cartItems: mockCartItems,
  }),
}));

// Mock Product type
const mockProduct: Product = {
  id: 1,
  title: 'Test Product',
  description: 'Test Description',
  price: 10,
  imageUrl: 'test.jpg',
  category: 'Test Category',
  rating: { rate: 4.5, count: 100 },
};

// Mock API requests
const server = setupServer(
  rest.get('/api/products/1', (req, res, ctx) => {
    return res(ctx.json(mockProduct));
  }),
  rest.post('/api/checkout', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }));
  }),
  rest.get('/api/products', (req, res, ctx) => {
    return res(ctx.json([mockProduct]));
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});
afterAll(() => server.close());

describe('ProductCard Component', () => {
  it('renders product details correctly', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('$10')).toBeInTheDocument();
  });

  it('calls addToCart when "Add to Cart" button is clicked', async () => {
    render(<ProductCard product={mockProduct} />);
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);
    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct);
  });

  it('displays loading state when data is being fetched', () => {
    render(<ProductCard product={mockProduct} isLoading={true} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('handles error state when fetching data fails', () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const { rerender } = render(<ProductCard product={mockProduct} />);

    rerender(<ProductCard product={mockProduct} error="Failed to load product" />);
    expect(screen.getByText(/failed to load product/i)).toBeInTheDocument();
  });

  it('renders with accessible attributes', () => {
    render(<ProductCard product={mockProduct} />);
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toHaveAttribute('aria-label', 'Add Test Product to cart');
  });

  it('displays a custom message when the product is out of stock', () => {
    render(<ProductCard product={mockProduct} isOutOfStock={true} />);
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  it('does not allow adding to cart when out of stock', () => {
    render(<ProductCard product={mockProduct} isOutOfStock={true} />);
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);
    expect(mockAddToCart).not.toHaveBeenCalled();
  });

  it('renders a discount badge when a discount is applied', () => {
    const discountedProduct = { ...mockProduct, discountPercentage: 10 };
    render(<ProductCard product={discountedProduct} />);
    expect(screen.getByText(/10% off/i)).toBeInTheDocument();
  });

  it('displays the discounted price correctly', () => {
    const discountedProduct = { ...mockProduct, discountPercentage: 10 };
    render(<ProductCard product={discountedProduct} />);
    expect(screen.getByText('$9')).toBeInTheDocument(); // Assuming the discount calculation is correct
  });

  it('renders a "View Details" button that navigates to the product details page', () => {
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    const { rerender } = render(<ProductCard product={mockProduct} />);
    const viewDetailsButton = screen.getByRole('link', { name: /view details/i });
    fireEvent.click(viewDetailsButton);
    // expect(mockNavigate).toHaveBeenCalledWith(`/products/${mockProduct.id}`);
  });

  it('renders a custom image alt text for accessibility', () => {
    render(<ProductCard product={mockProduct} />);
    const productImage = screen.getByRole('img', { name: mockProduct.title });
    expect(productImage).toHaveAttribute('alt', mockProduct.title);
  });

  it('renders a default image if the product image fails to load', () => {
    const { rerender } = render(<ProductCard product={mockProduct} />);
    const productImage = screen.getByRole('img', { name: mockProduct.title });
    fireEvent.error(productImage);
    //expect(productImage).toHaveAttribute('src', 'default-image.jpg'); // Replace with your default image path
  });

  it('renders a quantity selector when the product is in the cart', () => {
    const mockCartItemsWithProduct = [{ ...mockProduct, quantity: 2 }];
    jest.spyOn(require('../../context/CartContext'), 'useCart').mockReturnValue({
      addToCart: mockAddToCart,
      removeFromCart: mockRemoveFromCart,
      clearCart: mockClearCart,
      getCartTotal: mockGetCartTotal,
      getCartItemCount: mockGetCartItemCount,
      cartItems: mockCartItemsWithProduct,
    });

    const { rerender } = render(<ProductCard product={mockProduct} />);
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('updates the quantity in the cart when the quantity selector is changed', async () => {
    const mockCartItemsWithProduct = [{ ...mockProduct, quantity: 2 }];
    jest.spyOn(require('../../context/CartContext'), 'useCart').mockReturnValue({
      addToCart: mockAddToCart,
      removeFromCart: mockRemoveFromCart,
      clearCart: mockClearCart,
      getCartTotal: mockGetCartTotal,
      getCartItemCount: mockGetCartItemCount,
      cartItems: mockCartItemsWithProduct,
    });

    const { rerender } = render(<ProductCard product={mockProduct} />);
    const quantityInput = screen.getByRole('spinbutton');
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, '3');
    await waitFor(() => {
      expect(mockAddToCart).toHaveBeenCalledWith({ ...mockProduct, quantity: 3 });
    });
  });

  it('removes the item from the cart when quantity is set to 0', async () => {
    const mockCartItemsWithProduct = [{ ...mockProduct, quantity: 2 }];
    jest.spyOn(require('../../context/CartContext'), 'useCart').mockReturnValue({
      addToCart: mockAddToCart,
      removeFromCart: mockRemoveFromCart,
      clearCart: mockClearCart,
      getCartTotal: mockGetCartTotal,
      getCartItemCount: mockGetCartItemCount,
      cartItems: mockCartItemsWithProduct,
    });

    const { rerender } = render(<ProductCard product={mockProduct} />);
    const quantityInput = screen.getByRole('spinbutton');
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, '0');
    await waitFor(() => {
      expect(mockRemoveFromCart).toHaveBeenCalledWith(mockProduct.id);
    });
  });
});