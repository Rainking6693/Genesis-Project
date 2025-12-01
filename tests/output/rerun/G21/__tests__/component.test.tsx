import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from './CartContext'; // Assuming you have a CartContext
import ProductCard from './ProductCard'; // Replace with your actual component
import '@testing-library/jest-dom';

// Mock API responses
const mockProduct = {
  id: 1,
  name: 'Test Product',
  price: 20,
  imageUrl: 'test.jpg',
  description: 'A test product description',
};

const server = setupServer(
  rest.get('/api/products/1', (req, res, ctx) => {
    return res(ctx.json(mockProduct));
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderWithCartContext = (ui: React.ReactElement, cart: any) => {
  return render(
    <CartContext.Provider value={cart}>
      {ui}
    </CartContext.Provider>
  );
};

describe('ProductCard Component', () => {
  it('renders product details correctly', async () => {
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: jest.fn() });
    await waitFor(() => screen.getByText('Test Product'));
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$20')).toBeInTheDocument();
    expect(screen.getByAltText('Test Product')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: jest.fn() });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithCartContext(<ProductCard productId={1} />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Error loading product.')).toBeInTheDocument();
    });
  });

  it('calls addToCart when "Add to Cart" button is clicked', async () => {
    const addToCartMock = jest.fn();
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: [], addToCart: addToCartMock, removeFromCart: jest.fn(), updateQuantity: jest.fn() });
    await waitFor(() => screen.getByText('Test Product'));
    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);
    expect(addToCartMock).toHaveBeenCalledWith(mockProduct);
  });

  it('calls removeFromCart when "Remove from Cart" button is clicked', async () => {
    const removeFromCartMock = jest.fn();
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: removeFromCartMock, updateQuantity: jest.fn() });
    await waitFor(() => screen.getByText('Test Product'));
    const removeFromCartButton = screen.getByRole('button', { name: /Remove from Cart/i });
    fireEvent.click(removeFromCartButton);
    expect(removeFromCartMock).toHaveBeenCalledWith(1);
  });

  it('updates quantity when quantity input changes', async () => {
    const updateQuantityMock = jest.fn();
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: updateQuantityMock });
    await waitFor(() => screen.getByText('Test Product'));
    const quantityInput = screen.getByRole('spinbutton');
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '3');
      fireEvent.blur(quantityInput);
    });

    expect(updateQuantityMock).toHaveBeenCalledWith(1, 3);
  });

  it('disables quantity input when quantity is 0', async () => {
    const updateQuantityMock = jest.fn();
    const cartItems: any[] = [{ ...mockProduct, quantity: 0 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: updateQuantityMock });
    await waitFor(() => screen.getByText('Test Product'));
    const quantityInput = screen.getByRole('spinbutton');
    expect(quantityInput).toBeDisabled();
  });

  it('renders "In Cart" message when product is in cart', async () => {
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: jest.fn() });
    await waitFor(() => screen.getByText('Test Product'));
    expect(screen.getByText('In Cart')).toBeInTheDocument();
  });

  it('renders quantity input when product is in cart', async () => {
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: jest.fn() });
    await waitFor(() => screen.getByText('Test Product'));
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('quantity input has correct aria-label', async () => {
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: jest.fn() });
    await waitFor(() => screen.getByText('Test Product'));
    const quantityInput = screen.getByRole('spinbutton');
    expect(quantityInput).toHaveAccessibleName('Quantity');
  });

  it('image has alt text', async () => {
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: jest.fn() });
    await waitFor(() => screen.getByText('Test Product'));
    const image = screen.getByAltText('Test Product');
    expect(image).toBeInTheDocument();
  });

  it('handles quantity input change to non-numeric value', async () => {
    const updateQuantityMock = jest.fn();
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: updateQuantityMock });
    await waitFor(() => screen.getByText('Test Product'));
    const quantityInput = screen.getByRole('spinbutton');
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, 'abc');
      fireEvent.blur(quantityInput);
    });

    expect(updateQuantityMock).not.toHaveBeenCalled();
  });

  it('handles quantity input change to negative value', async () => {
    const updateQuantityMock = jest.fn();
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: updateQuantityMock });
    await waitFor(() => screen.getByText('Test Product'));
    const quantityInput = screen.getByRole('spinbutton');
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '-1');
      fireEvent.blur(quantityInput);
    });

    expect(updateQuantityMock).toHaveBeenCalledWith(1, 0);
  });

  it('handles quantity input change to zero', async () => {
    const updateQuantityMock = jest.fn();
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: updateQuantityMock });
    await waitFor(() => screen.getByText('Test Product'));
    const quantityInput = screen.getByRole('spinbutton');
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '0');
      fireEvent.blur(quantityInput);
    });

    expect(updateQuantityMock).toHaveBeenCalledWith(1, 0);
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from './CartContext'; // Assuming you have a CartContext
import ProductCard from './ProductCard'; // Replace with your actual component
import '@testing-library/jest-dom';

