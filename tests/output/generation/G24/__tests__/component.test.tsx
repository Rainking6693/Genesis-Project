import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartContext } from '../../context/CartContext'; // Adjust path as needed
import ProductDetails from '../../components/ProductDetails'; // Adjust path as needed
import { Product } from '../../types/Product'; // Adjust path as needed

// Mock the CartContext
jest.mock('../../context/CartContext', () => ({
  CartContext: {
    Consumer: (props: any) => {
      const mockContextValue = {
        cartItems: [],
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateCartItemQuantity: jest.fn(),
      };
      return props.children(mockContextValue);
    },
  },
}));

// Mock the useRouter hook if you're using Next.js or similar
jest.mock('next/router', () => ({
  useRouter: jest.fn().mockReturnValue({
    query: { productId: '123' },
  }),
}));

// Mock the API call (replace with your actual API call)
const mockFetchProduct = jest.fn();
jest.mock('../../api/products', () => ({ // Adjust path as needed
  fetchProduct: mockFetchProduct,
}));

describe('ProductDetails Component', () => {
  const mockProduct: Product = {
    id: '123',
    name: 'Test Product',
    description: 'Test Description',
    price: 25,
    imageUrl: 'test.jpg',
    stock: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchProduct.mockResolvedValue(mockProduct);
  });

  it('should render loading state initially', () => {
    mockFetchProduct.mockImplementation(() => new Promise(() => {})); // Simulate loading
    render(<ProductDetails productId="123" />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('should render product details when data is loaded', async () => {
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());
    expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
    expect(screen.getByText(/\$25/i)).toBeInTheDocument();
  });

  it('should display an error message when fetching product fails', async () => {
    mockFetchProduct.mockRejectedValue(new Error('Failed to fetch product'));
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Error/i)).toBeInTheDocument());
    expect(screen.getByText(/Failed to fetch product/i)).toBeInTheDocument();
  });

  it('should call addToCart when "Add to Cart" button is clicked', async () => {
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      const mockCartContext = require('../../context/CartContext');
      expect(mockCartContext.CartContext.Consumer).toHaveBeenCalled();
      const mockContextValue = (mockCartContext.CartContext.Consumer as jest.Mock).mock.calls[0][0];
      expect(mockContextValue.addToCart).toHaveBeenCalledWith(mockProduct, 1);
    });
  });

  it('should update quantity when quantity input changes', async () => {
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    userEvent.clear(quantityInput);
    userEvent.type(quantityInput, '3');

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      const mockCartContext = require('../../context/CartContext');
      expect(mockCartContext.CartContext.Consumer).toHaveBeenCalled();
      const mockContextValue = (mockCartContext.CartContext.Consumer as jest.Mock).mock.calls[0][0];
      expect(mockContextValue.addToCart).toHaveBeenCalledWith(mockProduct, 3);
    });
  });

  it('should handle invalid quantity input (e.g., negative numbers)', async () => {
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    userEvent.clear(quantityInput);
    userEvent.type(quantityInput, '-1');

    expect(quantityInput).toHaveValue(null);

    userEvent.clear(quantityInput);
    userEvent.type(quantityInput, '0');
    expect(quantityInput).toHaveValue(null);
  });

  it('should handle quantity exceeding stock', async () => {
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    userEvent.clear(quantityInput);
    userEvent.type(quantityInput, '11');

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      const mockCartContext = require('../../context/CartContext');
      expect(mockCartContext.CartContext.Consumer).toHaveBeenCalled();
      const mockContextValue = (mockCartContext.CartContext.Consumer as jest.Mock).mock.calls[0][0];
      expect(mockContextValue.addToCart).toHaveBeenCalledWith(mockProduct, 10);
    });
  });

  it('should display "Out of Stock" when stock is zero', async () => {
    mockFetchProduct.mockResolvedValue({ ...mockProduct, stock: 0 });
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument());
    const addToCartButton = screen.queryByRole('button', { name: /Add to Cart/i });
    expect(addToCartButton).toBeNull();
  });

  it('should have accessible elements', async () => {
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());

    const productImage = screen.getByRole('img', { name: /Test Product/i });
    expect(productImage).toBeInTheDocument();
    expect(productImage).toHaveAttribute('src', 'test.jpg');
    expect(productImage).toHaveAttribute('alt', 'Test Product');

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    expect(quantityInput).toHaveAccessibleName('Quantity');

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    expect(addToCartButton).toBeInTheDocument();
  });

  it('should call fetchProduct with the correct productId', async () => {
    render(<ProductDetails productId="456" />);
    await waitFor(() => expect(mockFetchProduct).toHaveBeenCalledWith('456'));
  });

  it('should not allow quantity input if product is out of stock', async () => {
    mockFetchProduct.mockResolvedValue({ ...mockProduct, stock: 0 });
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument());

    const quantityInput = screen.queryByRole('spinbutton', { name: /Quantity/i });
    expect(quantityInput).toBeNull();
  });

  it('should display a default image if the product image URL is invalid', async () => {
    mockFetchProduct.mockResolvedValue({ ...mockProduct, imageUrl: '' });
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());

    const productImage = screen.getByRole('img', { name: /Test Product/i });
    expect(productImage).toBeInTheDocument();
    expect(productImage).toHaveAttribute('src', 'default-image.jpg'); // Replace 'default-image.jpg' with your actual default image path
    expect(productImage).toHaveAttribute('alt', 'Test Product');
  });

  it('should handle very large quantity input', async () => {
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    userEvent.clear(quantityInput);
    userEvent.type(quantityInput, '100000');

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      const mockCartContext = require('../../context/CartContext');
      expect(mockCartContext.CartContext.Consumer).toHaveBeenCalled();
      const mockContextValue = (mockCartContext.CartContext.Consumer as jest.Mock).mock.calls[0][0];
      expect(mockContextValue.addToCart).toHaveBeenCalledWith(mockProduct, 10);
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartContext } from '../../context/CartContext'; // Adjust path as needed
import ProductDetails from '../../components/ProductDetails'; // Adjust path as needed
import { Product } from '../../types/Product'; // Adjust path as needed

// Mock the CartContext
jest.mock('../../context/CartContext', () => ({
  CartContext: {
    Consumer: (props: any) => {
      const mockContextValue = {
        cartItems: [],
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateCartItemQuantity: jest.fn(),
      };
      return props.children(mockContextValue);
    },
  },
}));

// Mock the useRouter hook if you're using Next.js or similar
jest.mock('next/router', () => ({
  useRouter: jest.fn().mockReturnValue({
    query: { productId: '123' },
  }),
}));

// Mock the API call (replace with your actual API call)
const mockFetchProduct = jest.fn();
jest.mock('../../api/products', () => ({ // Adjust path as needed
  fetchProduct: mockFetchProduct,
}));

describe('ProductDetails Component', () => {
  const mockProduct: Product = {
    id: '123',
    name: 'Test Product',
    description: 'Test Description',
    price: 25,
    imageUrl: 'test.jpg',
    stock: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchProduct.mockResolvedValue(mockProduct);
  });

  it('should render loading state initially', () => {
    mockFetchProduct.mockImplementation(() => new Promise(() => {})); // Simulate loading
    render(<ProductDetails productId="123" />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('should render product details when data is loaded', async () => {
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());
    expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
    expect(screen.getByText(/\$25/i)).toBeInTheDocument();
  });

  it('should display an error message when fetching product fails', async () => {
    mockFetchProduct.mockRejectedValue(new Error('Failed to fetch product'));
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Error/i)).toBeInTheDocument());
    expect(screen.getByText(/Failed to fetch product/i)).toBeInTheDocument();
  });

  it('should call addToCart when "Add to Cart" button is clicked', async () => {
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      const mockCartContext = require('../../context/CartContext');
      expect(mockCartContext.CartContext.Consumer).toHaveBeenCalled();
      const mockContextValue = (mockCartContext.CartContext.Consumer as jest.Mock).mock.calls[0][0];
      expect(mockContextValue.addToCart).toHaveBeenCalledWith(mockProduct, 1);
    });
  });

  it('should update quantity when quantity input changes', async () => {
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    userEvent.clear(quantityInput);
    userEvent.type(quantityInput, '3');

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      const mockCartContext = require('../../context/CartContext');
      expect(mockCartContext.CartContext.Consumer).toHaveBeenCalled();
      const mockContextValue = (mockCartContext.CartContext.Consumer as jest.Mock).mock.calls[0][0];
      expect(mockContextValue.addToCart).toHaveBeenCalledWith(mockProduct, 3);
    });
  });

  it('should handle invalid quantity input (e.g., negative numbers)', async () => {
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    userEvent.clear(quantityInput);
    userEvent.type(quantityInput, '-1');

    expect(quantityInput).toHaveValue(null);

    userEvent.clear(quantityInput);
    userEvent.type(quantityInput, '0');
    expect(quantityInput).toHaveValue(null);
  });

  it('should handle quantity exceeding stock', async () => {
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    userEvent.clear(quantityInput);
    userEvent.type(quantityInput, '11');

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      const mockCartContext = require('../../context/CartContext');
      expect(mockCartContext.CartContext.Consumer).toHaveBeenCalled();
      const mockContextValue = (mockCartContext.CartContext.Consumer as jest.Mock).mock.calls[0][0];
      expect(mockContextValue.addToCart).toHaveBeenCalledWith(mockProduct, 10);
    });
  });

  it('should display "Out of Stock" when stock is zero', async () => {
    mockFetchProduct.mockResolvedValue({ ...mockProduct, stock: 0 });
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument());
    const addToCartButton = screen.queryByRole('button', { name: /Add to Cart/i });
    expect(addToCartButton).toBeNull();
  });

  it('should have accessible elements', async () => {
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());

    const productImage = screen.getByRole('img', { name: /Test Product/i });
    expect(productImage).toBeInTheDocument();
    expect(productImage).toHaveAttribute('src', 'test.jpg');
    expect(productImage).toHaveAttribute('alt', 'Test Product');

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    expect(quantityInput).toHaveAccessibleName('Quantity');

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    expect(addToCartButton).toBeInTheDocument();
  });

  it('should call fetchProduct with the correct productId', async () => {
    render(<ProductDetails productId="456" />);
    await waitFor(() => expect(mockFetchProduct).toHaveBeenCalledWith('456'));
  });

  it('should not allow quantity input if product is out of stock', async () => {
    mockFetchProduct.mockResolvedValue({ ...mockProduct, stock: 0 });
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument());

    const quantityInput = screen.queryByRole('spinbutton', { name: /Quantity/i });
    expect(quantityInput).toBeNull();
  });

  it('should display a default image if the product image URL is invalid', async () => {
    mockFetchProduct.mockResolvedValue({ ...mockProduct, imageUrl: '' });
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());

    const productImage = screen.getByRole('img', { name: /Test Product/i });
    expect(productImage).toBeInTheDocument();
    expect(productImage).toHaveAttribute('src', 'default-image.jpg'); // Replace 'default-image.jpg' with your actual default image path
    expect(productImage).toHaveAttribute('alt', 'Test Product');
  });

  it('should handle very large quantity input', async () => {
    render(<ProductDetails productId="123" />);
    await waitFor(() => expect(screen.getByText(/Test Product/i)).toBeInTheDocument());

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    userEvent.clear(quantityInput);
    userEvent.type(quantityInput, '100000');

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      const mockCartContext = require('../../context/CartContext');
      expect(mockCartContext.CartContext.Consumer).toHaveBeenCalled();
      const mockContextValue = (mockCartContext.CartContext.Consumer as jest.Mock).mock.calls[0][0];
      expect(mockContextValue.addToCart).toHaveBeenCalledWith(mockProduct, 10);
    });
  });
});