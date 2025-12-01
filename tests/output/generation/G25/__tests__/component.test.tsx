import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../contexts/CartContext'; // Adjust path as needed
import ProductDetails from '../../components/ProductDetails'; // Adjust path as needed
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockProduct = {
  id: 1,
  name: 'Test Product',
  description: 'Test Description',
  price: 25,
  imageUrl: 'test.jpg',
  stock: 10,
};

const server = setupServer(
  rest.get('/api/products/1', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockProduct));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderWithCartContext = (ui: React.ReactElement, cart: any) => {
  return render(
    <CartContext.Provider value={cart}>
      <MemoryRouter initialEntries={['/products/1']}>
        <Routes>
          <Route path="/products/:productId" element={ui} />
        </Routes>
      </MemoryRouter>
    </CartContext.Provider>
  );
};

describe('ProductDetails Component', () => {
  it('should render loading state initially', () => {
    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('should render product details after loading', async () => {
    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
      expect(screen.getByText(/\$25/i)).toBeInTheDocument();
    });
  });

  it('should display an error message if product fetch fails', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Error fetching product details/i)).toBeInTheDocument();
    });
  });

  it('should call addToCart when "Add to Cart" button is clicked', async () => {
    const addToCartMock = jest.fn();
    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: addToCartMock, removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    expect(addToCartMock).toHaveBeenCalledWith(mockProduct);
  });

  it('should disable "Add to Cart" button when out of stock', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ ...mockProduct, stock: 0 }));
      })
    );

    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add to Cart/i })).toBeDisabled();
    });
  });

  it('should display quantity input when product is in stock', async () => {
    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: /Quantity/i })).toBeInTheDocument();
    });
  });

  it('should update quantity and call updateCartItemQuantity when quantity changes', async () => {
    const updateCartItemQuantityMock = jest.fn();
    const cartItems = [{ productId: 1, quantity: 1, product: mockProduct }];
    renderWithCartContext(<ProductDetails />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: updateCartItemQuantityMock });

    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '3');
    });

    expect(updateCartItemQuantityMock).toHaveBeenCalledWith(1, 3);
  });

  it('should remove item from cart when quantity is set to 0', async () => {
    const removeFromCartMock = jest.fn();
    const cartItems = [{ productId: 1, quantity: 1, product: mockProduct }];
    renderWithCartContext(<ProductDetails />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: removeFromCartMock, updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '0');
    });

    expect(removeFromCartMock).toHaveBeenCalledWith(1);
  });

  it('should have accessible elements with proper labels and roles', async () => {
    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { level: 2, name: /Test Product/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Test Product/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Quantity/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add to Cart/i })).toBeInTheDocument();
  });

  it('should handle invalid quantity input (e.g., negative numbers)', async () => {
    const updateCartItemQuantityMock = jest.fn();
    const cartItems = [{ productId: 1, quantity: 1, product: mockProduct }];
    renderWithCartContext(<ProductDetails />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: updateCartItemQuantityMock });

    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '-1');
    });

    expect(updateCartItemQuantityMock).not.toHaveBeenCalled();
    expect(quantityInput.value).toBe('1'); // Should revert to previous value or minimum value (1)
  });

  it('should handle quantity input exceeding stock', async () => {
    const updateCartItemQuantityMock = jest.fn();
    const cartItems = [{ productId: 1, quantity: 1, product: mockProduct }];
    renderWithCartContext(<ProductDetails />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: updateCartItemQuantityMock });

    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '11'); // Exceeds stock of 10
    });

    expect(updateCartItemQuantityMock).toHaveBeenCalledWith(1, 10); // Should update to maximum available stock
  });

  it('should display product image with alt text', async () => {
    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByAltText(/Test Product/i)).toBeInTheDocument();
    });
  });

  it('should not call addToCart if quantity is 0 when adding a new item', async () => {
    const addToCartMock = jest.fn();
    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: addToCartMock, removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '0');
    });

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    expect(addToCartMock).not.toHaveBeenCalled();
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../contexts/CartContext'; // Adjust path as needed
import ProductDetails from '../../components/ProductDetails'; // Adjust path as needed
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockProduct = {
  id: 1,
  name: 'Test Product',
  description: 'Test Description',
  price: 25,
  imageUrl: 'test.jpg',
  stock: 10,
};