// Mock API responses
const mockProduct = {
  id: 1,
  name: 'Test Product',
  price: 20,
  imageUrl: 'test.jpg',
  description: 'A test product description',
};

const server = setupServer(
  rest.get('/api/products/1', (req, res, ctx) => {
    return res(ctx.json(mockProduct));
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderWithCartContext = (ui: React.ReactElement, cart: any) => {
  return render(
    <CartContext.Provider value={cart}>
      {ui}
    </CartContext.Provider>
  );
};

describe('ProductCard Component', () => {
  it('renders product details correctly', async () => {
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: jest.fn() });
    await waitFor(() => screen.getByText('Test Product'));
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$20')).toBeInTheDocument();
    expect(screen.getByAltText('Test Product')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: jest.fn() });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithCartContext(<ProductCard productId={1} />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText('Error loading product.')).toBeInTheDocument();
    });
  });

  it('calls addToCart when "Add to Cart" button is clicked', async () => {
    const addToCartMock = jest.fn();
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: [], addToCart: addToCartMock, removeFromCart: jest.fn(), updateQuantity: jest.fn() });
    await waitFor(() => screen.getByText('Test Product'));
    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);
    expect(addToCartMock).toHaveBeenCalledWith(mockProduct);
  });

  it('calls removeFromCart when "Remove from Cart" button is clicked', async () => {
    const removeFromCartMock = jest.fn();
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: removeFromCartMock, updateQuantity: jest.fn() });
    await waitFor(() => screen.getByText('Test Product'));
    const removeFromCartButton = screen.getByRole('button', { name: /Remove from Cart/i });
    fireEvent.click(removeFromCartButton);
    expect(removeFromCartMock).toHaveBeenCalledWith(1);
  });

  it('updates quantity when quantity input changes', async () => {
    const updateQuantityMock = jest.fn();
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: updateQuantityMock });
    await waitFor(() => screen.getByText('Test Product'));
    const quantityInput = screen.getByRole('spinbutton');
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '3');
      fireEvent.blur(quantityInput);
    });

    expect(updateQuantityMock).toHaveBeenCalledWith(1, 3);
  });

  it('disables quantity input when quantity is 0', async () => {
    const updateQuantityMock = jest.fn();
    const cartItems: any[] = [{ ...mockProduct, quantity: 0 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: updateQuantityMock });
    await waitFor(() => screen.getByText('Test Product'));
    const quantityInput = screen.getByRole('spinbutton');
    expect(quantityInput).toBeDisabled();
  });

  it('renders "In Cart" message when product is in cart', async () => {
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: jest.fn() });
    await waitFor(() => screen.getByText('Test Product'));
    expect(screen.getByText('In Cart')).toBeInTheDocument();
  });

  it('renders quantity input when product is in cart', async () => {
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: jest.fn() });
    await waitFor(() => screen.getByText('Test Product'));
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('quantity input has correct aria-label', async () => {
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: jest.fn() });
    await waitFor(() => screen.getByText('Test Product'));
    const quantityInput = screen.getByRole('spinbutton');
    expect(quantityInput).toHaveAccessibleName('Quantity');
  });

  it('image has alt text', async () => {
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: jest.fn() });
    await waitFor(() => screen.getByText('Test Product'));
    const image = screen.getByAltText('Test Product');
    expect(image).toBeInTheDocument();
  });

  it('handles quantity input change to non-numeric value', async () => {
    const updateQuantityMock = jest.fn();
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: updateQuantityMock });
    await waitFor(() => screen.getByText('Test Product'));
    const quantityInput = screen.getByRole('spinbutton');
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, 'abc');
      fireEvent.blur(quantityInput);
    });

    expect(updateQuantityMock).not.toHaveBeenCalled();
  });

  it('handles quantity input change to negative value', async () => {
    const updateQuantityMock = jest.fn();
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: updateQuantityMock });
    await waitFor(() => screen.getByText('Test Product'));
    const quantityInput = screen.getByRole('spinbutton');
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '-1');
      fireEvent.blur(quantityInput);
    });

    expect(updateQuantityMock).toHaveBeenCalledWith(1, 0);
  });

  it('handles quantity input change to zero', async () => {
    const updateQuantityMock = jest.fn();
    const cartItems = [{ ...mockProduct, quantity: 1 }];
    renderWithCartContext(<ProductCard productId={1} />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateQuantity: updateQuantityMock });
    await waitFor(() => screen.getByText('Test Product'));
    const quantityInput = screen.getByRole('spinbutton');
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '0');
      fireEvent.blur(quantityInput);
    });

    expect(updateQuantityMock).toHaveBeenCalledWith(1, 0);
  });
});