const server = setupServer(
  rest.get('/api/products/1', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockProduct));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderWithCartContext = (ui: React.ReactElement, cart: any) => {
  return render(
    <CartContext.Provider value={cart}>
      <MemoryRouter initialEntries={['/products/1']}>
        <Routes>
          <Route path="/products/:productId" element={ui} />
        </Routes>
      </MemoryRouter>
    </CartContext.Provider>
  );
};

describe('ProductDetails Component', () => {
  it('should render loading state initially', () => {
    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('should render product details after loading', async () => {
    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
      expect(screen.getByText(/\$25/i)).toBeInTheDocument();
    });
  });

  it('should display an error message if product fetch fails', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Error fetching product details/i)).toBeInTheDocument();
    });
  });

  it('should call addToCart when "Add to Cart" button is clicked', async () => {
    const addToCartMock = jest.fn();
    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: addToCartMock, removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    expect(addToCartMock).toHaveBeenCalledWith(mockProduct);
  });

  it('should disable "Add to Cart" button when out of stock', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ ...mockProduct, stock: 0 }));
      })
    );

    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add to Cart/i })).toBeDisabled();
    });
  });

  it('should display quantity input when product is in stock', async () => {
    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: /Quantity/i })).toBeInTheDocument();
    });
  });

  it('should update quantity and call updateCartItemQuantity when quantity changes', async () => {
    const updateCartItemQuantityMock = jest.fn();
    const cartItems = [{ productId: 1, quantity: 1, product: mockProduct }];
    renderWithCartContext(<ProductDetails />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: updateCartItemQuantityMock });

    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '3');
    });

    expect(updateCartItemQuantityMock).toHaveBeenCalledWith(1, 3);
  });

  it('should remove item from cart when quantity is set to 0', async () => {
    const removeFromCartMock = jest.fn();
    const cartItems = [{ productId: 1, quantity: 1, product: mockProduct }];
    renderWithCartContext(<ProductDetails />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: removeFromCartMock, updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '0');
    });

    expect(removeFromCartMock).toHaveBeenCalledWith(1);
  });

  it('should have accessible elements with proper labels and roles', async () => {
    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { level: 2, name: /Test Product/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Test Product/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Quantity/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add to Cart/i })).toBeInTheDocument();
  });

  it('should handle invalid quantity input (e.g., negative numbers)', async () => {
    const updateCartItemQuantityMock = jest.fn();
    const cartItems = [{ productId: 1, quantity: 1, product: mockProduct }];
    renderWithCartContext(<ProductDetails />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: updateCartItemQuantityMock });

    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '-1');
    });

    expect(updateCartItemQuantityMock).not.toHaveBeenCalled();
    expect(quantityInput.value).toBe('1'); // Should revert to previous value or minimum value (1)
  });

  it('should handle quantity input exceeding stock', async () => {
    const updateCartItemQuantityMock = jest.fn();
    const cartItems = [{ productId: 1, quantity: 1, product: mockProduct }];
    renderWithCartContext(<ProductDetails />, { cartItems: cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: updateCartItemQuantityMock });

    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '11'); // Exceeds stock of 10
    });

    expect(updateCartItemQuantityMock).toHaveBeenCalledWith(1, 10); // Should update to maximum available stock
  });

  it('should display product image with alt text', async () => {
    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: jest.fn(), removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByAltText(/Test Product/i)).toBeInTheDocument();
    });
  });

  it('should not call addToCart if quantity is 0 when adding a new item', async () => {
    const addToCartMock = jest.fn();
    renderWithCartContext(<ProductDetails />, { cartItems: [], addToCart: addToCartMock, removeFromCart: jest.fn(), updateCartItemQuantity: jest.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '0');
    });

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    expect(addToCartMock).not.toHaveBeenCalled();
  });
});